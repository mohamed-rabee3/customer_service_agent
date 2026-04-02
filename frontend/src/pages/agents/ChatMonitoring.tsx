import React, { useState, useEffect } from 'react';
import { Box, Card, Typography } from '@mui/material';
import ChatAgentCard from '@/components/agents/ChatAgentCard';
import ChatDetailModal from '@/components/agents/ChatDetailModal';
import InjectBox from '@/components/agents/InjectBox';
import '@/components/agents/VoiceAgentSelector.css';
import { agentsAPI } from '@/services/agentsService';
import { chatAPI } from '@/services/chatService';

interface ChatAgent {
  id: string;
  name: string;
  status: 'active' | 'idle';
  sentiment: string;
  performance: string;
  feed: string;
  session_id?: string;
}

/* Glassmorphism card — same DNA as AdminDashboard */
const glassCardSx = {
  textAlign: 'center' as const,
  p: 3,
  borderRadius: 'var(--radius-lg)',
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(var(--glass-blur))',
  WebkitBackdropFilter: 'blur(var(--glass-blur))',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.2)',
  transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: 'var(--shadow-lg), 0 0 24px rgba(84,119,146,0.18)',
    borderColor: 'var(--accent-hex)',
  },
};

const ChatMonitoring: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);
  const [agents, setAgents] = useState<ChatAgent[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // 1. Fetch chat agents from backend
        const agentsRes = await agentsAPI.getAll('chat');
        const rawAgents = agentsRes.data || [];

        // 2. Fetch active sessions to get live metrics
        let activeSessions: any[] = [];
        try {
          const sessionsRes = await chatAPI.getActiveSessions();
          activeSessions = sessionsRes.data || [];
        } catch { /* no active sessions */ }

        // 3. Build session lookup: agent_id → session data
        const sessionMap = new Map<string, any>();
        for (const s of activeSessions) {
          sessionMap.set(s.agent_id, s);
        }

        // 4. Map to ChatAgent interface
        const mapped: ChatAgent[] = rawAgents.map((a: any) => {
          const session = sessionMap.get(a.id);
          const isActive = a.status === 'in_chat';
          return {
            id: a.id,
            name: a.name,
            status: isActive ? 'active' : 'idle',
            sentiment: 'neutral',
            performance: '-',
            feed: session ? `${session.message_count} messages` : 'No active session',
            session_id: session?.session_id,
          };
        });

        setAgents(mapped);
      } catch (err) {
        console.error('Failed to fetch chat agents', err);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const totalActive = agents.filter(a => a.status === 'active').length;
  const avgPerf = Math.round(agents.reduce((acc, a) => acc + parseInt(a.performance), 0) / agents.length);

  return (
    <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <h1 className="text-center text-5xl font-black mb-2" style={{ color: 'var(--text-main)', letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(33,52,72,0.10)' }}>
        Chat Agents
      </h1>
      <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
        Select an agent to view details and monitor live chat activity
      </p>

      {/* Glassmorphism stat cards — same DNA as admin */}
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 5, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Agents', value: agents.length, color: 'var(--text-main)' },
          { label: 'Active Now', value: totalActive, color: 'var(--success)' },
          { label: 'Avg Performance', value: `${avgPerf}%`, color: 'var(--accent-hex)' },
        ].map((stat, idx) => (
          <Box
            key={stat.label}
            sx={{
              minWidth: 180,
              opacity: 0,
              animation: `staggerFadeIn 0.5s cubic-bezier(0.4,0,0.2,1) ${idx * 0.1}s forwards`,
              '@keyframes staggerFadeIn': {
                '0%': { opacity: 0, transform: 'translateY(24px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Card sx={glassCardSx}>
              <Typography variant="caption" fontWeight={600} color="var(--text-muted)" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>{stat.label}</Typography>
              <Typography variant="h4" fontWeight={900} sx={{ color: stat.color }}>{stat.value}</Typography>
            </Card>
          </Box>
        ))}
      </Box>

      <div className="voice-agents-container">
        <div className="voice-agents-grid">
          {agents.map((agent, index) => (
            <ChatAgentCard
              key={agent.id}
              agent={agent}
              index={index}
              isSelected={selectedAgent?.id === agent.id}
              onClick={(a) => setSelectedAgent(a)}
            />
          ))}
        </div>
      </div>

      <ChatDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

      <InjectBox agents={agents} label="inject" />
    </div>
  );
};

export default ChatMonitoring;
