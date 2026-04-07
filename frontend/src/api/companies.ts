import apiClient from './client';
import { Company } from '../types';

export const companiesApi = {
  list: async () => {
    const { data } = await apiClient.get<Company[]>('/companies');
    return data;
  },

  get: async (id: string) => {
    const { data } = await apiClient.get<Company>(`/companies/${id}`);
    return data;
  },

  create: async (name: string, plan?: string) => {
    const { data } = await apiClient.post<Company>('/companies', { name, plan });
    return data;
  },

  update: async (id: string, payload: Partial<Company>) => {
    const { data } = await apiClient.patch<Company>(`/companies/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/companies/${id}`);
  },

  regenerateApiKey: async (id: string) => {
    const { data } = await apiClient.post<{ apiKey: string }>(`/companies/${id}/regenerate-api-key`);
    return data;
  }
};
