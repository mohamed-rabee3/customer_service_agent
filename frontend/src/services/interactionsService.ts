// src/services/interactionsService.ts
import api from './api';

export const interactionsAPI = {
  getAll: () =>
    api.get('/interactions/'),

  getById: (id: string) =>
    api.get(`/interactions/${id}`),

  updateStatus: (id: string, data: { status: string }) =>
    api.patch(`/interactions/${id}`, data),
};
