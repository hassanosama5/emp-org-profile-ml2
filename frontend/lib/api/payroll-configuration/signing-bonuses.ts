import api from '../client';
import { SigningBonus, CreateSigningBonusDto, UpdateSigningBonusDto } from './types';

const BASE_URL = '/payroll-configuration/signing-bonuses';

export const signingBonusesApi = {
  getAll: async (status?: 'draft' | 'approved' | 'rejected'): Promise<SigningBonus[]> => {
    try {
      const params = status ? { status } : undefined;
      const response = await api.get(BASE_URL, params ? { params } : {}) as any;
      // Response interceptor already extracts response.data, so response is already the data
      let bonuses = Array.isArray(response) ? response : (response?.items || response?.data || []);
      return bonuses;
    } catch (error) {
      console.error('Error fetching signing bonuses:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<SigningBonus> => {
    try {
      const response = await api.get(`${BASE_URL}/${id}`) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error fetching signing bonus ${id}:`, error);
      throw error;
    }
  },

  create: async (data: CreateSigningBonusDto): Promise<SigningBonus> => {
    try {
      // Validate input
      const positionName = String(data.positionName || '').trim();
      const amount = parseFloat(String(data.amount || 0));
      
      if (!positionName) {
        throw new Error('Position name is required');
      }
      if (isNaN(amount) || amount < 0) {
        throw new Error('Amount must be a valid non-negative number');
      }
      
      // Explicitly create payload with only allowed fields
      const payload = {
        positionName: positionName,
        amount: amount,
      };
      console.log('API: Sending signing bonus payload:', payload);
      console.log('Payload types:', { positionName: typeof payload.positionName, amount: typeof payload.amount });
      const response = await api.post(BASE_URL, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error: any) {
      console.error('Error creating signing bonus:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create signing bonus';
      throw new Error(errorMessage);
    }
  },

  update: async (id: string, data: UpdateSigningBonusDto): Promise<SigningBonus> => {
    try {
      // Explicitly create payload with only allowed fields
      const payload: any = {};
      if (data.positionName !== undefined) {
        payload.positionName = String(data.positionName).trim();
      }
      if (data.amount !== undefined) {
        payload.amount = Number(data.amount);
      }
      console.log('API: Sending signing bonus update payload:', payload);
      const response = await api.put(`${BASE_URL}/${id}`, payload) as any;
      // Response interceptor already extracts response.data
      return response;
    } catch (error) {
      console.error(`Error updating signing bonus ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      console.error(`Error deleting signing bonus ${id}:`, error);
      throw error;
    }
  },
};

// Export individual functions for backward compatibility
export const getSigningBonuses = signingBonusesApi.getAll;
export const getSigningBonusById = signingBonusesApi.getById;
export const createSigningBonus = signingBonusesApi.create;
export const updateSigningBonus = signingBonusesApi.update;
export const deleteSigningBonus = signingBonusesApi.delete;