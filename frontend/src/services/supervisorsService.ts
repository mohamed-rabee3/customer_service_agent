// src/services/supervisorsService.ts
import api from './api';

export const supervisorsAPI = {
  create: (data: {
    email: string;
    password: string;
    supervisor_type: 'voice' | 'chat';
  }) => api.post('/supervisors', data),

  getAll: () => api.get('/supervisors'),

  getById: (id: string) => api.get(`/supervisors/${id}`),

  update: (id: string, data: Partial<{
    supervisor_type: 'voice' | 'chat';
  }>) => api.put(`/supervisors/${id}`, data),

  delete: (id: string) => api.delete(`/supervisors/${id}`),

  getMyDashboard: () => api.get('/supervisors/me/dashboard'),
};