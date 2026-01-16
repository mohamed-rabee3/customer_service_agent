import React from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const navigate = useNavigate();

    const handleLogout = () => {
        // Perform logout logic here (clear tokens, etc.)
        console.log('Logging out...');
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--bg)' }}>
            {/* Sidebar (Left Side) - Moved before content for LTR */}
            <Box sx={{
                width: isSidebarOpen ? '260px' : '0px',
                flexShrink: 0,
                transition: 'width 0.3s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                borderRight: isSidebarOpen ? '1px solid #ccfbf1' : 'none', // Changed border-left to border-right
                // Sticky Positioning
                position: 'sticky',
                top: 0,
                height: '100vh',
                zIndex: 1200 // Ensure it stays above content if needed, though TopBar is fixed
            }}>
                <Sidebar onLogout={handleLogout} />
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* TopBar */}
                <TopBar isOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                {/* Page Content */}
                <Box sx={{ mt: '60px', p: 3, overflow: 'auto', flexGrow: 1 }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default MainLayout;
