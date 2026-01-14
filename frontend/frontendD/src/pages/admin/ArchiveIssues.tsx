// src/pages/admin/ArchiveIssues.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import Icon from '../../components/Icon';

import {
  faSearch,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';

// Mock data (مؤقت لحد ما الـ backend يجهز)
const issuesData = [
  {
    id: '0212345678',
    time: '21:00',
    duration: '10:00 am - 12:00 pm',
    tag: 'router issue',
    summary: 'User reported intermittent connectivity issues with their router. Troubleshot and resolved by resetting device and updating firmware.',
    tags: ['Network', 'Hardware', 'Resolved'],
    satisfaction: 50,
    resolutionTime: '00:10:30',
  },
  {
    id: '0212345679',
    time: '14:30',
    duration: '2:00 pm - 3:00 pm',
    tag: 'billing inquiry',
    summary: 'Customer inquired about unexpected charges on bill. Reviewed account and applied credit for error.',
    tags: ['Billing', 'Account'],
    satisfaction: 80,
    resolutionTime: '00:08:45',
  },
  {
    id: '0212345680',
    time: '09:15',
    duration: '9:00 am - 9:30 am',
    tag: 'login problem',
    summary: 'User unable to log in to account. Reset password and verified email.',
    tags: ['Account', 'Security'],
    satisfaction: 90,
    resolutionTime: '00:15:00',
  },
];

const ArchiveIssues: React.FC = () => {
  const [issues] = useState<any[]>(issuesData); // ← استخدام الـ mock مباشرة
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredData = issues.filter((issue) => {
    const matchesSearch =
      issue.id.includes(searchTerm) ||
      issue.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, direction: 'ltr', bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Headline */}
      <Typography
        variant="h4"
        fontWeight={900}
        color="var(--text-main)"
        sx={{ mb: 6 }}
      >
        Archive Issues
      </Typography>

      {/* Main Content */}
      <Box>
        {/* Search Bar */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ flexWrap: 'wrap' }}
          >
            <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <Select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value as string)}
                displayEmpty
                sx={{
                  borderRadius: 'var(--radius-pill)',
                  height: 56,
                  '& .MuiOutlinedInput-input': { py: 2 },
                }}
              >
                <MenuItem value="all">All agents</MenuItem>
                <MenuItem value="agent1">agent 1</MenuItem>
                <MenuItem value="agent2">agent 2</MenuItem>
              </Select>
            </FormControl>

            <TextField
              placeholder="dd/mm/yyyy"
              variant="outlined"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{
                minWidth: { xs: '100%', sm: 200 },
                '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-pill)', height: 56 },
              }}
            />

            <Box sx={{ position: 'relative', flex: 1, minWidth: { xs: '100%', sm: 300 } }}>
              <TextField
                fullWidth
                placeholder="Search by ID or phone number..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-pill)', pr: 2, pl: 5, height: 56 },
                  '& .MuiOutlinedInput-input': { py: 2 },
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

        {/* Issues List */}
        <Grid container spacing={3}>
          {filteredData.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="h6" align="center" color="var(--text-secondary)">
                No issues found
              </Typography>
            </Grid>
          ) : (
            filteredData.map((issue, index) => (
              <Grid item xs={12} key={issue.id}>
                <Paper
                  sx={{
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
                  <Grid container spacing={3}>
                    {/* Left Side */}
                    <Grid item xs={12} md={8}>
                      <Stack spacing={2}>
                        <Typography variant="h5" fontWeight={700} color="var(--text-main)">
                          Issue {index + 1}
                        </Typography>

                        <Typography variant="subtitle1" fontWeight={600} color="var(--text-secondary)">
                          Issues
                        </Typography>

                        <Chip
                          label={issue.tag}
                          sx={{
                            bgcolor: 'var(--tag-bg)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--radius-pill)',
                            alignSelf: 'flex-start',
                            height: 32,
                            fontWeight: 600,
                          }}
                        />

                        <Typography variant="h6" fontWeight={600} color="var(--text-main)">
                          Summary
                        </Typography>

                        <Typography variant="body1" color="var(--text-secondary)">
                          {issue.summary}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6" fontWeight={600} color="var(--text-main)">
                            Tags
                          </Typography>
                          {issue.tags?.map((tag: string) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{
                                bgcolor: 'var(--tag-bg)',
                                color: 'var(--text-main)',
                                borderRadius: 'var(--radius-pill)',
                              }}
                            />
                          ))}
                        </Stack>

                        <Typography variant="h6" fontWeight={600} color="var(--text-main)">
                          Satisfaction
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={issue.satisfaction}
                          sx={{
                            height: 10,
                            borderRadius: 'var(--radius-sm)',
                            bgcolor: 'var(--border)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: 'var(--success)',
                              borderRadius: 'var(--radius-sm)',
                            },
                          }}
                        />
                        <Typography variant="body2" color="var(--text-secondary)" mt={1}>
                          {issue.satisfaction}%
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Right Side */}
                    <Grid item xs={12} md={4}>
                      <Stack spacing={2} alignItems="flex-end" sx={{ height: '100%' }}>
                        <Typography variant="body2" color="var(--text-secondary)">
                          {issue.time}
                        </Typography>
                        <Typography variant="body2" color="var(--text-secondary)">
                          {issue.duration}
                        </Typography>

                        <Typography variant="body1" color="var(--text-secondary)" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography component="span" fontWeight={700} color="var(--text-main)">
                            ID:
                          </Typography>
                          {issue.id}
                        </Typography>

                        <Typography variant="body2" color="var(--text-secondary)">
                          Resolution time: {issue.resolutionTime}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      {/* الـ API call محفوظ كـ comment عشان ترجعيله لما الـ backend يجهز */}
      {/*
      useEffect(() => {
        const fetchIssues = async () => {
          setLoading(true);
          setError(null);
          try {
            const params: any = {};
            if (agentFilter !== 'all') params.agent = agentFilter;
            if (dateFilter) params.date = dateFilter;
            if (searchTerm) params.search = searchTerm;

            const response = await issuesAPI.getAll(params);
            setIssues(response.data);
          } catch (err: any) {
            console.error('Error fetching issues:', err);
            setError(err.response?.data?.message || 'Failed to load issues. Please try again.');
          } finally {
            setLoading(false);
          }
        };

        fetchIssues();
      }, [searchTerm, agentFilter, dateFilter]);
      */}
    </Box>
  );
};

export default ArchiveIssues;