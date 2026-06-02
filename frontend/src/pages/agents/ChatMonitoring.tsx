import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card } from '@mui/material';
import { toast } from 'react-toastify';
import ChatAgentCard from '@/components/agents/ChatAgentCard';
import ChatDetailModal from '@/components/agents/ChatDetailModal';
import InjectBox from '@/components/agents/InjectBox';
import { supervisorsAPI } from '@/services/supervisorsService';
import '@/components/agents/VoiceAgentSelector.css';

export type AgentBackendStatus = 'idle' | 'in_call' | 'in_chat' | 'paused';

export interface ChatAgent {
  id: string;
  name: string;
  status: AgentBackendStatus;
  sentiment: string;
  performance: string;
  feed: string;
  session_id?: string;
  webhook_configs?: {
    telegram?: { enabled?: boolean };
    whatsapp?: { enabled?: boolean };
    instagram?: { enabled?: boolean };
  };
}

const DEFAULT_FEED_IDLE = 'Waiting for chat.';
const DEFAULT_FEED_ACTIVE = 'Live chat in progress.';

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

const mapDashboardAgent = (raw: Record<string, unknown>): ChatAgent => {
  const status = (raw.status as AgentBackendStatus) ?? 'idle';
  const metrics = raw.latest_metrics as Record<string, unknown> | null | undefined;
  const currentInteraction = raw.current_interaction as Record<string, unknown> | null | undefined;
  const rawSent = (metrics?.sentiment as string | undefined) ?? 'neutral';
  const sentiment = rawSent === 'critical' ? 'bad' : rawSent;
  const rawScore = metrics?.satisfaction_score;
  const score =
    typeof rawScore === 'number'
      ? rawScore
      : typeof rawScore === 'string'
        ? Number.parseFloat(rawScore)
        : NaN;
  const performance =
    Number.isFinite(score)
      ? `${Math.round(score)}%`
      : typeof raw.performance_score === 'number'
        ? `${Math.round(raw.performance_score)}%`
        : '—';
  const feed =
    (metrics?.feed_text as string | undefined) ??
    (status === 'idle' ? DEFAULT_FEED_IDLE : DEFAULT_FEED_ACTIVE);

  const sessionId = currentInteraction?.id;

  return {
    id: String(raw.id),
    name: (raw.name as string) ?? 'Agent',
    status,
    sentiment,
    performance,
    feed,
    session_id: sessionId != null ? String(sessionId) : undefined,
    webhook_configs: raw.webhook_configs as ChatAgent['webhook_configs'],
  };
};

const ChatMonitoring: React.FC = () => {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const erroredRef = useRef(false);

  const fetchAgents = async () => {
    try {
      const res = await supervisorsAPI.getMyDashboard();
      const list = Array.isArray(res.data?.agents) ? res.data.agents : [];
      const chatAgents: ChatAgent[] = list
        .filter((a: Record<string, unknown>) => (a.agent_type ?? 'chat') === 'chat')
        .map(mapDashboardAgent);
      setAgents(chatAgents);
      erroredRef.current = false;
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 401) return;
      if (!erroredRef.current) {
        erroredRef.current = true;
        console.error('Failed to load chat agents', err);
        toast.error('Failed to load chat agents');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedAgent) return;
    const updated = agents.find((a) => a.id === selectedAgent.id);
    if (!updated) return;
    if (
      updated.feed !== selectedAgent.feed ||
      updated.performance !== selectedAgent.performance ||
      updated.sentiment !== selectedAgent.sentiment ||
      updated.status !== selectedAgent.status ||
      updated.name !== selectedAgent.name ||
      updated.session_id !== selectedAgent.session_id
    ) {
      setSelectedAgent(updated);
    }
  }, [agents, selectedAgent]);

  const totalActive = agents.filter((a) => a.status === 'in_chat').length;
  const perfValues = agents
    .map((a) => parseInt(a.performance, 10))
    .filter((n) => !Number.isNaN(n));
  const avgPerf = perfValues.length
    ? Math.round(perfValues.reduce((acc, n) => acc + n, 0) / perfValues.length)
    : 0;

  return (
    <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <h1
        className="text-center text-5xl font-black mb-2"
        style={{ color: 'var(--text-main)', letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(33,52,72,0.10)' }}
      >
        Chat Agents
      </h1>
      <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
        Select an agent to view details and monitor live chat activity
      </p>

      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 5, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Agents', value: agents.length, color: 'var(--text-main)' },
          { label: 'In Chat Now', value: totalActive, color: 'var(--success)' },
          { label: 'Avg Performance', value: avgPerf ? `${avgPerf}%` : '—', color: 'var(--accent-hex)' },
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
              <Typography variant="caption" fontWeight={600} color="var(--text-muted)" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ color: stat.color }}>
                {stat.value}
              </Typography>
            </Card>
          </Box>
        ))}
      </Box>

      <div className="voice-agents-container">
        <div className="voice-agents-grid">
          {loading && agents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
              Loading agents…
            </p>
          ) : agents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
              No chat agents configured yet.
            </p>
          ) : (
            agents.map((agent, index) => (
              <ChatAgentCard
                key={agent.id}
                agent={agent}
                index={index}
                isSelected={selectedAgent?.id === agent.id}
                onClick={(a) => setSelectedAgent(a)}
              />
            ))
          )}
        </div>
      </div>

      <ChatDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

      <InjectBox agents={agents} label="inject" mode="chat" />
    </div>
  );
};

export default ChatMonitoring;
