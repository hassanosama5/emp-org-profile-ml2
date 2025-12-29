export type ConfigStatus = 'draft' | 'approved' | 'rejected';

export interface CompanySettings {
  _id?: string;
  payDate: string; // ISO date string
  timeZone: string;
  currency: string; // Should be 'EGP'
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCompanySettingsDto {
  payDate: string;
  timeZone: string;
  currency: string;
}

export interface UpdateCompanySettingsDto {
  payDate?: string;
  timeZone?: string;
  currency?: string;
}

export interface PendingApproval {
  _id: string;
  type: string; // 'policies' | 'pay-grades' | 'allowances' | etc.
  data: any;
  status: ConfigStatus;
  createdBy?: string;
  createdAt?: string;
}

export interface ApprovalDto {
  comment?: string;
}

export interface RejectionDto {
  comment?: string;
}

export interface InsuranceBracket {
  _id: string;
  minSalary: number;
  maxSalary: number;
  employeeContribution: number;
  employerContribution: number;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInsuranceBracketDto {
  name: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  amount?: number;
}

export interface UpdateInsuranceBracketDto {
  name?: string;
  minSalary?: number;
  maxSalary?: number;
  employeeRate?: number;
  employerRate?: number;
  amount?: number;
}

export interface ConfigurationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  payGrades?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  allowances?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  payTypes?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  taxRules?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  insuranceBrackets?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  signingBonuses?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  terminationBenefits?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  payrollPolicies?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  success?: boolean;
  error?: string;
}

export interface BaseConfiguration {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  comments?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PayrollPolicy extends BaseConfiguration {
  policyType: 'attendance' | 'overtime' | 'bonus' | 'deduction' | 'other';
  effectiveDate: string;
  rules: Record<string, any>;
  department?: string;
  location?: string;
}

export interface PayGrade extends BaseConfiguration {
  minSalary: number;
  maxSalary: number;
  currency: string;
  jobGrade: string;
  jobBand: string;
  benefits?: string[];
  isActive: boolean;
}

export interface PayType extends BaseConfiguration {
  type: 'hourly' | 'salary' | 'commission' | 'contract';
  calculationMethod: string;
  isTaxable: boolean;
  isOvertimeEligible: boolean;
  overtimeRate?: number;
  minHours?: number;
  maxHours?: number;
}

export interface Allowance extends BaseConfiguration {
  allowanceType: 'housing' | 'transportation' | 'meal' | 'education' | 'medical' | 'other';
  amount: number;
  currency: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  eligibilityCriteria?: string;
  taxable: boolean;
  effectiveDate?: string;
  expirationDate?: string;
}



// ============================================
// Signing Bonus Types
// ============================================

export interface SigningBonus {
  _id: string;
  positionName: string; // Backend field name
  amount: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSigningBonusDto {
  positionName: string;
  amount: number;
}

export interface UpdateSigningBonusDto {
  positionName?: string;
  amount?: number;
}



// ============================================
// Termination Benefit Types
// ============================================

export interface TerminationBenefit {
  _id: string;
  name: string;
  benefitType: 'severance' | 'resignation' | 'retirement' | 'other';
  calculationMethod: string;
  eligibilityCriteria?: string;
  amount?: number;
  description?: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTerminationBenefitDto {
  name: string;
  amount: number;
  terms?: string;
}

export interface UpdateTerminationBenefitDto {
  name?: string;
  amount?: number;
  terms?: string;
}







// ============================================
// Tax Rule Types
// ============================================

export interface TaxRule {
  _id: string;
  name: string;
  taxType: 'income' | 'social_security' | 'health' | 'other';
  rate: number;
  brackets?: Array<{
    min: number;
    max?: number;
    rate: number;
  }>;
  description?: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRuleDto {
  name: string;
  rate: number;
  description?: string;
}

export interface UpdateTaxRuleDto {
  name?: string;
  rate?: number;
  description?: string;
}


