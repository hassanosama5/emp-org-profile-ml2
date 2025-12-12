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

export const policyConfigApi = {
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
    return await api.get(url);
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
};

