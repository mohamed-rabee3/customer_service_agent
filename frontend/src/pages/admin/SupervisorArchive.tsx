// Supervisor archive — voice OR chat only (matches supervisor_type)
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import VoiceArchive from './VoiceArchive';
import ChatArchive from './ChatArchive';

const SupervisorArchive: React.FC = () => {
  const { supervisorType } = useAuth();
  const isVoice = supervisorType === 'voice';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>
        Archive
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>
        {isVoice
          ? 'Review your voice call history — click any record to reveal insights'
          : 'Review your chat history — click any record to reveal insights'}
      </Typography>

      {isVoice ? (
        <VoiceArchive variant="section" />
      ) : (
        <ChatArchive variant="section" />
      )}
    </Box>
  );
};

export default SupervisorArchive;
