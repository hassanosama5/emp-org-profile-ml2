import api from '../client';
import { TerminationBenefit, CreateTerminationBenefitDto, UpdateTerminationBenefitDto } from './types';

const BASE_URL = '/payroll-configuration/termination-benefits';

export const terminationBenefitsApi = {
  getAll: async (status?: 'draft' | 'approved' | 'rejected'): Promise<TerminationBenefit[]> => {
    try {
      const params = status ? { status } : undefined;
      const response = await api.get(BASE_URL, params ? { params } : {}) as any;
      // Response interceptor already extracts response.data, so response is already the data
      let benefits = Array.isArray(response) ? response : (response?.items || response?.data || []);
      return benefits;
    } catch (error) {
      console.error('Error fetching termination benefits:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<TerminationBenefit> => {
    try {
      const response = await api.get(`${BASE_URL}/${id}`) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error fetching termination benefit ${id}:`, error);
      throw error;
    }
  },

  create: async (data: CreateTerminationBenefitDto): Promise<TerminationBenefit> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {
        name: String(data.name).trim(),
        amount: Number(data.amount),
      };
      // Only include terms if provided
      if (data.terms !== undefined && data.terms !== null && String(data.terms).trim()) {
        payload.terms = String(data.terms).trim();
      }
      console.log('API: Sending termination benefit payload:', payload);
      const response = await api.post(BASE_URL, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error('Error creating termination benefit:', error);
      throw error;
    }
  },

  update: async (id: string, data: UpdateTerminationBenefitDto): Promise<TerminationBenefit> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {};
      if (data.name !== undefined) {
        payload.name = String(data.name).trim();
      }
      if (data.amount !== undefined) {
        payload.amount = Number(data.amount);
      }
      if (data.terms !== undefined && data.terms !== null && String(data.terms).trim()) {
        payload.terms = String(data.terms).trim();
      }
      console.log('API: Sending termination benefit update payload:', payload);
      const response = await api.put(`${BASE_URL}/${id}`, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error updating termination benefit ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      console.error(`Error deleting termination benefit ${id}:`, error);
      throw error;
    }
  },
};

// Export individual functions for backward compatibility
export const getTerminationBenefits = terminationBenefitsApi.getAll;
export const getTerminationBenefitById = terminationBenefitsApi.getById;
export const createTerminationBenefit = terminationBenefitsApi.create;
export const updateTerminationBenefit = terminationBenefitsApi.update;
export const deleteTerminationBenefit = terminationBenefitsApi.delete;
