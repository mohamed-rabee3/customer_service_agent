import React, { useState } from 'react';
import {
    LayoutDashboard,
    BarChart2,
    Users,
    Settings,
    LogOut,
    Cog,
} from 'lucide-react';
import './Sidebar.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { AnimatePresence, motion } from 'framer-motion';
import ProfileDrawer from '../ProfileDrawer';

interface SidebarProps {
    onLogout?: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onClose }) => {
    const { role, supervisorType } = useAuth();
    const { profile } = useUserProfile();
    const navigate = useNavigate();
    const location = useLocation();
    const [profileOpen, setProfileOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const handleNav = (path: string) => {
        navigate(path);
        onClose();
    };

    const getNavItems = () => {
        if (role === 'admin') {
            return [
                { path: '/', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/analytics', label: 'Analytics', icon: BarChart2 },
                { path: '/archive', label: 'Archive', icon: Users },
            ];
        }
        return [
            { path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/analytics', label: 'Analytics', icon: BarChart2 },
            { path: '/archive', label: 'Archive', icon: Users },
            { path: '/agent-config', label: 'Agent Config', icon: Cog },
        ];
    };

    const navItems = getNavItems();

    return (
        <>
            <div
                className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            <div className={`sidebar-drawer ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h1>Company Name</h1>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <span className="section-title">Navigation</span>
                        {navItems.map((item) => (
                            <div
                                key={item.path}
                                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => handleNav(item.path)}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="nav-section profile-section">
                        <span className="section-title">Profile</span>
                        <div className="user-card" onClick={() => setProfileOpen(true)} style={{ cursor: 'pointer' }}>
                            <div className="user-avatar" style={profile.avatarUrl ? {
                                backgroundImage: `url(${profile.avatarUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            } : undefined}>
                                {!profile.avatarUrl && <Users size={24} />}
                            </div>
                            <div className="user-text">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={profile.name}
                                        className="user-name"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        {profile.name}
                                    </motion.span>
                                </AnimatePresence>
                                <span className="user-role">
                                    {role === 'admin' ? 'Admin' : `${supervisorType === 'voice' ? 'Voice' : 'Chat'} Supervisor`}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
                            onClick={() => handleNav('/settings')}
                        >
                            <Settings size={20} />
                            <span>Settings</span>
                        </div>
                        <div className="nav-item logout-item" onClick={onLogout} style={{ cursor: 'pointer' }}>
                            <LogOut size={20} />
                            <span>Logout</span>
                        </div>
                    </div>
                </nav>
            </div>

            <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
};
export default React.memo(Sidebar);
