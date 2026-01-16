import React from 'react';
import { Box, Button, IconButton, Card, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// Transformed from Tailwind to MUI/Standard CSS for consistency with frontendD if needed, 
// OR keeping tailwind classes if tailwind is set up. 
// FrontendD uses MUI, but checking package.json in previous steps, it didn't strictly seem to have Tailwind config set up fully although it might be there.
// `frontendD` package.json has "react-scripts" and MUI. `my-app` has Tailwind.
// Result: `AgentConfiguration` uses Tailwind classes. `frontendD` might not render them correctly if tailwind isn't configured.
// I'll attempt to replace basic structure with MUI to ensure it looks okay, or at least wrapper.
// Actually, re-reading `frontendD` package.json: no `tailwindcss`.
// So I MUST refactor `AgentConfiguration` and `ChatMonitoring` to use MUI or standard CSS, otherwise they will look broken (unstyled).
// I will rewrite them using MUI components to match the rest of `frontendD`.

const AgentConfiguration: React.FC = () => {
    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 6, color: '#1e293b' }}>
                Agent Configuration
            </Typography>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
                gap: 4,
                width: '100%',
                maxWidth: 1200,
                pb: 5
            }}>
                {[1, 2].map((i) => (
                    <Card key={i} sx={{
                        p: 4,
                        border: '1px solid #ccfbf1',
                        borderRadius: 3,
                        boxShadow: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        transition: '0.3s',
                        '&:hover': { boxShadow: 6 }
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, color: '#1e293b' }}>
                            Agent {i}
                        </Typography>

                        <Box sx={{ width: '100%', textAlign: 'left', mb: 5, color: '#64748b' }}>
                            <Typography variant="h6"><Box component="span" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Performance:</Box> {i === 1 ? '70%' : '90%'}</Typography>
                            <Typography variant="h6"><Box component="span" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Total Calls:</Box> {i === 1 ? '50' : '70'}</Typography>
                            <Typography variant="h6"><Box component="span" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Tools:</Box> we-db</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, width: '100%', mt: 'auto' }}>
                            <Button variant="outlined" color="error" fullWidth sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }} startIcon={<DeleteIcon />}>
                                Delete
                            </Button>
                            <Button variant="outlined" sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold', borderColor: '#ccfbf1', color: '#0d9488' }} startIcon={<EditIcon />}>
                                Edit
                            </Button>
                        </Box>
                    </Card>
                ))}

                {/* Add new agent card */}
                <Box sx={{
                    border: '2px dashed #14b8a6',
                    borderRadius: 3,
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    minHeight: 380,
                    transition: '0.3s',
                    '&:hover': { bgcolor: '#f0fdfa' }
                }}>
                    <Box sx={{
                        width: 96,
                        height: 96,
                        borderRadius: '50%',
                        border: '4px solid #64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3
                    }}>
                        <AddIcon sx={{ fontSize: 48, color: '#64748b' }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#64748b' }}>
                        Add New Agent
                    </Typography>
                </Box>

            </Box>
        </Box>
    );
};

export default AgentConfiguration;
