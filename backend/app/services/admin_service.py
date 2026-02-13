"""Admin service."""
from typing import List, Dict, Any
from app.db.supabase import get_supabase_client
from app.api.v1.schemas.admin import AdminDashboardResponse, SupervisorCard, LeaderboardEntry
from app.repositories.supervisor_repository import SupervisorRepository

class AdminService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.repository = SupervisorRepository(self.supabase)

    async def get_dashboard_data(self) -> AdminDashboardResponse:
        """Get compiled data for admin dashboard with strict active counts."""
        # 1. Get all supervisors (base list)
        all_supervisors = self.repository.get_supervisors_by_performance(limit=100)
        
        # 2. Get real-time active calls/chats stats
        active_stats = self.repository.get_active_supervisor_stats()
        
        # 3. Filter active list (Supervisors who have > 0 active agents)
        # Docs: "Displays supervisors currently handling active calls or chats"
        active_list_models = []
        
        # We need to map the performance list to the active stats
        # If a supervisor has active agents, they go into the active slider list
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
                
        # Slice to max 15 as per docs
        active_list_final = active_list_models[:15]
            
        # 4. Leaderboard (Top 5 by performance)
        leaderboard = []
        # The repository already returns ordered by performance desc
        for i, item in enumerate(all_supervisors[:5]):
            leaderboard.append(LeaderboardEntry(
                id=item["userID"],
                name=item.get("name", "Supervisor"),
                performance_score=item["performance_score"] or 0,
                rank=i + 1
            ))
            
        return AdminDashboardResponse(
            total_active_supervisors=len(active_list_models), # Total currently active
            active_supervisors=active_list_final,
            leaderboard=leaderboard
        )
