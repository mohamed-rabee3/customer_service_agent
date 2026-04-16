// src/services/agentsService.ts
import api from './api';

export interface WebhookConfigs {
  telegram?: {
    enabled: boolean;
    bot_token?: string;
  };
  whatsapp?: {
    enabled: boolean;
    phone_number?: string;
    api_token?: string;
    provider?: 'twilio' | 'meta';
  };
  instagram?: {
    enabled: boolean;
    business_account_id?: string;
    api_token?: string;
  };
}

export interface AgentPayload {
  name: string;
  agent_type?: 'voice' | 'chat';
  system_prompt?: string;
  telegram_bot_token?: string;
  webhook_configs?: WebhookConfigs;
  status?: 'idle' | 'paused' | 'in_chat' | 'in_call';
}

export const agentsAPI = {
  getAll: (agentType?: string) =>
    api.get(`/agents${agentType ? `?agent_type=${agentType}` : ''}`),

  create: (data: AgentPayload) =>
    api.post('/agents', data),

  getById: (id: string) =>
    api.get(`/agents/${id}`),

  getStatus: (id: string) =>
    api.get(`/agents/${id}/status`),

  update: (id: string, data: Partial<AgentPayload>) =>
    api.put(`/agents/${id}`, data),

  delete: (id: string) =>
    api.delete(`/agents/${id}`),
};
