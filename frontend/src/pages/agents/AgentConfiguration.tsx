import React, { useState, useRef, useCallback, useEffect } from 'react';

import { Circle, Edit3, Trash2, Plus } from 'lucide-react';

import { toast } from 'react-toastify';

import DeleteConfirmModal from '../../components/modals/DeleteConfirmModal';

import AgentFormModal from '@/components/agents/AgentFormModal';

import AgentAvatar from '@/components/agents/AgentAvatar';

import '@/components/agents/VoiceAgentSelector.css';

import { agentsAPI, type WebhookConfigs } from '@/services/agentsService';

import { supervisorsAPI } from '@/services/supervisorsService';

import { useAuth } from '@/context/AuthContext';



interface Agent {

    id: string;

    name: string;

    agent_type: 'voice' | 'chat';

    system_prompt: string;

    status: 'idle' | 'in_call' | 'in_chat' | 'paused';

    mcp_tools: Record<string, unknown>;

    webhook_configs?: WebhookConfigs;

}



type AgentFormData = {

    name: string;

    system_prompt: string;

    agent_type: 'voice' | 'chat';

    status: 'idle' | 'in_call' | 'in_chat' | 'paused';

    webhook_configs?: WebhookConfigs;

};



const defaultFormData = (agentType: 'voice' | 'chat' = 'voice'): AgentFormData => ({

    name: '',

    system_prompt: '',

    agent_type: agentType,

    status: 'idle',

    webhook_configs: {},

});



const getApiErrorMessage = (err: unknown, fallback: string): string => {

    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;

    if (typeof detail === 'string' && detail.trim()) return detail;

    if (Array.isArray(detail)) {

        return detail

            .map((item) => (typeof item === 'string' ? item : (item as { msg?: string })?.msg))

            .filter(Boolean)

            .join(', ') || fallback;

    }

    return fallback;

};



const buildAgentPayload = (form: AgentFormData, supervisorType: 'voice' | 'chat') => {

    const payload: Parameters<typeof agentsAPI.create>[0] = {

        name: form.name,

        system_prompt: form.system_prompt,

        agent_type: supervisorType,

        status: form.status,

    };

    if (supervisorType === 'chat' && form.webhook_configs) {

        payload.webhook_configs = form.webhook_configs;

        const telegramToken = form.webhook_configs.telegram?.bot_token?.trim();

        if (telegramToken && telegramToken !== '{}') {

            payload.telegram_bot_token = telegramToken;

        }

    }

    return payload;

};



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



    const webhooks = agent.webhook_configs;



    return (

        <div

            ref={cardRef}

            onClick={handleClick}

            onMouseMove={handleMouseMove}

            onMouseLeave={handleMouseLeave}

            className={`voice-agent-card group ${isClicking ? 'voice-agent-card--clicking' : ''}`}

            style={{ animationDelay: `${index * 150}ms`, cursor: 'default' }}

        >

            <div className="flex items-center justify-between mb-5">

                <div className="flex items-center gap-2">

                    <Circle size={10} fill="var(--success)" stroke="none" />

                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--success)' }}>

                        {agent.agent_type}

                    </span>

                </div>

                {agent.agent_type === 'chat' && (

                    <div className="flex gap-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>

                        {webhooks?.telegram?.enabled && <span>TG</span>}

                        {webhooks?.whatsapp?.enabled && <span>WA</span>}

                        {webhooks?.instagram?.enabled && <span>IG</span>}

                    </div>

                )}

            </div>



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



