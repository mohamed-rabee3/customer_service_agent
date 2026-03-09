// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', //   لما يبقى عندك الـ backend URL الحقيقي
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor للـ token لو فيه authentication لاحقًا
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;