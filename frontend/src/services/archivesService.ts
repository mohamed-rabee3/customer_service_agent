// src/services/archivesService.ts
import api from './api';

export const archivesAPI = {
  getAll: () =>
    api.get('/archives/'),

  getById: (id: string) =>
    api.get(`/archives/${id}`),
};
