from fastapi import HTTPException
from app.repositories.interaction_repository import InteractionRepository
from app.db.supabase_client import supabase
from dateutil import parser


class InteractionService:
    @staticmethod
    async def update_interaction_status(interaction_id, status, current_user):
        interaction = InteractionRepository.get_detailed(interaction_id)
        if not interaction: raise HTTPException(404)

        # Check Ownership
        agent = supabase.table("agents").select("id").eq("id", interaction["agent_id"]).eq("supervisor_id",
                                                                                           current_user.id).execute()
        if not agent.data: raise HTTPException(403)

        return InteractionRepository.update_status(interaction_id, status, parser.parse(interaction["started_at"]))