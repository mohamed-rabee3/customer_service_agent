// Supervisor archive — voice and chat records in one page
import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import VoiceArchive from './VoiceArchive';
import ChatArchive from './ChatArchive';

const SupervisorArchive: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>
        Archive
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>
        Review your voice call and chat history — click any record to reveal insights
      </Typography>

      <VoiceArchive variant="section" />
      <Divider sx={{ my: 5, borderColor: 'var(--border)' }} />
      <ChatArchive variant="section" />
    </Box>
  );
};

export default SupervisorArchive;
