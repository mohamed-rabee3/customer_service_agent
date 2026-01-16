import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Menu, MenuItem, InputAdornment } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MicIcon from '@mui/icons-material/Mic'; // Added for Voice

// Cloned from ChatMonitoring, tailored for Voice

const VoiceAgentMonitoring: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedAgentName, setSelectedAgentName] = useState('VoiceAgent-1');

    const [agents] = useState([
        { id: 1, name: 'VoiceAgent-1', status: 'active', sentiment: 'good', performance: '82%', feed: 'Handling customer complaint regarding billing.' },
        { id: 2, name: 'VoiceAgent-2', status: 'idle', sentiment: 'neutral', performance: '88%', feed: 'Waiting for call.' },
        { id: 3, name: 'VoiceAgent-3', status: 'active', sentiment: 'bad', performance: '75%', feed: 'Escalating issue to manager.' },
    ]);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (name?: string) => {
        if (name) setSelectedAgentName(name);
        setAnchorEl(null);
    };

    return (
        <Box sx={{ p: 4, animation: 'fadeIn 0.5s' }}>
            <Typography variant="h3" align="center" sx={{ fontWeight: 900, mb: 6, color: '#1e293b' }}>
                Voice Agent
            </Typography>

            {/* Agents Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, mb: 4 }}>
                {agents.map((agent) => (
                    <Box key={agent.id} sx={{
                        bgcolor: 'white',
                        border: '1px solid #ccfbf1',
                        borderRadius: 3,
                        p: 3,
                        boxShadow: 3,
                        width: { xs: '100%', md: 'calc(50% - 24px)', lg: 'calc(33.333% - 24px)' },
                        transition: '0.3s',
                        '&:hover': { transform: 'translateY(-4px)' }
                    }}>
                        <Typography variant="h4" align="center" sx={{ color: '#64748b', fontWeight: 'bold', mb: 3 }}>
                            {agent.name}
                        </Typography>

                        <Box sx={{ mb: 3, color: '#1e293b', fontSize: '1.1rem' }}>
                            <Typography><Box component="span" sx={{ fontWeight: 'bold', color: '#6b7280' }}>Status:</Box> <Box component="span" sx={{ color: agent.status === 'active' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{agent.status}</Box></Typography>
                            <Typography><Box component="span" sx={{ fontWeight: 'bold', color: '#6b7280' }}>Sentiment:</Box> {agent.sentiment}</Typography>
                            <Typography><Box component="span" sx={{ fontWeight: 'bold', color: '#6b7280' }}>Performance:</Box> {agent.performance}</Typography>
                        </Box>

                        <Box sx={{ bgcolor: '#f0fdfa', p: 2, borderRadius: 3, fontStyle: 'italic', border: '1px solid #ccfbf1', minHeight: 80, display: 'flex', alignItems: 'center', mb: 3 }}>
                            "{agent.feed}"
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="outlined" fullWidth sx={{ borderRadius: 3, py: 1, fontWeight: 600, color: '#64748b', borderColor: '#ccfbf1' }} startIcon={<VisibilityIcon />}>
                                Monitor Live
                            </Button>
                            <Button variant="contained" fullWidth sx={{ borderRadius: 3, py: 1, fontWeight: 600, bgcolor: '#0d9488', '&:hover': { bgcolor: '#0f766e' } }} startIcon={<MicIcon />}>
                                Listen In
                            </Button>
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Control Box - Keeping similar to Chat for functionality consistency */}
            <Box sx={{
                bgcolor: 'white',
                border: '1px solid #ccfbf1',
                borderRadius: 3,
                px: 5, py: 4,
                boxShadow: 3,
                mt: 6,
                maxWidth: 1000,
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>

                {/* Dropdown */}
                <Box sx={{ mb: 4, width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <Button
                        onClick={handleMenuClick}
                        endIcon={Boolean(anchorEl) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#0d9488', textTransform: 'none' }}
                    >
                        {selectedAgentName}
                    </Button>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => handleMenuClose()}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        PaperProps={{ sx: { borderRadius: 3, border: '2px solid #ccfbf1', minWidth: 200 } }}
                    >
                        {agents.map((agent) => (
                            <MenuItem key={agent.id} onClick={() => handleMenuClose(agent.name)} sx={{ fontSize: '1.2rem', color: '#0d9488', fontWeight: 'bold', justifyContent: 'center', py: 2 }}>
                                {agent.name}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>

                {/* Input & Action */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%' }}>
                    <TextField
                        fullWidth
                        placeholder={`Enter whisper for ${selectedAgentName}...`}
                        variant="outlined"
                        sx={{
                            bgcolor: '#f0fdfa',
                            '& .MuiOutlinedInput-root': { borderRadius: 3, '& fieldset': { borderColor: '#ccfbf1' } }
                        }}
                    />
                    <Button
                        variant="contained"
                        size="large"
                        sx={{
                            borderRadius: 3,
                            px: 6,
                            bgcolor: '#0d9488',
                            fontWeight: 900,
                            fontSize: '1.1rem',
                            '&:hover': { bgcolor: '#0b7a70' }
                        }}
                        startIcon={<MicIcon />}
                    >
                        Whisper
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default VoiceAgentMonitoring;
