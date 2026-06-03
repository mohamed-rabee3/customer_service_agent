// src/services/archivesService.ts
import api from './api';

export const archivesAPI = {
  getAll: (page?: number, limit?: number, agentId?: string) =>
    api.get('/archives/', { params: { page, limit, agent_id: agentId } }),

  getById: (id: string) =>
    api.get(`/archives/${id}`),
};
