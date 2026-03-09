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
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <MainLayout />;
};

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={() => {}} />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/archive" element={<ArchiveRouter />} />
        <Route path="/archive/:id" element={<CallDetails />} />
        <Route path="/issues" element={<ArchiveIssues />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/voice-agent" element={<VoiceAgentMonitoring />} />
        <Route path="/chat-agent" element={<ChatMonitoring />} />
        <Route path="/agent-config" element={<AgentConfiguration />} />
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
