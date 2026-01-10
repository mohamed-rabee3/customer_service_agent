from app.db.supabase_client import supabase


class AdminService:
    @staticmethod
    async def get_dashboard_stats():
        # Count and get active supervisors
        active_res = supabase.table("supervisors").select("*", count="exact").eq("status", "active").limit(15).execute()

        # Get leaderboard top 5
        leader_res = supabase.table("supervisors").select("full_name, performance_score").order("performance_score",
                                                                                                desc=True).limit(
            5).execute()

        leaderboard = [
            {"full_name": s["full_name"], "performance_score": s["performance_score"], "rank": i + 1}
            for i, s in enumerate(leader_res.data)
        ]

        return {
            "total_active_supervisors": active_res.count or 0,
            "active_supervisors": active_res.data,
            "leaderboard": leaderboard
        }