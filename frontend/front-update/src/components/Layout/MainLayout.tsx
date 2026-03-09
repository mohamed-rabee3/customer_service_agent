import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../../context/AuthContext';

const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        // Start fade-out animation
        setIsLoggingOut(true);
        
        // Wait for animation, then logout and navigate
        setTimeout(() => {
            logout();
            navigate('/login');
        }, 400);
    };

    return (
        <>
            {/* Logout fade overlay */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    bgcolor: 'var(--bg)',
                    zIndex: 9999,
                    opacity: isLoggingOut ? 1 : 0,
                    visibility: isLoggingOut ? 'visible' : 'hidden',
                    transition: 'opacity 0.4s ease-out, visibility 0.4s ease-out',
                    pointerEvents: isLoggingOut ? 'all' : 'none',
                }}
            />

            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: '100vh', 
                    bgcolor: 'var(--bg)',
                    opacity: isLoggingOut ? 0 : 1,
                    transition: 'opacity 0.3s ease-out',
                }}
            >
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    onLogout={handleLogout}
                />

                <TopBar
                    onToggleSidebar={() => setIsSidebarOpen(true)}
                />

                <Box 
                    sx={{ 
                        mt: '60px', 
                        p: { xs: 2, sm: 3 }, 
                        overflow: 'auto', 
                        flexGrow: 1,
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </>
    );
};

export default MainLayout;