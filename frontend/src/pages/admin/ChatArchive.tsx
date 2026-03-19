// src/pages/admin/ChatArchive.tsx — Supervisor chat archive with Insight Card expansion
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import { MessageSquare, ChevronDown, TrendingUp, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { archivesAPI } from '../../services/archivesService';

interface ChatLog {
  id: string;
  customer: string;
  time: string;
  date: string;
  duration: string;
  messagePreview: string;
  status: 'Resolved' | 'Pending' | 'Escalated';
  satisfaction: number;
  summary: string;
  tags: string[];
}

const statusColor = (s: string) => {
  if (s === 'Resolved') return { bg: 'rgba(34,197,94,0.1)', fg: '#22c55e' };
  if (s === 'Pending') return { bg: 'rgba(245,158,11,0.1)', fg: '#f59e0b' };
  return { bg: 'rgba(239,68,68,0.1)', fg: '#ef4444' };
};

const getSatisfactionColor = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

const SatisfactionGauge: React.FC<{ score: number }> = ({ score }) => {
  const color = getSatisfactionColor(score);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" fontWeight={800} sx={{ color, fontSize: '0.85rem' }}>{score}%</Typography>
      </Box>
    </Box>
  );
};

const ChatArchive: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        const res = await archivesAPI.getAll();
        const data = res.data;
        const archives = Array.isArray(data) ? data : data.items || data.archives || [];
        const mapped: ChatLog[] = archives
          .filter((a: any) => a.channel === 'chat')
          .map((a: any) => ({
            id: a.id,
            customer: a.customer_name || a.caller || 'Unknown',
            time: new Date(a.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(a.created_at || Date.now()).toISOString().split('T')[0],
            duration: a.duration || '0:00',
            messagePreview: a.message_preview || a.summary || 'No preview available',
            status: (a.status === 'completed' || a.status === 'resolved' ? 'Resolved' : a.status === 'pending' ? 'Pending' : 'Escalated') as ChatLog['status'],
            satisfaction: a.satisfaction ?? 0,
            summary: a.summary || 'No summary available',
            tags: a.tags || [],
          }));
        setChatLogs(mapped);
      } catch (err) {
        console.error('Failed to fetch archives', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArchives();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>Chat Transcripts</Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>Your recent chat history — click any record to reveal insights</Typography>

      <Stack spacing={2}>
        {chatLogs.map((log, idx) => {
          const sc = statusColor(log.status);
          const isExpanded = expandedId === log.id;

          return (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, delay: idx * 0.06 }}
            >
              <Paper
                onClick={() => toggleExpand(log.id)}
                sx={{
                  borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                  cursor: 'pointer', overflow: 'hidden',
                  transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                  '&:hover': { boxShadow: 'var(--shadow-lg)', borderColor: 'var(--accent-hex)' },
                  ...(isExpanded && { borderColor: 'var(--accent-hex)', boxShadow: 'var(--shadow-lg)' }),
                }}
                elevation={0}
              >
                {/* Row header */}
                <Box sx={{ p: 2.5, display: 'flex', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84,119,146,0.1)', alignSelf: 'flex-start', mt: 0.5 }}>
                    <MessageSquare size={22} color="var(--accent-hex)" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body1" fontWeight={700} color="var(--text-main)" noWrap>{log.customer}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="var(--text-muted)">{log.date} · {log.time}</Typography>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                          <ChevronDown size={18} color="var(--text-muted)" />
                        </motion.div>
                      </Stack>
                    </Box>
                    <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.messagePreview}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={log.status} size="small" sx={{ bgcolor: sc.bg, color: sc.fg, fontWeight: 600 }} />
                      <Typography variant="caption" color="var(--text-muted)">{log.duration} duration</Typography>
                    </Stack>
                  </Box>
                </Box>

                {/* Expandable Insight Card */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Box sx={{ px: 2.5, pb: 2.5, pt: 0, borderTop: '1px solid var(--border)' }}>
                        <Box sx={{ pt: 2.5, display: 'flex', gap: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                          {/* Satisfaction Gauge */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 90 }}>
                            <SatisfactionGauge score={log.satisfaction} />
                            <Typography variant="caption" fontWeight={600} color="var(--text-muted)" sx={{ mt: 0.5 }}>Satisfaction</Typography>
                          </Box>

                          {/* Problem Summary & Tags */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <TrendingUp size={14} color="var(--accent-hex)" />
                              <Typography variant="caption" fontWeight={700} color="var(--accent-hex)" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Problem Summary</Typography>
                            </Box>
                            <Typography variant="body2" color="var(--text-main)" sx={{ mb: 2, lineHeight: 1.7, fontWeight: 400 }}>
                              {log.summary}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Tag size={14} color="var(--text-muted)" />
                              <Typography variant="caption" fontWeight={700} color="var(--text-muted)" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags & Issues</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {log.tags.map(tag => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    '&:hover': { borderColor: 'var(--accent-hex)', color: 'var(--accent-hex)' },
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Paper>
            </motion.div>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ChatArchive;
