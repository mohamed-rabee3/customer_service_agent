import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, Avatar } from '@mui/material';
import VoiceAgentCard from '@/components/agents/VoiceAgentCard';
import AgentDetailModal from '@/components/agents/AgentDetailModal';
import InjectBox from '@/components/agents/InjectBox';
import '@/components/agents/VoiceAgentSelector.css';

interface VoiceAgent {
  id: number;
  name: string;
  status: 'active' | 'idle';
  sentiment: string;
  performance: string;
  feed: string;
}

const SENTIMENTS = ['good', 'neutral', 'bad'] as const;
const FEEDS = [
  'Handling customer complaint regarding billing.',
  'Discussing refund options with caller.',
  'Verifying account details for security.',
  'Explaining new pricing plan to customer.',
  'Escalating issue to senior support.',
  'Wrapping up call, summarizing resolution.',
  'Customer expressing frustration about wait time.',
  'Offering loyalty discount to retain customer.',
];

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

const VoiceAgentMonitoring: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<VoiceAgent | null>(null);

  const [agents, setAgents] = useState<VoiceAgent[]>([
    { id: 1, name: 'Agent 1', status: 'active', sentiment: 'good', performance: '82%', feed: 'Handling customer complaint regarding billing.' },
    { id: 2, name: 'Agent 2', status: 'idle', sentiment: 'neutral', performance: '88%', feed: 'Waiting for call.' },
    { id: 3, name: 'Agent 3', status: 'active', sentiment: 'bad', performance: '75%', feed: 'Escalating issue to manager.' },
  ]);

  // Simulate live performance & mood changes for Agent 1
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.id !== 1) return agent;
        const currentPerf = parseInt(agent.performance);
        const delta = Math.floor(Math.random() * 7) - 3;
        const newPerf = Math.min(99, Math.max(60, currentPerf + delta));
        const sentimentRoll = Math.random();
        let newSentiment = agent.sentiment;
        if (sentimentRoll < 0.15) {
          newSentiment = SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)];
        }
        const feedRoll = Math.random();
        let newFeed = agent.feed;
        if (feedRoll < 0.2) {
          newFeed = FEEDS[Math.floor(Math.random() * FEEDS.length)];
        }
        return { ...agent, performance: `${newPerf}%`, sentiment: newSentiment, feed: newFeed };
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Keep selected agent in sync with live data
  useEffect(() => {
    if (selectedAgent) {
      const updated = agents.find(a => a.id === selectedAgent.id);
      if (updated && (updated.performance !== selectedAgent.performance || updated.sentiment !== selectedAgent.sentiment || updated.feed !== selectedAgent.feed)) {
        setSelectedAgent(updated);
      }
    }
  }, [agents, selectedAgent]);

  // Stats cards — unified with admin dashboard glassmorphism
  const totalActive = agents.filter(a => a.status === 'active').length;
  const avgPerf = Math.round(agents.reduce((acc, a) => acc + parseInt(a.performance), 0) / agents.length);

  return (
    <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <h1 className="text-center text-5xl font-black mb-2" style={{ color: 'var(--text-main)', letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(33,52,72,0.10)' }}>
        Voice Agents
      </h1>
      <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
        Select an agent to view details and monitor live activity
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
            <VoiceAgentCard
              key={agent.id}
              agent={agent}
              index={index}
              isSelected={selectedAgent?.id === agent.id}
              onClick={(a) => setSelectedAgent(a)}
            />
          ))}
        </div>
      </div>

      <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

      <InjectBox agents={agents} label="inject" />
    </div>
  );
};

export default VoiceAgentMonitoring;
