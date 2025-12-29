import api from "../client";
import axios from "axios";
import { Payslip } from "../../../types/payslip";
import { authApi } from "../auth/auth";

// Use the same base URL as the api client to avoid port conflicts
// The api client uses port 5000 by default, not 6000 (6000 is an unsafe port)
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const payslipsApi = {
  // Get all payslips for an employee
  getPayslipsByEmployeeId: async (employeeId: string): Promise<Payslip[]> => {
    return await api.get(`/payroll-tracking/employee/${employeeId}/payslips`);
  },

  // Get a specific payslip by ID
  getPayslipById: async (
    employeeId: string,
    payslipId: string
  ): Promise<Payslip> => {
    return await api.get(
      `/payroll-tracking/employee/${employeeId}/payslips/${payslipId}`
    );
  },

  // Download payslip as PDF
  downloadPayslip: async (
    employeeId: string,
    payslipId: string
  ): Promise<Blob> => {
    const token = authApi.getToken();
    const response = await axios.get(
      `${API_BASE_URL}/payroll-tracking/employee/${employeeId}/payslips/${payslipId}/download`,
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Get employee base salary according to employment contract
  getEmployeeBaseSalary: async (employeeId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/employee/${employeeId}/base-salary`);
  },

  // Get leave encashment compensation for unused/encashed leave days
  getLeaveEncashment: async (
    employeeId: string,
    payrollRunId?: string
  ): Promise<any> => {
    const url = payrollRunId
      ? `/payroll-tracking/employee/${employeeId}/leave-encashment?payrollRunId=${payrollRunId}`
      : `/payroll-tracking/employee/${employeeId}/leave-encashment`;
    return await api.get(url);
  },

  // Get transportation/commuting compensation
  getTransportationAllowance: async (
    employeeId: string,
    payslipId?: string
  ): Promise<any> => {
    const url = payslipId
      ? `/payroll-tracking/employee/${employeeId}/transportation-allowance?payslipId=${payslipId}`
      : `/payroll-tracking/employee/${employeeId}/transportation-allowance`;
    return await api.get(url);
  },

  // Get detailed tax deductions with law/rule applied
  getTaxDeductions: async (
    employeeId: string,
    payslipId?: string
  ): Promise<any> => {
    const url = payslipId
      ? `/payroll-tracking/employee/${employeeId}/tax-deductions?payslipId=${payslipId}`
      : `/payroll-tracking/employee/${employeeId}/tax-deductions`;
    return await api.get(url);
  },

  // Get insurance deductions itemized
  getInsuranceDeductions: async (
    employeeId: string,
    payslipId?: string
  ): Promise<any> => {
    const url = payslipId
      ? `/payroll-tracking/employee/${employeeId}/insurance-deductions?payslipId=${payslipId}`
      : `/payroll-tracking/employee/${employeeId}/insurance-deductions`;
    return await api.get(url);
  },

  // Get salary deductions due to misconduct/absenteeism
  getMisconductDeductions: async (
    employeeId: string,
    payslipId?: string
  ): Promise<any> => {
    const url = payslipId
      ? `/payroll-tracking/employee/${employeeId}/misconduct-deductions?payslipId=${payslipId}`
      : `/payroll-tracking/employee/${employeeId}/misconduct-deductions`;
    return await api.get(url);
  },

  // Get deductions for unpaid leave days
  getUnpaidLeaveDeductions: async (
    employeeId: string,
    payslipId?: string
  ): Promise<any> => {
    const url = payslipId
      ? `/payroll-tracking/employee/${employeeId}/unpaid-leave-deductions?payslipId=${payslipId}`
      : `/payroll-tracking/employee/${employeeId}/unpaid-leave-deductions`;
    return await api.get(url);
  },

  // Get salary history for an employee
  getSalaryHistory: async (
    employeeId: string,
    limit?: number
  ): Promise<Payslip[]> => {
    const url = limit
      ? `/payroll-tracking/employee/${employeeId}/salary-history?limit=${limit}`
      : `/payroll-tracking/employee/${employeeId}/salary-history`;
    return await api.get(url);
  },

  // Get employer contributions (insurance, pension, allowances)
  getEmployerContributions: async (
    employeeId: string,
    payslipId?: string
  ): Promise<any> => {
    const url = payslipId
      ? `/payroll-tracking/employee/${employeeId}/employer-contributions?payslipId=${payslipId}`
      : `/payroll-tracking/employee/${employeeId}/employer-contributions`;
    return await api.get(url);
  },

  // Get tax documents (annual tax statement)
  getTaxDocuments: async (
    employeeId: string,
    year?: number
  ): Promise<any> => {
    const url = year
      ? `/payroll-tracking/employee/${employeeId}/tax-documents?year=${year}`
      : `/payroll-tracking/employee/${employeeId}/tax-documents`;
    return await api.get(url);
  },

  // ==================== DISPUTES ====================
  
  // Get all disputes for an employee
  getDisputesByEmployeeId: async (employeeId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/disputes/employee/${employeeId}`);
  },

  // Get a specific dispute by ID
  getDisputeById: async (disputeId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/disputes/${disputeId}`);
  },

  // Create a new dispute
  createDispute: async (disputeData: {
    employeeId: string;
    payslipId: string;
    description: string;
  }): Promise<any> => {
    return await api.post("/payroll-tracking/disputes", disputeData);
  },

  // Update a dispute
  updateDispute: async (
    disputeId: string,
    disputeData: {
      description?: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/disputes/${disputeId}`, disputeData);
  },

  // Finance: get approved disputes ready for adjustments/refunds
  getApprovedDisputesForFinance: async (): Promise<any> => {
    return await api.get("/payroll-tracking/disputes/approved");
  },

  // Finance: get approved claims ready for reimbursement
  getApprovedClaimsForFinance: async (): Promise<any> => {
    return await api.get("/payroll-tracking/claims/approved");
  },

  // Payroll Specialist: get pending claims awaiting review
  getPendingClaims: async (): Promise<any> => {
    return await api.get("/payroll-tracking/claims/pending");
  },

  // Get all claims (for payroll staff to view all claims regardless of status)
  getAllClaims: async (): Promise<any> => {
    return await api.get("/payroll-tracking/claims/all");
  },

  // Payroll Specialist: get pending disputes awaiting review
  getPendingDisputes: async (): Promise<any> => {
    return await api.get("/payroll-tracking/disputes/pending");
  },

  // Get all disputes (for payroll staff to view all disputes regardless of status)
  getAllDisputes: async (): Promise<any> => {
    return await api.get("/payroll-tracking/disputes/all");
  },

  // Payroll Specialist: approve a dispute (escalates to manager)
  approveDisputeBySpecialist: async (
    disputeId: string,
    approveData: {
      payrollSpecialistId: string;
      resolutionComment?: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/disputes/${disputeId}/approve-by-specialist`, approveData);
  },

  // Payroll Specialist: reject a dispute
  rejectDisputeBySpecialist: async (
    disputeId: string,
    rejectData: {
      payrollSpecialistId: string;
      rejectionReason: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/disputes/${disputeId}/reject-by-specialist`, rejectData);
  },

  // ==================== CLAIMS ====================
  
  // Get all claims for an employee
  getClaimsByEmployeeId: async (employeeId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/claims/employee/${employeeId}`);
  },

  // Get a specific claim by ID
  getClaimById: async (claimId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/claims/${claimId}`);
  },

  // Create a new claim
  createClaim: async (claimData: {
    employeeId: string;
    claimType: string;
    description: string;
    amount: number;
    financeStaffId?: string;
  }): Promise<any> => {
    return await api.post("/payroll-tracking/claims", claimData);
  },

  // Update a claim
  updateClaim: async (
    claimId: string,
    claimData: {
      description?: string;
      claimType?: string;
      amount?: number;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/claims/${claimId}`, claimData);
  },

  // ==================== REFUNDS ====================
  
  // Get all refunds for an employee
  getRefundsByEmployeeId: async (employeeId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/refunds/employee/${employeeId}`);
  },

  // Get all refunds (for finance staff)
  getAllRefunds: async (): Promise<any> => {
    return await api.get("/payroll-tracking/refunds/all");
  },

  // Get a specific refund by ID
  getRefundById: async (refundId: string): Promise<any> => {
    return await api.get(`/payroll-tracking/refunds/${refundId}`);
  },

  // Finance: Generate refund for an approved dispute
  generateRefundForDispute: async (
    disputeId: string,
    refundData: {
      financeStaffId: string;
      refundDetails: {
        description: string;
        amount: number;
      };
    }
  ): Promise<any> => {
    return await api.post(`/payroll-tracking/refunds/dispute/${disputeId}`, refundData);
  },

  // Finance: Generate refund for an approved claim
  generateRefundForClaim: async (
    claimId: string,
    refundData: {
      financeStaffId: string;
      refundDetails: {
        description: string;
        amount: number;
      };
    }
  ): Promise<any> => {
    return await api.post(`/payroll-tracking/refunds/claim/${claimId}`, refundData);
  },

  // Payroll Specialist: get all active departments for reporting
  getActiveDepartments: async (): Promise<any> => {
    return await api.get("/payroll-tracking/departments");
  },

  // Payroll Specialist: generate payroll report by department
  getPayrollReportByDepartment: async (
    departmentId: string,
    payrollRunId?: string
  ): Promise<any> => {
    const params = payrollRunId ? `?payrollRunId=${payrollRunId}` : "";
    return await api.get(`/payroll-tracking/reports/department/${departmentId}${params}`);
  },

  // Payroll Specialist: approve an expense claim (escalates to manager)
  approveClaimBySpecialist: async (
    claimId: string,
    approveData: {
      payrollSpecialistId: string;
      approvedAmount?: number;
      resolutionComment?: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/claims/${claimId}/approve-by-specialist`, approveData);
  },

  // Payroll Specialist: reject an expense claim
  rejectClaimBySpecialist: async (
    claimId: string,
    rejectData: {
      payrollSpecialistId: string;
      rejectionReason: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/claims/${claimId}/reject-by-specialist`, rejectData);
  },

  // Payroll Manager: confirm claim approval (final approval before finance)
  confirmClaimApproval: async (
    claimId: string,
    confirmData: {
      payrollManagerId: string;
      resolutionComment?: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/claims/${claimId}/confirm-approval`, confirmData);
  },

  // Payroll Manager: confirm dispute approval (final approval before finance)
  confirmDisputeApproval: async (
    disputeId: string,
    confirmData: {
      payrollManagerId: string;
      resolutionComment?: string;
    }
  ): Promise<any> => {
    return await api.put(`/payroll-tracking/disputes/${disputeId}/confirm-approval`, confirmData);
  },

  // ==================== FINANCE REPORTS ====================

  // Finance Staff: generate tax, insurance, and benefits reports
  getTaxInsuranceBenefitsReport: async (
    period: "month" | "year",
    date?: string,
    departmentId?: string
  ): Promise<any> => {
    const params = new URLSearchParams();
    params.append("period", period);
    if (date) params.append("date", date);
    if (departmentId) params.append("departmentId", departmentId);
    return await api.get(`/payroll-tracking/reports/tax-insurance-benefits?${params.toString()}`);
  },

  // Finance Staff: generate month-end and year-end payroll summaries
  getPayrollSummary: async (
    period: "month" | "year",
    date?: string,
    departmentId?: string
  ): Promise<any> => {
    const params = new URLSearchParams();
    params.append("period", period);
    if (date) params.append("date", date);
    if (departmentId) params.append("departmentId", departmentId);
    return await api.get(`/payroll-tracking/reports/payroll-summary?${params.toString()}`);
  },

  // Finance Staff: export tax/insurance/benefits report as CSV
  exportTaxInsuranceBenefitsReportAsCSV: async (
    period: "month" | "year",
    date?: string,
    departmentId?: string
  ): Promise<Blob> => {
    const token = authApi.getToken();
    const params = new URLSearchParams();
    params.append("period", period);
    if (date) params.append("date", date);
    if (departmentId) params.append("departmentId", departmentId);
    
    const response = await axios.get(
      `${API_BASE_URL}/payroll-tracking/reports/tax-insurance-benefits/export/csv?${params.toString()}`,
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Finance Staff: export tax/insurance/benefits report as PDF
  exportTaxInsuranceBenefitsReportAsPDF: async (
    period: "month" | "year",
    date?: string,
    departmentId?: string
  ): Promise<Blob> => {
    const token = authApi.getToken();
    const params = new URLSearchParams();
    params.append("period", period);
    if (date) params.append("date", date);
    if (departmentId) params.append("departmentId", departmentId);
    
    const response = await axios.get(
      `${API_BASE_URL}/payroll-tracking/reports/tax-insurance-benefits/export/pdf?${params.toString()}`,
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Finance Staff: export payroll summary as CSV
  exportPayrollSummaryAsCSV: async (
    period: "month" | "year",
    date?: string,
    departmentId?: string
  ): Promise<Blob> => {
    const token = authApi.getToken();
    const params = new URLSearchParams();
    params.append("period", period);
    if (date) params.append("date", date);
    if (departmentId) params.append("departmentId", departmentId);
    
    const response = await axios.get(
      `${API_BASE_URL}/payroll-tracking/reports/payroll-summary/export/csv?${params.toString()}`,
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Finance Staff: export payroll summary as PDF
  exportPayrollSummaryAsPDF: async (
    period: "month" | "year",
    date?: string,
    departmentId?: string
  ): Promise<Blob> => {
    const token = authApi.getToken();
    const params = new URLSearchParams();
    params.append("period", period);
    if (date) params.append("date", date);
    if (departmentId) params.append("departmentId", departmentId);
    
    const response = await axios.get(
      `${API_BASE_URL}/payroll-tracking/reports/payroll-summary/export/pdf?${params.toString()}`,
      {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

