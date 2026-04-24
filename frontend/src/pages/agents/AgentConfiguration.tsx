import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Circle, Edit3, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import AgentAvatar from '@/components/agents/AgentAvatar';
import '@/components/agents/VoiceAgentSelector.css';
import { agentsAPI } from '@/services/agentsService';
import { supervisorsAPI } from '@/services/supervisorsService';

interface Agent {
    id: string;
    name: string;
    agent_type: 'voice' | 'chat';
    system_prompt: string;
    status: string;
    mcp_tools: Record<string, any>;
}

// ── Agent Config Card (Voice Agent style) ──
interface AgentCardProps {
    agent: Agent;
    index: number;
    onEdit: (agent: Agent) => void;
    onDelete: (agent: Agent) => void;
}

const AgentConfigCard: React.FC<AgentCardProps> = ({ agent, index, onEdit, onDelete }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isClicking, setIsClicking] = useState(false);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.03)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = '';
    }, []);

    const handleClick = () => {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 400);
    };

    return (
        <div
            ref={cardRef}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`voice-agent-card group ${isClicking ? 'voice-agent-card--clicking' : ''}`}
            style={{ animationDelay: `${index * 150}ms`, cursor: 'default' }}
        >
            {/* Status */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Circle size={10} fill="var(--success)" stroke="none" />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--success)' }}>
                        {agent.agent_type}
                    </span>
                </div>
            </div>

            {/* Avatar - using AgentAvatar component */}
            <div className="flex justify-center mb-4">
                <AgentAvatar name={agent.name} status="active" size="lg" showStatus={false} />
            </div>

            <div>
                <h3 className="text-center text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                    {agent.name}
                </h3>
                <p className="text-center text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {agent.agent_type === 'voice' ? 'Voice Agent' : 'Chat Agent'}
                </p>

                {/* Stats */}
                <div className="flex justify-between items-center px-2 mb-5">
                    <div className="text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{agent.status}</p>
                    </div>
                    <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                    <div className="text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{agent.agent_type}</p>
                    </div>
                    <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                    <div className="text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tools</p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{Object.keys(agent.mcp_tools).length}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
                        className="agent-config-btn agent-config-btn--edit"
                    >
                        <Edit3 size={15} /> Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(agent); }}
                        className="agent-config-btn agent-config-btn--delete"
                    >
                        <Trash2 size={15} /> Delete
                    </button>
                </div>
            </div>

            <div className="card-glow-bar" />
        </div>
    );
};

// ── Add Card (dashed) ──
const AddAgentCard: React.FC<{ index: number; onClick: () => void }> = ({ index, onClick }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            className="voice-agent-card group"
            style={{
                animationDelay: `${index * 150}ms`,
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 320,
                cursor: 'pointer',
            }}
        >
            <div className="agent-icon-ring mb-4" style={{ borderStyle: 'dashed' }}>
                <Plus size={28} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
                Add New Agent
            </h3>
            <div className="card-glow-bar" />
        </div>
    );
};

// ── Modal (native, matching voice agent modal style) ──
interface FormModalProps {
    open: boolean;
    title: string;
    formData: { name: string; system_prompt: string; };
    onChange: (data: { name: string; system_prompt: string; }) => void;
    onSubmit: () => void;
    onClose: () => void;
    submitLabel: string;
    loading?: boolean;
}

