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
        """Get compiled data for admin dashboard."""
        data = self.repository.get_supervisors_by_performance(limit=100)
        
        active_list = []
        for item in data[:15]:
            active_list.append(SupervisorCard(
                id=item["userID"],
                name=item.get("name", "Supervisor"),
                email=item.get("email"),
                supervisor_type=item["supervisor_type"],
                created_at=item["created_at"],
                is_active=True,
                active_agents_count=0
            ))
            
        leaderboard = []
        for i, item in enumerate(data[:5]):
            leaderboard.append(LeaderboardEntry(
                id=item["userID"],
                name=item.get("name", "Supervisor"),
                performance_score=item["performance_score"],
                rank=i + 1
            ))
            
        return AdminDashboardResponse(
            total_active_supervisors=len(data),
            active_supervisors=active_list,
            leaderboard=leaderboard
        )
