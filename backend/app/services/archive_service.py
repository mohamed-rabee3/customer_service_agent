from fastapi import HTTPException
from app.repositories.archive_repository import ArchiveRepository
from app.db.supabase_client import supabase


class ArchiveService:
    @staticmethod
    async def get_all_archives(current_user, **filters):
        agents = supabase.table("agents").select("id").eq("supervisor_id", current_user.id).execute()
        allowed_ids = [a['id'] for a in agents.data]

        if filters.get('agent_id') and filters['agent_id'] not in allowed_ids:
            raise HTTPException(status_code=403, detail="Access Denied")

        search_ids = [filters['agent_id']] if filters.get('agent_id') else allowed_ids
        res = ArchiveRepository.get_archives_filtered(search_ids, **filters)
        return {"data": res.data, "total": res.count, "page": filters['page'], "limit": filters['limit']}

    @staticmethod
    async def get_archive_details(interaction_id, current_user):
        data = ArchiveRepository.get_archive_by_id(interaction_id)
        if not data: raise HTTPException(status_code=404, detail="Not Found")

        agent = supabase.table("agents").select("id").eq("id", data["agent_id"]).eq("supervisor_id",
                                                                                    current_user.id).execute()
        if not agent.data: raise HTTPException(status_code=403, detail="Unauthorized")
        return data