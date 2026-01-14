import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, } from '@mui/material';
import theme from './theme/theme';

// اختاري الصفحة اللي عايزة تشوفيها
//import AdminDashboard from './pages/admin/AdminDashboard';
 import AdminArchive from './pages/admin/AdminArchive';
//import ArchiveIssues from './pages/admin/ArchiveIssues';
// import SettingsPage from './pages/admin/SettingsPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* الصفحة الرئيسية */}
      <Box sx={{ p: { xs: 2, md: 4 } }}>
       {/*  <AdminDashboard />*/}    
        <AdminArchive />
        {/*<ArchiveIssues />*/} 
        {/*   <SettingsPage />*/}

      </Box>
    </ThemeProvider>
  );
}

export default App;