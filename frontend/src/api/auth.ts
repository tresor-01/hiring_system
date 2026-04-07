import apiClient from './client';
import { User, Company } from '../types';

interface LoginResponse {
  token: string;
  user: User;
  company: Company | null;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data;
  },

  register: async (name: string, email: string, password: string, companyName?: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/register', { name, email, password, companyName });
    return data;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
  },

  me: async (): Promise<{ user: User; company: Company | null }> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  }
};