const AgentConfiguration: React.FC = () => {

    const { supervisorType } = useAuth();

    const [agents, setAgents] = useState<Agent[]>([]);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [addModalOpen, setAddModalOpen] = useState(false);

    const [editModalOpen, setEditModalOpen] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    const [formData, setFormData] = useState<AgentFormData>(defaultFormData());

    const agentToDeleteRef = useRef<string | null>(null);



    const resetForm = () => setFormData(defaultFormData(supervisorType));



    const fetchAgents = async () => {

        try {

            const res = await supervisorsAPI.getMyDashboard();

            const dashboard = res.data;

            if (dashboard.agents && Array.isArray(dashboard.agents)) {

                setAgents(dashboard.agents.map((a: Record<string, unknown>) => ({

                    id: String(a.id),

                    name: String(a.name ?? ''),

                    agent_type: a.agent_type as Agent['agent_type'],

                    system_prompt: String(a.system_prompt || ''),

                    status: a.status as Agent['status'],

                    mcp_tools: (a.mcp_tools as Record<string, unknown>) || {},

                    webhook_configs: (a.webhook_configs as WebhookConfigs) || {},

                })));

            }

        } catch (err: unknown) {

            if ((err as { response?: { status?: number } })?.response?.status !== 401) {

                console.error('Failed to fetch agents', err);

                toast.error('Failed to load agents');

            }

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

            await agentsAPI.create(buildAgentPayload(formData, supervisorType));

            toast.success('Agent created successfully');

            setAddModalOpen(false);

            resetForm();

            fetchAgents();

        } catch (err: unknown) {

            toast.error(getApiErrorMessage(err, 'Failed to create agent'));

        } finally {

            setSaving(false);

        }

    };



    const handleEditClick = async (agent: Agent) => {

        setSelectedAgent(agent);

        try {

            const res = await agentsAPI.getById(agent.id);

            const data = res.data;

            const webhook_configs = { ...(data.webhook_configs || {}) };

            const savedToken =
                webhook_configs.telegram?.bot_token ||
                (data as { telegram_bot_token?: string }).telegram_bot_token;

            if (savedToken && savedToken !== '{}') {

                webhook_configs.telegram = {

                    ...webhook_configs.telegram,

                    enabled: true,

                    bot_token: savedToken,

                };

            }

            setFormData({

                name: data.name,

                system_prompt: data.system_prompt || '',

                agent_type: data.agent_type,

                status: data.status,

                webhook_configs,

            });

        } catch {

            setFormData({

                name: agent.name,

                system_prompt: agent.system_prompt,

                agent_type: agent.agent_type,

                status: agent.status,

                webhook_configs: agent.webhook_configs || {},

            });

        }

        setEditModalOpen(true);

    };



    const handleEditSubmit = async () => {

        if (!selectedAgent) return;

        if (!formData.name.trim()) { toast.warn('Please enter a name'); return; }

        if (!formData.system_prompt.trim()) { toast.warn('Please enter a system prompt'); return; }

        setSaving(true);

        try {

            await agentsAPI.update(selectedAgent.id, buildAgentPayload(formData, supervisorType));

            toast.success('Agent updated successfully');

            setEditModalOpen(false);

            setSelectedAgent(null);

            resetForm();

            fetchAgents();

        } catch (err: unknown) {

            toast.error(getApiErrorMessage(err, 'Failed to update agent'));

        } finally {

            setSaving(false);

        }

    };



    const handleDeleteClick = (agent: Agent) => {

        agentToDeleteRef.current = agent.id;

        setSelectedAgent(agent);

        setDeleteModalOpen(true);

    };



    const handleDeleteConfirm = async () => {

        const agentId = agentToDeleteRef.current ?? selectedAgent?.id;

        if (!agentId) {

            toast.error('No agent selected for deletion');

            return;

        }

        setSaving(true);

        try {

            await agentsAPI.delete(agentId);

            toast.success('Agent deleted');

            setDeleteModalOpen(false);

            setSelectedAgent(null);

            agentToDeleteRef.current = null;

            fetchAgents();

        } catch (err: unknown) {

            toast.error(getApiErrorMessage(err, 'Failed to delete agent'));

        } finally {

            setSaving(false);

        }

    };



    const formModalProps = {

        formData: { ...formData, agent_type: supervisorType },

        onChange: (data: AgentFormData & { agent_type?: 'voice' | 'chat' }) =>

            setFormData((prev) => ({ ...prev, ...data, agent_type: supervisorType })),

        loading: saving,

        showStatusField: true as const,

    };



    return (

        <div style={{ padding: 32, backgroundColor: 'var(--bg)', minHeight: '100vh' }}>

            <h1 className="text-center text-4xl font-black mb-2" style={{ color: 'var(--text-main)' }}>

                Agent Configuration

            </h1>

            <p className="text-center mb-10" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>

                Manage your {supervisorType === 'voice' ? 'voice' : 'chat'} agents (max 3)
            </p>



            {loading ? (

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>

                    <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--text-main)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />

                </div>

            ) : (

                <div className="voice-agents-container">

                    <div className="voice-agents-grid">

                        {agents.filter((a) => a.agent_type === supervisorType).map((agent, index) => (

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



            <AgentFormModal

                open={addModalOpen}

                title={`Add New ${supervisorType === 'voice' ? 'Voice' : 'Chat'} Agent`}

                {...formModalProps}

                onSubmit={handleAddSubmit}

                onClose={() => setAddModalOpen(false)}

                submitLabel="Add Agent"

            />

            <AgentFormModal

                open={editModalOpen}

                title="Edit Agent"

                {...formModalProps}

                onSubmit={handleEditSubmit}

                onClose={() => { setEditModalOpen(false); setSelectedAgent(null); }}

                submitLabel="Save Changes"

                isEdit

                existingAgentId={selectedAgent?.id}

            />

            <DeleteConfirmModal

                open={deleteModalOpen}

                onClose={() => { setDeleteModalOpen(false); setSelectedAgent(null); agentToDeleteRef.current = null; }}

                onConfirm={handleDeleteConfirm}

                itemName={selectedAgent?.name || ''}

                isDeleting={saving}

            />

        </div>

    );

};



export default AgentConfiguration;

