// src/services/adminService.ts
import api from './api';

export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),
};
