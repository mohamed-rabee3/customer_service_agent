"""Analytics repository."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics

class AnalyticsRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def _calculate_fcr(self, interactions: List[Dict[str, Any]]) -> int:
        """
        Calculate FCR with strict logic:
        - Based on AI-generated issue tags with resolution status
        - If customer calls back within 3 days with the same issue (phone number + issue tag):
          - Original call's FCR status is decremented
        """
        # 1. Filter relevant interactions (must have phone, issues, and started_at)
        valid_interactions = []
        for i in interactions:
            if not i.get("started_at"):
                continue
            valid_interactions.append(i)

        # Sort by date asc
        valid_interactions.sort(key=lambda x: x["started_at"])

        # Create a lookup for quick checks: (phone, issue_tag) -> [list of timestamps]
        history_map = {}
        
        # Helper to parse time
        def parse_time(t_str):
            try:
                return datetime.fromisoformat(t_str.replace('Z', '+00:00'))
            except ValueError:
                return None

        for item in valid_interactions:
            phone = item.get("phone_number") # Can be None now
            started_at = parse_time(item["started_at"])
            if not started_at: continue
            
            issues = item.get("issues") or []
            # Normalize issues to list of issue names/tags
            # Assuming 'issues' is a list of dicts like [{"type": "Payment", "resolved": True}] based on docs
            # Or simplified strings. Docs say "AI-generated issue tags". Let's assume parsed issues or use tags if issues structure is complex.
            # Docs say: "issues resolved... if customer calls back... with same issue (identified by phone + issue tag)"
            
            # Let's use 'tags' (Topic tags) or 'issues' field. 
            # Ideally we check collision on (phone, issue_text).
            
            # For this implementation, we will use the 'tags' list as proxy for "Issue Tag" 
            # if 'issues' is not a simple list of strings.
            # Let's extract issue identifiers.
            
            current_issue_identifiers = []
            
            # Extract from 'issues' column
            if isinstance(issues, list):
                for iss in issues:
                    if isinstance(iss, dict) and "type" in iss:
                        current_issue_identifiers.append(iss["type"])
                    elif isinstance(iss, str):
                        current_issue_identifiers.append(iss)
            
            # Also fall back to 'tags' if issues is empty
            if not current_issue_identifiers and item.get("tags"):
                current_issue_identifiers.extend(item["tags"])

            item["_parsed_issues"] = current_issue_identifiers
            item["_parsed_time"] = started_at
            
            for issue in current_issue_identifiers:
                key = (phone, issue)
                if key not in history_map:
                    history_map[key] = []
                history_map[key].append(started_at)

        fcr_count = 0
        
        for item in valid_interactions:
            # Check if this interaction ITSELF was resolved
            # Logic: ALL issues must be marked "resolved"
            issues_data = item.get("issues") or []
            is_resolved_initially = False
            
            if not issues_data:
                # No issues recorded? Assume resolved or ignore? 
                # Docs: "If customer calls back...". Implies initially it was okay.
                is_resolved_initially = True
            else:
                # Check all issues resolved
                all_resolved = True
                for iss in issues_data:
                    if isinstance(iss, dict) and not iss.get("resolved", False):
                        all_resolved = False
                        break
                if all_resolved:
                    is_resolved_initially = True
            
            if not is_resolved_initially:
                continue

            # Now check the 3-day callback rule for EACH issue in this interaction
            # If ANY issue reappears within 3 days, FCR is invalid.
            
            is_fcr_valid = True
            my_time = item["_parsed_time"]
            my_issues = item["_parsed_issues"]
            
            for issue in my_issues:
                phone = item.get("phone_number")
                if not phone:
                    # Without phone, we assume no callback possible (best effort)
                    continue
                    
                key = (phone, issue)
                # Check future timestamps for this key
                occurrences = history_map.get(key, [])
                for occ_time in occurrences:
                    if occ_time > my_time and (occ_time - my_time) <= timedelta(days=3):
                        # Found a callback with same issue within 3 days
                        is_fcr_valid = False
                        break
                if not is_fcr_valid:
                    break
            
            if is_fcr_valid:
                fcr_count += 1
                
        return fcr_count

    def get_supervisor_analytics(self, supervisor_id: UUID, time_period: str = "all_time") -> SupervisorAnalytics:
        """Calculate analytics for a supervisor using interactions as source of truth."""
        
        # 1. Determine Date Range
        now = datetime.utcnow()
        start_date = None
        if time_period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
            
        # 2. Get Supervisor's Agents
        agents_res = self.supabase.table("agents").select("id, name").eq("supervisor_id", str(supervisor_id)).execute()
        agents = agents_res.data or []
        agent_ids = [a["id"] for a in agents]
        agent_map = {a["id"]: a["name"] for a in agents}
        
        if not agent_ids:
            return SupervisorAnalytics(
                performance_score=0.0, fcr_percentage=0.0, avg_csat=0.0, avg_handle_time=0.0, 
                total_interactions=0, agents_breakdown=[]
            )

        # 3. Fetch Interactions (Source of Truth for Volume and Timing)
        query = self.supabase.table("interactions").select("*").in_("agent_id", agent_ids)
        if start_date:
            query = query.gte("started_at", start_date.isoformat())
        
        interactions = query.execute().data or []
        
        # 4. Fetch Agent Analytics for CSAT (Matches agents, not specific time as it lacks date)
        # Best effort: use available analytics rows for these agents to get CSAT averages.
        analytics_res = self.supabase.table("agent_analytics").select("*").in_("agent_id", agent_ids).execute()
        analytics_rows = analytics_res.data or []
        
        agent_analytics_samples = {aid: [] for aid in agent_ids}
        for row in analytics_rows:
            if row["agent_id"] in agent_analytics_samples:
                agent_analytics_samples[row["agent_id"]].append(row)

        # 5. Group interactions by agent
        agent_inters_map = {aid: [] for aid in agent_ids}
        for i in interactions:
            agent_inters_map[i["agent_id"]].append(i)

        # 6. Calculate Metrics Per Agent
        all_metrics = []
        for aid in agent_ids:
            inters = agent_inters_map[aid]
            count = len(inters)
            
            # AHT from interactions duration
            durations = []
            for i in inters:
                if i.get("started_at") and i.get("end_at"):
                    try:
                        s = datetime.fromisoformat(i["started_at"].replace('Z', '+00:00'))
                        e = datetime.fromisoformat(i["end_at"].replace('Z', '+00:00'))
                        durations.append((e - s).total_seconds())
                    except: pass
            
            # Fallback to samples from agent_analytics if interactions missing end_at
            avg_aht = 0.0
            if durations:
                avg_aht = sum(durations) / len(durations)
            else:
                samples = agent_analytics_samples[aid]
                if samples:
                    avg_aht = sum(s.get("resolution_time_sec") or 0 for s in samples) / len(samples)

            # CSAT from analytics samples
            samples = agent_analytics_samples[aid]
            avg_csat = sum(s.get("csat_score") or 0 for s in samples) / len(samples) if samples else 0.0
            
            # FCR using calculate_fcr rule
            fcr_count = self._calculate_fcr(inters)
            fcr_pct = (fcr_count / count * 100) if count > 0 else 0.0
            
            all_metrics.append({
                "id": aid,
                "name": agent_map[aid],
                "total": count,
                "aht": avg_aht,
                "csat": avg_csat,
                "fcr_pct": fcr_pct
            })

        # 6. Global Min/Max for Normalization
        if not all_metrics:
            return SupervisorAnalytics(
                performance_score=0.0, fcr_percentage=0.0, avg_csat=0.0, avg_handle_time=0.0, 
                total_interactions=0, agents_breakdown=[]
            )
            
        max_calls = max(m["total"] for m in all_metrics)
        min_calls = min(m["total"] for m in all_metrics)
        max_aht = max(m["aht"] for m in all_metrics)
        min_aht = min(m["aht"] for m in all_metrics)
        
        # 7. Calculate Performance Scores & Final Breakdown
        breakdown = []
        
        # Weights
        W_CSAT = 0.5
        W_VOL = 0.3
        W_AHT = 0.2
        
        for m in all_metrics:
            # Normalize Calls: (Agent - Min) / (Max - Min)
            if max_calls == min_calls:
                norm_calls = 1.0 # If all equal, give full score
            else:
                norm_calls = (m["total"] - min_calls) / (max_calls - min_calls)
                
            # Normalize AHT: 1 - ((Agent - Min) / (Max - Min))
            if max_aht == min_aht:
                norm_aht = 1.0
            else:
                norm_aht = 1 - ((m["aht"] - min_aht) / (max_aht - min_aht))
                
            # Normalize CSAT (Assuming it's already 0-100 or similar. If 0-5, normalize to 0-100)
            # Default assumption: CSAT field is already a percentage or 0-100 score.
            # If values are small (e.g. < 5), we might need to scale. 
            # Let's assume the stored score is 0-100.
            csat_val = m["csat"]
            
            perf_score = (W_CSAT * csat_val) + (W_VOL * norm_calls * 100) + (W_AHT * norm_aht * 100)
            
            breakdown.append(AgentAnalytics(
                agent_id=m["id"],
                agent_name=m["name"],
                total_interactions=m["total"],
                avg_handle_time=m["aht"],
                fcr_percentage=m["fcr_pct"],
                avg_csat=m["csat"],
                performance_score=perf_score
            ))
            
        # 8. Supervisor Aggregate Stats
        total_int = sum(m["total"] for m in all_metrics)
        if total_int > 0:
            # Weighted averages for supervisor
            super_csat = sum(m["csat"] * m["total"] for m in all_metrics) / total_int
            super_aht = sum(m["aht"] * m["total"] for m in all_metrics) / total_int
            
            # FCR across ALL interactions
            # We need to re-run FCR on the specific set of all interactions combined?
            # Or just average the percentages?
            # Correct way: Total FCR Count / Total Interactions
            # We didn't save raw FCR count in step 5, let's reconstruct
            total_fcr_count = sum((m["fcr_pct"]/100 * m["total"]) for m in all_metrics)
            super_fcr = (total_fcr_count / total_int) * 100
            
            # Performance Score: Average of agents' scores? Or calculated on supervisor level?
            # Docs: "Calculation Level: Per supervisor (aggregate of all their agents)"
            # Formula: (CSAT Weight × CSAT%) + (Call Volume Weight × Normalized Calls) + (AHT Weight × Normalized AHT)
            # BUT Supervisor normalization implies comparing Supervisors. 
            # Detailed docs say: "Displayed on admin dashboard and leaderboard... Calculated monthly for rankings."
            # For this endpoint (Single Supervisor View), maybe we just average the agents' scores?
            # Or use the same formula but we don't have "Min/Max Supervisor" here.
            # Let's just Average the agents' performance scores for the Supervisor's "Performance Score" in this view.
            super_perf = sum(b.performance_score for b in breakdown) / len(breakdown)
        else:
            super_csat = 0
            super_aht = 0
            super_fcr = 0
            super_perf = 0

        return SupervisorAnalytics(
            performance_score=super_perf,
            fcr_percentage=super_fcr,
            avg_csat=super_csat,
            avg_handle_time=super_aht,
            total_interactions=total_int,
            agents_breakdown=breakdown
        )

    def get_agent_analytics(self, agent_id: UUID, time_period: str = "all_time") -> AgentAnalytics:
        """Calculate analytics for a specific agent with strict formulas."""
        # Note: To normalize, we technically need the whole team's context. 
        # We will fetch the Supervisor's ID for this agent, then fetch all sibling agents to calculate Min/Max.
        
        # 1. Get Agent & Supervisor
        agent_res = self.supabase.table("agents").select("name, supervisor_id").eq("id", str(agent_id)).limit(1).execute()
        if not agent_res.data:
            return AgentAnalytics(agent_id=str(agent_id), agent_name="Unknown", total_interactions=0, avg_handle_time=0, fcr_percentage=0, avg_csat=0, performance_score=0)
            
        supervisor_id = agent_res.data[0]["supervisor_id"]
        
        # 2. Reuse Supervisor Logic
        # This is inefficient (fetches all agents) but ensures 100% consistency with the formula and context.
        # Since it's a POC with max 3 agents per supervisor, this is actually VERY fast.
        
        sup_analytics = self.get_supervisor_analytics(supervisor_id, time_period)
        
        # 3. Extract specific agent
        target_id = str(agent_id)
        for agent_data in sup_analytics.agents_breakdown:
            if agent_data.agent_id == target_id:
                return agent_data
                
        # If not found (shouldn't happen)
        return AgentAnalytics(agent_id=str(agent_id), agent_name="Unknown", total_interactions=0, avg_handle_time=0, fcr_percentage=0, avg_csat=0, performance_score=0)

