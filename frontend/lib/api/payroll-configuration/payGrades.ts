import { PayGrade } from './types';
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
const mapBackendToFrontend = (backendData: any): PayGrade => {
  // Map all fields from backend, including optional ones that exist in the database
  // Even though the DTOs don't accept them during create/update, they may exist in the DB
  return {
    id: backendData._id || backendData.id,
    name: backendData.grade ?? backendData.name ?? '',
    description: backendData.description ?? '',
    status: normalizeStatus(backendData.status),
    createdBy: extractUserName(backendData.createdBy),
    createdAt: backendData.createdAt || new Date().toISOString(),
    updatedAt: backendData.updatedAt || new Date().toISOString(),
    version: backendData.version || 1,
    minSalary: backendData.baseSalary ?? 0,
    maxSalary: backendData.grossSalary ?? 0,
    currency: backendData.currency ?? 'EGP',
    jobGrade: backendData.jobGrade ?? '',
    jobBand: backendData.jobBand ?? '',
    benefits: Array.isArray(backendData.benefits) ? backendData.benefits : (backendData.benefits ? [backendData.benefits] : []),
    isActive: backendData.isActive !== undefined ? backendData.isActive : true,
    comments: backendData.comments,
    approvedBy: extractUserName(backendData.approvedBy),
  };
};

// Helper function to map frontend type to backend DTO
// Backend DTO ONLY accepts: grade, baseSalary, grossSalary
const mapFrontendToBackend = (frontendData: any) => {
  return {
    grade: frontendData.name || frontendData.grade || '',
    baseSalary: parseFloat(String(frontendData.minSalary || frontendData.baseSalary || 0)),
    grossSalary: parseFloat(String(frontendData.maxSalary || frontendData.grossSalary || 0)),
  };
};

export const payGradesApi = {
  getAll: async (status?: 'draft' | 'approved' | 'rejected'): Promise<PayGrade[]> => {
    try {
      const response = await api.get('/payroll-configuration/pay-grades');
      let payGrades: any[] = [];
      if (Array.isArray(response)) {
        payGrades = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response) {
          const data = (response as any).data;
          payGrades = Array.isArray(data) ? data : (data?.items && Array.isArray(data.items) ? data.items : []);
        } else if ('items' in response && Array.isArray((response as any).items)) {
          payGrades = (response as any).items;
        }
      }
      
      // Map each item from backend to frontend format
      payGrades = payGrades.map(mapBackendToFrontend);
      
      // Filter by status if provided
      if (status) {
        payGrades = payGrades.filter((item: PayGrade) => 
          normalizeStatus(item.status) === status
        );
      }
      
      return payGrades;
    } catch (error) {
      console.error('Error fetching pay grades:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<PayGrade> => {
    try {
      const response = await api.get(`/payroll-configuration/pay-grades/${id}`);
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error(`Error fetching pay grade ${id}:`, error);
      throw error;
    }
  },

  create: async (data: { name: string; minSalary: number; maxSalary: number }): Promise<PayGrade> => {
    try {
      // Backend DTO ONLY accepts: grade, baseSalary, grossSalary
      const name = String(data.name || '').trim();
      const minSalary = parseFloat(String(data.minSalary));
      const maxSalary = parseFloat(String(data.maxSalary));
      
      // Validate required fields
      if (!name) {
        throw new Error('Pay grade name is required');
      }
      if (isNaN(minSalary) || minSalary < 6000) {
        throw new Error('Base salary must be at least 6000');
      }
      if (isNaN(maxSalary) || maxSalary < 6000) {
        throw new Error('Gross salary must be at least 6000');
      }
      if (maxSalary < minSalary) {
        throw new Error('Gross salary must be greater than or equal to base salary');
      }
      
      // Build backend data with ONLY fields in DTO
      const backendData = {
        grade: name,
        baseSalary: Number(minSalary),
        grossSalary: Number(maxSalary),
      };
      
      const response = await api.post('/payroll-configuration/pay-grades', backendData);
      return mapBackendToFrontend(response);
    } catch (error: any) {
      console.error('Error creating pay grade:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create pay grade';
      throw new Error(errorMessage);
    }
  },

  update: async (id: string, data: Partial<PayGrade>): Promise<PayGrade> => {
    try {
      // Only send fields that the backend DTO accepts
      // The running backend server only accepts: grade, baseSalary, grossSalary
      const backendData: any = {};
      
      if (data.name !== undefined && data.name !== null && String(data.name).trim() !== '') {
        backendData.grade = String(data.name).trim();
      }
      if (data.minSalary !== undefined && data.minSalary !== null) {
        const baseSalary = parseFloat(String(data.minSalary));
        if (!isNaN(baseSalary) && baseSalary >= 6000) {
          backendData.baseSalary = baseSalary;
        }
      }
      if (data.maxSalary !== undefined && data.maxSalary !== null) {
        const grossSalary = parseFloat(String(data.maxSalary));
        if (!isNaN(grossSalary) && grossSalary >= 6000) {
          backendData.grossSalary = grossSalary;
        }
      }
      
      // Validate that at least one field is being updated
      if (Object.keys(backendData).length === 0) {
        throw new Error('At least one field must be provided for update');
      }
      
      // Validate salary relationship if both are provided
      if (backendData.baseSalary !== undefined && backendData.grossSalary !== undefined) {
        if (backendData.grossSalary < backendData.baseSalary) {
          throw new Error('Gross salary must be greater than or equal to base salary');
        }
      }
      
      const response = await api.put(`/payroll-configuration/pay-grades/${id}`, backendData);
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error(`Error updating pay grade ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/payroll-configuration/pay-grades/${id}`);
    } catch (error) {
      console.error(`Error deleting pay grade ${id}:`, error);
      throw error;
    }
  }
};
