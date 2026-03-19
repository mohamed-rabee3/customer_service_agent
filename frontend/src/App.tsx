import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UserProfileProvider } from './context/UserProfileContext';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminArchive from './pages/admin/AdminArchive';
import VoiceArchive from './pages/admin/VoiceArchive';
import ChatArchive from './pages/admin/ChatArchive';
import CallDetails from './pages/admin/CallDetails';
import ArchiveIssues from './pages/admin/ArchiveIssues';
import SettingsPage from './pages/admin/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import AgentConfiguration from './pages/agents/AgentConfiguration';
import ChatMonitoring from './pages/agents/ChatMonitoring';
import VoiceAgentMonitoring from './pages/agents/VoiceAgentMonitoring';
import MainLayout from './components/Layout/MainLayout';

const ArchiveRouter: React.FC = () => {
  const { role, supervisorType } = useAuth();
  if (role === 'supervisor') {
    return supervisorType === 'voice' ? <VoiceArchive /> : <ChatArchive />;
  }
  return <AdminArchive />;
};

const DashboardRouter: React.FC = () => {
  const { role, supervisorType } = useAuth();
  if (role === 'supervisor') {
    return supervisorType === 'voice' ? <VoiceAgentMonitoring /> : <ChatMonitoring />;
  }
  return <AdminDashboard />;
};

const ProtectedRoutes: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}><div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--text-main)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <MainLayout />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  if (role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SupervisorRoute: React.FC<{ children: React.ReactNode, type?: 'voice' | 'chat' }> = ({ children, type }) => {
  const { role, supervisorType } = useAuth();
  if (role === 'admin') return <>{children}</>; // Admins can see everything
  if (role !== 'supervisor') return <Navigate to="/" replace />;
  if (type && supervisorType !== type) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { isLoggedIn, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--text-main)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/archive" element={<ArchiveRouter />} />
        <Route path="/archive/:id" element={<CallDetails />} />
        
        {/* Admin Only Routes */}
        <Route path="/issues" element={<AdminRoute><ArchiveIssues /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="/agent-config" element={<AdminRoute><AgentConfiguration /></AdminRoute>} />

        {/* Supervisor (+ Admin fallback) Routes */}
        <Route path="/voice-agent" element={<SupervisorRoute type="voice"><VoiceAgentMonitoring /></SupervisorRoute>} />
        <Route path="/chat-agent" element={<SupervisorRoute type="chat"><ChatMonitoring /></SupervisorRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProfileProvider>
          <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <AppRoutes />
            </Router>
          </MuiThemeProvider>
        </UserProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
