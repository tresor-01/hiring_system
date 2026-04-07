import axios from 'axios';
import { PortalData } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const portalApi = {
  get: async (token: string): Promise<PortalData> => {
    const { data } = await axios.get(`${API_URL}/api/portal/${token}`);
    return data;
  },

  submitFeedback: async (token: string, candidateId: string, feedback: 'APPROVED' | 'REJECTED' | 'COMMENT', comment?: string) => {
    const { data } = await axios.post(`${API_URL}/api/portal/${token}/feedback`, {
      candidateId,
      feedback,
      comment
    });
    return data;
  }
};
