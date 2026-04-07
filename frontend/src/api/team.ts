import apiClient from './client';
import { TeamMember } from '../types';

export const teamApi = {
  list: async () => {
    const { data } = await apiClient.get<TeamMember[]>('/team');
    return data;
  },

  invite: async (email: string, name: string, role: string, password?: string) => {
    const { data } = await apiClient.post<TeamMember>('/team/invite', { email, name, role, password });
    return data;
  },

  updateRole: async (memberId: string, role: string) => {
    const { data } = await apiClient.patch<TeamMember>(`/team/${memberId}/role`, { role });
    return data;
  },

  remove: async (memberId: string) => {
    await apiClient.delete(`/team/${memberId}`);
  }
};
