// src/pages/admin/AdminDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  Typography,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

import Icon from '../../components/Icon';
import SupervisorFormModal from '../../components/modals/SupervisorFormModal';
import SupervisorDetailsModal from '../../components/modals/SupervisorDetailsModal';
import ActiveSupervisorModal from '../../components/modals/ActiveSupervisorModal';
import type { ActiveSupervisor } from '../../components/modals/ActiveSupervisorModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { supervisorsAPI } from '../../services/supervisorsService';
import { adminAPI } from '../../services/adminService';

import {
  faUser,
  faPhone,
  faHeadset,
  faEllipsisV,
} from '@fortawesome/free-solid-svg-icons';

// ─── Number Counter Hook ─────────────────────────────
const useCountUp = (end: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);
  return value;
};

// ─── Animated Stat Card ──────────────────────────────
const StatCard: React.FC<{ label: string; value: number; suffix?: string; color?: string; delay: number }> = ({ label, value, suffix = '', color, delay }) => {
  const count = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card sx={{
        p: 3,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 32px rgba(33,52,72,0.06)',
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 16px 48px rgba(33,52,72,0.12), 0 0 24px rgba(84,119,146,0.15)',
          borderColor: 'var(--accent-hex)',
        },
      }}>
        <Typography variant="body2" color="var(--text-secondary)" fontWeight={600} sx={{ mb: 1, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ color: color || 'var(--text-main)', fontFamily: 'var(--font-family)' }}>
          {count}{suffix}
        </Typography>
      </Card>
    </motion.div>
  );
};

// ─── 3D Tilt Card for Supervisors ────────────────────
const TiltCard: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -15, y: x * 15 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 800,
        minWidth: 260,
        flex: '0 0 auto',
      }}
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

interface LeaderboardSupervisor {
  id: string;
  rank: number;
  name: string;
  type: 'Voice' | 'Chat';
  totalCalls: number;
  performance: number;
  avgTime: string;
}

