// src/pages/admin/AdminArchive.tsx
import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import Icon from '../../components/Icon';
import SupervisorFormModal from '../../components/modals/SupervisorFormModal';
import { supervisorsAPI } from '../../services/supervisorsService';

import {
  faInfoCircle,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';

// Mock data (later from API)
const initialArchiveData = [
  { id: 1, name: 'Ahmed Mohamed', type: 'Voice', interventions: 145, performance: 92, avgTime: '4:32', failed: 8 },
  { id: 2, name: 'Sara Ahmed', type: 'Chat', interventions: 132, performance: 90, avgTime: '3:45', failed: 5 },
  { id: 3, name: 'Khaled Hassan', type: 'Voice', interventions: 128, performance: 88, avgTime: '5:10', failed: 12 },
  { id: 4, name: 'Layla Mahmoud', type: 'Chat', interventions: 115, performance: 87, avgTime: '4:00', failed: 7 },
  { id: 5, name: 'Yousef Ibrahim', type: 'Voice', interventions: 110, performance: 85, avgTime: '5:25', failed: 15 },
  { id: 6, name: 'Noor Al Emarat', type: 'Voice', interventions: 105, performance: 89, avgTime: '4:50', failed: 9 },
  { id: 7, name: 'Fatma Ali', type: 'Chat', interventions: 98, performance: 91, avgTime: '3:30', failed: 4 },
  { id: 8, name: 'Mohamed Khaled', type: 'Chat', interventions: 92, performance: 86, avgTime: '4:15', failed: 10 },
];

const AdminArchive: React.FC = () => {
  const [archiveData, setArchiveData] = useState(initialArchiveData);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supervisorToDelete, setSupervisorToDelete] = useState<any>(null);

  const filteredData = archiveData.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || row.type.toLowerCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleEdit = (sup: any) => {
    setSelectedSupervisor({
      id: sup.id,
      name: sup.name,
      type: sup.type.toLowerCase() as 'voice' | 'chat',
      email: 'example@email.com',
    });
    setEditModalOpen(true);
  };

  const handleDeleteClick = (sup: any) => {
    setSupervisorToDelete(sup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!supervisorToDelete?.id) return;

    try {
      await supervisorsAPI.delete(supervisorToDelete.id);
      console.log('Supervisor Deleted:', supervisorToDelete.id);
      alert('Supervisor deleted successfully!');
      setArchiveData(prev => prev.filter(item => item.id !== supervisorToDelete.id));
    } catch (error) {
      console.error('Error deleting supervisor:', error);
      alert('Failed to delete supervisor. Please try again.');
    }
    setDeleteDialogOpen(false);
    setSupervisorToDelete(null);
  };

  const handleEditSubmit = async (data: any) => {
    if (!selectedSupervisor?.id) return;

    try {
      const response = await supervisorsAPI.update(selectedSupervisor.id, data);
      console.log('Supervisor Updated:', response.data);
      alert('Supervisor updated successfully!');
      setArchiveData(prev => prev.map(item =>
        item.id === selectedSupervisor.id ? { ...item, ...data } : item
      ));
    } catch (error) {
      console.error('Error updating supervisor:', error);
      alert('Failed to update supervisor. Please try again.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, direction: 'ltr', bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Headline بسيط على الشمال – بدون الـ teal header */}
      <Typography
        variant="h4"
        fontWeight={900}
        color="var(--text-main)"
        sx={{ mb: 6 }}
      >
        Admin Archive
      </Typography>

      {/* Main Content */}
      <Box>
        {/* Search Bar - Pill Style */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ flexWrap: 'wrap' }}
          >
            {/* Search Input with icon inside */}
            <Box sx={{ position: 'relative', flex: 1, minWidth: { xs: '100%', sm: 300 } }}>
              <TextField
                fullWidth
                placeholder="Search by supervisor name..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--radius-pill)',
                    pr: 2,
                    pl: 5,
                    height: 56,
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 2,
                  },
                }}
              />
              <Icon
                icon={faSearch}
                size="lg"
                color="var(--text-secondary)"
                style={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
            </Box>

            {/* Type Filter */}
            <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as string)}
                displayEmpty
                sx={{
                  borderRadius: 'var(--radius-pill)',
                  height: 56,
                  '& .MuiOutlinedInput-input': {
                    py: 2,
                  },
                }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="voice">Voice</MenuItem>
                <MenuItem value="chat">Chat</MenuItem>
              </Select>
            </FormControl>

            {/* Filter Button */}
            <Button
              variant="outlined"
              startIcon={<Icon icon={faFilter} />}
              sx={{
                height: 56,
                px: 4,
                borderRadius: 'var(--radius-pill)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Filter
            </Button>
          </Stack>
        </Paper>

        {/* Archive Table */}
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'var(--bg)' }}>
                <TableCell>Supervisor Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Total Interventions</TableCell>
                <TableCell>Performance</TableCell>
                <TableCell>Avg Handle Time</TableCell>
                <TableCell>Failed</TableCell>
                <TableCell align="center">Options</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.interventions}</TableCell>
                  <TableCell sx={{ color: 'var(--success)', fontWeight: 600 }}>
                    {row.performance}%
                  </TableCell>
                  <TableCell>{row.avgTime}</TableCell>
                  <TableCell sx={{ color: 'var(--danger)' }}>{row.failed}</TableCell>
                  <TableCell align="center">
                    {/* Info زر مربوط دلوقتي */}
                    <IconButton 
                      color="secondary" 
                      title="Info"
                      onClick={() => {
                        alert(
                          `Supervisor Info:\n\n` +
                          `Name: ${row.name}\n` +
                          `Type: ${row.type}\n` +
                          `Total Interventions: ${row.interventions}\n` +
                          `Performance: ${row.performance}%\n` +
                          `Avg Handle Time: ${row.avgTime}\n` +
                          `Failed: ${row.failed}`
                        );
                      }}
                    >
                      <Icon icon={faInfoCircle} />
                    </IconButton>

                    <IconButton color="success" title="Edit" onClick={() => handleEdit(row)}>
                      <Icon icon={faEdit} />
                    </IconButton>

                    <IconButton color="error" title="Delete" onClick={() => handleDeleteClick(row)}>
                      <Icon icon={faTrash} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Edit Modal */}
        <SupervisorFormModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedSupervisor(null);
          }}
          supervisor={selectedSupervisor}
          onSubmit={handleEditSubmit}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete supervisor "{supervisorToDelete?.name}"?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminArchive;