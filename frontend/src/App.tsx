import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme/theme';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminArchive from './pages/admin/AdminArchive';
import ArchiveIssues from './pages/admin/ArchiveIssues';
import SettingsPage from './pages/admin/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import AgentConfiguration from './pages/agents/AgentConfiguration';
import ChatMonitoring from './pages/agents/ChatMonitoring';
import VoiceAgentMonitoring from './pages/agents/VoiceAgentMonitoring';
import MainLayout from './components/Layout/MainLayout';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={() => { }} />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/archive" element={<AdminArchive />} />
            <Route path="/issues" element={<ArchiveIssues />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Agent Routes */}
            <Route path="/voice-agent" element={<VoiceAgentMonitoring />} />
            <Route path="/chat-agent" element={<ChatMonitoring />} />
            <Route path="/agent-config" element={<AgentConfiguration />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;