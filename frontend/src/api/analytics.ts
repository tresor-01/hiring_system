import apiClient from './client';
import { AnalyticsDashboard } from '../types';

export const analyticsApi = {
  dashboard: async (companyId?: string) => {
    const { data } = await apiClient.get<AnalyticsDashboard>('/analytics/dashboard', {
      params: companyId ? { companyId } : {}
    });
    return data;
  },

  jobStats: async (jobId: string) => {
    const { data } = await apiClient.get(`/analytics/jobs/${jobId}`);
    return data;
  }
};
