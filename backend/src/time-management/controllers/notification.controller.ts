import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';
// Import DTOs from DTOs folder
import {
  SendNotificationDto,
  GetNotificationLogsByEmployeeDto,
  SyncAttendanceWithPayrollDto,
  SyncLeaveWithPayrollDto,
  SynchronizeAttendanceAndPayrollDto,
} from '../dtos/notification-and-sync.dtos';

@Controller('notification-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationAndSyncController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('notification')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendNotification(
      sendNotificationDto,
      user.userId,
    );
  }

  @Get('notification/employee/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getNotificationLogsByEmployee(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.notificationService.getNotificationLogsByEmployee(
      {
        employeeId,
      },
      user.userId,
    );
  }

  @Post('sync/attendance')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async syncAttendanceWithPayroll(
    @Body() syncAttendanceWithPayrollDto: SyncAttendanceWithPayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.syncAttendanceWithPayroll(
      syncAttendanceWithPayrollDto,
      user.userId,
    );
  }

  @Post('sync/leave')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async syncLeaveWithPayroll(
    @Body() syncLeaveWithPayrollDto: SyncLeaveWithPayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.syncLeaveWithPayroll(
      syncLeaveWithPayrollDto,
      user.userId,
    );
  }

  @Post('sync/attendance-leave')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async synchronizeAttendanceAndPayroll(
    @Body()
    synchronizeAttendanceAndPayrollDto: SynchronizeAttendanceAndPayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.synchronizeAttendanceAndPayroll(
      synchronizeAttendanceAndPayrollDto,
      user.userId,
    );
  }

  // ===== GET ENDPOINTS FOR PAYROLL/LEAVES TO CONSUME DATA =====
  @Get('sync/attendance/:employeeId')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getAttendanceDataForSync(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.notificationService.getAttendanceDataForSync(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      user.userId,
    );
  }

  @Get('sync/overtime/:employeeId')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getOvertimeDataForSync(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.notificationService.getOvertimeDataForSync(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      user.userId,
    );
  }

  // ===== US9: ATTENDANCE-TO-PAYROLL SYNC =====
  // BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules

  @Post('sync/daily-batch')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async runDailyPayrollSync(
    @Body() body: { syncDate: Date },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.runDailyPayrollSync(
      new Date(body.syncDate),
      user.userId,
    );
  }

  @Get('sync/pending')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async getPendingPayrollSyncData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    const filters: { startDate?: Date; endDate?: Date; departmentId?: string } = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (departmentId) filters.departmentId = departmentId;
    return this.notificationService.getPendingPayrollSyncData(filters, user.userId);
  }

  @Post('sync/finalize')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async finalizeRecordsForPayroll(
    @Body() body: { recordIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.finalizeRecordsForPayroll(
      body.recordIds,
      user.userId,
    );
  }

  @Post('sync/validate')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async validateDataForPayrollSync(
    @Body() body: { startDate: Date; endDate: Date },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.validateDataForPayrollSync(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
      user.userId,
    );
  }

  @Get('sync/exceptions')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async getExceptionDataForPayrollSync(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @CurrentUser() user?: any,
  ) {
    const filters: { startDate?: Date; endDate?: Date; employeeId?: string } = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (employeeId) filters.employeeId = employeeId;
    return this.notificationService.getExceptionDataForPayrollSync(filters, user.userId);
  }

  @Get('sync/history')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async getPayrollSyncHistory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    const filters: { startDate?: Date; endDate?: Date; limit?: number } = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit, 10);
    return this.notificationService.getPayrollSyncHistory(filters, user.userId);
  }

  @Post('sync/comprehensive')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_SPECIALIST)
  async getComprehensivePayrollData(
    @Body() body: { startDate: Date; endDate: Date; departmentId?: string },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getComprehensivePayrollData(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        departmentId: body.departmentId,
      },
      user.userId,
    );
  }

  // ===== US4: SHIFT EXPIRY NOTIFICATIONS =====
  // BR-TM-05: Shift schedules must be assignable by Department, Position, or Individual

  @Post('shift-expiry/notify')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendShiftExpiryNotification(
    @Body() body: {
      recipientId: string;
      shiftAssignmentId: string;
      employeeId: string;
      endDate: Date;
      daysRemaining: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendShiftExpiryNotification(
      body.recipientId,
      body.shiftAssignmentId,
      body.employeeId,
      new Date(body.endDate),
      body.daysRemaining,
      user.userId,
    );
  }

  @Post('shift-expiry/notify-bulk')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendBulkShiftExpiryNotifications(
    @Body() body: {
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
    return this.notificationService.sendBulkShiftExpiryNotifications(
      body.hrAdminIds,
      body.expiringAssignments.map(a => ({
        ...a,
        endDate: new Date(a.endDate),
      })),
      user.userId,
    );
  }

  @Get('shift-expiry/:hrAdminId')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getShiftExpiryNotifications(
    @Param('hrAdminId') hrAdminId: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getShiftExpiryNotifications(
      hrAdminId,
      user.userId,
    );
  }

  @Post('shift-renewal/confirm')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async sendShiftRenewalConfirmation(
    @Body() body: {
      recipientId: string;
      shiftAssignmentId: string;
      newEndDate: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendShiftRenewalConfirmation(
      body.recipientId,
      body.shiftAssignmentId,
      new Date(body.newEndDate),
      user.userId,
    );
  }

  @Post('shift-archive/notify')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendShiftArchiveNotification(
    @Body() body: {
      recipientId: string;
      shiftAssignmentId: string;
      employeeId: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendShiftArchiveNotification(
      body.recipientId,
      body.shiftAssignmentId,
      body.employeeId,
      user.userId,
    );
  }

  @Get('shift-notifications/:hrAdminId')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getAllShiftNotifications(
    @Param('hrAdminId') hrAdminId: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getAllShiftNotifications(
      hrAdminId,
      user.userId,
    );
  }

  // ===== US8: MISSED PUNCH MANAGEMENT & ALERTS =====
  // BR-TM-14: Missed punches/late sign-ins must be handled via auto-flagging, notifications, or payroll blocking

  @Post('missed-punch/alert/employee')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.DEPARTMENT_HEAD,
  )
  async sendMissedPunchAlertToEmployee(
    @Body() body: {
      employeeId: string;
      attendanceRecordId: string;
      missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
      date: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendMissedPunchAlertToEmployee(
      body.employeeId,
      body.attendanceRecordId,
      body.missedPunchType,
      new Date(body.date),
      user.userId,
    );
  }

  @Post('missed-punch/alert/manager')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async sendMissedPunchAlertToManager(
    @Body() body: {
      managerId: string;
      employeeId: string;
      employeeName: string;
      attendanceRecordId: string;
      missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
      date: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendMissedPunchAlertToManager(
      body.managerId,
      body.employeeId,
      body.employeeName,
      body.attendanceRecordId,
      body.missedPunchType,
      new Date(body.date),
      user.userId,
    );
  }

  @Post('missed-punch/alert/bulk')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async sendBulkMissedPunchAlerts(
    @Body() body: {
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
    const alerts = body.alerts.map(a => ({
      ...a,
      date: new Date(a.date),
    }));
    return this.notificationService.sendBulkMissedPunchAlerts(
      alerts,
      user.userId,
    );
  }

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
    return this.notificationService.getMissedPunchNotificationsByEmployee(
      employeeId,
      user.userId,
    );
  }

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
    return this.notificationService.getMissedPunchNotificationsByManager(
      managerId,
      user.userId,
    );
  }

  @Get('missed-punch/all')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getAllMissedPunchNotifications(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const filters: { startDate?: Date; endDate?: Date } = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    return this.notificationService.getAllMissedPunchNotifications(
      filters,
      user.userId,
    );
  }

  @Post('missed-punch/flag-with-notification')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.DEPARTMENT_HEAD,
  )
  async flagMissedPunchWithNotification(
    @Body() body: {
      attendanceRecordId: string;
      employeeId: string;
      managerId: string;
      employeeName: string;
      missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT';
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.flagMissedPunchWithNotification(
      body.attendanceRecordId,
      body.employeeId,
      body.managerId,
      body.employeeName,
      body.missedPunchType,
      user.userId,
    );
  }

  @Get('missed-punch/statistics')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getMissedPunchStatistics(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const filters: { employeeId?: string; startDate?: Date; endDate?: Date } = {};
    if (employeeId) filters.employeeId = employeeId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    return this.notificationService.getMissedPunchStatistics(
      filters,
      user.userId,
    );
  }

  // ===== US16: VACATION PACKAGE INTEGRATION (BR-TM-19) =====

  /**
   * US16: Link employee vacation to attendance schedule
   * BR-TM-19: Vacation packages must be linked to shift schedules
   */
  @Post('vacation/link-to-attendance')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async linkVacationToAttendanceSchedule(
    @Body() body: {
      employeeId: string;
      vacationPackageId: string;
      startDate: Date;
      endDate: Date;
      vacationType: string;
      autoReflect?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.linkVacationToAttendanceSchedule(
      {
        employeeId: body.employeeId,
        vacationPackageId: body.vacationPackageId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        vacationType: body.vacationType,
        autoReflect: body.autoReflect,
      },
      user.userId,
    );
  }

  /**
   * US16: Get employee vacation-attendance status
   * BR-TM-19: Check how vacation affects attendance
   */
  @Get('vacation/attendance-status/:employeeId')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getEmployeeVacationAttendanceStatus(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getEmployeeVacationAttendanceStatus(
      {
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      user.userId,
    );
  }

  /**
   * US16: Validate vacation against shift schedule
   * BR-TM-19: Ensure vacation dates align with shift schedules
   */
  @Post('vacation/validate-against-schedule')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async validateVacationAgainstShiftSchedule(
    @Body() body: {
      employeeId: string;
      vacationStartDate: Date;
      vacationEndDate: Date;
      shiftAssignmentId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.validateVacationAgainstShiftSchedule(
      {
        employeeId: body.employeeId,
        vacationStartDate: new Date(body.vacationStartDate),
        vacationEndDate: new Date(body.vacationEndDate),
        shiftAssignmentId: body.shiftAssignmentId,
      },
      user.userId,
    );
  }

  /**
   * US16: Calculate leave deductions from attendance
   * BR-TM-19: Link vacation packages to attendance for automatic deductions
   */
  @Post('vacation/calculate-deductions')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async calculateLeaveDeductionsFromAttendance(
    @Body() body: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
      leaveType?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.calculateLeaveDeductionsFromAttendance(
      {
        employeeId: body.employeeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        leaveType: body.leaveType,
      },
      user.userId,
    );
  }

  /**
   * US16: Get department vacation-attendance summary
   * BR-TM-19: Department-level vacation tracking
   */
  @Post('vacation/department-summary')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getDepartmentVacationAttendanceSummary(
    @Body() body: {
      departmentId?: string;
      startDate: Date;
      endDate: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getDepartmentVacationAttendanceSummary(
      {
        departmentId: body.departmentId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
      user.userId,
    );
  }

  // ===== US18: ESCALATION FOR PENDING REQUESTS BEFORE PAYROLL CUT-OFF =====

  /**
   * US18: Get payroll cutoff configuration
   * BR-TM-20: View escalation rules before payroll cutoff
   */
  @Get('payroll-cutoff/config')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getPayrollCutoffConfig(@CurrentUser() user: any) {
    return this.notificationService.getPayrollCutoffConfig(user.userId);
  }

  /**
   * US18: Get pending requests before payroll cutoff
   * BR-TM-20: Identify all unreviewed requests before cutoff
   */
  @Get('payroll-cutoff/pending')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getPendingRequestsBeforePayrollCutoff(
    @Query('payrollCutoffDate') payrollCutoffDate?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    // Validate departmentId - treat empty strings as undefined
    const validDepartmentId = departmentId && departmentId.trim() !== '' 
      ? departmentId.trim() 
      : undefined;
    
    return this.notificationService.getPendingRequestsBeforePayrollCutoff(
      {
        payrollCutoffDate: payrollCutoffDate ? new Date(payrollCutoffDate) : undefined,
        departmentId: validDepartmentId,
      },
      user.userId,
    );
  }

  /**
   * US18: Auto-escalate pending requests before payroll cutoff
   * BR-TM-20: Unreviewed requests must auto-escalate before payroll cutoff
   */
  @Post('payroll-cutoff/auto-escalate')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async autoEscalateBeforePayrollCutoff(
    @Body() body: {
      payrollCutoffDate?: Date;
      escalationDaysBefore?: number;
      notifyManagers?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.autoEscalateBeforePayrollCutoff(
      {
        payrollCutoffDate: body.payrollCutoffDate ? new Date(body.payrollCutoffDate) : undefined,
        escalationDaysBefore: body.escalationDaysBefore,
        notifyManagers: body.notifyManagers,
      },
      user.userId,
    );
  }

  /**
   * US18: Check payroll readiness status
   * BR-TM-20: Verify all requests are processed before payroll
   */
  @Post('payroll-cutoff/readiness')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async checkPayrollReadinessStatus(
    @Body() body: {
      payrollCutoffDate?: Date;
      departmentId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.checkPayrollReadinessStatus(
      {
        payrollCutoffDate: body.payrollCutoffDate ? new Date(body.payrollCutoffDate) : undefined,
        departmentId: body.departmentId,
      },
      user.userId,
    );
  }

  /**
   * US18: Get escalation history for audit
   * BR-TM-20: Track escalation actions
   */
  @Post('payroll-cutoff/escalation-history')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getEscalationHistory(
    @Body() body: {
      startDate?: Date;
      endDate?: Date;
      type?: 'PAYROLL' | 'THRESHOLD' | 'MANUAL' | 'ALL';
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getEscalationHistory(
      {
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        type: body.type,
      },
      user.userId,
    );
  }

  /**
   * US18: Send payroll cutoff reminder notifications
   * BR-TM-20: Notify stakeholders before cutoff
   */
  @Post('payroll-cutoff/send-reminders')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async sendPayrollCutoffReminders(
    @Body() body: {
      payrollCutoffDate?: Date;
      reminderDaysBefore?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendPayrollCutoffReminders(
      {
        payrollCutoffDate: body.payrollCutoffDate ? new Date(body.payrollCutoffDate) : undefined,
        reminderDaysBefore: body.reminderDaysBefore,
      },
      user.userId,
    );
  }

  // ===== US20: CROSS-MODULE DATA SYNCHRONIZATION (BR-TM-22) =====

  /**
   * US20: Get cross-module sync status dashboard
   * BR-TM-22: Monitor sync status across all modules
   */
  @Get('cross-module/status')
  @Roles(
    SystemRole.HR_MANAGER,
  )
  async getCrossModuleSyncStatus(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.notificationService.getCrossModuleSyncStatus(
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user.userId,
    );
  }

  /**
   * US20: Sync time management data with leaves module
   * BR-TM-22: Sync with leave modules
   */
  @Post('cross-module/sync-leaves')
  @Roles(
    SystemRole.HR_MANAGER,
  )
  async syncWithLeavesModule(
    @Body() body: {
      employeeId?: string;
      startDate: Date;
      endDate: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.syncWithLeavesModule(
      {
        employeeId: body.employeeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
      user.userId,
    );
  }

  /**
   * US20: Sync time management data with benefits module
   * BR-TM-22: Sync with benefits modules
   */
  @Post('cross-module/sync-benefits')
  @Roles(
    SystemRole.HR_MANAGER,
  )
  async syncWithBenefitsModule(
    @Body() body: {
      employeeId?: string;
      startDate: Date;
      endDate: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.syncWithBenefitsModule(
      {
        employeeId: body.employeeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
      user.userId,
    );
  }

  /**
   * US20: Run full cross-module synchronization
   * BR-TM-22: Sync all time management data with payroll, benefits, and leave modules
   */
  @Post('cross-module/sync-all')
  @Roles(
    SystemRole.HR_MANAGER,
  )
  async runFullCrossModuleSync(
    @Body() body: {
      syncDate: Date;
      modules: ('payroll' | 'leaves' | 'benefits')[];
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.runFullCrossModuleSync(
      {
        syncDate: new Date(body.syncDate),
        modules: body.modules,
      },
      user.userId,
    );
  }

  /**
   * US20: Check data consistency across modules
   * BR-TM-22: Ensure data consistency
   */
  @Post('cross-module/consistency-check')
  @Roles(
    SystemRole.HR_MANAGER,
  )
  async checkCrossModuleDataConsistency(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.checkCrossModuleDataConsistency(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
      },
      user.userId,
    );
  }

  /**
   * US20: Get data ready for all downstream modules
   * BR-TM-22: Provide data packages for downstream systems
   */
  @Post('cross-module/data-packages')
  @Roles(
    SystemRole.HR_MANAGER,
  )
  async getDataForDownstreamModules(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
      modules: ('payroll' | 'leaves' | 'benefits')[];
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationService.getDataForDownstreamModules(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        departmentId: body.departmentId,
        modules: body.modules,
      },
      user.userId,
    );
  }
}
