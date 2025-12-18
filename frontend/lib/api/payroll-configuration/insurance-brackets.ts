import api from '../client';
import { InsuranceBracket, CreateInsuranceBracketDto, UpdateInsuranceBracketDto, ApprovalDto, RejectionDto } from './types';

const BASE_URL = '/payroll-configuration/insurance-brackets';

export const insuranceBracketsApi = {
  getAll: async (params?: { status?: string }): Promise<InsuranceBracket[]> => {
    try {
      const response = await api.get(BASE_URL, params ? { params } : {}) as any;
      // Response interceptor already extracts response.data, so response is already the data
      let brackets = Array.isArray(response) ? response : (response?.items || response?.data || []);
      return brackets;
    } catch (error) {
      console.error('Error fetching insurance brackets:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<InsuranceBracket> => {
    try {
      const response = await api.get(`${BASE_URL}/${id}`) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error fetching insurance bracket ${id}:`, error);
      throw error;
    }
  },

  create: async (data: CreateInsuranceBracketDto): Promise<InsuranceBracket> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {
        name: String(data.name).trim(),
        minSalary: Number(data.minSalary),
        maxSalary: Number(data.maxSalary),
        employeeRate: Number(data.employeeRate),
        employerRate: Number(data.employerRate),
      };
      // Only include amount if provided
      if (data.amount !== undefined && data.amount !== null) {
        payload.amount = Number(data.amount);
      }
      console.log('API: Sending insurance bracket payload:', payload);
      const response = await api.post(BASE_URL, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error('Error creating insurance bracket:', error);
      throw error;
    }
  },

  update: async (id: string, data: UpdateInsuranceBracketDto): Promise<InsuranceBracket> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {};
      if (data.name !== undefined) {
        payload.name = String(data.name).trim();
      }
      if (data.minSalary !== undefined) {
        payload.minSalary = Number(data.minSalary);
      }
      if (data.maxSalary !== undefined) {
        payload.maxSalary = Number(data.maxSalary);
      }
      if (data.employeeRate !== undefined) {
        payload.employeeRate = Number(data.employeeRate);
      }
      if (data.employerRate !== undefined) {
        payload.employerRate = Number(data.employerRate);
      }
      if (data.amount !== undefined && data.amount !== null) {
        payload.amount = Number(data.amount);
      }
      console.log('API: Sending insurance bracket update payload:', payload);
      const response = await api.put(`${BASE_URL}/${id}`, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error updating insurance bracket ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      console.error(`Error deleting insurance bracket ${id}:`, error);
      throw error;
    }
  },

  approve: async (id: string, data?: ApprovalDto): Promise<void> => {
    try {
      await api.post(`${BASE_URL}/${id}/approve`, data || {});
    } catch (error) {
      console.error(`Error approving insurance bracket ${id}:`, error);
      throw error;
    }
  },

  reject: async (id: string, data: RejectionDto): Promise<void> => {
    try {
      await api.post(`${BASE_URL}/${id}/reject`, data);
    } catch (error) {
      console.error(`Error rejecting insurance bracket ${id}:`, error);
      throw error;
    }
  },
};

// Export individual functions for backward compatibility
export const getInsuranceBrackets = insuranceBracketsApi.getAll;
export const getInsuranceBracketById = insuranceBracketsApi.getById;
export const createInsuranceBracket = insuranceBracketsApi.create;
export const updateInsuranceBracket = insuranceBracketsApi.update;
export const deleteInsuranceBracket = insuranceBracketsApi.delete;