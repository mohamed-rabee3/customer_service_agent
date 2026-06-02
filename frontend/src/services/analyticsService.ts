// src/services/analyticsService.ts
import api from './api';

// ── Types ──

export interface AgentAnalyticsData {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  total_interactions: number;
  avg_handle_time: number;
  fcr_percentage: number;
  avg_csat: number;
  performance_score: number;
  sentiment_shift: number;
  containment_rate: number;
  avg_response_time: number;
  chat_resolution_rate: number;
  escalation_count: number;
  coaching_count: number;
}

export interface SupervisorAnalyticsData {
  performance_score: number;
  fcr_percentage: number;
  avg_csat: number;
  avg_handle_time: number;
  total_interactions: number;
  agents_breakdown: AgentAnalyticsData[];
  avg_sentiment_shift: number;
  containment_rate: number;
  avg_escalation_resolution_time: number;
  coaching_frequency: number;
  chat_avg_response_time: number;
  chat_resolution_rate: number;
  total_voice_interactions: number;
  total_chat_interactions: number;
}

export interface SupervisorSummaryData {
  supervisor_id: string;
  performance_score: number;
  total_interactions: number;
  avg_handle_time: number;
  avg_csat: number;
  fcr_percentage: number;
  containment_rate: number;
}

export interface AdminAnalyticsData {
  overall_csat: number;
  total_interactions: number;
  total_voice_interactions: number;
  total_chat_interactions: number;
  avg_handle_time: number;
  avg_fcr: number;
  containment_rate: number;
  avg_sentiment_shift: number;
  avg_escalation_resolution_time: number;
  coaching_frequency: number;
  chat_avg_response_time: number;
  chat_resolution_rate: number;
  performance_score: number;
  supervisors_breakdown: SupervisorSummaryData[];
  peak_interaction_hours: {
    hour: string;
    interactions: number;
  }[];
}

// ── API Calls ──

export type AnalyticsTimePeriod =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'month'
  | 'all_time';

export const analyticsAPI = {
  getByAgent: (agentId: string, timePeriod: AnalyticsTimePeriod = 'all_time') =>
    api.get<AgentAnalyticsData>(`/analytics/agent/${agentId}`, {
      params: { time_period: timePeriod },
    }),

  getBySupervisor: (supervisorId: string, timePeriod: AnalyticsTimePeriod = 'all_time') =>
    api.get<SupervisorAnalyticsData>(`/analytics/supervisor/${supervisorId}`, {
      params: { time_period: timePeriod },
    }),

  getAdminOverview: (timePeriod: AnalyticsTimePeriod = 'all_time') =>
    api.get<AdminAnalyticsData>(`/analytics/admin/overview`, {
      params: { time_period: timePeriod },
    }),
};
