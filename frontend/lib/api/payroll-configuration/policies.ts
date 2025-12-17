import { PayrollPolicy } from './types';
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
const mapBackendToFrontend = (backendData: any): PayrollPolicy & { applicability?: string } => {
  return {
    id: backendData._id || backendData.id,
    name: backendData.policyName || backendData.name,
    description: backendData.description ?? '',
    status: normalizeStatus(backendData.status),
    createdBy: extractUserName(backendData.createdBy),
    createdAt: backendData.createdAt || new Date().toISOString(),
    updatedAt: backendData.updatedAt || new Date().toISOString(),
    version: backendData.version || 1,
    policyType: backendData.policyType || 'other',
    effectiveDate: backendData.effectiveDate || new Date().toISOString(),
    rules: backendData.ruleDefinition || backendData.rules || {},
    department: backendData.department,
    location: backendData.location,
    comments: backendData.comments,
    approvedBy: extractUserName(backendData.approvedBy),
    approvedAt: backendData.approvedAt,
    applicability: backendData.applicability,
  } as PayrollPolicy & { applicability?: string };
};

// Helper function to map frontend type to backend DTO
// Backend DTO accepts: policyName, policyType, description, effectiveDate, ruleDefinition, applicability
const mapFrontendToBackend = (frontendData: any, isUpdate: boolean = false) => {
  // Map frontend policyType to backend enum values
  const policyTypeMap: Record<string, string> = {
    'attendance': 'Leave',
    'overtime': 'Allowance',
    'bonus': 'Benefit',
    'deduction': 'Deduction',
    'other': 'Benefit',
  };
  
  const backendData: any = {};
  
  // Only include fields that are provided (for updates) or required (for creates)
  if (frontendData.name !== undefined || !isUpdate) {
    backendData.policyName = frontendData.name || frontendData.policyName;
  }
  
  if (frontendData.policyType !== undefined || !isUpdate) {
    backendData.policyType = policyTypeMap[frontendData.policyType] || frontendData.policyType || 'Benefit';
  }
  
  if (frontendData.description !== undefined || !isUpdate) {
    backendData.description = frontendData.description?.trim() || '';
  }
  
  if (frontendData.effectiveDate !== undefined || !isUpdate) {
    backendData.effectiveDate = frontendData.effectiveDate;
  }
  
  // Handle ruleDefinition - backend requires percentage, fixedAmount, thresholdAmount
  if (frontendData.rules !== undefined || frontendData.ruleDefinition !== undefined || !isUpdate) {
    let ruleDefinition = frontendData.rules || frontendData.ruleDefinition;
    if (!ruleDefinition || typeof ruleDefinition !== 'object') {
      ruleDefinition = {
        percentage: 0,
        fixedAmount: 0,
        thresholdAmount: 1,
      };
    } else {
      // Convert frontend rules format to backend format
      // Frontend might send: { overtimeRate: 1.5, maxOvertimeHours: 20 }
      // Backend expects: { percentage: 0, fixedAmount: 0, thresholdAmount: 1 }
      ruleDefinition = {
        percentage: ruleDefinition.percentage !== undefined ? ruleDefinition.percentage : 
                    (ruleDefinition.overtimeRate ? (ruleDefinition.overtimeRate - 1) * 100 : 0),
        fixedAmount: ruleDefinition.fixedAmount !== undefined ? ruleDefinition.fixedAmount : 0,
        thresholdAmount: ruleDefinition.thresholdAmount !== undefined ? ruleDefinition.thresholdAmount : 
                       (ruleDefinition.maxOvertimeHours || 1),
      };
    }
    backendData.ruleDefinition = ruleDefinition;
  }
  
  if (frontendData.applicability !== undefined || !isUpdate) {
    backendData.applicability = frontendData.applicability || 'All Employees';
  }
  
  return backendData;
};

export const policiesApi = {
  // Get all policies (with optional status filter)
  getAll: async (status?: 'draft' | 'approved' | 'rejected'): Promise<PayrollPolicy[]> => {
    try {
      const params: any = {};
      if (status) {
        params.status = status;
      }
      
      const response = await api.get('/payroll-configuration/policies', { params });
      
      // Handle different response structures
      // Response interceptor already extracts response.data, so response is already the data
      let policies = [];
      if (Array.isArray(response)) {
        policies = response;
      } else if (response && typeof response === 'object' && 'items' in response && Array.isArray((response as any).items)) {
        policies = (response as any).items;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
        policies = (response as any).data;
      }
      
      return policies.map(mapBackendToFrontend);
    } catch (error) {
      console.error('Error fetching policies:', error);
      throw error;
    }
  },

  // Get single policy
  getById: async (id: string): Promise<PayrollPolicy> => {
    try {
      const response = await api.get(`/payroll-configuration/policies/${id}`);
      // Response interceptor already extracts response.data
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error(`Error fetching policy ${id}:`, error);
      throw error;
    }
  },

  // Create new policy
  create: async (data: Omit<PayrollPolicy, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status' | 'createdBy'>): Promise<PayrollPolicy> => {
    try {
      const backendData = mapFrontendToBackend(data, false);
      const response = await api.post('/payroll-configuration/policies', backendData);
      // Response interceptor already extracts response.data
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error('Error creating policy:', error);
      throw error;
    }
  },

  // Update policy
  update: async (id: string, data: Partial<PayrollPolicy>): Promise<PayrollPolicy> => {
    try {
      const backendData = mapFrontendToBackend(data, true);
      const response = await api.put(`/payroll-configuration/policies/${id}`, backendData);
      // Response interceptor already extracts response.data
      return mapBackendToFrontend(response);
    } catch (error) {
      console.error(`Error updating policy ${id}:`, error);
      throw error;
    }
  },

  // Delete policy
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/payroll-configuration/policies/${id}`);
    } catch (error) {
      console.error(`Error deleting policy ${id}:`, error);
      throw error;
    }
  }
};