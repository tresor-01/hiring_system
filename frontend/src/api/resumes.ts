import apiClient from './client';
import { Resume } from '../types';

export const resumesApi = {
  listByJob: async (jobId: string) => {
    const { data } = await apiClient.get<Resume[]>(`/resumes/job/${jobId}`);
    return data;
  },

  upload: async (jobId: string, files: File[], onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    files.forEach(f => formData.append('resumes', f));
    const { data } = await apiClient.post(`/resumes/job/${jobId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      }
    });
    return data;
  },

  matchAll: async (jobId: string) => {
    const { data } = await apiClient.post(`/resumes/job/${jobId}/match-all`);
    return data;
  },

  get: async (id: string) => {
    const { data } = await apiClient.get<Resume>(`/resumes/${id}`);
    return data;
  }
};
