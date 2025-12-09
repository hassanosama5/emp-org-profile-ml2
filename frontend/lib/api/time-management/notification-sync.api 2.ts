import api from "../client";

export const notificationSyncApi = {
  // Shift Expiry Notifications
  getShiftExpiryNotifications: async (hrAdminId: string) => {
    return await api.get(`/notification-sync/shift-expiry/${hrAdminId}`);
  },

  checkExpiringShifts: async (daysBeforeExpiry?: number) => {
    return await api.post("/time-management/automation/check-expiring-shifts", {
      daysBeforeExpiry: daysBeforeExpiry || 7,
    });
  },

  // Attendance-to-Payroll Sync
  runDailyPayrollSync: async (syncDate: Date) => {
    return await api.post("/notification-sync/sync/daily-batch", { syncDate });
  },

  syncAttendanceWithPayroll: async (data: {
    startDate: Date;
    endDate: Date;
    employeeIds?: string[];
    departmentId?: string;
  }) => {
    return await api.post("/notification-sync/sync/attendance", data);
  },

  syncLeaveWithPayroll: async (data: {
    startDate: Date;
    endDate: Date;
    employeeIds?: string[];
    departmentId?: string;
  }) => {
    return await api.post("/notification-sync/sync/leave", data);
  },

  synchronizeAttendanceAndPayroll: async (data: {
    startDate: Date;
    endDate: Date;
    employeeIds?: string[];
    departmentId?: string;
  }) => {
    return await api.post("/notification-sync/sync/attendance-leave", data);
  },

  // Payroll Cut-Off Escalation
  getPendingRequestsBeforePayrollCutoff: async (filters?: {
    payrollCutoffDate?: Date;
    departmentId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.payrollCutoffDate) params.append('payrollCutoffDate', filters.payrollCutoffDate.toISOString());
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    const query = params.toString();
    return await api.get(`/notification-sync/payroll-cutoff/pending${query ? `?${query}` : ''}`);
  },

  autoEscalateBeforePayrollCutoff: async (data: {
    payrollCutoffDate?: Date;
    escalationDaysBefore?: number;
    notifyManagers?: boolean;
  }) => {
    return await api.post("/notification-sync/payroll-cutoff/auto-escalate", data);
  },
};

