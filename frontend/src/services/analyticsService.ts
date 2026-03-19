// src/services/analyticsService.ts
import api from './api';

export const analyticsAPI = {
  getByAgent: (agentId: string) =>
    api.get(`/analytics/agent/${agentId}`),

  getBySupervisor: (supervisorId: string) =>
    api.get(`/analytics/supervisor/${supervisorId}`),
};
