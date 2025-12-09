import api from "../client";
import {
  Holiday,
  CreateHolidayDto,
  UpdateHolidayDto,
  HolidayType,
  OvertimeRule,
  LatenessRule,
} from "../../../types/time-management";

export const policyConfigApi = {
  // Holidays
  createHoliday: async (data: CreateHolidayDto): Promise<Holiday> => {
    return await api.post("/policy-config/holiday", data);
  },

  getHolidays: async (filters?: {
    year?: number;
    month?: number;
    type?: HolidayType;
  }): Promise<Holiday[]> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.type) params.append('type', filters.type);
    const query = params.toString();
    return await api.get(`/policy-config/holiday${query ? `?${query}` : ''}`);
  },

  getHolidayById: async (id: string): Promise<Holiday> => {
    return await api.get(`/policy-config/holiday/${id}`);
  },

  updateHoliday: async (id: string, data: UpdateHolidayDto): Promise<Holiday> => {
    return await api.put(`/policy-config/holiday/${id}`, data);
  },

  deleteHoliday: async (id: string): Promise<void> => {
    return await api.delete(`/policy-config/holiday/${id}`);
  },

  bulkCreateHolidays: async (data: {
    holidays: Array<{
      name: string;
      type: string;
      startDate: Date;
      endDate?: Date;
    }>;
    year?: number;
  }) => {
    return await api.post("/policy-config/holiday/bulk", data);
  },

  linkHolidaysToShift: async (data: {
    shiftId: string;
    holidayIds: string[];
    action: 'NO_WORK' | 'OPTIONAL' | 'OVERTIME_ELIGIBLE';
  }) => {
    return await api.post("/policy-config/holiday/link-to-shift", data);
  },

  // Rest Days
  configureWeeklyRestDays: async (data: {
    restDays: number[];
    effectiveFrom?: Date;
    effectiveTo?: Date;
    departmentId?: string;
  }) => {
    return await api.post("/policy-config/rest-days/configure", data);
  },

  // Overtime Rules
  getOvertimeRules: async (filters?: { active?: boolean }): Promise<OvertimeRule[]> => {
    const params = filters?.active !== undefined ? `?active=${filters.active}` : '';
    return await api.get(`/policy-config/overtime${params}`);
  },

  getOvertimeRuleById: async (id: string): Promise<OvertimeRule> => {
    return await api.get(`/policy-config/overtime/${id}`);
  },

  getApplicableOvertimeRules: async (date: Date) => {
    return await api.get(`/policy-config/overtime/applicable/${date.toISOString()}`);
  },

  getOvertimeLimitsConfig: async () => {
    return await api.get("/policy-config/overtime/limits/config");
  },

  checkOvertimeLimits: async (data: {
    employeeId: string;
    currentOvertimeMinutes: number;
    period: 'daily' | 'weekly' | 'monthly';
    additionalOvertimeMinutes?: number;
  }) => {
    return await api.post("/policy-config/overtime/limits/check", data);
  },

  validateOvertimePreApproval: async (data: {
    employeeId: string;
    date: Date;
    expectedOvertimeMinutes: number;
  }) => {
    return await api.post("/policy-config/overtime/validate-preapproval", {
      ...data,
      date: data.date.toISOString(),
    });
  },

  // Lateness Rules
  getLatenessRules: async (filters?: { active?: boolean }): Promise<LatenessRule[]> => {
    const params = filters?.active !== undefined ? `?active=${filters.active}` : '';
    return await api.get(`/policy-config/lateness${params}`);
  },

  getLatenessRuleById: async (id: string): Promise<LatenessRule> => {
    return await api.get(`/policy-config/lateness/${id}`);
  },

  getLatenessThresholdsConfig: async () => {
    return await api.get("/policy-config/lateness/thresholds/config");
  },
};

