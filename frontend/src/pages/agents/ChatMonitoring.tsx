import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, Typography } from '@mui/material';
import ChatAgentCard from '@/components/agents/ChatAgentCard';
import ChatDetailModal from '@/components/agents/ChatDetailModal';
import InjectBox from '@/components/agents/InjectBox';
import '@/components/agents/VoiceAgentSelector.css';
import { agentsAPI } from '@/services/agentsService';
import { chatAPI } from '@/services/chatService';
import { toast } from 'react-toastify';
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';
import AgentFormModal from '@/components/agents/AgentFormModal';
import AddAgentCard from '@/components/agents/AddAgentCard';

interface ChatAgent {
    id: string;
    name: string;
    status: 'active' | 'idle' | 'paused';
    sentiment: string;
    performance: string;
    feed: string;
    session_id?: string;
    system_prompt?: string;
    telegram_bot_token?: string;
}

/* Glassmorphism card — same DNA as AdminDashboard */
const glassCardSx = {
    textAlign: 'center' as const,
    p: 3,
    borderRadius: 'var(--radius-lg)',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.2)',
    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease',
    '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: 'var(--shadow-lg), 0 0 24px rgba(84,119,146,0.18)',
        borderColor: 'var(--accent-hex)',
    },
};

const ChatMonitoring: React.FC = () => {
    const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);
    const [agents, setAgents] = useState<ChatAgent[]>([]);

    // Config states
    const [saving, setSaving] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [configTarget, setConfigTarget] = useState<ChatAgent | null>(null);
    const [formData, setFormData] = useState<{ name: string; system_prompt: string; telegram_bot_token?: string; agent_type?: 'voice' | 'chat' }>({ 
        name: '', system_prompt: '', telegram_bot_token: '', agent_type: 'chat' 
    });

    const resetForm = () => setFormData({ name: '', system_prompt: '', telegram_bot_token: '', agent_type: 'chat' });

    const fetchAgents = useCallback(async () => {
        try {
            // 1. Fetch chat agents from backend
            const agentsRes = await agentsAPI.getAll('chat');
            const rawAgents = agentsRes.data || [];

            // 2. Fetch active sessions to get live metrics
            let activeSessions: any[] = [];
            try {
                const sessionsRes = await chatAPI.getActiveSessions();
                activeSessions = sessionsRes.data || [];
            } catch { /* no active sessions */ }

            // 3. Build session lookup: agent_id → session data
            const sessionMap = new Map<string, any>();
            for (const s of activeSessions) {
                sessionMap.set(s.agent_id, s);
            }

            // 4. Map to ChatAgent interface
            const mapped: ChatAgent[] = rawAgents.map((a: any) => {
                const session = sessionMap.get(a.id);
                const isActive = a.status === 'in_chat';
                const derivedStatus = a.status === 'paused' ? 'paused' : (isActive ? 'active' : 'idle');
                return {
                    id: a.id,
                    name: a.name,
                    status: derivedStatus,
                    sentiment: 'neutral',
                    performance: '-',
                    feed: session ? `${session.message_count} messages` : 'No active session',
                    session_id: session?.session_id,
                    system_prompt: a.system_prompt,
                    telegram_bot_token: a.telegram_bot_token,
                };
            });

            setAgents(mapped);
        } catch (err) {
            console.error('Failed to fetch chat agents', err);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, [fetchAgents]);

    // Handlers for Add/Edit/Delete
    const handleAddSubmit = async () => {
        if (!formData.name.trim()) { toast.warn('Please enter a name'); return; }
        if (!formData.system_prompt.trim()) { toast.warn('Please enter a system prompt'); return; }
        setSaving(true);
        try {
            await agentsAPI.create({
                name: formData.name,
                system_prompt: formData.system_prompt,
                telegram_bot_token: formData.telegram_bot_token,
                agent_type: 'chat'
            });
            toast.success('Agent created successfully');
            setAddModalOpen(false);
            resetForm();
            fetchAgents();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to create agent');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = async (agent: ChatAgent) => {
        setConfigTarget(agent);
        try {
            const res = await agentsAPI.getById(agent.id);
            setFormData({
                name: res.data.name,
                system_prompt: res.data.system_prompt || '',
                telegram_bot_token: res.data.telegram_bot_token || '',
                agent_type: 'chat'
            });
        } catch {
            setFormData({
                name: agent.name,
                system_prompt: agent.system_prompt || '',
                telegram_bot_token: agent.telegram_bot_token || '',
                agent_type: 'chat'
            });
        }
        setEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!configTarget) return;
        if (!formData.name.trim()) { toast.warn('Please enter a name'); return; }
        if (!formData.system_prompt.trim()) { toast.warn('Please enter a system prompt'); return; }
        setSaving(true);
        try {
            await agentsAPI.update(configTarget.id, {
                name: formData.name,
                system_prompt: formData.system_prompt,
                telegram_bot_token: formData.telegram_bot_token,
                agent_type: 'chat'
            });
            toast.success('Agent updated successfully');
            setEditModalOpen(false);
            setConfigTarget(null);
            resetForm();
            fetchAgents();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update agent');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (agent: ChatAgent) => {
        setConfigTarget(agent);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!configTarget) return;
        setSaving(true);
        try {
            await agentsAPI.delete(configTarget.id);
            toast.success('Agent deleted');
            setDeleteModalOpen(false);
            setConfigTarget(null);
            fetchAgents();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to delete agent');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (agent: ChatAgent) => {
        const newStatus = agent.status === 'paused' ? 'idle' : 'paused';
        try {
            await agentsAPI.update(agent.id, { status: newStatus });
            toast.success(`Agent ${newStatus === 'paused' ? 'turned off' : 'turned on'}`);
            fetchAgents();
        } catch (err: any) {
            toast.error('Failed to change agent status');
        }
    };

    const totalActive = agents.filter(a => a.status === 'active').length;
    const avgPerf = agents.length > 0 ? Math.round(agents.reduce((acc, a) => acc + (parseInt(a.performance) || 0), 0) / agents.length) : 0;

    return (
        <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
            <h1 className="text-center text-5xl font-black mb-2" style={{ color: 'var(--text-main)', letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(33,52,72,0.10)' }}>
                Chat Agents
            </h1>
            <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                Select an agent to view details and monitor live chat activity
            </p>

            {/* Glassmorphism stat cards — same DNA as admin */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 5, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Agents', value: agents.length, color: 'var(--text-main)' },
                    { label: 'Active Now', value: totalActive, color: 'var(--success)' },
                    { label: 'Avg Performance', value: `${avgPerf}%`, color: 'var(--accent-hex)' },
                ].map((stat, idx) => (
                    <Box
                        key={stat.label}
                        sx={{
                            minWidth: 180,
                            opacity: 0,
                            animation: `staggerFadeIn 0.5s cubic-bezier(0.4,0,0.2,1) ${idx * 0.1}s forwards`,
                            '@keyframes staggerFadeIn': {
                                '0%': { opacity: 0, transform: 'translateY(24px)' },
                                '100%': { opacity: 1, transform: 'translateY(0)' },
                            },
                        }}
                    >
                        <Card sx={glassCardSx}>
                            <Typography variant="caption" fontWeight={600} color="var(--text-muted)" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>{stat.label}</Typography>
                            <Typography variant="h4" fontWeight={900} sx={{ color: stat.color }}>{stat.value}</Typography>
                        </Card>
                    </Box>
                ))}
            </Box>

            <div className="voice-agents-container">
                <div className="voice-agents-grid">
                    {agents.map((agent, index) => (
                        <ChatAgentCard
                            key={agent.id}
                            agent={agent}
                            index={index}
                            isSelected={selectedAgent?.id === agent.id}
                            onClick={(a) => setSelectedAgent(a)}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                            onToggleStatus={handleToggleStatus}
                        />
                    ))}
                    <AddAgentCard index={agents.length} onClick={() => { resetForm(); setAddModalOpen(true); }} />
                </div>
            </div>

            <ChatDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

            {/* Configuration Modals */}
            <AgentFormModal
                open={addModalOpen}
                title="Add Voice/Chat Agent"
                formData={formData}
                onChange={setFormData as any}
                onSubmit={handleAddSubmit}
                onClose={() => setAddModalOpen(false)}
                submitLabel="Add Agent"
                loading={saving}
            />
            <AgentFormModal
                open={editModalOpen}
                title="Edit Agent"
                formData={formData}
                onChange={setFormData as any}
                onSubmit={handleEditSubmit}
                onClose={() => { setEditModalOpen(false); setConfigTarget(null); }}
                submitLabel="Save Changes"
                loading={saving}
                existingAgentId={configTarget?.id}
            />
            <DeleteConfirmModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setConfigTarget(null); }}
                onConfirm={handleDeleteConfirm}
                itemName={configTarget?.name || ''}
                isDeleting={saving}
            />

            <InjectBox agents={agents} label="inject" />
        </div>
    );
};

export default ChatMonitoring;
