// src/components/modals/SupervisorFormModal.tsx
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select'; // الإمبورت المهم ده

interface SupervisorFormModalProps {
  open: boolean;
  onClose: () => void;
  supervisor?: {
    id?: number;
    name: string;
    type: 'voice' | 'chat';
    email: string;
  } | null; // null = add mode, object = edit mode
  onSubmit: (data: { name: string; type: 'voice' | 'chat'; email: string; password?: string }) => void;
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 },
  bgcolor: 'background.paper',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  p: 4,
};

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

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  // التعديل الصحيح لـ onChange في Select
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
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h5" fontWeight={700} gutterBottom color="var(--text-main)">
          {isEdit ? 'Edit Supervisor' : 'Add New Supervisor'}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Supervisor Name"
              variant="outlined"
              value={formData.name}
              onChange={handleChange('name')}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Supervisor Type</InputLabel>
              <Select
                value={formData.type}
                onChange={handleSelectChange}
                label="Supervisor Type"
              >
                <MenuItem value="voice">Voice Agent</MenuItem>
                <MenuItem value="chat">Chat Agent</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              value={formData.email}
              onChange={handleChange('email')}
              required
            />
          </Grid>

          {!isEdit && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Temporary Password"
                type="password"
                variant="outlined"
                value={formData.password}
                onChange={handleChange('password')}
                required
              />
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Add Supervisor'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SupervisorFormModal;