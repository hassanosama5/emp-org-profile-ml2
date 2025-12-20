import api from "../client";
import {
  AttendanceCorrectionRequest,
  CorrectionRequestStatus,
  GetAllCorrectionRequestsFilters,
  CorrectionRequestResponse,
  PendingCorrectionRequestsResponse,
  TimeException,
  TimeExceptionStatus,
  TimeExceptionType,
  GetAllTimeExceptionsFilters,
  OverdueExceptionsResponse,
  AutoEscalateResponse,
  GenerateOvertimeReportRequest,
  GenerateExceptionReportRequest,
  ExportReportRequest,
  OvertimeReportResponse,
  ExceptionReportResponse,
  ExportReportResponse,
} from "../../../types/time-management";

export const timeManagementApi = {
  // ===== Employee Self-Service APIs =====

  // Clock in
  clockIn: async (employeeId: string): Promise<any> => {
    return await api.post(`/time-management/clock-in/${employeeId}`);
  },

  // Clock out
  clockOut: async (employeeId: string): Promise<any> => {
    return await api.post(`/time-management/clock-out/${employeeId}`);
  },

  // Get attendance status for employee
  getAttendanceStatus: async (employeeId: string): Promise<any> => {
    return await api.get(`/time-management/attendance/status/${employeeId}`);
  },

  // Get attendance records for employee
  getAttendanceRecords: async (employeeId: string, filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> => {
    try {
      const days = filters?.startDate ? 
        Math.ceil((new Date(filters.endDate || new Date()).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24)) 
        : 30;

      const response = await api.get(`/time-management/attendance/records/${employeeId}?days=${days}`);
      
      console.log('Attendance records response:', response);
      
      return response;
    } catch (error: any) {
      console.error('Error fetching attendance records:', error);
      throw error;
    }
  },

  // Submit correction request
  submitCorrectionRequest: async (data: {
    employeeId: string;
    attendanceRecord: string;
    reason: string;
  }): Promise<any> => {
    return await api.post('/time-management/correction-request', data);
  },

  // Get correction requests by employee
  getCorrectionRequestsByEmployee: async (
    employeeId: string,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/time-management/correction-request/employee/${employeeId}${queryString ? `?${queryString}` : ''}`;
    return await api.get(url);
  },

  // ===== Correction Request Management APIs =====

  // GET all correction requests
  getAllCorrectionRequests: async (
    filters?: GetAllCorrectionRequestsFilters
  ): Promise<AttendanceCorrectionRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);

    const queryString = params.toString();
    const url = `/time-management/correction-request${queryString ? `?${queryString}` : ""}`;
    return await api.get(url);
  },

  // GET correction request by ID
  getCorrectionRequestById: async (
    requestId: string
  ): Promise<CorrectionRequestResponse> => {
    return await api.get(`/time-management/correction-request/${requestId}`);
  },

  // POST approve correction request
  approveCorrectionRequest: async (
    requestId: string,
    reason?: string
  ): Promise<CorrectionRequestResponse> => {
    return await api.post(`/time-management/correction-request/${requestId}/approve`, {
      reason,
    });
  },

  // POST reject correction request
  rejectCorrectionRequest: async (
    requestId: string,
    reason: string
  ): Promise<CorrectionRequestResponse> => {
    return await api.post(`/time-management/correction-request/${requestId}/reject`, {
      reason,
    });
  },

  // GET pending correction requests for manager
  getPendingCorrectionRequestsForManager: async (
    managerId?: string,
    departmentId?: string,
    limit?: number
  ): Promise<PendingCorrectionRequestsResponse> => {
    const params = new URLSearchParams();
    if (managerId) params.append("managerId", managerId);
    if (departmentId) params.append("departmentId", departmentId);
    if (limit) params.append("limit", limit.toString());

    const queryString = params.toString();
    const url = `/time-management/correction-request/pending/manager${queryString ? `?${queryString}` : ""}`;
    return await api.get(url);
  },

  // ===== Time Exception APIs =====

  // GET all time exceptions
  getAllTimeExceptions: async (
    filters?: GetAllTimeExceptionsFilters
  ): Promise<TimeException[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.assignedTo) params.append("assignedTo", filters.assignedTo);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    const queryString = params.toString();
    const url = `/time-management/time-exceptions${queryString ? `?${queryString}` : ""}`;
    return await api.get(url);
  },

  // GET time exception by ID
  getTimeExceptionById: async (
    exceptionId: string
  ): Promise<TimeException> => {
    return await api.get(`/time-management/time-exception/${exceptionId}`);
  },

  // POST approve time exception
  approveTimeException: async (
    exceptionId: string,
    approvalNotes?: string
  ): Promise<TimeException> => {
    return await api.post("/time-management/time-exception/approve", {
      timeExceptionId: exceptionId,
      approvalNotes,
    });
  },

  // POST reject time exception
  rejectTimeException: async (
    exceptionId: string,
    rejectionReason?: string
  ): Promise<TimeException> => {
    return await api.post("/time-management/time-exception/reject", {
      timeExceptionId: exceptionId,
      rejectionReason: rejectionReason?.trim(),
    });
  },

  // POST escalate time exception
  escalateTimeException: async (
    exceptionId: string
  ): Promise<TimeException> => {
    return await api.post("/time-management/time-exception/escalate", {
      timeExceptionId: exceptionId,
    });
  },

  // POST auto-escalate overdue exceptions
  autoEscalateOverdueExceptions: async (
    thresholdDays: number,
    excludeTypes?: string[]
  ): Promise<AutoEscalateResponse> => {
    return await api.post("/time-management/time-exceptions/auto-escalate-overdue", {
      thresholdDays,
      excludeTypes,
    });
  },

  // GET overdue exceptions
  getOverdueExceptions: async (
    thresholdDays: number,
    status?: string
  ): Promise<OverdueExceptionsResponse> => {
    const params = new URLSearchParams();
    params.append("thresholdDays", thresholdDays.toString());
    if (status) params.append("status", status);

    const queryString = params.toString();
    return await api.get(`/time-management/time-exceptions/overdue?${queryString}`);
  },

  // GET pending exceptions for current user
  getMyPendingExceptions: async (): Promise<TimeException[]> => {
    return await api.get("/time-management/time-exceptions/my-pending");
  },

  // POST request overtime approval
  requestOvertimeApproval: async (data: {
    employeeId: string;
    attendanceRecordId: string;
    requestedMinutes: number;
    reason: string;
    assignedTo: string;
  }): Promise<TimeException> => {
    return await api.post("/time-management/overtime/request", data);
  },

  // POST create time exception
  createTimeException: async (data: {
    employeeId: string;
    type: TimeExceptionType;
    attendanceRecordId: string;
    assignedTo: string;
    status: TimeExceptionStatus;
    reason: string;
  }): Promise<TimeException> => {
    return await api.post("/time-management/time-exception", data);
  },

  // ===== Reports APIs =====

  // POST generate overtime report
  generateOvertimeReport: async (
    request: GenerateOvertimeReportRequest
  ): Promise<OvertimeReportResponse> => {
    return await api.post("/time-management/reports/overtime", request);
  },

  // POST generate exception report
  generateExceptionReport: async (
    request: GenerateExceptionReportRequest
  ): Promise<ExceptionReportResponse> => {
    return await api.post("/time-management/reports/exception", request);
  },

  // POST export report
  exportReport: async (
    request: ExportReportRequest
  ): Promise<ExportReportResponse> => {
    return await api.post("/time-management/reports/export", request);
  },

  // ===== Additional Endpoints for Line Manager Features =====

  // GET shift expiry notifications
  getShiftExpiryNotifications: async (): Promise<any> => {
    return await api.get("/notification/shift-expiry");
  },

  // GET missed punches
  getMissedPunches: async (filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.status) params.append("status", filters.status);

    const queryString = params.toString();
    return await api.get(`/time-management/missed-punches${queryString ? `?${queryString}` : ""}`);
  },

  // GET repeated lateness (deprecated - use getLatenesDisciplinaryFlags)
  getRepeatedLateness: async (): Promise<any> => {
    return await api.get("/time-management/repeated-lateness");
  },

  // ===== Lateness Disciplinary Tracking APIs =====

  // GET all lateness disciplinary flags for HR review
  getLatenesDisciplinaryFlags: async (filters?: {
    status?: 'PENDING' | 'RESOLVED' | 'ESCALATED';
    severity?: 'WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION';
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString();
    return await api.get(`/time-management/lateness/flags${queryString ? `?${queryString}` : ''}`);
  },

  // GET employee lateness history
  getEmployeeLatenessHistory: async (employeeId: string, filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return await api.get(`/time-management/lateness/history/${employeeId}${queryString ? `?${queryString}` : ''}`);
  },

  // POST flag employee for repeated lateness (manual)
  flagEmployeeForRepeatedLateness: async (data: {
    employeeId: string;
    occurrenceCount: number;
    periodDays: number;
    severity: 'WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION';
    notes?: string;
  }): Promise<any> => {
    return await api.post('/time-management/lateness/flag', data);
  },

  // GET lateness pattern analysis
  analyzeLatenessPatterns: async (employeeId: string, periodDays?: number): Promise<any> => {
    const params = new URLSearchParams();
    if (periodDays) params.append('periodDays', periodDays.toString());
    const queryString = params.toString();
    return await api.get(`/time-management/lateness/patterns/${employeeId}${queryString ? `?${queryString}` : ''}`);
  },

  // POST resolve lateness flag
  resolveLatenessFlag: async (data: {
    flagId: string;
    resolution: 'ACKNOWLEDGED' | 'DISMISSED' | 'ESCALATED';
    notes?: string;
  }): Promise<any> => {
    return await api.post('/time-management/lateness/flag/resolve', data);
  },

  // POST manually trigger repeated lateness check
  triggerRepeatedLatenessCheck: async (): Promise<any> => {
    return await api.post('/time-management/lateness/check', {});
  },

  // GET escalation alerts
  getEscalationAlerts: async (): Promise<any> => {
    return await api.get("/notification/escalation-alerts");
  },

  // GET overtime report (alternative endpoint)
  getOvertimeReport: async (filters?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    departmentId?: string;
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.departmentId) params.append("departmentId", filters.departmentId);

    const queryString = params.toString();
    return await api.get(`/time-management/overtime-report${queryString ? `?${queryString}` : ""}`);
  },

  // POST sync data
  syncData: async (body?: {
    syncDate?: Date | string;
    modules?: Array<'payroll' | 'leaves' | 'benefits'>;
  }): Promise<any> => {
    return await api.post("/time-management/sync-data", body || {});
  },

  // GET sync status
  getSyncStatus: async (filters?: {
    startDate?: Date | string;
    endDate?: Date | string;
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", new Date(filters.startDate).toISOString());
    if (filters?.endDate) params.append("endDate", new Date(filters.endDate).toISOString());
    const qs = params.toString();
    return await api.get(`/time-management/sync-status${qs ? `?${qs}` : ""}`);
  },

  // ===== Attendance Import (CSV/Excel) =====

  importAttendanceFromCsv: async (csv: string): Promise<any> => {
    return await api.post("/time-management/attendance/import-csv", { csv });
  },

  importAttendanceFromExcel: async (excelData: string): Promise<any> => {
    return await api.post("/time-management/attendance/import-excel", { excelData });
  },

  // ===== Manual Attendance Recording (Department Head) =====
  
  // Create attendance record manually
  createAttendanceRecord: async (data: {
    employeeId: string;
    punches: Array<{ type: 'IN' | 'OUT'; time: Date }>;
    totalWorkMinutes: number;
    hasMissedPunch: boolean;
    exceptionIds: string[];
    finalisedForPayroll: boolean;
  }): Promise<any> => {
    return await api.post('/time-management/attendance', data);
  },

  // Update attendance record manually
  updateAttendanceRecord: async (recordId: string, data: {
    punches: Array<{ type: 'IN' | 'OUT'; time: Date }>;
    totalWorkMinutes: number;
    hasMissedPunch: boolean;
    exceptionIds: string[];
    finalisedForPayroll: boolean;
  }): Promise<any> => {
    return await api.put(`/time-management/attendance/${recordId}`, data);
  },

  // ===== Shift Assignment Management APIs =====

  // Renew shift assignment
  renewShiftAssignment: async (data: {
    assignmentId: string;
    newEndDate?: string;
    note?: string;
  }): Promise<any> => {
    return await api.post('/shift-schedule/shift/assignment/renew', data);
  },

  // Reassign shift assignment to different employee
  reassignShiftAssignment: async (data: {
    assignmentId: string;
    newEmployeeId: string;
    reason?: string;
  }): Promise<any> => {
    return await api.post('/shift-schedule/shift/assignment/reassign', data);
  },

  // Cancel shift assignment
  cancelShiftAssignment: async (data: {
    assignmentId: string;
    reason?: string;
  }): Promise<any> => {
    return await api.post('/shift-schedule/shift/assignment/cancel', data);
  },

  // ===== Lateness Management APIs =====

  // Scan existing attendance records for lateness and create LATE exceptions
  scanExistingForLateness: async (data?: {
    employeeId?: string;
    days?: number;
  }): Promise<any> => {
    // Longer timeout for bulk scanning operation (can take 60+ seconds)
    return await api.post('/time-management/lateness/scan-existing', data || {}, {
      timeout: 120000, // 2 minutes
    });
  },

  // Manually trigger repeated lateness check
  manuallyCheckRepeatedLateness: async (): Promise<any> => {
    // Longer timeout for checking all employees (can take 30+ seconds)
    return await api.post('/time-management/lateness/check', {}, {
      timeout: 60000, // 1 minute
    });
  },

  // ===== US16: VACATION-ATTENDANCE INTEGRATION APIs =====

  // Create attendance records for approved leave
  createLeaveAttendanceRecords: async (data: {
    employeeId: string;
    leaveRequestId: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    durationDays: number;
  }): Promise<any> => {
    return await api.post('/time-management/leave-attendance/create', data);
  },

  // Get employee's leave-attendance integration status
  getEmployeeLeaveAttendanceStatus: async (
    employeeId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString();
    return await api.get(
      `/time-management/leave-attendance/status/${employeeId}${queryString ? `?${queryString}` : ''}`
    );
  },

  // Validate shift assignment against approved leaves
  validateShiftAgainstLeave: async (data: {
    employeeId: string;
    shiftStartDate: string;
    shiftEndDate: string;
  }): Promise<any> => {
    return await api.post('/time-management/leave-attendance/validate-shift', data);
  },

  // Get department vacation-attendance summary
  getDepartmentVacationSummary: async (
    departmentId: string,
    month?: number,
    year?: number
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const queryString = params.toString();
    return await api.get(
      `/time-management/leave-attendance/department-summary/${departmentId}${queryString ? `?${queryString}` : ''}`
    );
  },

  // ===== US18: Payroll Cut-off Escalation APIs =====

  // Trigger manual payroll cut-off escalation
  triggerPayrollEscalation: async (): Promise<{
    success: boolean;
    message: string;
    payrollCutoffDate: string;
    daysUntilCutoff: number;
    escalatedExceptions: number;
    escalatedCorrections: number;
    pendingLeaves: number;
    notificationsSent: number;
  }> => {
    return await api.post('/time-management/payroll-escalation/trigger', {}, { timeout: 60000 });
  },

  // Get payroll readiness status
  getPayrollReadinessStatus: async (): Promise<{
    payrollCutoffDate: string;
    daysUntilCutoff: number;
    status: 'READY' | 'WARNING' | 'CRITICAL';
    pendingExceptions: number;
    pendingCorrections: number;
    pendingLeaves: number;
    escalatedExceptions: number;
    escalatedCorrections: number;
  }> => {
    return await api.get('/time-management/payroll-escalation/status');
  },

  // TEST ONLY: Reset escalated items to pending
  resetEscalatedToPending: async (): Promise<{
    success: boolean;
    message: string;
    resetExceptions: number;
    resetCorrections: number;
  }> => {
    return await api.post('/time-management/payroll-escalation/reset-to-pending', {});
  },
};

