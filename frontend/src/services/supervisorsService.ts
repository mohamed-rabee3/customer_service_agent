// src/services/supervisorsService.ts
import api from './api';

export const supervisorsAPI = {
  create: (data: {
    email: string;
    password: string;
    name: string;
    supervisor_type: 'voice' | 'chat';
  }) => api.post('/supervisors', data),

  getAll: (page?: number, limit?: number, type?: string, search?: string) => 
    api.get('/supervisors', { params: { 
      page, 
      limit, 
      supervisor_type: type === 'all' ? undefined : type, 
      search 
    } }),

  getById: (id: string) => api.get(`/supervisors/${id}`),

  update: (id: string, data: Partial<{
    name?: string;
    email?: string;
    supervisor_type: 'voice' | 'chat';
  }>) => api.put(`/supervisors/${id}`, data),

  delete: (id: string) => api.delete(`/supervisors/${id}`),

  getMyDashboard: () => api.get('/supervisors/me/dashboard'),
};