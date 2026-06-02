import React, { useState, useCallback, useEffect, useRef } from 'react';

import { Mic, X, Circle, TrendingUp, Smile, Info, Send } from 'lucide-react';

import { toast } from 'react-toastify';

import AgentAvatar from './AgentAvatar';

import { chatAPI } from '@/services/chatService';

import { agentsAPI } from '@/services/agentsService';



type AgentBackendStatus = 'idle' | 'in_call' | 'in_chat' | 'paused';



const STATUS_LABEL: Record<AgentBackendStatus, string> = {

  idle: 'IDLE',

  in_call: 'IN CALL',

  in_chat: 'IN CHAT',

  paused: 'PAUSED',

};



interface ChatAgent {

  id: string;

  name: string;

  status: AgentBackendStatus;

  sentiment: string;

  performance: string;

  feed: string;

  session_id?: string;

}



interface ChatDetailModalProps {

  agent: ChatAgent | null;

  onClose: () => void;

}



type FeedLine = { speaker: string; text: string };



const DEFAULT_FEED_IDLE = 'Waiting for chat.';

const DEFAULT_FEED_ACTIVE = 'Live chat in progress.';



function parseFeedLine(feed: string): FeedLine | null {

  const t = feed.trim();

  if (!t || t === DEFAULT_FEED_IDLE || t === DEFAULT_FEED_ACTIVE) return null;

  const cm = /^Customer:\s*(.+)$/is.exec(t);

  if (cm) return { speaker: 'Customer', text: cm[1].trim() };

  const ag = /^Agent:\s*(.+)$/is.exec(t);

  if (ag) return { speaker: 'Agent', text: ag[1].trim() };

  return { speaker: 'Live', text: t };

}



function roleToSpeaker(role: string): string {

  if (role === 'agent') return 'Agent';

  if (role === 'supervisor') return 'Supervisor';

  return 'Customer';

}



function formatPerformance(score: unknown): string {

  const n = typeof score === 'number' ? score : Number.parseFloat(String(score ?? ''));

  return Number.isFinite(n) ? `${Math.round(n)}%` : '—';

}



function formatSentiment(raw: unknown): string {

  const s = String(raw ?? 'neutral').toLowerCase();

  return s === 'critical' ? 'bad' : s;

}



function speakerColor(speaker: string): string {

  if (speaker === 'Agent') return 'var(--primary)';

  if (speaker === 'Customer') return 'var(--accent)';

  if (speaker === 'Supervisor') return 'var(--text-muted)';

  return 'var(--text-secondary)';

}



function appendFeedLine(prev: FeedLine[], line: FeedLine): FeedLine[] {

  const last = prev[prev.length - 1];

  if (last && last.speaker === line.speaker && last.text === line.text) return prev;

  return [...prev, line].slice(-80);

}



