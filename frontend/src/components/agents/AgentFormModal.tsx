import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import Icon from '../Icon';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { agentsAPI, type KnowledgeDocument } from '@/services/agentsService';

interface WebhookConfigs {
    telegram?: { enabled: boolean; bot_token?: string };
    whatsapp?: { enabled: boolean; phone_number?: string; api_token?: string; provider?: 'twilio' | 'meta' };
    instagram?: { enabled: boolean; business_account_id?: string; api_token?: string };
}

type AgentStatus = 'idle' | 'in_call' | 'in_chat' | 'paused';

const AGENT_STATUS_OPTIONS: { value: AgentStatus; label: string }[] = [
    { value: 'idle', label: 'Idle (Active)' },
    { value: 'paused', label: 'Paused (Suspended)' },
    { value: 'in_call', label: 'In Call' },
    { value: 'in_chat', label: 'In Chat' },
];

interface FormModalProps {
    open: boolean;
    title: string;
    formData: { 
        name: string; 
        system_prompt: string; 
        telegram_bot_token?: string; 
        agent_type?: 'voice' | 'chat';
        status?: AgentStatus;
        webhook_configs?: WebhookConfigs;
    };
    onChange: (data: FormModalProps['formData']) => void;
    onSubmit: () => void;
    onClose: () => void;
    submitLabel: string;
    loading?: boolean;
    existingAgentId?: string;
    showAgentTypeField?: boolean;
    showStatusField?: boolean;
    isEdit?: boolean;
    knowledgeDocuments?: KnowledgeDocument[];
    onKnowledgeChange?: () => void;
}

