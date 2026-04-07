import apiClient from './client';
import { Stage, Note } from '../types';

export const applicationsApi = {
  updateStage: async (resumeId: string, stage: Stage) => {
    const { data } = await apiClient.patch(`/applications/${resumeId}/stage`, { stage });
    return data;
  },

  addNote: async (resumeId: string, content: string, starRating?: number) => {
    const { data } = await apiClient.post<Note>(`/applications/${resumeId}/notes`, { content, starRating });
    return data;
  },

  deleteNote: async (resumeId: string, noteId: string) => {
    await apiClient.delete(`/applications/${resumeId}/notes/${noteId}`);
  },

  setTags: async (resumeId: string, tagNames: string[], companyId: string) => {
    const { data } = await apiClient.post(`/applications/${resumeId}/tags`, { tagNames, companyId });
    return data;
  },

  getActivity: async (resumeId: string) => {
    const { data } = await apiClient.get(`/applications/${resumeId}/activity`);
    return data;
  }
};
