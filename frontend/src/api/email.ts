import apiClient from './client';

export const emailApi = {
  draft: async (resumeId: string, stage?: string, extraContext?: string) => {
    const { data } = await apiClient.post<{ subject: string; body: string }>('/email/draft', {
      resumeId,
      stage,
      extraContext
    });
    return data;
  },

  send: async (to: string, subject: string, body: string, resumeId?: string) => {
    const { data } = await apiClient.post('/email/send', { to, subject, body, resumeId });
    return data;
  },

  getTemplates: async () => {
    const { data } = await apiClient.get('/email/templates');
    return data;
  }
};
