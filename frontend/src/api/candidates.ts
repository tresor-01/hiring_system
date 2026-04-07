import apiClient from './client';
import { Candidate } from '../types';

export const candidatesApi = {
  list: async (params?: { search?: string; location?: string; companyId?: string; page?: number }) => {
    const { data } = await apiClient.get('/candidates', { params });
    return data as { candidates: Candidate[]; total: number; page: number; pages: number };
  },

  talentPool: async (companyId?: string) => {
    const { data } = await apiClient.get('/candidates/talent-pool', { params: { companyId } });
    return data as Candidate[];
  },

  get: async (id: string) => {
    const { data } = await apiClient.get<Candidate>(`/candidates/${id}`);
    return data;
  },

  rematch: async (candidateIds: string[], jobId: string) => {
    const { data } = await apiClient.post('/candidates/rematch', { candidateIds, jobId });
    return data;
  },

  checkDuplicates: async (companyId: string) => {
    const { data } = await apiClient.post('/candidates/check-duplicates', { companyId });
    return data;
  }
};
