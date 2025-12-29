import api from '../client';
import { ConfigurationStats } from './types';

interface BackendStatsResponse {
  payGrades?: { total: number; draft: number; approved: number; rejected: number };
  allowances?: { total: number; draft: number; approved: number; rejected: number };
  payTypes?: { total: number; draft: number; approved: number; rejected: number };
  taxRules?: { total: number; draft: number; approved: number; rejected: number };
  insuranceBrackets?: { total: number; draft: number; approved: number; rejected: number };
  signingBonuses?: { total: number; draft: number; approved: number; rejected: number };
  terminationBenefits?: { total: number; draft: number; approved: number; rejected: number };
  payrollPolicies?: { total: number; draft: number; approved: number; rejected: number };
}

export const statsApi = {
  getStats: async (): Promise<ConfigurationStats> => {
    const response = await api.get('/payroll-configuration/stats') as BackendStatsResponse;
    
    // Transform backend response to frontend format
    // Backend uses 'draft', frontend expects 'pending'
    const transformTypeStats = (stats: any) => {
      if (!stats) return undefined;
      return {
        total: stats.total ?? 0,
        pending: stats.draft ?? stats.pending ?? 0,
        approved: stats.approved ?? 0,
        rejected: stats.rejected ?? 0,
      };
    };

    // Calculate totals across all types
    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    const typeStats = [
      response.payGrades,
      response.allowances,
      response.payTypes,
      response.taxRules,
      response.insuranceBrackets,
      response.signingBonuses,
      response.terminationBenefits,
      response.payrollPolicies,
    ];

    typeStats.forEach((stats) => {
      if (stats) {
        total += stats.total ?? 0;
        pending += stats.draft ?? 0;
        approved += stats.approved ?? 0;
        rejected += stats.rejected ?? 0;
      }
    });

    return {
      total,
      pending,
      approved,
      rejected,
      payGrades: transformTypeStats(response.payGrades),
      allowances: transformTypeStats(response.allowances),
      payTypes: transformTypeStats(response.payTypes),
      taxRules: transformTypeStats(response.taxRules),
      insuranceBrackets: transformTypeStats(response.insuranceBrackets),
      signingBonuses: transformTypeStats(response.signingBonuses),
      terminationBenefits: transformTypeStats(response.terminationBenefits),
      payrollPolicies: transformTypeStats(response.payrollPolicies),
    };
  },
};

