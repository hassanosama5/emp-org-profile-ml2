import { api } from "./client";
import { Notification, GetNotificationsResponse } from "@/types/notifications";

/**
 * Get all notifications for the current user
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    console.log("Fetching notifications from /notifications endpoint...");
    const response = await api.get<any>("/notifications");
    console.log("Notifications API response:", response);

    // Handle both array and wrapped response
    // The axios interceptor returns response.data, so response should be the data directly
    let notifications: any[] = [];
    if (Array.isArray(response)) {
      notifications = response;
      console.log(`Found ${notifications.length} notifications (array format)`);
    } else if (
      response &&
      typeof response === "object" &&
      "data" in response &&
      Array.isArray((response as any).data)
    ) {
      notifications = (response as any).data;
      console.log(
        `Found ${notifications.length} notifications (wrapped format)`
      );
    } else if (response && typeof response === "object" && response !== null) {
      // Check if response itself is a notification object (single notification)
      // Type assertion to handle the response as any object
      const responseObj: any = response;
      if (responseObj._id || responseObj.type) {
        notifications = [responseObj];
        console.log("Found 1 notification (single object format)");
      } else {
        console.warn("Unexpected response format:", response);
        notifications = [];
      }
    } else {
      console.warn("Response is not an array or object:", response);
      notifications = [];
    }

    // Transform notifications to ensure proper format
    const transformed = notifications.map((notif: any) => ({
      _id: notif._id?.toString() || notif._id,
      to: notif.to?.toString() || notif.to,
      type: notif.type || "",
      message: notif.message || "",
      isRead: notif.isRead ?? false,
      createdAt: notif.createdAt ? new Date(notif.createdAt) : new Date(),
      updatedAt: notif.updatedAt ? new Date(notif.updatedAt) : undefined,
      source: notif.source,
      title: notif.title,
      data: notif.data, // Include assignment data for shift expiry notifications
    }));

    console.log(`Transformed ${transformed.length} notifications`);
    return transformed;
  } catch (error: any) {
    // Handle timeout errors gracefully (backend may be slow or unavailable)
    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      // Silently return empty array for timeout errors - notifications are optional
      return [];
    }
    
    // Return empty array instead of throwing on 404
    if (error.response?.status === 404) {
      console.log("No notifications found (404 is expected)");
      // Silently return empty array for 404 - notifications endpoint may not be implemented
      return [];
    }
    console.error("Failed to fetch notifications:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    
    // Only log non-timeout, non-404 errors
    if (error.response?.status !== 404 && !error.message?.includes('timeout') && error.code !== 'ECONNABORTED') {
      console.error('Failed to fetch notifications:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    
    // Return empty array on error instead of throwing
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<Notification> {
  try {
    const response = await api.patch<Notification>(
      `/notifications/${notificationId}/read`
    );
    return response as unknown as Notification;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<void> {
  try {
    await api.delete(`/notifications/${notificationId}`);
  } catch (error) {
    console.error("Failed to delete notification:", error);
    throw error;
  }
}

/**
 * Notify when leave request is finalized
 * Called internally by Leaves module
 */
export async function notifyLeaveRequestFinalized(
  leaveRequestId: string,
  employeeId: string,
  managerId: string,
  coordinatorId: string,
  leaveDetails: any
): Promise<any> {
  try {
    const response = await api.post("/notifications/leave/finalized", {
      leaveRequestId,
      employeeId,
      managerId,
      coordinatorId,
      leaveDetails,
    });
    return response;
  } catch (error) {
    console.error("Failed to notify leave request finalized:", error);
    throw error;
  }
}

/**
 * Notify manager when new leave request is created
 * Called internally by Leaves module
 */
export async function notifyLeaveRequestCreated(
  leaveRequestId: string,
  employeeId: string,
  managerId: string,
  leaveDetails: any
): Promise<any> {
  try {
    const response = await api.post("/notifications/leave/created", {
      leaveRequestId,
      employeeId,
      managerId,
      leaveDetails,
    });
    return response;
  } catch (error) {
    console.error("Failed to notify leave request created:", error);
    throw error;
  }
}

/**
 * Notify employee when leave request status changes
 * Called internally by Leaves module
 */
export async function notifyLeaveRequestStatusChanged(
  leaveRequestId: string,
  employeeId: string,
  status: "APPROVED" | "REJECTED" | "RETURNED_FOR_CORRECTION" | "MODIFIED"
): Promise<any> {
  try {
    const response = await api.post("/notifications/leave/status-changed", {
      leaveRequestId,
      employeeId,
      status,
    });
    return response;
  } catch (error) {
    console.error("Failed to notify leave request status changed:", error);
    throw error;
  }
}

