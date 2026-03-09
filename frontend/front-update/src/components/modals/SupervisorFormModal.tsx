// src/components/modals/SupervisorFormModal.tsx
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { motion, AnimatePresence } from 'framer-motion';

interface SupervisorFormModalProps {
  open: boolean;
  onClose: () => void;
  supervisor?: {
    id?: number;
    name: string;
    type: 'voice' | 'chat';
    email: string;
  } | null;
  onSubmit: (data: { name: string; type: 'voice' | 'chat'; email: string; password?: string }) => void;
}

const SupervisorFormModal: React.FC<SupervisorFormModalProps> = ({
  open,
  onClose,
  supervisor = null,
  onSubmit,
}) => {
  const isEdit = supervisor !== null;

  const [formData, setFormData] = React.useState({
    name: supervisor?.name || '',
    type: (supervisor?.type || 'voice') as 'voice' | 'chat',
    email: supervisor?.email || '',
    password: '',
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        name: supervisor?.name || '',
        type: (supervisor?.type || 'voice') as 'voice' | 'chat',
        email: supervisor?.email || '',
        password: '',
      });
    }
  }, [open, supervisor]);

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSelectChange = (event: SelectChangeEvent<'voice' | 'chat'>) => {
    setFormData({ ...formData, type: event.target.value as 'voice' | 'chat' });
  };

  const handleSubmit = () => {
    onSubmit({
      name: formData.name,
      type: formData.type,
      email: formData.email,
      password: isEdit ? undefined : formData.password,
    });
    onClose();
  };

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
                maxWidth: 500,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                outline: 'none',
              }}
            >
              <Box sx={{
                bgcolor: 'var(--modal-bg)',
                border: '1px solid var(--modal-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--modal-shadow)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out',
              }}>
                {/* Scrollable Body */}
                <Box className="modal-scroll" sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} gutterBottom color="var(--modal-text)">
                    {isEdit ? 'Edit Supervisor' : 'Add New Supervisor'}
                  </Typography>

                  <Stack spacing={3} sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Supervisor Name"
                      variant="outlined"
                      value={formData.name}
                      onChange={handleChange('name')}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'var(--modal-text)',
                          '& fieldset': { borderColor: 'var(--modal-border)' },
                          '&:hover fieldset': { borderColor: 'var(--modal-text-muted)' },
                        },
                        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
                      }}
                    />

                    <FormControl fullWidth>
                      <InputLabel sx={{ color: 'var(--modal-text-secondary)' }}>Supervisor Type</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={handleSelectChange}
                        label="Supervisor Type"
                        sx={{
                          color: 'var(--modal-text)',
                          '& fieldset': { borderColor: 'var(--modal-border)' },
                          '&:hover fieldset': { borderColor: 'var(--modal-text-muted)' },
                          '& .MuiSvgIcon-root': { color: 'var(--modal-text-muted)' },
                        }}
                      >
                        <MenuItem value="voice">Voice Agent</MenuItem>
                        <MenuItem value="chat">Chat Agent</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      variant="outlined"
                      value={formData.email}
                      onChange={handleChange('email')}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'var(--modal-text)',
                          '& fieldset': { borderColor: 'var(--modal-border)' },
                          '&:hover fieldset': { borderColor: 'var(--modal-text-muted)' },
                        },
                        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
                      }}
                    />

                    {!isEdit && (
                      <TextField
                        fullWidth
                        label="Temporary Password"
                        type="password"
                        variant="outlined"
                        value={formData.password}
                        onChange={handleChange('password')}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'var(--modal-text)',
                            '& fieldset': { borderColor: 'var(--modal-border)' },
                            '&:hover fieldset': { borderColor: 'var(--modal-text-muted)' },
                          },
                          '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
                        }}
                      />
                    )}
                  </Stack>
                </Box>

                {/* Sticky Footer */}
                <Box sx={{
                  p: 3,
                  borderTop: '1px solid var(--modal-border)',
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}>
                  <Button 
                    variant="contained" 
                    onClick={onClose}
                    sx={{
                      bgcolor: 'var(--action-danger)',
                      color: '#ffffff',
                      '&:hover': { bgcolor: 'var(--action-danger-hover)' },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSubmit}
                    sx={{
                      bgcolor: 'var(--action-primary)',
                      color: '#ffffff',
                      '&:hover': { bgcolor: 'var(--action-primary-hover)' },
                    }}
                  >
                    {isEdit ? 'Save Changes' : 'Add Supervisor'}
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

export default SupervisorFormModal;
