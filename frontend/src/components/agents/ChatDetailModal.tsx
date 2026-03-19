import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, MessageSquare, X, Circle, TrendingUp, Smile, Info, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import AgentAvatar from './AgentAvatar';

interface ChatAgent {
  id: number;
  name: string;
  status: 'active' | 'idle';
  sentiment: string;
  performance: string;
  feed: string;
}

interface ChatDetailModalProps {
  agent: ChatAgent | null;
  onClose: () => void;
}

const mockChatLines: { speaker: string, text: string }[] = [];

const ChatDetailModal: React.FC<ChatDetailModalProps> = ({ agent, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [feedLines, setFeedLines] = useState<typeof mockChatLines>([]);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [isSendingWhisper, setIsSendingWhisper] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const whisperInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (agent) { setFeedLines([]); setWhisperText(''); setWhisperOpen(false); }
  }, [agent?.id]);

  useEffect(() => {
    if (!agent) return;
    setFeedLines([]);
    // Connection to live chat feed will go here
  }, [agent?.id]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [feedLines]);

  useEffect(() => {
    if (whisperOpen) setTimeout(() => whisperInputRef.current?.focus(), 350);
  }, [whisperOpen]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => { setIsExiting(false); onClose(); }, 280);
  }, [onClose]);

  const handleWhisperSend = () => {
    if (!whisperText.trim()) { toast.warn('Please enter a message'); return; }
    setIsSendingWhisper(true);
    setTimeout(() => { toast.success(`Message sent to ${agent?.name}: "${whisperText.trim()}"`); setWhisperText(''); setIsSendingWhisper(false); }, 600);
  };

  if (!agent) return null;

  return (
    <div className={`agent-modal-overlay ${isExiting ? 'agent-modal-overlay--exiting' : 'agent-modal-overlay--entering'}`} onClick={handleClose}>
      <div className={`agent-modal-content ${isExiting ? 'agent-modal-content--exiting' : 'agent-modal-content--entering'}`} onClick={(e) => e.stopPropagation()} style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}><X size={22} /></button>

        <div className="flex flex-col items-center mb-6 modal-stagger-1">
          <div className="mb-4"><AgentAvatar name={agent.name} status={agent.status} size="lg" /></div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{agent.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Circle size={8} fill={agent.status === 'active' ? 'var(--success)' : 'var(--text-muted)'} stroke="none" />
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: agent.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{agent.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 modal-stagger-2">
          <div className="agent-modal-stat">
            <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
            <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Performance</p><p className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>{agent.performance}</p></div>
          </div>
          <div className="agent-modal-stat">
            <Smile size={20} style={{ color: 'var(--accent)' }} />
            <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sentiment</p><p className="text-lg font-bold capitalize" style={{ color: 'var(--text-main)' }}>{agent.sentiment}</p></div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="mb-6 modal-stagger-3">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Live Feed</p>
            <span className="live-feed-dot" />
          </div>
          <div ref={feedRef} className="live-feed-container" style={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', maxHeight: 200, overflowY: 'auto', scrollBehavior: 'smooth' }}>
            {feedLines.length === 0 ? (
               <div className="text-center py-4" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                 Waiting for Chat stream connection...
               </div>
            ) : feedLines.map((line, i) => (
              <div key={i} className="live-feed-line" style={{ animation: 'feedLineIn 0.4s ease-out forwards', opacity: 0, marginBottom: i < feedLines.length - 1 ? 10 : 0 }}>
                <span className="text-xs font-bold" style={{ color: line.speaker === 'Agent' ? 'var(--primary)' : 'var(--accent)', marginRight: 8 }}>{line.speaker}:</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Whisper slide-down reveal */}
        <div style={{
          maxHeight: whisperOpen ? 80 : 0,
          opacity: whisperOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
          marginBottom: whisperOpen ? 12 : 0,
        }}>
          <div className="flex gap-2" style={{ padding: '2px 0' }}>
            <input ref={whisperInputRef} type="text" value={whisperText} onChange={(e) => setWhisperText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleWhisperSend()} placeholder={`Send message to ${agent.name}...`} className="voice-whisper-input" style={{ flex: 1 }} />
            <button onClick={handleWhisperSend} disabled={isSendingWhisper}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none', background: '#547792', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s ease', opacity: isSendingWhisper ? 0.6 : 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#94B4C1'; e.currentTarget.style.color = '#213448'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(84,119,146,0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#547792'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <Send size={16} />{isSendingWhisper ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={(e) => { 
              e.currentTarget.style.transform = 'scale(0.95)';
              setTimeout(() => {
                if (e.currentTarget) e.currentTarget.style.transform = '';
              }, 150);
              toast.info(`Now monitoring ${agent.name}'s chat session.`); 
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm cursor-pointer modal-stagger-btn-1"
            style={{ 
              border: '1px solid var(--border)', 
              color: 'var(--text-main)', 
              backgroundColor: 'transparent', 
              transition: 'all 0.3s ease' 
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.backgroundColor = 'var(--primary)'; 
              e.currentTarget.style.color = '#ffffff'; 
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; 
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 52, 72, 0.25)'; 
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.backgroundColor = 'transparent'; 
              e.currentTarget.style.color = 'var(--text-main)'; 
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = ''; 
              e.currentTarget.style.boxShadow = ''; 
            }}
          >
            <Eye size={18} />Monitor
          </button>
          <button
            onClick={() => setWhisperOpen(prev => !prev)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm cursor-pointer modal-stagger-btn-2"
            style={{ backgroundColor: '#547792', color: '#fff', border: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#94B4C1'; e.currentTarget.style.color = '#213448'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(84,119,146,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#547792'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <MessageSquare size={18} />
            {whisperOpen ? 'Close' : 'Join Chat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailModal;
