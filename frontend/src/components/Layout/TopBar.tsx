import { useState } from 'react';
import './TopBar.css';
import { Bell, User, Search, LayoutDashboard, Mic, MessageSquare, BarChart3, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Menu as MuiMenu, MenuItem, Badge } from '@mui/material';

interface TopBarProps {
    isOpen?: boolean;
    onToggleSidebar: () => void;
}

const TopBar = ({ isOpen, onToggleSidebar }: TopBarProps) => {

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [hasUnread, setHasUnread] = useState(true);
    const navigate = useNavigate();

    const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
        setHasUnread(false);
    };

    const handleNotificationClose = () => {
        setAnchorEl(null);
    };

    return (
        <header className="topbar-container"
            style={{
                width: isOpen ? 'calc(100% - 260px)' : '100%',
                left: isOpen ? '260px' : 0,
                transition: 'width 0.3s ease, left 0.3s ease'
            }}>

            {/* LEFT SECTION (LTR Start) - Toggle + Search */}
            <div className="topbar-left">
                {/* Toggle Button */}
                <div className="icon-wrapper" onClick={onToggleSidebar} data-tooltip="Toggle Sidebar">
                    <Menu size={20} />
                </div>

                {/* Search Bar */}
                <div className="Search-box" style={{ marginLeft: '20px' }}>
                    <Search size={18} className="Search-icon" />
                    <input type="text"
                        placeholder="Search"
                        style={{ textAlign: 'left' }}
                    />
                </div>
            </div>

            {/* RIGHT SECTION (LTR End) - Actions */}
            <div className="topbar-right">

                {/* Navigation Icons */}
                <div className="right-icons-group" style={{ display: 'flex', gap: '15px', paddingRight: '20px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="icon-wrapper" data-tooltip="Analytics" onClick={() => navigate('/analytics')}>
                        <BarChart3 size={20} />
                    </div>
                    <div className="icon-wrapper" data-tooltip="Chat Agent" onClick={() => navigate('/chat-agent')}>
                        <MessageSquare size={20} />
                    </div>
                    <div className="icon-wrapper" data-tooltip="Voice Agent" onClick={() => navigate('/voice-agent')}>
                        <Mic size={20} />
                    </div>
                    <div className="icon-wrapper" data-tooltip="Dashboard" onClick={() => navigate('/')}>
                        <LayoutDashboard size={20} />
                    </div>
                </div>

                {/* Notification */}
                <div className="icon-wrapper"
                    data-tooltip="Notifications"
                    onClick={handleNotificationClick}
                >
                    <Badge color="error" variant="dot" invisible={!hasUnread}>
                        <Bell size={20} />
                    </Badge>
                </div>

                {/* User Profile */}
                <div className="user-profile-section" style={{ marginLeft: '10px' }}>
                    <div className="user-info">
                        <span className="user-name">User</span>
                        <span className="user-status">● Online</span>
                    </div>
                    <div className="avatar-circle">
                        <User size={18} color="white" />
                    </div>
                </div>

                <MuiMenu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleNotificationClose}
                    PaperProps={{
                        sx: {
                            mt: 1.5,
                            width: 320,
                            maxHeight: 400,
                            overflow: 'auto',
                            bgcolor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid #ccfbf1',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    <MenuItem onClick={handleNotificationClose}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontWeight: 'bold', color: '#0d9488' }}>New Alert</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>High call volume detected in Voice Agent queue.</span>
                        </div>
                    </MenuItem>
                    <MenuItem onClick={handleNotificationClose}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontWeight: 'bold', color: '#0d9488' }}>System Update</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Maintenance scheduled for 2:00 AM.</span>
                        </div>
                    </MenuItem>
                    <MenuItem onClick={handleNotificationClose}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontWeight: 'bold', color: '#0d9488' }}>New Message</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Supervisor added a comment to Agent-1.</span>
                        </div>
                    </MenuItem>
                </MuiMenu>
            </div>
        </header>
    );
};

export default TopBar;
