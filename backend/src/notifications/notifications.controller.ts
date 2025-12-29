import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ===== LEAVE MODULE NOTIFICATION ENDPOINTS =====

  /**
   * Notify when leave request is finalized (approved)
   * Called by Leaves Module - only HR Manager can finalize leaves
   */
  @Post('leave/finalized')
  @Roles(SystemRole.HR_MANAGER)
  async notifyLeaveRequestFinalized(
    @Body()
    body: {
      leaveRequestId: string;
      employeeId: string;
      managerId: string;
      coordinatorId: string;
      leaveDetails?: any; // Optional - for backward compatibility
    },
  ) {
    // If leaveDetails not provided, use minimal data
    const leaveDetails = body.leaveDetails || {
      employeeName: 'Employee',
      fromDate: '',
      toDate: '',
      status: 'APPROVED',
    };

    return this.notificationsService.notifyLeaveRequestFinalized(
      body.leaveRequestId,
      body.employeeId,
      body.managerId,
      body.coordinatorId,
      leaveDetails,
    );
  }

  /**
   * Notify manager when new leave request is created
   * Called by Leaves Module - only managers (HR_MANAGER, HR_ADMIN, DEPARTMENT_HEAD) can create this notification
   */
  @Post('leave/created')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async notifyLeaveRequestCreated(
    @Body()
    body: {
      leaveRequestId: string;
      employeeId: string;
      managerId: string;
      leaveDetails?: any; // Optional
    },
  ) {
    const leaveDetails = body.leaveDetails || {
      employeeName: 'Employee',
      fromDate: '',
      toDate: '',
    };

    return this.notificationsService.notifyLeaveRequestCreated(
      body.leaveRequestId,
      body.employeeId,
      body.managerId,
      leaveDetails,
    );
  }

  /**
   * Notify employee when leave request status changes
   * Called by Leaves Module - only HR Manager can change leave status
   */
  @Post('leave/status-changed')
  @Roles(SystemRole.HR_MANAGER)
  async notifyLeaveRequestStatusChanged(
    @Body()
    body: {
      leaveRequestId: string;
      employeeId: string;
      status: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION' | 'MODIFIED';
    },
  ) {
    return this.notificationsService.notifyLeaveRequestStatusChanged(
      body.leaveRequestId,
      body.employeeId,
      body.status,
    );
  }

  // ===== TIME MANAGEMENT MODULE NOTIFICATION ENDPOINTS =====

  /**
   * Send shift expiry notification to HR Admin
   * Called by Time Management Module
   */
  @Post('shift-expiry/notify')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendShiftExpiryNotification(
    @Body()
    body: {
      recipientId: string;
      shiftAssignmentId: string;
      employeeId: string;
      endDate: Date;
      daysRemaining: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.sendShiftExpiryNotification(
      body.recipientId,
      body.shiftAssignmentId,
      body.employeeId,
      new Date(body.endDate),
      body.daysRemaining,
      user.userId || user._id || user.id,
    );
  }

  /**
   * Send bulk shift expiry notifications
   * Called by Time Management Module
   */
  @Post('shift-expiry/notify-bulk')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendBulkShiftExpiryNotifications(
    @Body()
    body: {
      hrAdminIds: string[];
      expiringAssignments: Array<{
        assignmentId: string;
        employeeId: string;
        employeeName?: string;
        shiftName?: string;
        endDate: Date;
        daysRemaining: number;
      }>;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.sendBulkShiftExpiryNotifications(
      body.hrAdminIds,
      body.expiringAssignments.map((a) => ({
        ...a,
        endDate: new Date(a.endDate),
      })),
      user.userId || user._id || user.id,
    );
  }

  /**
   * Get shift expiry notifications for an HR Admin
   */
  @Get('shift-expiry/:hrAdminId')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getShiftExpiryNotifications(@Param('hrAdminId') hrAdminId: string) {
    return this.notificationsService.getShiftExpiryNotifications(hrAdminId);
  }

  /**
   * Send shift renewal confirmation
   */
  @Post('shift-renewal/confirm')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async sendShiftRenewalConfirmation(
    @Body()
    body: {
      recipientId: string;
      shiftAssignmentId: string;
      newEndDate: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.sendShiftRenewalConfirmation(
      body.recipientId,
      body.shiftAssignmentId,
      new Date(body.newEndDate),
      user.userId || user._id || user.id,
    );
  }

  /**
   * Send shift archive notification
   */
  @Post('shift-archive/notify')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendShiftArchiveNotification(
    @Body()
    body: {
      recipientId: string;
      shiftAssignmentId: string;
      employeeId: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.sendShiftArchiveNotification(
      body.recipientId,
      body.shiftAssignmentId,
      body.employeeId,
      user.userId || user._id || user.id,
    );
  }

  /**
   * Get all shift-related notifications
   */
  @Get('shift-notifications/:hrAdminId')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getAllShiftNotifications(@Param('hrAdminId') hrAdminId: string) {
    return this.notificationsService.getAllShiftNotifications(hrAdminId);
  }

  /**
   * Send missed punch alert to employee
   * Called by Time Management Module
   */
  @Post('missed-punch/alert/employee')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.DEPARTMENT_HEAD,
  )
  async sendMissedPunchAlertToEmployee(
    @Body()
    body: {
      employeeId: string;
      attendanceRecordId: string;
      missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
      date: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.sendMissedPunchAlertToEmployee(
      body.employeeId,
      body.attendanceRecordId,
      body.missedPunchType,
      new Date(body.date),
      user.userId || user._id || user.id,
    );
  }

  /**
   * Send missed punch alert to manager
   * Called by Time Management Module
   */
  @Post('missed-punch/alert/manager')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async sendMissedPunchAlertToManager(
    @Body()
    body: {
      managerId: string;
      employeeId: string;
      employeeName: string;
      attendanceRecordId: string;
      missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
      date: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.sendMissedPunchAlertToManager(
      body.managerId,
      body.employeeId,
      body.employeeName,
      body.attendanceRecordId,
      body.missedPunchType,
      new Date(body.date),
      user.userId || user._id || user.id,
    );
  }

  /**
   * Send bulk missed punch alerts
   * Called by Time Management Module
   */
  @Post('missed-punch/alert/bulk')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendBulkMissedPunchAlerts(
    @Body()
    body: {
      alerts: Array<{
        employeeId: string;
        managerId?: string;
        employeeName?: string;
        attendanceRecordId: string;
        missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
        date: Date;
      }>;
    },
    @CurrentUser() user: any,
  ) {
    const alerts = body.alerts.map((a) => ({
      ...a,
      date: new Date(a.date),
    }));
    return this.notificationsService.sendBulkMissedPunchAlerts(
      alerts,
      user.userId || user._id || user.id,
    );
  }

  /**
   * Get missed punch notifications for an employee
   */
  @Get('missed-punch/employee/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getMissedPunchNotificationsByEmployee(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    // Self-access check
    if (
      user.roles?.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      user.userId !== employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.notificationsService.getMissedPunchNotificationsByEmployee(
      employeeId,
    );
  }

  /**
   * Get missed punch notifications for a manager
   */
  @Get('missed-punch/manager/:managerId')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getMissedPunchNotificationsByManager(
    @Param('managerId') managerId: string,
    @CurrentUser() user: any,
  ) {
    // Self-access check for managers
    if (
      user.roles?.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== managerId
    ) {
      throw new Error('Access denied');
    }
    return this.notificationsService.getMissedPunchNotificationsByManager(
      managerId,
    );
  }

  /**
   * Get all missed punch notifications (for HR Admin)
   */
  @Get('missed-punch/all')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getAllMissedPunchNotifications(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: { startDate?: Date; endDate?: Date } = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    return this.notificationsService.getAllMissedPunchNotifications(filters);
  }

  /**
   * Legacy endpoint for backward compatibility
   * Notify HR Admin when shift assignment is nearing expiry
   */
  @Post('shift/expiry')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async notifyShiftAssignmentExpiry(
    @Body()
    body: {
      shiftAssignmentId: string;
      hrAdminId: string;
      employeeDetails: any;
      expiryDate: Date;
    },
  ) {
    return this.notificationsService.notifyShiftAssignmentExpiry(
      body.shiftAssignmentId,
      body.hrAdminId,
      body.employeeDetails,
      body.expiryDate,
    );
  }

  /**
   * Legacy endpoint for backward compatibility
   * Notify about missed punch
   */
  @Post('attendance/missed-punch')
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async notifyMissedPunch(
    @Body()
    body: {
      employeeId: string;
      managerId: string;
      coordinatorId: string;
      attendanceDetails: any;
    },
  ) {
    return this.notificationsService.notifyMissedPunch(
      body.employeeId,
      body.managerId,
      body.coordinatorId,
      body.attendanceDetails,
    );
  }

  // ===== COMMON NOTIFICATION ENDPOINTS =====

  /**
   * Get all notifications for the current user
   */
  @Get()
  async getUserNotifications(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    console.log('getUserNotifications called for user:', { userId, user });
    if (!userId) {
      console.error('No user ID found in request');
      return [];
    }
    return this.notificationsService.getUserNotifications(userId);
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string) {
    return this.notificationsService.markNotificationAsRead(notificationId);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(@Param('id') notificationId: string) {
    return this.notificationsService.deleteNotification(notificationId);
  }

  /**
   * TEST ENDPOINT: Create a test notification (for development/testing only)
   * Remove this before production
   */
  @Post('test/create')
  async createTestNotification(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    return this.notificationsService.createTestNotification(userId);
  }

  /**
   * TEST ENDPOINT: Create test leave created notification
   * Simulates a manager receiving a new leave request
   */
  @Post('test/leave-created')
  async testLeaveCreated(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    const managerId = userId; // Manager is the current user
    const employeeId = new Types.ObjectId().toString(); // Simulate different employee

    return this.notificationsService.notifyLeaveRequestCreated(
      new Types.ObjectId().toString(),
      employeeId,
      managerId,
      {
        employeeName: 'John Doe',
        fromDate: '2025-12-20',
        toDate: '2025-12-25',
      },
    );
  }

  /**
   * TEST ENDPOINT: Create test leave approved notification
   * Simulates an employee receiving leave approval
   */
  @Post('test/leave-approved')
  async testLeaveApproved(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    return this.notificationsService.notifyLeaveRequestStatusChanged(
      new Types.ObjectId().toString(),
      userId,
      'APPROVED',
    );
  }

  /**
   * TEST ENDPOINT: Create test leave rejected notification
   */
  @Post('test/leave-rejected')
  async testLeaveRejected(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    return this.notificationsService.notifyLeaveRequestStatusChanged(
      new Types.ObjectId().toString(),
      userId,
      'REJECTED',
    );
  }

  /**
   * TEST ENDPOINT: Create test leave modified notification
   */
  @Post('test/leave-modified')
  async testLeaveModified(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    return this.notificationsService.notifyLeaveRequestStatusChanged(
      new Types.ObjectId().toString(),
      userId,
      'MODIFIED',
    );
  }

  /**
   * TEST ENDPOINT: Create test leave returned for correction notification
   */
  @Post('test/leave-returned')
  async testLeaveReturned(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    return this.notificationsService.notifyLeaveRequestStatusChanged(
      new Types.ObjectId().toString(),
      userId,
      'RETURNED_FOR_CORRECTION',
    );
  }

  /**
   * TEST ENDPOINT: Create test leave finalized notification
   * Sent to employee, manager, and coordinator
   */
  @Post('test/leave-finalized')
  async testLeaveFinalized(@CurrentUser() user: any) {
    const userId = user.userId || user._id || user.id;
    const employeeId = userId;
    const managerId = userId; // Same user acting as manager
    const coordinatorId = userId; // Same user acting as coordinator

    return this.notificationsService.notifyLeaveRequestFinalized(
      new Types.ObjectId().toString(),
      employeeId,
      managerId,
      coordinatorId,
      {
        employeeName: 'John Doe',
        fromDate: '2025-12-20',
        toDate: '2025-12-25',
        status: 'APPROVED',
      },
    );
  }

  // ===== EMPLOYEE PROFILE MODULE NOTIFICATION ENDPOINTS =====

  /**
   * N-040: Notify HR when profile change request is submitted
   */
  @Post('profile/change-request/submitted')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  async notifyProfileChangeRequestSubmitted(
    @Body()
    body: {
      employeeId: string;
      changeRequestId: string;
      changeDescription: string;
    },
  ) {
    return this.notificationsService.notifyProfileChangeRequestSubmitted(
      body.employeeId,
      body.changeRequestId,
      body.changeDescription,
    );
  }

  /**
   * N-037: Notify employee when change request is processed
   */
  @Post('profile/change-request/processed')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async notifyProfileChangeRequestProcessed(
    @Body()
    body: {
      employeeId: string;
      changeRequestId: string;
      status: 'APPROVED' | 'REJECTED';
      reason?: string;
    },
  ) {
    return this.notificationsService.notifyProfileChangeRequestProcessed(
      body.employeeId,
      body.changeRequestId,
      body.status,
      body.reason,
    );
  }

  /**
   * Notify employee when profile is updated by HR
   */
  @Post('profile/updated')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async notifyProfileUpdated(
    @Body() body: { employeeId: string; updatedBy: string; changes: string[] },
  ) {
    return this.notificationsService.notifyProfileUpdated(
      body.employeeId,
      body.updatedBy,
      body.changes,
    );
  }
}
