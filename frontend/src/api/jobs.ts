import apiClient from './client';
import { Job, Resume } from '../types';

export const jobsApi = {
  list: async (companyId?: string, status?: string) => {
    const params: any = {};
    if (companyId) params.companyId = companyId;
    if (status) params.status = status;
    const { data } = await apiClient.get<Job[]>('/jobs', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await apiClient.get<Job>(`/jobs/${id}`);
    return data;
  },

  create: async (payload: { title: string; description?: string; companyId?: string }) => {
    const { data } = await apiClient.post<Job>('/jobs', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Job>) => {
    const { data } = await apiClient.patch<Job>(`/jobs/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/jobs/${id}`);
  },

  uploadJD: async (id: string, formData: FormData) => {
    const { data } = await apiClient.post(`/jobs/${id}/upload-jd`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  checkQuality: async (id: string) => {
    const { data } = await apiClient.post(`/jobs/${id}/check-quality`);
    return data;
  },

  getPipeline: async (id: string): Promise<Record<string, Resume[]>> => {
    const { data } = await apiClient.get(`/jobs/${id}/pipeline`);
    return data;
  }
};
