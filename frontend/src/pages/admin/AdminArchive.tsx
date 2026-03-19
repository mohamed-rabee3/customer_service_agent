// src/pages/admin/AdminArchive.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Stack,
  Button,
  Drawer,
  Divider,
  Chip,
} from '@mui/material';
import Icon from '../../components/Icon';
import SupervisorFormModal from '../../components/modals/SupervisorFormModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import { X, Clock, Phone, User, CheckCircle, AlertTriangle, MessageSquare, Play, Pause } from 'lucide-react';
import { supervisorsAPI } from '../../services/supervisorsService';

import {
  faInfoCircle,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

interface Supervisor {
  id: string;
  name: string;
  email: string;
  type: 'Voice' | 'Chat';
  status: 'Active' | 'Inactive';
  interventions: number;
  performance: number;
  avgTime: string;
  failed: number;
}

/* Timeline mock data for drawer */
const getTimelineEvents = (name: string) => [
  { time: '14:32:00', label: 'Call Started', type: 'start' as const, detail: `${name} connected with customer` },
  { time: '14:33:15', label: 'Issue Identified', type: 'info' as const, detail: 'Customer reported billing discrepancy' },
  { time: '14:35:40', label: 'Intervention', type: 'warning' as const, detail: 'Supervisor injected coaching message' },
  { time: '14:36:50', label: 'Resolution Applied', type: 'success' as const, detail: 'Credit applied to customer account' },
  { time: '14:37:02', label: 'Call Ended', type: 'end' as const, detail: 'Customer satisfaction confirmed' },
];

/* Mini Waveform Component */
const MiniWaveform: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const bars = 40;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', height: 48, px: 1 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 12 + Math.sin(i * 0.6) * 18 + Math.random() * 10;
        return (
          <Box
            key={i}
            sx={{
              width: 3,
              height: `${h}px`,
              borderRadius: 2,
              bgcolor: isPlaying ? 'var(--accent-hex)' : 'var(--border)',
              transition: 'background-color 0.3s ease',
              animation: isPlaying ? `waveAnim 0.8s ease-in-out ${i * 0.03}s infinite alternate` : 'none',
              '@keyframes waveAnim': {
                '0%': { transform: 'scaleY(1)' },
                '100%': { transform: `scaleY(${0.4 + Math.random() * 0.6})` },
              },
            }}
          />
        );
      })}
    </Box>
  );
};

/* Spring row animation keyframes injected via sx */
const springRowSx = (idx: number) => ({
  opacity: 0,
  animation: `springSlideIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.06}s forwards`,
  '@keyframes springSlideIn': {
    '0%': { opacity: 0, transform: 'translateY(20px) scale(0.97)' },
    '60%': { opacity: 1, transform: 'translateY(-4px) scale(1.005)' },
    '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
  },
});

