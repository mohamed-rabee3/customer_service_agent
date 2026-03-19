// src/services/agentsService.ts
import api from './api';

export interface AgentPayload {
  name: string;
  system_prompt?: string;
}

export const agentsAPI = {
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
