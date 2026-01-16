import React from 'react';
import {
    LayoutDashboard,
    BarChart2,
    Users,
    Settings,
    LogOut,
    Mic,
    MessageSquare
}
    from 'lucide-react';
import './Sidebar.css';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

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
                    <div
                        className={`nav-item ${isActive('/') ? 'active' : ''}`}
                        onClick={() => navigate('/')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </div>
                    <div
                        className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}
                        onClick={() => navigate('/analytics')}
                    >
                        <BarChart2 size={20} />
                        <span>Analytics</span>
                    </div>
                    <div
                        className={`nav-item ${isActive('/archive') ? 'active' : ''}`}
                        onClick={() => navigate('/archive')}
                    >
                        <Users size={20} />
                        <span>Archive</span>
                    </div>

                    <div
                        className={`nav-item ${isActive('/issues') ? 'active' : ''}`}
                        onClick={() => navigate('/issues')}
                    >
                        <Users size={20} />
                        <span>Archive issues</span>
                    </div>

                </div>

                {/* Agent control */}
                <div className="nav-section">
                    <span className="section-title">Agent control</span>
                    <div
                        className={`nav-item ${isActive('/voice-agent') ? 'active' : ''}`}
                        onClick={() => navigate('/voice-agent')}
                    >
                        <Mic size={20} />
                        <span>Voice Agent</span>
                    </div>
                    <div
                        className={`nav-item ${isActive('/chat-agent') ? 'active' : ''}`}
                        onClick={() => navigate('/chat-agent')}
                    >
                        <MessageSquare size={20} />
                        <span>Chat agent</span>
                    </div>
                    <div
                        className={`nav-item ${isActive('/agent-config') ? 'active' : ''}`}
                        onClick={() => navigate('/agent-config')}
                    >
                        <Settings size={20} />
                        <span>Agent config</span>
                    </div>


                </div>

                {/* Profile */}
                <div className="nav-section profile-section">
                    <span className="section-title">Profile</span>
                    <div className="user-card">

                        <div className="user-avatar">
                            <Users size={24} />
                        </div>
                        <div className="user-text">
                            <span className="user-name">User name</span>
                            <span className="user-role">Admin</span>
                        </div>
                    </div>
                    <div
                        className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
                        onClick={() => navigate('/settings')}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </div>
                    <div className="nav-item logout-item" onClick={onLogout}
                        style={{ cursor: 'pointer' }}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
