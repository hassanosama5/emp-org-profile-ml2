import api from '../client';

/**
 * Get configuration details by type and ID
 * This is a generic function that works for all configuration types
 */
export const configDetailsApi = {
  getById: async (type: string, id: string): Promise<any> => {
    // Map frontend type names to backend endpoints
    const typeMap: Record<string, string> = {
      'pay-grades': 'pay-grades',
      'allowances': 'allowances',
      'pay-types': 'pay-types',
      'tax-rules': 'tax-rules',
      'insurance-brackets': 'insurance-brackets',
      'signing-bonuses': 'signing-bonuses',
      'termination-benefits': 'termination-benefits',
      'policies': 'policies',
    };

    const endpoint = typeMap[type] || type;
    const response = await api.get(`/payroll-configuration/${endpoint}/${id}`);
    return response;
  },
};