const AdminArchive: React.FC = () => {
  const [archiveData, setArchiveData] = useState<Supervisor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

  /* Drawer state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSupervisor, setDrawerSupervisor] = useState<Supervisor | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /* Animate key to retrigger spring on filter change */
  const [animKey, setAnimKey] = useState(0);

  // Fetch supervisors from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await supervisorsAPI.getAll();
        const sups = res.data.supervisors || res.data.items || res.data || [];
        const rawSups = Array.isArray(sups) ? sups : [];
        
        const mappedData: Supervisor[] = [];
        for (const s of rawSups) {
          let interventions = 0;
          let performance = 0;
          try {
            // Lazy load analytics inline for realism without massive backend rewrite
            const statRes = await analyticsAPI.getBySupervisor(s.id);
            if (statRes.data) {
                interventions = statRes.data.total_interventions || 0;
                performance = Math.round(statRes.data.avg_performance || 0);
            }
          } catch (e) {
             console.error("Failed to load analytics for supervisor", s.id);
          }
          
          mappedData.push({
            id: s.id,
            name: s.email || 'Supervisor',
            email: s.email || '',
            type: s.supervisor_type === 'voice' ? 'Voice' : 'Chat',
            status: 'Active',
            interventions: interventions,
            performance: performance,
            avgTime: '4:21', // Still mock as backend doesn't aggregate avg processing time easily yet
            failed: 0,
          });
        }
        
        setArchiveData(mappedData);
      } catch (err) {
        console.error('Failed to fetch supervisors', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = archiveData.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || row.type.toLowerCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  /* Retrigger spring animation on filter changes */
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [searchTerm, typeFilter]);


  const handleAddSubmit = async (data: { name: string; type: 'voice' | 'chat'; email: string }) => {
    try {
      const res = await supervisorsAPI.create({ email: data.email, password: 'TempPass123!', supervisor_type: data.type });
      const newSup = res.data;
      const newSupervisor: Supervisor = {
        id: newSup.id, name: data.name || data.email, email: data.email,
        type: data.type === 'voice' ? 'Voice' : 'Chat',
        status: 'Active', interventions: 0, performance: 0, avgTime: '0:00', failed: 0,
      };
      setArchiveData(prev => [...prev, newSupervisor]);
    } catch (err) {
      console.error('Failed to create supervisor', err);
    }
    setAddModalOpen(false);
  };

  const handleEditClick = (sup: Supervisor) => { setSelectedSupervisor(sup); setEditModalOpen(true); };
  const handleEditSubmit = (data: { name: string; type: 'voice' | 'chat'; email: string }) => {
    if (!selectedSupervisor) return;
    setArchiveData(prev => prev.map(item =>
      item.id === selectedSupervisor.id
        ? { ...item, name: data.name, email: data.email, type: data.type === 'voice' ? 'Voice' : 'Chat' }
        : item
    ));
    setEditModalOpen(false);
    setSelectedSupervisor(null);
  };

  const handleDeleteClick = (sup: Supervisor) => { setSelectedSupervisor(sup); setDeleteModalOpen(true); };
  const handleDeleteConfirm = () => {
    if (!selectedSupervisor) return;
    setArchiveData(prev => prev.filter(item => item.id !== selectedSupervisor.id));
    setDeleteModalOpen(false);
    setSelectedSupervisor(null);
  };

  const openDrawer = (sup: Supervisor) => {
    setDrawerSupervisor(sup);
    setDrawerOpen(true);
    setIsPlaying(false);
  };

  const timelineColor = (type: string) => {
    switch (type) {
      case 'start': return 'var(--accent-hex)';
      case 'success': return 'var(--success)';
      case 'warning': return 'var(--warning)';
      case 'end': return 'var(--text-muted)';
      default: return 'var(--info)';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, direction: 'ltr', bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Typography variant="h4" fontWeight={900} color="var(--text-main)">Admin Archive</Typography>
        <Button
          variant="contained"
          startIcon={<Icon icon={faPlus} />}
          onClick={() => setAddModalOpen(true)}
          sx={{ bgcolor: 'var(--accent)', color: '#fff', px: 3, py: 1.5, borderRadius: 'var(--radius-pill)', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'var(--accent-hover)' } }}
        >
          Add Supervisor
        </Button>
      </Box>

      {/* Filter Bar */}
      <Paper className="filter-bar-container" sx={{ p: 3, mb: 4, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', bgcolor: 'var(--surface)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box sx={{ position: 'relative', flex: 1, width: '100%' }}>
            <TextField
              className="filter-input"
              fullWidth
              placeholder="Search by supervisor name..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-pill)', pr: 2, pl: 5, height: 56, bgcolor: 'var(--input-bg)' }, '& .MuiOutlinedInput-input': { py: 2, color: 'var(--text-main)' } }}
            />
            <Icon icon={faSearch} size="lg" color="var(--text-secondary)" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <FormControl className="filter-select" sx={{ width: { xs: '100%', sm: 200 } }}>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as string)}
                displayEmpty
                sx={{ borderRadius: 'var(--radius-pill)', height: 56, bgcolor: 'var(--input-bg)', '& .MuiOutlinedInput-input': { py: 2, color: 'var(--text-main)' } }}
                MenuProps={{ PaperProps: { sx: { bgcolor: 'var(--surface)', color: 'var(--text-main)', boxShadow: 'var(--shadow-lg)', zIndex: 9999, '& .MuiMenuItem-root': { color: 'var(--text-main)', '&:hover': { bgcolor: 'rgba(148,180,193,0.2)' }, '&.Mui-selected': { bgcolor: 'rgba(148,180,193,0.3)' } } } } }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="voice">Voice</MenuItem>
                <MenuItem value="chat">Chat</MenuItem>
              </Select>
            </FormControl>
            <Button className="filter-button" variant="outlined" startIcon={<Icon icon={faFilter} />} sx={{ height: 56, px: 4, borderRadius: 'var(--radius-pill)', textTransform: 'none', fontWeight: 600, width: { xs: '100%', sm: 'auto' }, borderColor: 'var(--border)', color: 'var(--text-main)', bgcolor: 'var(--input-bg)', '&:hover': { borderColor: 'var(--primary)', bgcolor: 'rgba(33,52,72,0.05)' } }}>
              Filter
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Archive Table with Spring Rows */}
      <TableContainer component={Paper} sx={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'var(--bg)' }}>
              <TableCell>Supervisor Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total Interventions</TableCell>
              <TableCell>Performance</TableCell>
              <TableCell align="center">Options</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row, idx) => (
              <TableRow
                key={`${animKey}-${row.id}`}
                hover
                onClick={() => openDrawer(row)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(84,119,146,0.08)' },
                  ...springRowSx(idx),
                }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'inline-block', px: 2, py: 0.5, borderRadius: 'var(--radius-pill)', bgcolor: row.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: row.status === 'Active' ? '#22c55e' : 'var(--danger)', fontWeight: 600, fontSize: '0.875rem' }}>
                    {row.status}
                  </Box>
                </TableCell>
                <TableCell>{row.interventions}</TableCell>
                <TableCell sx={{ color: 'var(--accent)', fontWeight: 600 }}>{row.performance}%</TableCell>
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                  <IconButton color="secondary" title="Quick View" onClick={(e) => { e.stopPropagation(); openDrawer(row); }}>
                    <Icon icon={faInfoCircle} />
                  </IconButton>
                  <IconButton sx={{ color: 'var(--accent)' }} title="Edit" onClick={(e) => { e.stopPropagation(); handleEditClick(row); }}>
                    <Icon icon={faEdit} />
                  </IconButton>
                  <IconButton color="error" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}>
                    <Icon icon={faTrash} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'var(--text-secondary)' }}>No supervisors found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ═══ Slide-over Drawer (Quick View Panel) ═══ */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 460 },
            bgcolor: 'var(--bg)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-8px 0 40px rgba(33,52,72,0.12)',
            p: 0,
          },
        }}
      >
        {drawerSupervisor && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <Typography variant="h6" fontWeight={700} color="var(--text-main)">Quick View</Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">
                <X size={20} />
              </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {/* Profile Summary */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={800} color="var(--text-main)" sx={{ mb: 0.5 }}>{drawerSupervisor.name}</Typography>
                <Typography variant="body2" color="var(--text-secondary)">{drawerSupervisor.email}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Chip label={drawerSupervisor.type} size="small" sx={{ bgcolor: 'rgba(84,119,146,0.1)', color: 'var(--accent-hex)', fontWeight: 600 }} />
                  <Chip label={drawerSupervisor.status} size="small" sx={{ bgcolor: drawerSupervisor.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: drawerSupervisor.status === 'Active' ? '#22c55e' : 'var(--danger)', fontWeight: 600 }} />
                </Stack>
              </Box>

              {/* High-Contrast Stat Labels */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
                {[
                  { icon: <CheckCircle size={18} />, label: 'Performance', value: `${drawerSupervisor.performance}%`, color: 'var(--accent-hex)' },
                  { icon: <Clock size={18} />, label: 'Avg Time', value: drawerSupervisor.avgTime, color: 'var(--text-main)' },
                  { icon: <Phone size={18} />, label: 'Interventions', value: String(drawerSupervisor.interventions), color: 'var(--text-main)' },
                  { icon: <AlertTriangle size={18} />, label: 'Failed', value: String(drawerSupervisor.failed), color: 'var(--danger)' },
                ].map((stat) => (
                  <Box key={stat.label} sx={{ p: 2, borderRadius: 'var(--radius-md)', bgcolor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: 'var(--text-secondary)' }}>
                      {stat.icon}
                      <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: stat.color }}>{stat.value}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Timeline View */}
              <Typography variant="subtitle1" fontWeight={700} color="var(--text-main)" sx={{ mb: 2 }}>Call Timeline</Typography>
              <Box sx={{ position: 'relative', pl: 3 }}>
                {/* Vertical line */}
                <Box sx={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 2, bgcolor: 'var(--border)', borderRadius: 2 }} />
                {getTimelineEvents(drawerSupervisor.name).map((ev, i) => (
                  <Box key={i} sx={{ position: 'relative', mb: 2.5 }}>
                    {/* Dot */}
                    <Box sx={{ position: 'absolute', left: -19, top: 4, width: 12, height: 12, borderRadius: '50%', bgcolor: timelineColor(ev.type), border: '2px solid var(--bg)', boxShadow: `0 0 0 3px ${timelineColor(ev.type)}33` }} />
                    <Typography variant="caption" color="var(--text-muted)" fontWeight={600}>{ev.time}</Typography>
                    <Typography variant="body2" fontWeight={700} color="var(--text-main)">{ev.label}</Typography>
                    <Typography variant="body2" color="var(--text-secondary)" sx={{ fontSize: '0.8rem' }}>{ev.detail}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Mini Waveform Audio Player */}
              <Typography variant="subtitle1" fontWeight={700} color="var(--text-main)" sx={{ mb: 2 }}>Call Recording</Typography>
              <Box sx={{ p: 2, borderRadius: 'var(--radius-md)', bgcolor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton
                    onClick={() => setIsPlaying(!isPlaying)}
                    sx={{ bgcolor: 'var(--accent-hex)', color: '#fff', width: 40, height: 40, '&:hover': { bgcolor: 'var(--primary-hex)' } }}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </IconButton>
                  <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <MiniWaveform isPlaying={isPlaying} />
                  </Box>
                  <Typography variant="caption" color="var(--text-muted)" fontWeight={600}>{drawerSupervisor.avgTime}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Modals */}
      <SupervisorFormModal open={addModalOpen} onClose={() => setAddModalOpen(false)} supervisor={null} onSubmit={handleAddSubmit} />
      <SupervisorFormModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedSupervisor(null); }}
        supervisor={selectedSupervisor ? { id: selectedSupervisor.id, name: selectedSupervisor.name, type: selectedSupervisor.type.toLowerCase() as 'voice' | 'chat', email: selectedSupervisor.email } : null}
        onSubmit={handleEditSubmit}
      />
      <DeleteConfirmModal open={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setSelectedSupervisor(null); }} onConfirm={handleDeleteConfirm} itemName={selectedSupervisor?.name || ''} />
    </Box>
  );
};

export default AdminArchive;
