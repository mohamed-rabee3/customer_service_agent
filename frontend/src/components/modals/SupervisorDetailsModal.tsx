// src/components/modals/SupervisorDetailsModal.tsx
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Button,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon';
import { faUser, faPhone, faComments, faTimes, faEnvelope, faUsers, faIdBadge } from '@fortawesome/free-solid-svg-icons';

interface SupervisorData {
  id: string | number;
  rank: number;
  name: string;
  type: 'Voice' | 'Chat';
  totalCalls: number;
  performance: number;
  avgTime: string;
  email?: string;
  phone?: string;
  status?: 'Active' | 'Inactive';
  agentsCount?: number;
  employeeId?: string;
  profilePicture?: string;
}

interface SupervisorDetailsModalProps {
  open: boolean;
  onClose: () => void;
  supervisor: SupervisorData | null;
}

const SupervisorDetailsModal: React.FC<SupervisorDetailsModalProps> = ({
  open,
  onClose,
  supervisor,
}) => {
  if (!supervisor) return null;

  const email = supervisor.email || `${supervisor.name.toLowerCase().replace(' ', '.')}@company.com`;
  const phone = supervisor.phone || '+971 50 123 4567';
  const status = supervisor.status || 'Active';
  const agentsCount = supervisor.agentsCount || Math.floor(Math.random() * 10) + 5;
  const employeeId = supervisor.employeeId || `EMP-${String(supervisor.id).padStart(4, '0')}`;

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
                maxWidth: 600,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                outline: 'none',
              }}
            >
              <Box sx={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                bgcolor: 'var(--modal-bg)',
                border: '1px solid var(--modal-border)',
                boxShadow: 'var(--modal-shadow)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out',
              }}>
                {/* Header with close button */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 3,
                  background: 'linear-gradient(135deg, var(--primary-hex), var(--accent-hex))',
                  flexShrink: 0,
                }}>
                  <Typography variant="h5" fontWeight={700} color="white">
                    Supervisor Details
                  </Typography>
                  <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <Icon icon={faTimes} />
                  </IconButton>
                </Box>

                {/* Profile Header */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 3, 
                  p: 3,
                  bgcolor: 'var(--modal-surface)',
                  borderBottom: '1px solid var(--modal-border)',
                  flexShrink: 0,
                  transition: 'background-color 0.3s ease-in-out',
                }}>
                  <Avatar
                    src={supervisor.profilePicture}
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'var(--primary-hex)',
                      border: '3px solid var(--accent-hex)',
                    }}
                  >
                    <Icon icon={faUser} size="2x" color="#fff" />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={700} color="var(--modal-text)">
                      {supervisor.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Icon icon={faIdBadge} color="var(--modal-text-muted)" />
                      <Typography variant="body2" color="var(--modal-text-secondary)">
                        {employeeId}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Chip
                        label={status}
                        size="small"
                        sx={{
                          bgcolor: status === 'Active' ? 'var(--status-active-bg)' : 'var(--status-inactive-bg)',
                          color: status === 'Active' ? 'var(--status-active)' : 'var(--status-inactive)',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={`Rank #${supervisor.rank}`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'var(--modal-border)', color: 'var(--modal-text-secondary)' }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Scrollable Content */}
                <Box className="modal-scroll" sx={{
                  p: 3,
                  overflowY: 'auto',
                  flex: 1,
                  bgcolor: 'var(--modal-bg)',
                  transition: 'background-color 0.3s ease-in-out',
                }}>
                  {/* Role Details */}
                  <Typography variant="subtitle2" color="var(--modal-text-muted)" sx={{ mb: 1 }}>
                    ROLE DETAILS
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    bgcolor: 'var(--modal-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--modal-border)',
                    mb: 3,
                    transition: 'background-color 0.3s ease-in-out',
                  }}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 'var(--radius-md)', 
                      bgcolor: 'var(--primary-hex)',
                    }}>
                      <Icon 
                        icon={supervisor.type === 'Voice' ? faPhone : faComments} 
                        color="#fff" 
                        size="lg"
                      />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={600} color="var(--modal-text)">
                        {supervisor.type} Supervisor
                      </Typography>
                      <Typography variant="body2" color="var(--modal-text-secondary)">
                        {supervisor.type === 'Voice' ? 'Manages voice call operations' : 'Manages chat support operations'}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'var(--modal-border)' }} />

                  {/* Contact Information */}
                  <Typography variant="subtitle2" color="var(--modal-text-muted)" sx={{ mb: 1 }}>
                    CONTACT INFORMATION
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Icon icon={faEnvelope} color="var(--modal-text-muted)" />
                      <Typography color="var(--modal-text)">{email}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Icon icon={faPhone} color="var(--modal-text-muted)" />
                      <Typography color="var(--modal-text)">{phone}</Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'var(--modal-border)' }} />

                  {/* Team Overview */}
                  <Typography variant="subtitle2" color="var(--modal-text-muted)" sx={{ mb: 1 }}>
                    TEAM OVERVIEW
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    bgcolor: 'var(--modal-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--modal-border)',
                    mb: 3,
                    transition: 'background-color 0.3s ease-in-out',
                  }}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 'var(--radius-md)', 
                      bgcolor: 'var(--accent-hex)',
                    }}>
                      <Icon icon={faUsers} color="#fff" size="lg" />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={700} color="var(--modal-text)">
                        {agentsCount}
                      </Typography>
                      <Typography variant="body2" color="var(--modal-text-secondary)">
                        Active Agents Under Management
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'var(--modal-border)' }} />

                  {/* Performance Stats */}
                  <Typography variant="subtitle2" color="var(--modal-text-muted)" sx={{ mb: 1 }}>
                    PERFORMANCE METRICS
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: 2,
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'var(--modal-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--modal-border)',
                      transition: 'background-color 0.3s ease-in-out',
                    }}>
                      <Typography variant="h5" fontWeight={700} color="var(--modal-text)">
                        {supervisor.totalCalls}
                      </Typography>
                      <Typography variant="caption" color="var(--modal-text-muted)">
                        Monthly Calls
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'var(--modal-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--modal-border)',
                      transition: 'background-color 0.3s ease-in-out',
                    }}>
                      <Typography variant="h5" fontWeight={700} color="var(--status-performance)">
                        {supervisor.performance}%
                      </Typography>
                      <Typography variant="caption" color="var(--modal-text-muted)">
                        Performance
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'var(--modal-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--modal-border)',
                      transition: 'background-color 0.3s ease-in-out',
                    }}>
                      <Typography variant="h5" fontWeight={700} color="var(--accent-hex)">
                        {supervisor.avgTime}
                      </Typography>
                      <Typography variant="caption" color="var(--modal-text-muted)">
                        Avg Handle Time
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Sticky Footer */}
                <Box sx={{
                  p: 2.5,
                  borderTop: '1px solid var(--modal-border)',
                  bgcolor: 'var(--modal-bg)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                  transition: 'background-color 0.3s ease-in-out',
                }}>
                  <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                      bgcolor: 'var(--modal-surface)',
                      color: 'var(--modal-text)',
                      border: '1px solid var(--modal-border)',
                      '&:hover': { bgcolor: 'var(--modal-text-muted)', color: '#fff' },
                    }}
                  >
                    Close
                  </Button>
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default SupervisorDetailsModal;
