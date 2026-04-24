import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { X, Plus, Trash2, Edit } from 'lucide-react';
import { supervisorsAPI } from '../../services/supervisorsService';
import { toast } from 'react-toastify';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';

interface Supervisor {
  id: string;
  email: string;
  role: string;
  supervisor_type: 'voice' | 'chat';
  created_at?: string;
}

const SupervisorManagement: React.FC = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  
  const [formData, setFormData] = useState({ email: '', password: '', supervisor_type: 'voice' as 'voice' | 'chat' });

  const fetchSupervisors = async () => {
    try {
      const res = await supervisorsAPI.getAll();
      const data = res.data;
      setSupervisors(data?.supervisors || data?.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      toast.error('Failed to load supervisors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const resetForm = () => setFormData({ email: '', password: '', supervisor_type: 'voice' });

  const handleAddSubmit = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.warn('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await supervisorsAPI.create({
        email: formData.email,
        password: formData.password,
        supervisor_type: formData.supervisor_type,
      });
      toast.success('Supervisor created successfully');
      setAddModalOpen(false);
      resetForm();
      fetchSupervisors();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create supervisor');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedSupervisor) return;
    setSaving(true);
    try {
      await supervisorsAPI.update(selectedSupervisor.id, {
        supervisor_type: formData.supervisor_type,
      });
      toast.success('Supervisor updated successfully');
      setEditModalOpen(false);
      setSelectedSupervisor(null);
      resetForm();
      fetchSupervisors();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update supervisor');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupervisor) return;
    setSaving(true);
    try {
      await supervisorsAPI.delete(selectedSupervisor.id);
      toast.success('Supervisor deleted successfully');
      setDeleteModalOpen(false);
      setSelectedSupervisor(null);
      fetchSupervisors();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete supervisor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ direction: 'ltr', minHeight: '100vh', p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>
            Supervisors
          </Typography>
          <Typography variant="body1" color="var(--text-secondary)">
            Manage platform supervisors and their roles
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => { resetForm(); setAddModalOpen(true); }}
          sx={{
            borderRadius: 'var(--radius-md)',
            px: 3, py: 1,
            fontWeight: 700, fontSize: 14, textTransform: 'none',
            background: 'var(--primary-hex)',
            color: '#fff',
            display: 'flex', alignItems: 'center', gap: 1,
            '&:hover': { background: 'var(--primary-hex)', opacity: 0.9 }
          }}
        >
          <Plus size={18} /> Add Supervisor
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--text-main)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 'var(--radius-lg)', background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)', boxShadow: '0 4px 16px rgba(33,52,72,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'rgba(84,119,146,0.04)' }}>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {supervisors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'var(--text-muted)' }}>
                    No supervisors found.
                  </TableCell>
                </TableRow>
              ) : (
                supervisors.map((sup) => (
                  <TableRow key={sup.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, borderColor: 'var(--border)' }}>
                    <TableCell sx={{ color: 'var(--text-main)', fontWeight: 500 }}>{sup.email || (sup as any).UserEmail || sup.id}</TableCell>
                    <TableCell>
                      <Chip label={sup.role || 'Supervisor'} size="small" sx={{ borderRadius: 'var(--radius-sm)', background: 'var(--primary-hex)', color: '#fff', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }} />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={sup.supervisor_type} 
                        size="small" 
                        sx={{ 
                          borderRadius: 'var(--radius-sm)', 
                          background: sup.supervisor_type === 'voice' ? 'var(--blue)' : 'var(--success)', 
                          color: '#fff', 
                          fontWeight: 600, 
                          fontSize: 11, 
                          textTransform: 'uppercase' 
                        }} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => {
                        setSelectedSupervisor(sup);
                        setFormData({ ...formData, supervisor_type: sup.supervisor_type });
                        setEditModalOpen(true);
                      }} sx={{ color: 'var(--text-secondary)', mr: 1 }}>
                        <Edit size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => {
                        setSelectedSupervisor(sup);
                        setDeleteModalOpen(true);
                      }} sx={{ color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Modal */}
      <Dialog open={addModalOpen} onClose={() => !saving && setAddModalOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
          Add New Supervisor
          <IconButton onClick={() => setAddModalOpen(false)} size="small" disabled={saving}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          <TextField fullWidth label="Email Address" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' } }} />
          <TextField fullWidth label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' } }} />
          <FormControl fullWidth>
            <InputLabel>Supervisor Type</InputLabel>
            <Select value={formData.supervisor_type} label="Supervisor Type" onChange={e => setFormData({ ...formData, supervisor_type: e.target.value as any })}
              sx={{ borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' }}>
              <MenuItem value="voice">Voice Agent Supervisor</MenuItem>
              <MenuItem value="chat">Chat Agent Supervisor</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddModalOpen(false)} disabled={saving} sx={{ borderRadius: 'var(--radius-md)', fontWeight: 600, textTransform: 'none', color: 'var(--text-secondary)' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubmit} disabled={saving}
            sx={{ borderRadius: 'var(--radius-md)', fontWeight: 700, textTransform: 'none', background: 'var(--primary-hex)', color: '#fff', '&:hover': { background: 'var(--primary-hex)' }, '&:disabled': { opacity: 0.7 } }}>
            {saving ? 'Saving...' : 'Add Supervisor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => !saving && setEditModalOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
          Edit Supervisor Type
          <IconButton onClick={() => setEditModalOpen(false)} size="small" disabled={saving}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: -1 }}>Editing {selectedSupervisor?.email || selectedSupervisor?.id}</Typography>
          <FormControl fullWidth>
            <InputLabel>Supervisor Type</InputLabel>
            <Select value={formData.supervisor_type} label="Supervisor Type" onChange={e => setFormData({ ...formData, supervisor_type: e.target.value as any })}
              sx={{ borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' }}>
              <MenuItem value="voice">Voice Agent Supervisor</MenuItem>
              <MenuItem value="chat">Chat Agent Supervisor</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditModalOpen(false)} disabled={saving} sx={{ borderRadius: 'var(--radius-md)', fontWeight: 600, textTransform: 'none', color: 'var(--text-secondary)' }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={saving}
            sx={{ borderRadius: 'var(--radius-md)', fontWeight: 700, textTransform: 'none', background: 'var(--primary-hex)', color: '#fff', '&:hover': { background: 'var(--primary-hex)' }, '&:disabled': { opacity: 0.7 } }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          itemName={selectedSupervisor?.email || selectedSupervisor?.id || 'Supervisor'}
          isDeleting={saving}
      />
    </Box>
  );
};

export default SupervisorManagement;
