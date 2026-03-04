"""Admin service."""
from typing import List, Dict, Any
from app.db.supabase import get_supabase_client
from app.api.v1.schemas.admin import AdminDashboardResponse, SupervisorCard, LeaderboardEntry

class AdminService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def get_dashboard_data(self) -> AdminDashboardResponse:
        """Get compiled data for admin dashboard with strict active counts."""
        # 1. Get all supervisors
        sup_res = self.supabase.table("supervisors").select("*").order("performance_score", desc=True).limit(100).execute()
        all_supervisors = sup_res.data or []
        
        # 2. Get active interactions count per supervisor
        active_res = self.supabase.table("interactions").select("agent_id, agents!inner(supervisor_id)").eq("status", "active").execute()
        active_stats = {}
        for item in (active_res.data or []):
            sup_id = item.get("agents", {}).get("supervisor_id", "")
            if sup_id:
                active_stats[sup_id] = active_stats.get(sup_id, 0) + 1
        
        # 3. Build active supervisors list
        active_list_models = []
        for item in all_supervisors:
            sup_id = item["userID"]
            active_count = active_stats.get(sup_id, 0)
            
            if active_count > 0:
                active_list_models.append(SupervisorCard(
                    id=sup_id,
                    name=item.get("name", "Supervisor"),
                    email=item.get("email"),
                    supervisor_type=item["supervisor_type"],
                    created_at=item["created_at"],
                    is_active=True,
                    active_agents_count=active_count
                ))
                
        active_list_final = active_list_models[:15]
            
        # 4. Leaderboard (Top 5 by performance)
        leaderboard = []
        for i, item in enumerate(all_supervisors[:5]):
            leaderboard.append(LeaderboardEntry(
                id=item["userID"],
                name=item.get("name", "Supervisor"),
                performance_score=item["performance_score"] or 0,
                rank=i + 1
            ))
            
        return AdminDashboardResponse(
            total_active_supervisors=len(active_list_models),
            active_supervisors=active_list_final,
            leaderboard=leaderboard
        )

