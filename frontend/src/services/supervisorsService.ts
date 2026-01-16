// src/services/supervisorsService.ts
import api from './api';

export const supervisorsAPI = {
  create: (data: {
    name: string;
    email: string;
    type: 'voice' | 'chat';
    password?: string;
  }) => api.post('/supervisors', data),
  // Get all supervisors (for archive table)
  getAll: () => api.get('/supervisors'),

  // Update supervisor
  update: (id: number, data: Partial<{
    name: string;
    email: string;
    type: 'voice' | 'chat';
  }>) => api.put(`/supervisors/${id}`, data),

  // Delete supervisor
  delete: (id: number) => api.delete(`/supervisors/${id}`),
};