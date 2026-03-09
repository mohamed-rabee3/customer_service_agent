// src/pages/admin/VoiceArchive.tsx — Supervisor voice archive with Insight Card expansion
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import { Phone, Clock, ChevronDown, TrendingUp, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallLog {
  id: number;
  caller: string;
  time: string;
  date: string;
  duration: string;
  status: 'Completed' | 'Missed' | 'Failed';
  performance: number;
  satisfaction: number;
  summary: string;
  tags: string[];
}

const callLogs: CallLog[] = [
  { id: 1, caller: 'John Smith', time: '14:32', date: '2024-01-15', duration: '4:32', status: 'Completed', performance: 92, satisfaction: 88, summary: 'Customer called regarding a billing discrepancy on their latest invoice. Agent verified the charge, identified a duplicate transaction, and initiated an immediate refund. Customer was satisfied with the resolution speed.', tags: ['Billing', 'Refund', 'Resolved'] },
  { id: 2, caller: 'Maria Garcia', time: '13:15', date: '2024-01-15', duration: '3:10', status: 'Completed', performance: 88, satisfaction: 92, summary: 'Inquiry about upgrading the current subscription plan. Agent walked through available options and pricing tiers. Customer chose the premium plan and the upgrade was processed on the spot.', tags: ['Subscription', 'Upgrade'] },
  { id: 3, caller: 'Ali Hassan', time: '12:00', date: '2024-01-15', duration: '0:45', status: 'Missed', performance: 0, satisfaction: 0, summary: 'Call was missed due to high queue volume. An automated callback was scheduled for the next available slot.', tags: ['Missed', 'Queue Overflow'] },
  { id: 4, caller: 'Sarah Connor', time: '11:30', date: '2024-01-14', duration: '6:20', status: 'Failed', performance: 65, satisfaction: 42, summary: 'Customer reported a recurring technical issue with their account login. Multiple troubleshooting steps were attempted but the issue persisted. Case was escalated to the engineering team for further investigation.', tags: ['Technical', 'Escalated', 'Login Issue'] },
  { id: 5, caller: 'David Lee', time: '10:05', date: '2024-01-14', duration: '2:55', status: 'Completed', performance: 95, satisfaction: 96, summary: 'Quick password reset request handled efficiently. Agent verified identity through security questions and reset was completed within two minutes.', tags: ['Password Reset', 'Quick Resolution'] },
  { id: 6, caller: 'Fatima Noor', time: '09:20', date: '2024-01-14', duration: '5:10', status: 'Completed', performance: 90, satisfaction: 85, summary: 'Customer inquired about data export options for compliance purposes. Agent provided a walkthrough of the export tool and emailed a detailed guide with screenshots.', tags: ['Data Export', 'Compliance'] },
];

const statusColor = (s: string) => {
  if (s === 'Completed') return { bg: 'rgba(34,197,94,0.1)', fg: '#22c55e' };
  if (s === 'Missed') return { bg: 'rgba(245,158,11,0.1)', fg: '#f59e0b' };
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

const VoiceArchive: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>Recent Calls</Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>Your voice call history — click any record to reveal insights</Typography>

      <Stack spacing={2}>
        {callLogs.map((log, idx) => {
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
                <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84,119,146,0.1)' }}>
                    <Phone size={22} color="var(--accent-hex)" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={700} color="var(--text-main)" noWrap>{log.caller}</Typography>
                    <Typography variant="caption" color="var(--text-muted)">{log.date} · {log.time}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Stack alignItems="flex-end">
                      <Typography variant="body2" fontWeight={600} color="var(--text-main)">{log.duration}</Typography>
                      <Typography variant="caption" color="var(--text-muted)">duration</Typography>
                    </Stack>
                    <Chip label={log.status} size="small" sx={{ bgcolor: sc.bg, color: sc.fg, fontWeight: 600 }} />
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                      <ChevronDown size={18} color="var(--text-muted)" />
                    </motion.div>
                  </Stack>
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

                          {/* Performance pill */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 90 }}>
                            <Box sx={{
                              px: 2, py: 1, borderRadius: 'var(--radius-pill)',
                              bgcolor: log.performance >= 80 ? 'rgba(34,197,94,0.1)' : log.performance >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                            }}>
                              <Typography variant="body1" fontWeight={800} sx={{ color: getSatisfactionColor(log.performance) }}>
                                {log.performance}%
                              </Typography>
                            </Box>
                            <Typography variant="caption" fontWeight={600} color="var(--text-muted)">Performance</Typography>
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

export default VoiceArchive;
