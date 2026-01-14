import { 
  LayoutDashboard, 
  BarChart2,  
  Users, 
  Settings, 
  LogOut, 
  }
  from 'lucide-react';
import './Sidebar.css'; 
interface SidebarProps{
onLogout: () => void;
}
const Sidebar: React.FC<SidebarProps> = ({onLogout}) => {
  return (
    <div className="sidebar-container">
      {/* Company Name*/}
      <div className="sidebar-header">
        <h1>Company Name</h1>
      </div>

      <nav className="sidebar-nav">
        {/* Performance view */}
        <div className="nav-section">
          <span className="section-title">Performance view</span>
          <div className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div className="nav-item">
            <BarChart2 size={20} />
            <span>Analytics</span>
          </div>
          <div className="nav-item">
            <Users size={20} />
            <span>Archive</span>
          </div>
        
         <div className="nav-item">
            <Users size={20} />
            <span>Archive issues</span>
          </div>
         
        </div>

       {/* Agent control */}
        <div className="nav-section">
          <span className="section-title">Agent control</span>
          <div className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Voice Agent</span>
          </div>
          <div className="nav-item">
            <BarChart2 size={20} />
            <span>Chat agent</span>
          </div>
          <div className="nav-item">
            <Users size={20} />
            <span>Agent config</span>
          </div>

         
        </div>

        {/* Profile */}
        <div className="nav-section profile-section">
          <span className="section-title">Profile</span>
          <div className="user-card">
        
            <div className="user-avatar">
                <Users size={24}/>
            </div>
            <div className="user-text">
              <span className="user-name">User name</span>
              <span className="user-role">Admin</span>
            </div>
          </div>
          <div className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </div>
          <div className="nav-item logout-item" onClick={onLogout}
          style={{cursor: 'pointer'}}>
            <LogOut size={20} />
            <span>Logout</span>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;