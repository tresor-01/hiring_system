import apiClient from './client';
import { BillingUsage } from '../types';

export const billingApi = {
  usage: async (companyId?: string) => {
    const { data } = await apiClient.get<BillingUsage>('/billing/usage', {
      params: companyId ? { companyId } : {}
    });
    return data;
  },

  invoice: async (month: string) => {
    const { data } = await apiClient.get(`/billing/invoice/${month}`);
    return data;
  }
};