/**
 * Notify HR Admin when shift assignment is nearing expiry
 * Called internally by Time Management module
 */
export async function notifyShiftAssignmentExpiry(
  shiftAssignmentId: string,
  hrAdminId: string,
  employeeDetails: any,
  expiryDate: Date
): Promise<any> {
  try {
    const response = await api.post("/notifications/shift/expiry", {
      shiftAssignmentId,
      hrAdminId,
      employeeDetails,
      expiryDate,
    });
    return response;
  } catch (error) {
    console.error("Failed to notify shift assignment expiry:", error);
    throw error;
  }
}

/**
 * Notify about missed punch
 * Called internally by Time Management module
 */
export async function notifyMissedPunch(
  employeeId: string,
  managerId: string,
  coordinatorId: string,
  attendanceDetails: any
): Promise<any> {
  try {
    const response = await api.post("/notifications/attendance/missed-punch", {
      employeeId,
      managerId,
      coordinatorId,
      attendanceDetails,
    });
    return response;
  } catch (error) {
    console.error("Failed to notify missed punch:", error);
    throw error;
  }
}

/**
 * Get shift expiry notifications for HR Admin
 */
export async function getShiftExpiryNotifications(hrAdminId: string): Promise<{
  count: number;
  notifications: any[];
}> {
  try {
    const response = await api.get(`/notifications/shift-expiry/${hrAdminId}`);
    return response as any;
  } catch (error) {
    console.error("Failed to get shift expiry notifications:", error);
    throw error;
  }
}

/**
 * Check for expiring shifts
 * Called by Time Management module or HR Admin
 */
export async function checkExpiringShifts(
  daysBeforeExpiry?: number
): Promise<any> {
  try {
    const response = await api.post(
      "/time-management/automation/check-expiring-shifts",
      {
        daysBeforeExpiry: daysBeforeExpiry || 7,
      }
    );
    return response;
  } catch (error) {
    console.error("Failed to check expiring shifts:", error);
    throw error;
  }
}

/**
 * Create shift expiry notifications for HR Admins
 * Called after finding expiring shifts to notify HR Admins
 */
export async function createShiftExpiryNotifications(
  hrAdminIds: string[],
  expiringAssignments: Array<{
    assignmentId: string;
    employeeId: string;
    employeeName?: string;
    shiftName?: string;
    endDate: Date;
    daysRemaining: number;
  }>
): Promise<any> {
  try {
    const response = await api.post("/notifications/shift-expiry/notify-bulk", {
      hrAdminIds,
      expiringAssignments: expiringAssignments.map((a) => ({
        ...a,
        endDate:
          a.endDate instanceof Date ? a.endDate.toISOString() : a.endDate,
      })),
    });
    return response;
  } catch (error) {
    console.error("Failed to create shift expiry notifications:", error);
    // Don't throw - this is secondary to the check
    return null;
  }
}

/**
 * TEST FUNCTION: Create a test notification for development
 * Remove before production
 */
export async function createTestNotification(): Promise<any> {
  try {
    const response = await api.post("/notifications/test/create");
    return response;
  } catch (error) {
    console.error("Failed to create test notification:", error);
    throw error;
  }
}

/**
 * Notify HR when profile change request is submitted (N-040)
 * Called by Employee Profile module
 */
export async function notifyProfileChangeRequestSubmitted(
  employeeId: string,
  changeRequestId: string,
  changeDescription: string
): Promise<any> {
  try {
    const response = await api.post(
      "/notifications/profile/change-request/submitted",
      {
        employeeId,
        changeRequestId,
        changeDescription,
      }
    );
    return response;
  } catch (error) {
    console.error("Failed to notify profile change request submitted:", error);
    // Don't throw - notification failure shouldn't block the main action
    return null;
  }
}

/**
 * Notify employee when change request is processed (N-037)
 * Called by Employee Profile module
 */
export async function notifyProfileChangeRequestProcessed(
  employeeId: string,
  changeRequestId: string,
  status: "APPROVED" | "REJECTED",
  reason?: string
): Promise<any> {
  try {
    const response = await api.post(
      "/notifications/profile/change-request/processed",
      {
        employeeId,
        changeRequestId,
        status,
        reason,
      }
    );
    return response;
  } catch (error) {
    console.error("Failed to notify profile change request processed:", error);
    return null;
  }
}

/**
 * Notify employee when profile is updated by HR
 */
export async function notifyProfileUpdated(
  employeeId: string,
  updatedBy: string,
  changes: string[]
): Promise<any> {
  try {
    const response = await api.post("/notifications/profile/updated", {
      employeeId,
      updatedBy,
      changes,
    });
    return response;
  } catch (error) {
    console.error("Failed to notify profile updated:", error);
    return null;
  }
}
