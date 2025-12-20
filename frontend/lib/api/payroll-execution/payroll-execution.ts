import api from "../client";
import {
  PreInitiationStatus,
  SigningBonusReviewDto,
  SigningBonusEditDto,
  TerminationBenefitReviewDto,
  TerminationBenefitEditDto,
  ReviewPayrollPeriodDto,
  EditPayrollPeriodDto,
  EmployeeSigningBonus,
  EmployeeTerminationBenefit,
  PayrollRun,
} from "../../../types/payroll-execution";

export const payrollExecutionApi = {
  // Pre-Initiation Validation
  getPreInitiationValidationStatus: async (): Promise<PreInitiationStatus> => {
    return await api.get("/payroll/pre-initiation-validation");
  },

  // Signing Bonuses
  getSigningBonuses: async (): Promise<EmployeeSigningBonus[]> => {
    try {
      // Backend returns paginated response: { data: [...], total, page, limit }
      const response = await api.get("/payroll/signing-bonuses");
      // Handle both paginated response and direct array
      if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (err: any) {
      console.error("Error fetching signing bonuses:", err);
      throw err;
    }
  },

  getSigningBonusById: async (id: string): Promise<EmployeeSigningBonus> => {
    // Note: This endpoint needs to be added to the backend
    return await api.get(`/payroll/signing-bonuses/${id}`);
  },

  reviewSigningBonus: async (
    data: SigningBonusReviewDto
  ): Promise<EmployeeSigningBonus> => {
    return await api.post("/payroll/review-signing-bonus", data);
  },

  editSigningBonus: async (
    data: SigningBonusEditDto
  ): Promise<EmployeeSigningBonus> => {
    return await api.put("/payroll/edit-signing-bonus", data);
  },

  // Termination Benefits
  getTerminationBenefits: async (): Promise<EmployeeTerminationBenefit[]> => {
    try {
      // Backend returns paginated response: { data: [...], total, page, limit }
      const response = await api.get("/payroll/termination-benefits");
      // Handle both paginated response and direct array
      if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (err: any) {
      console.error("Error fetching termination benefits:", err);
      throw err;
    }
  },

  getTerminationBenefitById: async (
    id: string
  ): Promise<EmployeeTerminationBenefit> => {
    // Note: This endpoint needs to be added to the backend
    return await api.get(`/payroll/termination-benefits/${id}`);
  },

  reviewTerminationBenefit: async (
    data: TerminationBenefitReviewDto
  ): Promise<EmployeeTerminationBenefit> => {
    return await api.post("/payroll/review-termination-benefit", data);
  },

  editTerminationBenefit: async (
    data: TerminationBenefitEditDto
  ): Promise<EmployeeTerminationBenefit> => {
    return await api.put("/payroll/edit-termination-benefit", data);
  },

  // REQ-PY-30: Automatically process benefits upon resignation/termination
  processTerminationBenefits: async (): Promise<EmployeeTerminationBenefit[]> => {
    return await api.post("/payroll/process-termination-benefits");
  },

  // Payroll Period
  reviewPayrollPeriod: async (
    data: ReviewPayrollPeriodDto
  ): Promise<PayrollRun> => {
    return await api.post("/payroll/review-payroll-period", data);
  },

  editPayrollPeriod: async (
    data: EditPayrollPeriodDto
  ): Promise<PayrollRun> => {
    return await api.put("/payroll/edit-payroll-period", data);
  },

  // Payroll Initiation
  processPayrollInitiation: async (data: {
    payrollPeriod: string;
    entity: string;
    payrollSpecialistId: string;
    currency?: string;
    payrollManagerId?: string;
  }): Promise<PayrollRun> => {
    return await api.post("/payroll/process-initiation", data);
  },

  // REQ-PY-24: Review and approve processed payroll initiation
  reviewPayrollInitiation: async (data: {
    runId: string;
    approved: boolean;
    reviewerId: string;
    rejectionReason?: string;
  }): Promise<PayrollRun> => {
    return await api.post(`/payroll/review-initiation/${data.runId}`, {
      approved: data.approved,
      reviewerId: data.reviewerId,
      rejectionReason: data.rejectionReason,
    });
  },

  // REQ-PY-26: Manually edit payroll initiation
  editPayrollInitiation: async (data: {
    runId: string;
    payrollPeriod?: string;
    entity?: string;
    employees?: number;
    totalnetpay?: number;
    payrollSpecialistId?: string;
  }): Promise<PayrollRun> => {
    return await api.put(`/payroll/edit-initiation/${data.runId}`, {
      payrollPeriod: data.payrollPeriod,
      entity: data.entity,
      employees: data.employees,
      totalnetpay: data.totalnetpay,
      payrollSpecialistId: data.payrollSpecialistId,
    });
  },

  // REQ-PY-27: Automatically process signing bonuses
  processSigningBonuses: async (): Promise<EmployeeSigningBonus[]> => {
    return await api.post("/payroll/process-signing-bonuses");
  },

  // REQ-PY-1: Automatically calculate salaries, allowances, deductions, and contributions
  calculatePayroll: async (data: {
    employeeId: string;
    payrollRunId: string;
    baseSalary?: number;
  }): Promise<any> => {
    return await api.post("/payroll/calculate-payroll", data);
  },

  // Get all payroll runs
  getAllPayrollRuns: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    
    const queryString = queryParams.toString();
    const url = `/payroll/runs${queryString ? `?${queryString}` : ""}`;
    return await api.get(url);
  },

  // Get payroll run by ID
  getPayrollRunById: async (runId: string): Promise<PayrollRun> => {
    return await api.get(`/payroll/runs/${runId}`);
  },

  // REQ-PY-2: Calculate prorated salaries for mid-month hires, terminations
  calculateProratedSalary: async (data: {
    employeeId: string;
    baseSalary: number;
    startDate: string; // ISO 8601 date string
    endDate: string; // ISO 8601 date string
    payrollPeriodEnd: string; // ISO 8601 date string
  }): Promise<number> => {
    return await api.post("/payroll/calculate-prorated-salary", data);
  },

  // REQ-PY-3: Auto-apply statutory rules (income tax, pension, insurance, labor law deductions)
  applyStatutoryRules: async (data: {
    employeeId: string;
    baseSalary: number;
  }): Promise<{
    total: number;
    taxes: number;
    insurance: number;
  }> => {
    return await api.post("/payroll/apply-statutory-rules", data);
  },

  // REQ-PY-4: Generate draft payroll runs automatically at the end of each cycle
  generateDraftPayrollRun: async (data: {
    payrollPeriod: string; // ISO 8601 date string
    entity: string;
    payrollSpecialistId: string;
    currency?: string;
    payrollManagerId?: string;
  }): Promise<PayrollRun> => {
    return await api.post("/payroll/generate-draft", data);
  },

  // REQ-PY-5: Auto-detect irregularities (salary spikes, missing bank accounts, negative net pay)
  detectIrregularities: async (payrollRunId: string): Promise<string[]> => {
    return await api.post(`/payroll/detect-irregularities/${payrollRunId}`);
  },

  // REQ-PY-5: Manually flag payroll exception
  flagPayrollException: async (data: {
    payrollRunId: string;
    employeeId?: string;
    code: string;
    message: string;
  }): Promise<any> => {
    return await api.post("/payroll/flag-exception", data);
  },

  // Get all exceptions for a payroll run
  getAllPayrollExceptions: async (payrollRunId: string): Promise<any> => {
    return await api.get(`/payroll/payroll-exceptions/${payrollRunId}`);
  },

  // Get exceptions for a specific employee in a payroll run
  getEmployeeExceptions: async (
    employeeId: string,
    payrollRunId: string
  ): Promise<any> => {
    return await api.get(
      `/payroll/employee-exceptions/${employeeId}/${payrollRunId}`
    );
  },

  // REQ-PY-20: Payroll Manager resolve escalated irregularities
  resolveIrregularity: async (data: {
    payrollRunId: string;
    employeeId: string;
    exceptionCode: string;
    resolution: string;
    managerId: string;
  }): Promise<any> => {
    return await api.post("/payroll/resolve-irregularity", data);
  },

  // REQ-PY-22: Payroll Manager approve payroll runs
  managerApproval: async (data: {
    payrollRunId: string;
    status: string;
    managerDecision: "approved" | "rejected";
    managerComments?: string;
    payrollManagerId?: string;
    managerApprovalDate?: string;
  }): Promise<any> => {
    // Map frontend decision to backend PayRollStatus enum values
    // Backend expects: "approved" or "rejected" (matching PayRollStatus enum)
    const backendData = {
      payrollRunId: data.payrollRunId,
      status: data.status, // Current status (e.g., "under review")
      managerDecision: data.managerDecision === "approved" ? "approved" : "rejected", // PayRollStatus enum value
      managerComments: data.managerComments,
      payrollManagerId: data.payrollManagerId,
      managerApprovalDate: data.managerApprovalDate,
    };
    return await api.post("/payroll/manager-approval", backendData);
  },

  // REQ-PY-6: Get payroll preview dashboard
  getPayrollPreview: async (
    payrollRunId: string,
    currency?: string
  ): Promise<any> => {
    const params = currency ? { currency } : {};
    return await api.get(`/payroll/preview/${payrollRunId}`, { params });
  },

  // REQ-PY-7: Lock payroll run (freeze to prevent unauthorized changes)
  lockPayroll: async (payrollRunId: string): Promise<any> => {
    return await api.post(`/payroll/${payrollRunId}/lock`);
  },

  // REQ-PY-7: Freeze payroll run (alias for lock)
  freezePayroll: async (payrollRunId: string): Promise<any> => {
    return await api.post(`/payroll/${payrollRunId}/freeze`);
  },

  // REQ-PY-19: Unlock payroll run (requires reason)
  unlockPayroll: async (
    payrollRunId: string,
    unlockReason: string
  ): Promise<any> => {
    return await api.post(`/payroll/${payrollRunId}/unlock`, {
      payrollRunId,
      unlockReason,
    });
  },

  // REQ-PY-19: Unfreeze payroll run (alias for unlock, requires reason)
  unfreezePayroll: async (
    payrollRunId: string,
    unfreezeReason: string
  ): Promise<any> => {
    return await api.post(`/payroll/${payrollRunId}/unfreeze`, {
      payrollRunId,
      unlockReason: unfreezeReason,
    });
  },

  // REQ-PY-8: Generate and distribute employee payslips
  generateAndDistributePayslips: async (data: {
    payrollRunId: string;
    distributionMethod?: "PDF" | "EMAIL" | "PORTAL";
  }): Promise<any> => {
    return await api.post("/payroll/generate-payslips", data);
  },

  // Get all payslips for a payroll run (for Payroll Specialists to view)
  getPayslipsByPayrollRun: async (payrollRunId: string): Promise<any[]> => {
    return await api.get(`/payroll/payslips/payroll-run/${payrollRunId}`);
  },

  // Get a specific payslip by ID (for Payroll Specialists to view)
  getPayslipById: async (payslipId: string): Promise<any> => {
    return await api.get(`/payroll/payslips/${payslipId}`);
  },

  // Get all payslips with filters (for Payroll Specialists to view all payslips)
  getAllPayslips: async (params?: {
    payrollRunId?: string;
    employeeId?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.payrollRunId) queryParams.append("payrollRunId", params.payrollRunId);
    if (params?.employeeId) queryParams.append("employeeId", params.employeeId);
    if (params?.paymentStatus) queryParams.append("paymentStatus", params.paymentStatus);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    
    const queryString = queryParams.toString();
    const url = `/payroll/payslips${queryString ? `?${queryString}` : ""}`;
    return await api.get(url);
  },

  // REQ-PY-12: Send payroll run for approval to Manager and Finance
  sendForApproval: async (data: {
    payrollRunId: string;
    managerId: string;
    financeStaffId: string;
  }): Promise<PayrollRun> => {
    return await api.post("/payroll/send-for-approval", data);
  },

  // REQ-PY-15: Finance Staff approve payroll disbursements before execution
  financeApproval: async (data: {
    payrollRunId: string;
    decision: "approve" | "reject";
    reason?: string;
    financeStaffId?: string;
    decisionDate?: string;
  }): Promise<PayrollRun> => {
    return await api.post("/payroll/finance-approval", data);
  },
};

