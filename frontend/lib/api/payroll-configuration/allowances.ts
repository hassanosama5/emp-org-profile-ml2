import { Allowance } from './types';
import api from '../client';

// Helper function to extract user name from user object
const extractUserName = (user: any): string => {
  if (!user) return '';
  if (typeof user === 'string') return user;
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.fullName) return user.fullName;
  if (user.email) return user.email;
  if (user.employeeNumber) return user.employeeNumber;
  return user._id || user.id || '';
};

// Helper function to normalize status (handle case differences)
const normalizeStatus = (status: any): 'draft' | 'approved' | 'rejected' => {
  if (!status) return 'draft';
  const statusStr = String(status).toLowerCase();
  if (statusStr === 'approved') return 'approved';
  if (statusStr === 'rejected') return 'rejected';
  return 'draft'; // Default to draft
};

// Helper function to map backend response to frontend type
const mapBackendToFrontend = (backendData: any): Allowance => {
  return {
    id: backendData._id || backendData.id,
    name: backendData.name || '',
    description: backendData.description || '',
    status: normalizeStatus(backendData.status),
    createdBy: extractUserName(backendData.createdBy),
    createdAt: backendData.createdAt || new Date().toISOString(),
    updatedAt: backendData.updatedAt || new Date().toISOString(),
    version: backendData.version || 1,
    allowanceType: backendData.allowanceType || 'other',
    amount: backendData.amount || 0,
    currency: backendData.currency || 'EGP',
    isRecurring: backendData.isRecurring !== false,
    frequency: backendData.frequency || 'monthly',
    taxable: backendData.taxable || false,
    effectiveDate: backendData.effectiveDate,
  };
};

// Helper function to map frontend type to backend DTO
const mapFrontendToBackend = (frontendData: any) => {
  return {
    name: frontendData.name || '',
    amount: parseFloat(frontendData.amount) || 0,
  };
};

export const allowancesApi = {
  getAll: async (status?: 'draft' | 'approved' | 'rejected'): Promise<Allowance[]> => {
    try {
      const response = await api.get('/payroll-configuration/allowances');
      let allowances: any[] = [];
      if (Array.isArray(response)) {
        allowances = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response) {
          const data = (response as any).data;
          allowances = Array.isArray(data) ? data : (data?.items && Array.isArray(data.items) ? data.items : []);
        } else if ('items' in response && Array.isArray((response as any).items)) {
          allowances = (response as any).items;
        }
      }
      
      // Map each item from backend to frontend format
      allowances = allowances.map(mapBackendToFrontend);
      
      // Filter by status if provided
      if (status) {
        allowances = allowances.filter((item: Allowance) => 
          normalizeStatus(item.status) === status
        );
      }
      
      return allowances;
    } catch (error) {
      console.error('Error fetching allowances:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<Allowance> => {
    try {
      const response = await api.get(`/payroll-configuration/allowances/${id}`);
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error(`Error fetching allowance ${id}:`, error);
      throw error;
    }
  },

  create: async (data: { name: string; amount: number }): Promise<Allowance> => {
    try {
      // Map frontend data to backend DTO format
      const backendData = mapFrontendToBackend(data);
      
      // Validate required fields
      if (!backendData.name) {
        throw new Error('Allowance name is required');
      }
      if (backendData.amount < 0) {
        throw new Error('Allowance amount must be non-negative');
      }
      
      const response = await api.post('/payroll-configuration/allowances', backendData);
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error('Error creating allowance:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Allowance>): Promise<Allowance> => {
    try {
      // Map frontend data to backend DTO format
      const backendData: any = {};
      
      if (data.name !== undefined) backendData.name = data.name;
      if (data.amount !== undefined) backendData.amount = parseFloat(String(data.amount));
      
      const response = await api.put(`/payroll-configuration/allowances/${id}`, backendData);
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error(`Error updating allowance ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/payroll-configuration/allowances/${id}`);
    } catch (error) {
      console.error(`Error deleting allowance ${id}:`, error);
      throw error;
    }
  }
};
