import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateNotificationDto } from './dtos/notification.dto';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('NotificationLog')
    private notificationLogModel: Model<any>,
    @InjectModel('ShiftAssignment')
    private shiftAssignmentModel: Model<any>,
    @InjectModel('EmployeeProfile')
    private employeeProfileModel: Model<any>,
  ) {}

  // ===== LEAVE MODULE NOTIFICATIONS =====

  /**
   * REQ: As an HR manager, I want the system to notify the employee, the employee's manager, 
   * and the attendance coordinator when a leave request is finalized so that everyone is informed.
   */
  async notifyLeaveRequestFinalized(
    leaveRequestId: string,
    employeeId: string,
    managerId: string,
    coordinatorId: string,
    leaveDetails: any,
  ) {
    const notifications = [];
    
    // Handle missing leaveDetails gracefully
    const details = leaveDetails || {
      employeeName: 'Employee',
      fromDate: '',
      toDate: '',
      status: 'APPROVED',
    };
    
    const message = `Leave request from ${details.employeeName} (${details.fromDate} to ${details.toDate}) has been finalized with status: ${details.status}`;

    // Notify Employee
    notifications.push(
      this.notificationLogModel.create({
        to: new Types.ObjectId(employeeId),
        type: NotificationType.LEAVE_FINALIZED,
        message: `Your leave request has been ${details.status}`,
      }),
    );

    // Notify Manager
    notifications.push(
      this.notificationLogModel.create({
        to: new Types.ObjectId(managerId),
        type: NotificationType.LEAVE_FINALIZED,
        message: message,
      }),
    );

    // Notify Attendance Coordinator
    notifications.push(
      this.notificationLogModel.create({
        to: new Types.ObjectId(coordinatorId),
        type: NotificationType.LEAVE_FINALIZED,
        message: message,
      }),
    );

    await Promise.all(notifications);
    return { success: true, notificationsCreated: 3 };
  }

  /**
   * REQ: As a direct manager, I want to receive notifications when a new leave request 
   * is assigned to me so that I can review it promptly.
   */
  async notifyLeaveRequestCreated(
    leaveRequestId: string,
    employeeId: string,
    managerId: string,
    leaveDetails: any,
  ) {
    // Handle missing leaveDetails gracefully
    const details = leaveDetails || {
      employeeName: 'Employee',
      fromDate: '',
      toDate: '',
    };

    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(managerId),
      type: NotificationType.LEAVE_CREATED,
      message: `New leave request from ${details.employeeName} (${details.fromDate} to ${details.toDate}) awaiting your review`,
    });

    return notification;
  }

  /**
   * REQ: As an employee, I want to receive notifications when my leave request is approved, 
   * rejected, returned for correction, or modified so that I am always informed about the progress.
   */
  async notifyLeaveRequestStatusChanged(
    leaveRequestId: string,
    employeeId: string,
    status: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION' | 'MODIFIED',
  ) {
    const statusMessages = {
      APPROVED: 'Your leave request has been approved',
      REJECTED: 'Your leave request has been rejected',
      RETURNED_FOR_CORRECTION: 'Your leave request has been returned for correction',
      MODIFIED: 'Your leave request has been modified',
    };

    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(employeeId),
      type: this.mapStatusToNotificationType(status),
      message: statusMessages[status],
    });

    return notification;
  }

  // ===== TIME MANAGEMENT MODULE NOTIFICATIONS =====

  /**
   * REQ: As an HR Admin, I want to be notified when a shift assignment is nearing expiry 
   * so that schedules can be renewed or reassigned.
   * Send shift expiry notification to HR Admin
   */
  async sendShiftExpiryNotification(
    recipientId: string,
    shiftAssignmentId: string,
    employeeId: string,
    endDate: Date,
    daysRemaining: number,
    currentUserId: string,
  ) {
    const message = `Shift assignment ${shiftAssignmentId} for employee ${employeeId} is expiring in ${daysRemaining} days (${endDate.toISOString().split('T')[0]}). Please renew or reassign.`;
    
    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(recipientId),
      type: NotificationType.SHIFT_EXPIRY_ALERT,
      message,
    });
    
    return notification;
  }

  /**
   * Send bulk shift expiry notifications to HR Admins
   * Used when running batch expiry checks
   */
  async sendBulkShiftExpiryNotifications(
    hrAdminIds: string[],
    expiringAssignments: Array<{
      assignmentId: string;
      employeeId: string;
      employeeName?: string;
      shiftName?: string;
      endDate: Date;
      daysRemaining: number;
    }>,
    currentUserId: string,
  ) {
    const notifications: any[] = [];
    
    for (const hrAdminId of hrAdminIds) {
      // Create summary message for HR Admin
      const message = `${expiringAssignments.length} shift assignment(s) expiring soon:\n` +
        expiringAssignments
          .map(a => `- ${a.employeeName || a.employeeId}: ${a.shiftName || 'Shift'} expires in ${a.daysRemaining} days`)
          .join('\n');
      
      const notification = await this.notificationLogModel.create({
        to: new Types.ObjectId(hrAdminId),
        type: NotificationType.SHIFT_EXPIRY_BULK_ALERT,
        message,
      });
      
      notifications.push(notification);
    }
    
    return {
      notificationsSent: notifications.length,
      notifications,
    };
  }

  /**
   * Get shift expiry notifications for an HR Admin
   */
  async getShiftExpiryNotifications(hrAdminId: string) {
    const notifications = await this.notificationLogModel
      .find({
        to: new Types.ObjectId(hrAdminId),
        type: { $in: [NotificationType.SHIFT_EXPIRY_ALERT, NotificationType.SHIFT_EXPIRY_BULK_ALERT] },
      })
      .sort({ createdAt: -1 })
      .exec();
    
    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Send renewal confirmation notification
   * Sent when a shift assignment is successfully renewed
   */
  async sendShiftRenewalConfirmation(
    recipientId: string,
    shiftAssignmentId: string,
    newEndDate: Date,
    currentUserId: string,
  ) {
    const message = `Shift assignment ${shiftAssignmentId} has been renewed. New end date: ${newEndDate.toISOString().split('T')[0]}.`;
    
    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(recipientId),
      type: NotificationType.SHIFT_RENEWAL_CONFIRMATION,
      message,
    });
    
    return notification;
  }

  /**
   * Send archive notification
   * Sent when a shift assignment is archived/expired
   */
  async sendShiftArchiveNotification(
    recipientId: string,
    shiftAssignmentId: string,
    employeeId: string,
    currentUserId: string,
  ) {
    const message = `Shift assignment ${shiftAssignmentId} for employee ${employeeId} has been archived/expired. Consider creating a new assignment if needed.`;
    
    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(recipientId),
      type: NotificationType.SHIFT_ARCHIVE_NOTIFICATION,
      message,
    });
    
    return notification;
  }

  /**
   * Get all shift-related notifications (expiry, renewal, archive)
   */
  async getAllShiftNotifications(hrAdminId: string) {
    const notifications = await this.notificationLogModel
      .find({
        to: new Types.ObjectId(hrAdminId),
        type: {
          $in: [
            NotificationType.SHIFT_EXPIRY_ALERT,
            NotificationType.SHIFT_EXPIRY_BULK_ALERT,
            NotificationType.SHIFT_RENEWAL_CONFIRMATION,
            NotificationType.SHIFT_ARCHIVE_NOTIFICATION,
          ],
        },
      })
      .sort({ createdAt: -1 })
      .exec();
    
    // Group by type for better organization
    const grouped = {
      expiryAlerts: notifications.filter(n => 
        n.type === NotificationType.SHIFT_EXPIRY_ALERT || n.type === NotificationType.SHIFT_EXPIRY_BULK_ALERT
      ),
      renewalConfirmations: notifications.filter(n => 
        n.type === NotificationType.SHIFT_RENEWAL_CONFIRMATION
      ),
      archiveNotifications: notifications.filter(n => 
        n.type === NotificationType.SHIFT_ARCHIVE_NOTIFICATION
      ),
    };
    
    return {
      totalCount: notifications.length,
      grouped,
      all: notifications,
    };
  }

  /**
   * REQ: Missed punches/late sign-ins must be handled via auto-flagging, notifications, or payroll blocking.
   * Send missed punch alert to employee
   */
  async sendMissedPunchAlertToEmployee(
    employeeId: string,
    attendanceRecordId: string,
    missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT',
    date: Date,
    currentUserId: string,
  ) {
    const message = `Missed ${missedPunchType === 'CLOCK_IN' ? 'clock-in' : 'clock-out'} detected on ${date.toISOString().split('T')[0]}. Please submit a correction request.`;
    
    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(employeeId),
      type: NotificationType.MISSED_PUNCH_EMPLOYEE_ALERT,
      message,
    });
    
    return notification;
  }

  /**
   * Send missed punch alert to manager/line manager
   */
  async sendMissedPunchAlertToManager(
    managerId: string,
    employeeId: string,
    employeeName: string,
    attendanceRecordId: string,
    missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT',
    date: Date,
    currentUserId: string,
  ) {
    const message = `Employee ${employeeName} (${employeeId}) has a missed ${missedPunchType === 'CLOCK_IN' ? 'clock-in' : 'clock-out'} on ${date.toISOString().split('T')[0]}. Pending correction review.`;
    
    const notification = await this.notificationLogModel.create({
      to: new Types.ObjectId(managerId),
      type: NotificationType.MISSED_PUNCH_MANAGER_ALERT,
      message,
    });
    
    return notification;
  }

  /**
   * Send bulk missed punch alerts
   */
  async sendBulkMissedPunchAlerts(
    alerts: Array<{
      employeeId: string;
      managerId?: string;
      employeeName?: string;
      attendanceRecordId: string;
      missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
      date: Date;
    }>,
    currentUserId: string,
  ) {
    const notifications: any[] = [];
    
    for (const alert of alerts) {
      // Send to employee
      const employeeNotification = await this.sendMissedPunchAlertToEmployee(
        alert.employeeId,
        alert.attendanceRecordId,
        alert.missedPunchType,
        alert.date,
        currentUserId,
      );
      notifications.push({ type: 'employee', notification: employeeNotification });
      
      // Send to manager if provided
      if (alert.managerId) {
        const managerNotification = await this.sendMissedPunchAlertToManager(
          alert.managerId,
          alert.employeeId,
          alert.employeeName || 'Unknown Employee',
          alert.attendanceRecordId,
          alert.missedPunchType,
          alert.date,
          currentUserId,
        );
        notifications.push({ type: 'manager', notification: managerNotification });
      }
    }
    
    return {
      alertsProcessed: alerts.length,
      notificationsSent: notifications.length,
      notifications,
    };
  }

  /**
   * Get missed punch notifications for an employee
   */
  async getMissedPunchNotificationsByEmployee(employeeId: string) {
    const notifications = await this.notificationLogModel
      .find({
        to: new Types.ObjectId(employeeId),
        type: NotificationType.MISSED_PUNCH_EMPLOYEE_ALERT,
      })
      .sort({ createdAt: -1 })
      .exec();
    
    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Get missed punch notifications for a manager
   */
  async getMissedPunchNotificationsByManager(managerId: string) {
    const notifications = await this.notificationLogModel
      .find({
        to: new Types.ObjectId(managerId),
        type: NotificationType.MISSED_PUNCH_MANAGER_ALERT,
      })
      .sort({ createdAt: -1 })
      .exec();
    
    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Get all missed punch notifications (for HR Admin)
   */
  async getAllMissedPunchNotifications(
    filters: { startDate?: Date; endDate?: Date },
  ) {
    const query: any = {
      type: { $in: [NotificationType.MISSED_PUNCH_EMPLOYEE_ALERT, NotificationType.MISSED_PUNCH_MANAGER_ALERT] },
    };
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: filters.startDate,
        $lte: filters.endDate,
      };
    }
    
    const notifications = await this.notificationLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    // Group by type
    const employeeAlerts = notifications.filter(n => n.type === NotificationType.MISSED_PUNCH_EMPLOYEE_ALERT);
    const managerAlerts = notifications.filter(n => n.type === NotificationType.MISSED_PUNCH_MANAGER_ALERT);
    
    return {
      total: notifications.length,
      employeeAlerts: {
        count: employeeAlerts.length,
        notifications: employeeAlerts,
      },
      managerAlerts: {
        count: managerAlerts.length,
        notifications: managerAlerts,
      },
    };
  }

  /**
   * Legacy method for backward compatibility
   * REQ: As an HR Admin, I want to be notified when a shift assignment is nearing expiry 
   * so that schedules can be renewed or reassigned.
   */
  async notifyShiftAssignmentExpiry(
    shiftAssignmentId: string,
    hrAdminId: string,
    employeeDetails: any,
    expiryDate: Date,
  ) {
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    return this.sendShiftExpiryNotification(
      hrAdminId,
      shiftAssignmentId,
      employeeDetails.employeeId || employeeDetails.id,
      expiryDate,
      daysUntilExpiry,
      hrAdminId, // Using hrAdminId as currentUserId for legacy calls
    );
  }

  /**
   * Legacy method for backward compatibility
   * REQ: Missed punches/late sign-ins must be handled via auto-flagging, notifications, or payroll blocking.
   */
  async notifyMissedPunch(
    employeeId: string,
    managerId: string,
    coordinatorId: string,
    attendanceDetails: any,
  ) {
    const date = attendanceDetails.date ? new Date(attendanceDetails.date) : new Date();
    const missedPunchType = attendanceDetails.missedPunchType || 'CLOCK_IN';
    
    const notifications = [];

    // Notify Employee
    notifications.push(
      this.sendMissedPunchAlertToEmployee(
        employeeId,
        attendanceDetails.attendanceRecordId || '',
        missedPunchType,
        date,
        coordinatorId,
      ),
    );

    // Notify Manager
    notifications.push(
      this.sendMissedPunchAlertToManager(
        managerId,
        employeeId,
        attendanceDetails.employeeName || 'Employee',
        attendanceDetails.attendanceRecordId || '',
        missedPunchType,
        date,
        coordinatorId,
      ),
    );

    await Promise.all(notifications);
    return { success: true, notificationsCreated: 2 };
  }

  // ===== COMMON NOTIFICATION METHODS =====

  /**
   * Get all notifications for a specific user
   * Fetches from both unified notifications and time-management shift expiry notifications
   * Both are stored in the same NotificationLog collection
   */
  async getUserNotifications(userId: string) {
    try {
      console.log('Fetching notifications for user:', userId);
      const userObjectId = new Types.ObjectId(userId);

      // Fetch ALL notifications for the user (both unified and shift expiry)
      // The same NotificationLog model is used by both modules
      const allNotifications = await this.notificationLogModel
        .find({ to: userObjectId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      console.log(`Found ${allNotifications.length} notifications for user ${userId}`);

      // Ensure isRead field is always present (default to false if not set)
      const transformed = allNotifications.map((notif: any) => ({
        ...notif,
        isRead: notif.isRead ?? false,
        _id: notif._id?.toString() || notif._id,
        to: notif.to?.toString() || notif.to,
      }));

      return transformed;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string) {
    return this.notificationLogModel.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true },
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string) {
    return this.notificationLogModel.findByIdAndDelete(notificationId);
  }

  /**
   * TEST FUNCTION: Create a test notification for development
   * Remove before production
   */
  async createTestNotification(userId: string) {
    try {
      const testNotification = await this.notificationLogModel.create({
        to: new Types.ObjectId(userId),
        type: NotificationType.LEAVE_CREATED,
        message: 'This is a test notification. New leave request from John Doe (Dec 15-20) awaiting your review',
      });
      return testNotification;
    } catch (error) {
      console.error('Failed to create test notification:', error);
      throw error;
    }
  }

  /**
   * Scheduled task: Automatically create shift expiry notifications daily
   * Runs every day at 9:00 AM
   * This ensures HR admins are notified of shifts expiring within 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleShiftExpiryNotifications() {
    try {
      console.log('[SCHEDULED TASK] Running shift expiry notification check...');

      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setUTCDate(expiryDate.getUTCDate() + 7); // Default 7 days

      // Convert to UTC end of day for proper comparison
      const expiryDateUTC = new Date(expiryDate);
      expiryDateUTC.setUTCHours(23, 59, 59, 999);

      const nowUTC = new Date(now);
      nowUTC.setUTCHours(0, 0, 0, 0);

      // Get expiring shift assignments
      const expiringAssignments = await this.shiftAssignmentModel
        .find({
          endDate: { $lte: expiryDateUTC, $gte: nowUTC },
          status: 'APPROVED',
        })
        .populate('employeeId', 'firstName lastName email employeeNumber')
        .populate('shiftId', 'name startTime endTime')
        .populate('departmentId', 'name')
        .populate('positionId', 'name')
        .exec();

      if (!expiringAssignments || expiringAssignments.length === 0) {
        console.log('[SCHEDULED TASK] No expiring shift assignments found');
        return;
      }

      console.log(
        `[SCHEDULED TASK] Found ${expiringAssignments.length} expiring shift assignments`,
      );

      // Get all HR ADMIN users
      const hrAdmins = await this.employeeProfileModel
        .find({
          systemRole: { $in: ['HR_ADMIN', 'SYSTEM_ADMIN'] },
          active: true,
        })
        .select('_id firstName lastName')
        .exec();

      if (!hrAdmins || hrAdmins.length === 0) {
        console.log('[SCHEDULED TASK] No HR admins found to notify');
        return;
      }

      console.log(
        `[SCHEDULED TASK] Notifying ${hrAdmins.length} HR admins about expiring shifts`,
      );

      // Create notifications for each HR admin for each expiring assignment
      const hrAdminIds = hrAdmins.map((admin: any) => admin._id.toString());
      const notifications = [];

      for (const hrAdmin of hrAdmins) {
        for (const assignment of expiringAssignments) {
          const daysRemaining = Math.ceil(
            (new Date(assignment.endDate).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          const employeeName =
            assignment.employeeId && assignment.employeeId.firstName
              ? `${assignment.employeeId.firstName} ${assignment.employeeId.lastName || ''}`.trim()
              : 'Unknown Employee';

          const shiftName =
            assignment.shiftId && assignment.shiftId.name
              ? assignment.shiftId.name
              : 'Unknown Shift';

          const notification = {
            recipientId: hrAdmin._id.toString(),
            type: NotificationType.SHIFT_EXPIRY_ALERT,
            message: `Shift assignment for ${employeeName} on shift "${shiftName}" expires in ${daysRemaining} days`,
            title: `Shift Expiry Alert - ${daysRemaining} days remaining`,
            data: {
              assignmentId: assignment._id.toString(),
              employeeId: assignment.employeeId?._id?.toString() || '',
              employeeName: employeeName,
              shiftName: shiftName,
              endDate: assignment.endDate?.toISOString() || '',
              daysRemaining: daysRemaining,
              urgency: daysRemaining <= 2 ? 'HIGH' : daysRemaining <= 4 ? 'MEDIUM' : 'LOW',
            },
            isRead: false,
            createdAt: new Date(),
          };

          notifications.push(notification);
        }
      }

      if (notifications.length > 0) {
        await this.notificationLogModel.insertMany(notifications);
        console.log(
          `[SCHEDULED TASK] Successfully created ${notifications.length} notifications`,
        );
      }
    } catch (error) {
      console.error('[SCHEDULED TASK] Error in shift expiry notification:', error);
      // Don't throw - let the scheduled task continue even if it fails
    }
  }

  /**
   * Helper method to map status to notification type
   */
  private mapStatusToNotificationType(
    status: string,
  ): string {
    const statusMap = {
      APPROVED: NotificationType.LEAVE_APPROVED,
      REJECTED: NotificationType.LEAVE_REJECTED,
      RETURNED_FOR_CORRECTION: NotificationType.LEAVE_RETURNED_FOR_CORRECTION,
      MODIFIED: NotificationType.LEAVE_MODIFIED,
    };
    return statusMap[status] || NotificationType.LEAVE_MODIFIED;
  }
}