import api from "../client";
import {
  ShiftExpiryNotification,
  CheckExpiringShiftsResponse,
} from "../../../types/time-management";
//hiii 

export const notificationSyncApi = {
  // GET shift expiry notifications for HR Admin
  getShiftExpiryNotifications: async (hrAdminId: string): Promise<{
    count: number;
    notifications: ShiftExpiryNotification[];
  }> => {
    return await api.get(`/notification-sync/shift-expiry/${hrAdminId}`);
  },

  // POST trigger check for expiring shifts
  checkExpiringShifts: async (daysBeforeExpiry?: number): Promise<CheckExpiringShiftsResponse> => {
    return await api.post("/time-management/automation/check-expiring-shifts", {
      daysBeforeExpiry: daysBeforeExpiry || 7,
    });
  },
};

