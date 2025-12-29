// Enums
export enum PayrollStatus {
  DRAFT = "DRAFT",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  LOCKED = "LOCKED",
  FROZEN = "FROZEN",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
}

export enum BonusStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
}

export enum BenefitStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
}

// Pre-Initiation Types
export interface PreInitiationStatus {
  signingBonuses: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  terminationBenefits: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  payrollPeriod: {
    status: "pending" | "approved" | "rejected";
    payrollRunId?: string;
    period?: string;
  };
  allReviewsComplete: boolean;
}

// Signing Bonus Types
export interface EmployeeSigningBonus {
  _id: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; employeeNumber: string };
  signingBonusId: string | { _id: string; positionName: string; amount: number };
  givenAmount: number;
  paymentDate?: string;
  status: BonusStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SigningBonusReviewDto {
  employeeSigningBonusId: string;
  status: BonusStatus;
  paymentDate?: string;
}

export interface SigningBonusEditDto {
  employeeSigningBonusId: string;
  signingBonusId?: string;
  status?: BonusStatus;
  paymentDate?: string;
  givenAmount?: number;
}

// Termination Benefit Types
export interface EmployeeTerminationBenefit {
  _id: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; employeeNumber: string };
  benefitId: string | { _id: string; name: string; amount: number };
  terminationId: string | { _id: string; reason: string; initiator: "employee" | "hr" | "manager"; type?: "TERMINATION" | "RESIGNATION" };
  givenAmount: number;
  status: BenefitStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TerminationBenefitReviewDto {
  employeeTerminationResignationId: string;
  status: BenefitStatus;
}

export interface TerminationBenefitEditDto {
  employeeTerminationResignationId: string;
  benefitId?: string;
  terminationId?: string;
  status?: BenefitStatus;
  givenAmount?: number;
}

// Payroll Period Types
export interface ReviewPayrollPeriodDto {
  payrollRunId: string;
  status: PayrollStatus;
  rejectionReason?: string;
}

export interface EditPayrollPeriodDto {
  payrollRunId: string;
  payrollPeriod: string;
}

// Payroll Run Types
export interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  entity: string;
  employees: number;
  exceptions?: number;
  totalnetpay: number;
  status: PayrollStatus;
  paymentStatus: PaymentStatus;
  payrollSpecialistId: string;
  payrollManagerId?: string;
  financeStaffId?: string;
  createdAt: string;
  updatedAt: string;
}

