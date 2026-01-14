// src/services/issuesService.ts
import api from './api';

export const issuesAPI = {
  // جلب كل الـ issues مع فلاتر (agent, date, search)
  getAll: (params?: {
    agent?: string;
    date?: string;
    search?: string;
  }) => api.get('/issues', { params }),

  // لو عايزة تفاصيل issue واحدة (اختياري دلوقتي)
  getById: (id: string) => api.get(`/issues/${id}`),
};