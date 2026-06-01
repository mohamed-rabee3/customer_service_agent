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
import { analyticsAPI, type AdminAnalyticsData } from '../../services/analyticsService';
import { toast } from 'react-toastify';

import {
  faUser,
  faPhone,
  faHeadset,
  faEllipsisV,
  faUserPlus,
  faLock
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
  email: string;
  type: 'Voice' | 'Chat';
  agentsCount: number;
  totalCalls: number;
  performance: number;
  avgTime: string;
}

function formatAvgHandleSeconds(sec: number | undefined | null): string {
  if (sec == null || Number.isNaN(Number(sec)) || sec <= 0) return '—';
  const s = Math.floor(Number(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
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
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Active supervisor detail modal
  const [activeSup, setActiveSup] = useState<ActiveSupervisor | null>(null);
  const [activeSupModalOpen, setActiveSupModalOpen] = useState(false);

  // Admin analytics KPI state
  const [adminKpis, setAdminKpis] = useState<AdminAnalyticsData | null>(null);

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

  const loadSupervisors = async () => {
    const res = await supervisorsAPI.getAll();
    const sups: Record<string, any>[] = Array.isArray(res.data?.supervisors)
      ? res.data.supervisors
      : Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data)
          ? res.data
          : [];

    const mapped: ActiveSupervisor[] = sups.map((s) => ({
      id: s.id,
      name: s.name || s.email || 'Supervisor',
      type: s.supervisor_type === 'voice' ? 'Voice Agent' : 'Chat Agent',
      email: s.email || '',
      performance: 0,
      activeCalls: 0,
      totalToday: 0,
      failed: 0,
    }));
    setActiveSupervisors(mapped);

    setLeaderBoard((prev) => {
      const prevById = new Map(prev.map((row) => [String(row.id), row]));
      return sups.map((s, idx) => {
        const existing = prevById.get(String(s.id));
        return {
          id: s.id,
          rank: idx + 1,
          name: s.name || s.email || 'Supervisor',
          email: s.email || '',
          type: s.supervisor_type === 'voice' ? 'Voice' as const : 'Chat' as const,
          agentsCount: Number(s.agent_count ?? existing?.agentsCount ?? 0) || 0,
          totalCalls: existing?.totalCalls ?? 0,
          performance: existing?.performance ?? Math.round(s.performance_score ?? 0),
          avgTime: existing?.avgTime ?? '—',
        };
      });
    });

    return mapped;
  };

  // Fetch data from the real API
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          await loadSupervisors();

          // Fetch admin KPI overview
          try {
            const kpiRes = await analyticsAPI.getAdminOverview('month');
            setAdminKpis(kpiRes.data);
            // Enrich leaderboard with real data from supervisor breakdown
            if (kpiRes.data.supervisors_breakdown) {
              const breakdownMap = new Map(kpiRes.data.supervisors_breakdown.map(sb => [sb.supervisor_id, sb]));
              setLeaderBoard(prev => prev.map((row, idx) => {
                const sb = breakdownMap.get(row.id);
                if (sb) {
                  return {
                    ...row,
                    totalCalls: sb.total_interactions,
                    performance: Math.round(sb.performance_score),
                    avgTime: formatAvgHandleSeconds(sb.avg_handle_time),
                  };
                }
                return row;
              }).sort((a, b) => b.performance - a.performance).map((s, idx) => ({ ...s, rank: idx + 1 })));
            }
          } catch (kpiErr) {
            console.warn('Failed to fetch admin KPIs', kpiErr);
          }
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
    setIsSavingEdit(true);
    try {
      const res = await supervisorsAPI.update(selectedRow.id, {
        name: data.name,
        email: data.email,
        supervisor_type: data.type,
      });
      const updated = res.data as {
        id: string;
        name?: string;
        email?: string;
        supervisor_type?: 'voice' | 'chat';
      };
      const nextName = updated.name || data.name;
      const nextEmail = updated.email || data.email;
      const nextType = (updated.supervisor_type || data.type) === 'voice' ? 'Voice' as const : 'Chat' as const;

      setLeaderBoard((prev) =>
        prev.map((row) =>
          String(row.id) === String(selectedRow.id)
            ? { ...row, name: nextName, email: nextEmail, type: nextType }
            : row
        )
      );
      setActiveSupervisors((prev) =>
        prev.map((row) =>
          String(row.id) === String(selectedRow.id)
            ? {
                ...row,
                name: nextName,
                email: nextEmail,
                type: nextType === 'Voice' ? 'Voice Agent' : 'Chat Agent',
              }
            : row
        )
      );

      toast.success('Supervisor updated successfully');
      await loadSupervisors();
      setEditModalOpen(false);
      setSelectedRow(null);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update supervisor');
      throw err;
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddSubmit = async (data: { name: string; type: 'voice' | 'chat'; email: string; password?: string }) => {
    setIsAdding(true);
    try {
      await supervisorsAPI.create({
        email: data.email,
        password: data.password || 'TempPass123!',
        name: data.name,
        supervisor_type: data.type,
      });
      toast.success('Supervisor created successfully');
      await loadSupervisors();
      setAddModalOpen(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create supervisor');
      throw err;
    } finally {
      setIsAdding(false);
    }
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
        mb: 3,
      }}>
        <StatCard label="Total Interactions" value={adminKpis?.total_interactions ?? totalToday} delay={0} />
        <StatCard label="Avg CSAT" value={Math.round(adminKpis?.overall_csat ?? 0)} suffix="%" delay={0.1} color="var(--success)" />
        <StatCard label="FCR Rate" value={Math.round(adminKpis?.avg_fcr ?? 0)} suffix="%" delay={0.2} color="var(--accent-hex)" />
        <StatCard label="Containment" value={Math.round(adminKpis?.containment_rate ?? 0)} suffix="%" delay={0.3} color="var(--success)" />
      </Box>

      {/* ═══ Secondary KPI Row ═══ */}
      {adminKpis && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 5,
        }}>
          <StatCard label="Voice Calls" value={adminKpis.total_voice_interactions} delay={0.4} />
          <StatCard label="Chat Sessions" value={adminKpis.total_chat_interactions} delay={0.5} />
          <StatCard label="Avg Performance" value={Math.round(adminKpis.performance_score)} suffix="%" delay={0.6} color="var(--accent-hex)" />
          <StatCard label="Active Now" value={totalActive} delay={0.7} color="var(--success)" />
        </Box>
      )}

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

      {/* ═══ Desktop Layout: Leaderboard & Access Requests ═══ */}
      {isAdmin && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 3fr' }, gap: 4, mt: 2 }}>
          {/* Left Column: Leaderboard */}
          <Box>
            <Typography variant="h5" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
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
          </Box>

          {/* Right Column: Access Requests */}
          <Box>
            <Typography variant="h5" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Access Requests
            </Typography>
            <Card sx={{
              p: 2.5,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 8px 32px rgba(33,52,72,0.06)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5
            }}>
              {[
                { id: 1, name: 'Elena Vance', agent: 'TOMMY R.', desc: 'Requesting supervisor level access for internal chat moderation tools.', status: 'ALLOWED' },
                { id: 2, name: 'Marcus Chen', agent: 'SARAH K.', desc: 'Agent needs access to sensitive customer data archive for historical billing dispute.', status: 'BLOCKED' },
                { id: 3, name: 'David Kovac', agent: 'LEO G.', desc: 'Agent requires dashboard access for regional performance monitoring.', status: 'ALLOWED' }
              ].map((req) => (
                <Box key={req.id} sx={{ 
                  p: 2, 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(33,52,72,0.05)' }
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ 
                        width: 36, height: 36, 
                        bgcolor: req.status === 'ALLOWED' ? 'rgba(79,110,247,0.08)' : 'rgba(239,68,68,0.08)', 
                        color: req.status === 'ALLOWED' ? 'var(--action-primary)' : 'var(--danger)', 
                        fontSize: 14 
                      }}>
                        <Icon icon={req.status === 'ALLOWED' ? faUserPlus : faLock} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="var(--text-main)" sx={{ fontSize: 13 }}>
                          {req.name}
                        </Typography>
                        <Typography variant="caption" color="var(--text-secondary)" sx={{ fontSize: 10, letterSpacing: 0.5 }}>
                          AGENT: {req.agent}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ 
                      px: 1.2, py: 0.4, 
                      borderRadius: 'var(--radius-pill)', 
                      fontSize: 10, fontWeight: 700, 
                      background: req.status === 'ALLOWED' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', 
                      color: req.status === 'ALLOWED' ? 'var(--success)' : 'var(--danger)' 
                    }}>
                      {req.status}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="var(--text-secondary)" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                    {req.desc}
                  </Typography>
                </Box>
              ))}
            </Card>
          </Box>
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { boxShadow: '0 8px 32px rgba(33,52,72,0.12)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' } }}>
        <MenuItem onClick={handleInfoClick} sx={{ color: 'var(--action-primary)', fontWeight: 500 }}>Info</MenuItem>
        <MenuItem onClick={handleEditClick} sx={{ color: 'var(--action-warning-hover)', fontWeight: 500 }}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'var(--action-danger)', fontWeight: 500 }}>Delete</MenuItem>
      </Menu>

      <SupervisorFormModal open={addModalOpen} onClose={() => setAddModalOpen(false)} supervisor={null} onSubmit={handleAddSubmit} loading={isAdding} />
      <SupervisorDetailsModal open={detailsModalOpen} onClose={() => { setDetailsModalOpen(false); setSelectedRow(null); }} supervisor={selectedRow} />
      <SupervisorFormModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedRow(null); }}
        supervisor={selectedRow ? {
          id: selectedRow.id,
          name: selectedRow.name,
          type: selectedRow.type === 'Voice' ? 'voice' : 'chat',
          email: selectedRow.email,
        } : null}
        onSubmit={handleEditSubmit}
        loading={isSavingEdit}
      />
      <DeleteConfirmModal open={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setSelectedRow(null); }} onConfirm={handleDeleteConfirm} itemName={selectedRow?.name || ''} isDeleting={isDeleting} />
      <ActiveSupervisorModal open={activeSupModalOpen} onClose={() => { setActiveSupModalOpen(false); setActiveSup(null); }} supervisor={activeSup} />
    </Box>
  );
};

export default AdminDashboard;
