import api from '../client';
import {
  PendingApproval,
  ApprovalDto,
  RejectionDto,
  ApiResponse,
} from './types';

export const approvalsApi = {
  getPendingApprovals: async (userId?: string): Promise<PendingApproval[]> => {
    const params = userId ? { userId } : {};
    const response = await api.get('/payroll-configuration/pending-approvals', {
      params,
    });
    
    // Backend returns an object with separate arrays for each type
    // Format: { payGrades: [...], allowances: [...], policies: [...], totalPending: 9 }
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const pendingApprovals: PendingApproval[] = [];
      
      // Map each type to the flat array format
      const typeMappings = [
        { key: 'payGrades', type: 'pay-grades' },
        { key: 'allowances', type: 'allowances' },
        { key: 'payTypes', type: 'pay-types' },
        { key: 'taxRules', type: 'tax-rules' },
        { key: 'insuranceBrackets', type: 'insurance-brackets' },
        { key: 'signingBonuses', type: 'signing-bonuses' },
        { key: 'terminationBenefits', type: 'termination-benefits' },
        { key: 'policies', type: 'policies' },
      ];
      
      typeMappings.forEach(({ key, type }) => {
        const items = (response as any)[key];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            pendingApprovals.push({
              _id: item._id || item.id,
              type: type,
              data: item,
              status: item.status || 'draft',
              createdBy: item.createdBy,
              createdAt: item.createdAt,
            });
          });
        }
      });
      
      return pendingApprovals;
    }
    
    // Fallback: if it's already an array, return it
    if (Array.isArray(response)) {
      return response;
    }
    
    return [];
  },

  approve: async (
    type: string,
    id: string,
    data?: ApprovalDto
  ): Promise<ApiResponse> => {
    const response = await api.post(
      `/payroll-configuration/${type}/${id}/approve`,
      data || {}
    );
    return response as ApiResponse;
  },

  reject: async (
    type: string,
    id: string,
    data: RejectionDto
  ): Promise<ApiResponse> => {
    const response = await api.post(
      `/payroll-configuration/${type}/${id}/reject`,
      data
    );
    return response as ApiResponse;
  },

  delete: async (type: string, id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/payroll-configuration/${type}/${id}`);
    return response as ApiResponse;
  },
};

