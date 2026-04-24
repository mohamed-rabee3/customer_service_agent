// src/services/analyticsService.ts
import api from './api';

export const analyticsAPI = {
  getByAgent: (agentId: string, timePeriod = 'all_time') =>
    api.get(`/analytics/agent/${agentId}`, {
      params: { time_period: timePeriod },
    }),

  getBySupervisor: (supervisorId: string, timePeriod = 'all_time') =>
    api.get(`/analytics/supervisor/${supervisorId}`, {
      params: { time_period: timePeriod },
    }),
};
