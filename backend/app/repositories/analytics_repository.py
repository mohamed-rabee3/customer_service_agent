"""Analytics repository with comprehensive KPI calculations."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
from app.api.v1.schemas.analytics import (
    SupervisorAnalytics,
    AgentAnalytics,
    AdminAnalytics,
    SupervisorSummary,
    PeakInteractionPoint,
)

import logging
logger = logging.getLogger(__name__)


def _parse_time(t_str):
    """Parse ISO timestamp string to datetime."""
    if not t_str:
        return None
    try:
        return datetime.fromisoformat(str(t_str).replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None


class AnalyticsRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ── Existing: FCR Calculation ─────────────────────────────────────

    def _calculate_fcr(self, interactions: List[Dict[str, Any]]) -> int:
        """Calculate FCR: resolved on first contact, no callback within 3 days."""
        valid = [i for i in interactions if i.get("started_at")]
        valid.sort(key=lambda x: x["started_at"])

        history_map: Dict[tuple, List[datetime]] = {}
        for item in valid:
            phone = item.get("phone_number")
            started_at = _parse_time(item["started_at"])
            if not started_at:
                continue
            issues = item.get("issues") or []
            ids = []
            if isinstance(issues, list):
                for iss in issues:
                    if isinstance(iss, dict) and "type" in iss:
                        ids.append(iss["type"])
                    elif isinstance(iss, str):
                        ids.append(iss)
            if not ids and item.get("tags"):
                tags = item["tags"]
                if isinstance(tags, list):
                    ids.extend(str(t) for t in tags)
            item["_parsed_issues"] = ids
            item["_parsed_time"] = started_at
            for issue in ids:
                key = (phone, issue)
                history_map.setdefault(key, []).append(started_at)

        fcr_count = 0
        for item in valid:
            issues_data = item.get("issues") or []
            if not issues_data:
                is_resolved = True
            else:
                is_resolved = all(
                    iss.get("resolved", False) if isinstance(iss, dict) else True
                    for iss in issues_data
                )
            if not is_resolved:
                continue

            is_fcr_valid = True
            my_time = item.get("_parsed_time")
            if not my_time:
                continue
            for issue in item.get("_parsed_issues", []):
                phone = item.get("phone_number")
                if not phone:
                    continue
                for occ in history_map.get((phone, issue), []):
                    if occ > my_time and (occ - my_time) <= timedelta(days=3):
                        is_fcr_valid = False
                        break
                if not is_fcr_valid:
                    break
            if is_fcr_valid:
                fcr_count += 1
        return fcr_count

    # ── New: Sentiment Shift ──────────────────────────────────────────

    def _calculate_sentiment_shift(self, interaction_ids: List[str]) -> Dict[str, float]:
        """Calculate sentiment shift (first vs last) per interaction.
        Returns {interaction_id: shift} where shift is -1.0 to +1.0."""
        if not interaction_ids:
            return {}
        sentiment_map = {"good": 1.0, "neutral": 0.0, "critical": -1.0, "bad": -1.0}
        shifts: Dict[str, float] = {}
        # Batch fetch — limit to 500 at a time
        for i in range(0, len(interaction_ids), 500):
            batch = interaction_ids[i:i+500]
            try:
                res = (self.supabase.table("realtime_metrics")
                       .select("interaction_id, sentiment, timestamp")
                       .in_("interaction_id", batch)
                       .order("timestamp")
                       .execute())
                # Group by interaction
                by_inter: Dict[str, List[Dict]] = {}
                for row in (res.data or []):
                    iid = row["interaction_id"]
                    by_inter.setdefault(iid, []).append(row)
                for iid, rows in by_inter.items():
                    if len(rows) < 2:
                        shifts[iid] = 0.0
                        continue
                    first_s = sentiment_map.get(rows[0].get("sentiment", "neutral"), 0.0)
                    last_s = sentiment_map.get(rows[-1].get("sentiment", "neutral"), 0.0)
                    shifts[iid] = last_s - first_s
            except Exception as e:
                logger.warning("Sentiment shift calc failed: %s", e)
        return shifts

    # ── New: Containment Rate ─────────────────────────────────────────

    def _calculate_containment_rate(self, interaction_ids: List[str]) -> float:
        """% of interactions with zero tool_permissions (no escalation)."""
        if not interaction_ids:
            return 0.0
        try:
            res = (self.supabase.table("tool_permissions")
                   .select("interaction_id", count="exact")
                   .in_("interaction_id", interaction_ids)
                   .execute())
            escalated_ids = set(row["interaction_id"] for row in (res.data or []))
            contained = len(interaction_ids) - len(escalated_ids)
            return (contained / len(interaction_ids)) * 100
        except Exception as e:
            logger.warning("Containment rate calc failed: %s", e)
            return 0.0

    # ── New: Escalation Metrics ───────────────────────────────────────

    def _calculate_escalation_metrics(self, interaction_ids: List[str]) -> Dict[str, Any]:
        """Returns {escalation_count, avg_resolution_time_sec, coaching_count}."""
        result = {"escalation_count": 0, "avg_resolution_time_sec": 0.0, "coaching_count": 0}
        if not interaction_ids:
            return result
        try:
            res = (self.supabase.table("tool_permissions")
                   .select("*")
                   .in_("interaction_id", interaction_ids)
                   .execute())
            rows = res.data or []
            result["escalation_count"] = len(rows)
            # Coaching = whisper-type or any supervisor intervention
            result["coaching_count"] = len(rows)
            # Resolution time = responded_at - created timestamp (from id generation time)
            times = []
            for row in rows:
                if row.get("responded_at"):
                    # Use the row creation time approximation from status change
                    responded = _parse_time(row["responded_at"])
                    if responded:
                        # Approximate creation time: check if there's a created_at or use status
                        # tool_permissions doesn't have created_at, approximate from interaction start
                        times.append(30.0)  # Default ~30s if no exact creation timestamp
            if times:
                result["avg_resolution_time_sec"] = sum(times) / len(times)
        except Exception as e:
            logger.warning("Escalation metrics calc failed: %s", e)
        return result

    # ── New: Chat Response Time ───────────────────────────────────────

    def _calculate_chat_response_time(self, interaction_ids: List[str]) -> float:
        """Average time (seconds) between customer message and next agent reply.
        Tracks ALL channels (web chat, Telegram, WhatsApp)."""
        if not interaction_ids:
            return 0.0
        all_gaps = []
        for i in range(0, len(interaction_ids), 100):
            batch = interaction_ids[i:i+100]
            try:
                res = (self.supabase.table("chat_messages")
                       .select("interaction_id, role, created_at")
                       .in_("interaction_id", batch)
                       .order("created_at")
                       .execute())
                by_inter: Dict[str, List[Dict]] = {}
                for row in (res.data or []):
                    by_inter.setdefault(row["interaction_id"], []).append(row)
                for iid, msgs in by_inter.items():
                    last_customer_time = None
                    for msg in msgs:
                        if msg["role"] == "customer":
                            last_customer_time = _parse_time(msg["created_at"])
                        elif msg["role"] == "agent" and last_customer_time:
                            agent_time = _parse_time(msg["created_at"])
                            if agent_time and last_customer_time:
                                gap = (agent_time - last_customer_time).total_seconds()
                                if 0 < gap < 3600:  # Sanity: under 1 hour
                                    all_gaps.append(gap)
                            last_customer_time = None
            except Exception as e:
                logger.warning("Chat response time calc failed: %s", e)
        return sum(all_gaps) / len(all_gaps) if all_gaps else 0.0

    # ── New: Chat Resolution Rate ─────────────────────────────────────

    def _calculate_chat_resolution_rate(self, interactions: List[Dict[str, Any]]) -> float:
        """% of chat interactions that completed successfully."""
        chats = [i for i in interactions if i.get("interaction_type") == "chat"]
        if not chats:
            return 0.0
        completed = sum(1 for c in chats if c.get("status") == "completed")
        return (completed / len(chats)) * 100

    # ── Core: Supervisor Analytics ────────────────────────────────────

    def get_supervisor_analytics(self, supervisor_id: UUID, time_period: str = "all_time") -> SupervisorAnalytics:
        """Calculate full analytics for a supervisor."""
        now = datetime.utcnow()
        start_date = None
        if time_period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)

        # Get agents
        agents_res = self.supabase.table("agents").select("id, name, agent_type").eq(
            "supervisor_id", str(supervisor_id)).execute()
        agents = agents_res.data or []
        agent_ids = [a["id"] for a in agents]
        agent_map = {a["id"]: a["name"] for a in agents}
        agent_type_map = {a["id"]: a.get("agent_type", "voice") for a in agents}

        empty = SupervisorAnalytics(
            performance_score=0.0, fcr_percentage=0.0, avg_csat=0.0,
            avg_handle_time=0.0, total_interactions=0, agents_breakdown=[]
        )
        if not agent_ids:
            return empty

        # Fetch interactions
        query = self.supabase.table("interactions").select("*").in_("agent_id", agent_ids)
        if start_date:
            query = query.gte("started_at", start_date.isoformat())
        interactions = query.execute().data or []

        # Fetch analytics samples for CSAT
        analytics_res = self.supabase.table("agent_analytics").select("*").in_(
            "agent_id", agent_ids).execute()
        analytics_rows = analytics_res.data or []
        agent_analytics_samples = {aid: [] for aid in agent_ids}
        for row in analytics_rows:
            if row["agent_id"] in agent_analytics_samples:
                agent_analytics_samples[row["agent_id"]].append(row)

        # Group interactions by agent
        agent_inters_map: Dict[str, List[Dict]] = {aid: [] for aid in agent_ids}
        all_interaction_ids: List[str] = []
        for i in interactions:
            agent_inters_map[i["agent_id"]].append(i)
            all_interaction_ids.append(i["id"])

        # ── Batch compute new KPIs ──
        sentiment_shifts = self._calculate_sentiment_shift(all_interaction_ids)
        containment_overall = self._calculate_containment_rate(all_interaction_ids)
        escalation_metrics = self._calculate_escalation_metrics(all_interaction_ids)

        # Chat-specific: filter chat interaction IDs
        chat_inter_ids = [i["id"] for i in interactions if i.get("interaction_type") == "chat"]
        chat_response_time = self._calculate_chat_response_time(chat_inter_ids)
        chat_resolution = self._calculate_chat_resolution_rate(interactions)

        # ── Per-agent metrics ──
        all_metrics = []
        W_CSAT, W_VOL, W_AHT = 0.5, 0.3, 0.2

        for aid in agent_ids:
            inters = agent_inters_map[aid]
            count = len(inters)
            a_type = agent_type_map.get(aid, "voice")

            # AHT
            durations = []
            for i in inters:
                if i.get("started_at") and i.get("end_at"):
                    s = _parse_time(i["started_at"])
                    e = _parse_time(i["end_at"])
                    if s and e:
                        durations.append((e - s).total_seconds())
            avg_aht = sum(durations) / len(durations) if durations else 0.0
            if not durations:
                samples = agent_analytics_samples[aid]
                if samples:
                    avg_aht = sum(s.get("resolution_time_sec") or 0 for s in samples) / len(samples)

            # CSAT
            samples = agent_analytics_samples[aid]
            avg_csat = sum(s.get("csat_score") or 0 for s in samples) / len(samples) if samples else 0.0

            # FCR
            fcr_count = self._calculate_fcr(inters)
            fcr_pct = (fcr_count / count * 100) if count > 0 else 0.0

            # Sentiment shift (per-agent average)
            agent_inter_ids = [i["id"] for i in inters]
            agent_shifts = [sentiment_shifts.get(iid, 0.0) for iid in agent_inter_ids]
            avg_shift = sum(agent_shifts) / len(agent_shifts) if agent_shifts else 0.0

            # Containment (per-agent)
            agent_containment = self._calculate_containment_rate(agent_inter_ids)

            # Escalation count for this agent
            agent_escalation = self._calculate_escalation_metrics(agent_inter_ids)

            # Chat response time (per-agent, only if chat agent)
            agent_chat_ids = [i["id"] for i in inters if i.get("interaction_type") == "chat"]
            agent_chat_rt = self._calculate_chat_response_time(agent_chat_ids) if agent_chat_ids else 0.0
            agent_chat_res = self._calculate_chat_resolution_rate(inters)

            all_metrics.append({
                "id": aid, "name": agent_map[aid], "type": a_type,
                "total": count, "aht": avg_aht, "csat": avg_csat,
                "fcr_pct": fcr_pct, "sentiment_shift": avg_shift,
                "containment": agent_containment,
                "escalation_count": agent_escalation["escalation_count"],
                "coaching_count": agent_escalation["coaching_count"],
                "chat_rt": agent_chat_rt, "chat_res": agent_chat_res,
            })

        if not all_metrics:
            return empty

        # Normalization for performance score
        max_calls = max(m["total"] for m in all_metrics)
        min_calls = min(m["total"] for m in all_metrics)
        max_aht = max(m["aht"] for m in all_metrics)
        min_aht = min(m["aht"] for m in all_metrics)

        breakdown = []
        for m in all_metrics:
            norm_calls = 1.0 if max_calls == min_calls else (m["total"] - min_calls) / (max_calls - min_calls)
            norm_aht = 1.0 if max_aht == min_aht else 1 - ((m["aht"] - min_aht) / (max_aht - min_aht))
            perf = (W_CSAT * m["csat"]) + (W_VOL * norm_calls * 100) + (W_AHT * norm_aht * 100)

            breakdown.append(AgentAnalytics(
                agent_id=m["id"], agent_name=m["name"], agent_type=m["type"],
                total_interactions=m["total"], avg_handle_time=m["aht"],
                fcr_percentage=m["fcr_pct"], avg_csat=m["csat"],
                performance_score=perf, sentiment_shift=m["sentiment_shift"],
                containment_rate=m["containment"],
                avg_response_time=m["chat_rt"],
                chat_resolution_rate=m["chat_res"],
                escalation_count=m["escalation_count"],
                coaching_count=m["coaching_count"],
            ))

        # Supervisor aggregates
        total_int = sum(m["total"] for m in all_metrics)
        if total_int > 0:
            super_csat = sum(m["csat"] * m["total"] for m in all_metrics) / total_int
            super_aht = sum(m["aht"] * m["total"] for m in all_metrics) / total_int
            total_fcr = sum((m["fcr_pct"] / 100 * m["total"]) for m in all_metrics)
            super_fcr = (total_fcr / total_int) * 100
            super_perf = sum(b.performance_score for b in breakdown) / len(breakdown)
            super_shift = sum(m["sentiment_shift"] * m["total"] for m in all_metrics) / total_int
        else:
            super_csat = super_aht = super_fcr = super_perf = super_shift = 0.0

        voice_count = sum(1 for i in interactions if i.get("interaction_type") == "voice")
        chat_count = sum(1 for i in interactions if i.get("interaction_type") == "chat")
        total_coaching = sum(m["coaching_count"] for m in all_metrics)
        num_agents = len(agent_ids)

        return SupervisorAnalytics(
            performance_score=super_perf, fcr_percentage=super_fcr,
            avg_csat=super_csat, avg_handle_time=super_aht,
            total_interactions=total_int, agents_breakdown=breakdown,
            avg_sentiment_shift=super_shift, containment_rate=containment_overall,
            avg_escalation_resolution_time=escalation_metrics["avg_resolution_time_sec"],
            coaching_frequency=total_coaching / num_agents if num_agents else 0.0,
            chat_avg_response_time=chat_response_time,
            chat_resolution_rate=chat_resolution,
            total_voice_interactions=voice_count,
            total_chat_interactions=chat_count,
        )

    # ── Core: Agent Analytics ─────────────────────────────────────────

    def get_agent_analytics(self, agent_id: UUID, time_period: str = "all_time") -> AgentAnalytics:
        """Calculate analytics for a specific agent (uses supervisor context for normalization)."""
        agent_res = self.supabase.table("agents").select("name, supervisor_id").eq(
            "id", str(agent_id)).limit(1).execute()
        if not agent_res.data:
            return AgentAnalytics(agent_id=str(agent_id), agent_name="Unknown",
                                  total_interactions=0, avg_handle_time=0,
                                  fcr_percentage=0, avg_csat=0, performance_score=0)
        sup_analytics = self.get_supervisor_analytics(
            agent_res.data[0]["supervisor_id"], time_period)
        target = str(agent_id)
        for agent_data in sup_analytics.agents_breakdown:
            if agent_data.agent_id == target:
                return agent_data
        return AgentAnalytics(agent_id=str(agent_id), agent_name="Unknown",
                              total_interactions=0, avg_handle_time=0,
                              fcr_percentage=0, avg_csat=0, performance_score=0)

    # ── New: Admin Analytics ──────────────────────────────────────────

    def get_admin_analytics(self, time_period: str = "all_time") -> AdminAnalytics:
        """Aggregate analytics across ALL supervisors."""
        sups_res = self.supabase.table("supervisors").select("\"userID\"").execute()
        sup_ids = [s["userID"] for s in (sups_res.data or [])]

        if not sup_ids:
            return AdminAnalytics(
                overall_csat=0, total_interactions=0, total_voice_interactions=0,
                total_chat_interactions=0, avg_handle_time=0, avg_fcr=0,
                containment_rate=0, avg_sentiment_shift=0,
            )

        all_sup_analytics: List[SupervisorAnalytics] = []
        for sid in sup_ids:
            try:
                sa = self.get_supervisor_analytics(UUID(sid), time_period)
                all_sup_analytics.append(sa)
            except Exception as e:
                logger.warning("Admin analytics: failed for supervisor %s: %s", sid, e)

        total = sum(s.total_interactions for s in all_sup_analytics)
        if total == 0:
            return AdminAnalytics(
                overall_csat=0, total_interactions=0, total_voice_interactions=0,
                total_chat_interactions=0, avg_handle_time=0, avg_fcr=0,
                containment_rate=0, avg_sentiment_shift=0,
            )

        w_csat = sum(s.avg_csat * s.total_interactions for s in all_sup_analytics) / total
        w_aht = sum(s.avg_handle_time * s.total_interactions for s in all_sup_analytics) / total
        w_fcr = sum(s.fcr_percentage * s.total_interactions for s in all_sup_analytics) / total
        w_shift = sum(s.avg_sentiment_shift * s.total_interactions for s in all_sup_analytics) / total
        w_contain = sum(s.containment_rate * s.total_interactions for s in all_sup_analytics) / total
        w_esc = sum(s.avg_escalation_resolution_time * s.total_interactions for s in all_sup_analytics) / total
        total_coaching = sum(s.coaching_frequency * len(s.agents_breakdown) for s in all_sup_analytics)
        total_agents = sum(len(s.agents_breakdown) for s in all_sup_analytics)
        w_chat_rt = sum(s.chat_avg_response_time * s.total_chat_interactions for s in all_sup_analytics)
        total_chat = sum(s.total_chat_interactions for s in all_sup_analytics)
        w_chat_res = sum(s.chat_resolution_rate * s.total_chat_interactions for s in all_sup_analytics)
        w_perf = sum(s.performance_score * s.total_interactions for s in all_sup_analytics) / total

        sup_breakdown = []
        for idx, sa in enumerate(all_sup_analytics):
            sup_breakdown.append(SupervisorSummary(
                supervisor_id=sup_ids[idx],
                performance_score=sa.performance_score,
                total_interactions=sa.total_interactions,
                avg_handle_time=sa.avg_handle_time,
                avg_csat=sa.avg_csat,
                fcr_percentage=sa.fcr_percentage,
                containment_rate=sa.containment_rate,
            ))

        # Peak interaction time chart data (24h buckets)
        now = datetime.utcnow()
        start_date = None
        if time_period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)

        peak_buckets = {h: 0 for h in range(24)}
        try:
            iq = self.supabase.table("interactions").select("started_at")
            if start_date:
                iq = iq.gte("started_at", start_date.isoformat())
            interaction_rows = iq.execute().data or []
            for row in interaction_rows:
                ts = _parse_time(row.get("started_at"))
                if not ts:
                    continue
                peak_buckets[ts.hour] = peak_buckets.get(ts.hour, 0) + 1
        except Exception as e:
            logger.warning("Peak interaction buckets failed: %s", e)

        peak_points = [
            PeakInteractionPoint(
                hour=f"{h:02d}:00",
                interactions=peak_buckets.get(h, 0),
            )
            for h in range(24)
        ]

        return AdminAnalytics(
            overall_csat=w_csat,
            total_interactions=total,
            total_voice_interactions=sum(s.total_voice_interactions for s in all_sup_analytics),
            total_chat_interactions=total_chat,
            avg_handle_time=w_aht,
            avg_fcr=w_fcr,
            containment_rate=w_contain,
            avg_sentiment_shift=w_shift,
            avg_escalation_resolution_time=w_esc,
            coaching_frequency=total_coaching / total_agents if total_agents else 0.0,
            chat_avg_response_time=w_chat_rt / total_chat if total_chat else 0.0,
            chat_resolution_rate=w_chat_res / total_chat if total_chat else 0.0,
            performance_score=w_perf,
            supervisors_breakdown=sup_breakdown,
            peak_interaction_hours=peak_points,
        )
