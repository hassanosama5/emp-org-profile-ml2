import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TimeManagementService } from './time-management.service';
import { NotificationService } from './notification.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TimeException, TimeExceptionDocument } from '../models/time-exception.schema';
import { TimeExceptionType, CorrectionRequestStatus, TimeExceptionStatus } from '../models/enums/index';
import { AttendanceCorrectionRequest, AttendanceCorrectionRequestDocument } from '../models/attendance-correction-request.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee-profile/models/employee-system-role.schema';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';
import { PayrollConfigurationService } from '../../payroll-configuration/payroll-configuration.service';
import { LeaveRequest, LeaveRequestDocument } from '../../leaves/models/leave-request.schema';

/**
 * Sync Scheduler Service
 * 
 * Handles automatic daily synchronization of time management data
 * BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules
 * 
 * Runs daily at 2:00 AM to sync previous day's data
 */
@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);

  // Threshold for repeated lateness detection (3+ times in 30 days)
  private readonly LATENESS_THRESHOLD = 3;
  private readonly LATENESS_PERIOD_DAYS = 30;

  // Payroll cut-off configuration
  // DAYS_BEFORE_PAY_DATE: Cut-off is this many days before the configured pay date
  private readonly DAYS_BEFORE_PAY_DATE = 5; // Cut-off is 5 days before pay date
  private readonly ESCALATION_DAYS_BEFORE = 3; // Escalate 3 days before cutoff
  private readonly FALLBACK_CUTOFF_DAY = 25; // Fallback if payroll config not found

  constructor(
    private readonly timeManagementService: TimeManagementService,
    private readonly notificationService: NotificationService,
    private readonly payrollConfigurationService: PayrollConfigurationService,
    @InjectModel(TimeException.name)
    private readonly timeExceptionModel: Model<TimeExceptionDocument>,
    @InjectModel(AttendanceCorrectionRequest.name)
    private readonly correctionRequestModel: Model<AttendanceCorrectionRequestDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private readonly employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly leaveRequestModel: Model<LeaveRequestDocument>,
  ) {}

  /**
   * Daily sync job - runs at 2:00 AM every day
   * Syncs attendance, overtime, and penalty data with payroll and leave systems
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailySync() {
    try {
      this.logger.log('[SCHEDULED TASK] Starting daily time management data sync...');
      
      // Sync previous day's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const syncResult = await this.timeManagementService.syncTimeManagementData(
        {
          syncDate: yesterday,
          modules: ['payroll', 'leaves', 'benefits'],
        },
        'system', // System-initiated sync
      );

      this.logger.log(
        `[SCHEDULED TASK] Daily sync completed. Overall status: ${syncResult.overallStatus}. ` +
        `Payroll: ${syncResult.results?.payroll?.status || 'N/A'}, ` +
        `Leaves: ${syncResult.results?.leaves?.status || 'N/A'}, ` +
        `Benefits: ${syncResult.results?.benefits?.status || 'N/A'}`,
      );

      // Log any failures
      if (syncResult.results?.payroll?.status === 'FAILED') {
        this.logger.error(
          `[SCHEDULED TASK] Payroll sync failed: ${syncResult.results.payroll.error}`,
        );
      }
      if (syncResult.results?.leaves?.status === 'FAILED') {
        this.logger.error(
          `[SCHEDULED TASK] Leaves sync failed: ${syncResult.results.leaves.error}`,
        );
      }
      if (syncResult.results?.benefits?.status === 'FAILED') {
        this.logger.error(
          `[SCHEDULED TASK] Benefits sync failed: ${syncResult.results.benefits.error}`,
        );
      }

      // BR-TM-20 / Payroll Cut-off: auto-escalate pending items when approaching cut-off
      try {
        const escalationResult =
          await this.notificationService.autoEscalateBeforePayrollCutoff(
            {},
            'system',
          );
        this.logger.log(
          `[SCHEDULED TASK] Payroll cut-off auto-escalation result: ${escalationResult?.success ? 'success' : 'skipped'} (${escalationResult?.message || 'no message'})`,
        );
      } catch (escalationError: any) {
        this.logger.error(
          `[SCHEDULED TASK] Payroll cut-off auto-escalation failed: ${escalationError?.message || escalationError}`,
          escalationError?.stack,
        );
      }

      // BR-TM-20: Auto-escalate overdue exceptions after deadline (default: 3 days)
      try {
        const overdueEscalationResult =
          await this.timeManagementService.autoEscalateOverdueExceptions(
            {
              thresholdDays: 3, // Auto-escalate requests pending for more than 3 days
              excludeTypes: [], // Escalate all types
            },
            'system',
          );
        this.logger.log(
          `[SCHEDULED TASK] Overdue exceptions auto-escalation: ${overdueEscalationResult.summary.escalated} escalated, ${overdueEscalationResult.summary.failed} failed`,
        );
      } catch (overdueError: any) {
        this.logger.error(
          `[SCHEDULED TASK] Overdue exceptions auto-escalation failed: ${overdueError?.message || overdueError}`,
          overdueError?.stack,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[SCHEDULED TASK] Daily sync failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Scheduled task to detect repeated lateness offenders
   * BR-TM-09: Auto-flag employees with 3+ lateness occurrences in 30 days
   * Runs daily at 5:30 AM
   */
  @Cron('0 59 5 * * *')
  async handleRepeatedLatenessDetection() {
    try {
      this.logger.log('[LATENESS CHECK] Starting repeated lateness detection...');

      // Debug: Count total lateness records
      const totalLatenessRecords = await this.timeExceptionModel.countDocuments({
        type: TimeExceptionType.LATE,
        reason: { $not: { $regex: /REPEATED LATENESS FLAG/i } },
      });
      this.logger.log(`[LATENESS CHECK] Total LATE records: ${totalLatenessRecords}`);

      // Debug: Count all time exception records
      const allExceptions = await this.timeExceptionModel.countDocuments({});
      this.logger.log(`[LATENESS CHECK] Total TimeException records in database: ${allExceptions}`);

      // Get all unique employees with 3+ lateness exceptions (excluding existing flags)
      const latenessAggregation = await this.timeExceptionModel.aggregate([
        {
          $match: {
            type: TimeExceptionType.LATE,
            reason: { $not: { $regex: /REPEATED LATENESS FLAG/i } },
          },
        },
        {
          $group: {
            _id: '$employeeId',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gte: this.LATENESS_THRESHOLD },
          },
        },
        { $sort: { count: -1 } },
      ]);

      this.logger.log(
        `[SCHEDULED TASK] Found ${latenessAggregation.length} employees with repeated lateness (${this.LATENESS_THRESHOLD}+ times in ${this.LATENESS_PERIOD_DAYS} days)`,
      );

      let flaggedCount = 0;

      for (const employee of latenessAggregation) {
        const employeeId = employee._id?.toString();
        const latenessCount = employee.count;

        if (!employeeId) continue;

        // Check if already flagged
        const existingFlag = await this.timeExceptionModel.findOne({
          employeeId,
          type: TimeExceptionType.LATE,
          reason: { $regex: /REPEATED LATENESS FLAG/i },
        });

        if (existingFlag) {
          this.logger.log(`[SCHEDULED TASK] Employee ${employeeId} already flagged, skipping`);
          continue;
        }

        try {
          // Create a flag entry
          await this.timeExceptionModel.create({
            employeeId,
            type: TimeExceptionType.LATE,
            status: 'PENDING',
            reason: `[REPEATED LATENESS FLAG] ${latenessCount} late arrivals. Requires HR review.`,
            attendanceRecordId: employeeId,
            assignedTo: 'system',
          });

          flaggedCount++;

          // Send notification to HR admins
          await this.notificationService.sendRepeatedLatenessFlagNotification(
            employeeId,
            latenessCount,
            'FLAGGED',
            'system',
          );

          this.logger.log(
            `[SCHEDULED TASK] Flagged employee ${employeeId} - ${latenessCount} late arrivals`,
          );
        } catch (error: any) {
          this.logger.error(
            `[SCHEDULED TASK] Failed to flag employee ${employeeId}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `[SCHEDULED TASK] Repeated lateness detection completed. Flagged: ${flaggedCount} employees`,
      );
    } catch (error: any) {
      this.logger.error(
        `[SCHEDULED TASK] Repeated lateness detection failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Scheduled task for payroll cut-off escalation
   * BR-TM-20: Auto-escalate pending time/leave requests before monthly payroll cut-off
   * Runs daily at 8:00 AM to check for pending requests
   * US18: Leave or time requests escalate automatically if not reviewed before monthly payroll cut-off
   */
  @Cron('0 0 8 * * *')
  async handlePayrollCutoffEscalation() {
    try {
      this.logger.log('[PAYROLL CUTOFF] Starting payroll cut-off escalation check...');

      const now = new Date();
      const payrollCutoffDate = await this.getNextPayrollCutoffDate();
      const daysUntilCutoff = Math.ceil(
        (payrollCutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      this.logger.log(
        `[PAYROLL CUTOFF] Next cutoff: ${payrollCutoffDate.toISOString()}, Days until: ${daysUntilCutoff}`,
      );

      // Only escalate if within the escalation window
      if (daysUntilCutoff > this.ESCALATION_DAYS_BEFORE) {
        this.logger.log(
          `[PAYROLL CUTOFF] Not within escalation window (${daysUntilCutoff} days > ${this.ESCALATION_DAYS_BEFORE} days). Skipping.`,
        );
        return;
      }

      // Get all HR admins for notifications
      const hrAdmins = await this.getHRAdminIds();
      this.logger.log(`[PAYROLL CUTOFF] Found ${hrAdmins.length} HR admins for notifications`);

      // Escalate time exceptions
      const escalatedExceptions = await this.escalatePendingTimeExceptions(
        payrollCutoffDate,
        daysUntilCutoff,
      );

      // Escalate correction requests
      const escalatedCorrections = await this.escalatePendingCorrectionRequests(
        payrollCutoffDate,
        daysUntilCutoff,
      );

      // Get pending leave requests (read-only - we don't modify Leaves subsystem)
      const pendingLeaves = await this.getPendingLeaveRequests();

      const totalEscalated = escalatedExceptions.length + escalatedCorrections.length;
      const totalPendingLeaves = pendingLeaves.length;

      // Send notifications to HR admins if any items need attention
      if ((totalEscalated > 0 || totalPendingLeaves > 0) && hrAdmins.length > 0) {
        await this.sendPayrollEscalationNotifications(
          hrAdmins,
          escalatedExceptions,
          escalatedCorrections,
          pendingLeaves,
          payrollCutoffDate,
          daysUntilCutoff,
        );
      }

      this.logger.log(
        `[PAYROLL CUTOFF] Escalation completed. Time exceptions: ${escalatedExceptions.length}, Correction requests: ${escalatedCorrections.length}, Pending leaves (notified): ${totalPendingLeaves}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[PAYROLL CUTOFF] Escalation failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual trigger for payroll cut-off escalation
   * Can be called via API endpoint
   */
  async triggerPayrollCutoffEscalation(): Promise<{
    success: boolean;
    message: string;
    payrollCutoffDate: Date;
    daysUntilCutoff: number;
    escalatedExceptions: number;
    escalatedCorrections: number;
    pendingLeaves: number;
    notificationsSent: number;
  }> {
    this.logger.log('[PAYROLL CUTOFF] Manual trigger initiated...');

    const now = new Date();
    const payrollCutoffDate = await this.getNextPayrollCutoffDate();
    const daysUntilCutoff = Math.ceil(
      (payrollCutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get all HR admins for notifications
    const hrAdmins = await this.getHRAdminIds();
    this.logger.log(`[PAYROLL CUTOFF] Found ${hrAdmins.length} HR admins: ${JSON.stringify(hrAdmins)}`);

    // Escalate time exceptions
    const escalatedExceptions = await this.escalatePendingTimeExceptions(
      payrollCutoffDate,
      daysUntilCutoff,
    );

    // Escalate correction requests
    const escalatedCorrections = await this.escalatePendingCorrectionRequests(
      payrollCutoffDate,
      daysUntilCutoff,
    );

    // Get pending leave requests (read-only - we don't modify Leaves subsystem)
    const pendingLeaves = await this.getPendingLeaveRequests();

    const totalEscalated = escalatedExceptions.length + escalatedCorrections.length;
    const totalPendingLeaves = pendingLeaves.length;

    this.logger.log(`[PAYROLL CUTOFF] Items found - Escalated: ${totalEscalated}, Pending Leaves: ${totalPendingLeaves}`);

    // Send notifications to HR admins (always send if there are HR admins)
    let notificationsSent = 0;
    if (hrAdmins.length > 0) {
      notificationsSent = await this.sendPayrollEscalationNotifications(
        hrAdmins,
        escalatedExceptions,
        escalatedCorrections,
        pendingLeaves,
        payrollCutoffDate,
        daysUntilCutoff,
      );
    }

    let message: string;
    if (totalEscalated > 0 || totalPendingLeaves > 0) {
      message = `Escalated ${totalEscalated} time requests, notified about ${totalPendingLeaves} pending leave requests. ${notificationsSent} notification(s) sent to HR.`;
    } else {
      message = `No pending requests to escalate. ${notificationsSent} notification(s) sent to HR.`;
    }

    return {
      success: true,
      message,
      payrollCutoffDate,
      daysUntilCutoff,
      escalatedExceptions: escalatedExceptions.length,
      escalatedCorrections: escalatedCorrections.length,
      pendingLeaves: totalPendingLeaves,
      notificationsSent,
    };
  }

  /**
   * Get payroll readiness status
   */
  async getPayrollReadinessStatus(): Promise<{
    payrollCutoffDate: Date;
    daysUntilCutoff: number;
    status: 'READY' | 'WARNING' | 'CRITICAL';
    pendingExceptions: number;
    pendingCorrections: number;
    pendingLeaves: number;
    escalatedExceptions: number;
    escalatedCorrections: number;
  }> {
    const payrollCutoffDate = await this.getNextPayrollCutoffDate();
    const now = new Date();
    const daysUntilCutoff = Math.ceil(
      (payrollCutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Count pending items
    const pendingExceptions = await this.timeExceptionModel.countDocuments({
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
    });

    const pendingCorrections = await this.correctionRequestModel.countDocuments({
      status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW] },
    });

    const pendingLeaves = await this.leaveRequestModel.countDocuments({
      status: 'pending',
    });

    // Count escalated items
    const escalatedExceptions = await this.timeExceptionModel.countDocuments({
      status: TimeExceptionStatus.ESCALATED,
      reason: { $regex: /PAYROLL CUTOFF/i },
    });

    const escalatedCorrections = await this.correctionRequestModel.countDocuments({
      status: CorrectionRequestStatus.ESCALATED,
      reason: { $regex: /PAYROLL CUTOFF/i },
    });

    const totalPending = pendingExceptions + pendingCorrections + pendingLeaves;

    let status: 'READY' | 'WARNING' | 'CRITICAL';
    if (totalPending === 0) {
      status = 'READY';
    } else if (daysUntilCutoff <= 2) {
      status = 'CRITICAL';
    } else if (daysUntilCutoff <= 5) {
      status = 'WARNING';
    } else {
      status = 'READY';
    }

    return {
      payrollCutoffDate,
      daysUntilCutoff,
      status,
      pendingExceptions,
      pendingCorrections,
      pendingLeaves,
      escalatedExceptions,
      escalatedCorrections,
    };
  }

  // ===== Helper Methods =====

  /**
   * Get the next payroll cut-off date from Payroll Configuration
   * Cut-off is calculated as: payDate - DAYS_BEFORE_PAY_DATE
   * Falls back to 25th of month if payroll config not found
   */
  private async getNextPayrollCutoffDate(): Promise<Date> {
    const now = new Date();

    try {
      // Fetch pay date from Payroll Configuration module
      const companySettings = await this.payrollConfigurationService.getCompanySettings();
      
      if (companySettings && companySettings.payDate) {
        const payDate = new Date(companySettings.payDate);
        const payDay = payDate.getDate();
        
        // Calculate cut-off day (payDate - DAYS_BEFORE_PAY_DATE)
        const cutoffDay = Math.max(1, payDay - this.DAYS_BEFORE_PAY_DATE);
        
        // Create cut-off date for current month
        let cutoffDate = new Date(now.getFullYear(), now.getMonth(), cutoffDay, 23, 59, 59);
        
        // If we've passed this month's cutoff, use next month's
        if (now > cutoffDate) {
          cutoffDate.setMonth(cutoffDate.getMonth() + 1);
        }
        
        this.logger.log(
          `[PAYROLL CUTOFF] Using payDate from Payroll Config: ${payDay}th, Cut-off: ${cutoffDay}th`,
        );
        
        return cutoffDate;
      }
    } catch (error: any) {
      this.logger.warn(
        `[PAYROLL CUTOFF] Could not fetch payroll config: ${error.message}. Using fallback.`,
      );
    }

    // Fallback: Use hardcoded 25th of month
    this.logger.log(
      `[PAYROLL CUTOFF] Using fallback cut-off day: ${this.FALLBACK_CUTOFF_DAY}th`,
    );
    
    let cutoffDate = new Date(now.getFullYear(), now.getMonth(), this.FALLBACK_CUTOFF_DAY, 23, 59, 59);
    
    // If we've passed this month's cutoff, use next month's
    if (now > cutoffDate) {
      cutoffDate.setMonth(cutoffDate.getMonth() + 1);
    }

    return cutoffDate;
  }

  /**
   * Get all HR Admin employee IDs
   */
  private async getHRAdminIds(): Promise<string[]> {
    // Query for employees with HR roles - using 'roles' array field (not singular 'role')
    const hrAdminRoles = await this.employeeSystemRoleModel
      .find({
        roles: { $in: [SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN] },
      })
      .exec();

    this.logger.log(`[PAYROLL CUTOFF] Raw HR admin roles query result: ${hrAdminRoles.length} records`);
    
    const hrAdminIds = hrAdminRoles
      .filter((role) => role.employeeProfileId)
      .map((role) => role.employeeProfileId.toString());

    return hrAdminIds;
  }

  /**
   * Escalate pending time exceptions
   */
  private async escalatePendingTimeExceptions(
    payrollCutoffDate: Date,
    daysUntilCutoff: number,
  ): Promise<any[]> {
    const pendingExceptions = await this.timeExceptionModel.find({
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
    }).exec();

    const escalatedItems: any[] = [];

    for (const exception of pendingExceptions) {
      try {
        await this.timeExceptionModel.findByIdAndUpdate(exception._id, {
          status: TimeExceptionStatus.ESCALATED,
          reason: `${exception.reason || ''}\n\n[AUTO-ESCALATED - PAYROLL CUTOFF]\nEscalated on: ${new Date().toISOString()}\nPayroll cutoff: ${payrollCutoffDate.toISOString()}\nDays until cutoff: ${daysUntilCutoff}`,
        });

        escalatedItems.push({
          id: exception._id,
          type: exception.type,
          employeeId: exception.employeeId,
          previousStatus: exception.status,
        });

        this.logger.log(
          `[PAYROLL CUTOFF] Escalated time exception ${exception._id} (${exception.type})`,
        );
      } catch (error: any) {
        this.logger.error(
          `[PAYROLL CUTOFF] Failed to escalate time exception ${exception._id}: ${error.message}`,
        );
      }
    }

    return escalatedItems;
  }

  /**
   * Escalate pending correction requests
   */
  private async escalatePendingCorrectionRequests(
    payrollCutoffDate: Date,
    daysUntilCutoff: number,
  ): Promise<any[]> {
    const pendingCorrections = await this.correctionRequestModel.find({
      status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW] },
    }).exec();

    const escalatedItems: any[] = [];

    for (const correction of pendingCorrections) {
      try {
        await this.correctionRequestModel.findByIdAndUpdate(correction._id, {
          status: CorrectionRequestStatus.ESCALATED,
          reason: `${correction.reason || ''}\n\n[AUTO-ESCALATED - PAYROLL CUTOFF]\nEscalated on: ${new Date().toISOString()}\nPayroll cutoff: ${payrollCutoffDate.toISOString()}\nDays until cutoff: ${daysUntilCutoff}`,
        });

        escalatedItems.push({
          id: correction._id,
          type: 'CORRECTION_REQUEST',
          employeeId: correction.employeeId,
          previousStatus: correction.status,
        });

        this.logger.log(
          `[PAYROLL CUTOFF] Escalated correction request ${correction._id}`,
        );
      } catch (error: any) {
        this.logger.error(
          `[PAYROLL CUTOFF] Failed to escalate correction request ${correction._id}: ${error.message}`,
        );
      }
    }

    return escalatedItems;
  }

  /**
   * Send notifications to HR admins about escalated items and pending leaves
   * Uses the unified notification service to create proper notifications that appear in the notification center
   */
  private async sendPayrollEscalationNotifications(
    hrAdminIds: string[],
    escalatedExceptions: any[],
    escalatedCorrections: any[],
    pendingLeaves: any[],
    payrollCutoffDate: Date,
    daysUntilCutoff: number,
  ): Promise<number> {
    this.logger.log(
      `[PAYROLL CUTOFF] Sending notifications to ${hrAdminIds.length} HR admins...`,
    );

    if (hrAdminIds.length === 0) {
      this.logger.warn('[PAYROLL CUTOFF] No HR admin IDs provided, skipping notifications');
      return 0;
    }

    try {
      const result = await this.notificationService.sendPayrollCutoffEscalationNotification(
        hrAdminIds,
        escalatedExceptions.length,
        escalatedCorrections.length,
        pendingLeaves.length,
        payrollCutoffDate,
        daysUntilCutoff,
        'system',
      );

      this.logger.log(
        `[PAYROLL CUTOFF] Notification result: ${JSON.stringify(result)}`,
      );

      return result.notificationsSent;
    } catch (error: any) {
      this.logger.error(
        `[PAYROLL CUTOFF] Failed to send notifications: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get pending leave requests (read-only from Leaves subsystem)
   */
  private async getPendingLeaveRequests(): Promise<any[]> {
    return this.leaveRequestModel
      .find({ status: 'pending' })
      .select('_id employeeId leaveTypeId dates durationDays')
      .exec();
  }

  /**
   * TEST ONLY: Reset all escalated items back to pending status
   * For testing purposes only
   */
  async resetEscalatedToPending(): Promise<{
    success: boolean;
    message: string;
    resetExceptions: number;
    resetCorrections: number;
  }> {
    this.logger.log('[TEST] Resetting escalated items to pending...');

    // Reset time exceptions from ESCALATED to PENDING
    const exceptionResult = await this.timeExceptionModel.updateMany(
      {
        status: TimeExceptionStatus.ESCALATED,
        reason: { $regex: /PAYROLL CUTOFF/i },
      },
      {
        $set: { status: TimeExceptionStatus.PENDING },
      },
    );

    // Reset correction requests from ESCALATED to IN_REVIEW
    const correctionResult = await this.correctionRequestModel.updateMany(
      {
        status: CorrectionRequestStatus.ESCALATED,
        reason: { $regex: /PAYROLL CUTOFF/i },
      },
      {
        $set: { status: CorrectionRequestStatus.IN_REVIEW },
      },
    );

    const resetExceptions = exceptionResult.modifiedCount || 0;
    const resetCorrections = correctionResult.modifiedCount || 0;

    this.logger.log(
      `[TEST] Reset completed. Exceptions: ${resetExceptions}, Corrections: ${resetCorrections}`,
    );

    return {
      success: true,
      message: `Reset ${resetExceptions} exceptions and ${resetCorrections} corrections to pending status`,
      resetExceptions,
      resetCorrections,
    };
  }
}

