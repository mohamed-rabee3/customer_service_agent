from app.db.supabase_client import supabase
from datetime import datetime, timezone

class InteractionRepository:
    @staticmethod
    def get_detailed(interaction_id: str):
        interaction = supabase.table("interactions").select("*").eq("id", interaction_id).single().execute().data
        if not interaction: return None
        metrics = supabase.table("realtime_metrics").select("*").eq("interaction_id", interaction_id).order("timestamp").execute()
        interaction["realtime_metrics"] = metrics.data
        return interaction

    @staticmethod
    def update_status(interaction_id: str, status: str, started_at: datetime):
        now = datetime.now(timezone.utc)
        duration = int((now - started_at).total_seconds())
        return supabase.table("interactions").update({
            "status": status, "ended_at": now.isoformat(), "duration_seconds": duration
        }).eq("id", interaction_id).execute()