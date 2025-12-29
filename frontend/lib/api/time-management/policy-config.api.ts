import api from "../client";
import {
  OvertimeLimitsConfig,
  CheckOvertimeLimitsRequest,
  CheckOvertimeLimitsResponse,
  ValidatePreApprovalRequest,
  ValidatePreApprovalResponse,
  Holiday,
  CreateHolidayRequest,
  GetHolidaysFilters,
  BulkCreateHolidaysRequest,
  BulkCreateHolidaysResponse,
  ConfigureRestDaysRequest,
  ConfigureRestDaysResponse,
  LinkHolidaysToShiftRequest,
  LinkHolidaysToShiftResponse,
} from "../../../types/time-management";

// ===== OVERTIME RULE INTERFACES =====
export interface OvertimeRule {
  _id: string;
  name: string;
  description: string;
  active: boolean;
  approved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOvertimeRuleDto {
  name: string;
  description: string;
  active: boolean;
  approved: boolean;
}

export interface UpdateOvertimeRuleDto {
  name: string;
  description: string;
  active: boolean;
  approved: boolean;
}

// ===== LATENESS RULE INTERFACES =====
export interface LatenessRule {
  _id: string;
  name: string;
  description: string;
  gracePeriodMinutes: number;
  deductionForEachMinute: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLatenessRuleDto {
  name: string;
  description: string;
  gracePeriodMinutes: number;
  deductionForEachMinute: number;
  active: boolean;
}

export interface UpdateLatenessRuleDto {
  name: string;
  description: string;
  gracePeriodMinutes: number;
  deductionForEachMinute: number;
  active: boolean;
}

// ===== PERMISSION POLICY INTERFACES =====
export interface PermissionPolicy {
  _id: string;
  name: string;
  description: string;
  permissionType: 'EARLY_IN' | 'LATE_OUT' | 'OUT_OF_HOURS' | 'TOTAL_OVERTIME' | 'SHORT_TIME';
  maxDurationMinutes: number;
  requiresApproval: boolean;
  affectsPayroll: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePermissionPolicyDto {
  name: string;
  description: string;
  permissionType: 'EARLY_IN' | 'LATE_OUT' | 'OUT_OF_HOURS' | 'TOTAL_OVERTIME' | 'SHORT_TIME';
  maxDurationMinutes: number;
  requiresApproval: boolean;
  affectsPayroll: boolean;
  active: boolean;
}

export interface UpdatePermissionPolicyDto {
  name: string;
  description: string;
  permissionType: 'EARLY_IN' | 'LATE_OUT' | 'OUT_OF_HOURS' | 'TOTAL_OVERTIME' | 'SHORT_TIME';
  maxDurationMinutes: number;
  requiresApproval: boolean;
  affectsPayroll: boolean;
  active: boolean;
}

export const policyConfigApi = {
  // ===== OVERTIME RULES (BR-TM-10) =====
  
  // POST create overtime rule
  createOvertimeRule: async (data: CreateOvertimeRuleDto): Promise<OvertimeRule> => {
    return await api.post("/policy-config/overtime", data);
  },
  
  // GET all overtime rules
  getOvertimeRules: async (filters?: { active?: boolean; approved?: boolean }): Promise<OvertimeRule[]> => {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) {
      params.append("active", String(filters.active));
    }
    if (filters?.approved !== undefined) {
      params.append("approved", String(filters.approved));
    }
    const queryString = params.toString();
    const url = queryString ? `/policy-config/overtime?${queryString}` : "/policy-config/overtime";
    const response: any = await api.get(url);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET overtime rule by ID
  getOvertimeRuleById: async (id: string): Promise<OvertimeRule> => {
    return await api.get(`/policy-config/overtime/${id}`);
  },
  
  // PUT update overtime rule
  updateOvertimeRule: async (id: string, data: UpdateOvertimeRuleDto): Promise<OvertimeRule> => {
    return await api.put(`/policy-config/overtime/${id}`, data);
  },
  
  // DELETE overtime rule
  deleteOvertimeRule: async (id: string): Promise<void> => {
    return await api.delete(`/policy-config/overtime/${id}`);
  },

  // ===== LATENESS RULES (BR-TM-11) =====
  
  // POST create lateness rule
  createLatenessRule: async (data: CreateLatenessRuleDto): Promise<LatenessRule> => {
    return await api.post("/policy-config/lateness", data);
  },
  
  // GET all lateness rules
  getLatenessRules: async (filters?: { active?: boolean }): Promise<LatenessRule[]> => {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append("active", filters.active.toString());
    const queryString = params.toString();
    const response: any = await api.get(`/policy-config/lateness${queryString ? `?${queryString}` : ""}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET lateness rule by ID
  getLatenessRuleById: async (id: string): Promise<LatenessRule> => {
    return await api.get(`/policy-config/lateness/${id}`);
  },
  
  // PUT update lateness rule
  updateLatenessRule: async (id: string, data: UpdateLatenessRuleDto): Promise<LatenessRule> => {
    return await api.put(`/policy-config/lateness/${id}`, data);
  },
  
  // DELETE lateness rule
  deleteLatenessRule: async (id: string): Promise<void> => {
    return await api.delete(`/policy-config/lateness/${id}`);
  },

  // ===== OVERTIME LIMITS =====
  // GET overtime limits configuration
  getOvertimeLimitsConfig: async (): Promise<OvertimeLimitsConfig> => {
    return await api.get("/policy-config/overtime/limits/config");
  },

  // POST check overtime against limits
  checkOvertimeLimits: async (
    request: CheckOvertimeLimitsRequest
  ): Promise<CheckOvertimeLimitsResponse> => {
    return await api.post("/policy-config/overtime/limits/check", request);
  },

  // POST validate overtime pre-approval
  validateOvertimePreApproval: async (
    request: ValidatePreApprovalRequest
  ): Promise<ValidatePreApprovalResponse> => {
    return await api.post("/policy-config/overtime/validate-preapproval", {
      employeeId: request.employeeId,
      date: request.date,
      expectedOvertimeMinutes: request.expectedOvertimeMinutes,
    });
  },

  // ===== Holiday & Rest Day APIs =====

  // POST create holiday
  createHoliday: async (request: CreateHolidayRequest): Promise<Holiday> => {
    return await api.post("/policy-config/holiday", {
      ...request,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
    });
  },

  // GET holidays with filters
  getHolidays: async (filters?: GetHolidaysFilters): Promise<Holiday[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.active !== undefined) params.append("active", filters.active.toString());
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    const queryString = params.toString();
    const url = `/policy-config/holiday${queryString ? `?${queryString}` : ""}`;
    console.log("getHolidays API URL:", url);
    return await api.get(url);
  },

  // GET upcoming holidays
  getUpcomingHolidays: async (days?: number): Promise<Holiday[]> => {
    const queryString = days ? `?days=${days}` : "";
    return await api.get(`/policy-config/holiday/upcoming${queryString}`);
  },

  // GET holiday by ID
  getHolidayById: async (id: string): Promise<Holiday> => {
    return await api.get(`/policy-config/holiday/${id}`);
  },

  // PUT update holiday
  updateHoliday: async (id: string, request: CreateHolidayRequest): Promise<Holiday> => {
    return await api.put(`/policy-config/holiday/${id}`, {
      ...request,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
    });
  },

  // DELETE holiday
  deleteHoliday: async (id: string): Promise<void> => {
    return await api.delete(`/policy-config/holiday/${id}`);
  },

  // POST bulk create holidays
  bulkCreateHolidays: async (
    request: BulkCreateHolidaysRequest
  ): Promise<BulkCreateHolidaysResponse> => {
    return await api.post("/policy-config/holiday/bulk", {
      ...request,
      holidays: request.holidays.map((h) => ({
        ...h,
        startDate: new Date(h.startDate),
        endDate: h.endDate ? new Date(h.endDate) : undefined,
      })),
    });
  },

  // POST configure rest days
  configureRestDays: async (
    request: ConfigureRestDaysRequest
  ): Promise<ConfigureRestDaysResponse> => {
    return await api.post("/policy-config/rest-days/configure", {
      ...request,
      effectiveFrom: request.effectiveFrom ? new Date(request.effectiveFrom) : undefined,
      effectiveTo: request.effectiveTo ? new Date(request.effectiveTo) : undefined,
    });
  },

  // POST link holidays to shift
  linkHolidaysToShift: async (
    request: LinkHolidaysToShiftRequest
  ): Promise<LinkHolidaysToShiftResponse> => {
    return await api.post("/policy-config/holiday/link-to-shift", request);
  },

  // ===== PERMISSION POLICIES =====
  
  // POST create permission policy
  createPermissionPolicy: async (data: CreatePermissionPolicyDto): Promise<PermissionPolicy> => {
    return await api.post("/policy-config/permission-policy", data);
  },
  
  // GET all permission policies
  getPermissionPolicies: async (): Promise<PermissionPolicy[]> => {
    const response: any = await api.get("/policy-config/permission-policy");
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET permission policy by ID
  getPermissionPolicyById: async (id: string): Promise<PermissionPolicy> => {
    return await api.get(`/policy-config/permission-policy/${id}`);
  },
  
  // PUT update permission policy
  updatePermissionPolicy: async (id: string, data: UpdatePermissionPolicyDto): Promise<PermissionPolicy> => {
    return await api.put(`/policy-config/permission-policy/${id}`, data);
  },
  
  // DELETE permission policy
  deletePermissionPolicy: async (id: string): Promise<void> => {
    return await api.delete(`/policy-config/permission-policy/${id}`);
  },
};

