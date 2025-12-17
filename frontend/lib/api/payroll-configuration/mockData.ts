import { PayrollPolicy, PayGrade, PayType, Allowance } from './types';

export const mockPolicies: PayrollPolicy[] = [
  {
    id: '1',
    name: 'Overtime Policy',
    description: 'Defines overtime calculation rules',
    status: 'draft',
    policyType: 'overtime',
    effectiveDate: '2024-01-01',
    rules: { overtimeRate: 1.5, maxOvertimeHours: 20 },
    createdBy: 'john.doe@company.com',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    version: 1
  },
  {
    id: '2',
    name: 'Annual Bonus Policy',
    description: 'Year-end bonus calculation',
    status: 'approved',
    policyType: 'bonus',
    effectiveDate: '2024-01-01',
    rules: { bonusPercentage: 10, eligibilityMonths: 6 },
    createdBy: 'jane.smith@company.com',
    createdAt: '2024-01-05T14:30:00Z',
    updatedAt: '2024-01-08T09:15:00Z',
    approvedBy: 'payroll.manager@company.com',
    approvedAt: '2024-01-08T09:15:00Z',
    version: 2
  },
  {
    id: '3',
    name: 'Late Deduction Policy',
    description: 'Deductions for late attendance',
    status: 'rejected',
    policyType: 'deduction',
    effectiveDate: '2024-02-01',
    rules: { deductionAmount: 50, gracePeriod: 15 },
    createdBy: 'ahmed.mohamed@company.com',
    createdAt: '2024-01-12T11:20:00Z',
    updatedAt: '2024-01-15T16:45:00Z',
    comments: 'Needs review with HR department',
    version: 1
  }
];

export const mockPayGrades: PayGrade[] = [
  {
    id: '1',
    name: 'Junior Developer',
    description: 'Entry-level software development position',
    status: 'approved',
    minSalary: 8000,
    maxSalary: 12000,
    currency: 'EGP',
    jobGrade: 'JG-5',
    jobBand: 'Individual Contributor',
    benefits: ['Health Insurance', 'Annual Bonus'],
    isActive: true,
    createdBy: 'hr.admin@company.com',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T09:00:00Z',
    version: 1
  },
  {
    id: '2',
    name: 'Senior Developer',
    description: 'Experienced software development position',
    status: 'draft',
    minSalary: 15000,
    maxSalary: 25000,
    currency: 'EGP',
    jobGrade: 'JG-7',
    jobBand: 'Senior Individual Contributor',
    benefits: ['Health Insurance', 'Annual Bonus', 'Stock Options'],
    isActive: true,
    createdBy: 'hr.admin@company.com',
    createdAt: '2024-01-15T14:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z',
    version: 1
  }
];

export const mockPayTypes: PayType[] = [
  {
    id: '1',
    name: 'Monthly Salary',
    description: 'Fixed monthly salary',
    status: 'approved',
    type: 'salary',
    calculationMethod: 'fixed',
    isTaxable: true,
    isOvertimeEligible: false,
    createdBy: 'payroll.specialist@company.com',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
    version: 1
  },
  {
    id: '2',
    name: 'Hourly Contract',
    description: 'Hourly rate for contractors',
    status: 'draft',
    type: 'hourly',
    calculationMethod: 'hourly_rate * hours_worked',
    isTaxable: true,
    isOvertimeEligible: true,
    overtimeRate: 1.5,
    minHours: 40,
    maxHours: 60,
    createdBy: 'payroll.specialist@company.com',
    createdAt: '2024-01-10T11:00:00Z',
    updatedAt: '2024-01-10T11:00:00Z',
    version: 1
  }
];

export const mockAllowances: Allowance[] = [
  {
    id: '1',
    name: 'Transportation Allowance',
    description: 'Monthly transportation support',
    status: 'approved',
    allowanceType: 'transportation',
    amount: 500,
    currency: 'EGP',
    isRecurring: true,
    frequency: 'monthly',
    taxable: false,
    createdBy: 'hr.admin@company.com',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    version: 1
  },
  {
    id: '2',
    name: 'Housing Allowance',
    description: 'Housing support for employees',
    status: 'draft',
    allowanceType: 'housing',
    amount: 2000,
    currency: 'EGP',
    isRecurring: true,
    frequency: 'monthly',
    taxable: true,
    effectiveDate: '2024-02-01',
    createdBy: 'hr.admin@company.com',
    createdAt: '2024-01-12T15:00:00Z',
    updatedAt: '2024-01-12T15:00:00Z',
    version: 1
  }
];