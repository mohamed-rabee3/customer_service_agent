// src/services/api.ts
import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: 'http://localhost:8000/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Global response interceptor for 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Don't trigger global logout if it's just an analytics widget failing
      if (error.config?.url?.includes('/analytics/')) {
        return Promise.reject(error);
      }
      
      // Dispatch a custom event so AuthContext can handle the React state/routing
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;