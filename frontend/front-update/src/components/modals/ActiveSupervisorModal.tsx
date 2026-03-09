import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon';
import {
  faUser,
  faPhone,
  faHeadset,
  faTimes,
  faEnvelope,
  faCommentDots,
  faPaperPlane,
  faCheck,
  faCheckDouble,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';

export interface ActiveSupervisor {
  id: number;
  name: string;
  type: 'Voice Agent' | 'Chat Agent';
  performance: number;
  activeCalls: number;
  totalToday: number;
  failed: number;
  email?: string;
  phone?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'supervisor';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Props {
  open: boolean;
  onClose: () => void;
  supervisor: ActiveSupervisor | null;
}

const ActiveSupervisorModal: React.FC<Props> = ({ open, onClose, supervisor }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (!open) {
      setChatOpen(false);
    }
  }, [open]);

  if (!supervisor) return null;

  const isActive = supervisor.activeCalls > 0;
  const email = supervisor.email || `${supervisor.name.toLowerCase().replace(/\s/g, '.')}@company.com`;
  const phone = supervisor.phone || '+971 50 123 4567';

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    const msgId = Date.now().toString();
    const newMsg: ChatMessage = {
      id: msgId,
      text,
      sender: 'me',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setSending(true);

    await new Promise((r) => setTimeout(r, 800));
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, status: 'sent' } : m));

    await new Promise((r) => setTimeout(r, 600));
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, status: 'delivered' } : m));
    setSending(false);

    setTyping(true);
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    setTyping(false);

    const replies = [
      "Got it, I'll look into this right away.",
      "Thanks for the heads up. On it!",
      "Understood. Let me check the dashboard.",
      "Sure, I'll handle it now.",
      "Roger that. Will update you shortly.",
    ];

    const replyMsg: ChatMessage = {
      id: Date.now().toString(),
      text: replies[Math.floor(Math.random() * replies.length)],
      sender: 'supervisor',
      timestamp: new Date(),
      status: 'read',
    };
    setMessages((prev) => [...prev, replyMsg]);

    setTimeout(() => {
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, status: 'read' } : m));
    }, 300);
  };

  const statusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending': return <CircularProgress size={10} sx={{ color: 'var(--modal-text-muted)' }} />;
      case 'sent': return <Icon icon={faCheck} className="text-[10px]" style={{ color: 'var(--modal-text-muted)' }} />;
      case 'delivered': return <Icon icon={faCheckDouble} className="text-[10px]" style={{ color: 'var(--modal-text-muted)' }} />;
      case 'read': return <Icon icon={faCheckDouble} className="text-[10px]" style={{ color: 'var(--action-primary)' }} />;
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      {open && (
        <Modal open={open} onClose={onClose} closeAfterTransition>
          <Box sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}>
            <motion.div
              initial={{ opacity: 0, y: -60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                width: '95%',
                maxWidth: 520,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                outline: 'none',
              }}
            >
              <Box sx={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--modal-border)',
                boxShadow: 'var(--modal-shadow)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out',
              }}>
                {/* Header */}
                <Box sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, var(--primary-hex), var(--accent-hex))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {chatOpen && (
                      <IconButton onClick={() => setChatOpen(false)} sx={{ color: 'white', p: 0.5 }}>
                        <Icon icon={faArrowLeft} />
                      </IconButton>
                    )}
                    <Typography variant="h6" fontWeight={700} color="white">
                      {chatOpen ? `Chat with ${supervisor.name.split(' ')[0]}` : 'Supervisor Details'}
                    </Typography>
                  </Box>
                  <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <Icon icon={faTimes} />
                  </IconButton>
                </Box>

                <AnimatePresence mode="wait">
                  {!chatOpen ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
                    >
                      {/* Scrollable Body */}
                      <Box className="modal-scroll" sx={{
                        p: 3,
                        background: 'var(--modal-bg)',
                        overflowY: 'auto',
                        flex: 1,
                        transition: 'background-color 0.3s ease-in-out',
                      }}>
                        {/* Profile */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
                          <Avatar sx={{
                            width: 64, height: 64,
                            bgcolor: 'var(--primary-hex)',
                            border: '3px solid var(--accent-hex)',
                            fontSize: 24,
                          }}>
                            <Icon icon={faUser} size="lg" color="#fff" />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={700} color="var(--modal-text)">
                              {supervisor.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={isActive ? 'Active' : 'Offline'}
                                sx={{
                                  bgcolor: isActive ? 'var(--status-active-bg)' : 'var(--status-inactive-bg)',
                                  color: isActive ? 'var(--status-active)' : 'var(--modal-text-muted)',
                                  fontWeight: 600, fontSize: 11,
                                }}
                              />
                              <Chip
                                size="small"
                                icon={<Icon icon={supervisor.type === 'Voice Agent' ? faPhone : faHeadset} />}
                                label={supervisor.type}
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: 11, borderColor: 'var(--modal-border)', color: 'var(--modal-text-secondary)' }}
                              />
                            </Box>
                          </Box>
                        </Box>

                        <Divider sx={{ borderColor: 'var(--modal-border)', mb: 2.5 }} />

                        {/* Real-time Metrics */}
                        <Typography variant="caption" color="var(--modal-text-secondary)" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5, display: 'block' }}>
                          Real-Time Metrics
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
                          {[
                            { label: 'Active Calls', value: supervisor.activeCalls, color: 'var(--status-active)' },
                            { label: 'Performance', value: `${supervisor.performance}%`, color: 'var(--status-performance)' },
                            { label: 'Total Today', value: supervisor.totalToday, color: 'var(--modal-text)' },
                            { label: 'Failed', value: supervisor.failed, color: 'var(--action-danger)' },
                          ].map((m) => (
                            <Box key={m.label} sx={{
                              p: 1.5, borderRadius: 'var(--radius-md)',
                              background: 'var(--modal-surface)',
                              border: '1px solid var(--modal-border)',
                              transition: 'background-color 0.3s ease-in-out',
                            }}>
                              <Typography variant="caption" color="var(--modal-text-muted)" sx={{ fontSize: 10, fontWeight: 600 }}>{m.label}</Typography>
                              <Typography variant="h6" fontWeight={800} color={m.color}>{m.value}</Typography>
                            </Box>
                          ))}
                        </Box>

                        {/* Contact */}
                        <Typography variant="caption" color="var(--modal-text-secondary)" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, mb: 1, display: 'block' }}>
                          Contact
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Icon icon={faEnvelope} color="var(--modal-text-muted)" />
                            <Typography variant="body2" color="var(--modal-text)">{email}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Icon icon={faPhone} color="var(--modal-text-muted)" />
                            <Typography variant="body2" color="var(--modal-text)">{phone}</Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Sticky Footer - Send Message Button */}
                      <Box sx={{
                        p: 2.5,
                        borderTop: '1px solid var(--modal-border)',
                        background: 'var(--modal-bg)',
                        flexShrink: 0,
                        transition: 'background-color 0.3s ease-in-out',
                      }}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => setChatOpen(true)}
                          startIcon={<Icon icon={faCommentDots} color="#fff" />}
                          sx={{
                            py: 1.2,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            fontWeight: 700,
                            textTransform: 'none',
                            fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                              boxShadow: '0 6px 30px rgba(139,92,246,0.4)',
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          Send Message
                        </Button>
                      </Box>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
                    >
                      {/* Chat Messages Area */}
                      <Box className="modal-scroll" sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 2,
                        background: 'var(--modal-bg-secondary)',
                        minHeight: 280,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        transition: 'background-color 0.3s ease-in-out',
                      }}>
                        {messages.length === 0 && (
                          <Box sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1.5,
                          }}>
                            <Icon icon={faCommentDots} size="2x" color="var(--modal-text-muted)" />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--modal-text-secondary)' }}>
                              Start a conversation with {supervisor.name.split(' ')[0]}
                            </Typography>
                          </Box>
                        )}

                        {messages.map((msg, i) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30, delay: i === messages.length - 1 ? 0.05 : 0 }}
                          >
                            <Box sx={{
                              display: 'flex',
                              justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                              mb: 0.5,
                            }}>
                              <Box sx={{
                                maxWidth: '78%',
                                p: 1.5,
                                px: 2,
                                borderRadius: msg.sender === 'me'
                                  ? '16px 16px 4px 16px'
                                  : '16px 16px 16px 4px',
                                background: msg.sender === 'me'
                                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                  : 'var(--modal-bg)',
                                color: msg.sender === 'me' ? '#fff' : 'var(--modal-text)',
                                border: msg.sender === 'supervisor' ? '1px solid var(--modal-border)' : 'none',
                                boxShadow: msg.sender === 'supervisor'
                                  ? '0 1px 3px rgba(0,0,0,0.06)'
                                  : '0 2px 8px rgba(99,102,241,0.2)',
                              }}>
                                <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>
                                  {msg.text}
                                </Typography>
                                <Box sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                  mt: 0.5,
                                }}>
                                  <Typography variant="caption" sx={{
                                    fontSize: 9,
                                    opacity: 0.7,
                                    color: msg.sender === 'me' ? 'rgba(255,255,255,0.7)' : 'var(--modal-text-muted)',
                                  }}>
                                    {formatTime(msg.timestamp)}
                                  </Typography>
                                  {msg.sender === 'me' && statusIcon(msg.status)}
                                </Box>
                              </Box>
                            </Box>
                          </motion.div>
                        ))}

                        {/* Typing Indicator */}
                        <AnimatePresence>
                          {typing && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                            >
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1.5,
                                px: 2,
                                borderRadius: '16px 16px 16px 4px',
                                background: 'var(--modal-surface)',
                                border: '1px solid var(--modal-border)',
                                width: 'fit-content',
                              }}>
                                <Box sx={{ display: 'flex', gap: 0.4 }}>
                                  {[0, 1, 2].map((dot) => (
                                    <motion.div
                                      key={dot}
                                      animate={{ y: [0, -4, 0] }}
                                      transition={{
                                        duration: 0.6,
                                        repeat: Infinity,
                                        delay: dot * 0.15,
                                      }}
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: 'var(--modal-text-muted)',
                                      }}
                                    />
                                  ))}
                                </Box>
                                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'var(--modal-text-secondary)' }}>
                                  {supervisor.name.split(' ')[0]} is typing...
                                </Typography>
                              </Box>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div ref={messagesEndRef} />
                      </Box>

                      {/* Chat Input */}
                      <Box sx={{
                        p: 2,
                        borderTop: '1px solid var(--modal-border)',
                        background: 'var(--modal-bg)',
                        flexShrink: 0,
                        transition: 'background-color 0.3s ease-in-out',
                      }}>
                        <Box sx={{
                          display: 'flex',
                          gap: 1,
                          alignItems: 'flex-end',
                        }}>
                          <TextField
                            fullWidth
                            multiline
                            maxRows={3}
                            placeholder="Type a message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '14px',
                                background: 'var(--modal-surface)',
                                border: '1px solid var(--modal-border)',
                                fontSize: 13,
                                transition: 'all 0.3s ease',
                                '& fieldset': { border: 'none' },
                                '&:hover': {
                                  background: 'var(--modal-surface)',
                                  borderColor: 'var(--modal-text-muted)',
                                },
                                '&.Mui-focused': {
                                  background: 'var(--modal-bg)',
                                  border: '1px solid #6366f1',
                                  boxShadow: '0 0 0 3px rgba(99,102,241,0.12)',
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: 'var(--modal-text)',
                                fontWeight: 500,
                                py: 1.2,
                                px: 1.5,
                                '&::placeholder': { color: 'var(--modal-text-muted)', opacity: 1, fontWeight: 500 },
                              },
                            }}
                          />
                          <motion.div whileTap={{ scale: 0.9 }}>
                            <IconButton
                              onClick={handleSend}
                              disabled={!inputValue.trim() || sending}
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                background: inputValue.trim()
                                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                  : 'var(--modal-surface)',
                                color: inputValue.trim() ? '#fff' : 'var(--modal-text-muted)',
                                boxShadow: inputValue.trim() ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  background: inputValue.trim()
                                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                    : 'var(--modal-surface)',
                                  boxShadow: inputValue.trim() ? '0 6px 24px rgba(139,92,246,0.4)' : 'none',
                                },
                                '&.Mui-disabled': {
                                  background: 'var(--modal-surface)',
                                  color: 'var(--modal-text-muted)',
                                },
                              }}
                            >
                              {sending
                                ? <CircularProgress size={18} sx={{ color: '#fff' }} />
                                : <Icon icon={faPaperPlane} />
                              }
                            </IconButton>
                          </motion.div>
                        </Box>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </motion.div>
          </Box>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default ActiveSupervisorModal;
