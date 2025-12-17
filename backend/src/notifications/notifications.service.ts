import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateNotificationDto } from './dtos/notification.dto';
import { NotificationType } from './enums/notification-type.enum';
import {
  SystemRole,
  EmployeeStatus,
} from '../employee-profile/enums/employee-profile.enums';
import { EmployeeSystemRole } from '../employee-profile/models/employee-system-role.schema';
import { RecruitmentNotificationsService } from './services/recruitment-notifications.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('NotificationLog')
    private notificationLogModel: Model<any>,
    @InjectModel('ShiftAssignment')
    private shiftAssignmentModel: Model<any>,
    @InjectModel('EmployeeProfile')
    private employeeProfileModel: Model<any>,
    @InjectModel(EmployeeSystemRole.name)
    private employeeSystemRoleModel: Model<any>,
    private recruitmentNotificationsService: RecruitmentNotificationsService,
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

    console.log(`[NOTIFICATION SERVICE] Creating LEAVE_FINALIZED notifications:`);
    console.log(`  - Employee ID: ${employeeId}`);
    console.log(`  - Manager ID: ${managerId}`);

    // Notify Employee
    notifications.push(
      this.notificationLogModel.create({
        to: new Types.ObjectId(employeeId),
        type: NotificationType.LEAVE_FINALIZED,
        message: `Your leave request has been ${details.status}`,
      }),
    );

    // Notify Manager (Department Head)
    if (managerId) {
      notifications.push(
        this.notificationLogModel.create({
          to: new Types.ObjectId(managerId),
          type: NotificationType.LEAVE_FINALIZED,
          message: message,
        }),
      );
    }

    // Note: coordinatorId is kept for backward compatibility but not used if it's the same as managerId
    // Only notify coordinator if it's different from managerId to avoid duplicate notifications
    if (coordinatorId && coordinatorId !== managerId) {
      notifications.push(
        this.notificationLogModel.create({
          to: new Types.ObjectId(coordinatorId),
          type: NotificationType.LEAVE_FINALIZED,
          message: message,
        }),
      );
    }

    await Promise.all(notifications);
    console.log(`[NOTIFICATION SERVICE] Created ${notifications.length} notifications for finalized leave request`);
    return { success: true, notificationsCreated: notifications.length };
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
      RETURNED_FOR_CORRECTION:
        'Your leave request has been returned for correction',
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
      const message =
        `${expiringAssignments.length} shift assignment(s) expiring soon:\n` +
        expiringAssignments
          .map(
            (a) =>
              `- ${a.employeeName || a.employeeId}: ${a.shiftName || 'Shift'} expires in ${a.daysRemaining} days`,
          )
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
        type: {
          $in: [
            NotificationType.SHIFT_EXPIRY_ALERT,
            NotificationType.SHIFT_EXPIRY_BULK_ALERT,
          ],
        },
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
      expiryAlerts: notifications.filter(
        (n) =>
          n.type === NotificationType.SHIFT_EXPIRY_ALERT ||
          n.type === NotificationType.SHIFT_EXPIRY_BULK_ALERT,
      ),
      renewalConfirmations: notifications.filter(
        (n) => n.type === NotificationType.SHIFT_RENEWAL_CONFIRMATION,
      ),
      archiveNotifications: notifications.filter(
        (n) => n.type === NotificationType.SHIFT_ARCHIVE_NOTIFICATION,
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
      notifications.push({
        type: 'employee',
        notification: employeeNotification,
      });

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
        notifications.push({
          type: 'manager',
          notification: managerNotification,
        });
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
  async getAllMissedPunchNotifications(filters: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const query: any = {
      type: {
        $in: [
          NotificationType.MISSED_PUNCH_EMPLOYEE_ALERT,
          NotificationType.MISSED_PUNCH_MANAGER_ALERT,
        ],
      },
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
    const employeeAlerts = notifications.filter(
      (n) => n.type === NotificationType.MISSED_PUNCH_EMPLOYEE_ALERT,
    );
    const managerAlerts = notifications.filter(
      (n) => n.type === NotificationType.MISSED_PUNCH_MANAGER_ALERT,
    );

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
    const date = attendanceDetails.date
      ? new Date(attendanceDetails.date)
      : new Date();
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

      console.log(
        `Found ${allNotifications.length} notifications for user ${userId}`,
      );

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
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
      );
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
        message:
          'This is a test notification. New leave request from John Doe (Dec 15-20) awaiting your review',
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
      console.log(
        '[SCHEDULED TASK] Running shift expiry notification check...',
      );

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
              urgency:
                daysRemaining <= 2
                  ? 'HIGH'
                  : daysRemaining <= 4
                    ? 'MEDIUM'
                    : 'LOW',
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
      console.error(
        '[SCHEDULED TASK] Error in shift expiry notification:',
        error,
      );
      // Don't throw - let the scheduled task continue even if it fails
    }
  }

  /**
   * Helper method to map status to notification type
   */
  private mapStatusToNotificationType(status: string): string {
    const statusMap = {
      APPROVED: NotificationType.LEAVE_APPROVED,
      REJECTED: NotificationType.LEAVE_REJECTED,
      RETURNED_FOR_CORRECTION: NotificationType.LEAVE_RETURNED_FOR_CORRECTION,
      MODIFIED: NotificationType.LEAVE_MODIFIED,
    };
    return statusMap[status] || NotificationType.LEAVE_MODIFIED;
  }

  // ===== RECRUITMENT SUBSYSTEM =====
  // NOTE: All recruitment notification methods below are DELEGATIONS to RecruitmentNotificationsService
  // The actual implementations are in recruitment-notifications.service.ts
  // These methods are kept here to maintain the NotificationsService API interface
  
  // Notify panel members when assigned to an interview
  async notifyInterviewPanelMembers(
    panelMemberIds: string[],
    interviewDetails: {
      interviewId: string;
      candidateName: string;
      positionTitle: string;
      scheduledDate: Date;
      method: string;
      videoLink?: string;
      stage: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyInterviewPanelMembers(panelMemberIds, interviewDetails);
  }

  // Notify HR staff when a candidate submits a new application
  async notifyHRNewApplication(
    hrRecipientIds: string[],
    applicationDetails: {
      applicationId: string;
      candidateName: string;
      positionTitle: string;
      requisitionId: string;
      isReferral?: boolean;
    },
  ) {
    return this.recruitmentNotificationsService.notifyHRNewApplication(hrRecipientIds, applicationDetails);
  }

  // Notify panel members when an interview is cancelled
  async notifyInterviewCancelled(
    panelMemberIds: string[],
    interviewDetails: {
      candidateName: string;
      positionTitle: string;
      originalDate: Date;
    },
  ) {
    return this.recruitmentNotificationsService.notifyInterviewCancelled(panelMemberIds, interviewDetails);
  }

  // Notify panel members when an interview is rescheduled
  async notifyInterviewRescheduled(
    panelMemberIds: string[],
    interviewDetails: {
      interviewId: string;
      candidateName: string;
      positionTitle: string;
      oldDate: Date;
      newDate: Date;
      method: string;
      videoLink?: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyInterviewRescheduled(panelMemberIds, interviewDetails);
  }

  // Get all interview notifications for a user
  async getInterviewNotifications(userId: string) {
    return this.recruitmentNotificationsService.getInterviewNotifications(userId);
  }

  // Notify candidate when their interview is scheduled
  async notifyCandidateInterviewScheduled(
    candidateId: string,
    interviewDetails: {
      interviewId: string;
      positionTitle: string;
      scheduledDate: Date;
      method: string;
      videoLink?: string;
      stage: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyCandidateInterviewScheduled(candidateId, interviewDetails);
  }

  // Notify HR employees when a candidate is hired
  async notifyHREmployeesCandidateHired(
    hrEmployeeIds: string[],
    hiringDetails: {
      candidateName: string;
      candidateId: string;
      positionTitle: string;
      applicationId: string;
      offerId?: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyHREmployeesCandidateHired(hrEmployeeIds, hiringDetails);
  }

  // Notify HR employees when a candidate is rejected
  async notifyHREmployeesCandidateRejected(
    hrEmployeeIds: string[],
    rejectionDetails: {
      candidateName: string;
      candidateId: string;
      positionTitle: string;
      applicationId: string;
      rejectionReason?: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyHREmployeesCandidateRejected(hrEmployeeIds, rejectionDetails);
  }

  // Notify candidate when they are hired
  async notifyCandidateAccepted(
    candidateId: string,
    acceptanceDetails: {
      positionTitle: string;
      applicationId: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyCandidateAccepted(candidateId, acceptanceDetails);
  }

  // Notify candidate when their application is rejected
  async notifyCandidateRejected(
    candidateId: string,
    rejectionDetails: {
      positionTitle: string;
      applicationId: string;
      rejectionReason?: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyCandidateRejected(candidateId, rejectionDetails);
  }

  // Notify candidate when interview is completed (all feedback submitted)
  async notifyCandidateInterviewCompleted(
    candidateId: string,
    interviewDetails: {
      positionTitle: string;
      applicationId: string;
      interviewId: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyCandidateInterviewCompleted(candidateId, interviewDetails);
  }

  // Notify HR manager when all interview feedback is submitted and ready for review
  async notifyHRManagerFeedbackReady(
    hrManagerIds: string[],
    reviewDetails: {
      candidateName: string;
      positionTitle: string;
      applicationId: string;
      interviewId: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyHRManagerFeedbackReady(hrManagerIds, reviewDetails);
  }

  // Notify candidate when they receive a job offer
  async notifyCandidateOfferReceived(
    candidateId: string,
    offerDetails: {
      offerId: string;
      positionTitle: string;
      grossSalary: number;
      deadline: Date;
    },
  ) {
    return this.recruitmentNotificationsService.notifyCandidateOfferReceived(candidateId, offerDetails);
  }

  // Notify HR when candidate accepts or rejects an offer
  async notifyHROfferResponse(
    hrUserIds: string[],
    responseDetails: {
      candidateName: string;
      candidateId: string;
      positionTitle: string;
      offerId: string;
      applicationId: string;
      response: 'accepted' | 'rejected';
    },
  ) {
    return this.recruitmentNotificationsService.notifyHROfferResponse(hrUserIds, responseDetails);
  }

  // Helper to get HR employee IDs for notifications (placeholder - IDs fetched in calling methods)
  async getHREmployeeIds(): Promise<string[]> {
    try {
      const hrEmployees = await this.employeeProfileModel
        .find({
          // Find employees who have HR_EMPLOYEE role
          // Note: The role is typically stored in a separate EmployeeSystemRole collection
          active: true,
        })
        .select('_id')
        .lean()
        .exec();

      // We need to cross-reference with the system role collection
      // For now, return empty and let the caller provide the IDs
      console.log('[HIRING_NOTIFICATION] getHREmployeeIds needs to be called with pre-fetched IDs');
      return [];
    } catch (error) {
      console.error('[HIRING_NOTIFICATION] Error fetching HR Employee IDs:', error);
      return [];
    }
  }

  // ===== ONBOARDING → PAYROLL INTEGRATION NOTIFICATIONS =====
  // NOTE: All onboarding/payroll notification methods below are DELEGATIONS to RecruitmentNotificationsService
  // The actual implementations are in recruitment-notifications.service.ts
  
  // ONB-018: Notify Payroll Team about New Hire Ready for Payroll
  async notifyPayrollTeamNewHire(
    payrollTeamIds: string[],
    newHireDetails: {
      employeeId: string;
      employeeName: string;
      employeeNumber?: string;
      positionTitle: string;
      departmentName?: string;
      grossSalary: number;
      contractStartDate: Date;
      signingBonus?: number;
    },
  ) {
    return this.recruitmentNotificationsService.notifyPayrollTeamNewHire(payrollTeamIds, newHireDetails);
  }

  // ONB-019: Notify Payroll Team about Signing Bonus Pending Review
  async notifyPayrollTeamSigningBonus(
    payrollTeamIds: string[],
    bonusDetails: {
      employeeId: string;
      employeeName: string;
      employeeNumber?: string;
      positionTitle: string;
      signingBonusAmount: number;
      signingBonusId?: string;
      paymentDate: Date;
    },
  ) {
    return this.recruitmentNotificationsService.notifyPayrollTeamSigningBonus(payrollTeamIds, bonusDetails);
  }

  // ONB-018: Notify HR about Payroll Task Completion
  async notifyHRPayrollTaskCompleted(
    hrUserIds: string[],
    completionDetails: {
      employeeId: string;
      employeeName: string;
      positionTitle: string;
      grossSalary: number;
    },
  ) {
    return this.recruitmentNotificationsService.notifyHRPayrollTaskCompleted(hrUserIds, completionDetails);
  }

  // ===== ONBOARDING NOTIFICATIONS =====
  // NOTE: All onboarding notification methods below are DELEGATIONS to RecruitmentNotificationsService
  // The actual implementations are in recruitment-notifications.service.ts
  
  // ONB-005: Send Welcome Notification to New Hire
  async notifyNewHireWelcome(
    newHireId: string,
    welcomeDetails: {
      employeeName: string;
      employeeNumber: string;
      positionTitle: string;
      startDate: Date;
      totalTasks: number;
      onboardingId: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyNewHireWelcome(newHireId, welcomeDetails);
  }

  // ===== EMPLOYEE PROFILE MODULE NOTIFICATIONS =====

  /**
   * N-040: Notify HR Manager/Admin when profile change request is submitted
   * @param employeeProfileId - The ID of the employee making the request
   * @param changeRequestId - The requestId (string) of the change request
   * @param changeDescription - Description of the requested change
   */
  async notifyProfileChangeRequestSubmitted(
    employeeProfileId: string,
    changeRequestId: string,
    changeDescription: string,
  ): Promise<{ success: boolean; notificationsSent: number; error?: string }> {
    try {
      console.log(
        '[NOTIFICATION SERVICE] Creating PROFILE_CHANGE_REQUEST_SUBMITTED notifications',
      );

      // FIXED: Get HR users from employee_system_roles collection
      const hrRoles = [
        SystemRole.HR_MANAGER,
        SystemRole.HR_ADMIN,
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_EMPLOYEE,
      ];

      let hrUsers = [];

      try {
        // Find all employee system roles with HR roles
        const hrSystemRoles = await this.employeeSystemRoleModel
          .find({
            roles: { $in: hrRoles },
            isActive: true,
          })
          .select('employeeProfileId')
          .exec();

        console.log(`Found ${hrSystemRoles.length} HR system role records`);

        // Extract employee IDs
        const hrEmployeeIds = hrSystemRoles.map(
          (role) => role.employeeProfileId,
        );

        if (hrEmployeeIds.length > 0) {
          // Get employee profiles for these IDs
          hrUsers = await this.employeeProfileModel
            .find({
              _id: { $in: hrEmployeeIds },
              status: EmployeeStatus.ACTIVE,
            })
            .select('_id firstName lastName email')
            .exec();
        }

        console.log(
          `Found ${hrUsers.length} HR users to notify from system roles`,
        );
      } catch (roleError) {
        console.warn('Error querying system roles, using fallback:', roleError);
      }

      // Fallback if no HR users found or error
      if (hrUsers.length === 0) {
        console.warn(
          'No HR users found via system roles, using fallback approach',
        );

        // Try known HR user IDs from logs
        const knownHRUserIds = [
          '692b63778b731e72cccc10cd', // HR Manager from your logs
        ].filter((id) => id && id.length === 24);

        if (knownHRUserIds.length > 0) {
          hrUsers = await this.employeeProfileModel
            .find({
              _id: { $in: knownHRUserIds.map((id) => new Types.ObjectId(id)) },
              status: EmployeeStatus.ACTIVE,
            })
            .select('_id firstName lastName email')
            .exec();

          console.log(
            `Fallback: Found ${hrUsers.length} HR users via known IDs`,
          );
        }
      }

      if (hrUsers.length === 0) {
        console.warn(
          'No HR users found to notify. Please check employee_system_roles collection.',
        );
        return { success: true, notificationsSent: 0 };
      }

      const notifications = [];
      const employee = await this.employeeProfileModel
        .findById(employeeProfileId)
        .select('firstName lastName employeeNumber')
        .exec();

      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`.trim()
        : 'Unknown Employee';
      const employeeNumber = employee?.employeeNumber || 'N/A';

      // Parse change description to get type if it's JSON
      let changeType = 'Profile Update';
      let parsedChanges = '';

      try {
        const parsedDesc = JSON.parse(changeDescription);
        if (parsedDesc.type) {
          changeType = parsedDesc.type.replace(/_/g, ' ');
        }
        if (parsedDesc.changes && typeof parsedDesc.changes === 'object') {
          parsedChanges = Object.entries(parsedDesc.changes)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      } catch {
        // Not JSON, use as-is
        parsedChanges =
          changeDescription.length > 50
            ? changeDescription.substring(0, 47) + '...'
            : changeDescription;
      }

      const message = `New ${changeType} request from ${employeeName} (${employeeNumber})`;

      // Create notifications for each HR user
      for (const hrUser of hrUsers) {
        try {
          const notification = await this.notificationLogModel.create({
            to: hrUser._id,
            type: NotificationType.PROFILE_CHANGE_REQUEST_SUBMITTED,
            message,
            isRead: false,
            data: {
              employeeProfileId,
              employeeName,
              employeeNumber,
              changeRequestId,
              changeType,
              changeDescription: parsedChanges,
              link: `/dashboard/employee-profile/admin/approvals`,
              timestamp: new Date(),
            },
          });
          notifications.push(notification);
          console.log(`Notification created for HR user: ${hrUser.email}`);
        } catch (userError) {
          console.error(
            `Failed to create notification for HR user ${hrUser._id}:`,
            userError,
          );
          // Continue with other users
        }
      }

      console.log(`Successfully created ${notifications.length} notifications`);
      return {
        success: true,
        notificationsSent: notifications.length,
      };
    } catch (error) {
      console.error(
        'Failed to create profile change request notifications:',
        error,
      );
      // Don't throw - notification failure shouldn't block main action
      return {
        success: false,
        notificationsSent: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * N-037: Notify employee when change request is approved/rejected
   * @param employeeProfileId - The ID of the employee who made the request
   * @param changeRequestId - The requestId (string) of the change request
   * @param status - 'APPROVED' or 'REJECTED'
   * @param reason - Optional reason for rejection
   */
  async notifyProfileChangeRequestProcessed(
    employeeProfileId: string,
    changeRequestId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ): Promise<{ success: boolean; notification?: any; error?: string }> {
    try {
      console.log(
        `[NOTIFICATION SERVICE] Creating PROFILE_CHANGE_${status} notification`,
      );

      // FIXED: Clean employeeProfileId if it's an object string
      let cleanEmployeeId = employeeProfileId;

      // If it looks like an object string (from your error logs), extract the ID
      if (
        typeof employeeProfileId === 'string' &&
        employeeProfileId.includes('ObjectId')
      ) {
        try {
          // Extract ObjectId from the string representation
          const match = employeeProfileId.match(
            /ObjectId\("([0-9a-fA-F]{24})"\)/,
          );
          if (match && match[1]) {
            cleanEmployeeId = match[1];
            console.log(`✅ Extracted clean employee ID: ${cleanEmployeeId}`);
          } else {
            // Try alternative pattern
            const altMatch = employeeProfileId.match(/"([0-9a-fA-F]{24})"/);
            if (altMatch && altMatch[1]) {
              cleanEmployeeId = altMatch[1];
              console.log(
                `✅ Extracted clean employee ID (alt): ${cleanEmployeeId}`,
              );
            }
          }
        } catch (extractError) {
          console.warn(
            'Could not extract ID from string, using as-is:',
            extractError,
          );
        }
      }

      // Get employee details for better context
      const employee = await this.employeeProfileModel
        .findById(cleanEmployeeId)
        .select('firstName lastName email')
        .exec();

      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`.trim()
        : 'Employee';

      const statusMessages = {
        APPROVED: `Your profile change request has been approved`,
        REJECTED: reason
          ? `Your profile change request has been rejected. Reason: ${reason}`
          : 'Your profile change request has been rejected',
      };

      const notificationType =
        status === 'APPROVED'
          ? NotificationType.PROFILE_CHANGE_APPROVED
          : NotificationType.PROFILE_CHANGE_REJECTED;

      const notification = await this.notificationLogModel.create({
        to: new Types.ObjectId(cleanEmployeeId),
        type: notificationType,
        message: statusMessages[status],
        isRead: false,
        data: {
          changeRequestId,
          status,
          reason,
          employeeName,
          link: `/dashboard/employee-profile/change-requests`,
          timestamp: new Date(),
        },
      });

      console.log(`Notification created for employee: ${employeeName}`);
      return {
        success: true,
        notification,
      };
    } catch (error) {
      console.error(
        'Failed to create profile change processed notification:',
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ONB-005: Send Task Reminder Notification
  async notifyOnboardingTaskReminder(
    recipientId: string,
    reminderDetails: {
      employeeName: string;
      taskName: string;
      taskDepartment: string;
      deadline: Date;
      isOverdue: boolean;
      daysRemaining?: number;
    },
  ) {
    return this.recruitmentNotificationsService.notifyOnboardingTaskReminder(recipientId, reminderDetails);
  }

  /**
   * Notify employee when profile is updated by HR
   * @param employeeProfileId - The ID of the employee whose profile was updated
   * @param updatedBy - The ID of the HR user who made the update
   * @param changes - Array of field names that were changed
   */
  async notifyProfileUpdated(
    employeeProfileId: string,
    updatedBy: string,
    changes: string[],
  ): Promise<{ success: boolean; notification?: any; error?: string }> {
    try {
      console.log(
        '[NOTIFICATION SERVICE] Creating PROFILE_UPDATED notification',
      );

      // Get updater details
      const updater = await this.employeeProfileModel
        .findById(updatedBy)
        .select('firstName lastName')
        .exec();

      const updaterName = updater
        ? `${updater.firstName} ${updater.lastName}`.trim()
        : 'HR Admin';

      // Get employee details
      const employee = await this.employeeProfileModel
        .findById(employeeProfileId)
        .select('firstName lastName')
        .exec();

      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`.trim()
        : 'Employee';

      const changesText =
        changes.length > 0
          ? `Changes: ${changes.join(', ')}`
          : 'Profile updated';

      const message = `Your profile has been updated by ${updaterName}. ${changesText}`;

      const notification = await this.notificationLogModel.create({
        to: new Types.ObjectId(employeeProfileId),
        type: NotificationType.PROFILE_UPDATED,
        message,
        isRead: false,
        data: {
          updatedBy,
          updaterName,
          changes,
          employeeName,
          link: `/dashboard/employee-profile/my-profile`,
          timestamp: new Date(),
        },
      });

      console.log(`Profile update notification created for: ${employeeName}`);
      return {
        success: true,
        notification,
      };
    } catch (error) {
      console.error('Failed to create profile updated notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ONB-007: Notify HR about Document Upload
  async notifyHRDocumentUploaded(
    hrUserIds: string[],
    documentDetails: {
      employeeId: string;
      employeeName: string;
      documentType: string;
      documentName: string;
      taskName: string;
      onboardingId: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyHRDocumentUploaded(hrUserIds, documentDetails);
  }

  // ONB-009, ONB-013: Notify about Access Provisioning
  async notifyAccessProvisioned(
    recipientIds: string[],
    accessDetails: {
      employeeId: string;
      employeeName: string;
      accessType: string;
      systemName: string;
      provisionedBy: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyAccessProvisioned(recipientIds, accessDetails);
  }

  // ONB-012: Notify about Equipment/Workspace Reserved
  async notifyEquipmentReserved(
    recipientIds: string[],
    reservationDetails: {
      employeeId: string;
      employeeName: string;
      equipmentList: string[];
      workspaceDetails?: string;
      reservedBy: string;
      readyDate: Date;
    },
  ) {
    return this.recruitmentNotificationsService.notifyEquipmentReserved(recipientIds, reservationDetails);
  }

  // ONB-001: Notify Departments About Assigned Onboarding Tasks
  async notifyOnboardingTaskAssigned(
    recipientIds: string[],
    taskDetails: {
      employeeId: string;
      employeeName: string;
      department: string;
      tasks: string[];
      deadline: Date;
      onboardingId: string;
    },
  ) {
    return this.recruitmentNotificationsService.notifyOnboardingTaskAssigned(recipientIds, taskDetails);
  }

  // Notify about Onboarding Completion
  async notifyOnboardingCompleted(
    recipientIds: string[],
    completionDetails: {
      employeeId: string;
      employeeName: string;
      positionTitle: string;
      completedDate: Date;
      totalTasks: number;
    },
  ) {
    return this.recruitmentNotificationsService.notifyOnboardingCompleted(recipientIds, completionDetails);
  }

  // Get all onboarding-related notifications for a user
  async getOnboardingNotifications(userId: string) {
    return this.recruitmentNotificationsService.getOnboardingNotifications(userId);
  }

  // Get payroll-related notifications for Payroll team
  async getPayrollNotifications(userId: string) {
    return this.recruitmentNotificationsService.getPayrollNotifications(userId);
  }

  // =============================================================================
  // OFFBOARDING NOTIFICATIONS (OFF-001 to OFF-019)
  // =============================================================================

  /**
   * OFF-018: Notify HR and Manager when employee submits resignation
   */
  async notifyResignationSubmitted(
    recipientIds: string[],
    resignationDetails: {
      employeeId: string;
      employeeName: string;
      reason: string;
      requestedLastDay?: string;
      department?: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `📝 Resignation Request Submitted (OFF-018)\n\n` +
          `An employee has submitted a resignation request.\n\n` +
          `👤 Employee: ${resignationDetails.employeeName}\n` +
          `🏢 Department: ${resignationDetails.department || 'N/A'}\n` +
          `📋 Reason: ${resignationDetails.reason}\n` +
          (resignationDetails.requestedLastDay 
            ? `📅 Requested Last Day: ${new Date(resignationDetails.requestedLastDay).toLocaleDateString()}\n` 
            : '') +
          `\nPlease review and process this resignation request.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.RESIGNATION_SUBMITTED,
          message: message,
          data: {
            ...resignationDetails,
            action: 'RESIGNATION_SUBMITTED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send resignation notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-019: Notify employee when resignation status is updated
   */
  async notifyResignationStatusUpdated(
    employeeId: string,
    statusDetails: {
      employeeName: string;
      newStatus: string;
      effectiveDate?: string;
      hrComments?: string;
    },
  ) {
    if (!employeeId) {
      return { success: false, message: 'No employee ID provided' };
    }

    try {
      const statusEmoji = statusDetails.newStatus === 'approved' ? '✅' : 
                         statusDetails.newStatus === 'rejected' ? '❌' : '⏳';
      
      const message = `${statusEmoji} Resignation Status Updated (OFF-019)\n\n` +
        `Your resignation request has been ${statusDetails.newStatus.toUpperCase()}.\n\n` +
        (statusDetails.effectiveDate 
          ? `📅 Effective Date: ${new Date(statusDetails.effectiveDate).toLocaleDateString()}\n` 
          : '') +
        (statusDetails.hrComments ? `💬 HR Comments: ${statusDetails.hrComments}\n` : '') +
        (statusDetails.newStatus === 'approved' 
          ? `\nNext steps: Please complete the offboarding checklist and return company assets.`
          : '');

      const notification = await this.notificationLogModel.create({
        to: new Types.ObjectId(employeeId),
        type: NotificationType.RESIGNATION_STATUS_UPDATED,
        message: message,
        data: {
          ...statusDetails,
          action: 'RESIGNATION_STATUS_UPDATED',
        },
        isRead: false,
      });

      return { success: true, notification };
    } catch (error) {
      console.error(`Failed to send resignation status notification:`, error);
      return { success: false, error };
    }
  }

  /**
   * OFF-001: Notify when termination is initiated based on performance
   */
  async notifyTerminationInitiated(
    recipientIds: string[],
    terminationDetails: {
      employeeId: string;
      employeeName: string;
      reason: string;
      performanceScore?: number;
      initiatedBy: string;
      terminationDate?: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `⚠️ Termination Initiated (OFF-001)\n\n` +
          `A termination review has been initiated.\n\n` +
          `👤 Employee: ${terminationDetails.employeeName}\n` +
          `📋 Reason: ${terminationDetails.reason}\n` +
          (terminationDetails.performanceScore !== undefined 
            ? `📊 Performance Score: ${terminationDetails.performanceScore.toFixed(2)}\n` 
            : '') +
          `👤 Initiated By: ${terminationDetails.initiatedBy}\n` +
          (terminationDetails.terminationDate 
            ? `📅 Proposed Date: ${new Date(terminationDetails.terminationDate).toLocaleDateString()}\n` 
            : '') +
          `\nPlease review and take appropriate action.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.TERMINATION_INITIATED,
          message: message,
          data: {
            ...terminationDetails,
            action: 'TERMINATION_INITIATED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send termination notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-001: Notify when termination is approved
   */
  async notifyTerminationApproved(
    recipientIds: string[],
    terminationDetails: {
      employeeId: string;
      employeeName: string;
      effectiveDate: string;
      reason: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `🔴 Termination Approved (OFF-001)\n\n` +
          `A termination has been approved.\n\n` +
          `👤 Employee: ${terminationDetails.employeeName}\n` +
          `📅 Effective Date: ${new Date(terminationDetails.effectiveDate).toLocaleDateString()}\n` +
          `📋 Reason: ${terminationDetails.reason}\n\n` +
          `Action Required:\n` +
          `• IT: Prepare to revoke system access\n` +
          `• HR: Create clearance checklist\n` +
          `• Admin: Prepare asset return process`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.TERMINATION_APPROVED,
          message: message,
          data: {
            ...terminationDetails,
            action: 'TERMINATION_APPROVED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send termination approved notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-001: Notify EMPLOYEE when termination is initiated (employment under review)
   */
  async notifyEmployeeTerminationInitiated(
    employeeId: string,
    terminationDetails: {
      reason: string;
      performanceScore?: number;
      initiatedBy: string;
    },
  ) {
    if (!employeeId) {
      return { success: false, message: 'No employee ID provided' };
    }

    try {
      const message = `⚠️ Employment Review Notice\n\n` +
        `Your employment is currently under review.\n\n` +
        `📋 Reason: ${terminationDetails.reason}\n` +
        (terminationDetails.performanceScore !== undefined 
          ? `📊 Performance Score: ${terminationDetails.performanceScore}${terminationDetails.performanceScore > 5 ? '%' : '/5'}\n` 
          : '') +
        `👤 Initiated by: ${terminationDetails.initiatedBy}\n\n` +
        `A member of HR will contact you shortly to discuss next steps and the offboarding process.`;

      const notification = await this.notificationLogModel.create({
        to: new Types.ObjectId(employeeId),
        type: NotificationType.TERMINATION_INITIATED,
        message: message,
        data: {
          ...terminationDetails,
          action: 'TERMINATION_INITIATED',
        },
        isRead: false,
      });

      return { success: true, notification };
    } catch (error) {
      console.error(`Failed to notify employee about termination initiation:`, error);
      return { success: false, error };
    }
  }

  /**
   * OFF-001: Notify EMPLOYEE when termination is approved with reason
   */
  async notifyEmployeeTerminationApproved(
    employeeId: string,
    terminationDetails: {
      reason: string;
      effectiveDate: string;
      hrComments?: string;
    },
  ) {
    if (!employeeId) {
      return { success: false, message: 'No employee ID provided' };
    }

    try {
      const message = `🔴 Employment Termination Notice\n\n` +
        `Your employment has been terminated.\n\n` +
        `📅 Effective Date: ${new Date(terminationDetails.effectiveDate).toLocaleDateString()}\n` +
        `📋 Reason: ${terminationDetails.reason}\n` +
        (terminationDetails.hrComments ? `💬 HR Comments: ${terminationDetails.hrComments}\n\n` : '\n') +
        `Next Steps:\n` +
        `• Complete the offboarding checklist\n` +
        `• Return all company assets (laptop, badge, phone, etc.)\n` +
        `• Contact HR for final settlement details\n` +
        `• Schedule an exit interview if requested`;

      const notification = await this.notificationLogModel.create({
        to: new Types.ObjectId(employeeId),
        type: NotificationType.TERMINATION_APPROVED,
        message: message,
        data: {
          ...terminationDetails,
          action: 'TERMINATION_APPROVED_EMPLOYEE',
        },
        isRead: false,
      });

      return { success: true, notification };
    } catch (error) {
      console.error(`Failed to notify employee about termination approval:`, error);
      return { success: false, error };
    }
  }

  /**
   * OFF-006: Notify departments when clearance checklist is created
   */
  async notifyClearanceChecklistCreated(
    recipientIds: string[],
    clearanceDetails: {
      employeeId: string;
      employeeName: string;
      terminationDate: string;
      departments: string[];
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `📋 Clearance Checklist Created (OFF-006)\n\n` +
          `An offboarding checklist has been created.\n\n` +
          `👤 Employee: ${clearanceDetails.employeeName}\n` +
          `📅 Termination Date: ${new Date(clearanceDetails.terminationDate).toLocaleDateString()}\n` +
          `🏢 Departments: ${clearanceDetails.departments.join(', ')}\n\n` +
          `Please complete your department's clearance items before the termination date.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.CLEARANCE_CHECKLIST_CREATED,
          message: message,
          data: {
            ...clearanceDetails,
            action: 'CLEARANCE_CHECKLIST_CREATED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send clearance checklist notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-010: Notify specific department that they need to sign off on clearance
   */
  async notifyClearanceSignOffNeeded(
    recipientIds: string[],
    clearanceDetails: {
      employeeId: string;
      employeeName: string;
      department: string;
      terminationDate: string;
      checklistId: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];
    const deptIcons: { [key: string]: string } = {
      'IT': '💻', 'HR': '👤', 'FINANCE': '💰', 
      'FACILITIES': '🏢', 'ADMIN': '📋', 'LINE_MANAGER': '👔'
    };
    const icon = deptIcons[clearanceDetails.department?.toUpperCase()] || '📁';

    for (const recipientId of recipientIds) {
      try {
        const message = `${icon} Clearance Sign-Off Required (OFF-010)\n\n` +
          `Your department needs to complete a clearance sign-off.\n\n` +
          `👤 Employee: ${clearanceDetails.employeeName}\n` +
          `🏢 Your Department: ${clearanceDetails.department}\n` +
          `📅 Termination Date: ${new Date(clearanceDetails.terminationDate).toLocaleDateString()}\n\n` +
          `Action Required: Review and approve clearance items for this employee.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.CLEARANCE_SIGN_OFF_NEEDED,
          message: message,
          data: {
            ...clearanceDetails,
            action: 'CLEARANCE_SIGN_OFF_NEEDED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send clearance sign-off notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-010: Notify HR when clearance item is updated
   */
  async notifyClearanceItemUpdated(
    recipientIds: string[],
    clearanceDetails: {
      employeeName: string;
      department: string;
      newStatus: string;
      updatedBy: string;
      comments?: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];
    const statusEmoji = clearanceDetails.newStatus === 'approved' ? '✅' : 
                       clearanceDetails.newStatus === 'rejected' ? '❌' : '⏳';

    for (const recipientId of recipientIds) {
      try {
        const message = `${statusEmoji} Clearance Item Updated (OFF-010)\n\n` +
          `A clearance item has been updated.\n\n` +
          `👤 Employee: ${clearanceDetails.employeeName}\n` +
          `🏢 Department: ${clearanceDetails.department}\n` +
          `📊 Status: ${clearanceDetails.newStatus.toUpperCase()}\n` +
          `👤 Updated By: ${clearanceDetails.updatedBy}\n` +
          (clearanceDetails.comments ? `💬 Comments: ${clearanceDetails.comments}\n` : '');

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.CLEARANCE_ITEM_UPDATED,
          message: message,
          data: {
            ...clearanceDetails,
            action: 'CLEARANCE_ITEM_UPDATED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send clearance update notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-010: Notify when all clearances are approved
   */
  async notifyAllClearancesApproved(
    recipientIds: string[],
    clearanceDetails: {
      employeeId: string;
      employeeName: string;
      completionDate: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `✅ All Clearances Approved (OFF-010)\n\n` +
          `All department clearances have been approved.\n\n` +
          `👤 Employee: ${clearanceDetails.employeeName}\n` +
          `📅 Completion Date: ${new Date(clearanceDetails.completionDate).toLocaleDateString()}\n\n` +
          `Next Step: Final settlement can now be triggered.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.CLEARANCE_ALL_APPROVED,
          message: message,
          data: {
            ...clearanceDetails,
            action: 'CLEARANCE_ALL_APPROVED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send all clearances approved notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-007: Notify when system access is revoked
   */
  async notifyAccessRevoked(
    recipientIds: string[],
    accessDetails: {
      employeeId: string;
      employeeName: string;
      revokedSystems: string[];
      effectiveDate: string;
      revokedBy: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const systemsList = accessDetails.revokedSystems.length > 0
          ? accessDetails.revokedSystems.map(s => `  • ${s}`).join('\n')
          : '  • All system access';

        const message = `🔒 System Access Revoked (OFF-007)\n\n` +
          `System access has been revoked for security.\n\n` +
          `👤 Employee: ${accessDetails.employeeName}\n` +
          `📅 Effective: ${new Date(accessDetails.effectiveDate).toLocaleDateString()}\n` +
          `👤 Revoked By: ${accessDetails.revokedBy}\n\n` +
          `Systems Revoked:\n${systemsList}`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.ACCESS_REVOKED,
          message: message,
          data: {
            ...accessDetails,
            action: 'ACCESS_REVOKED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send access revoked notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-013: Notify when final settlement is triggered
   */
  async notifyFinalSettlementTriggered(
    recipientIds: string[],
    settlementDetails: {
      employeeId: string;
      employeeName: string;
      leaveBalance?: number;
      leaveEncashment?: number;
      deductions?: number;
      estimatedFinalAmount?: number;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `💰 Final Settlement Triggered (OFF-013)\n\n` +
          `Final settlement calculation has been initiated.\n\n` +
          `👤 Employee: ${settlementDetails.employeeName}\n` +
          (settlementDetails.leaveBalance !== undefined 
            ? `📅 Leave Balance: ${settlementDetails.leaveBalance} days\n` 
            : '') +
          (settlementDetails.leaveEncashment !== undefined 
            ? `💵 Leave Encashment: $${settlementDetails.leaveEncashment.toFixed(2)}\n` 
            : '') +
          (settlementDetails.deductions !== undefined 
            ? `📉 Deductions: $${settlementDetails.deductions.toFixed(2)}\n` 
            : '') +
          (settlementDetails.estimatedFinalAmount !== undefined 
            ? `💰 Estimated Final: $${settlementDetails.estimatedFinalAmount.toFixed(2)}\n` 
            : '') +
          `\nPayroll team will process the final payment.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.FINAL_SETTLEMENT_TRIGGERED,
          message: message,
          data: {
            ...settlementDetails,
            action: 'FINAL_SETTLEMENT_TRIGGERED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send final settlement notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }

  /**
   * OFF-013: Notify when final settlement is completed
   */
  async notifyFinalSettlementCompleted(
    recipientIds: string[],
    settlementDetails: {
      employeeId: string;
      employeeName: string;
      finalAmount: number;
      paymentDate: string;
    },
  ) {
    if (!recipientIds || recipientIds.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    const notifications: any[] = [];

    for (const recipientId of recipientIds) {
      try {
        const message = `✅ Final Settlement Completed (OFF-013)\n\n` +
          `Final settlement has been processed.\n\n` +
          `👤 Employee: ${settlementDetails.employeeName}\n` +
          `💰 Final Amount: $${settlementDetails.finalAmount.toFixed(2)}\n` +
          `📅 Payment Date: ${new Date(settlementDetails.paymentDate).toLocaleDateString()}\n\n` +
          `Offboarding process is now complete.`;

        const notification = await this.notificationLogModel.create({
          to: new Types.ObjectId(recipientId),
          type: NotificationType.FINAL_SETTLEMENT_COMPLETED,
          message: message,
          data: {
            ...settlementDetails,
            action: 'FINAL_SETTLEMENT_COMPLETED',
          },
          isRead: false,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send final settlement completed notification to ${recipientId}:`, error);
      }
    }

    return { success: true, notificationsCreated: notifications.length };
  }
}
