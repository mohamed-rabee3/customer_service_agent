// src/pages/admin/AdminArchive.tsx
import React, { useState, useEffect } from 'react';
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
  TablePagination,
} from '@mui/material';
import Icon from '../../components/Icon';
import SupervisorFormModal from '../../components/modals/SupervisorFormModal';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import { X, Clock, Phone, CheckCircle, AlertTriangle } from 'lucide-react';
import { supervisorsAPI } from '../../services/supervisorsService';
import { analyticsAPI } from '../../services/analyticsService';

import { toast } from 'react-toastify';
import {
  faInfoCircle,
  faEdit,
  faTrash,
  faSearch,
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

function formatAvgHandleSeconds(sec: number | undefined | null): string {
  if (sec == null || Number.isNaN(Number(sec)) || sec <= 0) return '—';
  const s = Math.floor(Number(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

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

  /* Animate key to retrigger spring on filter change */
  const [animKey, setAnimKey] = useState(0);

  /* Pagination state */
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch supervisors from API
  useEffect(() => {
    const handler = setTimeout(() => {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const res = await supervisorsAPI.getAll(page + 1, rowsPerPage, typeFilter, searchTerm);
          const data = res.data;
          const sups = data.supervisors || data.items || data || [];
          const rawSups = Array.isArray(sups) ? sups : [];
          setTotalCount(data.total ?? rawSups.length);
          
          const mappedData: Supervisor[] = [];
          let adminOverviewBreakdown: any[] = [];
          try {
            const statRes = await analyticsAPI.getAdminOverview('all_time');
            adminOverviewBreakdown = statRes.data.supervisors_breakdown || [];
          } catch (e) {
             console.error("Failed to load admin overview analytics", e);
          }

          for (const s of rawSups) {
            let interventions = 0;
            let performance = 0;
            let avgTime = '—';
            
            const sBreakdown = adminOverviewBreakdown.find((b: any) => b.supervisor_id === s.id);
            if (sBreakdown) {
                interventions = sBreakdown.total_interactions ?? 0;
                performance = Math.round(sBreakdown.performance_score ?? 0);
                avgTime = formatAvgHandleSeconds(sBreakdown.avg_handle_time);
            }
            
            mappedData.push({
              id: s.id,
              name: s.name || s.email || 'Supervisor',
              email: s.email || '',
              type: s.supervisor_type === 'voice' ? 'Voice' : 'Chat',
              status: 'Active',
              interventions: interventions,
              performance: performance,
              avgTime,
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
    }, 300);

    return () => clearTimeout(handler);
  }, [page, rowsPerPage, typeFilter, searchTerm]);

  const filteredData = archiveData;

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
  const handleEditSubmit = async (data: { name: string; type: 'voice' | 'chat'; email: string }) => {
    if (!selectedSupervisor) return;
    try {
      await supervisorsAPI.update(selectedSupervisor.id, {
        name: data.name,
        email: data.email,
        supervisor_type: data.type === 'voice' ? 'voice' : 'chat',
      });
      setArchiveData(prev => prev.map(item =>
        item.id === selectedSupervisor.id
          ? { ...item, name: data.name, email: data.email, type: data.type === 'voice' ? 'Voice' : 'Chat' }
          : item
      ));
    } catch (err) {
      console.error('Failed to update supervisor', err);
    }
    setEditModalOpen(false);
    setSelectedSupervisor(null);
  };

  const handleDeleteClick = (sup: Supervisor) => { setSelectedSupervisor(sup); setDeleteModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!selectedSupervisor) return;
    try {
      await supervisorsAPI.delete(selectedSupervisor.id);
      setArchiveData(prev => prev.filter(item => item.id !== selectedSupervisor.id));
      toast.success('Supervisor deleted successfully!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        style: { borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600 }
      });
    } catch (err) {
      console.error('Failed to delete supervisor', err);
      toast.error('Failed to delete supervisor. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        style: { borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600 }
      });
    }
    setDeleteModalOpen(false);
    setSelectedSupervisor(null);
  };

  const openDrawer = (sup: Supervisor) => {
    setDrawerSupervisor(sup);
    setDrawerOpen(true);
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
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 20, 50]}
          sx={{
            color: 'var(--text-main)',
            borderTop: '1px solid var(--border)',
            '& .MuiTablePagination-actions': { color: 'var(--text-main)' },
            '& .MuiTablePagination-select': { color: 'var(--text-main)' },
          }}
        />
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
                <Typography variant="caption" color="var(--text-muted)" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>ID: {drawerSupervisor.id}</Typography>
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

              <Typography variant="body2" color="var(--text-secondary)" sx={{ lineHeight: 1.65 }}>
                Per-call transcripts, timelines, and recordings are shown in the supervisor archive and monitoring views.
              </Typography>
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
