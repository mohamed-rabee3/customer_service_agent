import React, { useState, useRef, useCallback } from 'react';
import { Circle, Edit3, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';
import AgentAvatar from '@/components/agents/AgentAvatar';
import '@/components/agents/VoiceAgentSelector.css';

interface Agent {
    id: number;
    name: string;
    performance: number;
    totalCalls: number;
    tools: string;
    type: 'voice' | 'chat';
}

const initialAgents: Agent[] = [
    { id: 1, name: 'Agent 1', performance: 70, totalCalls: 50, tools: 'we-db', type: 'voice' },
    { id: 2, name: 'Agent 2', performance: 90, totalCalls: 70, tools: 'we-db', type: 'chat' },
    { id: 3, name: 'Agent 3', performance: 85, totalCalls: 62, tools: 'we-db', type: 'voice' },
];

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
                        {agent.type}
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
                    {agent.type === 'voice' ? 'Voice Agent' : 'Chat Agent'}
                </p>

                {/* Stats */}
                <div className="flex justify-between items-center px-2 mb-5">
                    <div className="text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Perf.</p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{agent.performance}%</p>
                    </div>
                    <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                    <div className="text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Calls</p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{agent.totalCalls}</p>
                    </div>
                    <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                    <div className="text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tools</p>
                        <p className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{agent.tools}</p>
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
    formData: { name: string; tools: string; type: 'voice' | 'chat' };
    onChange: (data: { name: string; tools: string; type: 'voice' | 'chat' }) => void;
    onSubmit: () => void;
    onClose: () => void;
    submitLabel: string;
}

const AgentFormModal: React.FC<FormModalProps> = ({ open, title, formData, onChange, onSubmit, onClose, submitLabel }) => {
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
                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Tools</label>
                        <input
                            type="text"
                            value={formData.tools}
                            onChange={(e) => onChange({ ...formData, tools: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border outline-none"
                            style={{
                                backgroundColor: 'var(--bg-dark)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-main)',
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => onChange({ ...formData, type: e.target.value as 'voice' | 'chat' })}
                            className="w-full px-4 py-3 rounded-xl border outline-none"
                            style={{
                                backgroundColor: 'var(--bg-dark)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-main)',
                            }}
                        >
                            <option value="voice">Voice</option>
                            <option value="chat">Chat</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={handleClose} className="agent-config-btn agent-config-btn--cancel modal-stagger-btn-1">
                        Cancel
                    </button>
                    <button onClick={onSubmit} className="agent-config-btn agent-config-btn--save modal-stagger-btn-2">
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ──
const AgentConfiguration: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>(initialAgents);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [formData, setFormData] = useState({ name: '', tools: '', type: 'voice' as 'voice' | 'chat' });

    const getNextId = () => Math.max(...agents.map(a => a.id), 0) + 1;
    const resetForm = () => setFormData({ name: '', tools: '', type: 'voice' });

    const handleAddSubmit = () => {
        if (!formData.name.trim()) { toast.warn('Please enter a name'); return; }
        setAgents(prev => [...prev, { id: getNextId(), ...formData, performance: 0, totalCalls: 0 }]);
        setAddModalOpen(false);
        resetForm();
        toast.success('Agent added successfully');
    };

    const handleEditClick = (agent: Agent) => {
        setSelectedAgent(agent);
        setFormData({ name: agent.name, tools: agent.tools, type: agent.type });
        setEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        if (!selectedAgent) return;
        setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, ...formData } : a));
        setEditModalOpen(false);
        setSelectedAgent(null);
        resetForm();
        toast.success('Agent updated successfully');
    };

    const handleDeleteClick = (agent: Agent) => {
        setSelectedAgent(agent);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedAgent) return;
        setAgents(prev => prev.filter(a => a.id !== selectedAgent.id));
        setDeleteModalOpen(false);
        setSelectedAgent(null);
        toast.success('Agent deleted');
    };

    return (
        <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
            <h1 className="text-center text-4xl font-black mb-2" style={{ color: 'var(--text-main)' }}>
                Agent Configuration
            </h1>
            <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                Manage your agent roster
            </p>

            {/* 3-agent grid */}
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

            {/* Modals */}
            <AgentFormModal
                open={addModalOpen}
                title="Add New Agent"
                formData={formData}
                onChange={setFormData}
                onSubmit={handleAddSubmit}
                onClose={() => setAddModalOpen(false)}
                submitLabel="Add Agent"
            />
            <AgentFormModal
                open={editModalOpen}
                title="Edit Agent"
                formData={formData}
                onChange={setFormData}
                onSubmit={handleEditSubmit}
                onClose={() => { setEditModalOpen(false); setSelectedAgent(null); }}
                submitLabel="Save Changes"
            />
            <DeleteConfirmModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setSelectedAgent(null); }}
                onConfirm={handleDeleteConfirm}
                itemName={selectedAgent?.name || ''}
                isDeleting={false}
            />
        </div>
    );
};

export default AgentConfiguration;
