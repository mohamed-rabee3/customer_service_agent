// src/pages/admin/AdminDashboard.tsx
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Avatar,
  Button,
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

import Icon from '../../components/Icon';
import SupervisorFormModal from '../../components/modals/SupervisorFormModal';
import { supervisorsAPI } from '../../services/supervisorsService';

import {
  faUser,
  faPhone,
  faHeadset,
  faPlus,
  faEllipsisV,
} from '@fortawesome/free-solid-svg-icons';

// Loader CSS
const loaderStyle = `
  .loader {
    width: 15px;
    aspect-ratio: 1;
    border-radius: 50%;
    animation: l5 1s infinite linear alternate;
    margin: 0 auto;
  }
  @keyframes l5 {
    0% {box-shadow: 20px 0 #0d9488, -20px 0 #0d948833; background: #0d9488}
    33% {box-shadow: 20px 0 #0d9488, -20px 0 #0d948833; background: #0d948833}
    66% {box-shadow: 20px 0 #0d948833, -20px 0 #0d9488; background: #0d948833}
    100% {box-shadow: 20px 0 #0d948833, -20px 0 #0d9488; background: #0d9488}
  }
`;

// Mock data (later from API)
const activeSupervisors = [
  { id: 1, name: 'Noor Al Emarat', type: 'Voice Agent', performance: 89, activeCalls: 3, totalToday: 55, failed: 3 },
  { id: 2, name: 'Ahmed El Sayed', type: 'Chat Agent', performance: 94, activeCalls: 5, totalToday: 72, failed: 1 },
  { id: 3, name: 'Fatma Ali', type: 'Voice Agent', performance: 87, activeCalls: 2, totalToday: 48, failed: 4 },
  { id: 4, name: 'Mohamed Khaled', type: 'Chat Agent', performance: 91, activeCalls: 4, totalToday: 65, failed: 2 },
];

const leaderBoard = [
  { id: 1, rank: 1, name: 'Ahmed Mohamed', type: 'Voice', totalCalls: 1200, performance: 92, avgTime: '4:32' },
  { id: 2, rank: 2, name: 'Sara Ahmed', type: 'Chat', totalCalls: 1150, performance: 90, avgTime: '3:45' },
  { id: 3, rank: 3, name: 'Khaled Hassan', type: 'Voice', totalCalls: 1080, performance: 88, avgTime: '5:10' },
  { id: 4, rank: 4, name: 'Layla Mahmoud', type: 'Chat', totalCalls: 1020, performance: 87, avgTime: '4:00' },
  { id: 5, rank: 5, name: 'Yousef Ibrahim', type: 'Voice', totalCalls: 950, performance: 85, avgTime: '5:25' },
];

const AdminDashboard: React.FC = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false); // حالة الـ loading أثناء الإضافة

  // State for options menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleMenuAction = async (action: string) => {
    if (!selectedRow) return;

    if (action === 'Info') {
      alert(`Info for ${selectedRow.name}:\nRank: ${selectedRow.rank}\nType: ${selectedRow.type}\nTotal Calls: ${selectedRow.totalCalls}\nPerformance: ${selectedRow.performance}%\nAvg Time: ${selectedRow.avgTime}`);
    } else if (action === 'Edit') {
      alert(`Edit mode for ${selectedRow.name} - Open modal or form here`);
    } else if (action === 'Delete') {
      if (window.confirm(`Are you sure you want to delete ${selectedRow.name}?`)) {
        try {
          await supervisorsAPI.delete(selectedRow.id);
          alert(`Supervisor ${selectedRow.name} deleted successfully!`);
        } catch (error) {
          console.error('Error deleting supervisor:', error);
          alert('Failed to delete supervisor. Please try again.');
        }
      }
    }

    handleMenuClose();
  };

  const handleAddSubmit = async (data: any) => {
    setIsAdding(true); // شغل الـ loader
    try {
      const response = await supervisorsAPI.create(data);
      console.log('New Supervisor Added:', response.data);
      alert('Supervisor added successfully!');
    } catch (error) {
      console.error('Error adding supervisor:', error);
      alert('Failed to add supervisor. Please try again.');
    } finally {
      setIsAdding(false); // وقف الـ loader
    }
  };

  return (
    <Box sx={{ direction: 'ltr', minHeight: '100vh', overflow: 'hidden', p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)' }}>
      {/* Headline  */}
      <Typography
        variant="h4"
        fontWeight={900}
        color="var(--text-main)"
        sx={{ mb: 6 }}
      >
        Admin Dashboard
      </Typography>

      {/* Main Content */}
      {/* Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Icon icon={faPlus} />}
          onClick={() => setAddModalOpen(true)}
          sx={{ px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
        >
          Add New Supervisor
        </Button>
      </Box>

      {/* Loader أثناء الإضافة */}
      {isAdding && (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <style>{loaderStyle}</style>
          <div className="loader" />
          <Typography variant="body2" color="var(--text-secondary)" mt={1}>
            Adding new supervisor...
          </Typography>
        </Box>
      )}

      {/* Active Supervisors Cards */}
      <Typography variant="h5" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
        Active Supervisors
      </Typography>

      <Grid container spacing={3}>
        {activeSupervisors.map((sup) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={sup.id}>
            <Card
              sx={{
                height: '100%',
                textAlign: 'center',
                p: 3,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
                transition: 'var(--transition)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 'var(--shadow-lg)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Icon icon={faUser} size="2x" color="#fff" />
              </Avatar>

              <Typography variant="h6" fontWeight={600} color="var(--text-main)">
                {sup.name}
              </Typography>

              <Typography
                variant="body2"
                color="var(--text-secondary)"
                sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
              >
                {sup.type === 'Voice Agent' ? (
                  <>
                    <Icon icon={faPhone} /> Voice
                  </>
                ) : (
                  <>
                    <Icon icon={faHeadset} /> Chat
                  </>
                )}
              </Typography>

              <Typography variant="body1" fontWeight={500}>
                Performance: {sup.performance}%
              </Typography>
              <Typography variant="body1">Active Calls: {sup.activeCalls}</Typography>
              <Typography variant="body1">Total Today: {sup.totalToday}</Typography>
              <Typography variant="body1" sx={{ color: 'var(--danger)' }}>
                Failed: {sup.failed}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Leader Board Table */}
      <Typography variant="h5" fontWeight={600} color="var(--text-main)" sx={{ mt: 6, mb: 3 }}>
        Leader Board
      </Typography>

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
              <TableCell>Rank</TableCell>
              <TableCell>Supervisor</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Monthly Calls</TableCell>
              <TableCell>Performance</TableCell>
              <TableCell>Avg Handle Time</TableCell>
              <TableCell align="center">Options</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderBoard.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.rank}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.totalCalls}</TableCell>
                <TableCell sx={{ color: 'var(--success)', fontWeight: 600 }}>
                  {row.performance}%
                </TableCell>
                <TableCell>{row.avgTime}</TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, row)}
                    size="small"
                  >
                    <Icon icon={faEllipsisV} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-md)',
          },
        }}
      >
        <MenuItem onClick={() => handleMenuAction('Info')}>
          Info
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('Edit')}>
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('Delete')} sx={{ color: 'var(--danger)' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Add Supervisor Modal */}
      <SupervisorFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        supervisor={null}
        onSubmit={handleAddSubmit}
      />
    </Box>
  );
};

export default AdminDashboard;