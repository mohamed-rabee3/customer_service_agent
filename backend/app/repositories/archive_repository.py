from app.db.supabase_client import supabase


class ArchiveRepository:
    @staticmethod
    def get_archives_filtered(agent_ids: list, from_date=None, to_date=None, phone_number=None, tags=None, page=1,
                              limit=10):
        query = supabase.table("archives").select("*", count="exact").in_("agent_id", agent_ids)
        if from_date: query = query.gte("started_at", from_date)
        if to_date: query = query.lte("started_at", to_date)
        if phone_number: query = query.ilike("phone_number", f"%{phone_number}%")
        if tags: query = query.contains("tags", tags)

        offset = (page - 1) * limit
        return query.order("started_at", desc=True).range(offset, offset + limit - 1).execute()

    @staticmethod
    def get_archive_by_id(interaction_id: str):
        return supabase.table("archives").select("*").eq("id", interaction_id).single().execute().data