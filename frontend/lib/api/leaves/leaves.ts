import api from "../client";
import {
  LeaveType,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  LeaveCategory,
  CreateLeaveCategoryDto,
  LeavePolicy,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  LeaveEntitlement,
  CreateLeaveEntitlementDto,
  UpdateLeaveEntitlementDto,
  LeaveAdjustment,
  CreateLeaveAdjustmentDto,
  Calendar,
  CreateCalendarDto,
  // Phase 2: Leave Request Types
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequest,
} from "../../../types/leaves";

export const leavesApi = {
  // Leave Types
  getLeaveTypes: async (): Promise<LeaveType[]> => {
    try {
      return await api.get("/leaves/types");
    } catch (error: any) {
      // Silently fail for 403/404/500 - this endpoint may not be accessible to all roles
      const status = error.response?.status;
      if (status === 403 || status === 404 || status === 500) {
        console.warn("Leave types endpoint not accessible or failed:", status);
        return [];
      }
      // For other errors, log but still return empty array
      console.warn("Failed to fetch leave types:", error.message || "Unknown error");
      return [];
    }
  },

  getLeaveTypeById: async (id: string): Promise<LeaveType> => {
    // TODO: Backend endpoint missing - GET /leaves/type/:id
    throw new Error("Backend endpoint not implemented yet");
  },

  createLeaveType: async (data: CreateLeaveTypeDto): Promise<LeaveType> => {
    return await api.post("/leaves/type", data);
  },

  updateLeaveType: async (
    id: string,
    data: UpdateLeaveTypeDto
  ): Promise<LeaveType> => {
    return await api.put(`/leaves/type/${id}`, data);
  },

  deleteLeaveType: async (id: string): Promise<void> => {
    try {
      await api.delete(`/leaves/type/${id}`);
    } catch (error: any) {
      // If the delete succeeded but returned an empty response, ignore the error
      // The backend returns the deleted document, but if it's empty, that's fine
      if (error.response?.status >= 200 && error.response?.status < 300) {
        return;
      }
      // Re-throw actual errors
      throw error;
    }
  },

  // Leave Categories
  getLeaveCategories: async (): Promise<LeaveCategory[]> => {
    // TODO: Backend endpoint missing - GET /leaves/categories
    // For now, try to call the endpoint - if it fails, return empty array
    try {
      return await api.get("/leaves/categories");
    } catch (error: any) {
      // If endpoint doesn't exist, return empty array
      console.warn("Categories endpoint not available:", error);
      return [];
    }
  },

  getLeaveCategoryById: async (id: string): Promise<LeaveCategory> => {
    // TODO: Backend endpoint missing - GET /leaves/category/:id
    throw new Error("Backend endpoint not implemented yet");
  },

  createLeaveCategory: async (
    data: CreateLeaveCategoryDto
  ): Promise<LeaveCategory> => {
    return await api.post("/leaves/category", data);
  },

  deleteLeaveCategory: async (id: string): Promise<void> => {
    // TODO: Backend endpoint missing - DELETE /leaves/category/:id
    throw new Error("Backend endpoint not implemented yet");
  },

  // Leave Policies
  getLeavePolicies: async (): Promise<LeavePolicy[]> => {
    return await api.get("/leaves/policies");
  },

  getLeavePolicyById: async (id: string): Promise<LeavePolicy> => {
    return await api.get(`/leaves/policy/${id}`);
  },

  createLeavePolicy: async (
    data: CreateLeavePolicyDto
  ): Promise<LeavePolicy> => {
    return await api.post("/leaves/policy", data);
  },

  updateLeavePolicy: async (
    id: string,
    data: UpdateLeavePolicyDto
  ): Promise<LeavePolicy> => {
    return await api.put(`/leaves/policy/${id}`, data);
  },

  deleteLeavePolicy: async (id: string): Promise<void> => {
    return await api.delete(`/leaves/policy/${id}`);
  },

  // Leave Entitlements
  createLeaveEntitlement: async (
    data: CreateLeaveEntitlementDto
  ): Promise<LeaveEntitlement> => {
    return await api.post("/leaves/entitlement", data);
  },

  getLeaveEntitlement: async (
    employeeId: string,
    leaveTypeId: string
  ): Promise<LeaveEntitlement> => {
    return await api.get(`/leaves/entitlement/${employeeId}/${leaveTypeId}`);
  },

  updateLeaveEntitlement: async (
    id: string,
    data: UpdateLeaveEntitlementDto
  ): Promise<LeaveEntitlement> => {
    return await api.put(`/leaves/entitlement/${id}`, data);
  },

  assignPersonalizedEntitlement: async (
    employeeId: string,
    leaveTypeId: string,
    personalizedEntitlement: number
  ): Promise<LeaveEntitlement> => {
    return await api.post(
      `/leaves/entitlement/${employeeId}/${leaveTypeId}/personalized`,
      { personalizedEntitlement }
    );
  },

  // Leave Adjustments
  createLeaveAdjustment: async (
    data: CreateLeaveAdjustmentDto
  ): Promise<LeaveAdjustment> => {
    return await api.post("/leaves/adjustment", data);
  },

  getLeaveAdjustments: async (
    employeeId: string
  ): Promise<LeaveAdjustment[]> => {
    return await api.get(`/leaves/adjustment/${employeeId}`);
  },

  deleteLeaveAdjustment: async (id: string): Promise<void> => {
    return await api.delete(`/leaves/adjustment/${id}`);
  },

  // Calendar
  createCalendar: async (data: CreateCalendarDto): Promise<Calendar> => {
    return await api.post("/leaves/calendar", data);
  },

  getCalendarByYear: async (year: number): Promise<Calendar | null> => {
    try {
      return await api.get(`/leaves/calendar/${year}`);
    } catch (error: any) {
      // Silently handle 403 (Forbidden) - expected for non-HR_ADMIN users
      // Calendar access is optional for duration calculation (fallback to weekend-only)
      if (error.response?.status === 403) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  },

  updateCalendar: async (
    year: number,
    data: CreateCalendarDto
  ): Promise<Calendar> => {
    return await api.put(`/leaves/calendar/${year}`, data);
  },

  // Reset Leave Balances
  resetLeaveBalances: async (criterion?: string): Promise<{ message: string }> => {
    return await api.post("/leaves/reset-leave-balances", { criterion });
  },

  // ============================================================================
  // Phase 2: Leave Request Functions (Employee & Manager Features)
  // ============================================================================
  
  /**
   * Create a new leave request
   * POST /leaves/request
   * Required roles: DEPARTMENT_EMPLOYEE, DEPARTMENT_HEAD
   */
  createLeaveRequest: async (
    data: CreateLeaveRequestDto
  ): Promise<LeaveRequest> => {
    try {
      // Prepare the payload, ensuring dates are properly formatted
      const fromDate = typeof data.dates.from === 'string' 
        ? new Date(data.dates.from) 
        : data.dates.from;
      const toDate = typeof data.dates.to === 'string' 
        ? new Date(data.dates.to) 
        : data.dates.to;

      // Ensure dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error("Invalid date format");
      }

      const payload: any = {
        employeeId: String(data.employeeId).trim(),
        leaveTypeId: String(data.leaveTypeId).trim(),
        durationDays: Number(data.durationDays),
        dates: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      };

      // Only include optional fields if they have values (not empty strings)
      if (data.justification && String(data.justification).trim()) {
        payload.justification = String(data.justification).trim();
      }

      if (data.attachmentId && String(data.attachmentId).trim()) {
        payload.attachmentId = String(data.attachmentId).trim();
      }

      const result = await api.post("/leaves/request", payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get leave request by ID
   * GET /leaves/request/:id
   */
  getLeaveRequestById: async (id: string): Promise<LeaveRequest> => {
    return await api.get(`/leaves/request/${id}`) as unknown as LeaveRequest;
  },

  /**
   * Download attachment/document
   * GET /attachments/:attachmentId/download
   * Required roles: HR_MANAGER, HR_ADMIN
   */
  downloadAttachment: async (attachmentId: string): Promise<Blob> => {
    try {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') || '' 
        : '';
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000/api/v1";
      
      // FIXED: Use correct endpoint /leaves/attachments/:id/download
      const response = await fetch(
        `${API_BASE_URL}/leaves/attachments/${attachmentId}/download`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to download attachment: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error("Error downloading attachment:", error);
      throw error;
    }
  },

  /**
   * Verify document (mark as verified)
   * POST /leaves/request/:id/verify-document
   * Required roles: HR_MANAGER
   */
  verifyDocument: async (
    leaveRequestId: string,
    verificationNotes?: string
  ): Promise<LeaveRequest> => {
    try {
      const payload: any = { verified: true };
      if (verificationNotes) {
        payload.verificationNotes = verificationNotes;
      }
      const result = await api.post(`/leaves/request/${leaveRequestId}/verify-document`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error verifying document:", error);
      throw error;
    }
  },

  /**
   * Reject document (mark as invalid)
   * POST /leaves/request/:id/reject-document
   * Required roles: HR_MANAGER
   */
  rejectDocument: async (
    leaveRequestId: string,
    rejectionReason: string
  ): Promise<LeaveRequest> => {
    try {
      const payload = { 
        verified: false,
        rejectionReason 
      };
      const result = await api.post(`/leaves/request/${leaveRequestId}/reject-document`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      throw error;
    }
  },

  /**
   * Update a leave request
   * PUT /leaves/request/:id
   * Required roles: DEPARTMENT_EMPLOYEE, DEPARTMENT_HEAD, HR_ADMIN
   */
  updateLeaveRequest: async (
    id: string,
    data: UpdateLeaveRequestDto
  ): Promise<LeaveRequest> => {
    try {
      const payload: any = {};

      // Only include leaveTypeId if it's provided and not empty
      if (data.leaveTypeId && data.leaveTypeId.trim()) {
        payload.leaveTypeId = data.leaveTypeId.trim();
      }

      // Only include dates if both from and to are provided
      if (data.dates && data.dates.from && data.dates.to) {
        let fromDate: Date;
        let toDate: Date;

        if (typeof data.dates.from === 'string') {
          // Handle YYYY-MM-DD format from date inputs
          if (data.dates.from.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // YYYY-MM-DD format - append T00:00:00.000Z for UTC midnight
            fromDate = new Date(data.dates.from + 'T00:00:00.000Z');
          } else {
            // ISO string or other format
            fromDate = new Date(data.dates.from);
          }
        } else {
          fromDate = data.dates.from;
        }

        if (typeof data.dates.to === 'string') {
          // Handle YYYY-MM-DD format from date inputs
          if (data.dates.to.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // YYYY-MM-DD format - append T00:00:00.000Z for UTC midnight
            toDate = new Date(data.dates.to + 'T00:00:00.000Z');
          } else {
            // ISO string or other format
            toDate = new Date(data.dates.to);
          }
        } else {
          toDate = data.dates.to;
        }

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          throw new Error("Invalid date format");
        }

        // Send dates as ISO strings (NestJS will transform them to Date objects)
        // Use UTC midnight to avoid timezone issues
        payload.dates = {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        };
      }

      // Only include durationDays if it's defined and valid
      if (data.durationDays !== undefined && data.durationDays > 0) {
        payload.durationDays = Number(data.durationDays);
      }

      // Only include justification if it's provided and not empty
      if (data.justification !== undefined && data.justification && String(data.justification).trim()) {
        payload.justification = String(data.justification).trim();
      }

      // Only include attachmentId if it's provided and not empty
      if (data.attachmentId !== undefined && data.attachmentId && String(data.attachmentId).trim()) {
        payload.attachmentId = String(data.attachmentId).trim();
      }

      // Ensure we're sending at least one field to update
      if (Object.keys(payload).length === 0) {
        throw new Error("No fields provided to update. Please modify at least one field.");
      }

      console.log("Update leave request payload:", JSON.stringify(payload, null, 2));
      console.log("Update leave request URL:", `/leaves/request/${id}`);
      
      const result = await api.put(`/leaves/request/${id}`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error updating leave request:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  /**
   * Cancel a leave request
   * POST /leaves/request/:id/cancel
   * Required roles: DEPARTMENT_EMPLOYEE, HR_ADMIN
   */
  cancelLeaveRequest: async (id: string): Promise<LeaveRequest> => {
    try {
      const result = await api.post(`/leaves/request/${id}/cancel`, {});
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error in cancelLeaveRequest:", error);
      throw error;
    }
  },

  /**
   * Upload attachment/document for leave request
   * Note: This tries multiple possible endpoints
   */
  uploadAttachment: async (file: File): Promise<{ attachmentId: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') || '' 
        : '';

      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000/api/v1";

      // Use the correct endpoint
      const endpoint = '/leaves/attachment/upload';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload attachment');
      }

      const data = await response.json();
      const attachmentId = data._id || data.id || data.documentId || data.attachmentId;
      if (!attachmentId) {
        throw new Error('Invalid response: attachment ID not found');
      }
      
      return { attachmentId };
    } catch (error: any) {
      console.error("Error uploading attachment:", error);
      throw error;
    }
  },

  /**
   * Get employee's leave requests
   * GET /leaves/past-requests/:employeeId
   */
  getEmployeeLeaveRequests: async (
    employeeId: string,
    filters?: {
      fromDate?: string;
      toDate?: string;
      status?: string;
      leaveTypeId?: string;
    }
  ): Promise<LeaveRequest[]> => {
    try {
      if (!employeeId || !employeeId.trim()) {
        throw new Error("Employee ID is required");
      }

      const params = new URLSearchParams();
      if (filters?.fromDate && filters.fromDate.trim()) {
        params.append('fromDate', filters.fromDate.trim());
      }
      if (filters?.toDate && filters.toDate.trim()) {
        params.append('toDate', filters.toDate.trim());
      }
      if (filters?.status && filters.status.trim()) {
        // Normalize status to lowercase for backend
        const normalizedStatus = filters.status.trim().toLowerCase();
        params.append('status', normalizedStatus);
        console.log(`[API] Adding status filter: "${filters.status}" -> "${normalizedStatus}"`);
      }
      if (filters?.leaveTypeId && filters.leaveTypeId.trim()) {
        params.append('leaveTypeId', filters.leaveTypeId.trim());
      }

      const queryString = params.toString();
      const url = `/leaves/past-requests/${employeeId.trim()}${queryString ? `?${queryString}` : ''}`;
      console.log(`[API] Request URL: ${url}`);
      
      const result = await api.get(url);
      
      // Handle different response formats
      if (Array.isArray(result)) {
        return result as LeaveRequest[];
      }
      
      // If response has data property
      if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        return result.data as LeaveRequest[];
      }
      
      // If response has items property
      if (result && typeof result === 'object' && 'items' in result && Array.isArray(result.items)) {
        return result.items as LeaveRequest[];
      }
      
      // Fallback: return empty array if format is unexpected
      console.warn("Unexpected response format from getEmployeeLeaveRequests:", result);
      return [];
    } catch (error: any) {
      console.error("Error fetching employee leave requests:", error);
      throw error;
    }
  },

  /**
   * Approve a leave request
   * POST /leaves/request/:id/approve
   * Required roles: DEPARTMENT_HEAD, HR_MANAGER, HR_ADMIN
   */
  approveLeaveRequest: async (leaveRequestId: string): Promise<LeaveRequest> => {
    try {
      const payload = {
        leaveRequestId: String(leaveRequestId).trim(),
        status: 'approved',
      };
      
      const result = await api.post(`/leaves/request/${leaveRequestId}/approve`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error approving leave request:", error);
      throw error;
    }
  },

  /**
   * Reject a leave request
   * POST /leaves/request/:id/reject
   * Required roles: DEPARTMENT_HEAD, HR_MANAGER, HR_ADMIN
   */
  rejectLeaveRequest: async (leaveRequestId: string): Promise<LeaveRequest> => {
    try {
      const payload = {
        leaveRequestId: String(leaveRequestId).trim(),
        status: 'rejected',
      };
      
      const result = await api.post(`/leaves/request/${leaveRequestId}/reject`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error rejecting leave request:", error);
      throw error;
    }
  },

  /**
   * Get pending leave requests for manager review
   * Note: This is a placeholder - backend should provide /leaves/pending/:managerId
   */
  getPendingLeaveRequestsForManager: async (): Promise<LeaveRequest[]> => {
    // Placeholder - managers will search by employee ID instead
    return [];
  },

  // ===== HR MANAGER FUNCTIONS =====
  // NEW CODE: Added HR Manager API functions for finalizing, overriding, and bulk processing leave requests

  /**
   * Finalize an approved leave request (HR Manager action)
   * POST /leaves/request/finalize
   * Required roles: HR_MANAGER, HR_ADMIN
   * This updates employee records and adjusts payroll automatically
   * Note: Backend gets hrUserId from authenticated user, not from payload
   */
  finalizeLeaveRequest: async (leaveRequestId: string): Promise<LeaveRequest> => {
    try {
      // FIXED: Backend gets hrUserId from req.user, so we only send leaveRequestId
      const payload = { leaveRequestId };
      const result = await api.post(`/leaves/request/finalize`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error finalizing leave request:", error);
      throw error;
    }
  },

  /**
   * HR Manager override a manager's decision
   * POST /leaves/request/override
   * Required roles: HR_MANAGER, HR_ADMIN
   * Allows HR to override manager decisions in special circumstances
   */
  overrideDecision: async (
    leaveRequestId: string,
    hrUserId: string,
    overrideToApproved: boolean,
    overrideReason: string
  ): Promise<LeaveRequest> => {
    try {
      // Ensure overrideReason is provided and is a string
      if (!overrideReason || typeof overrideReason !== 'string') {
        throw new Error('Override justification is required');
      }
      const payload = { 
        leaveRequestId, 
        hrUserId, 
        overrideToApproved, 
        overrideReason: overrideReason.trim() 
      };
      const result = await api.post(`/leaves/request/override`, payload);
      return result as unknown as LeaveRequest;
    } catch (error: any) {
      console.error("Error overriding leave decision:", error);
      throw error;
    }
  },

  /**
   * Process multiple leave requests at once (HR Manager action)
   * POST /leaves/request/process-multiple
   * Required roles: HR_MANAGER, HR_ADMIN
   * Allows bulk processing for efficiency
   */
  processMultipleRequests: async (
    leaveRequestIds: string[],
    hrUserId: string,
    approved: boolean
  ): Promise<LeaveRequest[]> => {
    try {
      const payload = { leaveRequestIds, hrUserId, approved };
      const result = await api.post(`/leaves/request/process-multiple`, payload);
      return result as unknown as LeaveRequest[];
    } catch (error: any) {
      console.error("Error processing multiple leave requests:", error);
      throw error;
    }
  },

  // ===== EMPLOYEE FUNCTIONS =====

  /**
   * Get employee leave balance
   * GET /leaves/balance/:employeeId
   */
  getEmployeeLeaveBalance: async (
    employeeId: string,
    leaveTypeId?: string
  ): Promise<any> => {
    try {
      const url = leaveTypeId
        ? `/leaves/balance/${employeeId}?leaveTypeId=${leaveTypeId}`
        : `/leaves/balance/${employeeId}`;
      return await api.get(url);
    } catch (error: any) {
      console.error("Error fetching leave balance:", error);
      throw error;
    }
  },

  /**
   * Filter leave history
   * POST /leaves/filter-history
   */
  filterLeaveHistory: async (
    employeeId: string,
    filters: {
      leaveTypeId?: string;
      fromDate?: string;
      toDate?: string;
      status?: string;
      sortByDate?: 'asc' | 'desc';
      sortByStatus?: 'asc' | 'desc';
      offset?: number;
      limit?: number;
    }
  ): Promise<any> => {
    try {
      // Normalize status to lowercase before sending
      const normalizedFilters = { ...filters };
      if (normalizedFilters.status && typeof normalizedFilters.status === 'string' && normalizedFilters.status.trim()) {
        const originalStatus = normalizedFilters.status;
        normalizedFilters.status = normalizedFilters.status.trim().toLowerCase();
        console.log(`[API] filterLeaveHistory - Normalizing status: "${originalStatus}" -> "${normalizedFilters.status}"`);
      } else if (normalizedFilters.status === '') {
        // Remove empty string status
        delete normalizedFilters.status;
      }
      
      const payload = { employeeId, ...normalizedFilters };
      console.log(`[API] filterLeaveHistory payload:`, payload);
      return await api.post('/leaves/filter-history', payload);
    } catch (error: any) {
      console.error("Error filtering leave history:", error);
      throw error;
    }
  },

  // ===== MANAGER FUNCTIONS =====

  /**
   * Get team leave balances and upcoming leaves
   * GET /leaves/team-balances/:managerId
   */
  getTeamLeaveBalances: async (
    managerId: string,
    upcomingFromDate?: string,
    upcomingToDate?: string,
    departmentId?: string
  ): Promise<any> => {
    try {
      const params = new URLSearchParams();
      if (upcomingFromDate && upcomingFromDate.trim()) {
        params.append('upcomingFromDate', upcomingFromDate.trim());
      }
      if (upcomingToDate && upcomingToDate.trim()) {
        params.append('upcomingToDate', upcomingToDate.trim());
      }
      if (departmentId && departmentId.trim()) {
        params.append('departmentId', departmentId.trim());
        console.log("[API] Adding departmentId to query:", departmentId.trim());
      }

      const queryString = params.toString();
      const url = `/leaves/team-balances/${managerId}${queryString ? `?${queryString}` : ''}`;
      console.log("[API] Request URL:", url);
      return await api.get(url);
    } catch (error: any) {
      console.error("Error fetching team leave balances:", error);
      throw error;
    }
  },

  /**
   * Filter team leave data
   * POST /leaves/filter-team-data
   */
  filterTeamLeaveData: async (
    managerId: string,
    filters: {
      departmentId?: string;
      leaveTypeId?: string;
      fromDate?: string;
      toDate?: string;
      status?: string;
      sortByDate?: 'asc' | 'desc';
      sortByStatus?: 'asc' | 'desc';
      offset?: number;
      limit?: number;
    }
  ): Promise<any> => {
    try {
      const payload = { managerId, ...filters };
      return await api.post('/leaves/filter-team-data', payload);
    } catch (error: any) {
      console.error("Error filtering team leave data:", error);
      throw error;
    }
  },

  /**
   * Flag irregular pattern
   * POST /leaves/flag-irregular-pattern
   */
  flagIrregularPattern: async (
    leaveRequestId: string,
    managerId: string,
    flagReason: string,
    notes?: string
  ): Promise<any> => {
    try {
      const payload = { leaveRequestId, managerId, flagReason, notes };
      return await api.post('/leaves/flag-irregular-pattern', payload);
    } catch (error: any) {
      console.error("Error flagging irregular pattern:", error);
      throw error;
    }
  },

  // ===== HR MANAGER FUNCTIONS =====

  /**
   * Auto accrue leave for single employee
   * POST /leaves/auto-accrue
   */
  autoAccrueLeave: async (
    employeeId: string,
    leaveTypeId: string,
    accrualAmount: number,
    accrualType: string,
    policyId?: string,
    notes?: string
  ): Promise<any> => {
    try {
      const payload = {
        employeeId,
        leaveTypeId,
        accrualAmount,
        accrualType,
        policyId,
        notes,
      };
      return await api.post('/leaves/auto-accrue', payload);
    } catch (error: any) {
      console.error("Error auto accruing leave:", error);
      throw error;
    }
  },

  /**
   * Auto accrue leave for all employees
   * POST /leaves/auto-accrue-all
   */
  autoAccrueAllEmployees: async (
    leaveTypeId: string,
    accrualAmount: number,
    accrualType: string,
    departmentId?: string
  ): Promise<any> => {
    try {
      const payload = {
        leaveTypeId,
        accrualAmount,
        accrualType,
        departmentId,
      };
      return await api.post('/leaves/auto-accrue-all', payload);
    } catch (error: any) {
      console.error("Error auto accruing leave for all employees:", error);
      throw error;
    }
  },

  /**
   * Delegate approval authority
   * POST /leaves/delegate
   * Required roles: DEPARTMENT_HEAD, HR_MANAGER, HR_ADMIN
   */
  delegateApprovalAuthority: async (
    delegateId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> => {
    try {
      const payload = {
        delegateId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      return await api.post('/leaves/delegate', payload);
    } catch (error: any) {
      console.error("Error delegating approval authority:", error);
      throw error;
    }
  },

  /**
   * Run carry-forward
   * POST /leaves/carry-forward
   */
  runCarryForward: async (
    leaveTypeId: string,
    employeeId?: string,
    asOfDate?: string,
    departmentId?: string
  ): Promise<any> => {
    try {
      const payload: any = {
        leaveTypeId,
      };
      
      // Only include optional fields if they have values
      if (employeeId && employeeId.trim()) {
        payload.employeeId = employeeId.trim();
      }
      
      if (asOfDate && asOfDate.trim()) {
        // Convert date string to ISO format for backend
        payload.asOfDate = new Date(asOfDate).toISOString();
      }
      
      if (departmentId && departmentId.trim()) {
        payload.departmentId = departmentId.trim();
      }
      
      console.log("[API] runCarryForward payload:", payload);
      
      const response = await api.post('/leaves/carry-forward', payload);
      console.log("[API] runCarryForward response:", response);
      return response;
    } catch (error: any) {
      console.error("[API] Error running carry-forward:", error);
      console.error("[API] Error response:", error.response?.data);
      console.error("[API] Error status:", error.response?.status);
      throw error;
    }
  },

  /**
   * Adjust accrual
   * POST /leaves/adjust-accrual
   */
  adjustAccrual: async (
    employeeId: string,
    leaveTypeId: string,
    adjustmentType: string,
    adjustmentAmount: number,
    fromDate: string,
    toDate?: string,
    reason?: string,
    notes?: string
  ): Promise<any> => {
    try {
      const payload = {
        employeeId,
        leaveTypeId,
        adjustmentType,
        adjustmentAmount,
        fromDate,
        toDate,
        reason,
        notes,
      };
      return await api.post('/leaves/adjust-accrual', payload);
    } catch (error: any) {
      console.error("Error adjusting accrual:", error);
      throw error;
    }
  },
};