const AdminDashboard: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  const [leaderBoard, setLeaderBoard] = useState<LeaderboardSupervisor[]>([]);
  const [activeSupervisors, setActiveSupervisors] = useState<ActiveSupervisor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<LeaderboardSupervisor | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active supervisor detail modal
  const [activeSup, setActiveSup] = useState<ActiveSupervisor | null>(null);
  const [activeSupModalOpen, setActiveSupModalOpen] = useState(false);

  // Carousel scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // Fetch data from the real API
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          const res = await supervisorsAPI.getAll();
          const sups = res.data.supervisors || res.data.items || res.data || [];
          const mapped: ActiveSupervisor[] = (Array.isArray(sups) ? sups : []).map((s: Record<string, any>) => ({
            id: s.id,
            name: s.email || `Supervisor`,
            type: s.supervisor_type === 'voice' ? 'Voice Agent' : 'Chat Agent',
            performance: 0,
            activeCalls: 0,
            totalToday: 0,
            failed: 0,
          }));
          setActiveSupervisors(mapped);
          setLeaderBoard(mapped.map((s, idx) => ({
            id: s.id,
            rank: idx + 1,
            name: s.name,
            type: s.type.includes('Voice') ? 'Voice' as const : 'Chat' as const,
            totalCalls: 0,
            performance: 0,
            avgTime: '0:00',
          })));
        } else {
          // Supervisor sees their own agents
          try {
            const res = await supervisorsAPI.getMyDashboard();
            const dashboard = res.data;
            const agents = dashboard.agents || [];
            const mapped: ActiveSupervisor[] = agents.map((a: Record<string, any>) => ({
              id: a.id,
              name: a.name,
              type: a.agent_type === 'voice' ? 'Voice Agent' : 'Chat Agent',
              performance: 0,
              activeCalls: a.status === 'active' ? 1 : 0,
              totalToday: 0,
              failed: 0,
            }));
            setActiveSupervisors(mapped);
          } catch {
            setActiveSupervisors([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [activeSupervisors]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: LeaderboardSupervisor) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };
  const handleMenuClose = () => setAnchorEl(null);
  const handleInfoClick = () => { setDetailsModalOpen(true); handleMenuClose(); };
  const handleEditClick = () => { setEditModalOpen(true); handleMenuClose(); };
  const handleDeleteClick = () => { setDeleteModalOpen(true); handleMenuClose(); };

  const handleDeleteConfirm = async () => {
    if (!selectedRow) return;
    setIsDeleting(true);
    try {
      await supervisorsAPI.delete(selectedRow.id);
      setLeaderBoard(prev => prev.filter(s => s.id !== selectedRow.id).map((s, idx) => ({ ...s, rank: idx + 1 })));
      setActiveSupervisors(prev => prev.filter(s => s.id !== selectedRow.id));
    } catch (err) {
      console.error('Failed to delete supervisor', err);
    }
    setDeleteModalOpen(false);
    setSelectedRow(null);
    setIsDeleting(false);
  };

  const handleEditSubmit = async (data: { name: string; type: 'voice' | 'chat'; email: string }) => {
    if (!selectedRow) return;
    try {
      await supervisorsAPI.update(selectedRow.id, { supervisor_type: data.type });
      setLeaderBoard(prev => prev.map(s => 
        s.id === selectedRow.id 
          ? { ...s, name: data.name, type: data.type === 'voice' ? 'Voice' : 'Chat' }
          : s
      ));
    } catch (err) {
      console.error('Failed to update supervisor', err);
    }
    setEditModalOpen(false);
    setSelectedRow(null);
  };

  const handleAddSubmit = async (data: { name: string; type: 'voice' | 'chat'; email: string }) => {
    setIsAdding(true);
    try {
      const res = await supervisorsAPI.create({ email: data.email, password: 'TempPass123!', supervisor_type: data.type });
      const newSup = res.data;
      const newLeaderboard: LeaderboardSupervisor = {
        id: newSup.id,
        rank: leaderBoard.length + 1,
        name: data.name || data.email,
        type: data.type === 'voice' ? 'Voice' : 'Chat',
        totalCalls: 0,
        performance: 0,
        avgTime: '0:00',
      };
      setLeaderBoard(prev => [...prev, newLeaderboard]);
    } catch (err) {
      console.error('Failed to create supervisor', err);
    }
    setIsAdding(false);
    setAddModalOpen(false);
  };

  const totalActive = activeSupervisors.reduce((s, a) => s + a.activeCalls, 0);
  const totalToday = activeSupervisors.reduce((s, a) => s + a.totalToday, 0);
  const avgPerf = activeSupervisors.length > 0 ? Math.round(activeSupervisors.reduce((s, a) => s + a.performance, 0) / activeSupervisors.length) : 0;
  const totalFailed = activeSupervisors.reduce((s, a) => s + a.failed, 0);

  return (
    <Box sx={{ direction: 'ltr', minHeight: '100vh', overflow: 'hidden', p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)' }}>
      {/* Keyframes */}
      <style>{`
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes float3d {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>
        Welcome, {isAdmin ? 'Admin' : 'Supervisor'}
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>
        {isAdmin ? 'High-level overview of all supervisors and global statistics' : 'Overview of your agents and their performance'}
      </Typography>

      {/* ═══ Bento Stats Grid ═══ */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 2.5,
        mb: 5,
      }}>
        <StatCard label="Active Now" value={totalActive} delay={0} color="var(--success)" />
        <StatCard label="Total Today" value={totalToday} delay={0.1} />
        <StatCard label="Avg Performance" value={avgPerf} suffix="%" delay={0.2} color="var(--accent-hex)" />
        <StatCard label="Failed" value={totalFailed} delay={0.3} color="var(--danger)" />
      </Box>

      {/* ═══ Active Supervisors - Carousel ═══ */}
      <Typography variant="h5" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
        {isAdmin ? 'Active Supervisors' : 'My Agents'}
      </Typography>

      <Box sx={{ position: 'relative', mb: 5 }}>
        {/* Left Arrow - vertically centered */}
        {canScrollLeft && (
          <IconButton
            onClick={() => scroll('left')}
            sx={{
              position: 'absolute',
              left: -18,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 36, height: 36,
              border: '1px solid var(--glass-border)',
              borderRadius: '50%',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(33,52,72,0.10)',
              transition: 'all 0.25s ease',
              cursor: 'pointer',
              '&:hover': {
                background: 'rgba(79,110,247,0.12)',
                borderColor: 'var(--action-primary)',
                boxShadow: '0 0 20px rgba(79,110,247,0.25)',
              },
            }}
          >
            <ChevronLeft size={18} />
          </IconButton>
        )}

        {/* Right Arrow - vertically centered */}
        {canScrollRight && (
          <IconButton
            onClick={() => scroll('right')}
            sx={{
              position: 'absolute',
              right: -18,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 36, height: 36,
              border: '1px solid var(--glass-border)',
              borderRadius: '50%',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(33,52,72,0.10)',
              transition: 'all 0.25s ease',
              cursor: 'pointer',
              '&:hover': {
                background: 'rgba(79,110,247,0.12)',
                borderColor: 'var(--action-primary)',
                boxShadow: '0 0 20px rgba(79,110,247,0.25)',
              },
            }}
          >
            <ChevronRight size={18} />
          </IconButton>
        )}

        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            gap: 3,
            overflowX: 'auto',
            pb: 2,
            px: 1,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'var(--border)', borderRadius: 3 },
          }}
        >
        {activeSupervisors.map((sup, idx) => (
          <TiltCard key={sup.id} index={idx}>
            <Card
              onClick={() => { setActiveSup(sup); setActiveSupModalOpen(true); }}
              sx={{
                textAlign: 'center', p: 3,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 32px rgba(33,52,72,0.06)',
                scrollSnapAlign: 'start',
                minWidth: 240,
                transition: 'box-shadow 0.4s ease',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: '0 16px 48px rgba(33,52,72,0.12), 0 0 24px rgba(84,119,146,0.15)',
                },
              }}>
              {/* Status badge */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.8,
                  px: 1.5, py: 0.4,
                  borderRadius: 'var(--radius-pill)',
                  background: sup.activeCalls > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(148,180,193,0.12)',
                  fontSize: 11, fontWeight: 700,
                  color: sup.activeCalls > 0 ? 'var(--success)' : 'var(--text-muted)',
                  animation: sup.activeCalls > 0 ? 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                }}>
                  <Box sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: sup.activeCalls > 0 ? 'var(--success)' : 'var(--text-muted)',
                  }} />
                  {sup.activeCalls > 0 ? 'Active' : 'Offline'}
                </Box>
              </Box>

              <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ fontSize: 15 }}>
                {sup.name}
              </Typography>
              <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, fontSize: 12 }}>
                {sup.type === 'Voice Agent' ? <><Icon icon={faPhone} /> Voice</> : <><Icon icon={faHeadset} /> Chat</>}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: 'var(--radius-sm)', background: 'rgba(84,119,146,0.08)' }}>
                  <Typography variant="caption" color="var(--text-secondary)" sx={{ fontSize: 10 }}>Performance</Typography>
                  <Typography variant="body2" fontWeight={700} color="var(--accent-hex)">{sup.performance}%</Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 'var(--radius-sm)', background: 'rgba(84,119,146,0.08)' }}>
                  <Typography variant="caption" color="var(--text-secondary)" sx={{ fontSize: 10 }}>Active</Typography>
                  <Typography variant="body2" fontWeight={700} color="var(--success)">{sup.activeCalls}</Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 'var(--radius-sm)', background: 'rgba(84,119,146,0.08)' }}>
                  <Typography variant="caption" color="var(--text-secondary)" sx={{ fontSize: 10 }}>Today</Typography>
                  <Typography variant="body2" fontWeight={700}>{sup.totalToday}</Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 'var(--radius-sm)', background: sup.failed > 2 ? 'rgba(239,68,68,0.08)' : 'rgba(84,119,146,0.08)' }}>
                  <Typography variant="caption" color="var(--text-secondary)" sx={{ fontSize: 10 }}>Failed</Typography>
                  <Typography variant="body2" fontWeight={700} color="var(--danger)">{sup.failed}</Typography>
                </Box>
              </Box>

              {/* View Details button */}
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                color: 'var(--action-primary)', fontSize: 12, fontWeight: 600,
                opacity: 0.7, transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': { opacity: 1 },
              }}>
                View Details <ChevronRight size={14} />
              </Box>
            </Card>
          </TiltCard>
        ))}
        </Box>
      </Box>

      {/* ═══ Leaderboard ═══ */}
      {isAdmin && (
        <>
          <Typography variant="h5" fontWeight={600} color="var(--text-main)" sx={{ mt: 2, mb: 3 }}>
            Leader Board
          </Typography>

          <TableContainer component={Paper} sx={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 8px 32px rgba(33,52,72,0.06)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
          }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'transparent' }}>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Supervisor</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Monthly Calls</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Performance</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Handle Time</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Options</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderBoard.map((row) => (
                  <TableRow key={row.id} hover sx={{ transition: 'background 0.2s' }}>
                    <TableCell>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: row.rank <= 3 ? 'linear-gradient(135deg, var(--primary-hex), var(--accent-hex))' : 'rgba(84,119,146,0.1)',
                        color: row.rank <= 3 ? '#fff' : 'var(--text-main)',
                        fontWeight: 700, fontSize: 12,
                      }}>
                        {row.rank}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                    <TableCell>
                      <Box sx={{
                        display: 'inline-block', px: 1.5, py: 0.5,
                        borderRadius: 'var(--radius-pill)',
                        background: row.type === 'Voice' ? 'rgba(16,185,129,0.1)' : 'rgba(84,119,146,0.1)',
                        color: row.type === 'Voice' ? 'var(--success)' : 'var(--accent-hex)',
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {row.type}
                      </Box>
                    </TableCell>
                    <TableCell>{row.totalCalls.toLocaleString()}</TableCell>
                    <TableCell>
                      <Box sx={{
                        display: 'inline-block', px: 1.5, py: 0.5,
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 12, fontWeight: 600,
                        background: row.performance >= 90
                          ? 'rgba(16,185,129,0.1)'
                          : row.performance >= 85
                            ? 'rgba(245,158,11,0.1)'
                            : 'rgba(239,68,68,0.1)',
                        color: row.performance >= 90
                          ? 'var(--success)'
                          : row.performance >= 85
                            ? 'var(--warning)'
                            : 'var(--danger)',
                      }}>
                        {row.performance}%
                      </Box>
                    </TableCell>
                    <TableCell>{row.avgTime}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleMenuOpen(e, row)} size="small">
                        <Icon icon={faEllipsisV} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { boxShadow: '0 8px 32px rgba(33,52,72,0.12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' } }}>
        <MenuItem onClick={handleInfoClick} sx={{ color: 'var(--action-primary)', fontWeight: 500 }}>Info</MenuItem>
        <MenuItem onClick={handleEditClick} sx={{ color: 'var(--action-warning-hover)', fontWeight: 500 }}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'var(--action-danger)', fontWeight: 500 }}>Delete</MenuItem>
      </Menu>

      <SupervisorFormModal open={addModalOpen} onClose={() => setAddModalOpen(false)} supervisor={null} onSubmit={handleAddSubmit} />
      <SupervisorDetailsModal open={detailsModalOpen} onClose={() => { setDetailsModalOpen(false); setSelectedRow(null); }} supervisor={selectedRow} />
      <SupervisorFormModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedRow(null); }}
        supervisor={selectedRow ? { id: selectedRow.id, name: selectedRow.name, type: selectedRow.type.toLowerCase() as 'voice' | 'chat', email: `${selectedRow.name.toLowerCase().replace(' ', '.')}@company.com` } : null}
        onSubmit={handleEditSubmit}
      />
      <DeleteConfirmModal open={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setSelectedRow(null); }} onConfirm={handleDeleteConfirm} itemName={selectedRow?.name || ''} isDeleting={isDeleting} />
      <ActiveSupervisorModal open={activeSupModalOpen} onClose={() => { setActiveSupModalOpen(false); setActiveSup(null); }} supervisor={activeSup} />
    </Box>
  );
};

export default AdminDashboard;
