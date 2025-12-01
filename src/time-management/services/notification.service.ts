import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Import schemas
import { NotificationLog } from '../models/notification-log.schema';
import { AttendanceRecord } from '../models/attendance-record.schema';
import { TimeException } from '../models/time-exception.schema';
// Import enums
import { TimeExceptionType } from '../models/enums';
// Import DTOs
import {
  SendNotificationDto,
  GetNotificationLogsByEmployeeDto,
  SyncAttendanceWithPayrollDto,
  SyncLeaveWithPayrollDto,
  SynchronizeAttendanceAndPayrollDto,
} from '../dtos/notification-and-sync.dtos';

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
  ) {}

  // ===== NOTIFICATIONS =====

  async sendNotification(
    sendNotificationDto: SendNotificationDto,
    currentUserId: string,
  ) {
    const notification = new this.notificationLogModel({
      to: sendNotificationDto.to,
      type: sendNotificationDto.type,
      message: sendNotificationDto.message ?? '',
      createdBy: currentUserId,
      updatedBy: currentUserId,
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

    // Calculate overtime hours from attendance records
    const overtimeData = overtimeExceptions.map((exception: any) => {
      const record = exception.attendanceRecordId;
      const standardMinutes = 480; // 8 hours
      const overtimeMinutes =
        record && record.totalWorkMinutes
          ? Math.max(0, record.totalWorkMinutes - standardMinutes)
          : 0;

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
    });

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
