import React, { useState } from 'react';
import './TopBar.css';
import { Bell, User, Search, Menu, Sun, Moon, X, Check, AlertTriangle, Shield, Database } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { AnimatePresence, motion } from 'framer-motion';
import ProfileDrawer from '../ProfileDrawer';

interface TopBarProps {
    onToggleSidebar: () => void;
}

type NotifStatus = 'pending' | 'approved' | 'rejected';

const TopBar = ({ onToggleSidebar }: TopBarProps) => {
    const { isDarkMode, toggleTheme } = useTheme();
    const { profile } = useUserProfile();
    const [showNotifications, setShowNotifications] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    
    // Remove mockNotifications and replace with empty state for POC
    const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
    const [statuses, setStatuses] = useState<Record<number, NotifStatus>>({});

    const pendingCount = Object.values(statuses).filter(s => s === 'pending').length;

    const handleAction = (id: number, action: NotifStatus) => {
        setStatuses(prev => ({ ...prev, [id]: action }));
    };

    return (
        <>
            <header className="topbar-container" style={{ width: '100%', left: 0 }}>
                <div className="topbar-left">
                    <div className="icon-wrapper" onClick={onToggleSidebar} data-tooltip="Menu">
                        <Menu size={20} />
                    </div>
                    <div className="Search-box" style={{ marginLeft: '20px' }}>
                        <Search size={18} className="Search-icon" />
                        <input type="text" placeholder="Search" style={{ textAlign: 'left' }} />
                    </div>
                </div>

                <div className="topbar-right">
                    <div className="icon-wrapper" data-tooltip={isDarkMode ? "Light Mode" : "Dark Mode"} onClick={toggleTheme}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </div>

                    <div
                        className="icon-wrapper"
                        data-tooltip="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ position: 'relative' }}
                    >
                        <Bell size={20} />
                        {pendingCount > 0 && (
                            <span style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 8, height: 8, borderRadius: '50%',
                                background: 'var(--danger)', border: '2px solid var(--accent)'
                            }} />
                        )}
                    </div>

                    <div
                        className="user-profile-section"
                        style={{ marginLeft: '10px', cursor: 'pointer' }}
                        onClick={() => setProfileOpen(true)}
                    >
                        <div className="user-info">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={profile.name}
                                    className="user-name"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {profile.name}
                                </motion.span>
                            </AnimatePresence>
                            <span className="user-status">● Online</span>
                        </div>
                        <div className="avatar-circle" style={profile.avatarUrl ? {
                            backgroundImage: `url(${profile.avatarUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        } : undefined}>
                            {!profile.avatarUrl && <User size={18} color="white" />}
                        </div>
                    </div>
                </div>
            </header>

            {/* Notification Panel */}
            {showNotifications && (
                <>
                    <div className="notif-backdrop" onClick={() => setShowNotifications(false)} />
                    <div className="notif-panel">
                        <div className="notif-panel-header">
                            <h3>Agent Requests</h3>
                            <button className="notif-close" onClick={() => setShowNotifications(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="notif-panel-body">
                            {notifications.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No immediate requests
                                </div>
                            ) : (
                                notifications.map((n, i) => {
                                    const status = statuses[n.id];
                                    const IconComp = n.icon;
                                    return (
                                        <div key={n.id} className={`notif-item ${status !== 'pending' ? 'resolved' : ''}`} style={{ animationDelay: `${i * 0.06}s` }}>
                                            <div className={`notif-icon-ring ${n.severity}`}>
                                                <IconComp size={18} />
                                            </div>
                                            <div className="notif-content">
                                                <div className="notif-agent">{n.agent}</div>
                                                <div className="notif-action">{n.action}</div>
                                                <div className="notif-time">{n.time}</div>
                                            </div>
                                            <div className="notif-actions">
                                                {status === 'pending' ? (
                                                    <>
                                                        <button className="notif-btn approve" onClick={() => handleAction(n.id, 'approved')}>
                                                            <Check size={14} /> Allow
                                                        </button>
                                                        <button className="notif-btn reject" onClick={() => handleAction(n.id, 'rejected')}>
                                                            <X size={14} /> Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`notif-status-badge ${status}`}>
                                                        {status === 'approved' ? '✓ Allowed' : '✗ Rejected'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}

            <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
};
export default React.memo(TopBar);
