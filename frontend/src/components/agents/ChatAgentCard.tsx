import React, { useState, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import Icon from '../Icon';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

type AgentBackendStatus = 'idle' | 'in_call' | 'in_chat' | 'paused';

interface ChatAgent {
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

const STATUS_LABEL: Record<AgentBackendStatus, string> = {
  idle: 'IDLE',
  in_call: 'IN CALL',
  in_chat: 'IN CHAT',
  paused: 'PAUSED',
};

interface ChatAgentCardProps {
  agent: ChatAgent;
  index: number;
  isSelected: boolean;
  onClick: (agent: ChatAgent) => void;
}

const ChatAgentCard: React.FC<ChatAgentCardProps> = ({ agent, index, isSelected, onClick }) => {
  const [isClicking, setIsClicking] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.03)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = '';
  }, []);

  const handleClick = () => {
    setIsClicking(true);
    setTimeout(() => { setIsClicking(false); onClick(agent); }, 400);
  };

  const isLive = agent.status === 'in_chat' || agent.status === 'in_call';

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`voice-agent-card group cursor-pointer ${isSelected ? 'voice-agent-card--selected' : ''} ${isClicking ? 'voice-agent-card--clicking' : ''}`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: isLive ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {STATUS_LABEL[agent.status] ?? agent.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {agent.webhook_configs?.telegram?.enabled && (
            <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: 'rgba(0, 136, 204, 0.15)', color: '#0088cc' }} title="Telegram enabled">
              <Icon icon={['fab', 'telegram'] as IconProp} size="sm" />
            </span>
          )}
          {agent.webhook_configs?.whatsapp?.enabled && (
            <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }} title="WhatsApp enabled">
              <Icon icon={['fab', 'whatsapp'] as IconProp} size="sm" />
            </span>
          )}
          {agent.webhook_configs?.instagram?.enabled && (
            <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: 'rgba(225, 48, 108, 0.15)', color: '#E1306C' }} title="Instagram enabled">
              <Icon icon={['fab', 'instagram'] as IconProp} size="sm" />
            </span>
          )}
          <MessageSquare size={18} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <div className="agent-avatar-hover-scale">
          <AgentAvatar name={agent.name} status={agent.status === 'idle' ? 'idle' : 'active'} size="md" />
        </div>
      </div>

      <h3 className="text-center text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>{agent.name}</h3>
      <p className="text-center text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Chat Assistant</p>

      <div className="flex justify-between items-center px-2">
        <div className="text-center">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Perf.</p>
          <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{agent.performance}</p>
        </div>
        <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
        <div className="text-center">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Mood</p>
          <p className="text-base font-bold capitalize" style={{ color: 'var(--text-main)' }}>{agent.sentiment}</p>
        </div>
      </div>

      <div className="card-glow-bar" />
    </div>
  );
};

export default ChatAgentCard;
