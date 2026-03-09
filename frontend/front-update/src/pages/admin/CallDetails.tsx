import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import { ArrowLeft, Phone, Clock, User, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';

const getMockCallDetails = (id: string) => ({
  id: parseInt(id),
  supervisorName: 'Ahmed Mohamed',
  type: 'Voice',
  date: '2024-01-15',
  time: '14:32:45',
  duration: '4:32',
  status: 'Completed',
  performance: 92,
  customerName: 'John Smith',
  customerPhone: '+1 234 567 8900',
  issue: 'Billing inquiry regarding monthly subscription charges',
  resolution: 'Explained the billing cycle and applied a promotional discount',
  notes: 'Customer was satisfied with the resolution. Follow-up scheduled for next month.',
  tags: ['Billing', 'Subscription', 'Resolved'],
  sentiment: 'Positive',
  callRecordingUrl: '#',
  interventions: 2,
});

const CallDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const callDetails = getMockCallDetails(id || '1');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'var(--success)';
      case 'failed':
        return 'var(--danger)';
      default:
        return 'var(--accent)';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      <Button
        startIcon={<ArrowLeft size={20} />}
        onClick={() => navigate('/archive')}
        sx={{ mb: 4, color: 'var(--text-main)', fontWeight: 600, '&:hover': { bgcolor: 'rgba(84, 119, 146, 0.1)' } }}
      >
        Back to Archive
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={900} color="var(--text-main)">
          Call Details #{callDetails.id}
        </Typography>
        <Chip label={callDetails.status} sx={{ bgcolor: getStatusColor(callDetails.status), color: 'white', fontWeight: 600, px: 2 }} />
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <User size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Supervisor</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--text-main)">{callDetails.supervisorName}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <Clock size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Duration</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--text-main)">{callDetails.duration}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <Phone size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Type</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--text-main)">{callDetails.type}</Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-md)', bgcolor: 'rgba(84, 119, 146, 0.1)' }}>
                <CheckCircle size={24} color="var(--accent)" />
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Performance</Typography>
                <Typography variant="h6" fontWeight={600} color="var(--accent)">{callDetails.performance}%</Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Details Section */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Customer Information */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 300 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Customer Information
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Name</Typography>
                <Typography variant="body1" fontWeight={500} color="var(--text-main)">{callDetails.customerName}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Phone</Typography>
                <Typography variant="body1" fontWeight={500} color="var(--text-main)">{callDetails.customerPhone}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Sentiment</Typography>
                <Chip 
                  label={callDetails.sentiment} 
                  size="small"
                  sx={{ bgcolor: callDetails.sentiment === 'Positive' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(84, 119, 146, 0.1)', color: callDetails.sentiment === 'Positive' ? 'var(--success)' : 'var(--accent)', fontWeight: 600 }} 
                />
              </Box>
            </Stack>
          </Card>
        </Box>

        {/* Call Information */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 300 }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Call Information
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Date & Time</Typography>
                <Typography variant="body1" fontWeight={500} color="var(--text-main)">{callDetails.date} at {callDetails.time}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Interventions</Typography>
                <Typography variant="body1" fontWeight={500} color="var(--text-main)">{callDetails.interventions}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="var(--text-secondary)">Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {callDetails.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(84, 119, 146, 0.1)', color: 'var(--accent)', fontWeight: 500 }} />
                  ))}
                </Box>
              </Box>
            </Stack>
          </Card>
        </Box>

        {/* Issue & Resolution */}
        <Box sx={{ flex: '1 1 100%' }}>
          <Card sx={{ p: 3, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <Typography variant="h6" fontWeight={600} color="var(--text-main)" sx={{ mb: 3 }}>
              Issue & Resolution
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertTriangle size={18} color="var(--accent)" />
                <Typography variant="subtitle2" color="var(--text-secondary)">Issue</Typography>
              </Box>
              <Typography variant="body1" color="var(--text-main)">{callDetails.issue}</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle size={18} color="var(--success)" />
                <Typography variant="subtitle2" color="var(--text-secondary)">Resolution</Typography>
              </Box>
              <Typography variant="body1" color="var(--text-main)">{callDetails.resolution}</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MessageSquare size={18} color="var(--accent)" />
                <Typography variant="subtitle2" color="var(--text-secondary)">Notes</Typography>
              </Box>
              <Typography variant="body1" color="var(--text-main)">{callDetails.notes}</Typography>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default CallDetails;
