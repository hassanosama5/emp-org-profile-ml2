import api from '../client';
import { TaxRule, CreateTaxRuleDto, UpdateTaxRuleDto } from './types';

const BASE_URL = '/payroll-configuration/tax-rules';

export const taxRulesApi = {
  getAll: async (status?: 'draft' | 'approved' | 'rejected'): Promise<TaxRule[]> => {
    try {
      const params = status ? { status } : undefined;
      const response = await api.get(BASE_URL, params ? { params } : {}) as any;
      // Response interceptor already extracts response.data, so response is already the data
      let rules = Array.isArray(response) ? response : (response?.items || response?.data || []);
      return rules;
    } catch (error) {
      console.error('Error fetching tax rules:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<TaxRule> => {
    try {
      const response = await api.get(`${BASE_URL}/${id}`) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error fetching tax rule ${id}:`, error);
      throw error;
    }
  },

  create: async (data: CreateTaxRuleDto): Promise<TaxRule> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {
        name: String(data.name).trim(),
        rate: Number(data.rate),
      };
      // Only include description if provided
      if (data.description !== undefined && data.description !== null && String(data.description).trim()) {
        payload.description = String(data.description).trim();
      }
      console.log('API: Sending tax rule payload:', payload);
      const response = await api.post(BASE_URL, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error('Error creating tax rule:', error);
      throw error;
    }
  },

  update: async (id: string, data: UpdateTaxRuleDto): Promise<TaxRule> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {};
      if (data.name !== undefined) {
        payload.name = String(data.name).trim();
      }
      if (data.rate !== undefined) {
        payload.rate = Number(data.rate);
      }
      if (data.description !== undefined && data.description !== null && String(data.description).trim()) {
        payload.description = String(data.description).trim();
      }
      console.log('API: Sending tax rule update payload:', payload);
      const response = await api.put(`${BASE_URL}/${id}`, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error updating tax rule ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      console.error(`Error deleting tax rule ${id}:`, error);
      throw error;
    }
  },
};

// Export individual functions for backward compatibility
export const getTaxRules = taxRulesApi.getAll;
export const getTaxRuleById = taxRulesApi.getById;
export const createTaxRule = taxRulesApi.create;
export const updateTaxRule = taxRulesApi.update;
export const deleteTaxRule = taxRulesApi.delete;