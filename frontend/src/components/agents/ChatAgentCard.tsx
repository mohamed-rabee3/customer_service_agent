import React, { useState, useRef, useCallback } from 'react';
import { MessageSquare, Edit3, Trash2, Power } from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import Icon from '../Icon';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface ChatAgent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'paused';
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

interface ChatAgentCardProps {
  agent: ChatAgent;
  index: number;
  isSelected: boolean;
  onClick: (agent: ChatAgent) => void;
  onEdit?: (agent: ChatAgent) => void;
  onDelete?: (agent: ChatAgent) => void;
  onToggleStatus?: (agent: ChatAgent) => void;
}

const ChatAgentCard: React.FC<ChatAgentCardProps> = ({ agent, index, isSelected, onClick, onEdit, onDelete, onToggleStatus }) => {
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

      {(onEdit || onDelete || onToggleStatus) && (
          <div className="flex gap-2 mt-5 px-1 flex-wrap justify-center">
              {onToggleStatus && (
                  <button
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(agent); }}
                      className="agent-config-btn"
                      style={{ 
                          color: agent.status === 'paused' ? 'var(--text-muted)' : 'var(--success)', 
                          borderColor: agent.status === 'paused' ? 'var(--border)' : 'var(--success)' 
                      }}
                  >
                      <Power size={15} /> {agent.status === 'paused' ? 'Turn On' : 'Turn Off'}
                  </button>
              )}
              {onEdit && (
                  <button
                      onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
                      className="agent-config-btn agent-config-btn--edit"
                  >
                      <Edit3 size={15} /> Edit
                  </button>
              )}
              {onDelete && (
                  <button
                      onClick={(e) => { e.stopPropagation(); onDelete(agent); }}
                      className="agent-config-btn agent-config-btn--delete"
                  >
                      <Trash2 size={15} /> Delete
                  </button>
              )}
          </div>
      )}

      <div className="card-glow-bar" />
    </div>
  );
};

export default ChatAgentCard;
