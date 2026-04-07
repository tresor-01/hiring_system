import apiClient from './client';

export const aiApi = {
  generateShortlist: async (jobId: string, targetCount: number) => {
    const { data } = await apiClient.post('/ai/shortlist', { jobId, targetCount });
    return data;
  },

  compare: async (resumeIds: string[], jobId: string) => {
    const { data } = await apiClient.post('/ai/compare', { resumeIds, jobId });
    return data;
  },

  interviewQuestions: async (resumeId: string, jobId: string) => {
    const { data } = await apiClient.post('/ai/interview-questions', { resumeId, jobId });
    return data;
  },

  biasCheck: async (jobId: string) => {
    const { data } = await apiClient.post('/ai/bias-check', { jobId });
    return data;
  }
};
