// src/services/chatService.ts
import api from './api';
import { supabase } from '../lib/supabase';

const API_BASE = 'http://localhost:8000/v1';

export const chatAPI = {
  /** POST /chat/sessions — Start a new chat session */
  startSession: (agentId: string) =>
    api.post('/chat/sessions', { agent_id: agentId }),

  /** POST /chat/sessions/{id}/messages — Send a message (returns SSE stream) */
  sendMessage: (sessionId: string, content: string) =>
    api.post(`/chat/sessions/${sessionId}/messages`, { content }),

  /** POST /chat/sessions/{id}/end — End a chat session */
  endSession: (sessionId: string) =>
    api.post(`/chat/sessions/${sessionId}/end`),

  /** POST /chat/sessions/{id}/whisper — Inject a supervisor instruction */
  whisper: (sessionId: string, content: string) =>
    api.post(`/chat/sessions/${sessionId}/whisper`, { content }),

  /** GET /chat/sessions/{id}/messages — Get message history */
  getMessages: (sessionId: string) =>
    api.get(`/chat/sessions/${sessionId}/messages`),

  /** GET /chat/sessions/active — List all active sessions */
  getActiveSessions: () =>
    api.get('/chat/sessions/active'),

  /**
   * Connect to the SSE stream for a chat session.
   * Returns an EventSource that emits message/whisper/metrics events.
   * Caller must close it when done: eventSource.close()
   */
  streamSession: async (sessionId: string): Promise<EventSource | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const url = `${API_BASE}/chat/sessions/${sessionId}/stream?token=${session.access_token}`;
    return new EventSource(url);
  },
};