const MAX_KB_FILE_BYTES = 256 * 1024;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AgentFormModal: React.FC<FormModalProps> = ({
    open, title, formData, onChange, onSubmit, onClose, submitLabel, loading,
    existingAgentId, showAgentTypeField, showStatusField, isEdit,
    knowledgeDocuments = [], onKnowledgeChange,
}) => {
    const [animState, setAnimState] = useState<'entering' | 'exiting' | ''>('');
    const [activeTab, setActiveTab] = useState<'basic' | 'knowledge' | 'telegram' | 'whatsapp' | 'instagram'>('basic');
    const [knowledgeBusy, setKnowledgeBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) setAnimState('entering');
        else setAnimState('');
    }, [open]);

    const handleClose = () => {
        if (loading) return;
        setAnimState('exiting');
        setTimeout(() => {
            onClose();
            setAnimState('');
        }, 300);
    };

    const getWebhookConfigs = (): WebhookConfigs => formData.webhook_configs || {};

    const updateWebhookConfig = (channel: keyof WebhookConfigs, updates: any) => {
        const configs = getWebhookConfigs();
        onChange({
            ...formData,
            webhook_configs: {
                ...configs,
                [channel]: { ...configs[channel], ...updates }
            }
        });
    };

    if (!open && animState !== 'exiting') return null;

    const isChatAgent = (formData.agent_type ?? 'chat') === 'chat';
    const statusOptions = isEdit
        ? AGENT_STATUS_OPTIONS
        : AGENT_STATUS_OPTIONS.filter((o) => o.value === 'idle' || o.value === 'paused');
    const statusLocked = isEdit && (formData.status === 'in_call' || formData.status === 'in_chat');
    const knowledgeLocked = statusLocked;

    const getApiErrorMessage = (err: unknown, fallback: string): string => {
        const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        if (typeof detail === 'string' && detail.trim()) return detail;
        return fallback;
    };

    const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !existingAgentId) return;

        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.md') && !ext.endsWith('.markdown')) {
            toast.warn('Only .md and .markdown files are allowed');
            return;
        }
        if (file.size > MAX_KB_FILE_BYTES) {
            toast.warn('File exceeds 256 KB limit');
            return;
        }

        setKnowledgeBusy(true);
        try {
            await agentsAPI.uploadKnowledge(existingAgentId, file);
            toast.success('Document uploaded');
            onKnowledgeChange?.();
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to upload document'));
        } finally {
            setKnowledgeBusy(false);
        }
    };

    const handleKnowledgeDelete = async (docId: string) => {
        if (!existingAgentId || knowledgeLocked) return;
        setKnowledgeBusy(true);
        try {
            await agentsAPI.deleteKnowledge(existingAgentId, docId);
            toast.success('Document removed');
            onKnowledgeChange?.();
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to delete document'));
        } finally {
            setKnowledgeBusy(false);
        }
    };

    const tabs = [
        { id: 'basic' as const, label: 'Basic', icon: 'file-lines' as IconProp, color: 'var(--text-muted)' },
        { id: 'knowledge' as const, label: 'Knowledge', icon: 'book' as IconProp, color: '#8B5CF6' },
        ...(isChatAgent
            ? [
                { id: 'telegram' as const, label: 'Telegram', icon: ['fab', 'telegram'] as IconProp, color: '#0088cc' },
                { id: 'whatsapp' as const, label: 'WhatsApp', icon: ['fab', 'whatsapp'] as IconProp, color: '#25D366' },
                { id: 'instagram' as const, label: 'Instagram', icon: ['fab', 'instagram'] as IconProp, color: '#E1306C' },
            ]
            : []),
    ];

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

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 modal-stagger-2 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2"
                            style={{
                                backgroundColor: activeTab === tab.id ? (tab.id === 'basic' ? 'var(--primary)' : tab.color) : 'var(--bg-dark)',
                                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                border: `1px solid ${activeTab === tab.id ? (tab.id === 'basic' ? 'var(--primary)' : tab.color) : 'var(--border)'}`,
                                boxShadow: activeTab === tab.id ? `0 4px 12px ${tab.color}44` : 'none',
                            }}
                        >
                            <Icon icon={tab.icon} size="sm" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-4 modal-stagger-2">
                    {/* Basic Tab */}
                    {activeTab === 'basic' && (
                        <>
                            {showAgentTypeField && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Agent Type</label>
                                    <select
                                        value={formData.agent_type || 'voice'}
                                        onChange={(e) => onChange({ ...formData, agent_type: e.target.value as 'voice' | 'chat' })}
                                        className="w-full px-4 py-3 rounded-xl border outline-none"
                                        style={{
                                            backgroundColor: 'var(--bg-dark)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-main)',
                                        }}
                                    >
                                        <option value="voice">Voice Agent</option>
                                        <option value="chat">Chat Agent</option>
                                    </select>
                                </div>
                            )}
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
                            {showStatusField && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
                                    <select
                                        value={formData.status ?? 'idle'}
                                        onChange={(e) => onChange({ ...formData, status: e.target.value as AgentStatus })}
                                        disabled={statusLocked}
                                        className="w-full px-4 py-3 rounded-xl border outline-none"
                                        style={{
                                            backgroundColor: 'var(--bg-dark)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-main)',
                                        }}
                                    >
                                        {statusOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    {statusLocked && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            Status cannot be changed while the agent is in an active session.
                                        </p>
                                    )}
                                </div>
                            )}
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
                        </>
                    )}

                    {/* Knowledge Base Tab */}
                    {activeTab === 'knowledge' && (
                        <>
                            {!existingAgentId ? (
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    Save the agent first, then add knowledge base documents here.
                                </p>
                            ) : (
                                <>
                                    <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                                        Upload markdown files (.md). Content is injected into the agent prompt when a new session starts.
                                        Max 10 files, 256 KB each, 1 MB total.
                                    </p>
                                    {knowledgeLocked && (
                                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                            Knowledge base cannot be changed while the agent is in an active session.
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".md,.markdown,text/markdown"
                                            className="hidden"
                                            onChange={handleKnowledgeUpload}
                                            disabled={knowledgeLocked || knowledgeBusy}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={knowledgeLocked || knowledgeBusy}
                                            className="agent-config-btn agent-config-btn--save flex items-center gap-2"
                                            style={{ opacity: knowledgeLocked || knowledgeBusy ? 0.5 : 1 }}
                                        >
                                            <Upload size={15} />
                                            {knowledgeBusy ? 'Processing...' : 'Upload Markdown'}
                                        </button>
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {knowledgeDocuments.length} doc{knowledgeDocuments.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {knowledgeDocuments.length === 0 ? (
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                            No documents uploaded yet.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {knowledgeDocuments.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between px-4 py-3 rounded-xl border"
                                                    style={{
                                                        backgroundColor: 'var(--bg-dark)',
                                                        borderColor: 'var(--border)',
                                                    }}
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                                            {doc.filename}
                                                        </p>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {formatFileSize(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleKnowledgeDelete(doc.id)}
                                                        disabled={knowledgeLocked || knowledgeBusy}
                                                        className="p-2 rounded-lg transition-colors"
                                                        style={{
                                                            color: 'var(--text-muted)',
                                                            opacity: knowledgeLocked || knowledgeBusy ? 0.4 : 1,
                                                        }}
                                                        title="Delete document"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Telegram Tab */}
                    {activeTab === 'telegram' && (
                        <>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={getWebhookConfigs().telegram?.enabled || false}
                                        onChange={(e) => updateWebhookConfig('telegram', { enabled: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                        Enable Telegram
                                    </label>
                                </div>
                            </div>
                            {getWebhookConfigs().telegram?.enabled && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
                                            Bot Token
                                        </label>
                                        <input
                                            type="text"
                                            value={getWebhookConfigs().telegram?.bot_token || ''}
                                            onChange={(e) => updateWebhookConfig('telegram', { bot_token: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border outline-none"
                                            style={{
                                                backgroundColor: 'var(--bg-dark)',
                                                borderColor: 'var(--border)',
                                                color: 'var(--text-main)',
                                            }}
                                            placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                        />
                                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                            💡 Get token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>@BotFather</a>
                                        </p>
                                    </div>
                                    {existingAgentId && formData.agent_type === 'chat' && (
                                        <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(84,119,146,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                            Webhook: <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>/v1/telegram/{existingAgentId}</code>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* WhatsApp Tab */}
                    {activeTab === 'whatsapp' && (
                        <>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={getWebhookConfigs().whatsapp?.enabled || false}
                                        onChange={(e) => updateWebhookConfig('whatsapp', { enabled: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                        Enable WhatsApp
                                    </label>
                                </div>
                            </div>
                            {getWebhookConfigs().whatsapp?.enabled && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Provider</label>
                                        <select
                                            value={getWebhookConfigs().whatsapp?.provider || 'twilio'}
                                            onChange={(e) => updateWebhookConfig('whatsapp', { provider: e.target.value as 'twilio' | 'meta' })}
                                            className="w-full px-4 py-3 rounded-xl border outline-none"
                                            style={{
                                                backgroundColor: 'var(--bg-dark)',
                                                borderColor: 'var(--border)',
                                                color: 'var(--text-main)',
                                            }}
                                        >
                                            <option value="twilio">Twilio</option>
                                            <option value="meta">Meta Business</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
                                        <input
                                            type="text"
                                            value={getWebhookConfigs().whatsapp?.phone_number || ''}
                                            onChange={(e) => updateWebhookConfig('whatsapp', { phone_number: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border outline-none"
                                            style={{
                                                backgroundColor: 'var(--bg-dark)',
                                                borderColor: 'var(--border)',
                                                color: 'var(--text-main)',
                                            }}
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>API Token</label>
                                        <input
                                            type="text"
                                            value={getWebhookConfigs().whatsapp?.api_token || ''}
                                            onChange={(e) => updateWebhookConfig('whatsapp', { api_token: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border outline-none"
                                            style={{
                                                backgroundColor: 'var(--bg-dark)',
                                                borderColor: 'var(--border)',
                                                color: 'var(--text-main)',
                                            }}
                                            placeholder="SID:TOKEN or ID:TOKEN"
                                        />
                                    </div>
                                    {existingAgentId && formData.agent_type === 'chat' && (
                                        <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(84,119,146,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                            Webhook: <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>/v1/whatsapp/{existingAgentId}</code>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Instagram Tab */}
                    {activeTab === 'instagram' && (
                        <>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={getWebhookConfigs().instagram?.enabled || false}
                                        onChange={(e) => updateWebhookConfig('instagram', { enabled: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                        Enable Instagram
                                    </label>
                                </div>
                            </div>
                            {getWebhookConfigs().instagram?.enabled && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Business Account ID</label>
                                        <input
                                            type="text"
                                            value={getWebhookConfigs().instagram?.business_account_id || ''}
                                            onChange={(e) => updateWebhookConfig('instagram', { business_account_id: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border outline-none"
                                            style={{
                                                backgroundColor: 'var(--bg-dark)',
                                                borderColor: 'var(--border)',
                                                color: 'var(--text-main)',
                                            }}
                                            placeholder="17841..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>API Token</label>
                                        <input
                                            type="text"
                                            value={getWebhookConfigs().instagram?.api_token || ''}
                                            onChange={(e) => updateWebhookConfig('instagram', { api_token: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border outline-none"
                                            style={{
                                                backgroundColor: 'var(--bg-dark)',
                                                borderColor: 'var(--border)',
                                                color: 'var(--text-main)',
                                            }}
                                            placeholder="EAA..."
                                        />
                                    </div>
                                    {existingAgentId && formData.agent_type === 'chat' && (
                                        <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(84,119,146,0.08)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                            Webhook: <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>/v1/instagram/{existingAgentId}</code>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
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

export default AgentFormModal;