const AgentFormModal: React.FC<FormModalProps> = ({ open, title, formData, onChange, onSubmit, onClose, submitLabel, loading }) => {
    const [animState, setAnimState] = useState<'entering' | 'exiting' | ''>('');

    React.useEffect(() => {
        if (open) setAnimState('entering');
    }, [open]);

    const handleClose = () => {
        setAnimState('exiting');
        setTimeout(onClose, 300);
    };

    if (!open && animState !== 'exiting') return null;

    return (
        <div
            className={`agent-modal-overlay ${animState === 'entering' ? 'agent-modal-overlay--entering' : ''} ${animState === 'exiting' ? 'agent-modal-overlay--exiting' : ''}`}
            onClick={handleClose}
        >
            <div
                className={`agent-modal-content ${animState === 'entering' ? 'agent-modal-content--entering' : ''} ${animState === 'exiting' ? 'agent-modal-content--exiting' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)',
                    }}
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-6 modal-stagger-1" style={{ color: 'var(--text-main)' }}>{title}</h2>

                <div className="flex flex-col gap-4 modal-stagger-2">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Agent Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => onChange({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border outline-none"
                            style={{
                                backgroundColor: 'var(--bg-dark)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-main)',
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>System Prompt</label>
                        <textarea
                            value={formData.system_prompt}
                            onChange={(e) => onChange({ ...formData, system_prompt: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border outline-none"
                            style={{
                                backgroundColor: 'var(--bg-dark)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-main)',
                                resize: 'vertical',
                            }}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={handleClose} className="agent-config-btn agent-config-btn--cancel modal-stagger-btn-1">
                        Cancel
                    </button>
                    <button onClick={onSubmit} disabled={loading} className="agent-config-btn agent-config-btn--save modal-stagger-btn-2">
                        {loading ? 'Saving...' : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ──
const AgentConfiguration: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [formData, setFormData] = useState({ name: '', system_prompt: '' });

    const resetForm = () => setFormData({ name: '', system_prompt: '' });

    // Fetch agents from the supervisor dashboard endpoint
    const fetchAgents = async () => {
        try {
            const res = await supervisorsAPI.getMyDashboard();
            const dashboard = res.data;
            if (dashboard.agents && Array.isArray(dashboard.agents)) {
                setAgents(dashboard.agents.map((a: Record<string, unknown>) => ({
                    id: a.id,
                    name: a.name,
                    agent_type: a.agent_type,
                    system_prompt: a.system_prompt || '',
                    status: a.status,
                    mcp_tools: a.mcp_tools || {},
                })));
            }
        } catch (err: unknown) {
            console.error('Failed to fetch agents', err);
            toast.error('Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAgents(); }, []);

    const handleAddSubmit = async () => {
        if (!formData.name.trim()) { toast.warn('Please enter a name'); return; }
        if (!formData.system_prompt.trim()) { toast.warn('Please enter a system prompt'); return; }
        setSaving(true);
        try {
            await agentsAPI.create({ name: formData.name, system_prompt: formData.system_prompt });
            toast.success('Agent created successfully');
            setAddModalOpen(false);
            resetForm();
            fetchAgents();
        } catch (err: unknown) {
            toast.error((err as any)?.response?.data?.detail || 'Failed to create agent');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = async (agent: Agent) => {
        setSelectedAgent(agent);
        // Fetch full detail to get system_prompt
        try {
            const res = await agentsAPI.getById(agent.id);
            setFormData({ name: res.data.name, system_prompt: res.data.system_prompt || '' });
        } catch {
            setFormData({ name: agent.name, system_prompt: agent.system_prompt });
        }
        setEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!selectedAgent) return;
        if (!formData.name.trim()) { toast.warn('Please enter a name'); return; }
        if (!formData.system_prompt.trim()) { toast.warn('Please enter a system prompt'); return; }
        setSaving(true);
        try {
            await agentsAPI.update(selectedAgent.id, { name: formData.name, system_prompt: formData.system_prompt });
            toast.success('Agent updated successfully');
            setEditModalOpen(false);
            setSelectedAgent(null);
            resetForm();
            fetchAgents();
        } catch (err: unknown) {
            toast.error((err as any)?.response?.data?.detail || 'Failed to update agent');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (agent: Agent) => {
        setSelectedAgent(agent);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedAgent) return;
        setSaving(true);
        try {
            await agentsAPI.delete(selectedAgent.id);
            toast.success('Agent deleted');
            setDeleteModalOpen(false);
            setSelectedAgent(null);
            fetchAgents();
        } catch (err: unknown) {
            toast.error((err as any)?.response?.data?.detail || 'Failed to delete agent');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
            <h1 className="text-center text-4xl font-black mb-2" style={{ color: 'var(--text-main)' }}>
                Agent Configuration
            </h1>
            <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                Manage your agent roster
            </p>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--text-main)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : (
                <div className="voice-agents-container">
                    <div className="voice-agents-grid">
                        {agents.map((agent, index) => (
                            <AgentConfigCard
                                key={agent.id}
                                agent={agent}
                                index={index}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                        <AddAgentCard index={agents.length} onClick={() => { resetForm(); setAddModalOpen(true); }} />
                    </div>
                </div>
            )}

            {/* Modals */}
            <AgentFormModal
                open={addModalOpen}
                title="Add New Agent"
                formData={formData}
                onChange={setFormData}
                onSubmit={handleAddSubmit}
                onClose={() => setAddModalOpen(false)}
                submitLabel="Add Agent"
                loading={saving}
            />
            <AgentFormModal
                open={editModalOpen}
                title="Edit Agent"
                formData={formData}
                onChange={setFormData}
                onSubmit={handleEditSubmit}
                onClose={() => { setEditModalOpen(false); setSelectedAgent(null); }}
                submitLabel="Save Changes"
                loading={saving}
            />
            <DeleteConfirmModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setSelectedAgent(null); }}
                onConfirm={handleDeleteConfirm}
                itemName={selectedAgent?.name || ''}
                isDeleting={saving}
            />
        </div>
    );
};

export default AgentConfiguration;
