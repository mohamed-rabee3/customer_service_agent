import React, { useState, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import AgentAvatar from './AgentAvatar';

interface ChatAgent {
  id: number;
  name: string;
  status: 'active' | 'idle';
  sentiment: string;
  performance: string;
  feed: string;
}

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
            style={{ color: agent.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {agent.status}
          </span>
        </div>
        <MessageSquare size={18} style={{ color: 'var(--text-muted)' }} />
      </div>

      <div className="flex justify-center mb-4">
        <div className="agent-avatar-hover-scale">
          <AgentAvatar name={agent.name} status={agent.status} size="md" />
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
