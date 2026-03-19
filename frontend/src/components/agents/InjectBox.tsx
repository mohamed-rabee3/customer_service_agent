import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, ChevronDown, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import AgentAvatar from './AgentAvatar';

interface Agent {
  id: number;
  name: string;
  status: string;
}

interface InjectBoxProps {
  agents: Agent[];
  label?: string;
}

const InjectBox: React.FC<InjectBoxProps> = ({ agents, label = 'inject' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState(agents[0]?.name || 'Agent 1');
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVaporizing, setIsVaporizing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate position when menu opens
  const updateMenuPos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 12, // 12px gap to the right
      });
    }
  }, []);

  useEffect(() => {
    if (menuOpen) updateMenuPos();
  }, [menuOpen, updateMenuPos]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  // Close on scroll/resize
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [menuOpen]);

  const handleInject = () => {
    if (!text.trim()) { toast.warn('Please enter a message first'); return; }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSuccess(true);
      setIsVaporizing(true);
      toast.success(`Sent to ${selectedAgentName}: "${text.trim()}"`);
      setTimeout(() => { setText(''); setIsVaporizing(false); }, 500);
      setTimeout(() => setIsSuccess(false), 1200);
    }, 900);
  };

  const dropdownMenu = menuOpen ? createPortal(
    <div
      ref={menuRef}
      className="inject-portal-dropdown"
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: menuPos.top,
        left: menuPos.left,
        transform: 'translateY(-50%)',
        minWidth: 260,
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(33, 52, 72, 0.2), 0 4px 16px rgba(33, 52, 72, 0.1)',
        overflow: 'hidden',
        animation: 'portalDropdownRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        transformOrigin: 'left center',
        border: '1px solid rgba(33, 52, 72, 0.08)',
        padding: '6px 0',
      }}
    >
      {agents.map((agent, idx) => {
        const isSelected = agent.name === selectedAgentName;
        return (
          <React.Fragment key={agent.id}>
            <button
              onClick={() => { setSelectedAgentName(agent.name); setMenuOpen(false); }}
              className="inject-dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 16px',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'var(--primary)',
                background: isSelected ? 'rgba(33, 52, 72, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.25s ease, box-shadow 0.25s ease',
                position: 'relative',
              }}
            >
              <AgentAvatar name={agent.name} status={agent.status as 'active' | 'idle'} size="sm" showStatus={false} />
              <span style={{ flex: 1, textAlign: 'left' }}>{agent.name}</span>
              {isSelected && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
            {idx < agents.length - 1 && (
              <div style={{ height: 1, margin: '0 12px', background: 'rgba(33, 52, 72, 0.07)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`inject-box ${isSuccess ? 'inject-box--success' : ''} ${isFocused ? 'inject-box--focused' : ''}`}>
      {/* Agent selector */}
      <div className="mb-6">
        <button
          ref={btnRef}
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 cursor-pointer bg-transparent border-none"
          style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}
        >
          {selectedAgentName}
          <span style={{
            display: 'inline-flex',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            <ChevronDown size={24} />
          </span>
        </button>
      </div>

      {dropdownMenu}

      {/* Input & Button */}
      <div className="flex flex-col md:flex-row gap-3 w-full">
        <div className={`inject-input-wrapper ${isVaporizing ? 'inject-input--vaporizing' : ''}`} style={{ flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSending && handleInject()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`Enter prompt to ${label} for ${selectedAgentName}...`}
            className="inject-input"
            disabled={isSending}
          />
        </div>
        <button
          onClick={handleInject}
          disabled={isSending}
          className={`inject-btn ${isSending ? 'inject-btn--sending' : ''} ${isSuccess ? 'inject-btn--success' : ''}`}
        >
          <span className={`inject-btn-icon ${isSuccess ? 'inject-btn-icon--fly' : ''}`}>
            <Send size={20} />
          </span>
          <span className="inject-btn-label">
            {isSending ? 'Sending…' : isSuccess ? 'Sent!' : 'Inject'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default InjectBox;
