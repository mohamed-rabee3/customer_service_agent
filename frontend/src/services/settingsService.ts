// src/services/settingsService.ts
import api from './api';

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (settings: Record<string, any>) => api.patch('/settings', { settings }),
};