const ChatDetailModal: React.FC<ChatDetailModalProps> = ({ agent, onClose }) => {

  const [isExiting, setIsExiting] = useState(false);

  const [feedLines, setFeedLines] = useState<FeedLine[]>([]);

  const [liveSentiment, setLiveSentiment] = useState<string>('neutral');

  const [livePerformance, setLivePerformance] = useState<string>('—');

  const [whisperOpen, setWhisperOpen] = useState(false);

  const [whisperText, setWhisperText] = useState('');

  const [isSendingWhisper, setIsSendingWhisper] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  const whisperInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {

    if (agent) {

      setFeedLines([]);

      setWhisperText('');

      setWhisperOpen(false);

      setLiveSentiment(agent.sentiment);

      setLivePerformance(agent.performance);

    }

  }, [agent?.id]);



  useEffect(() => {

    if (!agent || agent.status === 'idle') return;

    setLiveSentiment(agent.sentiment);

    setLivePerformance(agent.performance);

    const parsed = parseFeedLine(agent.feed);

    if (!parsed) return;

    setFeedLines((prev) => appendFeedLine(prev, parsed));

  }, [agent?.id, agent?.status, agent?.sentiment, agent?.performance, agent?.feed]);



  useEffect(() => {

    if (!agent?.session_id || agent.status !== 'in_chat') return;



    let eventSource: EventSource | null = null;

    let cancelled = false;



    const onMessage = (event: MessageEvent) => {

      try {

        const data = JSON.parse(event.data) as { role?: string; content?: string };

        if (!data.content) return;

        setFeedLines((prev) =>

          appendFeedLine(prev, { speaker: roleToSpeaker(data.role ?? 'customer'), text: data.content! }),

        );

      } catch {

        /* ignore */

      }

    };



    const onMetrics = (event: MessageEvent) => {

      try {

        const data = JSON.parse(event.data) as {

          sentiment?: string;

          satisfaction_score?: number;

          feed_text?: string;

        };

        setLiveSentiment(formatSentiment(data.sentiment));

        setLivePerformance(formatPerformance(data.satisfaction_score));

      } catch {

        /* ignore */

      }

    };



    const onStatus = () => {

      setFeedLines((prev) => appendFeedLine(prev, { speaker: 'System', text: 'Session ended.' }));

      eventSource?.close();

    };



    const loadHistory = async () => {

      try {

        const res = await chatAPI.getMessages(agent.session_id!);

        if (cancelled) return;

        const rows = Array.isArray(res.data) ? res.data : [];

        const lines: FeedLine[] = rows.map((m: { role: string; content: string }) => ({

          speaker: roleToSpeaker(m.role),

          text: m.content,

        }));

        setFeedLines(lines);

      } catch (err) {

        console.error('Failed to load chat history', err);

      }

    };



    const connect = async () => {

      setHistoryLoading(true);

      await loadHistory();

      if (!cancelled) setHistoryLoading(false);



      eventSource = await chatAPI.streamSession(agent.session_id!);

      if (!eventSource || cancelled) return;



      eventSource.addEventListener('message', onMessage);

      eventSource.addEventListener('metrics', onMetrics);

      eventSource.addEventListener('whisper', onMessage);

      eventSource.addEventListener('status', onStatus);

      eventSource.onerror = () => eventSource?.close();

    };



    connect();



    const pollId = window.setInterval(() => {

      if (!cancelled) loadHistory();

    }, 2000);



    return () => {

      cancelled = true;

      window.clearInterval(pollId);

      if (eventSource) {

        eventSource.removeEventListener('message', onMessage);

        eventSource.removeEventListener('metrics', onMetrics);

        eventSource.removeEventListener('whisper', onMessage);

        eventSource.removeEventListener('status', onStatus);

        eventSource.close();

      }

    };

  }, [agent?.id, agent?.session_id, agent?.status]);



  useEffect(() => {

    if (feedRef.current) feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });

  }, [feedLines]);



  useEffect(() => {

    if (whisperOpen) setTimeout(() => whisperInputRef.current?.focus(), 350);

  }, [whisperOpen]);



  const handleClose = useCallback(() => {

    setIsExiting(true);

    setTimeout(() => {

      setIsExiting(false);

      onClose();

    }, 280);

  }, [onClose]);



  const handleWhisperSend = async () => {

    const text = whisperText.trim();

    if (!text) {

      toast.warn('Please enter a whisper message');

      return;

    }

    if (!agent) return;

    if (agent.status !== 'in_chat') {

      toast.warn('Agent is not in an active chat');

      return;

    }

    setIsSendingWhisper(true);

    try {

      await agentsAPI.whisper(agent.id, text);

      toast.success(`Whisper sent to ${agent.name}`);

      setWhisperText('');

      setFeedLines((prev) => appendFeedLine(prev, { speaker: 'Supervisor', text }));

    } catch (err: unknown) {

      console.error('Whisper failed', err);

      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

      toast.error(typeof detail === 'string' ? detail : 'Failed to send whisper');

    } finally {

      setIsSendingWhisper(false);

    }

  };



  if (!agent) return null;



  return (

    <div

      className={`agent-modal-overlay ${isExiting ? 'agent-modal-overlay--exiting' : 'agent-modal-overlay--entering'}`}

      onClick={handleClose}

    >

      <div

        className={`agent-modal-content ${isExiting ? 'agent-modal-content--exiting' : 'agent-modal-content--entering'}`}

        onClick={(e) => e.stopPropagation()}

        style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}

      >

        <button

          onClick={handleClose}

          className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"

          style={{ color: 'var(--text-muted)' }}

        >

          <X size={22} />

        </button>



        <div className="flex flex-col items-center mb-6 modal-stagger-1">

          <div className="mb-4">

            <AgentAvatar name={agent.name} status={agent.status === 'idle' ? 'idle' : 'active'} size="lg" />

          </div>

          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>

            {agent.name}

          </h2>

          <div className="flex items-center gap-2 mt-2">

            <Circle

              size={8}

              fill={agent.status === 'in_chat' ? 'var(--success)' : 'var(--text-muted)'}

              stroke="none"

            />

            <span

              className="text-sm font-semibold uppercase tracking-wider"

              style={{ color: agent.status === 'in_chat' ? 'var(--success)' : 'var(--text-muted)' }}

            >

              {STATUS_LABEL[agent.status] ?? agent.status}

            </span>

          </div>

        </div>



        <div className="grid grid-cols-2 gap-3 mb-6 modal-stagger-2">

          <div className="agent-modal-stat">

            <TrendingUp size={20} style={{ color: 'var(--accent)' }} />

            <div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>

                Performance

              </p>

              <p className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>

                {livePerformance}

              </p>

            </div>

          </div>

          <div className="agent-modal-stat">

            <Smile size={20} style={{ color: 'var(--accent)' }} />

            <div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>

                Sentiment

              </p>

              <p className="text-lg font-bold capitalize" style={{ color: 'var(--text-main)' }}>

                {liveSentiment}

              </p>

            </div>

          </div>

        </div>



        <div className="mb-6 modal-stagger-3">

          <div className="flex items-center gap-2 mb-2">

            <Info size={16} style={{ color: 'var(--text-muted)' }} />

            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>

              Live Feed

            </p>

            <span className="live-feed-dot" />

          </div>

          <div

            ref={feedRef}

            className="live-feed-container"

            style={{

              backgroundColor: 'var(--bg-dark)',

              border: '1px solid var(--border)',

              borderRadius: 'var(--radius-md)',

              padding: '14px 16px',

              maxHeight: 200,

              overflowY: 'auto',

              scrollBehavior: 'smooth',

            }}

          >

            {historyLoading && feedLines.length === 0 ? (

              <div

                className="text-center py-4"

                style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}

              >

                Loading conversation…

              </div>

            ) : feedLines.length === 0 ? (

              <div

                className="text-center py-4"

                style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}

              >

                {agent.status === 'idle'

                  ? 'No active chat — transcript appears when this agent is in a conversation.'

                  : 'Waiting for messages… Customer and agent lines appear here as the chat progresses.'}

              </div>

            ) : (

              feedLines.map((line, i) => (

                <div

                  key={`${i}-${line.speaker}-${line.text.slice(0, 24)}`}

                  className="live-feed-line"

                  style={{

                    animation: 'feedLineIn 0.4s ease-out forwards',

                    opacity: 0,

                    marginBottom: i < feedLines.length - 1 ? 10 : 0,

                  }}

                >

                  <span

                    className="text-xs font-bold"

                    style={{ color: speakerColor(line.speaker), marginRight: 8 }}

                  >

                    {line.speaker}:

                  </span>

                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>

                    {line.text}

                  </span>

                </div>

              ))

            )}

          </div>

        </div>



        <div

          className="whisper-reveal-wrapper"

          style={{

            maxHeight: whisperOpen ? 80 : 0,

            opacity: whisperOpen ? 1 : 0,

            overflow: 'hidden',

            transition: 'max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',

            marginBottom: whisperOpen ? 12 : 0,

          }}

        >

          <div className="flex gap-2" style={{ padding: '2px 0' }}>

            <input

              ref={whisperInputRef}

              type="text"

              value={whisperText}

              onChange={(e) => setWhisperText(e.target.value)}

              onKeyDown={(e) => e.key === 'Enter' && handleWhisperSend()}

              placeholder={`Whisper to ${agent.name}...`}

              className="voice-whisper-input"

              style={{ flex: 1 }}

            />

            <button

              onClick={handleWhisperSend}

              disabled={isSendingWhisper}

              className="modal-btn-primary flex items-center justify-center gap-2 font-bold text-sm cursor-pointer"

              style={{

                background: 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #334155 100%)',

                color: '#fff',

                border: 'none',

                borderRadius: 16,

                height: 54,

                padding: '16px 24px',

                opacity: isSendingWhisper ? 0.6 : 1,

              }}

            >

              <Send size={16} />

              {isSendingWhisper ? 'Sending…' : 'Send'}

            </button>

          </div>

        </div>



        <div className="flex gap-3">

          <button

            onClick={() => setWhisperOpen((prev) => !prev)}

            className="flex-1 flex items-center justify-center gap-3 font-bold text-sm cursor-pointer modal-stagger-btn-2 w-full"

            style={{

              background: 'rgba(255, 255, 255, 0.9)',

              color: '#0F172A',

              border: '1px solid rgba(15, 23, 42, 0.08)',

              borderRadius: 16,

              height: 54,

              padding: '16px 28px',

            }}

          >

            <Mic size={18} />

            {whisperOpen ? 'Close Whisper' : 'Whisper'}

          </button>

        </div>

      </div>

    </div>

  );

};



export default ChatDetailModal;


