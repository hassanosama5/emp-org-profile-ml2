import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Import schemas
import { NotificationLog } from '../models/notification-log.schema';
import { AttendanceRecord } from '../models/attendance-record.schema';
import { TimeException } from '../models/time-exception.schema';
// Import enums
import { TimeExceptionType, TimeExceptionStatus } from '../models/enums';
// Import DTOs
import {
  SendNotificationDto,
  GetNotificationLogsByEmployeeDto,
  SyncAttendanceWithPayrollDto,
  SyncLeaveWithPayrollDto,
  SynchronizeAttendanceAndPayrollDto,
} from '../dtos/notification-and-sync.dtos';
import { LeavesService } from '../../leaves/leaves.service';
import { PayrollExecutionService } from '../../payroll-execution/payroll-execution.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TimeManagementService } from './time-management.service';
import { Inject, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class NotificationService {
  private readonly auditLogs: Array<{
    entity: string;
    changeSet: Record<string, unknown>;
    actorId?: string;
    timestamp: Date;
  }> = [];

  constructor(
    @InjectModel(NotificationLog.name)
    private notificationLogModel: Model<NotificationLog>,
    @InjectModel(AttendanceRecord.name)
    private attendanceRecordModel: Model<AttendanceRecord>,
    @InjectModel(TimeException.name)
    private timeExceptionModel: Model<TimeException>,
    @Inject(forwardRef(() => LeavesService))
    private leavesService: LeavesService,
    @Inject(forwardRef(() => PayrollExecutionService))
    private payrollExecutionService: PayrollExecutionService,
    @Inject(forwardRef(() => TimeManagementService))
    private timeManagementService: TimeManagementService,
    private unifiedNotificationsService: NotificationsService,
  ) {}

  // ===== NOTIFICATIONS =====

  async sendNotification(
    sendNotificationDto: SendNotificationDto,
    currentUserId: string,
  ) {
    // Using basic NotificationLog schema (TA's version)
    // For rich notifications with isRead, data, title, etc., use NotificationsService from notifications module
    const notification = new this.notificationLogModel({
      to: sendNotificationDto.to,
      type: sendNotificationDto.type,
      message: sendNotificationDto.message ?? '',
    });
    await notification.save();
    await this.logTimeManagementChange(
      'NOTIFICATION_SENT',
      {
        to: sendNotificationDto.to,
        type: sendNotificationDto.type,
      },
      currentUserId,
    );
    return notification;
  }

  async getNotificationLogsByEmployee(
    getNotificationLogsByEmployeeDto: GetNotificationLogsByEmployeeDto,
    currentUserId: string,
  ) {
    return this.notificationLogModel
      .find({ to: getNotificationLogsByEmployeeDto.employeeId })
      .exec();
  }

  // ===== PAYROLL SYNCHRONIZATION =====
  // These methods return actual data for Payroll/Leaves subsystems to consume

  async syncAttendanceWithPayroll(
    syncAttendanceWithPayrollDto: SyncAttendanceWithPayrollDto,
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = syncAttendanceWithPayrollDto;
    const query: any = { employeeId };

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const attendance = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'name email employeeId')
      .exec();

    await this.logTimeManagementChange(
      'PAYROLL_SYNC_ATTENDANCE',
      {
        employeeId,
        records: attendance.length,
        startDate,
        endDate,
      },
      currentUserId,
    );

    // Return actual data formatted for Payroll consumption
    return {
      employeeId,
      startDate,
      endDate,
      records: attendance.map((record: any) => ({
        attendanceRecordId: record._id,
        employeeId: record.employeeId?._id || record.employeeId,
        date: record.createdAt || record.date,
        punches: record.punches,
        totalWorkMinutes: record.totalWorkMinutes,
        totalWorkHours: Math.round((record.totalWorkMinutes / 60) * 100) / 100,
        hasMissedPunch: record.hasMissedPunch,
        finalisedForPayroll: record.finalisedForPayroll,
      })),
      summary: {
        totalRecords: attendance.length,
        totalWorkMinutes: attendance.reduce(
          (sum, r) => sum + (r.totalWorkMinutes || 0),
          0,
        ),
        totalWorkHours:
          Math.round(
            (attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) /
              60) *
              100,
          ) / 100,
      },
    };
  }

  async syncLeaveWithPayroll(
    syncLeaveWithPayrollDto: SyncLeaveWithPayrollDto,
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = syncLeaveWithPayrollDto;

    // This is a placeholder - actual leave data should come from Leaves subsystem
    // Time Management only provides attendance data that might be related to leaves
    await this.logTimeManagementChange(
      'PAYROLL_SYNC_LEAVE',
      {
        employeeId,
        startDate,
        endDate,
      },
      currentUserId,
    );

    return {
      employeeId,
      startDate,
      endDate,
      message:
        'Leave data should be retrieved from Leaves subsystem. This endpoint provides attendance context only.',
      attendanceContext: {
        // Return attendance records that might overlap with leave periods
        note: 'Use attendance records to validate leave periods',
      },
    };
  }

  async synchronizeAttendanceAndPayroll(
    synchronizeAttendanceAndPayrollDto: SynchronizeAttendanceAndPayrollDto,
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } =
      synchronizeAttendanceAndPayrollDto;
    const query: any = { employeeId };

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const attendance = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'name email employeeId')
      .exec();

    await this.logTimeManagementChange(
      'PAYROLL_SYNC_FULL',
      {
        employeeId,
        attendanceCount: attendance.length,
        startDate,
        endDate,
      },
      currentUserId,
    );

    // Return combined data for Payroll consumption
    return {
      employeeId,
      startDate,
      endDate,
      attendance: {
        records: attendance.map((record: any) => ({
          attendanceRecordId: record._id,
          employeeId: record.employeeId?._id || record.employeeId,
          date: record.createdAt || record.date,
          punches: record.punches,
          totalWorkMinutes: record.totalWorkMinutes,
          totalWorkHours:
            Math.round((record.totalWorkMinutes / 60) * 100) / 100,
          hasMissedPunch: record.hasMissedPunch,
          finalisedForPayroll: record.finalisedForPayroll,
        })),
        summary: {
          totalRecords: attendance.length,
          totalWorkMinutes: attendance.reduce(
            (sum, r) => sum + (r.totalWorkMinutes || 0),
            0,
          ),
          totalWorkHours:
            Math.round(
              (attendance.reduce(
                (sum, r) => sum + (r.totalWorkMinutes || 0),
                0,
              ) /
                60) *
                100,
            ) / 100,
        },
      },
      leave: {
        message: 'Leave data should be retrieved from Leaves subsystem',
        note: 'Use Leaves API to get leave records for this employee',
      },
    };
  }

  // GET endpoints for Payroll/Leaves to consume data
  async getAttendanceDataForSync(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
    currentUserId?: string,
  ) {
    const query: any = { employeeId };

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const attendance = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'name email employeeId')
      .exec();

    return {
      employeeId,
      startDate,
      endDate,
      records: attendance.map((record: any) => ({
        attendanceRecordId: record._id,
        employeeId: record.employeeId?._id || record.employeeId,
        date: record.createdAt || record.date,
        punches: record.punches,
        totalWorkMinutes: record.totalWorkMinutes,
        totalWorkHours: Math.round((record.totalWorkMinutes / 60) * 100) / 100,
        hasMissedPunch: record.hasMissedPunch,
        finalisedForPayroll: record.finalisedForPayroll,
      })),
      summary: {
        totalRecords: attendance.length,
        totalWorkMinutes: attendance.reduce(
          (sum, r) => sum + (r.totalWorkMinutes || 0),
          0,
        ),
        totalWorkHours:
          Math.round(
            (attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) /
              60) *
              100,
          ) / 100,
      },
    };
  }

  async getOvertimeDataForSync(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
    currentUserId?: string,
  ) {
    const query: any = {
      employeeId,
      type: TimeExceptionType.OVERTIME_REQUEST,
    };

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const overtimeExceptions = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'name email employeeId')
      .populate('attendanceRecordId')
      .exec();

    // Calculate overtime hours from attendance records using shift-based calculation
    const overtimeData = await Promise.all(
      overtimeExceptions.map(async (exception: any) => {
        const record = exception.attendanceRecordId as any;
        let overtimeMinutes = 0;

        if (record) {
          try {
            // Use shift-based overtime calculation
            const overtimeCalc = await this.timeManagementService.calculateOvertimeBasedOnShift(
              exception.employeeId?._id || exception.employeeId,
              record,
              480, // Fallback standard
            );
            overtimeMinutes = overtimeCalc.overtimeMinutes;
          } catch (error) {
            // Fallback to simple calculation if shift-based fails
            console.warn('Shift-based overtime calculation failed, using fallback:', error);
            const standardMinutes = 480;
            overtimeMinutes = record.totalWorkMinutes
              ? Math.max(0, record.totalWorkMinutes - standardMinutes)
              : 0;
          }
        }

        return {
          exceptionId: exception._id,
          employeeId: exception.employeeId?._id || exception.employeeId,
          attendanceRecordId:
            exception.attendanceRecordId?._id || exception.attendanceRecordId,
          date: exception.createdAt || record?.createdAt,
          overtimeMinutes,
          overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
          status: exception.status,
          reason: exception.reason,
        };
      })
    );

    return {
      employeeId,
      startDate,
      endDate,
      records: overtimeData,
      summary: {
        totalRecords: overtimeData.length,
        totalOvertimeMinutes: overtimeData.reduce(
          (sum, r) => sum + r.overtimeMinutes,
          0,
        ),
        totalOvertimeHours:
          Math.round(
            (overtimeData.reduce((sum, r) => sum + r.overtimeMinutes, 0) / 60) *
              100,
          ) / 100,
      },
    };
  }

  // ===== US9: ATTENDANCE-TO-PAYROLL SYNC =====
  // BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules

  /**
   * Run daily batch sync for all employees
   * BR-TM-22: Sync all time management data daily
   */
  async runDailyPayrollSync(
    syncDate: Date,
    currentUserId: string,
  ) {
    const startOfDay = this.convertDateToUTCStart(syncDate);
    const endOfDay = this.convertDateToUTCEnd(syncDate);
    
    // Get all attendance records for the day that are not yet finalized
    const unfinalizedRecords = await this.attendanceRecordModel
      .find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        finalisedForPayroll: { $ne: true },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .exec();
    
    // Get all approved overtime exceptions for the day
    const overtimeExceptions = await this.timeExceptionModel
      .find({
        type: TimeExceptionType.OVERTIME_REQUEST,
        status: 'APPROVED',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
      .populate('employeeId', 'firstName lastName email')
      .populate('attendanceRecordId')
      .exec();
    
    // Get all other exceptions (lateness, early leave, etc.)
    const otherExceptions = await this.timeExceptionModel
      .find({
        type: { $ne: TimeExceptionType.OVERTIME_REQUEST },
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
      .populate('employeeId', 'firstName lastName email')
      .exec();
    
    await this.logTimeManagementChange(
      'DAILY_PAYROLL_SYNC_RUN',
      {
        syncDate,
        attendanceRecords: unfinalizedRecords.length,
        overtimeExceptions: overtimeExceptions.length,
        otherExceptions: otherExceptions.length,
      },
      currentUserId,
    );
    
    return {
      syncDate,
      syncedAt: new Date(),
      attendance: {
        count: unfinalizedRecords.length,
        records: unfinalizedRecords.map((r: any) => ({
          recordId: r._id,
          employeeId: r.employeeId?._id || r.employeeId,
          employeeName: r.employeeId ? `${r.employeeId.firstName || ''} ${r.employeeId.lastName || ''}`.trim() : 'Unknown',
          date: r.createdAt,
          totalWorkMinutes: r.totalWorkMinutes,
          totalWorkHours: Math.round((r.totalWorkMinutes / 60) * 100) / 100,
          hasMissedPunch: r.hasMissedPunch,
          finalisedForPayroll: r.finalisedForPayroll,
        })),
      },
      overtime: {
        count: overtimeExceptions.length,
        records: overtimeExceptions.map((e: any) => ({
          exceptionId: e._id,
          employeeId: e.employeeId?._id || e.employeeId,
          status: e.status,
          attendanceRecordId: e.attendanceRecordId?._id || e.attendanceRecordId,
        })),
      },
      exceptions: {
        count: otherExceptions.length,
        byType: this.groupExceptionsByType(otherExceptions),
      },
      summary: {
        totalAttendanceMinutes: unfinalizedRecords.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
        totalAttendanceHours: Math.round((unfinalizedRecords.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) / 60) * 100) / 100,
        employeesWithMissedPunches: unfinalizedRecords.filter((r: any) => r.hasMissedPunch).length,
      },
    };
  }

  /**
   * Helper to group exceptions by type
   */
  private groupExceptionsByType(exceptions: any[]) {
    const grouped: Record<string, any[]> = {};
    exceptions.forEach((e: any) => {
      const type = e.type || 'UNKNOWN';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({
        exceptionId: e._id,
        employeeId: e.employeeId?._id || e.employeeId,
        status: e.status,
      });
    });
    return grouped;
  }

  /**
   * Get all pending attendance data ready for payroll sync
   * BR-TM-22: Batch retrieval for payroll processing
   */
  async getPendingPayrollSyncData(
    filters: { startDate?: Date; endDate?: Date; departmentId?: string },
    currentUserId: string,
  ) {
    const query: any = {
      finalisedForPayroll: { $ne: true },
    };
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }
    
    const pendingRecords = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .sort({ createdAt: -1 })
      .exec();
    
    // Filter by department if specified
    let filteredRecords = pendingRecords;
    if (filters.departmentId) {
      filteredRecords = pendingRecords.filter((r: any) => 
        r.employeeId?.departmentId?.toString() === filters.departmentId
      );
    }
    
    return {
      filters,
      count: filteredRecords.length,
      records: filteredRecords.map((r: any) => ({
        recordId: r._id,
        employeeId: r.employeeId?._id || r.employeeId,
        employeeName: r.employeeId ? `${r.employeeId.firstName || ''} ${r.employeeId.lastName || ''}`.trim() : 'Unknown',
        date: r.createdAt,
        totalWorkMinutes: r.totalWorkMinutes,
        totalWorkHours: Math.round((r.totalWorkMinutes / 60) * 100) / 100,
        hasMissedPunch: r.hasMissedPunch,
        punchCount: r.punches?.length || 0,
      })),
      summary: {
        totalMinutes: filteredRecords.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
        totalHours: Math.round((filteredRecords.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) / 60) * 100) / 100,
        recordsWithMissedPunches: filteredRecords.filter((r: any) => r.hasMissedPunch).length,
      },
    };
  }

  /**
   * Mark attendance records as finalized for payroll
   * BR-TM-22: Track which records have been synced
   */
  async finalizeRecordsForPayroll(
    recordIds: string[],
    currentUserId: string,
  ) {
    const updateResult = await this.attendanceRecordModel.updateMany(
      { _id: { $in: recordIds } },
      {
        finalisedForPayroll: true,
        updatedBy: currentUserId,
      },
    );
    
    await this.logTimeManagementChange(
      'RECORDS_FINALIZED_FOR_PAYROLL',
      {
        recordIds,
        modifiedCount: updateResult.modifiedCount,
      },
      currentUserId,
    );
    
    return {
      success: true,
      recordsFinalized: updateResult.modifiedCount,
      recordIds,
      finalizedAt: new Date(),
    };
  }

  /**
   * Validate data before payroll sync
   * BR-TM-22: Ensure data consistency
   */
  async validateDataForPayrollSync(
    filters: { startDate: Date; endDate: Date },
    currentUserId: string,
  ) {
    const startDateUTC = this.convertDateToUTCStart(filters.startDate);
    const endDateUTC = this.convertDateToUTCEnd(filters.endDate);
    
    // Get all records in the date range
    const allRecords = await this.attendanceRecordModel
      .find({
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .populate('employeeId', 'firstName lastName email')
      .exec();
    
    // Find records with issues
    const recordsWithMissedPunches = allRecords.filter((r: any) => r.hasMissedPunch);
    const recordsWithZeroMinutes = allRecords.filter((r: any) => !r.totalWorkMinutes || r.totalWorkMinutes === 0);
    const recordsWithOddPunches = allRecords.filter((r: any) => r.punches && r.punches.length % 2 !== 0);
    
    // Get pending exceptions in the date range
    const pendingExceptions = await this.timeExceptionModel
      .find({
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
        status: { $in: ['OPEN', 'PENDING'] },
      })
      .populate('employeeId', 'firstName lastName email')
      .exec();
    
    // Get pending correction requests
    const pendingCorrections = await this.attendanceRecordModel.db
      .collection('attendancecorrectionrequests')
      .find({
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
        status: { $in: ['SUBMITTED', 'IN_REVIEW'] },
      })
      .toArray();
    
    const validationIssues: any[] = [];
    
    if (recordsWithMissedPunches.length > 0) {
      validationIssues.push({
        type: 'MISSED_PUNCHES',
        severity: 'WARNING',
        count: recordsWithMissedPunches.length,
        message: `${recordsWithMissedPunches.length} record(s) have missed punches`,
        recordIds: recordsWithMissedPunches.map((r: any) => r._id),
      });
    }
    
    if (recordsWithZeroMinutes.length > 0) {
      validationIssues.push({
        type: 'ZERO_WORK_MINUTES',
        severity: 'WARNING',
        count: recordsWithZeroMinutes.length,
        message: `${recordsWithZeroMinutes.length} record(s) have zero work minutes`,
        recordIds: recordsWithZeroMinutes.map((r: any) => r._id),
      });
    }
    
    if (pendingExceptions.length > 0) {
      validationIssues.push({
        type: 'PENDING_EXCEPTIONS',
        severity: 'ERROR',
        count: pendingExceptions.length,
        message: `${pendingExceptions.length} unresolved exception(s) need attention before sync`,
        exceptionIds: pendingExceptions.map((e: any) => e._id),
      });
    }
    
    if (pendingCorrections.length > 0) {
      validationIssues.push({
        type: 'PENDING_CORRECTIONS',
        severity: 'ERROR',
        count: pendingCorrections.length,
        message: `${pendingCorrections.length} pending correction request(s) need resolution`,
        correctionIds: pendingCorrections.map((c: any) => c._id),
      });
    }
    
    const isValid = validationIssues.filter(i => i.severity === 'ERROR').length === 0;
    
    await this.logTimeManagementChange(
      'PAYROLL_SYNC_VALIDATION',
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        isValid,
        issuesCount: validationIssues.length,
      },
      currentUserId,
    );
    
    return {
      startDate: filters.startDate,
      endDate: filters.endDate,
      isValid,
      validatedAt: new Date(),
      totalRecords: allRecords.length,
      issues: validationIssues,
      summary: {
        errorCount: validationIssues.filter(i => i.severity === 'ERROR').length,
        warningCount: validationIssues.filter(i => i.severity === 'WARNING').length,
        canProceedWithSync: isValid,
      },
    };
  }

  /**
   * Get exception data for payroll sync
   * BR-TM-22: Include exception/penalty data in sync
   */
  async getExceptionDataForPayrollSync(
    filters: { startDate?: Date; endDate?: Date; employeeId?: string },
    currentUserId: string,
  ) {
    const query: any = {};
    
    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }
    
    const exceptions = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .sort({ createdAt: -1 })
      .exec();
    
    // Group by type
    const byType: Record<string, any[]> = {};
    exceptions.forEach((e: any) => {
      const type = e.type || 'UNKNOWN';
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        exceptionId: e._id,
        employeeId: e.employeeId?._id || e.employeeId,
        employeeName: e.employeeId ? `${e.employeeId.firstName || ''} ${e.employeeId.lastName || ''}`.trim() : 'Unknown',
        type: e.type,
        status: e.status,
        reason: e.reason,
        date: e.createdAt,
        attendanceRecordId: e.attendanceRecordId?._id || e.attendanceRecordId,
      });
    });
    
    // Group by status
    const byStatus: Record<string, number> = {
      OPEN: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      ESCALATED: 0,
      RESOLVED: 0,
    };
    exceptions.forEach((e: any) => {
      const status = e.status || 'OPEN';
      if (byStatus.hasOwnProperty(status)) {
        byStatus[status]++;
      }
    });
    
    return {
      filters,
      totalCount: exceptions.length,
      byType: Object.entries(byType).map(([type, records]) => ({
        type,
        count: records.length,
        records,
      })),
      byStatus,
      payrollRelevant: {
        approvedOvertime: (byType['OVERTIME_REQUEST'] || []).filter((e: any) => e.status === 'APPROVED'),
        latenessRecords: byType['LATE'] || [],
        earlyLeaveRecords: byType['EARLY_LEAVE'] || [],
      },
    };
  }

  /**
   * Get sync status/history
   * BR-TM-22: Track sync operations
   */
  async getPayrollSyncHistory(
    filters: { startDate?: Date; endDate?: Date; limit?: number },
    currentUserId: string,
  ) {
    // Get from audit logs (stored in memory for this implementation)
    const syncLogs = this.auditLogs.filter(log => 
      log.entity.includes('PAYROLL_SYNC') || 
      log.entity.includes('RECORDS_FINALIZED') ||
      log.entity.includes('DAILY_PAYROLL_SYNC')
    );
    
    // Filter by date if provided
    let filteredLogs = syncLogs;
    if (filters.startDate && filters.endDate) {
      const start = this.convertDateToUTCStart(filters.startDate);
      const end = this.convertDateToUTCEnd(filters.endDate);
      filteredLogs = syncLogs.filter(log => 
        log.timestamp >= start && log.timestamp <= end
      );
    }
    
    // Sort by most recent and limit
    const sortedLogs = filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, filters.limit || 50);
    
    return {
      count: sortedLogs.length,
      syncHistory: sortedLogs.map(log => ({
        operation: log.entity,
        details: log.changeSet,
        performedBy: log.actorId,
        timestamp: log.timestamp,
      })),
    };
  }

  /**
   * Get comprehensive payroll data package
   * BR-TM-22: Single endpoint for all payroll-relevant data
   */
  async getComprehensivePayrollData(
    filters: { startDate: Date; endDate: Date; departmentId?: string },
    currentUserId: string,
  ) {
    const startDateUTC = this.convertDateToUTCStart(filters.startDate);
    const endDateUTC = this.convertDateToUTCEnd(filters.endDate);
    
    // Get attendance data
    const attendanceQuery: any = {
      createdAt: { $gte: startDateUTC, $lte: endDateUTC },
    };
    
    const attendanceRecords = await this.attendanceRecordModel
      .find(attendanceQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .exec();
    
    // Filter by department if specified
    let filteredAttendance = attendanceRecords;
    if (filters.departmentId) {
      filteredAttendance = attendanceRecords.filter((r: any) => 
        r.employeeId?.departmentId?.toString() === filters.departmentId
      );
    }
    
    // Get overtime data
    const overtimeExceptions = await this.timeExceptionModel
      .find({
        type: TimeExceptionType.OVERTIME_REQUEST,
        status: 'APPROVED',
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .populate('employeeId', 'firstName lastName departmentId')
      .populate('attendanceRecordId')
      .exec();
    
    // Get lateness data
    const latenessExceptions = await this.timeExceptionModel
      .find({
        type: 'LATE',
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .populate('employeeId', 'firstName lastName departmentId')
      .exec();
    
    // Calculate summaries per employee
    const employeeSummaries: Record<string, any> = {};
    
    filteredAttendance.forEach((r: any) => {
      const empId = r.employeeId?._id?.toString() || r.employeeId?.toString() || 'unknown';
      if (!employeeSummaries[empId]) {
        employeeSummaries[empId] = {
          employeeId: empId,
          employeeName: r.employeeId ? `${r.employeeId.firstName || ''} ${r.employeeId.lastName || ''}`.trim() : 'Unknown',
          totalWorkMinutes: 0,
          totalWorkHours: 0,
          daysWorked: 0,
          missedPunches: 0,
          overtimeMinutes: 0,
          latenessCount: 0,
        };
      }
      employeeSummaries[empId].totalWorkMinutes += r.totalWorkMinutes || 0;
      employeeSummaries[empId].daysWorked++;
      if (r.hasMissedPunch) employeeSummaries[empId].missedPunches++;
    });
    
    // Add overtime data
    overtimeExceptions.forEach((e: any) => {
      const empId = e.employeeId?._id?.toString() || e.employeeId?.toString();
      if (empId && employeeSummaries[empId]) {
        const record = e.attendanceRecordId as any;
        const overtimeMinutes = record?.totalWorkMinutes ? Math.max(0, record.totalWorkMinutes - 480) : 0;
        employeeSummaries[empId].overtimeMinutes += overtimeMinutes;
      }
    });
    
    // Add lateness data
    latenessExceptions.forEach((e: any) => {
      const empId = e.employeeId?._id?.toString() || e.employeeId?.toString();
      if (empId && employeeSummaries[empId]) {
        employeeSummaries[empId].latenessCount++;
      }
    });
    
    // Convert minutes to hours
    Object.values(employeeSummaries).forEach((summary: any) => {
      summary.totalWorkHours = Math.round((summary.totalWorkMinutes / 60) * 100) / 100;
      summary.overtimeHours = Math.round((summary.overtimeMinutes / 60) * 100) / 100;
    });
    
    await this.logTimeManagementChange(
      'COMPREHENSIVE_PAYROLL_DATA_RETRIEVED',
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        departmentId: filters.departmentId,
        employeeCount: Object.keys(employeeSummaries).length,
        attendanceRecords: filteredAttendance.length,
      },
      currentUserId,
    );
    
    return {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      departmentId: filters.departmentId || 'ALL',
      generatedAt: new Date(),
      employeeSummaries: Object.values(employeeSummaries),
      totals: {
        totalEmployees: Object.keys(employeeSummaries).length,
        totalWorkMinutes: Object.values(employeeSummaries).reduce((sum: number, e: any) => sum + e.totalWorkMinutes, 0),
        totalWorkHours: Math.round((Object.values(employeeSummaries).reduce((sum: number, e: any) => sum + e.totalWorkMinutes, 0) / 60) * 100) / 100,
        totalOvertimeMinutes: Object.values(employeeSummaries).reduce((sum: number, e: any) => sum + e.overtimeMinutes, 0),
        totalOvertimeHours: Math.round((Object.values(employeeSummaries).reduce((sum: number, e: any) => sum + e.overtimeMinutes, 0) / 60) * 100) / 100,
        totalLatenessCount: Object.values(employeeSummaries).reduce((sum: number, e: any) => sum + e.latenessCount, 0),
        totalMissedPunches: Object.values(employeeSummaries).reduce((sum: number, e: any) => sum + e.missedPunches, 0),
      },
    };
  }

  // ===== US4: SHIFT EXPIRY NOTIFICATIONS =====
  // BR-TM-05: Shift schedules must be assignable by Department, Position, or Individual
  // This section handles notifications when shift assignments are nearing expiry

  /**
   * Send shift expiry notification to HR Admin
   * Triggered when a shift assignment is nearing its end date
   * Now uses unified notification service
   */
  async sendShiftExpiryNotification(
    recipientId: string,
    shiftAssignmentId: string,
    employeeId: string,
    endDate: Date,
    daysRemaining: number,
    currentUserId: string,
  ) {
    const notification = await this.unifiedNotificationsService.sendShiftExpiryNotification(
      recipientId,
      shiftAssignmentId,
      employeeId,
      endDate,
      daysRemaining,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'SHIFT_EXPIRY_NOTIFICATION_SENT',
      {
        recipientId,
        shiftAssignmentId,
        employeeId,
        endDate,
        daysRemaining,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Send bulk shift expiry notifications to HR Admins
   * Used when running batch expiry checks
   * Now uses unified notification service
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
    const result = await this.unifiedNotificationsService.sendBulkShiftExpiryNotifications(
      hrAdminIds,
      expiringAssignments,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'SHIFT_EXPIRY_BULK_NOTIFICATIONS_SENT',
      {
        hrAdminCount: hrAdminIds.length,
        expiringCount: expiringAssignments.length,
        assignmentIds: expiringAssignments.map(a => a.assignmentId),
      },
      currentUserId,
    );
    
    return result;
  }

  /**
   * Get shift expiry notifications for an HR Admin
   * Now uses unified notification service
   */
  async getShiftExpiryNotifications(hrAdminId: string, currentUserId: string) {
    return this.unifiedNotificationsService.getShiftExpiryNotifications(hrAdminId);
  }

  /**
   * Send renewal confirmation notification
   * Sent when a shift assignment is successfully renewed
   * Now uses unified notification service
   */
  async sendShiftRenewalConfirmation(
    recipientId: string,
    shiftAssignmentId: string,
    newEndDate: Date,
    currentUserId: string,
  ) {
    const notification = await this.unifiedNotificationsService.sendShiftRenewalConfirmation(
      recipientId,
      shiftAssignmentId,
      newEndDate,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'SHIFT_RENEWAL_NOTIFICATION_SENT',
      {
        recipientId,
        shiftAssignmentId,
        newEndDate,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Send reassignment confirmation notification
   * Sent when a shift assignment is reassigned to a different employee
   * Now uses unified notification service
   */
  async sendShiftReassignmentConfirmation(
    newEmployeeId: string,
    shiftAssignmentId: string,
    shiftName: string,
    endDate: Date,
    currentUserId: string,
  ) {
    const notification = await this.unifiedNotificationsService.sendShiftReassignmentConfirmation(
      newEmployeeId,
      shiftAssignmentId,
      shiftName,
      endDate,
    );
    
    await this.logTimeManagementChange(
      'SHIFT_REASSIGNMENT_NOTIFICATION_SENT',
      {
        newEmployeeId,
        shiftAssignmentId,
        shiftName,
        endDate,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Send archive notification
   * Sent when a shift assignment is archived/expired
   * Now uses unified notification service
   */
  async sendShiftArchiveNotification(
    recipientId: string,
    shiftAssignmentId: string,
    employeeId: string,
    currentUserId: string,
  ) {
    const notification = await this.unifiedNotificationsService.sendShiftArchiveNotification(
      recipientId,
      shiftAssignmentId,
      employeeId,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'SHIFT_ARCHIVE_NOTIFICATION_SENT',
      {
        recipientId,
        shiftAssignmentId,
        employeeId,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Get all shift-related notifications (expiry, renewal, archive)
   * Now uses unified notification service
   */
  async getAllShiftNotifications(hrAdminId: string, currentUserId: string) {
    return this.unifiedNotificationsService.getAllShiftNotifications(hrAdminId);
  }

  /**
   * Send repeated lateness flag notification to HR admins
   * BR-TM-09: Notify HR when employee is flagged for repeated lateness
   */
  async sendRepeatedLatenessFlagNotification(
    employeeId: string,
    occurrenceCount: number,
    status: string,
    currentUserId: string,
  ) {
    const notification = await this.unifiedNotificationsService.sendRepeatedLatenessFlagNotification(
      employeeId,
      occurrenceCount,
      status,
    );
    
    await this.logTimeManagementChange(
      'REPEATED_LATENESS_FLAG_NOTIFICATION_SENT',
      {
        employeeId,
        occurrenceCount,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Send payroll cut-off escalation notification to HR admins
   * US18: Notify HR when requests are auto-escalated due to approaching payroll cut-off
   */
  async sendPayrollCutoffEscalationNotification(
    hrAdminIds: string[],
    escalatedExceptions: number,
    escalatedCorrections: number,
    pendingLeaves: number,
    payrollCutoffDate: Date,
    daysUntilCutoff: number,
    currentUserId: string,
  ) {
    const result = await this.unifiedNotificationsService.sendPayrollCutoffEscalationNotification(
      hrAdminIds,
      escalatedExceptions,
      escalatedCorrections,
      pendingLeaves,
      payrollCutoffDate,
      daysUntilCutoff,
    );
    
    await this.logTimeManagementChange(
      'PAYROLL_CUTOFF_ESCALATION_NOTIFICATION_SENT',
      {
        hrAdminIds,
        escalatedExceptions,
        escalatedCorrections,
        pendingLeaves,
        payrollCutoffDate,
        daysUntilCutoff,
      },
      currentUserId,
    );
    
    return result;
  }

  // ===== US8: MISSED PUNCH MANAGEMENT & ALERTS =====
  // BR-TM-14: Missed punches/late sign-ins must be handled via auto-flagging, notifications, or payroll blocking

  /**
   * Send missed punch alert to employee
   * BR-TM-14: Notify employee when a missed punch is detected
   * Now uses unified notification service
   */
  async sendMissedPunchAlertToEmployee(
    employeeId: string,
    attendanceRecordId: string,
    missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT',
    date: Date,
    currentUserId: string,
  ) {
    const notification = await this.unifiedNotificationsService.sendMissedPunchAlertToEmployee(
      employeeId,
      attendanceRecordId,
      missedPunchType,
      date,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'MISSED_PUNCH_EMPLOYEE_ALERT_SENT',
      {
        employeeId,
        attendanceRecordId,
        missedPunchType,
        date,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Send missed punch alert to manager/line manager
   * BR-TM-14: Notify manager for correction review
   * Now uses unified notification service
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
    const notification = await this.unifiedNotificationsService.sendMissedPunchAlertToManager(
      managerId,
      employeeId,
      employeeName,
      attendanceRecordId,
      missedPunchType,
      date,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'MISSED_PUNCH_MANAGER_ALERT_SENT',
      {
        managerId,
        employeeId,
        employeeName,
        attendanceRecordId,
        missedPunchType,
        date,
      },
      currentUserId,
    );
    
    return notification;
  }

  /**
   * Send missed punch alert to Payroll Officers (Payroll Specialist/Manager)
   * Uses unified notification service
   */
  async sendMissedPunchAlertToPayrollTeam(
    employeeId: string,
    employeeName: string,
    attendanceRecordId: string,
    missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT',
    date: Date,
    currentUserId: string,
  ) {
    const notification =
      await this.unifiedNotificationsService.sendMissedPunchAlertToPayrollTeam(
        employeeId,
        employeeName,
        attendanceRecordId,
        missedPunchType,
        date,
        currentUserId,
      );

    await this.logTimeManagementChange(
      'MISSED_PUNCH_PAYROLL_ALERT_SENT',
      {
        employeeId,
        employeeName,
        attendanceRecordId,
        missedPunchType,
        date,
        notificationsCreated: (notification as any)?.notificationsCreated,
      },
      currentUserId,
    );

    return notification;
  }

  /**
   * Send bulk missed punch alerts
   * BR-TM-14: Efficiently notify multiple employees/managers
   * Now uses unified notification service
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
    const result = await this.unifiedNotificationsService.sendBulkMissedPunchAlerts(
      alerts,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'BULK_MISSED_PUNCH_ALERTS_SENT',
      {
        alertCount: alerts.length,
        notificationsSent: result.notificationsSent,
      },
      currentUserId,
    );
    
    return result;
  }

  /**
   * Get missed punch notifications for an employee
   * BR-TM-14: Employee can view their missed punch alerts
   * Now uses unified notification service
   */
  async getMissedPunchNotificationsByEmployee(employeeId: string, currentUserId: string) {
    return this.unifiedNotificationsService.getMissedPunchNotificationsByEmployee(employeeId);
  }

  /**
   * Get missed punch notifications for a manager
   * BR-TM-14: Manager can view pending missed punch corrections
   * Now uses unified notification service
   */
  async getMissedPunchNotificationsByManager(managerId: string, currentUserId: string) {
    return this.unifiedNotificationsService.getMissedPunchNotificationsByManager(managerId);
  }

  /**
   * Get all missed punch notifications (for HR Admin)
   * BR-TM-14: HR Admin oversight of missed punch tracking
   * Now uses unified notification service
   */
  async getAllMissedPunchNotifications(
    filters: { startDate?: Date; endDate?: Date },
    currentUserId: string,
  ) {
    return this.unifiedNotificationsService.getAllMissedPunchNotifications(filters);
  }

  /**
   * Flag missed punch and create time exception with notifications
   * BR-TM-14: Core method combining flagging and notification
   */
  async flagMissedPunchWithNotification(
    attendanceRecordId: string,
    employeeId: string,
    managerId: string,
    employeeName: string,
    missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT',
    currentUserId: string,
  ) {
    // Prevent duplicate exceptions/notifications for the same record
    const existing = await this.timeExceptionModel
      .findOne({
        attendanceRecordId,
        type: TimeExceptionType.MISSED_PUNCH,
      })
      .exec();
    if (existing) {
      return {
        attendanceRecord: await this.attendanceRecordModel.findById(attendanceRecordId),
        timeException: existing,
        notifications: {
          skipped: true,
          reason: 'Missed punch already flagged for this attendance record',
        },
      };
    }

    // Update attendance record
    const attendanceRecord = await this.attendanceRecordModel.findByIdAndUpdate(
      attendanceRecordId,
      {
        hasMissedPunch: true,
        updatedBy: currentUserId,
      },
      { new: true },
    );
    
    if (!attendanceRecord) {
      throw new Error('Attendance record not found');
    }
    
    // Create time exception
    const timeException = new this.timeExceptionModel({
      employeeId,
      type: TimeExceptionType.MISSED_PUNCH,
      attendanceRecordId,
      assignedTo: managerId,
      status: 'OPEN',
      reason: `Auto-detected missed ${missedPunchType === 'CLOCK_IN' ? 'clock-in' : 'clock-out'}`,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    
    await timeException.save();
    
    // Send notifications
    const recordDate = (attendanceRecord as any).createdAt || new Date();
    const employeeNotification = await this.sendMissedPunchAlertToEmployee(
      employeeId,
      attendanceRecordId,
      missedPunchType,
      recordDate,
      currentUserId,
    );
    
    const managerNotification = await this.sendMissedPunchAlertToManager(
      managerId,
      employeeId,
      employeeName,
      attendanceRecordId,
      missedPunchType,
      recordDate,
      currentUserId,
    );

    const payrollNotification = await this.sendMissedPunchAlertToPayrollTeam(
      employeeId,
      employeeName,
      attendanceRecordId,
      missedPunchType,
      recordDate,
      currentUserId,
    );
    
    await this.logTimeManagementChange(
      'MISSED_PUNCH_FLAGGED_WITH_NOTIFICATION',
      {
        attendanceRecordId,
        employeeId,
        managerId,
        missedPunchType,
        timeExceptionId: timeException._id,
      },
      currentUserId,
    );
    
    return {
      attendanceRecord,
      timeException,
      notifications: {
        employee: employeeNotification,
        manager: managerNotification,
        payroll: payrollNotification,
      },
    };
  }

  /**
   * Convenience method: flag missed punch with notifications by resolving line manager automatically.
   */
  async flagMissedPunchWithNotificationAuto(
    attendanceRecordId: string,
    employeeId: string,
    missedPunchType: 'CLOCK_IN' | 'CLOCK_OUT',
    date: Date,
    currentUserId: string,
  ) {
    const { employeeName, managerId } =
      await this.unifiedNotificationsService.getEmployeeAndLineManagerInfo(
        employeeId,
      );

    if (!managerId) {
      // Still notify employee + payroll team, but cannot create TimeException without assignedTo
      const employeeNotification = await this.sendMissedPunchAlertToEmployee(
        employeeId,
        attendanceRecordId,
        missedPunchType,
        date,
        currentUserId,
      );
      const payrollNotification = await this.sendMissedPunchAlertToPayrollTeam(
        employeeId,
        employeeName,
        attendanceRecordId,
        missedPunchType,
        date,
        currentUserId,
      );

      return {
        attendanceRecord: await this.attendanceRecordModel.findByIdAndUpdate(
          attendanceRecordId,
          { hasMissedPunch: true, updatedBy: currentUserId },
          { new: true },
        ),
        timeException: null,
        notifications: {
          employee: employeeNotification,
          payroll: payrollNotification,
          manager: null,
        },
        warning: 'No line manager found for employee; time exception not created',
      };
    }

    return this.flagMissedPunchWithNotification(
      attendanceRecordId,
      employeeId,
      managerId,
      employeeName,
      missedPunchType,
      currentUserId,
    );
  }

  /**
   * Get missed punch statistics/summary
   * BR-TM-14: Reporting on missed punch trends
   */
  async getMissedPunchStatistics(
    filters: { employeeId?: string; startDate?: Date; endDate?: Date },
    currentUserId: string,
  ) {
    const query: any = { hasMissedPunch: true };
    
    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }
    
    const missedPunchRecords = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'firstName lastName email')
      .exec();
    
    // Group by employee
    const byEmployee: Record<string, { count: number; records: any[] }> = {};
    missedPunchRecords.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || record.employeeId?.toString() || 'unknown';
      if (!byEmployee[empId]) {
        byEmployee[empId] = { count: 0, records: [] };
      }
      byEmployee[empId].count++;
      byEmployee[empId].records.push({
        recordId: record._id,
        date: record.createdAt,
        punchCount: record.punches?.length || 0,
      });
    });
    
    // Get related time exceptions
    const exceptionQuery: any = {
      type: TimeExceptionType.MISSED_PUNCH,
    };
    if (filters.startDate && filters.endDate) {
      exceptionQuery.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }
    
    const missedPunchExceptions = await this.timeExceptionModel
      .find(exceptionQuery)
      .exec();
    
    const exceptionsByStatus = {
      open: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
      resolved: 0,
    };
    
    missedPunchExceptions.forEach((exc: any) => {
      const status = exc.status?.toLowerCase() || 'open';
      if (exceptionsByStatus.hasOwnProperty(status)) {
        exceptionsByStatus[status as keyof typeof exceptionsByStatus]++;
      }
    });
    
    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalMissedPunchRecords: missedPunchRecords.length,
        totalExceptions: missedPunchExceptions.length,
        uniqueEmployees: Object.keys(byEmployee).length,
      },
      exceptionsByStatus,
      byEmployee: Object.entries(byEmployee).map(([empId, data]) => ({
        employeeId: empId,
        ...data,
      })),
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Converts a date to UTC by setting it to midnight UTC of the same calendar date
   * This ensures date range queries work correctly with MongoDB's UTC createdAt fields
   * Handles both Date objects and date strings
   */
  private convertDateToUTCStart(date: Date | string): Date {
    // Convert string to Date if needed
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Date(
      Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  /**
   * Converts a date to UTC by setting it to end of day UTC of the same calendar date
   * This ensures date range queries work correctly with MongoDB's UTC createdAt fields
   * Handles both Date objects and date strings
   */
  private convertDateToUTCEnd(date: Date | string): Date {
    // Convert string to Date if needed
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Date(
      Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }

  // ===== US16: VACATION PACKAGE INTEGRATION (BR-TM-19) =====

  /**
   * Link employee vacation entitlements to attendance schedules
   * BR-TM-19: Vacation packages must be linked to shift schedules
   */
  async linkVacationToAttendanceSchedule(
    params: {
      employeeId: string;
      vacationPackageId: string;
      startDate: Date;
      endDate: Date;
      vacationType: string;
      autoReflect?: boolean;
    },
    currentUserId: string,
  ) {
    const { employeeId, vacationPackageId, startDate, endDate, vacationType, autoReflect = true } = params;

    // Log the vacation-attendance linkage
    await this.logTimeManagementChange(
      'VACATION_ATTENDANCE_LINKED',
      {
        employeeId,
        vacationPackageId,
        startDate,
        endDate,
        vacationType,
        autoReflect,
      },
      currentUserId,
    );

    // Get attendance records for the vacation period
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      })
      .exec();

    // Calculate attendance impact
    const affectedDays = attendanceRecords.length;
    const workingDaysInRange = this.calculateWorkingDays(startDate, endDate);

    return {
      success: true,
      linkage: {
        employeeId,
        vacationPackageId,
        vacationType,
        period: { startDate, endDate },
        autoReflect,
      },
      attendanceImpact: {
        affectedAttendanceRecords: affectedDays,
        workingDaysInRange,
        message: autoReflect 
          ? 'Vacation will be automatically reflected in attendance records'
          : 'Manual attendance adjustments required',
      },
      linkedAt: new Date(),
      linkedBy: currentUserId,
    };
  }

  /**
   * Get employee vacation-attendance integration status
   * BR-TM-19: Check how vacation packages affect attendance
   */
  async getEmployeeVacationAttendanceStatus(
    params: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
    },
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = params;

    // Get attendance records for the period
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .exec();

    // Analyze attendance patterns
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const recordedDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((r: any) => r.clockIn).length;
    const absentDays = recordedDays - presentDays;

    // Identify potential vacation days (days without clock-in)
    const potentialVacationDays = attendanceRecords.filter((r: any) => !r.clockIn);

    return {
      employeeId,
      period: { startDate, endDate },
      summary: {
        totalDays,
        recordedDays,
        presentDays,
        absentDays,
        attendanceRate: recordedDays > 0 ? `${Math.round((presentDays / recordedDays) * 100)}%` : 'N/A',
      },
      potentialVacationDays: potentialVacationDays.map((r: any) => ({
        date: r.date,
        status: 'ABSENT',
        note: 'May be covered by vacation package',
      })),
      recommendation: absentDays > 0
        ? 'Review absent days against vacation entitlements'
        : 'All days accounted for in attendance',
      generatedAt: new Date(),
    };
  }

  /**
   * Validate vacation dates against shift schedule
   * BR-TM-19: Ensure vacation dates align with shift schedules
   */
  async validateVacationAgainstShiftSchedule(
    params: {
      employeeId: string;
      vacationStartDate: Date;
      vacationEndDate: Date;
      shiftAssignmentId?: string;
    },
    currentUserId: string,
  ) {
    const { employeeId, vacationStartDate, vacationEndDate } = params;

    // Get attendance records for the requested vacation period
    const existingRecords = await this.attendanceRecordModel
      .find({
        employeeId,
        date: { $gte: vacationStartDate, $lte: vacationEndDate },
        clockIn: { $ne: null }, // Records where employee clocked in
      })
      .exec();

    // Check for conflicts
    const hasConflicts = existingRecords.length > 0;
    const conflictDates = existingRecords.map((r: any) => r.date);

    // Calculate working days in vacation period
    const workingDays = this.calculateWorkingDays(vacationStartDate, vacationEndDate);

    return {
      valid: !hasConflicts,
      employeeId,
      vacationPeriod: {
        startDate: vacationStartDate,
        endDate: vacationEndDate,
        totalDays: Math.ceil((vacationEndDate.getTime() - vacationStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        workingDays,
      },
      conflicts: hasConflicts ? {
        count: existingRecords.length,
        dates: conflictDates,
        message: 'Employee has attendance records (worked) during requested vacation period',
      } : null,
      recommendation: hasConflicts
        ? 'Review attendance records before approving vacation'
        : 'No conflicts found - vacation can be approved',
      validatedAt: new Date(),
    };
  }

  /**
   * Auto-calculate leave deductions based on attendance
   * BR-TM-19: Link vacation packages to attendance for automatic deductions
   */
  async calculateLeaveDeductionsFromAttendance(
    params: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
      leaveType?: string;
    },
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate, leaveType = 'ANNUAL' } = params;

    // Get absence records (days without clock-in)
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      })
      .exec();

    // Calculate absences
    const absentDays = attendanceRecords.filter((r: any) => !r.clockIn);
    const workingDaysInPeriod = this.calculateWorkingDays(startDate, endDate);
    
    // Calculate deduction
    const deductionDays = absentDays.length;
    const halfDays = attendanceRecords.filter((r: any) => {
      const workMinutes = r.totalWorkMinutes || 0;
      return workMinutes > 0 && workMinutes < 240; // Less than 4 hours
    }).length;

    await this.logTimeManagementChange(
      'LEAVE_DEDUCTION_CALCULATED',
      {
        employeeId,
        startDate,
        endDate,
        deductionDays,
        halfDays,
        leaveType,
      },
      currentUserId,
    );

    return {
      employeeId,
      period: { startDate, endDate },
      leaveType,
      deduction: {
        fullDays: deductionDays,
        halfDays,
        totalDeduction: deductionDays + (halfDays * 0.5),
        unit: 'days',
      },
      breakdown: {
        workingDaysInPeriod,
        daysPresent: attendanceRecords.filter((r: any) => r.clockIn).length,
        daysAbsent: deductionDays,
        partialDays: halfDays,
      },
      syncStatus: {
        readyForPayroll: true,
        readyForLeaveModule: true,
        note: 'Deduction calculated - sync with Leaves module for entitlement update',
      },
      calculatedAt: new Date(),
    };
  }

  /**
   * Get vacation-attendance integration summary for department
   * BR-TM-19: Department-level vacation tracking
   */
  async getDepartmentVacationAttendanceSummary(
    params: {
      departmentId?: string;
      startDate: Date;
      endDate: Date;
    },
    currentUserId: string,
  ) {
    const { startDate, endDate } = params;

    // Get all attendance records for the period
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('employeeId', 'firstName lastName employeeNumber departmentId')
      .exec();

    // Group by employee
    const employeeStats: Record<string, {
      employee: any;
      presentDays: number;
      absentDays: number;
      totalWorkMinutes: number;
    }> = {};

    attendanceRecords.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || 'unknown';
      
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          employee: record.employeeId,
          presentDays: 0,
          absentDays: 0,
          totalWorkMinutes: 0,
        };
      }

      if (record.clockIn) {
        employeeStats[empId].presentDays += 1;
        employeeStats[empId].totalWorkMinutes += record.totalWorkMinutes || 0;
      } else {
        employeeStats[empId].absentDays += 1;
      }
    });

    // Calculate summary
    const employeeSummaries = Object.entries(employeeStats).map(([empId, stats]) => ({
      employeeId: empId,
      employeeName: stats.employee 
        ? `${stats.employee.firstName} ${stats.employee.lastName}`
        : 'Unknown',
      employeeNumber: stats.employee?.employeeNumber || 'N/A',
      presentDays: stats.presentDays,
      absentDays: stats.absentDays,
      potentialVacationDays: stats.absentDays,
      totalWorkHours: Math.round((stats.totalWorkMinutes / 60) * 100) / 100,
    }));

    // Sort by absent days (potential vacation) descending
    employeeSummaries.sort((a, b) => b.absentDays - a.absentDays);

    return {
      reportType: 'VACATION_ATTENDANCE_SUMMARY',
      period: { startDate, endDate },
      summary: {
        totalEmployees: employeeSummaries.length,
        totalPresentDays: employeeSummaries.reduce((sum, e) => sum + e.presentDays, 0),
        totalAbsentDays: employeeSummaries.reduce((sum, e) => sum + e.absentDays, 0),
        avgAbsentDaysPerEmployee: employeeSummaries.length > 0
          ? Math.round((employeeSummaries.reduce((sum, e) => sum + e.absentDays, 0) / employeeSummaries.length) * 100) / 100
          : 0,
      },
      employees: employeeSummaries,
      note: 'Absent days may be covered by vacation packages - cross-reference with Leaves module',
      generatedAt: new Date(),
    };
  }

  // ===== US18: ESCALATION FOR PENDING REQUESTS BEFORE PAYROLL CUT-OFF (BR-TM-20) =====

  /**
   * Get payroll cutoff configuration
   * BR-TM-20: Define escalation rules before payroll cutoff
   */
  async getPayrollCutoffConfig(currentUserId: string) {
    // Return standard payroll cutoff configuration
    // Cutoff is calculated from the current payroll period (derived from Payroll module)
    // These could be made configurable via database in future
    const { payrollPeriodEnd, cutoffDate, daysUntilCutoff } =
      await this.getNextPayrollCutoffFromPayrollPeriod(currentUserId, 25);

    return {
      cutoffSchedule: {
        dayOfMonth: 25, // Payroll cutoff on 25th of each month
        escalationDaysBefore: 3, // Auto-escalate 3 days before cutoff
        warningDaysBefore: 5, // Show warnings 5 days before cutoff
        reminderDaysBefore: 7, // Send reminders 7 days before cutoff
      },
      escalationRules: {
        autoEscalateUnreviewedCorrections: true,
        autoEscalateUnreviewedExceptions: true,
        autoEscalateOvertimeRequests: true,
        notifyHROnEscalation: true,
        notifyManagerOnEscalation: true,
        blockPayrollIfPending: false, // If true, payroll cannot proceed with pending items
      },
      notifications: {
        sendReminderEmails: true,
        sendEscalationAlerts: true,
        dailyDigestEnabled: true,
      },
      currentMonth: {
        payrollPeriodEnd,
        cutoffDate,
        daysUntilCutoff,
        status:
          daysUntilCutoff <= 3
            ? 'CRITICAL'
            : daysUntilCutoff <= 5
              ? 'WARNING'
              : 'NORMAL',
      },
    };
  }

  /**
   * Get pending requests that need review before payroll cutoff
   * BR-TM-20: Identify all unreviewed requests before cutoff
   */
  async getPendingRequestsBeforePayrollCutoff(
    params: {
      payrollCutoffDate?: Date;
      departmentId?: string;
    },
    currentUserId: string,
  ) {
    const cutoffDate =
      params.payrollCutoffDate ||
      (await this.getNextPayrollCutoffFromPayrollPeriod(currentUserId, 25))
        .cutoffDate;
    const now = new Date();
    const daysUntilCutoff = Math.ceil((cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Validate and normalize departmentId - treat empty strings as undefined
    const departmentId = params.departmentId && params.departmentId.trim() !== '' 
      ? params.departmentId.trim() 
      : undefined;

    // Get pending time exceptions - filter out any with invalid employeeId references
    // First, get all pending exceptions
    const allPendingExceptions = await this.timeExceptionModel
      .find({
        status: { $in: ['OPEN', 'PENDING'] },
      })
      .exec();
    
    // Filter out exceptions with invalid employeeId (empty strings, null, or invalid ObjectIds)
    const exceptionsWithValidEmployeeId = allPendingExceptions.filter((exc: any) => {
      if (!exc.employeeId) return false;
      const employeeIdStr = exc.employeeId.toString();
      return employeeIdStr && employeeIdStr.trim() !== '' && Types.ObjectId.isValid(employeeIdStr);
    });
    
    // Extract valid employeeIds for populate
    const validEmployeeIds = exceptionsWithValidEmployeeId
      .map((exc: any) => {
        try {
          return new Types.ObjectId(exc.employeeId);
        } catch {
          return null;
        }
      })
      .filter((id): id is Types.ObjectId => id !== null);
    
    // Now query with valid employeeIds and populate
    const pendingExceptions = await this.timeExceptionModel
      .find({
        status: { $in: ['OPEN', 'PENDING'] },
        employeeId: { $in: validEmployeeIds },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .populate('assignedTo', 'firstName lastName email')
      .exec();
    
    // Filter out any exceptions where populate failed (employeeId is null after populate)
    const validExceptions = pendingExceptions.filter((exc: any) => exc.employeeId != null);

    // Filter by department if specified
    let filteredExceptions = validExceptions;
    if (departmentId) {
      filteredExceptions = validExceptions.filter((exc: any) => 
        exc.employeeId?.departmentId?.toString() === departmentId
      );
    }

    // Categorize by urgency
    const categorized = {
      critical: [] as any[], // Need immediate action
      high: [] as any[],     // Should be reviewed within 1-2 days
      medium: [] as any[],   // Can wait but should be done before cutoff
    };

    filteredExceptions.forEach((exc: any) => {
      const createdAt = new Date(exc.createdAt);
      const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      const item = {
        id: exc._id,
        type: exc.type,
        status: exc.status,
        employee: exc.employeeId ? {
          id: exc.employeeId._id,
          name: `${exc.employeeId.firstName} ${exc.employeeId.lastName}`,
          employeeNumber: exc.employeeId.employeeNumber,
        } : null,
        assignedTo: exc.assignedTo ? {
          id: exc.assignedTo._id,
          name: `${exc.assignedTo.firstName} ${exc.assignedTo.lastName}`,
        } : null,
        ageInDays,
        createdAt: exc.createdAt,
      };

      if (daysUntilCutoff <= 2 || ageInDays >= 5) {
        categorized.critical.push(item);
      } else if (daysUntilCutoff <= 5 || ageInDays >= 3) {
        categorized.high.push(item);
      } else {
        categorized.medium.push(item);
      }
    });

    await this.logTimeManagementChange(
      'PAYROLL_CUTOFF_PENDING_CHECK',
      {
        cutoffDate,
        daysUntilCutoff,
        totalPending: filteredExceptions.length,
        critical: categorized.critical.length,
        departmentId,
      },
      currentUserId,
    );

    return {
      payrollCutoff: {
        date: cutoffDate,
        daysRemaining: daysUntilCutoff,
        status: daysUntilCutoff <= 2 ? 'CRITICAL' : daysUntilCutoff <= 5 ? 'WARNING' : 'NORMAL',
      },
      summary: {
        totalPending: filteredExceptions.length,
        critical: categorized.critical.length,
        high: categorized.high.length,
        medium: categorized.medium.length,
      },
      pendingByUrgency: categorized,
      recommendation: categorized.critical.length > 0
        ? 'IMMEDIATE ACTION REQUIRED: Critical items must be reviewed before payroll cutoff'
        : categorized.high.length > 0
          ? 'HIGH PRIORITY: Review high-priority items within 1-2 days'
          : 'ON TRACK: All pending items can be processed before cutoff',
      generatedAt: new Date(),
    };
  }

  /**
   * Auto-escalate all pending requests before payroll cutoff
   * BR-TM-20: Unreviewed requests must auto-escalate before payroll cutoff
   */
  async autoEscalateBeforePayrollCutoff(
    params: {
      payrollCutoffDate?: Date;
      escalationDaysBefore?: number;
      notifyManagers?: boolean;
    },
    currentUserId: string,
  ) {
    const {
      payrollCutoffDate: payrollCutoffDateParam,
      escalationDaysBefore = 3,
      notifyManagers = true,
    } = params;

    const payrollCutoffDate =
      payrollCutoffDateParam ||
      (await this.getNextPayrollCutoffFromPayrollPeriod(currentUserId, 25))
        .cutoffDate;

    const now = new Date();
    const daysUntilCutoff = Math.ceil((payrollCutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Only escalate if within the escalation window
    if (daysUntilCutoff > escalationDaysBefore) {
      return {
        success: false,
        message: `Not within escalation window. ${daysUntilCutoff} days until cutoff, escalation starts ${escalationDaysBefore} days before.`,
        payrollCutoff: payrollCutoffDate,
        daysUntilCutoff,
        escalationDaysBefore,
        escalated: [],
      };
    }

    // Find all pending items
    const pendingExceptions = await this.timeExceptionModel
      .find({
        status: { $in: ['OPEN', 'PENDING'] },
      })
      .exec();

    const escalatedItems: any[] = [];
    const failedItems: any[] = [];

    // Escalate each pending item
    for (const exception of pendingExceptions) {
      try {
        await this.timeExceptionModel.findByIdAndUpdate(
          exception._id,
          {
            status: 'ESCALATED',
            reason: `${exception.reason || ''}\n\n[AUTO-ESCALATED - PAYROLL CUTOFF]\nEscalated on: ${now.toISOString()}\nPayroll cutoff: ${payrollCutoffDate.toISOString()}\nDays until cutoff: ${daysUntilCutoff}`,
            updatedBy: currentUserId,
          },
        );
        escalatedItems.push({
          id: exception._id,
          type: exception.type,
          previousStatus: exception.status,
        });
      } catch {
        failedItems.push({ id: exception._id, error: 'Failed to escalate' });
      }
    }

    // Create notification for HR
    if (notifyManagers && escalatedItems.length > 0) {
      await this.sendNotification(
        {
          to: 'HR_MANAGERS', // Would be resolved to actual HR manager IDs
          type: 'PAYROLL_ESCALATION_ALERT',
          message: `${escalatedItems.length} time management requests have been auto-escalated due to approaching payroll cutoff (${payrollCutoffDate.toDateString()}). Immediate review required.`,
        },
        currentUserId,
      );
    }

    await this.logTimeManagementChange(
      'PAYROLL_AUTO_ESCALATION',
      {
        payrollCutoffDate,
        daysUntilCutoff,
        escalatedCount: escalatedItems.length,
        failedCount: failedItems.length,
      },
      currentUserId,
    );

    return {
      success: true,
      payrollCutoff: {
        date: payrollCutoffDate,
        daysRemaining: daysUntilCutoff,
      },
      escalation: {
        totalEscalated: escalatedItems.length,
        totalFailed: failedItems.length,
        items: escalatedItems,
        failed: failedItems.length > 0 ? failedItems : undefined,
      },
      notificationSent: notifyManagers && escalatedItems.length > 0,
      executedAt: new Date(),
      executedBy: currentUserId,
    };
  }

  /**
   * Check payroll readiness status
   * BR-TM-20: Verify all requests are processed before payroll
   */
  async checkPayrollReadinessStatus(
    params: {
      payrollCutoffDate?: Date;
      departmentId?: string;
    },
    currentUserId: string,
  ) {
    const cutoffDate =
      params.payrollCutoffDate ||
      (await this.getNextPayrollCutoffFromPayrollPeriod(currentUserId, 25))
        .cutoffDate;
    const now = new Date();
    const daysUntilCutoff = Math.ceil((cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Count pending items by type
    const pendingExceptionsCount = await this.timeExceptionModel.countDocuments({
      status: { $in: ['OPEN', 'PENDING'] },
    });

    const escalatedCount = await this.timeExceptionModel.countDocuments({
      status: 'ESCALATED',
    });

    const approvedCount = await this.timeExceptionModel.countDocuments({
      status: 'APPROVED',
    });

    const resolvedCount = await this.timeExceptionModel.countDocuments({
      status: 'RESOLVED',
    });

    // Determine readiness
    const isReady = pendingExceptionsCount === 0 && escalatedCount === 0;
    const hasBlockers = pendingExceptionsCount > 0;
    const hasWarnings = escalatedCount > 0;

    let readinessStatus: 'READY' | 'BLOCKED' | 'WARNING' | 'CRITICAL';
    if (isReady) {
      readinessStatus = 'READY';
    } else if (daysUntilCutoff <= 1 && hasBlockers) {
      readinessStatus = 'CRITICAL';
    } else if (hasBlockers) {
      readinessStatus = 'BLOCKED';
    } else {
      readinessStatus = 'WARNING';
    }

    return {
      payrollCutoff: {
        date: cutoffDate,
        daysRemaining: daysUntilCutoff,
      },
      readiness: {
        status: readinessStatus,
        isReady,
        hasBlockers,
        hasWarnings,
        message: isReady 
          ? 'All time management requests have been processed. Payroll can proceed.'
          : hasBlockers
            ? `${pendingExceptionsCount} pending request(s) must be reviewed before payroll.`
            : `${escalatedCount} escalated request(s) require attention but payroll can proceed with caution.`,
      },
      counts: {
        pending: pendingExceptionsCount,
        escalated: escalatedCount,
        approved: approvedCount,
        resolved: resolvedCount,
      },
      recommendations: this.getPayrollReadinessRecommendations(
        pendingExceptionsCount,
        escalatedCount,
        daysUntilCutoff,
      ),
      checkedAt: new Date(),
    };
  }

  /**
   * Get escalation history/log for audit
   * BR-TM-20: Track escalation actions
   */
  async getEscalationHistory(
    params: {
      startDate?: Date;
      endDate?: Date;
      type?: 'PAYROLL' | 'THRESHOLD' | 'MANUAL' | 'ALL';
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, type = 'ALL' } = params;

    // Get escalated items
    const query: any = {
      status: 'ESCALATED',
    };

    if (startDate && endDate) {
      query.updatedAt = { $gte: startDate, $lte: endDate };
    }

    const escalatedItems = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeNumber')
      .populate('assignedTo', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(100)
      .exec();

    // Parse escalation reasons to categorize
    const categorized = {
      payroll: [] as any[],
      threshold: [] as any[],
      manual: [] as any[],
    };

    escalatedItems.forEach((item: any) => {
      const entry = {
        id: item._id,
        type: item.type,
        employee: item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : 'Unknown',
        assignedTo: item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : 'Unassigned',
        escalatedAt: item.updatedAt,
        reason: item.reason,
      };

      if (item.reason?.includes('PAYROLL CUTOFF')) {
        categorized.payroll.push(entry);
      } else if (item.reason?.includes('AUTO-ESCALATED') && item.reason?.includes('days')) {
        categorized.threshold.push(entry);
      } else {
        categorized.manual.push(entry);
      }
    });

    const filteredItems = type === 'ALL' 
      ? escalatedItems 
      : type === 'PAYROLL'
        ? categorized.payroll
        : type === 'THRESHOLD'
          ? categorized.threshold
          : categorized.manual;

    return {
      period: {
        startDate: startDate || 'ALL',
        endDate: endDate || 'NOW',
      },
      filter: type,
      summary: {
        total: escalatedItems.length,
        byPayrollCutoff: categorized.payroll.length,
        byThreshold: categorized.threshold.length,
        manual: categorized.manual.length,
      },
      items: filteredItems.slice(0, 50), // Limit response size
      generatedAt: new Date(),
    };
  }

  /**
   * Send payroll cutoff reminder notifications
   * BR-TM-20: Notify stakeholders before cutoff
   */
  async sendPayrollCutoffReminders(
    params: {
      payrollCutoffDate?: Date;
      reminderDaysBefore?: number;
    },
    currentUserId: string,
  ) {
    const {
      payrollCutoffDate: payrollCutoffDateParam,
      reminderDaysBefore = 5,
    } = params;

    const payrollCutoffDate =
      payrollCutoffDateParam ||
      (await this.getNextPayrollCutoffFromPayrollPeriod(currentUserId, 25))
        .cutoffDate;

    const now = new Date();
    const daysUntilCutoff = Math.ceil((payrollCutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilCutoff > reminderDaysBefore) {
      return {
        success: false,
        message: `Not within reminder window. ${daysUntilCutoff} days until cutoff, reminders start ${reminderDaysBefore} days before.`,
        remindersSent: 0,
      };
    }

    // Get pending items grouped by assignee
    const pendingExceptions = await this.timeExceptionModel
      .find({
        status: { $in: ['OPEN', 'PENDING'] },
        assignedTo: { $exists: true },
      })
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    // Group by assignee
    const byAssignee: Record<string, { assignee: any; items: any[] }> = {};
    pendingExceptions.forEach((exc: any) => {
      const assigneeId = exc.assignedTo?._id?.toString() || 'unassigned';
      if (!byAssignee[assigneeId]) {
        byAssignee[assigneeId] = {
          assignee: exc.assignedTo,
          items: [],
        };
      }
      byAssignee[assigneeId].items.push(exc);
    });

    // Send reminders
    const remindersSent: any[] = [];
    for (const [assigneeId, data] of Object.entries(byAssignee)) {
      if (data.assignee && data.items.length > 0) {
        const notification = await this.sendNotification(
          {
            to: assigneeId,
            type: 'PAYROLL_CUTOFF_REMINDER',
            message: `Reminder: You have ${data.items.length} pending time management request(s) that need review before payroll cutoff on ${payrollCutoffDate.toDateString()}. Only ${daysUntilCutoff} day(s) remaining.`,
          },
          currentUserId,
        );
        remindersSent.push({
          assigneeId,
          assigneeName: `${data.assignee.firstName} ${data.assignee.lastName}`,
          pendingCount: data.items.length,
          notificationId: (notification as any)._id,
        });
      }
    }

    await this.logTimeManagementChange(
      'PAYROLL_CUTOFF_REMINDERS_SENT',
      {
        payrollCutoffDate,
        daysUntilCutoff,
        reminderCount: remindersSent.length,
      },
      currentUserId,
    );

    return {
      success: true,
      payrollCutoff: {
        date: payrollCutoffDate,
        daysRemaining: daysUntilCutoff,
      },
      remindersSent: remindersSent.length,
      reminders: remindersSent,
      sentAt: new Date(),
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Helper: Calculate working days in a date range (excluding weekends)
   */
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Get a payroll period end date from Payroll module.
   *
   * - If Payroll has runs, we derive the period from the latest run's `payrollPeriod`.
   * - If not, we fallback to end of the current month.
   */
  private async getPayrollPeriodEndFromPayroll(
    currentUserId: string,
  ): Promise<Date> {
    try {
      const status =
        await this.payrollExecutionService.getPreInitiationValidationStatus(
          currentUserId,
        );

      if (status?.payrollPeriod?.period) {
        const d = new Date(status.payrollPeriod.period);
        if (!isNaN(d.getTime())) return d;
      }
    } catch {
      // Fallback below
    }

    const now = new Date();
    // Last day of current month
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  /**
   * Given a payroll period end (e.g. end-of-month), compute the cut-off date for that same month.
   * If the dayOfMonth exceeds the number of days in the month (e.g. Feb 30), clamp to the month's last day.
   */
  private getPayrollCutoffDateForPayrollPeriod(
    payrollPeriodEnd: Date,
    dayOfMonth: number,
  ): Date {
    const year = payrollPeriodEnd.getFullYear();
    const month = payrollPeriodEnd.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(Math.max(dayOfMonth, 1), lastDayOfMonth);
    return new Date(year, month, clampedDay);
  }

  /**
   * Compute the next upcoming payroll cut-off using the payroll period as the source of truth.
   *
   * Behavior:
   * - Use latest payroll run period if available; otherwise current month.
   * - Ensure the returned cut-off is in the future; if we've passed it, shift to next month.
   */
  private async getNextPayrollCutoffFromPayrollPeriod(
    currentUserId: string,
    dayOfMonth: number,
  ): Promise<{
    payrollPeriodEnd: Date;
    cutoffDate: Date;
    daysUntilCutoff: number;
  }> {
    const now = new Date();

    let payrollPeriodEnd = await this.getPayrollPeriodEndFromPayroll(
      currentUserId,
    );

    let cutoffDate = this.getPayrollCutoffDateForPayrollPeriod(
      payrollPeriodEnd,
      dayOfMonth,
    );

    // If we've already passed the cutoff for that payroll period's month,
    // move to next month's payroll period and recompute.
    if (now > cutoffDate) {
      payrollPeriodEnd = new Date(
        payrollPeriodEnd.getFullYear(),
        payrollPeriodEnd.getMonth() + 2,
        0,
      );
      cutoffDate = this.getPayrollCutoffDateForPayrollPeriod(
        payrollPeriodEnd,
        dayOfMonth,
      );
    }

    const daysUntilCutoff = Math.ceil(
      (cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return { payrollPeriodEnd, cutoffDate, daysUntilCutoff };
  }

  /**
   * Helper: Generate payroll readiness recommendations
   */
  private getPayrollReadinessRecommendations(
    pendingCount: number,
    escalatedCount: number,
    daysUntilCutoff: number,
  ): string[] {
    const recommendations: string[] = [];

    if (pendingCount === 0 && escalatedCount === 0) {
      recommendations.push('All items processed - payroll can proceed');
      return recommendations;
    }

    if (pendingCount > 0) {
      if (daysUntilCutoff <= 1) {
        recommendations.push(`URGENT: ${pendingCount} pending items require immediate review`);
        recommendations.push('Consider auto-escalation to expedite processing');
      } else if (daysUntilCutoff <= 3) {
        recommendations.push(`Review ${pendingCount} pending items within the next ${daysUntilCutoff - 1} days`);
        recommendations.push('Send reminders to assigned reviewers');
      } else {
        recommendations.push(`${pendingCount} pending items should be processed before cutoff`);
      }
    }

    if (escalatedCount > 0) {
      recommendations.push(`${escalatedCount} escalated items need HR/management attention`);
      if (daysUntilCutoff <= 2) {
        recommendations.push('Prioritize escalated items for resolution');
      }
    }

    return recommendations;
  }

  // ===== US20: CROSS-MODULE DATA SYNCHRONIZATION (BR-TM-22) =====

  /**
   * Get cross-module sync status dashboard
   * BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules
   */
  async getCrossModuleSyncStatus(
    params: {
      startDate?: Date;
      endDate?: Date;
    },
    currentUserId: string,
  ) {
    const now = new Date();
    const startDate = params.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = params.endDate || now;

    const startDateUTC = this.convertDateToUTCStart(startDate);
    const endDateUTC = this.convertDateToUTCEnd(endDate);

    // Get attendance records status
    const allAttendance = await this.attendanceRecordModel
      .find({
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .exec();

    const finalizedCount = allAttendance.filter((r: any) => r.finalisedForPayroll).length;
    const pendingCount = allAttendance.length - finalizedCount;

    // Get exception status
    const allExceptions = await this.timeExceptionModel
      .find({
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .exec();

    const approvedExceptions = allExceptions.filter(e => e.status === 'APPROVED').length;
    const pendingExceptions = allExceptions.filter(e => 
      e.status === TimeExceptionStatus.OPEN || e.status === TimeExceptionStatus.PENDING
    ).length;

    // Get sync history
    const recentSyncs = this.auditLogs
      .filter(log => 
        log.entity.includes('SYNC') && 
        log.timestamp >= startDateUTC && 
        log.timestamp <= endDateUTC
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Calculate sync health
    const syncHealth = {
      attendanceSyncRate: allAttendance.length > 0 
        ? Math.round((finalizedCount / allAttendance.length) * 100) 
        : 100,
      exceptionProcessingRate: allExceptions.length > 0 
        ? Math.round((approvedExceptions / allExceptions.length) * 100) 
        : 100,
      overallHealth: 'GOOD' as 'GOOD' | 'WARNING' | 'CRITICAL',
    };

    if (syncHealth.attendanceSyncRate < 50 || syncHealth.exceptionProcessingRate < 50) {
      syncHealth.overallHealth = 'CRITICAL';
    } else if (syncHealth.attendanceSyncRate < 80 || syncHealth.exceptionProcessingRate < 80) {
      syncHealth.overallHealth = 'WARNING';
    }

    await this.logTimeManagementChange(
      'CROSS_MODULE_SYNC_STATUS_CHECKED',
      {
        startDate,
        endDate,
        attendanceCount: allAttendance.length,
        exceptionCount: allExceptions.length,
        overallHealth: syncHealth.overallHealth,
      },
      currentUserId,
    );

    return {
      period: { startDate, endDate },
      modules: {
        timeManagement: {
          status: 'ACTIVE',
          lastSync: recentSyncs[0]?.timestamp || null,
        },
        payroll: {
          status: 'READY_TO_SYNC',
          pendingRecords: pendingCount,
          finalizedRecords: finalizedCount,
        },
        leaves: {
          status: 'INTEGRATION_AVAILABLE',
          note: 'Time Management provides attendance context for leave validation',
        },
        benefits: {
          status: 'INTEGRATION_AVAILABLE',
          note: 'Overtime and attendance data available for benefits calculations',
        },
      },
      attendance: {
        total: allAttendance.length,
        finalized: finalizedCount,
        pending: pendingCount,
        syncRate: `${syncHealth.attendanceSyncRate}%`,
      },
      exceptions: {
        total: allExceptions.length,
        approved: approvedExceptions,
        pending: pendingExceptions,
        processingRate: `${syncHealth.exceptionProcessingRate}%`,
      },
      health: syncHealth,
      recentSyncOperations: recentSyncs.map(s => ({
        operation: s.entity,
        timestamp: s.timestamp,
        performedBy: s.actorId,
      })),
      generatedAt: new Date(),
    };
  }

  /**
   * Sync time management data with leaves module
   * BR-TM-22: Sync with leave modules
   */
  async syncWithLeavesModule(
    params: {
      employeeId?: string;
      startDate: Date;
      endDate: Date;
    },
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = params;
    const startDateUTC = this.convertDateToUTCStart(startDate);
    const endDateUTC = this.convertDateToUTCEnd(endDate);

    // Get attendance records for the period
    const query: any = {
      createdAt: { $gte: startDateUTC, $lte: endDateUTC },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const attendanceRecords = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .exec();

    // Identify potential leave-related absences (days with no attendance)
    const attendanceDates = new Set(
      attendanceRecords.map((r: any) => 
        new Date(r.createdAt || r.date).toISOString().split('T')[0]
      )
    );

    // Get unique employees
    const uniqueEmployees = [...new Set(
      attendanceRecords.map((r: any) => r.employeeId?._id?.toString() || r.employeeId?.toString())
    )];

    // Build leave context data
    const leaveContextData = {
      attendanceByEmployee: {} as Record<string, any>,
    };

    attendanceRecords.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || record.employeeId?.toString() || 'unknown';
      if (!leaveContextData.attendanceByEmployee[empId]) {
        leaveContextData.attendanceByEmployee[empId] = {
          employeeId: empId,
          employeeName: record.employeeId 
            ? `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim() 
            : 'Unknown',
          daysPresent: 0,
          totalWorkHours: 0,
          attendanceDates: [] as string[],
        };
      }
      leaveContextData.attendanceByEmployee[empId].daysPresent++;
      leaveContextData.attendanceByEmployee[empId].totalWorkHours += 
        Math.round((record.totalWorkMinutes || 0) / 60 * 100) / 100;
      leaveContextData.attendanceByEmployee[empId].attendanceDates.push(
        new Date(record.createdAt || record.date).toISOString().split('T')[0]
      );
    });

    await this.logTimeManagementChange(
      'LEAVES_MODULE_SYNC',
      {
        employeeId,
        startDate,
        endDate,
        recordCount: attendanceRecords.length,
        employeeCount: uniqueEmployees.length,
      },
      currentUserId,
    );

    return {
      syncType: 'TIME_MANAGEMENT_TO_LEAVES',
      period: { startDate, endDate },
      summary: {
        totalAttendanceRecords: attendanceRecords.length,
        uniqueEmployees: uniqueEmployees.length,
        attendanceDaysRecorded: attendanceDates.size,
      },
      leaveContext: {
        description: 'Attendance data for leave validation and deduction calculations',
        employeeData: Object.values(leaveContextData.attendanceByEmployee),
      },
      integrationNotes: [
        'Use attendanceDates to validate against requested leave dates',
        'Absent days (not in attendanceDates) may indicate leave or unauthorized absence',
        'totalWorkHours can be used for partial day leave calculations',
      ],
      syncedAt: new Date(),
      syncedBy: currentUserId,
    };
  }

  /**
   * Sync time management data with benefits module
   * BR-TM-22: Sync with benefits modules
   */
  async syncWithBenefitsModule(
    params: {
      employeeId?: string;
      startDate: Date;
      endDate: Date;
    },
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = params;
    const startDateUTC = this.convertDateToUTCStart(startDate);
    const endDateUTC = this.convertDateToUTCEnd(endDate);

    // Get attendance records
    const attendanceQuery: any = {
      createdAt: { $gte: startDateUTC, $lte: endDateUTC },
    };

    if (employeeId) {
      attendanceQuery.employeeId = employeeId;
    }

    const attendanceRecords = await this.attendanceRecordModel
      .find(attendanceQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .exec();

    // Get approved overtime
    const overtimeQuery: any = {
      type: TimeExceptionType.OVERTIME_REQUEST,
      status: 'APPROVED',
      createdAt: { $gte: startDateUTC, $lte: endDateUTC },
    };

    if (employeeId) {
      overtimeQuery.employeeId = employeeId;
    }

    const overtimeRecords = await this.timeExceptionModel
      .find(overtimeQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .exec();

    // Build benefits-relevant data
    const benefitsData: Record<string, any> = {};

    attendanceRecords.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || record.employeeId?.toString() || 'unknown';
      if (!benefitsData[empId]) {
        benefitsData[empId] = {
          employeeId: empId,
          employeeName: record.employeeId 
            ? `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim() 
            : 'Unknown',
          totalWorkMinutes: 0,
          totalWorkHours: 0,
          daysWorked: 0,
          overtimeMinutes: 0,
          overtimeHours: 0,
        };
      }
      benefitsData[empId].totalWorkMinutes += record.totalWorkMinutes || 0;
      benefitsData[empId].daysWorked++;
    });

    // Add overtime data
    overtimeRecords.forEach((ot: any) => {
      const empId = ot.employeeId?._id?.toString() || ot.employeeId?.toString();
      if (empId && benefitsData[empId]) {
        const attendance = ot.attendanceRecordId as any;
        const overtimeMinutes = attendance?.totalWorkMinutes 
          ? Math.max(0, attendance.totalWorkMinutes - 480) 
          : 0;
        benefitsData[empId].overtimeMinutes += overtimeMinutes;
      }
    });

    // Convert to hours
    Object.values(benefitsData).forEach((data: any) => {
      data.totalWorkHours = Math.round((data.totalWorkMinutes / 60) * 100) / 100;
      data.overtimeHours = Math.round((data.overtimeMinutes / 60) * 100) / 100;
    });

    await this.logTimeManagementChange(
      'BENEFITS_MODULE_SYNC',
      {
        employeeId,
        startDate,
        endDate,
        attendanceCount: attendanceRecords.length,
        overtimeCount: overtimeRecords.length,
      },
      currentUserId,
    );

    return {
      syncType: 'TIME_MANAGEMENT_TO_BENEFITS',
      period: { startDate, endDate },
      summary: {
        totalAttendanceRecords: attendanceRecords.length,
        approvedOvertimeRecords: overtimeRecords.length,
        uniqueEmployees: Object.keys(benefitsData).length,
      },
      benefitsData: {
        description: 'Work hours and overtime data for benefits calculations',
        employees: Object.values(benefitsData),
      },
      calculations: {
        totalWorkHoursAllEmployees: Math.round(
          Object.values(benefitsData).reduce((sum: number, e: any) => sum + e.totalWorkMinutes, 0) / 60 * 100
        ) / 100,
        totalOvertimeHoursAllEmployees: Math.round(
          Object.values(benefitsData).reduce((sum: number, e: any) => sum + e.overtimeMinutes, 0) / 60 * 100
        ) / 100,
      },
      integrationNotes: [
        'Use totalWorkHours for attendance-based benefits eligibility',
        'Use overtimeHours for overtime compensation calculations',
        'daysWorked can be used for per-diem benefit calculations',
      ],
      syncedAt: new Date(),
      syncedBy: currentUserId,
    };
  }

  /**
   * Run full cross-module synchronization
   * BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules
   */
  async runFullCrossModuleSync(
    params: {
      syncDate: Date;
      modules: ('payroll' | 'leaves' | 'benefits')[];
    },
    currentUserId: string,
  ) {
    const { syncDate, modules } = params;
    const syncResults: Record<string, any> = {};
    const startOfDay = this.convertDateToUTCStart(syncDate);
    const endOfDay = this.convertDateToUTCEnd(syncDate);

    // Sync with Payroll
    if (modules.includes('payroll')) {
      try {
        const payrollSync = await this.runDailyPayrollSync(syncDate, currentUserId);
        syncResults.payroll = {
          status: 'SUCCESS',
          data: payrollSync,
        };
      } catch (error: any) {
        syncResults.payroll = {
          status: 'FAILED',
          error: error.message,
        };
      }
    }

    // Sync with Leaves
    if (modules.includes('leaves')) {
      try {
        const leavesSync = await this.syncWithLeavesModule(
          { startDate: startOfDay, endDate: endOfDay },
          currentUserId,
        );
        syncResults.leaves = {
          status: 'SUCCESS',
          data: leavesSync,
        };
      } catch (error: any) {
        syncResults.leaves = {
          status: 'FAILED',
          error: error.message,
        };
      }
    }

    // Sync with Benefits
    if (modules.includes('benefits')) {
      try {
        const benefitsSync = await this.syncWithBenefitsModule(
          { startDate: startOfDay, endDate: endOfDay },
          currentUserId,
        );
        syncResults.benefits = {
          status: 'SUCCESS',
          data: benefitsSync,
        };
      } catch (error: any) {
        syncResults.benefits = {
          status: 'FAILED',
          error: error.message,
        };
      }
    }

    // Determine overall status
    const failedModules = Object.entries(syncResults)
      .filter(([, result]) => result.status === 'FAILED')
      .map(([module]) => module);

    const overallStatus = failedModules.length === 0 
      ? 'SUCCESS' 
      : failedModules.length === modules.length 
        ? 'FAILED' 
        : 'PARTIAL';

    await this.logTimeManagementChange(
      'FULL_CROSS_MODULE_SYNC',
      {
        syncDate,
        modules,
        overallStatus,
        failedModules,
      },
      currentUserId,
    );

    return {
      syncDate,
      modulesRequested: modules,
      overallStatus,
      results: syncResults,
      failedModules: failedModules.length > 0 ? failedModules : undefined,
      executedAt: new Date(),
      executedBy: currentUserId,
    };
  }

  /**
   * Check data consistency across modules
   * BR-TM-22: Ensure data consistency
   */
  async checkCrossModuleDataConsistency(
    params: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, employeeId } = params;
    const startDateUTC = this.convertDateToUTCStart(startDate);
    const endDateUTC = this.convertDateToUTCEnd(endDate);

    const query: any = {
      createdAt: { $gte: startDateUTC, $lte: endDateUTC },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    // Get all relevant data
    const attendanceRecords = await this.attendanceRecordModel.find(query).exec();
    const timeExceptions = await this.timeExceptionModel.find(query).exec();

    // Check for inconsistencies
    const inconsistencies: any[] = [];

    // Check 1: Attendance records with no clock-in but marked as present
    const noClockInPresent = attendanceRecords.filter((r: any) => 
      !r.clockIn && r.totalWorkMinutes > 0
    );
    if (noClockInPresent.length > 0) {
      inconsistencies.push({
        type: 'NO_CLOCKIN_BUT_HAS_WORK_MINUTES',
        severity: 'WARNING',
        count: noClockInPresent.length,
        description: 'Records with work minutes but no clock-in time',
        recordIds: noClockInPresent.map((r: any) => r._id),
      });
    }

    // Check 2: Overtime exceptions without corresponding attendance
    const overtimeExceptions = timeExceptions.filter(e => e.type === TimeExceptionType.OVERTIME_REQUEST);
    const orphanOvertime = overtimeExceptions.filter((e: any) => !e.attendanceRecordId);
    if (orphanOvertime.length > 0) {
      inconsistencies.push({
        type: 'ORPHAN_OVERTIME_EXCEPTIONS',
        severity: 'ERROR',
        count: orphanOvertime.length,
        description: 'Overtime exceptions not linked to attendance records',
        exceptionIds: orphanOvertime.map((e: any) => e._id),
      });
    }

    // Check 3: Finalized records with pending exceptions
    const finalizedRecordIds = attendanceRecords
      .filter((r: any) => r.finalisedForPayroll)
      .map((r: any) => r._id.toString());
    
    const exceptionsForFinalized = timeExceptions.filter((e: any) => 
      finalizedRecordIds.includes(e.attendanceRecordId?.toString()) &&
      (e.status === TimeExceptionStatus.OPEN || e.status === TimeExceptionStatus.PENDING)
    );
    if (exceptionsForFinalized.length > 0) {
      inconsistencies.push({
        type: 'FINALIZED_WITH_PENDING_EXCEPTIONS',
        severity: 'ERROR',
        count: exceptionsForFinalized.length,
        description: 'Finalized attendance records have pending exceptions',
        exceptionIds: exceptionsForFinalized.map((e: any) => e._id),
      });
    }

    // Check 4: Duplicate attendance records for same employee/date
    const employeeDateMap: Record<string, any[]> = {};
    attendanceRecords.forEach((r: any) => {
      const key = `${r.employeeId?.toString()}_${new Date(r.createdAt || r.date).toDateString()}`;
      if (!employeeDateMap[key]) employeeDateMap[key] = [];
      employeeDateMap[key].push(r);
    });
    
    const duplicates = Object.entries(employeeDateMap)
      .filter(([, records]) => records.length > 1);
    if (duplicates.length > 0) {
      inconsistencies.push({
        type: 'DUPLICATE_ATTENDANCE_RECORDS',
        severity: 'WARNING',
        count: duplicates.length,
        description: 'Multiple attendance records for same employee on same date',
        details: duplicates.map(([key, records]) => ({
          employeeDate: key,
          recordCount: records.length,
          recordIds: records.map((r: any) => r._id),
        })),
      });
    }

    const isConsistent = inconsistencies.filter(i => i.severity === 'ERROR').length === 0;

    await this.logTimeManagementChange(
      'CROSS_MODULE_CONSISTENCY_CHECK',
      {
        startDate,
        endDate,
        employeeId,
        isConsistent,
        inconsistencyCount: inconsistencies.length,
      },
      currentUserId,
    );

    return {
      period: { startDate, endDate },
      employeeFilter: employeeId || 'ALL',
      isConsistent,
      summary: {
        attendanceRecordsChecked: attendanceRecords.length,
        exceptionsChecked: timeExceptions.length,
        errorCount: inconsistencies.filter(i => i.severity === 'ERROR').length,
        warningCount: inconsistencies.filter(i => i.severity === 'WARNING').length,
      },
      inconsistencies,
      recommendations: isConsistent 
        ? ['Data is consistent across modules'] 
        : this.getConsistencyRecommendations(inconsistencies),
      checkedAt: new Date(),
      checkedBy: currentUserId,
    };
  }

  /**
   * Get data ready for all downstream modules
   * BR-TM-22: Provide single source of truth for downstream systems
   */
  async getDataForDownstreamModules(
    params: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
      modules: ('payroll' | 'leaves' | 'benefits')[];
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, departmentId, modules } = params;
    const startDateUTC = this.convertDateToUTCStart(startDate);
    const endDateUTC = this.convertDateToUTCEnd(endDate);

    // Get base attendance data
    const attendanceQuery: any = {
      createdAt: { $gte: startDateUTC, $lte: endDateUTC },
    };

    const attendanceRecords = await this.attendanceRecordModel
      .find(attendanceQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .exec();

    // Filter by department
    const filteredAttendance = departmentId
      ? attendanceRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : attendanceRecords;

    // Get exceptions
    const exceptions = await this.timeExceptionModel
      .find({
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .populate('employeeId', 'firstName lastName employeeNumber departmentId')
      .exec();

    const filteredExceptions = departmentId
      ? exceptions.filter((e: any) => 
          e.employeeId?.departmentId?.toString() === departmentId)
      : exceptions;

    // Build module-specific data packages
    const dataPackages: Record<string, any> = {};

    if (modules.includes('payroll')) {
      dataPackages.payroll = this.buildPayrollDataPackage(filteredAttendance, filteredExceptions);
    }

    if (modules.includes('leaves')) {
      dataPackages.leaves = this.buildLeavesDataPackage(filteredAttendance);
    }

    if (modules.includes('benefits')) {
      dataPackages.benefits = this.buildBenefitsDataPackage(filteredAttendance, filteredExceptions);
    }

    await this.logTimeManagementChange(
      'DOWNSTREAM_DATA_PACKAGE_GENERATED',
      {
        startDate,
        endDate,
        departmentId,
        modules,
        attendanceCount: filteredAttendance.length,
        exceptionCount: filteredExceptions.length,
      },
      currentUserId,
    );

    return {
      period: { startDate, endDate },
      departmentFilter: departmentId || 'ALL',
      modulesIncluded: modules,
      baseDataSummary: {
        attendanceRecords: filteredAttendance.length,
        exceptions: filteredExceptions.length,
        uniqueEmployees: [...new Set(
          filteredAttendance.map((r: any) => r.employeeId?._id?.toString())
        )].length,
      },
      dataPackages,
      generatedAt: new Date(),
      generatedBy: currentUserId,
    };
  }

  // Helper methods for US20

  private buildPayrollDataPackage(attendance: any[], exceptions: any[]): any {
    const employeeData: Record<string, any> = {};

    attendance.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || 'unknown';
      if (!employeeData[empId]) {
        employeeData[empId] = {
          employeeId: empId,
          employeeNumber: record.employeeId?.employeeNumber || 'N/A',
          employeeName: record.employeeId 
            ? `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim()
            : 'Unknown',
          totalWorkMinutes: 0,
          regularMinutes: 0,
          overtimeMinutes: 0,
          daysWorked: 0,
          lateDays: 0,
          missedPunches: 0,
        };
      }

      const workMinutes = record.totalWorkMinutes || 0;
      employeeData[empId].totalWorkMinutes += workMinutes;
      employeeData[empId].regularMinutes += Math.min(workMinutes, 480);
      employeeData[empId].overtimeMinutes += Math.max(0, workMinutes - 480);
      employeeData[empId].daysWorked++;
      if (record.isLate) employeeData[empId].lateDays++;
      if (record.hasMissedPunch) employeeData[empId].missedPunches++;
    });

    // Convert to hours
    Object.values(employeeData).forEach((data: any) => {
      data.totalWorkHours = Math.round((data.totalWorkMinutes / 60) * 100) / 100;
      data.regularHours = Math.round((data.regularMinutes / 60) * 100) / 100;
      data.overtimeHours = Math.round((data.overtimeMinutes / 60) * 100) / 100;
    });

    return {
      description: 'Payroll-ready attendance and overtime data',
      employees: Object.values(employeeData),
      totals: {
        totalEmployees: Object.keys(employeeData).length,
        totalWorkHours: Math.round(
          Object.values(employeeData).reduce((sum: number, e: any) => sum + e.totalWorkMinutes, 0) / 60 * 100
        ) / 100,
        totalOvertimeHours: Math.round(
          Object.values(employeeData).reduce((sum: number, e: any) => sum + e.overtimeMinutes, 0) / 60 * 100
        ) / 100,
      },
    };
  }

  private buildLeavesDataPackage(attendance: any[]): any {
    const employeeData: Record<string, any> = {};

    attendance.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || 'unknown';
      if (!employeeData[empId]) {
        employeeData[empId] = {
          employeeId: empId,
          employeeName: record.employeeId 
            ? `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim()
            : 'Unknown',
          presentDates: [] as string[],
          daysPresent: 0,
        };
      }

      const dateStr = new Date(record.createdAt || record.date).toISOString().split('T')[0];
      if (!employeeData[empId].presentDates.includes(dateStr)) {
        employeeData[empId].presentDates.push(dateStr);
        employeeData[empId].daysPresent++;
      }
    });

    return {
      description: 'Attendance data for leave validation',
      employees: Object.values(employeeData),
      usage: 'Cross-reference presentDates against leave requests to validate absences',
    };
  }

  private buildBenefitsDataPackage(attendance: any[], exceptions: any[]): any {
    const employeeData: Record<string, any> = {};

    attendance.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || 'unknown';
      if (!employeeData[empId]) {
        employeeData[empId] = {
          employeeId: empId,
          employeeName: record.employeeId 
            ? `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim()
            : 'Unknown',
          totalWorkHours: 0,
          overtimeHours: 0,
          daysWorked: 0,
          perfectAttendanceDays: 0,
        };
      }

      const workMinutes = record.totalWorkMinutes || 0;
      employeeData[empId].totalWorkHours += Math.round((workMinutes / 60) * 100) / 100;
      employeeData[empId].overtimeHours += Math.round((Math.max(0, workMinutes - 480) / 60) * 100) / 100;
      employeeData[empId].daysWorked++;
      if (!record.isLate && !record.earlyLeave && !record.hasMissedPunch) {
        employeeData[empId].perfectAttendanceDays++;
      }
    });

    return {
      description: 'Attendance and overtime data for benefits calculations',
      employees: Object.values(employeeData),
      eligibilityCriteria: {
        overtimeBonusEligible: Object.values(employeeData).filter((e: any) => e.overtimeHours > 0),
        perfectAttendanceBonus: Object.values(employeeData).filter((e: any) => 
          e.daysWorked > 0 && e.perfectAttendanceDays === e.daysWorked
        ),
      },
    };
  }

  private getConsistencyRecommendations(inconsistencies: any[]): string[] {
    const recommendations: string[] = [];

    inconsistencies.forEach(inc => {
      switch (inc.type) {
        case 'NO_CLOCKIN_BUT_HAS_WORK_MINUTES':
          recommendations.push('Review attendance records with work minutes but no clock-in time');
          break;
        case 'ORPHAN_OVERTIME_EXCEPTIONS':
          recommendations.push('Link overtime exceptions to corresponding attendance records');
          break;
        case 'FINALIZED_WITH_PENDING_EXCEPTIONS':
          recommendations.push('Resolve pending exceptions before keeping records finalized, or un-finalize records');
          break;
        case 'DUPLICATE_ATTENDANCE_RECORDS':
          recommendations.push('Merge or remove duplicate attendance records for same employee/date');
          break;
      }
    });

    return recommendations;
  }

  private async logTimeManagementChange(
    entity: string,
    changeSet: Record<string, unknown>,
    actorId?: string,
  ) {
    this.auditLogs.push({
      entity,
      changeSet,
      actorId,
      timestamp: new Date(),
    });
  }
}
