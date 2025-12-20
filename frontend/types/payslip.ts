export interface Payslip {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payrollRunId: {
    _id: string;
    runId: string;
    payrollPeriod: string;
    status: string;
    entity?: string;
  };
  earningsDetails: {
    baseSalary: number;
    allowances: Allowance[];
    bonuses?: SigningBonus[];
    benefits?: TerminationBenefit[];
    refunds?: RefundDetail[];
  };
  deductionsDetails: {
    taxes: TaxRule[];
    insurances?: InsuranceBracket[];
    penalties?: EmployeePenalties;
  };
  totalGrossSalary: number;
  totaDeductions?: number;
  netPay: number;
  paymentStatus: "PENDING" | "PAID";
  status?: "paid" | "pending" | "disputed" | "paid-disputed";
  isDisputed?: boolean;
  hasActiveDispute?: boolean;
  disputeCount?: number;
  latestDispute?: {
    disputeId: string;
    status: string;
    description: string;
    createdAt?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Allowance {
  _id?: string;
  allowanceName: string;
  amount: number;
  type: string;
  description?: string;
}

export interface SigningBonus {
  _id?: string;
  bonusName: string;
  amount: number;
  description?: string;
}

export interface TerminationBenefit {
  _id?: string;
  benefitName: string;
  amount: number;
  description?: string;
}

export interface RefundDetail {
  _id?: string;
  refundDescription: string;
  refundAmount: number;
  claimId?: string;
}

export interface TaxRule {
  _id?: string;
  taxName: string;
  taxRate: number;
  taxAmount: number;
  description?: string;
}

export interface InsuranceBracket {
  _id?: string;
  insuranceName: string;
  employeeContribution: number;
  employerContribution?: number;
  description?: string;
}

export interface EmployeePenalties {
  missingHoursDeduction?: number;
  missingDaysDeduction?: number;
  unpaidLeaveDeduction?: number;
  totalPenalties?: number;
}

