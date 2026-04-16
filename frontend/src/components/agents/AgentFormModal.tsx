import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface WebhookConfigs {
    telegram?: { enabled: boolean; bot_token?: string };
    whatsapp?: { enabled: boolean; phone_number?: string; api_token?: string; provider?: 'twilio' | 'meta' };
    instagram?: { enabled: boolean; business_account_id?: string; api_token?: string };
}

interface FormModalProps {
    open: boolean;
    title: string;
    formData: { 
        name: string; 
        system_prompt: string; 
        telegram_bot_token?: string; 
        agent_type?: 'voice' | 'chat';
        webhook_configs?: WebhookConfigs;
    };
    onChange: (data: { 
        name: string; 
        system_prompt: string; 
        telegram_bot_token?: string; 
        agent_type?: 'voice' | 'chat';
        webhook_configs?: WebhookConfigs;
    }) => void;
    onSubmit: () => void;
    onClose: () => void;
    submitLabel: string;
    loading?: boolean;
    existingAgentId?: string;
    showAgentTypeField?: boolean;
}

const AgentFormModal: React.FC<FormModalProps> = ({ open, title, formData, onChange, onSubmit, onClose, submitLabel, loading, existingAgentId, showAgentTypeField }) => {
    const [animState, setAnimState] = useState<'entering' | 'exiting' | ''>('');
    const [activeTab, setActiveTab] = useState<'basic' | 'telegram' | 'whatsapp' | 'instagram'>('basic');

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
                    {['basic', 'telegram', 'whatsapp', 'instagram'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
                            style={{
                                backgroundColor: activeTab === tab ? 'var(--primary)' : 'var(--bg-dark)',
                                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                                border: `1px solid ${activeTab === tab ? 'var(--primary)' : 'var(--border)'}`,
                            }}
                        >
                            {tab === 'basic' && '📝 Basic'}
                            {tab === 'telegram' && '📤 Telegram'}
                            {tab === 'whatsapp' && '📱 WhatsApp'}
                            {tab === 'instagram' && '📸 Instagram'}
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
