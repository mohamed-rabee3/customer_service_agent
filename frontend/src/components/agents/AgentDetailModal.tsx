import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PhoneForwarded, Mic, X, Circle, TrendingUp, Smile, Info, ShieldCheck, Send, Volume2, Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Room, RoomEvent } from 'livekit-client';
import AgentAvatar from './AgentAvatar';
import { agentsAPI } from '@/services/agentsService';
import { interactionsAPI } from '@/services/interactionsService';

const DEFAULT_FEED_IDLE = 'Waiting for call.';
const DEFAULT_FEED_ACTIVE = 'Live interaction in progress.';

type AgentBackendStatus = 'idle' | 'in_call' | 'in_chat' | 'paused';

interface VoiceAgent {
  id: string;
  name: string;
  status: AgentBackendStatus;
  sentiment: string;
  performance: string;
  feed: string;
  current_interaction?: Record<string, unknown> | null;
}

const STATUS_LABEL: Record<AgentBackendStatus, string> = {
  idle: 'IDLE',
  in_call: 'IN CALL',
  in_chat: 'IN CHAT',
  paused: 'PAUSED',
};

interface AgentDetailModalProps {
  agent: VoiceAgent | null;
  onClose: () => void;
}

type FeedLine = { speaker: string; text: string };

function parseFeedLine(feed: string): FeedLine | null {
  const t = feed.trim();
  if (!t) return null;
  const cm = /^Customer:\s*(.+)$/is.exec(t);
  if (cm) return { speaker: 'Customer', text: cm[1].trim() };
  const ag = /^Agent:\s*(.+)$/is.exec(t);
  if (ag) return { speaker: 'Agent', text: ag[1].trim() };
  return { speaker: 'Live', text: t };
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [feedLines, setFeedLines] = useState<FeedLine[]>([]);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [isSendingWhisper, setIsSendingWhisper] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [livekitRoom, setLivekitRoom] = useState<Room | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const whisperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (agent) {
      setJoined(false);
      setIsJoining(false);
      setAudioBlocked(false);
      setFeedLines([]);
      setWhisperText('');
      setWhisperOpen(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    let activeRoom: Room | null = null;

    const connectToLiveKit = async () => {
      const interactionId = agent?.current_interaction?.id as string | undefined;
      if (!agent || agent.status === 'idle' || !interactionId) {
        return;
      }

      try {
        console.log('Fetching supervisor LiveKit token...');
        const res = await interactionsAPI.getSupervisorToken(interactionId);
        const { livekit_token, livekit_url } = res.data;

        console.log('Connecting to LiveKit room as supervisor...');
        let lkUrl = String(livekit_url).trim();
        if (lkUrl.startsWith('http://')) lkUrl = 'ws://' + lkUrl.slice(7);
        if (lkUrl.startsWith('https://')) lkUrl = 'wss://' + lkUrl.slice(8);

        const r = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        activeRoom = r;
        setLivekitRoom(r);

        r.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          if (track.kind === 'audio') {
            console.log(`Subscribed to audio track from ${participant.identity}`);
            const audioEl = track.attach();
            audioEl.id = `lk-audio-${track.sid}`;
            document.body.appendChild(audioEl);
            // Browsers may block autoplay; if so, AudioPlaybackStatusChanged
            // fires and we surface the "Enable audio" button below.
            audioEl.play().catch(() => { /* playback gated — handled via startAudio */ });
          }
        });

        r.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === 'audio') {
            const el = document.getElementById(`lk-audio-${track.sid}`);
            if (el) el.remove();
          }
        });

        // Reflect the browser's audio-playback permission state in the UI.
        r.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioBlocked(!r.canPlaybackAudio);
        });

        await r.connect(lkUrl, livekit_token, {
          autoSubscribe: true,
        });

        setAudioBlocked(!r.canPlaybackAudio);
        console.log('Successfully connected to LiveKit room as supervisor');
      } catch (err: any) {
        console.error('Failed to connect to LiveKit', err);
        toast.error('Failed to connect to supervisor audio');
      }
    };

    connectToLiveKit();

    return () => {
      if (activeRoom) {
        console.log('Cleaning up LiveKit room connection...');
        activeRoom.remoteParticipants.forEach((p) => {
          p.audioTracks.forEach((pub) => {
            if (pub.track) {
              const el = document.getElementById(`lk-audio-${pub.track.sid}`);
              if (el) el.remove();
            }
          });
        });
        activeRoom.disconnect();
        setLivekitRoom(null);
      }
    };
  }, [agent?.id, agent?.status]);

  useEffect(() => {
    if (!agent || agent.status === 'idle') {
      if (agent?.status === 'idle') setFeedLines([]);
      return;
    }
    const { feed } = agent;
    if (!feed || feed === DEFAULT_FEED_IDLE || feed === DEFAULT_FEED_ACTIVE) return;
    const parsed = parseFeedLine(feed);
    if (!parsed) return;
    setFeedLines(prev => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === parsed.speaker && last.text === parsed.text) return prev;
      return [...prev, parsed].slice(-80);
    });
  }, [agent?.id, agent?.status, agent?.feed]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [feedLines]);

  // Auto-focus whisper input when revealed
  useEffect(() => {
    if (whisperOpen) {
      setTimeout(() => whisperInputRef.current?.focus(), 350);
    }
  }, [whisperOpen]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => { setIsExiting(false); onClose(); }, 280);
  }, [onClose]);

  const handleJoin = async () => {
    if (!livekitRoom) {
      toast.error('Not connected to the call yet');
      return;
    }
    setIsJoining(true);
    try {
      // Go live: enable the supervisor mic and tell the agent worker to mute
      // its audio output (it keeps listening for context). Three-way call.
      await livekitRoom.localParticipant.setMicrophoneEnabled(true);
      await livekitRoom.localParticipant.publishData(
        new TextEncoder().encode('{}'),
        { reliable: true, topic: 'agent_mute' }
      );
      setIsJoining(false);
      setJoined(true);
      toast.success('You are now live on the call. The AI is muted and listening.');
    } catch (err: any) {
      console.error('Failed to join call', err);
      toast.error('Failed to enable your microphone');
      setIsJoining(false);
    }
  };

  const handleHandBack = async () => {
    if (!livekitRoom) return;
    try {
      // Hand back: mute the supervisor mic and tell the agent worker to resume.
      await livekitRoom.localParticipant.setMicrophoneEnabled(false);
      await livekitRoom.localParticipant.publishData(
        new TextEncoder().encode('{}'),
        { reliable: true, topic: 'agent_unmute' }
      );
      setJoined(false);
      toast.success('Call handed back to the AI agent.');
    } catch (err: any) {
      console.error('Failed to hand back call', err);
      toast.error('Failed to hand the call back');
    }
  };

  const handleEnableAudio = async () => {
    if (!livekitRoom) return;
    try {
      await livekitRoom.startAudio();
      setAudioBlocked(!livekitRoom.canPlaybackAudio);
    } catch (err) {
      console.error('Failed to start audio playback', err);
    }
  };

  const handleEndCall = async () => {
    const interactionId = agent?.current_interaction?.id as string | undefined;
    if (!interactionId) {
      setJoined(false);
      handleClose();
      toast.success('Call ended successfully (local).');
      return;
    }
    setIsEndingCall(true);
    try {
      if (livekitRoom) {
        livekitRoom.disconnect();
      }
      await interactionsAPI.updateStatus(interactionId, { status: 'completed' });
      toast.success('Call ended successfully.');
      setJoined(false);
      handleClose();
    } catch (err: any) {
      console.error('Failed to end call', err);
      toast.error(err?.response?.data?.detail ?? 'Failed to end call');
    } finally {
      setIsEndingCall(false);
    }
  };

  const handleWhisperSend = async () => {
    const text = whisperText.trim();
    if (!text) { toast.warn('Please enter a whisper message'); return; }
    if (!agent) return;
    if (agent.status === 'idle') {
      toast.warn('Agent is idle — nothing to whisper to');
      return;
    }
    setIsSendingWhisper(true);
    try {
      await agentsAPI.whisper(agent.id, text);
      toast.success(`Whisper sent to ${agent.name}`);
      setWhisperText('');
    } catch (err: any) {
      console.error('Whisper failed', err);
      toast.error(err?.response?.data?.detail ?? 'Failed to send whisper');
    } finally {
      setIsSendingWhisper(false);
    }
  };

  if (!agent) return null;

  return (
    <div className={`agent-modal-overlay ${isExiting ? 'agent-modal-overlay--exiting' : 'agent-modal-overlay--entering'}`} onClick={handleClose}>
      <div className={`agent-modal-content ${isExiting ? 'agent-modal-content--exiting' : 'agent-modal-content--entering'}`} onClick={(e) => e.stopPropagation()} style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}><X size={22} /></button>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6 modal-stagger-1">
          <div className="mb-4"><AgentAvatar name={agent.name} status={agent.status === 'idle' ? 'idle' : 'active'} size="lg" /></div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{agent.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Circle size={8} fill={joined ? 'var(--accent)' : agent.status !== 'idle' ? 'var(--success)' : 'var(--text-muted)'} stroke="none" />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: joined ? 'var(--accent)' : agent.status !== 'idle' ? 'var(--success)' : 'var(--text-muted)' }}>
              {joined ? 'Supervisor Live' : (STATUS_LABEL[agent.status] ?? agent.status)}
            </span>
          </div>
        </div>

        {/* Stats */}
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
                 {agent.status === 'idle'
                   ? 'No active call — live transcript appears when this agent is on a call.'
                   : 'Waiting for speech… transcript lines appear as the customer and agent speak.'}
               </div>
            ) : feedLines.map((line, i) => (
              <div key={i} className="live-feed-line" style={{ animation: 'feedLineIn 0.4s ease-out forwards', opacity: 0, marginBottom: i < feedLines.length - 1 ? 10 : 0 }}>
                <span className="text-xs font-bold" style={{ color: line.speaker === 'Agent' ? 'var(--primary)' : line.speaker === 'Customer' ? 'var(--accent)' : 'var(--text-muted)', marginRight: 8 }}>{line.speaker}:</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audio playback blocked by browser autoplay policy — needs a user gesture */}
        {audioBlocked && agent.status !== 'idle' && (
          <button
            onClick={handleEnableAudio}
            className="w-full flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer mb-4"
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 12, height: 46, letterSpacing: '0.02em',
            }}
          >
            <Volume2 size={18} /> Enable audio to hear the call
          </button>
        )}

        {/* Join / barge-in overlay */}
        {isJoining && (
          <div className="takeover-overlay">
            <div className="takeover-spinner" />
            <p className="text-sm font-semibold mt-3" style={{ color: 'var(--text-main)' }}>Joining the call…</p>
          </div>
        )}
        {joined && (
          <div className="takeover-banner modal-stagger-3">
            <ShieldCheck size={20} /><span className="text-sm font-semibold">You are live — the AI is muted and listening</span>
          </div>
        )}

        {/* Whisper slide-down reveal */}
        <div className="whisper-reveal-wrapper" style={{
          maxHeight: whisperOpen ? 80 : 0,
          opacity: whisperOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
          marginBottom: whisperOpen ? 12 : 0,
        }}>
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
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                opacity: isSendingWhisper ? 0.6 : 1,
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(15, 23, 42, 0.35), 0 0 30px rgba(99, 102, 241, 0.15)'; 
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset)'; 
                e.currentTarget.style.background = 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #334155 100%)';
              }}
            >
              <Send size={16} />{isSendingWhisper ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>

        {/* Action Buttons - Premium Modern Style */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Join Call / Hand Back: Gradient dark with glow (green while live) */}
          <button
            onClick={joined ? handleHandBack : handleJoin}
            disabled={isJoining || agent.status === 'idle' || agent.status === 'paused'}
            className="flex-1 flex items-center justify-center gap-3 font-bold text-sm cursor-pointer modal-stagger-btn-1 w-full sm:w-auto"
            style={{ 
              background: joined 
                ? 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)' 
                : 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #334155 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              height: 54,
              padding: '16px 28px',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: joined 
                ? '0 4px 20px rgba(16, 185, 129, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15) inset'
                : '0 4px 20px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
              opacity: (isJoining || agent.status === 'idle' || agent.status === 'paused') ? 0.6 : 1,
              letterSpacing: '0.02em',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
            onMouseEnter={(e) => { 
              if (!joined && !isJoining && agent.status !== 'idle' && agent.status !== 'paused') { 
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(15, 23, 42, 0.35), 0 0 30px rgba(99, 102, 241, 0.15)'; 
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)';
              } 
            }}
            onMouseLeave={(e) => { 
              if (!joined) { 
                e.currentTarget.style.background = 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #334155 100%)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              } 
              e.currentTarget.style.transform = '';
            }}
          >
            {joined ? <Undo2 size={20} /> : <PhoneForwarded size={20} />}
            {joined ? 'Hand Back to AI' : isJoining ? 'Joining…' : 'Join Call'}
          </button>
          
          {/* Whisper: Glassmorphism white with dark hover */}
          <button
            onClick={() => setWhisperOpen(prev => !prev)}
            disabled={agent.status === 'idle' || agent.status === 'paused'}
            className="flex-1 flex items-center justify-center gap-3 font-bold text-sm cursor-pointer modal-stagger-btn-2 w-full sm:w-auto"
            style={{ 
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#0F172A', 
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: 16,
              height: 54,
              padding: '16px 28px',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
              letterSpacing: '0.02em',
              opacity: (agent.status === 'idle' || agent.status === 'paused') ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { 
              if (agent.status !== 'idle' && agent.status !== 'paused') {
                e.currentTarget.style.background = 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #334155 100%)'; 
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.border = 'none';
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; 
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(15, 23, 42, 0.35), 0 0 30px rgba(99, 102, 241, 0.15)'; 
              }
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'; 
              e.currentTarget.style.color = '#0F172A';
              e.currentTarget.style.border = '1px solid rgba(15, 23, 42, 0.08)';
              e.currentTarget.style.transform = ''; 
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'; 
            }}
          >
            <Mic size={18} />
            {whisperOpen ? 'Close Whisper' : 'Whisper'}
          </button>

          {/* End Call Button */}
          {(agent.status === 'in_call' || agent.status === 'in_chat') && (
            <button
              onClick={handleEndCall}
              disabled={isEndingCall}
              className="flex-1 flex items-center justify-center gap-3 font-bold text-sm cursor-pointer w-full sm:w-auto"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                height: 54,
                padding: '16px 28px',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 4px 20px rgba(220, 38, 38, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                opacity: isEndingCall ? 0.6 : 1,
                letterSpacing: '0.02em',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (!isEndingCall) {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(220, 38, 38, 0.35), 0 0 30px rgba(220, 38, 38, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(220, 38, 38, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              }}
            >
              <X size={18} />
              {isEndingCall ? 'Ending…' : agent.status === 'in_call' ? 'End Call' : 'End Chat'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetailModal;
