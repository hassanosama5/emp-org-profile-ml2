import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Import schemas
import { AttendanceRecord } from '../models/attendance-record.schema';
import { AttendanceCorrectionRequest } from '../models/attendance-correction-request.schema';
import { TimeException } from '../models/time-exception.schema';
import { ShiftAssignment } from '../models/shift-assignment.schema';
// Import enums
import {
  TimeExceptionStatus,
  TimeExceptionType,
  PunchType,
  CorrectionRequestStatus,
} from '../models/enums';
import {
  ApplyAttendanceRoundingDto,
  EnforcePunchPolicyDto,
  EnforceShiftPunchPolicyDto,
  MonitorRepeatedLatenessDto,
  RecordPunchWithMetadataDto,
  TriggerLatenessDisciplinaryDto,
} from '../DTOs/time-permission.dtos';
import {
  GenerateOvertimeReportDto,
  GenerateLatenessReportDto,
  GenerateExceptionReportDto,
  ExportReportDto,
} from '../DTOs/reporting.dtos';
import { LeavesService } from '../../leaves/leaves.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class TimeManagementService {
  private readonly auditLogs: Array<{
    entity: string;
    changeSet: Record<string, unknown>;
    actorId?: string;
    timestamp: Date;
  }> = [];

  constructor(
    @InjectModel(AttendanceRecord.name)
    private attendanceRecordModel: Model<AttendanceRecord>,
    @InjectModel(AttendanceCorrectionRequest.name)
    private correctionRequestModel: Model<AttendanceCorrectionRequest>,
    @InjectModel(TimeException.name)
    private timeExceptionModel: Model<TimeException>,
    @InjectModel(ShiftAssignment.name)
    private shiftAssignmentModel: Model<ShiftAssignment>,
    @Inject(forwardRef(() => LeavesService))
    private leavesService: LeavesService,
  ) {}

  // ===== US5: CLOCK-IN/OUT ATTENDANCE SERVICE METHODS =====
  // BR-TM-06: Time-in/out captured via Biometric, Web Login, Mobile App, or Manual Input (with audit trail)
  // BR-TM-07: Attendance data must follow HR rounding rules
  // BR-TM-11: Allow multiple punches per day, or first in/last out
  // BR-TM-12: Clock-ins must be tagged with location, terminal ID, or device

  /**
   * Clock in with employee ID
   * BR-TM-06: Creates audit trail for clock-in
   * BR-TM-12: Tags with source type (defaults to manual)
   */
  async clockInWithID(employeeId: string, currentUserId: string) {
    const now = new Date();

    // Create new attendance record with clock-in punch
    const attendanceRecord = new this.attendanceRecordModel({
      employeeId,
      punches: [
        {
          type: PunchType.IN,
          time: now,
        },
      ],
      totalWorkMinutes: 0,
      hasMissedPunch: false,
      finalisedForPayroll: false,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    const saved = await attendanceRecord.save();
    
    // BR-TM-06: Log audit trail
    await this.logAttendanceChange(
      employeeId,
      'CLOCK_IN',
      {
        attendanceRecordId: saved._id,
        source: 'ID_CARD',
        timestamp: now.toISOString(),
      },
      currentUserId,
    );

    return saved;
  }

  /**
   * Clock out with employee ID
   * BR-TM-06: Creates audit trail for clock-out
   * BR-TM-07: Calculates total work minutes
   */
  async clockOutWithID(employeeId: string, currentUserId: string) {
    const now = new Date();

    // Find the most recent attendance record for this employee
    // Query all records and find the one with an IN punch that hasn't been clocked out
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        employeeId,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!attendanceRecords || attendanceRecords.length === 0) {
      throw new Error('No attendance record found. Please clock in first.');
    }

    // Find the most recent record where the last punch is IN (not OUT)
    let attendanceRecord: any = null;
    for (const record of attendanceRecords) {
      if (record.punches && record.punches.length > 0) {
        const lastPunch = record.punches[record.punches.length - 1];
        if (lastPunch.type === PunchType.IN) {
          attendanceRecord = record;
          break;
        }
      }
    }

    if (!attendanceRecord) {
      throw new Error('No active clock-in found. Please clock in first.');
    }

    // Add clock-out punch
    attendanceRecord.punches.push({
      type: PunchType.OUT,
      time: now,
    });

    // BR-TM-07: Calculate total work minutes
    let totalMinutes = 0;
    for (let i = 0; i < attendanceRecord.punches.length; i += 2) {
      if (i + 1 < attendanceRecord.punches.length) {
        const inTime = attendanceRecord.punches[i].time.getTime();
        const outTime = attendanceRecord.punches[i + 1].time.getTime();
        totalMinutes += (outTime - inTime) / 60000;
      }
    }
    attendanceRecord.totalWorkMinutes = totalMinutes;
    attendanceRecord.updatedBy = currentUserId;

    const saved = await attendanceRecord.save();

    // BR-TM-06: Log audit trail
    await this.logAttendanceChange(
      employeeId,
      'CLOCK_OUT',
      {
        attendanceRecordId: saved._id,
        source: 'ID_CARD',
        totalWorkMinutes: totalMinutes,
        timestamp: now.toISOString(),
      },
      currentUserId,
    );

    return saved;
  }

  /**
   * Enhanced clock-in with full metadata
   * BR-TM-06: Captures source type (BIOMETRIC, WEB, MOBILE, MANUAL)
   * BR-TM-12: Tags with location, terminal ID, device
   */
  async clockInWithMetadata(
    employeeId: string,
    metadata: {
      source: 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
      deviceId?: string;
      terminalId?: string;
      location?: string;
      gpsCoordinates?: { lat: number; lng: number };
      ipAddress?: string;
    },
    currentUserId: string,
  ) {
    const now = new Date();

    // Create attendance record with metadata
    const attendanceRecord = new this.attendanceRecordModel({
      employeeId,
      punches: [
        {
          type: PunchType.IN,
          time: now,
        },
      ],
      totalWorkMinutes: 0,
      hasMissedPunch: false,
      finalisedForPayroll: false,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    const saved = await attendanceRecord.save();

    // BR-TM-06 & BR-TM-12: Log comprehensive audit trail
    await this.logAttendanceChange(
      employeeId,
      'CLOCK_IN_WITH_METADATA',
      {
        attendanceRecordId: saved._id,
        source: metadata.source,
        deviceId: metadata.deviceId,
        terminalId: metadata.terminalId,
        location: metadata.location,
        gpsCoordinates: metadata.gpsCoordinates,
        ipAddress: metadata.ipAddress,
        timestamp: now.toISOString(),
      },
      currentUserId,
    );

    return {
      attendanceRecord: saved,
      metadata: {
        source: metadata.source,
        deviceId: metadata.deviceId,
        terminalId: metadata.terminalId,
        location: metadata.location,
        capturedAt: now,
      },
    };
  }

  /**
   * Enhanced clock-out with full metadata
   * BR-TM-06: Captures source type with audit trail
   * BR-TM-12: Tags with location, terminal ID, device
   */
  async clockOutWithMetadata(
    employeeId: string,
    metadata: {
      source: 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
      deviceId?: string;
      terminalId?: string;
      location?: string;
      gpsCoordinates?: { lat: number; lng: number };
      ipAddress?: string;
    },
    currentUserId: string,
  ) {
    const now = new Date();

    // Find active clock-in
    const attendanceRecords = await this.attendanceRecordModel
      .find({ employeeId })
      .sort({ createdAt: -1 })
      .exec();

    if (!attendanceRecords || attendanceRecords.length === 0) {
      throw new Error('No attendance record found. Please clock in first.');
    }

    let attendanceRecord: any = null;
    for (const record of attendanceRecords) {
      if (record.punches && record.punches.length > 0) {
        const lastPunch = record.punches[record.punches.length - 1];
        if (lastPunch.type === PunchType.IN) {
          attendanceRecord = record;
          break;
        }
      }
    }

    if (!attendanceRecord) {
      throw new Error('No active clock-in found. Please clock in first.');
    }

    // Add clock-out punch
    attendanceRecord.punches.push({
      type: PunchType.OUT,
      time: now,
    });

    // Calculate total work minutes
    let totalMinutes = 0;
    for (let i = 0; i < attendanceRecord.punches.length; i += 2) {
      if (i + 1 < attendanceRecord.punches.length) {
        const inTime = attendanceRecord.punches[i].time.getTime();
        const outTime = attendanceRecord.punches[i + 1].time.getTime();
        totalMinutes += (outTime - inTime) / 60000;
      }
    }
    attendanceRecord.totalWorkMinutes = totalMinutes;
    attendanceRecord.updatedBy = currentUserId;

    const saved = await attendanceRecord.save();

    // BR-TM-06 & BR-TM-12: Log comprehensive audit trail
    await this.logAttendanceChange(
      employeeId,
      'CLOCK_OUT_WITH_METADATA',
      {
        attendanceRecordId: saved._id,
        source: metadata.source,
        deviceId: metadata.deviceId,
        terminalId: metadata.terminalId,
        location: metadata.location,
        gpsCoordinates: metadata.gpsCoordinates,
        ipAddress: metadata.ipAddress,
        totalWorkMinutes: totalMinutes,
        timestamp: now.toISOString(),
      },
      currentUserId,
    );

    return {
      attendanceRecord: saved,
      metadata: {
        source: metadata.source,
        deviceId: metadata.deviceId,
        terminalId: metadata.terminalId,
        location: metadata.location,
        capturedAt: now,
      },
      totalWorkMinutes: totalMinutes,
      totalWorkHours: Math.round((totalMinutes / 60) * 100) / 100,
    };
  }

  /**
   * Validate clock-in against assigned shift and rest days
   * US5 Flow: Clocks in/out using ID validating against assigned shifts and rest days
   * Now includes holiday and vacation checks using LeavesService
   */
  async validateClockInAgainstShift(
    employeeId: string,
    currentUserId: string,
  ) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if today is a holiday or rest day using LeavesService
    const holidayCheck = await this.checkIfHolidayOrRestDay(today);
    
    // Check if employee is on vacation using LeavesService
    const vacationCheck = await this.checkIfEmployeeOnVacation(employeeId, today);
    
    // Find active shift assignments for this employee
    const shiftAssignments = await this.shiftAssignmentModel
      .find({
        employeeId,
        status: 'APPROVED',
        startDate: { $lte: today },
        $or: [
          { endDate: { $gte: today } },
          { endDate: null }, // Ongoing assignments
        ],
      })
      .populate('shiftId')
      .exec();

    if (shiftAssignments.length === 0) {
      return {
        isValid: false,
        message: 'No active shift assignment found for today',
        allowClockIn: true, // Still allow, but flag it
        warning: 'Employee has no assigned shift for today',
        holidayInfo: holidayCheck,
        vacationInfo: vacationCheck ? {
          isOnVacation: true,
          leaveType: vacationCheck.leaveTypeId,
          dates: vacationCheck.dates,
        } : { isOnVacation: false },
      };
    }

    const assignment = shiftAssignments[0] as any;
    const shift = assignment.shiftId;

    if (!shift) {
      return {
        isValid: false,
        message: 'Shift details not found',
        allowClockIn: true,
        warning: 'Shift information is missing',
        holidayInfo: holidayCheck,
        vacationInfo: vacationCheck ? {
          isOnVacation: true,
          leaveType: vacationCheck.leaveTypeId,
          dates: vacationCheck.dates,
        } : { isOnVacation: false },
      };
    }

    // Parse shift times
    const shiftStartMinutes = this.timeStringToMinutes(shift.startTime);
    const shiftEndMinutes = this.timeStringToMinutes(shift.endTime);
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    // Check if within grace period (allow early/late based on shift config)
    const graceIn = shift.graceInMinutes || 0;
    const graceOut = shift.graceOutMinutes || 0;

    const isWithinStartWindow = 
      currentMinutes >= (shiftStartMinutes - 30) && // 30 min early allowed
      currentMinutes <= (shiftStartMinutes + graceIn);

    const isLate = currentMinutes > (shiftStartMinutes + graceIn);

    // If it's a holiday or rest day, suppress penalties
    const shouldSuppressPenalty = holidayCheck.isHoliday || holidayCheck.isRestDay;

    return {
      isValid: true,
      shiftName: shift.name,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      currentTime: `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`,
      isWithinStartWindow,
      isLate,
      lateByMinutes: isLate ? currentMinutes - shiftStartMinutes - graceIn : 0,
      graceInMinutes: graceIn,
      graceOutMinutes: graceOut,
      allowClockIn: true,
      message: isLate 
        ? `Late clock-in. You are ${currentMinutes - shiftStartMinutes - graceIn} minutes late.`
        : 'Clock-in validated successfully',
      // Holiday and rest day information from LeavesService
      holidayInfo: holidayCheck,
      // Vacation information from LeavesService
      vacationInfo: vacationCheck ? {
        isOnVacation: true,
        leaveType: vacationCheck.leaveTypeId,
        dates: vacationCheck.dates,
      } : { isOnVacation: false },
      // Penalty suppression based on holiday/rest day
      penaltySuppression: {
        suppress: shouldSuppressPenalty,
        reason: shouldSuppressPenalty 
          ? (holidayCheck.isHoliday ? `Holiday: ${holidayCheck.holidayName}` : `Rest day: ${holidayCheck.dayName}`)
          : 'Standard attendance rules apply',
      },
    };
  }

  /**
   * Get employee's attendance status for today
   * Returns current clock-in/out status and work summary
   */
  async getEmployeeAttendanceStatus(employeeId: string, currentUserId: string) {
    const now = new Date();
    const todayStart = this.convertDateToUTCStart(now);
    const todayEnd = this.convertDateToUTCEnd(now);

    // Find today's attendance records
    const todayRecords = await this.attendanceRecordModel
      .find({
        employeeId,
        createdAt: { $gte: todayStart, $lte: todayEnd },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (todayRecords.length === 0) {
      return {
        status: 'NOT_CLOCKED_IN',
        message: 'No attendance record for today',
        records: [],
      };
    }

    const latestRecord = todayRecords[0];
    const lastPunch = latestRecord.punches[latestRecord.punches.length - 1];
    const isClockedIn = lastPunch?.type === PunchType.IN;

    // Calculate total work time today
    let totalMinutesToday = 0;
    for (const record of todayRecords) {
      totalMinutesToday += record.totalWorkMinutes || 0;
    }

    // If currently clocked in, add time since last punch
    if (isClockedIn && lastPunch) {
      const minutesSinceLastPunch = (now.getTime() - lastPunch.time.getTime()) / 60000;
      totalMinutesToday += minutesSinceLastPunch;
    }

    return {
      status: isClockedIn ? 'CLOCKED_IN' : 'CLOCKED_OUT',
      lastPunchTime: lastPunch?.time,
      lastPunchType: lastPunch?.type,
      totalMinutesToday: Math.round(totalMinutesToday),
      totalHoursToday: Math.round((totalMinutesToday / 60) * 100) / 100,
      recordCount: todayRecords.length,
      punchCount: todayRecords.reduce((sum, r) => sum + r.punches.length, 0),
      records: todayRecords.map(r => ({
        id: r._id,
        punches: r.punches,
        totalWorkMinutes: r.totalWorkMinutes,
        hasMissedPunch: r.hasMissedPunch,
      })),
    };
  }

  // 2. Create a new attendance record
  async createAttendanceRecord(
    createAttendanceRecordDto: any,
    currentUserId: string,
  ) {
    const newAttendanceRecord = new this.attendanceRecordModel({
      ...createAttendanceRecordDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newAttendanceRecord.save();
  }

  // // 3. Get attendance record by employee (optional filter by date)
  // async getAttendanceRecordByEmployee(employeeId: string, getAttendanceRecordDto: any, currentUserId: string) {
  //   const { startDate, endDate } = getAttendanceRecordDto;
  //   const query: any = { employeeId };

  //   if (startDate && endDate) {
  //     query.date = { $gte: startDate, $lte: endDate };
  //   }

  //   return this.attendanceRecordModel.find(query).exec();
  // }

  // 4. Update an attendance record (add missed punches or corrections)
  async updateAttendanceRecord(
    id: string,
    updateAttendanceRecordDto: any,
    currentUserId: string,
  ) {
    return this.attendanceRecordModel.findByIdAndUpdate(
      id,
      {
        ...updateAttendanceRecordDto,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 5. Submit a correction request for an attendance record
  async submitAttendanceCorrectionRequest(
    submitCorrectionRequestDto: any,
    currentUserId: string,
  ) {
    const newCorrectionRequest = new this.correctionRequestModel({
      employeeId: submitCorrectionRequestDto.employeeId,
      attendanceRecord: submitCorrectionRequestDto.attendanceRecord,
      reason: submitCorrectionRequestDto.reason,
      status:
        submitCorrectionRequestDto.status || CorrectionRequestStatus.SUBMITTED,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newCorrectionRequest.save();
  }

  // // 6. Get all correction requests by employee (filter by status if needed)
  // async getAttendanceCorrectionRequestsByEmployee(employeeId: string, getCorrectionsDto: any, currentUserId: string) {
  //   const { status } = getCorrectionsDto;
  //   const query: any = { employeeId };

  //   if (status) {
  //     query.status = status;
  //   }

  //   return this.correctionRequestModel.find(query).exec();
  // }

  // 7. Get all correction requests (for review by managers/admins)
  async getAllCorrectionRequests(
    getAllCorrectionsDto: any,
    currentUserId: string,
  ) {
    const { status, employeeId } = getAllCorrectionsDto;
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    return this.correctionRequestModel
      .find(query)
      .populate('attendanceRecord')
      .populate('employeeId')
      .exec();
  }

  // 8. Approve a correction request
  async approveCorrectionRequest(
    approveCorrectionRequestDto: any,
    currentUserId: string,
  ) {
    const { correctionRequestId, reason } = approveCorrectionRequestDto;
    const correctionRequest = await this.correctionRequestModel
      .findByIdAndUpdate(
        correctionRequestId,
        {
          status: CorrectionRequestStatus.APPROVED,
          ...(reason && { reason }),
          updatedBy: currentUserId,
        },
        { new: true },
      )
      .exec();

    if (!correctionRequest) {
      throw new Error('Correction request not found');
    }

    return correctionRequest;
  }

  // 9. Reject a correction request
  async rejectCorrectionRequest(
    rejectCorrectionRequestDto: any,
    currentUserId: string,
  ) {
    const { correctionRequestId, reason } = rejectCorrectionRequestDto;
    const correctionRequest = await this.correctionRequestModel
      .findByIdAndUpdate(
        correctionRequestId,
        {
          status: CorrectionRequestStatus.REJECTED,
          ...(reason && { reason }),
          updatedBy: currentUserId,
        },
        { new: true },
      )
      .exec();

    if (!correctionRequest) {
      throw new Error('Correction request not found');
    }

    return correctionRequest;
  }

  // ===== US13: ATTENDANCE CORRECTION REQUESTS (BR-TM-15) =====

  /**
   * Get correction requests by employee
   * BR-TM-15: Employees must be able to track their own correction requests
   */
  async getCorrectionRequestsByEmployee(
    params: {
      employeeId: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    currentUserId: string,
  ) {
    const { employeeId, status, startDate, endDate } = params;
    
    const query: any = { employeeId };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }
    
    const requests = await this.correctionRequestModel
      .find(query)
      .populate('attendanceRecord')
      .sort({ createdAt: -1 })
      .exec();
    
    // Group by status for summary
    const summary = {
      total: requests.length,
      submitted: requests.filter(r => r.status === CorrectionRequestStatus.SUBMITTED).length,
      inReview: requests.filter(r => r.status === CorrectionRequestStatus.IN_REVIEW).length,
      approved: requests.filter(r => r.status === CorrectionRequestStatus.APPROVED).length,
      rejected: requests.filter(r => r.status === CorrectionRequestStatus.REJECTED).length,
    };
    
    return {
      employeeId,
      summary,
      requests: requests.map(req => ({
        id: (req as any)._id,
        status: req.status,
        reason: req.reason,
        attendanceRecord: req.attendanceRecord,
        createdAt: (req as any).createdAt,
      })),
    };
  }

  /**
   * Get correction request by ID
   * BR-TM-15: View detailed correction request information
   */
  async getCorrectionRequestById(
    requestId: string,
    currentUserId: string,
  ) {
    const request = await this.correctionRequestModel
      .findById(requestId)
      .populate('attendanceRecord')
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .exec();
    
    if (!request) {
      return {
        success: false,
        message: 'Correction request not found',
      };
    }
    
    return {
      success: true,
      request: {
        id: (request as any)._id,
        employeeId: request.employeeId,
        status: request.status,
        reason: request.reason,
        attendanceRecord: request.attendanceRecord,
        createdAt: (request as any).createdAt,
        updatedAt: (request as any).updatedAt,
      },
    };
  }

  /**
   * Escalate correction request to manager/HR
   * BR-TM-15: Route correction requests for approval
   */
  async escalateCorrectionRequest(
    params: {
      requestId: string;
      escalateTo: 'LINE_MANAGER' | 'HR_ADMIN' | 'HR_MANAGER';
      reason?: string;
    },
    currentUserId: string,
  ) {
    const { requestId, escalateTo, reason } = params;
    
    const request = await this.correctionRequestModel.findById(requestId).exec();
    
    if (!request) {
      return {
        success: false,
        message: 'Correction request not found',
      };
    }
    
    // Update status to escalated
    request.status = CorrectionRequestStatus.ESCALATED;
    if (reason) {
      request.reason = `${request.reason || ''}\n\n[ESCALATED - ${new Date().toISOString()}]\nEscalated to: ${escalateTo}\nReason: ${reason}`;
    }
    (request as any).updatedBy = currentUserId;
    
    await request.save();
    
    // Log the escalation
    await this.logTimeManagementChange(
      'CORRECTION_REQUEST_ESCALATED',
      {
        requestId,
        employeeId: request.employeeId,
        escalateTo,
        reason,
      },
      currentUserId,
    );
    
    return {
      success: true,
      message: `Correction request escalated to ${escalateTo}`,
      request: {
        id: requestId,
        status: request.status,
        escalatedTo: escalateTo,
        escalatedAt: new Date(),
      },
    };
  }

  /**
   * Cancel/withdraw correction request
   * BR-TM-15: Employee can withdraw pending requests
   */
  async cancelCorrectionRequest(
    params: {
      requestId: string;
      reason?: string;
    },
    currentUserId: string,
  ) {
    const { requestId, reason } = params;
    
    const request = await this.correctionRequestModel.findById(requestId).exec();
    
    if (!request) {
      return {
        success: false,
        message: 'Correction request not found',
      };
    }
    
    // Only allow cancellation of pending requests
    if (request.status !== CorrectionRequestStatus.SUBMITTED && 
        request.status !== CorrectionRequestStatus.IN_REVIEW) {
      return {
        success: false,
        message: `Cannot cancel request with status: ${request.status}`,
      };
    }
    
    const previousStatus = request.status;
    
    // Use rejected status to indicate cancelled (no separate enum value)
    request.status = CorrectionRequestStatus.REJECTED;
    request.reason = `${request.reason || ''}\n\n[CANCELLED BY EMPLOYEE - ${new Date().toISOString()}]\nReason: ${reason || 'No reason provided'}`;
    (request as any).updatedBy = currentUserId;
    
    await request.save();
    
    return {
      success: true,
      message: 'Correction request cancelled',
      request: {
        id: requestId,
        previousStatus,
        newStatus: 'CANCELLED',
        cancelledAt: new Date(),
      },
    };
  }

  /**
   * Get pending correction requests for manager approval
   * BR-TM-15: Routed to Line Manager for approval
   */
  async getPendingCorrectionRequestsForManager(
    params: {
      managerId?: string;
      departmentId?: string;
      limit?: number;
    },
    currentUserId: string,
  ) {
    const { limit = 50 } = params;
    
    // Get all pending correction requests
    const pendingRequests = await this.correctionRequestModel
      .find({
        status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW, CorrectionRequestStatus.ESCALATED] },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .populate('attendanceRecord')
      .sort({ createdAt: 1 }) // Oldest first
      .limit(limit)
      .exec();
    
    // Group by status
    const byStatus = {
      submitted: pendingRequests.filter(r => r.status === CorrectionRequestStatus.SUBMITTED),
      inReview: pendingRequests.filter(r => r.status === CorrectionRequestStatus.IN_REVIEW),
      escalated: pendingRequests.filter(r => r.status === CorrectionRequestStatus.ESCALATED),
    };
    
    return {
      summary: {
        total: pendingRequests.length,
        submitted: byStatus.submitted.length,
        inReview: byStatus.inReview.length,
        escalated: byStatus.escalated.length,
      },
      requests: pendingRequests.map(req => ({
        id: (req as any)._id,
        employee: req.employeeId,
        status: req.status,
        reason: req.reason,
        attendanceRecord: req.attendanceRecord,
        createdAt: (req as any).createdAt,
        waitingDays: Math.floor((Date.now() - new Date((req as any).createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      byStatus,
    };
  }

  /**
   * Mark correction request as in-review
   * BR-TM-15: Workflow status transition
   */
  async markCorrectionRequestInReview(
    requestId: string,
    currentUserId: string,
  ) {
    const request = await this.correctionRequestModel.findById(requestId).exec();
    
    if (!request) {
      return {
        success: false,
        message: 'Correction request not found',
      };
    }
    
    if (request.status !== CorrectionRequestStatus.SUBMITTED) {
      return {
        success: false,
        message: `Cannot mark as in-review: current status is ${request.status}`,
      };
    }
    
    request.status = CorrectionRequestStatus.IN_REVIEW;
    (request as any).updatedBy = currentUserId;
    
    await request.save();
    
    return {
      success: true,
      message: 'Correction request marked as in-review',
      request: {
        id: requestId,
        status: request.status,
        reviewStartedAt: new Date(),
        reviewedBy: currentUserId,
      },
    };
  }

  /**
   * Get correction request statistics
   * BR-TM-15: Summary for HR/payroll reporting
   */
  async getCorrectionRequestStatistics(
    params: {
      startDate?: Date;
      endDate?: Date;
      departmentId?: string;
    },
    currentUserId: string,
  ) {
    const { startDate, endDate } = params;
    
    const query: any = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }
    
    const allRequests = await this.correctionRequestModel.find(query).exec();
    
    // Calculate statistics
    const totalRequests = allRequests.length;
    const byStatus = {
      submitted: allRequests.filter(r => r.status === CorrectionRequestStatus.SUBMITTED).length,
      inReview: allRequests.filter(r => r.status === CorrectionRequestStatus.IN_REVIEW).length,
      approved: allRequests.filter(r => r.status === CorrectionRequestStatus.APPROVED).length,
      rejected: allRequests.filter(r => r.status === CorrectionRequestStatus.REJECTED).length,
      escalated: allRequests.filter(r => r.status === CorrectionRequestStatus.ESCALATED).length,
    };
    
    // Approval rate
    const decidedRequests = byStatus.approved + byStatus.rejected;
    const approvalRate = decidedRequests > 0 
      ? Math.round((byStatus.approved / decidedRequests) * 100) 
      : 0;
    
    // Pending rate
    const pendingRequests = byStatus.submitted + byStatus.inReview + byStatus.escalated;
    
    return {
      reportPeriod: {
        startDate: startDate || 'all time',
        endDate: endDate || 'now',
      },
      summary: {
        totalRequests,
        pendingRequests,
        decidedRequests,
        approvalRate: `${approvalRate}%`,
      },
      byStatus,
      recommendations: pendingRequests > 10 
        ? ['High number of pending requests - consider reviewing backlog']
        : ['Request processing is on track'],
      generatedAt: new Date(),
    };
  }

  // ===== TIME EXCEPTION SERVICE METHODS =====

  // 10. Create a new time exception (e.g., missed punch, overtime)
  async createTimeException(
    createTimeExceptionDto: any,
    currentUserId: string,
  ) {
    const newTimeException = new this.timeExceptionModel({
      ...createTimeExceptionDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newTimeException.save();
  }

  // 11. Update a time exception status (approve, reject, etc.)
  async updateTimeException(
    id: string,
    updateTimeExceptionDto: any,
    currentUserId: string,
  ) {
    return this.timeExceptionModel.findByIdAndUpdate(
      id,
      {
        ...updateTimeExceptionDto,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 12. Get all time exceptions by employee (optional filter by status)
  async getTimeExceptionsByEmployee(
    employeeId: string,
    getTimeExceptionsDto: any,
    currentUserId: string,
  ) {
    const { status } = getTimeExceptionsDto;
    const query: any = { employeeId };

    if (status) {
      query.status = status;
    }

    return this.timeExceptionModel.find(query).exec();
  }

  // 13. Approve a time exception
  async approveTimeException(
    approveTimeExceptionDto: any,
    currentUserId: string,
  ) {
    const { timeExceptionId, approvalNotes } = approveTimeExceptionDto;
    const timeException = await this.timeExceptionModel.findById(timeExceptionId);
    
    if (!timeException) {
      throw new Error('Time exception not found');
    }

    const updateData: any = {
      status: 'APPROVED',
      updatedBy: currentUserId,
    };

    if (approvalNotes) {
      const existingReason = timeException.reason || '';
      updateData.reason = existingReason 
        ? `${existingReason} | Approved: ${approvalNotes}`
        : `Approved: ${approvalNotes}`;
    }

    return this.timeExceptionModel.findByIdAndUpdate(
      timeExceptionId,
      updateData,
      { new: true },
    );
  }

  // 14. Reject a time exception
  async rejectTimeException(
    rejectTimeExceptionDto: any,
    currentUserId: string,
  ) {
    const { timeExceptionId, rejectionReason } = rejectTimeExceptionDto;
    const timeException = await this.timeExceptionModel.findById(timeExceptionId);
    
    if (!timeException) {
      throw new Error('Time exception not found');
    }

    const updateData: any = {
      status: 'REJECTED',
      updatedBy: currentUserId,
    };

    if (rejectionReason) {
      const existingReason = timeException.reason || '';
      updateData.reason = existingReason 
        ? `${existingReason} | Rejected: ${rejectionReason}`
        : `Rejected: ${rejectionReason}`;
    }

    return this.timeExceptionModel.findByIdAndUpdate(
      timeExceptionId,
      updateData,
      { new: true },
    );
  }

  // 15. Escalate a time exception
  async escalateTimeException(
    escalateTimeExceptionDto: any,
    currentUserId: string,
  ) {
    const { timeExceptionId } = escalateTimeExceptionDto;
    return this.timeExceptionModel.findByIdAndUpdate(
      timeExceptionId,
      {
        status: 'ESCALATED',
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // ===== US6 ENHANCEMENTS: Time Exception Management =====
  // BR-TM-08: Exception types (MISSED_PUNCH, LATE, EARLY_LEAVE, SHORT_TIME, OVERTIME_REQUEST, MANUAL_ADJUSTMENT)
  // BR-TM-09: Exception approval workflows (Open → Pending → Approved/Rejected/Escalated → Resolved)

  // 16. Get all time exceptions with filters (for HR/Admin view)
  async getAllTimeExceptions(
    filters: {
      status?: string;
      type?: string;
      employeeId?: string;
      assignedTo?: string;
      startDate?: Date;
      endDate?: Date;
    },
    currentUserId: string,
  ) {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }

    return this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 17. Get time exception by ID
  async getTimeExceptionById(id: string, currentUserId: string) {
    const exception = await this.timeExceptionModel
      .findById(id)
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!exception) {
      throw new Error('Time exception not found');
    }

    return exception;
  }

  // 18. Resolve time exception (final status after action is completed)
  // BR-TM-09: Move to RESOLVED after approval action is completed
  async resolveTimeException(
    resolveTimeExceptionDto: { timeExceptionId: string; resolutionNotes?: string },
    currentUserId: string,
  ) {
    const { timeExceptionId, resolutionNotes } = resolveTimeExceptionDto;
    
    const exception = await this.timeExceptionModel.findById(timeExceptionId);
    if (!exception) {
      throw new Error('Time exception not found');
    }

    // BR-TM-09: Can only resolve if status is APPROVED
    if (exception.status !== TimeExceptionStatus.APPROVED) {
      throw new Error('Can only resolve exceptions that are APPROVED');
    }

    return this.timeExceptionModel.findByIdAndUpdate(
      timeExceptionId,
      {
        status: TimeExceptionStatus.RESOLVED,
        reason: resolutionNotes || exception.reason,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 19. Reassign time exception to a different handler
  // BR-TM-09: Support workflow reassignment
  async reassignTimeException(
    reassignDto: { timeExceptionId: string; newAssigneeId: string; reason?: string },
    currentUserId: string,
  ) {
    const { timeExceptionId, newAssigneeId, reason } = reassignDto;

    const exception = await this.timeExceptionModel.findById(timeExceptionId);
    if (!exception) {
      throw new Error('Time exception not found');
    }

    // Cannot reassign if already resolved or rejected
    if (exception.status === TimeExceptionStatus.RESOLVED || 
        exception.status === TimeExceptionStatus.REJECTED) {
      throw new Error('Cannot reassign resolved or rejected exceptions');
    }

    const updated = await this.timeExceptionModel.findByIdAndUpdate(
      timeExceptionId,
      {
        assignedTo: newAssigneeId,
        status: TimeExceptionStatus.PENDING, // Move to pending when reassigned
        reason: reason || exception.reason,
        updatedBy: currentUserId,
      },
      { new: true },
    );

    await this.logTimeManagementChange(
      'EXCEPTION_REASSIGNED',
      {
        timeExceptionId,
        previousAssignee: exception.assignedTo,
        newAssignee: newAssigneeId,
        reason,
      },
      currentUserId,
    );

    return updated;
  }

  // 20. Get exception statistics/summary
  // BR-TM-08: Track all exception types
  async getTimeExceptionStatistics(
    filters: { employeeId?: string; startDate?: Date; endDate?: Date },
    currentUserId: string,
  ) {
    const matchQuery: any = {};

    if (filters.employeeId) {
      matchQuery.employeeId = filters.employeeId;
    }
    if (filters.startDate && filters.endDate) {
      matchQuery.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }

    // Count by status
    const statusCounts = await this.timeExceptionModel.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Count by type (BR-TM-08)
    const typeCounts = await this.timeExceptionModel.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Total count
    const totalCount = await this.timeExceptionModel.countDocuments(matchQuery);

    // Pending count (Open + Pending)
    const pendingCount = await this.timeExceptionModel.countDocuments({
      ...matchQuery,
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
    });

    // Escalated count
    const escalatedCount = await this.timeExceptionModel.countDocuments({
      ...matchQuery,
      status: TimeExceptionStatus.ESCALATED,
    });

    return {
      total: totalCount,
      pending: pendingCount,
      escalated: escalatedCount,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byType: typeCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // 21. Bulk approve time exceptions
  // BR-TM-09: Support bulk operations for efficiency
  async bulkApproveTimeExceptions(
    exceptionIds: string[],
    currentUserId: string,
  ) {
    const results = {
      approved: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    for (const id of exceptionIds) {
      try {
        const exception = await this.timeExceptionModel.findById(id);
        if (!exception) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }

        if (exception.status === TimeExceptionStatus.APPROVED ||
            exception.status === TimeExceptionStatus.RESOLVED) {
          results.failed.push({ id, reason: 'Already approved/resolved' });
          continue;
        }

        await this.timeExceptionModel.findByIdAndUpdate(id, {
          status: TimeExceptionStatus.APPROVED,
          updatedBy: currentUserId,
        });
        results.approved.push(id);
      } catch (error) {
        results.failed.push({ id, reason: 'Update failed' });
      }
    }

    await this.logTimeManagementChange(
      'BULK_EXCEPTION_APPROVAL',
      { approvedCount: results.approved.length, failedCount: results.failed.length },
      currentUserId,
    );

    return results;
  }

  // 22. Bulk reject time exceptions
  async bulkRejectTimeExceptions(
    rejectDto: { exceptionIds: string[]; reason: string },
    currentUserId: string,
  ) {
    const { exceptionIds, reason } = rejectDto;
    const results = {
      rejected: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    for (const id of exceptionIds) {
      try {
        const exception = await this.timeExceptionModel.findById(id);
        if (!exception) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }

        if (exception.status === TimeExceptionStatus.REJECTED ||
            exception.status === TimeExceptionStatus.RESOLVED) {
          results.failed.push({ id, reason: 'Already rejected/resolved' });
          continue;
        }

        await this.timeExceptionModel.findByIdAndUpdate(id, {
          status: TimeExceptionStatus.REJECTED,
          reason: reason,
          updatedBy: currentUserId,
        });
        results.rejected.push(id);
      } catch (error) {
        results.failed.push({ id, reason: 'Update failed' });
      }
    }

    await this.logTimeManagementChange(
      'BULK_EXCEPTION_REJECTION',
      { rejectedCount: results.rejected.length, failedCount: results.failed.length },
      currentUserId,
    );

    return results;
  }

  // 23. Auto-create lateness exception when clock-in is late
  // BR-TM-08 & BR-TM-17: Auto-detect lateness and create exception
  async autoCreateLatenessException(
    employeeId: string,
    attendanceRecordId: string,
    assignedTo: string,
    lateMinutes: number,
    currentUserId: string,
  ) {
    const exception = new this.timeExceptionModel({
      employeeId,
      type: TimeExceptionType.LATE,
      attendanceRecordId,
      assignedTo,
      status: TimeExceptionStatus.OPEN,
      reason: `Auto-generated: Employee was ${lateMinutes} minutes late`,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    await exception.save();

    await this.logTimeManagementChange(
      'AUTO_LATENESS_EXCEPTION_CREATED',
      { employeeId, attendanceRecordId, lateMinutes },
      currentUserId,
    );

    return exception;
  }

  // 24. Auto-create early leave exception
  // BR-TM-08: Support EARLY_LEAVE exception type
  async autoCreateEarlyLeaveException(
    employeeId: string,
    attendanceRecordId: string,
    assignedTo: string,
    earlyMinutes: number,
    currentUserId: string,
  ) {
    const exception = new this.timeExceptionModel({
      employeeId,
      type: TimeExceptionType.EARLY_LEAVE,
      attendanceRecordId,
      assignedTo,
      status: TimeExceptionStatus.OPEN,
      reason: `Auto-generated: Employee left ${earlyMinutes} minutes early`,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    await exception.save();

    await this.logTimeManagementChange(
      'AUTO_EARLY_LEAVE_EXCEPTION_CREATED',
      { employeeId, attendanceRecordId, earlyMinutes },
      currentUserId,
    );

    return exception;
  }

  // 25. Get pending exceptions for a specific handler (assignedTo)
  // BR-TM-09: Support workflow - handlers see their assigned exceptions
  async getPendingExceptionsForHandler(assignedTo: string, currentUserId: string) {
    return this.timeExceptionModel
      .find({
        assignedTo,
        status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 26. Get escalated exceptions (for HR Manager view)
  // BR-TM-09 & BR-TM-15: View escalated exceptions requiring immediate attention
  async getEscalatedExceptions(currentUserId: string) {
    return this.timeExceptionModel
      .find({
        status: TimeExceptionStatus.ESCALATED,
      })
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ===== US14: TIME EXCEPTION APPROVAL WORKFLOW (BR-TM-01, BR-TM-19, BR-TM-20) =====

  /**
   * Auto-escalate exceptions that have been pending beyond threshold
   * BR-TM-20: Unreviewed employee requests must auto-escalate after a defined time
   */
  async autoEscalateOverdueExceptions(
    params: {
      thresholdDays: number;
      excludeTypes?: string[];
    },
    currentUserId: string,
  ) {
    const { thresholdDays, excludeTypes = [] } = params;
    
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
    
    const query: any = {
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
      createdAt: { $lte: thresholdDate },
    };
    
    if (excludeTypes.length > 0) {
      query.type = { $nin: excludeTypes };
    }
    
    const overdueExceptions = await this.timeExceptionModel.find(query).exec();
    
    const escalatedIds: string[] = [];
    const failedIds: string[] = [];
    
    for (const exception of overdueExceptions) {
      try {
        exception.status = TimeExceptionStatus.ESCALATED;
        (exception as any).reason = `${exception.reason || ''}\n\n[AUTO-ESCALATED - ${new Date().toISOString()}]\nReason: Pending for more than ${thresholdDays} days`;
        (exception as any).updatedBy = currentUserId;
        await exception.save();
        escalatedIds.push(String((exception as any)._id));
      } catch {
        failedIds.push(String((exception as any)._id));
      }
    }
    
    // Log the auto-escalation
    await this.logTimeManagementChange(
      'AUTO_ESCALATION_BATCH',
      {
        thresholdDays,
        totalOverdue: overdueExceptions.length,
        escalatedCount: escalatedIds.length,
        failedCount: failedIds.length,
      },
      currentUserId,
    );
    
    return {
      thresholdDays,
      thresholdDate,
      summary: {
        totalOverdue: overdueExceptions.length,
        escalated: escalatedIds.length,
        failed: failedIds.length,
      },
      escalatedIds,
      failedIds,
      executedAt: new Date(),
    };
  }

  /**
   * Get overdue/pending requests beyond deadline
   * BR-TM-20: Identify requests needing escalation
   */
  async getOverdueExceptions(
    params: {
      thresholdDays: number;
      status?: string[];
    },
    currentUserId: string,
  ) {
    const { thresholdDays, status = [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] } = params;
    
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
    
    const overdueExceptions = await this.timeExceptionModel
      .find({
        status: { $in: status },
        createdAt: { $lte: thresholdDate },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('attendanceRecordId')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: 1 }) // Oldest first
      .exec();
    
    return {
      thresholdDays,
      thresholdDate,
      totalOverdue: overdueExceptions.length,
      exceptions: overdueExceptions.map(exc => ({
        id: (exc as any)._id,
        employeeId: exc.employeeId,
        type: exc.type,
        status: exc.status,
        assignedTo: exc.assignedTo,
        reason: exc.reason,
        createdAt: (exc as any).createdAt,
        daysPending: Math.floor((Date.now() - new Date((exc as any).createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
  }

  /**
   * Get approval workflow configuration
   * BR-TM-01 & BR-TM-20: Escalation rules and thresholds
   */
  async getApprovalWorkflowConfig(currentUserId: string) {
    // Return standard escalation configuration
    // These could be made configurable via database in future
    return {
      escalationThresholds: {
        autoEscalateAfterDays: 3, // Auto-escalate after 3 days
        warningAfterDays: 2, // Show warning after 2 days
        criticalAfterDays: 5, // Mark as critical after 5 days
      },
      payrollCutoff: {
        escalateBeforeDays: 2, // Escalate 2 days before payroll cutoff
      },
      workflowStages: [
        { status: 'OPEN', description: 'New request, awaiting assignment', nextAction: 'Assign to handler' },
        { status: 'PENDING', description: 'Assigned, awaiting review', nextAction: 'Review and approve/reject' },
        { status: 'APPROVED', description: 'Request approved', nextAction: 'Resolve to complete' },
        { status: 'REJECTED', description: 'Request rejected', nextAction: 'No further action' },
        { status: 'ESCALATED', description: 'Escalated for urgent review', nextAction: 'Immediate HR review' },
        { status: 'RESOLVED', description: 'Completed', nextAction: 'Closed' },
      ],
      notificationSettings: {
        notifyOnAssignment: true,
        notifyOnStatusChange: true,
        notifyOnEscalation: true,
        reminderBeforeDeadlineDays: 1,
      },
    };
  }

  /**
   * Get approval workflow dashboard/summary for managers
   * BR-TM-01: Line Managers and HR approve or reject time management permissions
   */
  async getApprovalWorkflowDashboard(
    params: {
      managerId?: string;
      departmentId?: string;
    },
    currentUserId: string,
  ) {
    const config = await this.getApprovalWorkflowConfig(currentUserId);
    
    // Get counts by status
    const openCount = await this.timeExceptionModel.countDocuments({ status: TimeExceptionStatus.OPEN });
    const pendingCount = await this.timeExceptionModel.countDocuments({ status: TimeExceptionStatus.PENDING });
    const escalatedCount = await this.timeExceptionModel.countDocuments({ status: TimeExceptionStatus.ESCALATED });
    const approvedTodayCount = await this.timeExceptionModel.countDocuments({
      status: TimeExceptionStatus.APPROVED,
      updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const rejectedTodayCount = await this.timeExceptionModel.countDocuments({
      status: TimeExceptionStatus.REJECTED,
      updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    
    // Get overdue counts
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() - config.escalationThresholds.warningAfterDays);
    const warningCount = await this.timeExceptionModel.countDocuments({
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
      createdAt: { $lte: warningDate },
    });
    
    const criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() - config.escalationThresholds.criticalAfterDays);
    const criticalCount = await this.timeExceptionModel.countDocuments({
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
      createdAt: { $lte: criticalDate },
    });
    
    // Get pending for current user (if manager)
    let myPendingCount = 0;
    if (params.managerId) {
      myPendingCount = await this.timeExceptionModel.countDocuments({
        assignedTo: params.managerId,
        status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
      });
    }
    
    return {
      dashboard: {
        totalPending: openCount + pendingCount,
        open: openCount,
        pending: pendingCount,
        escalated: escalatedCount,
        approvedToday: approvedTodayCount,
        rejectedToday: rejectedTodayCount,
        myPending: myPendingCount,
      },
      alerts: {
        warning: warningCount,
        critical: criticalCount,
        requiresImmediate: escalatedCount,
      },
      config: config.escalationThresholds,
      generatedAt: new Date(),
    };
  }

  /**
   * Set deadline for exception review
   * BR-TM-20: Support deadline-based escalation
   */
  async setExceptionDeadline(
    params: {
      exceptionId: string;
      deadlineDate: Date;
      notifyBeforeDays?: number;
    },
    currentUserId: string,
  ) {
    const { exceptionId, deadlineDate, notifyBeforeDays = 1 } = params;
    
    const exception = await this.timeExceptionModel.findById(exceptionId).exec();
    
    if (!exception) {
      return {
        success: false,
        message: 'Time exception not found',
      };
    }
    
    // Update reason with deadline info (since schema doesn't have dedicated field)
    exception.reason = `${exception.reason || ''}\n\n[DEADLINE SET - ${new Date().toISOString()}]\nReview deadline: ${deadlineDate.toISOString()}\nNotify ${notifyBeforeDays} day(s) before`;
    (exception as any).updatedBy = currentUserId;
    
    await exception.save();
    
    return {
      success: true,
      message: 'Deadline set successfully',
      exception: {
        id: exceptionId,
        deadline: deadlineDate,
        notifyBeforeDays,
      },
    };
  }

  /**
   * Get requests approaching deadline
   * BR-TM-20: Identify requests needing action before deadline
   */
  async getRequestsApproachingDeadline(
    params: {
      withinDays: number;
      payrollCutoffDate?: Date;
    },
    currentUserId: string,
  ) {
    const { withinDays, payrollCutoffDate } = params;
    
    // Get all pending exceptions
    const pendingExceptions = await this.timeExceptionModel
      .find({
        status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('assignedTo', 'firstName lastName email')
      .exec();
    
    const now = new Date();
    const targetDate = payrollCutoffDate || new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    
    // Calculate days remaining for each
    const approaching = pendingExceptions.map(exc => {
      const createdAt = new Date((exc as any).createdAt);
      const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilPayroll = payrollCutoffDate 
        ? Math.floor((payrollCutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        id: (exc as any)._id,
        employee: exc.employeeId,
        type: exc.type,
        status: exc.status,
        assignedTo: exc.assignedTo,
        ageInDays,
        daysUntilPayroll,
        urgency: ageInDays >= 5 ? 'CRITICAL' : ageInDays >= 3 ? 'HIGH' : ageInDays >= 2 ? 'MEDIUM' : 'LOW',
      };
    });
    
    // Sort by urgency
    approaching.sort((a, b) => {
      const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
    
    return {
      withinDays,
      payrollCutoffDate,
      totalPending: approaching.length,
      byUrgency: {
        critical: approaching.filter(r => r.urgency === 'CRITICAL').length,
        high: approaching.filter(r => r.urgency === 'HIGH').length,
        medium: approaching.filter(r => r.urgency === 'MEDIUM').length,
        low: approaching.filter(r => r.urgency === 'LOW').length,
      },
      requests: approaching,
    };
  }

  // ===== US7: OVERTIME MANAGEMENT =====
  // BR-TM-13: Overtime calculation based on work hours exceeding standard hours
  // BR-TM-14: Overtime approval workflow (request → approve/reject)
  // BR-TM-18: Overtime rates and multipliers based on rules
  // BR-TM-19: Overtime reporting and tracking

  // 27. Request overtime approval
  // BR-TM-14: Employee/Manager requests overtime approval
  async requestOvertimeApproval(
    overtimeRequest: {
      employeeId: string;
      attendanceRecordId: string;
      requestedMinutes: number;
      reason: string;
      assignedTo: string;
    },
    currentUserId: string,
  ) {
    const { employeeId, attendanceRecordId, requestedMinutes, reason, assignedTo } = overtimeRequest;

    // Check if there's already a pending overtime request for this attendance record
    const existingRequest = await this.timeExceptionModel.findOne({
      employeeId,
      attendanceRecordId,
      type: TimeExceptionType.OVERTIME_REQUEST,
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
    });

    if (existingRequest) {
      throw new Error('An overtime request already exists for this attendance record');
    }

    const overtimeException = new this.timeExceptionModel({
      employeeId,
      type: TimeExceptionType.OVERTIME_REQUEST,
      attendanceRecordId,
      assignedTo,
      status: TimeExceptionStatus.PENDING,
      reason: `Overtime Request: ${requestedMinutes} minutes. Reason: ${reason}`,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    await overtimeException.save();

    await this.logTimeManagementChange(
      'OVERTIME_REQUEST_CREATED',
      { employeeId, attendanceRecordId, requestedMinutes, reason },
      currentUserId,
    );

    return overtimeException;
  }

  // 28. Calculate overtime from attendance record
  // BR-TM-13: Auto-detect overtime based on standard work hours
  async calculateOvertimeFromAttendance(
    attendanceRecordId: string,
    standardWorkMinutes: number = 480, // Default 8 hours
    currentUserId: string,
  ) {
    const attendanceRecord = await this.attendanceRecordModel.findById(attendanceRecordId);
    
    if (!attendanceRecord) {
      throw new Error('Attendance record not found');
    }

    const totalWorkMinutes = attendanceRecord.totalWorkMinutes || 0;
    const overtimeMinutes = Math.max(0, totalWorkMinutes - standardWorkMinutes);
    const isOvertime = overtimeMinutes > 0;

    return {
      attendanceRecordId,
      employeeId: attendanceRecord.employeeId,
      totalWorkMinutes,
      standardWorkMinutes,
      overtimeMinutes,
      overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
      isOvertime,
      requiresApproval: isOvertime, // BR-TM-14: Overtime typically requires approval
    };
  }

  // 29. Get employee overtime summary for a period
  // BR-TM-19: Track total overtime per employee
  async getEmployeeOvertimeSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    currentUserId: string,
  ) {
    const startDateUTC = this.convertDateToUTCStart(startDate);
    const endDateUTC = this.convertDateToUTCEnd(endDate);

    // Get all overtime exceptions for the employee in the period
    const overtimeExceptions = await this.timeExceptionModel
      .find({
        employeeId,
        type: TimeExceptionType.OVERTIME_REQUEST,
        createdAt: { $gte: startDateUTC, $lte: endDateUTC },
      })
      .populate('attendanceRecordId')
      .exec();

    // Calculate totals by status
    const approved = overtimeExceptions.filter(e => e.status === TimeExceptionStatus.APPROVED);
    const pending = overtimeExceptions.filter(e => 
      e.status === TimeExceptionStatus.OPEN || e.status === TimeExceptionStatus.PENDING
    );
    const rejected = overtimeExceptions.filter(e => e.status === TimeExceptionStatus.REJECTED);

    // Calculate total approved overtime minutes
    let totalApprovedMinutes = 0;
    for (const exception of approved) {
      const record = exception.attendanceRecordId as any;
      if (record && record.totalWorkMinutes) {
        const overtime = Math.max(0, record.totalWorkMinutes - 480);
        totalApprovedMinutes += overtime;
      }
    }

    return {
      employeeId,
      period: { startDate, endDate },
      summary: {
        totalRequests: overtimeExceptions.length,
        approvedRequests: approved.length,
        pendingRequests: pending.length,
        rejectedRequests: rejected.length,
        totalApprovedOvertimeMinutes: totalApprovedMinutes,
        totalApprovedOvertimeHours: Math.round((totalApprovedMinutes / 60) * 100) / 100,
      },
      requests: overtimeExceptions,
    };
  }

  // 30. Get all pending overtime requests (for HR/Manager view)
  // BR-TM-14: View pending overtime approval requests
  async getPendingOvertimeRequests(
    filters: { departmentId?: string; assignedTo?: string },
    currentUserId: string,
  ) {
    const query: any = {
      type: TimeExceptionType.OVERTIME_REQUEST,
      status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] },
    };

    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }

    return this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .populate('attendanceRecordId')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // 31. Approve overtime request
  // BR-TM-14: Approve overtime with optional notes
  async approveOvertimeRequest(
    overtimeRequestId: string,
    approvalNotes: string | undefined,
    currentUserId: string,
  ) {
    const overtimeRequest = await this.timeExceptionModel.findById(overtimeRequestId);
    
    if (!overtimeRequest) {
      throw new Error('Overtime request not found');
    }

    if (overtimeRequest.type !== TimeExceptionType.OVERTIME_REQUEST) {
      throw new Error('This is not an overtime request');
    }

    if (overtimeRequest.status === TimeExceptionStatus.APPROVED) {
      throw new Error('Overtime request is already approved');
    }

    const updatedReason = approvalNotes 
      ? `${overtimeRequest.reason} | Approved: ${approvalNotes}`
      : overtimeRequest.reason;

    const updated = await this.timeExceptionModel.findByIdAndUpdate(
      overtimeRequestId,
      {
        status: TimeExceptionStatus.APPROVED,
        reason: updatedReason,
        updatedBy: currentUserId,
      },
      { new: true },
    );

    await this.logTimeManagementChange(
      'OVERTIME_REQUEST_APPROVED',
      { overtimeRequestId, approvalNotes },
      currentUserId,
    );

    return updated;
  }

  // 32. Reject overtime request
  // BR-TM-14: Reject overtime with reason
  async rejectOvertimeRequest(
    overtimeRequestId: string,
    rejectionReason: string,
    currentUserId: string,
  ) {
    const overtimeRequest = await this.timeExceptionModel.findById(overtimeRequestId);
    
    if (!overtimeRequest) {
      throw new Error('Overtime request not found');
    }

    if (overtimeRequest.type !== TimeExceptionType.OVERTIME_REQUEST) {
      throw new Error('This is not an overtime request');
    }

    if (overtimeRequest.status === TimeExceptionStatus.REJECTED) {
      throw new Error('Overtime request is already rejected');
    }

    const updatedReason = `${overtimeRequest.reason} | Rejected: ${rejectionReason}`;

    const updated = await this.timeExceptionModel.findByIdAndUpdate(
      overtimeRequestId,
      {
        status: TimeExceptionStatus.REJECTED,
        reason: updatedReason,
        updatedBy: currentUserId,
      },
      { new: true },
    );

    await this.logTimeManagementChange(
      'OVERTIME_REQUEST_REJECTED',
      { overtimeRequestId, rejectionReason },
      currentUserId,
    );

    return updated;
  }

  // 33. Auto-detect and create overtime exception from attendance
  // BR-TM-13 & BR-TM-14: Automatically flag overtime for approval
  async autoDetectAndCreateOvertimeException(
    attendanceRecordId: string,
    standardWorkMinutes: number = 480,
    assignedTo: string,
    currentUserId: string,
  ) {
    const calculation = await this.calculateOvertimeFromAttendance(
      attendanceRecordId,
      standardWorkMinutes,
      currentUserId,
    );

    if (!calculation.isOvertime) {
      return { created: false, reason: 'No overtime detected', calculation };
    }

    // Check if overtime request already exists
    const existing = await this.timeExceptionModel.findOne({
      attendanceRecordId,
      type: TimeExceptionType.OVERTIME_REQUEST,
    });

    if (existing) {
      return { created: false, reason: 'Overtime request already exists', existingId: existing._id };
    }

    const overtimeException = await this.requestOvertimeApproval(
      {
        employeeId: calculation.employeeId.toString(),
        attendanceRecordId,
        requestedMinutes: calculation.overtimeMinutes,
        reason: `Auto-detected: ${calculation.overtimeMinutes} minutes (${calculation.overtimeHours} hours) overtime`,
        assignedTo,
      },
      currentUserId,
    );

    return { 
      created: true, 
      overtimeException,
      calculation,
    };
  }

  // 34. Get overtime statistics for a department/organization
  // BR-TM-19: Organizational overtime tracking
  async getOvertimeStatistics(
    filters: { startDate?: Date; endDate?: Date; departmentId?: string },
    currentUserId: string,
  ) {
    const query: any = {
      type: TimeExceptionType.OVERTIME_REQUEST,
    };

    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: this.convertDateToUTCStart(filters.startDate),
        $lte: this.convertDateToUTCEnd(filters.endDate),
      };
    }

    const allOvertimeRequests = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName departmentId')
      .populate('attendanceRecordId')
      .exec();

    // Calculate statistics
    const byStatus = {
      approved: 0,
      pending: 0,
      rejected: 0,
      escalated: 0,
    };

    let totalApprovedMinutes = 0;
    const employeeOvertime: Record<string, { name: string; minutes: number; count: number }> = {};

    for (const request of allOvertimeRequests) {
      // Count by status
      if (request.status === TimeExceptionStatus.APPROVED) {
        byStatus.approved++;
        const record = request.attendanceRecordId as any;
        if (record && record.totalWorkMinutes) {
          const overtime = Math.max(0, record.totalWorkMinutes - 480);
          totalApprovedMinutes += overtime;

          // Track per employee
          const empId = request.employeeId?.toString() || 'unknown';
          const emp = request.employeeId as any;
          const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'Unknown';
          if (!employeeOvertime[empId]) {
            employeeOvertime[empId] = { name: empName, minutes: 0, count: 0 };
          }
          employeeOvertime[empId].minutes += overtime;
          employeeOvertime[empId].count++;
        }
      } else if (request.status === TimeExceptionStatus.PENDING || request.status === TimeExceptionStatus.OPEN) {
        byStatus.pending++;
      } else if (request.status === TimeExceptionStatus.REJECTED) {
        byStatus.rejected++;
      } else if (request.status === TimeExceptionStatus.ESCALATED) {
        byStatus.escalated++;
      }
    }

    // Sort employees by overtime
    const topOvertimeEmployees = Object.entries(employeeOvertime)
      .map(([id, data]) => ({ employeeId: id, ...data, hours: Math.round((data.minutes / 60) * 100) / 100 }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalRequests: allOvertimeRequests.length,
        ...byStatus,
        totalApprovedOvertimeMinutes: totalApprovedMinutes,
        totalApprovedOvertimeHours: Math.round((totalApprovedMinutes / 60) * 100) / 100,
      },
      topOvertimeEmployees,
    };
  }

  // 35. Bulk process overtime requests
  // BR-TM-14: Efficiently approve/reject multiple requests
  async bulkProcessOvertimeRequests(
    action: 'approve' | 'reject',
    requestIds: string[],
    notes: string,
    currentUserId: string,
  ) {
    const results = {
      processed: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    for (const id of requestIds) {
      try {
        if (action === 'approve') {
          await this.approveOvertimeRequest(id, notes, currentUserId);
        } else {
          await this.rejectOvertimeRequest(id, notes, currentUserId);
        }
        results.processed.push(id);
      } catch (error: any) {
        results.failed.push({ id, reason: error.message || 'Processing failed' });
      }
    }

    await this.logTimeManagementChange(
      `BULK_OVERTIME_${action.toUpperCase()}`,
      { processedCount: results.processed.length, failedCount: results.failed.length },
      currentUserId,
    );

    return results;
  }

  // ===== TIME PERMISSION & ATTENDANCE ENHANCEMENTS =====

  async recordPunchWithMetadata(
    recordPunchWithMetadataDto: RecordPunchWithMetadataDto,
    currentUserId: string,
  ) {
    // Convert string dates to Date objects if they come as strings (when ValidationPipe is not configured)
    const punchesWithDates = recordPunchWithMetadataDto.punches.map(
      (punch) => ({
        type: punch.type as PunchType,
        time: punch.time instanceof Date ? punch.time : new Date(punch.time),
      }),
    );

    const attendanceRecord = new this.attendanceRecordModel({
      employeeId: recordPunchWithMetadataDto.employeeId,
      punches: punchesWithDates,
      totalWorkMinutes: this.calculateWorkMinutesFromPunches(punchesWithDates),
      hasMissedPunch: recordPunchWithMetadataDto.punches.length % 2 !== 0,
      finalisedForPayroll: false,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    await attendanceRecord.save();
    await this.logAttendanceChange(
      recordPunchWithMetadataDto.employeeId,
      'PUNCH_RECORDED',
      {
        attendanceRecordId: attendanceRecord._id,
        deviceId: recordPunchWithMetadataDto.deviceId,
        location: recordPunchWithMetadataDto.location,
        source: recordPunchWithMetadataDto.source ?? 'manual',
      },
      currentUserId,
    );

    return attendanceRecord;
  }

  async recordPunchFromDevice(
    recordPunchWithMetadataDto: RecordPunchWithMetadataDto,
    currentUserId: string,
  ) {
    return this.recordPunchWithMetadata(
      {
        ...recordPunchWithMetadataDto,
        source: recordPunchWithMetadataDto.source ?? 'device',
      },
      currentUserId,
    );
  }

  async enforcePunchPolicy(
    enforcePunchPolicyDto: EnforcePunchPolicyDto,
    currentUserId: string,
  ) {
    if (
      enforcePunchPolicyDto.policy === 'FIRST_LAST' &&
      enforcePunchPolicyDto.punches.length > 2
    ) {
      throw new Error('First/Last policy allows only two punches per period.');
    }

    const alternatingTypes = enforcePunchPolicyDto.punches.every(
      (punch, index, arr) => {
        if (index === 0) {
          return true;
        }
        return arr[index - 1].type !== punch.type;
      },
    );

    if (!alternatingTypes) {
      throw new Error('Punch sequence must alternate between IN and OUT.');
    }

    return { valid: true, policy: enforcePunchPolicyDto.policy };
  }

  async applyAttendanceRounding(
    applyAttendanceRoundingDto: ApplyAttendanceRoundingDto,
    currentUserId: string,
  ) {
    const attendanceRecord = await this.attendanceRecordModel.findById(
      applyAttendanceRoundingDto.attendanceRecordId,
    );
    if (!attendanceRecord) {
      throw new Error('Attendance record not found');
    }

    const roundedMinutes = this.roundMinutes(
      attendanceRecord.totalWorkMinutes,
      applyAttendanceRoundingDto.intervalMinutes,
      applyAttendanceRoundingDto.strategy,
    );
    attendanceRecord.totalWorkMinutes = roundedMinutes;
    (attendanceRecord as any).updatedBy = currentUserId;
    await attendanceRecord.save();
    await this.logAttendanceChange(
      attendanceRecord.employeeId.toString(),
      'ATTENDANCE_ROUNDED',
      {
        strategy: applyAttendanceRoundingDto.strategy,
        interval: applyAttendanceRoundingDto.intervalMinutes,
      },
      currentUserId,
    );

    return attendanceRecord;
  }

  async enforceShiftPunchPolicy(
    enforceShiftPunchPolicyDto: EnforceShiftPunchPolicyDto,
    currentUserId: string,
  ) {
    // Convert shift times to minutes (treating them as UTC times)
    const startMinutes = this.timeStringToMinutes(
      enforceShiftPunchPolicyDto.shiftStart,
    );
    const endMinutes = this.timeStringToMinutes(
      enforceShiftPunchPolicyDto.shiftEnd,
    );
    const allowEarly = enforceShiftPunchPolicyDto.allowEarlyMinutes ?? 0;
    const allowLate = enforceShiftPunchPolicyDto.allowLateMinutes ?? 0;

    enforceShiftPunchPolicyDto.punches.forEach((punch) => {
      // Convert string date to Date object if needed
      const punchTime =
        punch.time instanceof Date ? punch.time : new Date(punch.time);
      // Extract UTC hours and minutes for consistent timezone comparison
      const punchMinutes = this.dateToMinutesUTC(punchTime);
      if (punchMinutes < startMinutes - allowEarly) {
        throw new Error('Punch occurs before the allowed start window.');
      }
      if (punchMinutes > endMinutes + allowLate) {
        throw new Error('Punch occurs after the allowed end window.');
      }
    });

    return { valid: true };
  }

  async monitorRepeatedLateness(
    monitorRepeatedLatenessDto: MonitorRepeatedLatenessDto,
    currentUserId: string,
  ) {
    const latenessCount = await this.timeExceptionModel.countDocuments({
      employeeId: monitorRepeatedLatenessDto.employeeId,
      type: TimeExceptionType.LATE,
    });
    const exceeded = latenessCount >= monitorRepeatedLatenessDto.threshold;

    if (exceeded) {
      await this.triggerLatenessDisciplinary(
        {
          employeeId: monitorRepeatedLatenessDto.employeeId,
          action: 'AUTO_ESCALATION',
        },
        currentUserId,
      );
    }

    return {
      employeeId: monitorRepeatedLatenessDto.employeeId,
      count: latenessCount,
      threshold: monitorRepeatedLatenessDto.threshold,
      exceeded,
    };
  }

  async triggerLatenessDisciplinary(
    triggerLatenessDisciplinaryDto: TriggerLatenessDisciplinaryDto,
    currentUserId: string,
  ) {
    await this.logTimeManagementChange(
      'LATENESS_DISCIPLINARY',
      {
        employeeId: triggerLatenessDisciplinaryDto.employeeId,
        action: triggerLatenessDisciplinaryDto.action ?? 'MANUAL_TRIGGER',
      },
      currentUserId,
    );

    return { message: 'Disciplinary action logged.' };
  }

  // ===== US12: REPEATED LATENESS HANDLING (BR-TM-09, BR-TM-16) =====

  /**
   * Get detailed employee lateness history
   * BR-TM-09: Track lateness for disciplinary purposes
   */
  async getEmployeeLatenessHistory(
    params: {
      employeeId: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate, limit = 50 } = params;
    
    const query: any = {
      employeeId,
      type: TimeExceptionType.LATE,
    };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }
    
    const latenessRecords = await this.timeExceptionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    
    // Calculate summary statistics
    const totalOccurrences = latenessRecords.length;
    const totalLatenessMinutes = latenessRecords.reduce((sum, record) => {
      return sum + ((record as any).durationMinutes || 0);
    }, 0);
    
    return {
      employeeId,
      dateRange: {
        startDate: startDate || 'all time',
        endDate: endDate || 'now',
      },
      summary: {
        totalOccurrences,
        totalLatenessMinutes,
        averageLatenessMinutes: totalOccurrences > 0 
          ? Math.round(totalLatenessMinutes / totalOccurrences) 
          : 0,
      },
      records: latenessRecords.map(record => ({
        id: (record as any)._id,
        date: (record as any).createdAt,
        status: record.status,
        reason: record.reason,
      })),
    };
  }

  /**
   * Flag employee for repeated lateness
   * BR-TM-09: Create disciplinary flag for tracking
   */
  async flagEmployeeForRepeatedLateness(
    params: {
      employeeId: string;
      occurrenceCount: number;
      periodDays: number;
      severity: 'WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION';
      notes?: string;
    },
    currentUserId: string,
  ) {
    const { employeeId, occurrenceCount, periodDays, severity, notes } = params;
    
    // Create a time exception record to track the disciplinary flag
    // Using reason field since notes doesn't exist in schema
    // Using LATE type since DISCIPLINARY_FLAG is not in enum - this is for repeated lateness tracking
    const disciplinaryFlag = new this.timeExceptionModel({
      employeeId,
      type: TimeExceptionType.LATE,
      status: 'PENDING',
      reason: notes || `Repeated lateness disciplinary flag: ${occurrenceCount} occurrences in ${periodDays} days. Severity: ${severity}`,
      attendanceRecordId: employeeId, // Using employeeId as placeholder
      assignedTo: currentUserId,
    });
    
    await disciplinaryFlag.save();
    
    // Log the action
    await this.logTimeManagementChange(
      'LATENESS_FLAG_CREATED',
      {
        employeeId,
        occurrenceCount,
        periodDays,
        severity,
        flagId: (disciplinaryFlag as any)._id,
      },
      currentUserId,
    );
    
    return {
      success: true,
      message: 'Employee flagged for repeated lateness',
      flag: {
        id: (disciplinaryFlag as any)._id,
        employeeId,
        severity,
        occurrenceCount,
        periodDays,
        createdAt: new Date(),
        createdBy: currentUserId,
      },
      nextSteps: this.getDisciplinaryNextSteps(severity),
    };
  }

  /**
   * Helper: Get next steps based on severity
   */
  private getDisciplinaryNextSteps(severity: string): string[] {
    switch (severity) {
      case 'WARNING':
        return [
          'Issue verbal warning to employee',
          'Document conversation in HR system',
          'Set reminder for 30-day review',
        ];
      case 'WRITTEN_WARNING':
        return [
          'Prepare written warning letter',
          'Schedule meeting with employee and manager',
          'Have employee sign acknowledgment',
          'Set reminder for 60-day review',
        ];
      case 'FINAL_WARNING':
        return [
          'Prepare final warning documentation',
          'Involve HR representative in meeting',
          'Discuss Performance Improvement Plan (PIP)',
          'Set clear expectations and timeline',
        ];
      case 'SUSPENSION':
        return [
          'Prepare suspension notice',
          'Calculate suspension duration per policy',
          'Notify payroll for salary adjustment',
          'Schedule return-to-work meeting',
        ];
      default:
        return ['Review case with HR manager'];
    }
  }

  /**
   * Get all lateness disciplinary flags
   * BR-TM-09: Retrieve flagged employees for HR review
   */
  async getLatenesDisciplinaryFlags(
    params: {
      status?: 'PENDING' | 'RESOLVED' | 'ESCALATED';
      severity?: string;
      startDate?: Date;
      endDate?: Date;
    },
    currentUserId: string,
  ) {
    // Query for disciplinary flags - using LATE type with reason filter to identify disciplinary flags
    // Note: DISCIPLINARY_FLAG is not in enum, so we use LATE type and filter by reason containing "disciplinary flag"
    const query: any = {
      type: TimeExceptionType.LATE,
      reason: { $regex: /disciplinary flag/i }, // Filter to find disciplinary flags by reason text
    };
    
    if (params.status) {
      query.status = params.status;
    }
    
    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) query.createdAt.$gte = params.startDate;
      if (params.endDate) query.createdAt.$lte = params.endDate;
    }
    
    const flags = await this.timeExceptionModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    // Parse severity from reason for filtering
    const filteredFlags = params.severity 
      ? flags.filter(flag => (flag as any).reason?.includes(`Severity: ${params.severity}`))
      : flags;
    
    return {
      totalFlags: filteredFlags.length,
      filters: params,
      flags: filteredFlags.map(flag => ({
        id: (flag as any)._id,
        employeeId: flag.employeeId,
        status: flag.status,
        reason: flag.reason,
        createdAt: (flag as any).createdAt,
      })),
    };
  }

  /**
   * Analyze lateness patterns for an employee
   * BR-TM-09: Pattern analysis for identifying systemic issues
   */
  async analyzeLatenessPatterns(
    params: {
      employeeId: string;
      periodDays?: number;
    },
    currentUserId: string,
  ) {
    const { employeeId, periodDays = 90 } = params;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    const latenessRecords = await this.timeExceptionModel
      .find({
        employeeId,
        type: TimeExceptionType.LATE,
        createdAt: { $gte: startDate },
      })
      .exec();
    
    // Analyze by day of week
    const dayOfWeekAnalysis: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    latenessRecords.forEach(record => {
      const date = new Date((record as any).createdAt);
      const dayName = dayNames[date.getDay()];
      dayOfWeekAnalysis[dayName]++;
    });
    
    // Find patterns
    const mostFrequentDay = Object.entries(dayOfWeekAnalysis)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Weekly trend analysis
    const weeksAnalyzed = Math.ceil(periodDays / 7);
    const averagePerWeek = latenessRecords.length / weeksAnalyzed;
    
    // Trend detection (increasing/decreasing)
    const halfwayPoint = new Date();
    halfwayPoint.setDate(halfwayPoint.getDate() - periodDays / 2);
    
    const firstHalf = latenessRecords.filter(r => 
      new Date((r as any).createdAt) < halfwayPoint
    ).length;
    const secondHalf = latenessRecords.filter(r => 
      new Date((r as any).createdAt) >= halfwayPoint
    ).length;
    
    let trend = 'STABLE';
    if (secondHalf > firstHalf * 1.5) trend = 'INCREASING';
    else if (secondHalf < firstHalf * 0.5) trend = 'DECREASING';
    
    return {
      employeeId,
      analysisePeriod: {
        days: periodDays,
        startDate,
        endDate: new Date(),
      },
      summary: {
        totalOccurrences: latenessRecords.length,
        averagePerWeek: Math.round(averagePerWeek * 10) / 10,
        trend,
      },
      dayOfWeekAnalysis,
      patterns: {
        mostFrequentDay: mostFrequentDay[0],
        mostFrequentDayCount: mostFrequentDay[1],
        hasWeekendLateness: dayOfWeekAnalysis.Saturday > 0 || dayOfWeekAnalysis.Sunday > 0,
        hasStartOfWeekPattern: dayOfWeekAnalysis.Monday > (latenessRecords.length * 0.3),
        hasEndOfWeekPattern: dayOfWeekAnalysis.Friday > (latenessRecords.length * 0.3),
      },
      recommendation: this.getLatenessPatternRecommendation(trend, averagePerWeek, mostFrequentDay[0]),
    };
  }

  /**
   * Helper: Get recommendation based on patterns
   */
  private getLatenessPatternRecommendation(
    trend: string, 
    avgPerWeek: number, 
    mostFrequentDay: string
  ): string {
    if (trend === 'INCREASING' && avgPerWeek > 2) {
      return 'Urgent: Schedule immediate meeting with employee and HR. Consider Performance Improvement Plan.';
    }
    if (trend === 'INCREASING') {
      return 'Schedule follow-up meeting to discuss lateness pattern and identify root causes.';
    }
    if (mostFrequentDay === 'Monday') {
      return 'Consider discussing work-life balance; Monday pattern may indicate weekend recovery issues.';
    }
    if (mostFrequentDay === 'Friday') {
      return 'Friday lateness may indicate early weekend mindset; discuss expectations.';
    }
    if (avgPerWeek < 0.5) {
      return 'Lateness is minimal. Continue monitoring but no immediate action required.';
    }
    return 'Continue monitoring and provide regular feedback to employee.';
  }

  /**
   * Get lateness trend report for department/organization
   * BR-TM-09: Organizational-level lateness tracking
   */
  async getLatenessTrendReport(
    params: {
      departmentId?: string;
      startDate: Date;
      endDate: Date;
      groupBy?: 'day' | 'week' | 'month';
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, groupBy = 'week' } = params;
    
    const query: any = {
      type: TimeExceptionType.LATE,
      createdAt: { $gte: startDate, $lte: endDate },
    };
    
    const latenessRecords = await this.timeExceptionModel
      .find(query)
      .sort({ createdAt: 1 })
      .exec();
    
    // Group records by time period
    const groupedData: Record<string, { count: number; employees: Set<string> }> = {};
    
    latenessRecords.forEach(record => {
      const date = new Date((record as any).createdAt);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week of ${weekStart.toISOString().split('T')[0]}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = { count: 0, employees: new Set() };
      }
      groupedData[key].count++;
      groupedData[key].employees.add(String(record.employeeId));
    });
    
    // Convert to array format
    const trendData = Object.entries(groupedData).map(([period, data]) => ({
      period,
      occurrences: data.count,
      uniqueEmployees: data.employees.size,
    }));
    
    // Calculate totals
    const totalOccurrences = latenessRecords.length;
    const uniqueEmployees = new Set(latenessRecords.map(r => String(r.employeeId))).size;
    
    return {
      reportPeriod: { startDate, endDate },
      groupBy,
      summary: {
        totalOccurrences,
        uniqueEmployeesAffected: uniqueEmployees,
        averagePerPeriod: Math.round((totalOccurrences / trendData.length) * 10) / 10 || 0,
      },
      trends: trendData,
      generatedAt: new Date(),
      generatedBy: currentUserId,
    };
  }

  /**
   * Resolve/clear a disciplinary flag
   * BR-TM-09: Mark flags as resolved after corrective action
   */
  async resolveDisciplinaryFlag(
    params: {
      flagId: string;
      resolution: 'RESOLVED' | 'ESCALATED' | 'DISMISSED';
      resolutionNotes: string;
    },
    currentUserId: string,
  ) {
    const { flagId, resolution, resolutionNotes } = params;
    
    const flag = await this.timeExceptionModel.findById(flagId).exec();
    
    if (!flag) {
      return {
        success: false,
        message: 'Disciplinary flag not found',
      };
    }
    
    const previousStatus = flag.status;
    
    flag.status = resolution as any;
    (flag as any).reason = `${flag.reason || ''}\n\n[RESOLUTION - ${new Date().toISOString()}]\nStatus: ${resolution}\nNotes: ${resolutionNotes}\nResolved by: ${currentUserId}`;
    (flag as any).updatedBy = currentUserId;
    
    await flag.save();
    
    // Log the resolution
    await this.logTimeManagementChange(
      'LATENESS_FLAG_RESOLVED',
      {
        flagId,
        employeeId: flag.employeeId,
        previousStatus,
        newStatus: resolution,
        resolutionNotes,
      },
      currentUserId,
    );
    
    return {
      success: true,
      message: `Disciplinary flag ${resolution.toLowerCase()}`,
      flag: {
        id: flagId,
        employeeId: flag.employeeId,
        previousStatus,
        newStatus: resolution,
        resolvedAt: new Date(),
        resolvedBy: currentUserId,
      },
    };
  }

  /**
   * Get employees with repeated lateness exceeding thresholds
   * BR-TM-09: Identify repeat offenders for HR review
   */
  async getRepeatedLatenessOffenders(
    params: {
      threshold: number;
      periodDays: number;
      includeResolved?: boolean;
    },
    currentUserId: string,
  ) {
    const { threshold, periodDays, includeResolved = false } = params;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // Aggregate lateness by employee
    const latenessRecords = await this.timeExceptionModel
      .find({
        type: TimeExceptionType.LATE,
        createdAt: { $gte: startDate },
      })
      .exec();
    
    // Count by employee
    const employeeCounts: Record<string, { count: number; records: any[] }> = {};
    
    latenessRecords.forEach(record => {
      const empId = String(record.employeeId);
      if (!employeeCounts[empId]) {
        employeeCounts[empId] = { count: 0, records: [] };
      }
      employeeCounts[empId].count++;
      employeeCounts[empId].records.push({
        id: (record as any)._id,
        date: (record as any).createdAt,
        status: record.status,
      });
    });
    
    // Filter by threshold
    const offenders = Object.entries(employeeCounts)
      .filter(([, data]) => data.count >= threshold)
      .map(([employeeId, data]) => ({
        employeeId,
        occurrenceCount: data.count,
        exceedsThresholdBy: data.count - threshold,
        recentRecords: data.records.slice(0, 5),
        severity: this.calculateLatenesSeverity(data.count, threshold),
      }))
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    
    return {
      analysePeriod: {
        startDate,
        endDate: new Date(),
        days: periodDays,
      },
      threshold,
      summary: {
        totalOffenders: offenders.length,
        totalOccurrences: offenders.reduce((sum, o) => sum + o.occurrenceCount, 0),
      },
      offenders,
      generatedAt: new Date(),
    };
  }

  /**
   * Helper: Calculate severity based on occurrence count
   */
  private calculateLatenesSeverity(count: number, threshold: number): string {
    const ratio = count / threshold;
    if (ratio >= 3) return 'CRITICAL';
    if (ratio >= 2) return 'HIGH';
    if (ratio >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  async scheduleTimeDataBackup(currentUserId: string) {
    await this.logTimeManagementChange(
      'BACKUP',
      { action: 'SCHEDULED' },
      currentUserId,
    );
    return { message: 'Time management backup scheduled.' };
  }

  // ===== US4: AUTOMATIC DETECTION METHODS FOR SHIFT EXPIRY =====
  // BR-TM-05: Shift schedules must be assignable by Department, Position, or Individual

  /**
   * Check for expiring shift assignments and return detailed info for notifications
   * This method is used by HR Admins to identify shifts needing renewal or reassignment
   */
  async checkExpiringShiftAssignments(
    daysBeforeExpiry: number = 7,
    currentUserId: string,
  ) {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setUTCDate(expiryDate.getUTCDate() + daysBeforeExpiry);
    // Convert to UTC end of day for proper comparison
    const expiryDateUTC = this.convertDateToUTCEnd(expiryDate);
    const nowUTC = this.convertDateToUTCStart(now);

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

    // Calculate days remaining for each assignment
    const expiring = expiringAssignments.map((assignment: any) => {
      const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
      const daysRemaining = endDate 
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        assignmentId: assignment._id?.toString() || '',
        employeeId: assignment.employeeId?._id?.toString() || '',
        employeeName: assignment.employeeId 
          ? `${assignment.employeeId.firstName || ''} ${assignment.employeeId.lastName || ''}`.trim()
          : 'Unknown',
        employeeEmail: assignment.employeeId?.email || '',
        employeeNumber: assignment.employeeId?.employeeNumber || '',
        shiftId: assignment.shiftId?._id?.toString() || '',
        shiftName: assignment.shiftId?.name || 'Unknown Shift',
        shiftTimes: assignment.shiftId 
          ? `${assignment.shiftId.startTime} - ${assignment.shiftId.endTime}`
          : '',
        departmentId: assignment.departmentId?._id?.toString() || '',
        departmentName: assignment.departmentId?.name || '',
        positionId: assignment.positionId?._id?.toString() || '',
        positionName: assignment.positionId?.name || '',
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        daysRemaining,
        status: assignment.status,
        urgency: daysRemaining <= 3 ? 'HIGH' : daysRemaining <= 5 ? 'MEDIUM' : 'LOW',
      };
    });

    // Sort by days remaining (most urgent first)
    expiring.sort((a, b) => a.daysRemaining - b.daysRemaining);

    await this.logTimeManagementChange(
      'SHIFT_EXPIRY_SCAN',
      { 
        count: expiring.length,
        daysBeforeExpiry,
        urgentCount: expiring.filter(e => e.urgency === 'HIGH').length,
      },
      currentUserId,
    );

    return { 
      count: expiring.length, 
      daysBeforeExpiry,
      summary: {
        highUrgency: expiring.filter(e => e.urgency === 'HIGH').length,
        mediumUrgency: expiring.filter(e => e.urgency === 'MEDIUM').length,
        lowUrgency: expiring.filter(e => e.urgency === 'LOW').length,
      },
      assignments: expiring,
    };
  }

  /**
   * Get assignments that have already expired but not yet archived
   * BR-TM-05: Helps HR identify assignments that need immediate attention
   */
  async getExpiredUnprocessedAssignments(currentUserId: string) {
    const now = new Date();
    const nowUTC = this.convertDateToUTCStart(now);

    const expiredAssignments = await this.shiftAssignmentModel
      .find({
        endDate: { $lt: nowUTC },
        status: 'APPROVED', // Still approved but past end date
      })
      .populate('employeeId', 'firstName lastName email employeeNumber')
      .populate('shiftId', 'name')
      .exec();

    const expired = expiredAssignments.map((assignment: any) => {
      const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
      const daysOverdue = endDate 
        ? Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        assignmentId: assignment._id?.toString() || '',
        employeeId: assignment.employeeId?._id?.toString() || '',
        employeeName: assignment.employeeId 
          ? `${assignment.employeeId.firstName || ''} ${assignment.employeeId.lastName || ''}`.trim()
          : 'Unknown',
        shiftName: assignment.shiftId?.name || 'Unknown Shift',
        endDate: assignment.endDate,
        daysOverdue,
      };
    });

    await this.logTimeManagementChange(
      'EXPIRED_UNPROCESSED_SCAN',
      { count: expired.length },
      currentUserId,
    );

    return {
      count: expired.length,
      assignments: expired,
    };
  }

  // Detect missed punches and send alerts
  async detectMissedPunches(currentUserId: string) {
    const now = new Date();
    // Use UTC for date range to match MongoDB's UTC createdAt field
    const todayUTC = this.convertDateToUTCStart(now);
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

    // Find attendance records for today
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        createdAt: { $gte: todayUTC, $lt: tomorrowUTC },
      })
      .exec();

    const missedPunchRecords: any[] = [];
    for (const record of attendanceRecords) {
      // Check if there's an odd number of punches (missing clock-out)
      // or if there are no punches at all
      if (record.punches.length === 0 || record.punches.length % 2 !== 0) {
        record.hasMissedPunch = true;
        (record as any).updatedBy = currentUserId;
        await record.save();

        missedPunchRecords.push(record);
      }
    }

    return { count: missedPunchRecords.length, records: missedPunchRecords };
  }

  // Escalate unresolved requests before payroll cut-off
  async escalateUnresolvedRequestsBeforePayroll(
    payrollCutOffDate: Date,
    currentUserId: string,
  ) {
    const now = new Date();
    if (now >= payrollCutOffDate) {
      // Find all pending correction requests
      const pendingCorrections = await this.correctionRequestModel
        .find({
          status: { $in: ['SUBMITTED', 'IN_REVIEW'] },
        })
        .exec();

      // Find all pending time exceptions
      const pendingExceptions = await this.timeExceptionModel
        .find({
          status: { $in: ['PENDING', 'OPEN'] },
        })
        .exec();

      const escalated: Array<{ type: string; id: any }> = [];

      // Escalate correction requests
      for (const correction of pendingCorrections) {
        await this.correctionRequestModel.findByIdAndUpdate(correction._id, {
          status: CorrectionRequestStatus.ESCALATED,
          updatedBy: currentUserId,
        });
        escalated.push({ type: 'CORRECTION_REQUEST', id: correction._id });
      }

      // Escalate time exceptions
      for (const exception of pendingExceptions) {
        await this.timeExceptionModel.findByIdAndUpdate(exception._id, {
          status: 'ESCALATED',
          updatedBy: currentUserId,
        });
        escalated.push({ type: 'TIME_EXCEPTION', id: exception._id });
      }

      return { count: escalated.length, escalated };
    }

    return { count: 0, escalated: [] };
  }

  // ===== REPORTING METHODS =====

  // Generate overtime report
  async generateOvertimeReport(
    generateOvertimeReportDto: GenerateOvertimeReportDto,
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = generateOvertimeReportDto;
    const query: any = {
      type: TimeExceptionType.OVERTIME_REQUEST,
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const overtimeExceptions = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'name email')
      .populate('attendanceRecordId')
      .exec();

    // Calculate total overtime hours
    const totalOvertimeMinutes = overtimeExceptions.reduce(
      (total, exception) => {
        const record = exception.attendanceRecordId as any;
        if (record && record.totalWorkMinutes) {
          // Assuming standard work day is 8 hours (480 minutes)
          const standardMinutes = 480;
          const overtime = Math.max(
            0,
            record.totalWorkMinutes - standardMinutes,
          );
          return total + overtime;
        }
        return total;
      },
      0,
    );

    await this.logTimeManagementChange(
      'OVERTIME_REPORT_GENERATED',
      {
        employeeId,
        startDate,
        endDate,
        count: overtimeExceptions.length,
        totalOvertimeMinutes,
      },
      currentUserId,
    );

    return {
      employeeId,
      startDate,
      endDate,
      records: overtimeExceptions,
      summary: {
        totalRecords: overtimeExceptions.length,
        totalOvertimeMinutes,
        totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
      },
    };
  }

  // Generate lateness report
  async generateLatenessReport(
    generateLatenessReportDto: GenerateLatenessReportDto,
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = generateLatenessReportDto;
    const query: any = {
      type: TimeExceptionType.LATE,
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const latenessExceptions = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'name email')
      .populate('attendanceRecordId')
      .exec();

    await this.logTimeManagementChange(
      'LATENESS_REPORT_GENERATED',
      {
        employeeId,
        startDate,
        endDate,
        count: latenessExceptions.length,
      },
      currentUserId,
    );

    return {
      employeeId,
      startDate,
      endDate,
      records: latenessExceptions,
      summary: {
        totalRecords: latenessExceptions.length,
        employees: [
          ...new Set(
            latenessExceptions.map((e: any) => e.employeeId?._id?.toString()),
          ),
        ].length,
      },
    };
  }

  // Generate exception attendance report
  async generateExceptionReport(
    generateExceptionReportDto: GenerateExceptionReportDto,
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate } = generateExceptionReportDto;
    const query: any = {};

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate && endDate) {
      // Convert DTO dates to UTC for proper comparison with MongoDB's UTC createdAt
      const startDateUTC = this.convertDateToUTCStart(startDate);
      const endDateUTC = this.convertDateToUTCEnd(endDate);
      query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
    }

    const exceptions = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'name email')
      .populate('attendanceRecordId')
      .exec();

    // Group by type
    const byType: Record<string, any[]> = {};
    exceptions.forEach((exception: any) => {
      const type = exception.type;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(exception);
    });

    await this.logTimeManagementChange(
      'EXCEPTION_REPORT_GENERATED',
      {
        employeeId,
        startDate,
        endDate,
        count: exceptions.length,
      },
      currentUserId,
    );

    return {
      employeeId,
      startDate,
      endDate,
      records: exceptions,
      summary: {
        totalRecords: exceptions.length,
        byType: Object.keys(byType).map((type) => ({
          type,
          count: byType[type].length,
        })),
      },
    };
  }

  // Export report in specified format
  async exportReport(exportReportDto: ExportReportDto, currentUserId: string) {
    let reportData: any;

    // Generate the appropriate report
    if (exportReportDto.reportType === 'overtime') {
      reportData = await this.generateOvertimeReport(
        {
          employeeId: exportReportDto.employeeId,
          startDate: exportReportDto.startDate,
          endDate: exportReportDto.endDate,
        },
        currentUserId,
      );
    } else if (exportReportDto.reportType === 'lateness') {
      reportData = await this.generateLatenessReport(
        {
          employeeId: exportReportDto.employeeId,
          startDate: exportReportDto.startDate,
          endDate: exportReportDto.endDate,
        },
        currentUserId,
      );
    } else if (exportReportDto.reportType === 'exception') {
      reportData = await this.generateExceptionReport(
        {
          employeeId: exportReportDto.employeeId,
          startDate: exportReportDto.startDate,
          endDate: exportReportDto.endDate,
        },
        currentUserId,
      );
    } else {
      throw new Error('Invalid report type');
    }

    // Format based on export format
    let formattedData: string;
    if (exportReportDto.format === 'csv') {
      formattedData = this.formatAsCSV(reportData);
    } else if (exportReportDto.format === 'text') {
      formattedData = this.formatAsText(reportData);
    } else {
      // Excel format - return JSON structure that can be converted to Excel
      formattedData = JSON.stringify(reportData, null, 2);
    }

    await this.logTimeManagementChange(
      'REPORT_EXPORTED',
      {
        reportType: exportReportDto.reportType,
        format: exportReportDto.format,
        employeeId: exportReportDto.employeeId,
      },
      currentUserId,
    );

    return {
      format: exportReportDto.format,
      data: formattedData,
      reportType: exportReportDto.reportType,
      generatedAt: new Date(),
    };
  }

  // ===== PRIVATE HELPER METHODS =====

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

  private async logAttendanceChange(
    employeeId: string,
    action: string,
    payload: Record<string, unknown>,
    actorId?: string,
  ) {
    await this.logTimeManagementChange(
      'ATTENDANCE',
      { employeeId, action, ...payload },
      actorId,
    );
  }

  private calculateWorkMinutesFromPunches(punches: { time: Date }[]) {
    let totalMinutes = 0;
    for (let i = 0; i < punches.length; i += 2) {
      const inPunch = punches[i];
      const outPunch = punches[i + 1];
      if (inPunch && outPunch) {
        totalMinutes +=
          (outPunch.time.getTime() - inPunch.time.getTime()) / 60000;
      }
    }
    return totalMinutes;
  }

  private roundMinutes(
    value: number,
    interval: number,
    strategy: 'NEAREST' | 'CEILING' | 'FLOOR',
  ) {
    if (interval <= 0) {
      return value;
    }
    if (strategy === 'NEAREST') {
      return Math.round(value / interval) * interval;
    }
    if (strategy === 'CEILING') {
      return Math.ceil(value / interval) * interval;
    }
    return Math.floor(value / interval) * interval;
  }

  private timeStringToMinutes(time: string) {
    const [hours, minutes] = time
      .split(':')
      .map((value) => parseInt(value, 10));
    return hours * 60 + minutes;
  }

  private dateToMinutes(date: Date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  private dateToMinutesUTC(date: Date) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

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

  private formatAsCSV(data: any): string {
    const lines: string[] = [];

    // Add summary
    if (data.summary) {
      lines.push('Summary');
      Object.keys(data.summary).forEach((key) => {
        lines.push(`${key},${data.summary[key]}`);
      });
      lines.push('');
    }

    // Add records header
    if (data.records && data.records.length > 0) {
      lines.push('Records');
      const firstRecord = data.records[0];
      const headers = Object.keys(firstRecord).join(',');
      lines.push(headers);

      // Add record rows
      data.records.forEach((record: any) => {
        const values = Object.values(record).map((v: any) => {
          if (v && typeof v === 'object') {
            return JSON.stringify(v);
          }
          return v || '';
        });
        lines.push(values.join(','));
      });
    }

    return lines.join('\n');
  }

  private formatAsText(data: any): string {
    const lines: string[] = [];

    lines.push(`Report Type: ${data.reportType || 'N/A'}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    if (data.startDate) lines.push(`Start Date: ${data.startDate}`);
    if (data.endDate) lines.push(`End Date: ${data.endDate}`);
    lines.push('');

    if (data.summary) {
      lines.push('Summary:');
      Object.keys(data.summary).forEach((key) => {
        lines.push(`  ${key}: ${data.summary[key]}`);
      });
      lines.push('');
    }

    if (data.records && data.records.length > 0) {
      lines.push(`Records (${data.records.length}):`);
      data.records.forEach((record: any, index: number) => {
        lines.push(`  Record ${index + 1}:`);
        Object.keys(record).forEach((key) => {
          const value = record[key];
          if (value && typeof value === 'object') {
            lines.push(`    ${key}: ${JSON.stringify(value)}`);
          } else {
            lines.push(`    ${key}: ${value || 'N/A'}`);
          }
        });
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  // ===== US15: TIME MANAGEMENT REPORTING & ANALYTICS (BR-TM-19, BR-TM-13, BR-TM-22) =====

  /**
   * Generate comprehensive attendance summary report
   * BR-TM-19: Time management reporting and tracking
   */
  async generateAttendanceSummaryReport(
    params: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      groupBy?: 'day' | 'week' | 'month';
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, employeeId, departmentId, groupBy = 'day' } = params;
    
    const query: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    const attendanceRecords = await this.attendanceRecordModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .sort({ date: 1 })
      .exec();
    
    // Filter by department if specified
    const filteredRecords = departmentId
      ? attendanceRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : attendanceRecords;
    
    // Calculate statistics
    const totalRecords = filteredRecords.length;
    const totalWorkMinutes = filteredRecords.reduce((sum: number, r: any) => 
      sum + (r.totalWorkMinutes || 0), 0);
    const avgWorkMinutes = totalRecords > 0 ? Math.round(totalWorkMinutes / totalRecords) : 0;
    
    // Count by status
    const onTimeCount = filteredRecords.filter((r: any) => !r.isLate && r.clockIn).length;
    const lateCount = filteredRecords.filter((r: any) => r.isLate).length;
    const absentCount = filteredRecords.filter((r: any) => !r.clockIn).length;
    const earlyLeaveCount = filteredRecords.filter((r: any) => r.earlyLeave).length;
    
    // Group data based on groupBy parameter
    const groupedData = this.groupAttendanceData(filteredRecords, groupBy);
    
    await this.logTimeManagementChange(
      'ATTENDANCE_SUMMARY_REPORT_GENERATED',
      {
        startDate,
        endDate,
        employeeId,
        departmentId,
        groupBy,
        totalRecords,
      },
      currentUserId,
    );
    
    return {
      reportType: 'ATTENDANCE_SUMMARY',
      reportPeriod: { startDate, endDate },
      filters: { employeeId, departmentId, groupBy },
      summary: {
        totalRecords,
        totalWorkMinutes,
        totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
        avgWorkMinutesPerDay: avgWorkMinutes,
        avgWorkHoursPerDay: Math.round((avgWorkMinutes / 60) * 100) / 100,
        attendanceRate: totalRecords > 0 
          ? `${Math.round(((onTimeCount + lateCount) / totalRecords) * 100)}%` 
          : '0%',
      },
      breakdown: {
        onTime: onTimeCount,
        late: lateCount,
        absent: absentCount,
        earlyLeave: earlyLeaveCount,
      },
      groupedData,
      generatedAt: new Date(),
    };
  }

  /**
   * Helper: Group attendance data by day/week/month
   */
  private groupAttendanceData(records: any[], groupBy: 'day' | 'week' | 'month') {
    const groups: Record<string, { count: number; totalMinutes: number; lateCount: number }> = {};
    
    records.forEach((record: any) => {
      const date = new Date(record.date);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week of ${weekStart.toISOString().split('T')[0]}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!groups[key]) {
        groups[key] = { count: 0, totalMinutes: 0, lateCount: 0 };
      }
      
      groups[key].count += 1;
      groups[key].totalMinutes += record.totalWorkMinutes || 0;
      if (record.isLate) groups[key].lateCount += 1;
    });
    
    return Object.entries(groups).map(([period, data]) => ({
      period,
      recordCount: data.count,
      totalWorkMinutes: data.totalMinutes,
      avgWorkMinutes: data.count > 0 ? Math.round(data.totalMinutes / data.count) : 0,
      lateCount: data.lateCount,
      lateRate: data.count > 0 ? `${Math.round((data.lateCount / data.count) * 100)}%` : '0%',
    }));
  }

  /**
   * Generate overtime cost analysis report
   * BR-TM-13: Overtime calculation based on work hours
   * BR-TM-19: Overtime reporting and tracking
   */
  async generateOvertimeCostAnalysis(
    params: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      hourlyRate?: number;
      overtimeMultiplier?: number;
    },
    currentUserId: string,
  ) {
    const { 
      startDate, 
      endDate, 
      employeeId, 
      departmentId,
      hourlyRate = 50, // Default hourly rate
      overtimeMultiplier = 1.5 // Default overtime multiplier
    } = params;
    
    const query: any = {
      type: TimeExceptionType.OVERTIME_REQUEST,
      createdAt: { $gte: startDate, $lte: endDate },
    };
    
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    const overtimeRecords = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .populate('attendanceRecordId')
      .exec();
    
    // Filter by department if specified
    const filteredRecords = departmentId
      ? overtimeRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : overtimeRecords;
    
    // Calculate overtime statistics
    let totalOvertimeMinutes = 0;
    let approvedOvertimeMinutes = 0;
    const employeeOvertimeMap: Record<string, { name: string; minutes: number; approved: number }> = {};
    
    filteredRecords.forEach((record: any) => {
      const attendanceRecord = record.attendanceRecordId as any;
      const overtimeMinutes = attendanceRecord?.totalWorkMinutes 
        ? Math.max(0, attendanceRecord.totalWorkMinutes - 480) // Standard 8 hours
        : 0;
      
      totalOvertimeMinutes += overtimeMinutes;
      
      if (record.status === TimeExceptionStatus.APPROVED) {
        approvedOvertimeMinutes += overtimeMinutes;
      }
      
      const empId = record.employeeId?._id?.toString() || 'unknown';
      const empName = record.employeeId 
        ? `${record.employeeId.firstName} ${record.employeeId.lastName}`
        : 'Unknown';
      
      if (!employeeOvertimeMap[empId]) {
        employeeOvertimeMap[empId] = { name: empName, minutes: 0, approved: 0 };
      }
      employeeOvertimeMap[empId].minutes += overtimeMinutes;
      if (record.status === TimeExceptionStatus.APPROVED) {
        employeeOvertimeMap[empId].approved += overtimeMinutes;
      }
    });
    
    // Calculate costs
    const totalOvertimeHours = totalOvertimeMinutes / 60;
    const approvedOvertimeHours = approvedOvertimeMinutes / 60;
    const estimatedCost = approvedOvertimeHours * hourlyRate * overtimeMultiplier;
    
    // Top overtime employees
    const topOvertimeEmployees = Object.entries(employeeOvertimeMap)
      .map(([id, data]) => ({
        employeeId: id,
        name: data.name,
        totalOvertimeMinutes: data.minutes,
        totalOvertimeHours: Math.round((data.minutes / 60) * 100) / 100,
        approvedMinutes: data.approved,
        estimatedCost: Math.round((data.approved / 60) * hourlyRate * overtimeMultiplier * 100) / 100,
      }))
      .sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes)
      .slice(0, 10);
    
    await this.logTimeManagementChange(
      'OVERTIME_COST_ANALYSIS_GENERATED',
      {
        startDate,
        endDate,
        employeeId,
        departmentId,
        totalOvertimeMinutes,
        estimatedCost,
      },
      currentUserId,
    );
    
    return {
      reportType: 'OVERTIME_COST_ANALYSIS',
      reportPeriod: { startDate, endDate },
      filters: { employeeId, departmentId },
      rateConfig: { hourlyRate, overtimeMultiplier },
      summary: {
        totalOvertimeRequests: filteredRecords.length,
        approvedRequests: filteredRecords.filter(r => r.status === TimeExceptionStatus.APPROVED).length,
        pendingRequests: filteredRecords.filter(r => 
          r.status === TimeExceptionStatus.OPEN || r.status === TimeExceptionStatus.PENDING
        ).length,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        approvedOvertimeHours: Math.round(approvedOvertimeHours * 100) / 100,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        currency: 'USD',
      },
      topOvertimeEmployees,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate payroll-ready attendance data
   * BR-TM-22: All time management data must sync with payroll
   */
  async generatePayrollReadyReport(
    params: {
      startDate: Date;
      endDate: Date;
      employeeIds?: string[];
      departmentId?: string;
      includeExceptions?: boolean;
      includePenalties?: boolean;
    },
    currentUserId: string,
  ) {
    const { 
      startDate, 
      endDate, 
      employeeIds,
      departmentId,
      includeExceptions = true,
      includePenalties = true,
    } = params;
    
    // Get attendance records
    const attendanceQuery: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    
    if (employeeIds && employeeIds.length > 0) {
      attendanceQuery.employeeId = { $in: employeeIds };
    }
    
    const attendanceRecords = await this.attendanceRecordModel
      .find(attendanceQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId basicSalary')
      .sort({ employeeId: 1, date: 1 })
      .exec();
    
    // Filter by department if specified
    const filteredRecords = departmentId
      ? attendanceRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : attendanceRecords;
    
    // Get exceptions if requested
    let exceptions: any[] = [];
    if (includeExceptions) {
      const exceptionQuery: any = {
        createdAt: { $gte: startDate, $lte: endDate },
        status: TimeExceptionStatus.APPROVED,
      };
      
      if (employeeIds && employeeIds.length > 0) {
        exceptionQuery.employeeId = { $in: employeeIds };
      }
      
      exceptions = await this.timeExceptionModel
        .find(exceptionQuery)
        .populate('employeeId', 'firstName lastName employeeNumber')
        .exec();
    }
    
    // Group by employee
    const employeePayrollData: Record<string, {
      employee: any;
      workDays: number;
      totalWorkMinutes: number;
      regularMinutes: number;
      overtimeMinutes: number;
      lateDays: number;
      totalLateMinutes: number;
      earlyLeaveDays: number;
      absenceDays: number;
      exceptionsApproved: number;
      deductions: number;
    }> = {};
    
    filteredRecords.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || 'unknown';
      
      if (!employeePayrollData[empId]) {
        employeePayrollData[empId] = {
          employee: record.employeeId,
          workDays: 0,
          totalWorkMinutes: 0,
          regularMinutes: 0,
          overtimeMinutes: 0,
          lateDays: 0,
          totalLateMinutes: 0,
          earlyLeaveDays: 0,
          absenceDays: 0,
          exceptionsApproved: 0,
          deductions: 0,
        };
      }
      
      const data = employeePayrollData[empId];
      const workMinutes = record.totalWorkMinutes || 0;
      const standardMinutes = 480; // 8 hours
      
      if (record.clockIn) {
        data.workDays += 1;
        data.totalWorkMinutes += workMinutes;
        data.regularMinutes += Math.min(workMinutes, standardMinutes);
        data.overtimeMinutes += Math.max(0, workMinutes - standardMinutes);
      } else {
        data.absenceDays += 1;
      }
      
      if (record.isLate) {
        data.lateDays += 1;
        data.totalLateMinutes += record.lateMinutes || 0;
      }
      
      if (record.earlyLeave) {
        data.earlyLeaveDays += 1;
      }
    });
    
    // Add exception counts
    if (includeExceptions) {
      exceptions.forEach((exc: any) => {
        const empId = exc.employeeId?._id?.toString();
        if (empId && employeePayrollData[empId]) {
          employeePayrollData[empId].exceptionsApproved += 1;
        }
      });
    }
    
    // Generate payroll summaries
    const payrollSummaries = Object.entries(employeePayrollData).map(([empId, data]) => ({
      employeeId: empId,
      employeeNumber: data.employee?.employeeNumber || 'N/A',
      employeeName: data.employee 
        ? `${data.employee.firstName} ${data.employee.lastName}`
        : 'Unknown',
      email: data.employee?.email || 'N/A',
      attendance: {
        workDays: data.workDays,
        absenceDays: data.absenceDays,
        lateDays: data.lateDays,
        earlyLeaveDays: data.earlyLeaveDays,
      },
      hours: {
        totalWorkHours: Math.round((data.totalWorkMinutes / 60) * 100) / 100,
        regularHours: Math.round((data.regularMinutes / 60) * 100) / 100,
        overtimeHours: Math.round((data.overtimeMinutes / 60) * 100) / 100,
        lateHours: Math.round((data.totalLateMinutes / 60) * 100) / 100,
      },
      exceptions: {
        approvedCount: data.exceptionsApproved,
      },
      payrollReady: true,
    }));
    
    await this.logTimeManagementChange(
      'PAYROLL_READY_REPORT_GENERATED',
      {
        startDate,
        endDate,
        employeeCount: payrollSummaries.length,
        totalWorkDays: payrollSummaries.reduce((sum, p) => sum + p.attendance.workDays, 0),
      },
      currentUserId,
    );
    
    return {
      reportType: 'PAYROLL_READY',
      reportPeriod: { startDate, endDate },
      filters: { employeeIds, departmentId, includeExceptions, includePenalties },
      meta: {
        employeeCount: payrollSummaries.length,
        totalRecords: filteredRecords.length,
        exceptionsIncluded: exceptions.length,
      },
      employees: payrollSummaries,
      generatedAt: new Date(),
      generatedBy: currentUserId,
    };
  }

  /**
   * Generate disciplinary summary report
   * BR-TM-16: Repeated offenses trigger auto-escalation
   * BR-TM-09: Track for disciplinary purposes
   */
  async generateDisciplinarySummaryReport(
    params: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
      severityFilter?: string[];
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, departmentId, severityFilter } = params;
    
    // Get all lateness exceptions
    const latenessQuery: any = {
      type: TimeExceptionType.LATE,
      createdAt: { $gte: startDate, $lte: endDate },
    };
    
    const latenessExceptions = await this.timeExceptionModel
      .find(latenessQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .exec();
    
    // Filter by department
    const filteredExceptions = departmentId
      ? latenessExceptions.filter((e: any) => 
          e.employeeId?.departmentId?.toString() === departmentId)
      : latenessExceptions;
    
    // Group by employee to identify repeat offenders
    const employeeOffenses: Record<string, {
      employee: any;
      totalLateness: number;
      escalated: number;
      warnings: number;
    }> = {};
    
    filteredExceptions.forEach((exc: any) => {
      const empId = exc.employeeId?._id?.toString() || 'unknown';
      
      if (!employeeOffenses[empId]) {
        employeeOffenses[empId] = {
          employee: exc.employeeId,
          totalLateness: 0,
          escalated: 0,
          warnings: 0,
        };
      }
      
      employeeOffenses[empId].totalLateness += 1;
      if (exc.status === TimeExceptionStatus.ESCALATED) {
        employeeOffenses[empId].escalated += 1;
      }
      // Count warnings (approved but flagged)
      if (exc.reason?.toLowerCase().includes('warning')) {
        employeeOffenses[empId].warnings += 1;
      }
    });
    
    // Identify employees requiring disciplinary action
    const disciplinaryThreshold = 5; // More than 5 lateness incidents
    const employeesRequiringAction = Object.entries(employeeOffenses)
      .filter(([, data]) => data.totalLateness >= disciplinaryThreshold)
      .map(([empId, data]) => ({
        employeeId: empId,
        employeeName: data.employee 
          ? `${data.employee.firstName} ${data.employee.lastName}`
          : 'Unknown',
        employeeNumber: data.employee?.employeeNumber || 'N/A',
        totalOffenses: data.totalLateness,
        escalatedCount: data.escalated,
        warningCount: data.warnings,
        recommendedAction: data.totalLateness >= 10 
          ? 'FINAL_WARNING' 
          : data.totalLateness >= 7 
            ? 'WRITTEN_WARNING' 
            : 'VERBAL_WARNING',
      }))
      .sort((a, b) => b.totalOffenses - a.totalOffenses);
    
    // Summary statistics
    const totalEmployeesWithIssues = Object.keys(employeeOffenses).length;
    const totalLatenessIncidents = filteredExceptions.length;
    const totalEscalations = filteredExceptions.filter(
      e => e.status === TimeExceptionStatus.ESCALATED
    ).length;
    
    await this.logTimeManagementChange(
      'DISCIPLINARY_SUMMARY_REPORT_GENERATED',
      {
        startDate,
        endDate,
        departmentId,
        totalEmployeesWithIssues,
        employeesRequiringAction: employeesRequiringAction.length,
      },
      currentUserId,
    );
    
    return {
      reportType: 'DISCIPLINARY_SUMMARY',
      reportPeriod: { startDate, endDate },
      filters: { departmentId, severityFilter },
      summary: {
        totalEmployeesWithIssues,
        totalLatenessIncidents,
        totalEscalations,
        employeesRequiringAction: employeesRequiringAction.length,
        escalationRate: totalLatenessIncidents > 0 
          ? `${Math.round((totalEscalations / totalLatenessIncidents) * 100)}%` 
          : '0%',
      },
      thresholds: {
        disciplinaryThreshold,
        verbalWarningAt: 5,
        writtenWarningAt: 7,
        finalWarningAt: 10,
      },
      employeesRequiringAction,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate comprehensive time management analytics dashboard
   * BR-TM-19: Time management reporting and tracking
   */
  async getTimeManagementAnalyticsDashboard(
    params: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, departmentId } = params;
    
    // Get attendance data
    const attendanceQuery: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    
    const attendanceRecords = await this.attendanceRecordModel
      .find(attendanceQuery)
      .populate('employeeId', 'departmentId')
      .exec();
    
    const filteredAttendance = departmentId
      ? attendanceRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : attendanceRecords;
    
    // Get exceptions data
    const exceptionQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };
    
    const exceptions = await this.timeExceptionModel.find(exceptionQuery).exec();
    
    const filteredExceptions = departmentId
      ? exceptions.filter((e: any) => {
          // Would need to populate and check, simplified here
          return true;
        })
      : exceptions;
    
    // Calculate metrics
    const totalAttendance = filteredAttendance.length;
    const presentCount = filteredAttendance.filter((r: any) => r.clockIn).length;
    const lateCount = filteredAttendance.filter((r: any) => r.isLate).length;
    const absentCount = totalAttendance - presentCount;
    
    // Exception metrics
    const exceptionsByType: Record<string, number> = {};
    filteredExceptions.forEach((exc) => {
      const type = exc.type;
      exceptionsByType[type] = (exceptionsByType[type] || 0) + 1;
    });
    
    const exceptionsByStatus: Record<string, number> = {};
    filteredExceptions.forEach((exc) => {
      const status = exc.status;
      exceptionsByStatus[status] = (exceptionsByStatus[status] || 0) + 1;
    });
    
    // Calculate total work hours
    const totalWorkMinutes = filteredAttendance.reduce((sum: number, r: any) => 
      sum + (r.totalWorkMinutes || 0), 0);
    const totalOvertimeMinutes = filteredAttendance.reduce((sum: number, r: any) => {
      const work = r.totalWorkMinutes || 0;
      return sum + Math.max(0, work - 480);
    }, 0);
    
    return {
      reportType: 'ANALYTICS_DASHBOARD',
      reportPeriod: { startDate, endDate },
      filters: { departmentId },
      attendance: {
        total: totalAttendance,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        attendanceRate: totalAttendance > 0 
          ? `${Math.round((presentCount / totalAttendance) * 100)}%` 
          : '0%',
        punctualityRate: presentCount > 0 
          ? `${Math.round(((presentCount - lateCount) / presentCount) * 100)}%` 
          : '0%',
      },
      workHours: {
        totalHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
        regularHours: Math.round(((totalWorkMinutes - totalOvertimeMinutes) / 60) * 100) / 100,
        overtimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
        avgHoursPerDay: totalAttendance > 0 
          ? Math.round((totalWorkMinutes / totalAttendance / 60) * 100) / 100 
          : 0,
      },
      exceptions: {
        total: filteredExceptions.length,
        byType: Object.entries(exceptionsByType).map(([type, count]) => ({ type, count })),
        byStatus: Object.entries(exceptionsByStatus).map(([status, count]) => ({ status, count })),
        pendingCount: (exceptionsByStatus['OPEN'] || 0) + (exceptionsByStatus['PENDING'] || 0),
        escalatedCount: exceptionsByStatus['ESCALATED'] || 0,
      },
      trends: {
        // Simplified trend indicators
        attendanceTrend: presentCount / totalAttendance > 0.9 ? 'POSITIVE' : 'NEEDS_ATTENTION',
        latenessTrend: lateCount / presentCount < 0.1 ? 'POSITIVE' : 'NEEDS_ATTENTION',
        overtimeTrend: totalOvertimeMinutes / totalWorkMinutes < 0.1 ? 'NORMAL' : 'HIGH',
      },
      generatedAt: new Date(),
    };
  }

  // ===== US19: OVERTIME & EXCEPTION REPORTS (BR-TM-21) =====

  /**
   * Get detailed lateness logs for HR/Line Managers
   * BR-TM-21: HR and Line Managers must have access to lateness logs
   */
  async getLatenessLogs(
    params: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      includeResolved?: boolean;
      sortBy?: 'date' | 'employee' | 'duration';
      sortOrder?: 'asc' | 'desc';
    },
    currentUserId: string,
  ) {
    const { 
      startDate, 
      endDate, 
      employeeId, 
      departmentId,
      includeResolved = true,
      sortBy = 'date',
      sortOrder = 'desc',
    } = params;

    // Query lateness exceptions
    const query: any = {
      type: TimeExceptionType.LATE,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (!includeResolved) {
      query.status = { $nin: [TimeExceptionStatus.RESOLVED, TimeExceptionStatus.REJECTED] };
    }

    const latenessRecords = await this.timeExceptionModel
      .find(query)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .populate('attendanceRecordId')
      .populate('assignedTo', 'firstName lastName')
      .exec();

    // Filter by department if specified
    const filteredRecords = departmentId
      ? latenessRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : latenessRecords;

    // Transform to detailed log entries
    const logEntries = filteredRecords.map((record: any) => {
      const attendance = record.attendanceRecordId as any;
      return {
        logId: record._id,
        date: record.createdAt,
        employee: record.employeeId ? {
          id: record.employeeId._id,
          name: `${record.employeeId.firstName} ${record.employeeId.lastName}`,
          employeeNumber: record.employeeId.employeeNumber,
          email: record.employeeId.email,
        } : null,
        lateness: {
          scheduledStart: attendance?.scheduledStartTime || null,
          actualStart: attendance?.clockIn || null,
          lateMinutes: attendance?.lateMinutes || 0,
          lateHours: Math.round((attendance?.lateMinutes || 0) / 60 * 100) / 100,
        },
        status: record.status,
        reason: record.reason,
        assignedTo: record.assignedTo ? {
          id: record.assignedTo._id,
          name: `${record.assignedTo.firstName} ${record.assignedTo.lastName}`,
        } : null,
        penalty: {
          hasPenalty: attendance?.penaltyAmount > 0,
          amount: attendance?.penaltyAmount || 0,
          type: attendance?.penaltyType || null,
        },
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });

    // Sort based on parameters
    logEntries.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'employee') {
        comparison = (a.employee?.name || '').localeCompare(b.employee?.name || '');
      } else if (sortBy === 'duration') {
        comparison = a.lateness.lateMinutes - b.lateness.lateMinutes;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Calculate summary statistics
    const totalLateMinutes = logEntries.reduce((sum, e) => sum + e.lateness.lateMinutes, 0);
    const uniqueEmployees = [...new Set(logEntries.map(e => e.employee?.id?.toString()))].length;
    const avgLateMinutes = logEntries.length > 0 
      ? Math.round(totalLateMinutes / logEntries.length) 
      : 0;

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    logEntries.forEach(e => {
      statusBreakdown[e.status] = (statusBreakdown[e.status] || 0) + 1;
    });

    // Penalty breakdown
    const withPenalty = logEntries.filter(e => e.penalty.hasPenalty);
    const totalPenaltyAmount = withPenalty.reduce((sum, e) => sum + e.penalty.amount, 0);

    await this.logTimeManagementChange(
      'LATENESS_LOGS_ACCESSED',
      {
        startDate,
        endDate,
        employeeId,
        departmentId,
        totalRecords: logEntries.length,
      },
      currentUserId,
    );

    return {
      reportType: 'LATENESS_LOGS',
      reportPeriod: { startDate, endDate },
      filters: { employeeId, departmentId, includeResolved, sortBy, sortOrder },
      summary: {
        totalIncidents: logEntries.length,
        uniqueEmployees,
        totalLateMinutes,
        totalLateHours: Math.round(totalLateMinutes / 60 * 100) / 100,
        avgLateMinutes,
        statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({ status, count })),
        penaltyStats: {
          incidentsWithPenalty: withPenalty.length,
          totalPenaltyAmount: Math.round(totalPenaltyAmount * 100) / 100,
        },
      },
      logs: logEntries,
      generatedAt: new Date(),
      accessedBy: currentUserId,
    };
  }

  /**
   * Generate combined overtime and exception report for compliance
   * BR-TM-21: HR must have access to overtime reports
   * US19: View and export overtime and exception attendance reports for payroll and compliance checks
   */
  async generateOvertimeAndExceptionComplianceReport(
    params: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      includeAllExceptionTypes?: boolean;
    },
    currentUserId: string,
  ) {
    const { 
      startDate, 
      endDate, 
      employeeId, 
      departmentId,
      includeAllExceptionTypes = true,
    } = params;

    // Get overtime exceptions
    const overtimeQuery: any = {
      type: TimeExceptionType.OVERTIME_REQUEST,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (employeeId) {
      overtimeQuery.employeeId = employeeId;
    }

    const overtimeRecords = await this.timeExceptionModel
      .find(overtimeQuery)
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .populate('attendanceRecordId')
      .exec();

    // Get other exceptions if requested
    let otherExceptions: any[] = [];
    if (includeAllExceptionTypes) {
      const exceptionQuery: any = {
        type: { $ne: TimeExceptionType.OVERTIME_REQUEST },
        createdAt: { $gte: startDate, $lte: endDate },
      };

      if (employeeId) {
        exceptionQuery.employeeId = employeeId;
      }

      otherExceptions = await this.timeExceptionModel
        .find(exceptionQuery)
        .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
        .exec();
    }

    // Filter by department
    const filteredOvertime = departmentId
      ? overtimeRecords.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : overtimeRecords;

    const filteredExceptions = departmentId
      ? otherExceptions.filter((r: any) => 
          r.employeeId?.departmentId?.toString() === departmentId)
      : otherExceptions;

    // Process overtime data
    const overtimeSummary = {
      totalRequests: filteredOvertime.length,
      approved: filteredOvertime.filter(r => r.status === TimeExceptionStatus.APPROVED).length,
      pending: filteredOvertime.filter(r => 
        r.status === TimeExceptionStatus.OPEN || r.status === TimeExceptionStatus.PENDING
      ).length,
      rejected: filteredOvertime.filter(r => r.status === TimeExceptionStatus.REJECTED).length,
      totalOvertimeMinutes: 0,
      approvedOvertimeMinutes: 0,
    };

    filteredOvertime.forEach((record: any) => {
      const attendance = record.attendanceRecordId as any;
      const overtimeMinutes = attendance?.totalWorkMinutes 
        ? Math.max(0, attendance.totalWorkMinutes - 480)
        : 0;
      
      overtimeSummary.totalOvertimeMinutes += overtimeMinutes;
      if (record.status === TimeExceptionStatus.APPROVED) {
        overtimeSummary.approvedOvertimeMinutes += overtimeMinutes;
      }
    });

    // Process other exceptions by type
    const exceptionsByType: Record<string, { count: number; approved: number; pending: number }> = {};
    filteredExceptions.forEach((exc: any) => {
      const type = exc.type;
      if (!exceptionsByType[type]) {
        exceptionsByType[type] = { count: 0, approved: 0, pending: 0 };
      }
      exceptionsByType[type].count += 1;
      if (exc.status === TimeExceptionStatus.APPROVED) {
        exceptionsByType[type].approved += 1;
      }
      if (exc.status === TimeExceptionStatus.OPEN || exc.status === TimeExceptionStatus.PENDING) {
        exceptionsByType[type].pending += 1;
      }
    });

    // Compliance indicators
    const complianceIndicators = {
      overtimeApprovalRate: overtimeSummary.totalRequests > 0
        ? Math.round((overtimeSummary.approved / overtimeSummary.totalRequests) * 100)
        : 0,
      pendingRequiresAction: overtimeSummary.pending > 0 || 
        Object.values(exceptionsByType).some(e => e.pending > 0),
      avgOvertimeHoursPerRequest: overtimeSummary.totalRequests > 0
        ? Math.round((overtimeSummary.totalOvertimeMinutes / overtimeSummary.totalRequests / 60) * 100) / 100
        : 0,
      complianceStatus: overtimeSummary.pending === 0 ? 'COMPLIANT' : 'PENDING_REVIEW',
    };

    // Top overtime employees
    const employeeOvertimeMap: Record<string, { name: string; minutes: number }> = {};
    filteredOvertime.forEach((record: any) => {
      const empId = record.employeeId?._id?.toString() || 'unknown';
      const empName = record.employeeId
        ? `${record.employeeId.firstName} ${record.employeeId.lastName}`
        : 'Unknown';
      const attendance = record.attendanceRecordId as any;
      const overtimeMinutes = attendance?.totalWorkMinutes
        ? Math.max(0, attendance.totalWorkMinutes - 480)
        : 0;

      if (!employeeOvertimeMap[empId]) {
        employeeOvertimeMap[empId] = { name: empName, minutes: 0 };
      }
      employeeOvertimeMap[empId].minutes += overtimeMinutes;
    });

    const topOvertimeEmployees = Object.entries(employeeOvertimeMap)
      .map(([id, data]) => ({
        employeeId: id,
        name: data.name,
        totalOvertimeHours: Math.round((data.minutes / 60) * 100) / 100,
      }))
      .sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours)
      .slice(0, 10);

    await this.logTimeManagementChange(
      'OVERTIME_EXCEPTION_COMPLIANCE_REPORT_GENERATED',
      {
        startDate,
        endDate,
        employeeId,
        departmentId,
        overtimeCount: overtimeSummary.totalRequests,
        exceptionCount: filteredExceptions.length,
      },
      currentUserId,
    );

    return {
      reportType: 'OVERTIME_AND_EXCEPTION_COMPLIANCE',
      reportPeriod: { startDate, endDate },
      filters: { employeeId, departmentId, includeAllExceptionTypes },
      overtime: {
        summary: {
          ...overtimeSummary,
          totalOvertimeHours: Math.round((overtimeSummary.totalOvertimeMinutes / 60) * 100) / 100,
          approvedOvertimeHours: Math.round((overtimeSummary.approvedOvertimeMinutes / 60) * 100) / 100,
        },
        topEmployees: topOvertimeEmployees,
      },
      exceptions: {
        totalCount: filteredExceptions.length,
        byType: Object.entries(exceptionsByType).map(([type, data]) => ({
          type,
          ...data,
        })),
      },
      compliance: complianceIndicators,
      payrollReadiness: {
        isReady: complianceIndicators.complianceStatus === 'COMPLIANT',
        pendingItems: overtimeSummary.pending + 
          Object.values(exceptionsByType).reduce((sum, e) => sum + e.pending, 0),
        message: complianceIndicators.complianceStatus === 'COMPLIANT'
          ? 'All overtime and exception requests have been processed. Ready for payroll.'
          : 'Pending requests require review before payroll processing.',
      },
      generatedAt: new Date(),
      generatedBy: currentUserId,
    };
  }

  /**
   * Get employee attendance history with overtime and exceptions
   * BR-TM-21: Line Managers must have access to attendance summaries
   */
  async getEmployeeAttendanceHistory(
    params: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
      includeExceptions?: boolean;
      includeOvertime?: boolean;
    },
    currentUserId: string,
  ) {
    const { 
      employeeId, 
      startDate, 
      endDate,
      includeExceptions = true,
      includeOvertime = true,
    } = params;

    // Get attendance records with employee details populated
    const attendanceRecords = await this.attendanceRecordModel
      .find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('employeeId', 'firstName lastName email employeeNumber departmentId')
      .sort({ date: 1 })
      .exec();

    // Get exceptions if requested
    let exceptions: any[] = [];
    if (includeExceptions) {
      exceptions = await this.timeExceptionModel
        .find({
          employeeId,
          createdAt: { $gte: startDate, $lte: endDate },
        })
        .exec();
    }

    // Extract employee details from first attendance record (if available)
    const firstRecord = attendanceRecords[0] as any;
    const employeeData = firstRecord?.employeeId;

    // Process daily records
    const dailyRecords = attendanceRecords.map((record: any) => {
      const dayExceptions = exceptions.filter((exc: any) => {
        const excDate = new Date(exc.createdAt);
        const recDate = new Date(record.date);
        return excDate.toDateString() === recDate.toDateString();
      });

      const overtimeMinutes = record.totalWorkMinutes 
        ? Math.max(0, record.totalWorkMinutes - 480)
        : 0;

      return {
        date: record.date,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        totalWorkMinutes: record.totalWorkMinutes || 0,
        totalWorkHours: Math.round((record.totalWorkMinutes || 0) / 60 * 100) / 100,
        regularHours: Math.min((record.totalWorkMinutes || 0), 480) / 60,
        overtime: {
          hasOvertime: overtimeMinutes > 0,
          minutes: overtimeMinutes,
          hours: Math.round((overtimeMinutes / 60) * 100) / 100,
        },
        status: {
          isPresent: !!record.clockIn,
          isLate: record.isLate || false,
          lateMinutes: record.lateMinutes || 0,
          earlyLeave: record.earlyLeave || false,
        },
        exceptions: dayExceptions.map((exc: any) => ({
          id: exc._id,
          type: exc.type,
          status: exc.status,
          reason: exc.reason,
        })),
        penalties: {
          hasPenalty: (record.penaltyAmount || 0) > 0,
          amount: record.penaltyAmount || 0,
        },
      };
    });

    // Calculate summary statistics
    const summary = {
      totalDays: dailyRecords.length,
      presentDays: dailyRecords.filter(r => r.status.isPresent).length,
      absentDays: dailyRecords.filter(r => !r.status.isPresent).length,
      lateDays: dailyRecords.filter(r => r.status.isLate).length,
      earlyLeaveDays: dailyRecords.filter(r => r.status.earlyLeave).length,
      totalWorkHours: Math.round(dailyRecords.reduce((sum, r) => sum + r.totalWorkHours, 0) * 100) / 100,
      totalOvertimeHours: Math.round(dailyRecords.reduce((sum, r) => sum + r.overtime.hours, 0) * 100) / 100,
      totalLateMinutes: dailyRecords.reduce((sum, r) => sum + r.status.lateMinutes, 0),
      totalExceptions: exceptions.length,
      totalPenalties: Math.round(dailyRecords.reduce((sum, r) => sum + r.penalties.amount, 0) * 100) / 100,
    };

    // Attendance rate calculation
    const attendanceRate = summary.totalDays > 0
      ? Math.round((summary.presentDays / summary.totalDays) * 100)
      : 0;
    const punctualityRate = summary.presentDays > 0
      ? Math.round(((summary.presentDays - summary.lateDays) / summary.presentDays) * 100)
      : 0;

    await this.logTimeManagementChange(
      'EMPLOYEE_ATTENDANCE_HISTORY_ACCESSED',
      {
        employeeId,
        startDate,
        endDate,
        totalRecords: dailyRecords.length,
      },
      currentUserId,
    );

    return {
      reportType: 'EMPLOYEE_ATTENDANCE_HISTORY',
      reportPeriod: { startDate, endDate },
      employee: employeeData ? {
        id: employeeData._id || employeeId,
        name: employeeData.firstName && employeeData.lastName 
          ? `${employeeData.firstName} ${employeeData.lastName}` 
          : 'Unknown',
        employeeNumber: employeeData.employeeNumber || 'N/A',
        email: employeeData.email || 'N/A',
      } : {
        id: employeeId,
        name: 'Unknown',
        employeeNumber: 'N/A',
        email: 'N/A',
      },
      summary: {
        ...summary,
        attendanceRate: `${attendanceRate}%`,
        punctualityRate: `${punctualityRate}%`,
        avgWorkHoursPerDay: summary.presentDays > 0
          ? Math.round((summary.totalWorkHours / summary.presentDays) * 100) / 100
          : 0,
      },
      records: dailyRecords,
      generatedAt: new Date(),
      accessedBy: currentUserId,
    };
  }

  /**
   * Export overtime and exception report for payroll
   * BR-TM-21: Access to overtime reports
   * BR-TM-23: Reports must be exportable in multiple formats
   */
  async exportOvertimeExceptionReport(
    params: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      format: 'excel' | 'csv' | 'text';
    },
    currentUserId: string,
  ) {
    const { startDate, endDate, employeeId, departmentId, format } = params;

    // Generate the compliance report first
    const reportData = await this.generateOvertimeAndExceptionComplianceReport(
      { startDate, endDate, employeeId, departmentId, includeAllExceptionTypes: true },
      currentUserId,
    );

    // Format based on export type
    let formattedData: string;
    if (format === 'csv') {
      formattedData = this.formatOvertimeExceptionAsCSV(reportData);
    } else if (format === 'text') {
      formattedData = this.formatOvertimeExceptionAsText(reportData);
    } else {
      // Excel format - return JSON structure
      formattedData = JSON.stringify(reportData, null, 2);
    }

    await this.logTimeManagementChange(
      'OVERTIME_EXCEPTION_REPORT_EXPORTED',
      {
        startDate,
        endDate,
        employeeId,
        departmentId,
        format,
      },
      currentUserId,
    );

    return {
      exportType: 'OVERTIME_AND_EXCEPTION_REPORT',
      format,
      data: formattedData,
      reportPeriod: { startDate, endDate },
      generatedAt: new Date(),
      exportedBy: currentUserId,
    };
  }

  private formatOvertimeExceptionAsCSV(data: any): string {
    const lines: string[] = [];
    
    lines.push('OVERTIME AND EXCEPTION COMPLIANCE REPORT');
    lines.push(`Report Period,${data.reportPeriod.startDate},${data.reportPeriod.endDate}`);
    lines.push('');
    
    lines.push('OVERTIME SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Requests,${data.overtime.summary.totalRequests}`);
    lines.push(`Approved,${data.overtime.summary.approved}`);
    lines.push(`Pending,${data.overtime.summary.pending}`);
    lines.push(`Rejected,${data.overtime.summary.rejected}`);
    lines.push(`Total Overtime Hours,${data.overtime.summary.totalOvertimeHours}`);
    lines.push(`Approved Overtime Hours,${data.overtime.summary.approvedOvertimeHours}`);
    lines.push('');
    
    lines.push('TOP OVERTIME EMPLOYEES');
    lines.push('Employee ID,Name,Overtime Hours');
    data.overtime.topEmployees.forEach((emp: any) => {
      lines.push(`${emp.employeeId},${emp.name},${emp.totalOvertimeHours}`);
    });
    lines.push('');
    
    lines.push('EXCEPTION SUMMARY BY TYPE');
    lines.push('Type,Count,Approved,Pending');
    data.exceptions.byType.forEach((exc: any) => {
      lines.push(`${exc.type},${exc.count},${exc.approved},${exc.pending}`);
    });
    lines.push('');
    
    lines.push('COMPLIANCE STATUS');
    lines.push(`Status,${data.compliance.complianceStatus}`);
    lines.push(`Payroll Ready,${data.payrollReadiness.isReady ? 'YES' : 'NO'}`);
    lines.push(`Pending Items,${data.payrollReadiness.pendingItems}`);
    
    return lines.join('\n');
  }

  private formatOvertimeExceptionAsText(data: any): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('OVERTIME AND EXCEPTION COMPLIANCE REPORT');
    lines.push('='.repeat(60));
    lines.push(`Report Period: ${data.reportPeriod.startDate} to ${data.reportPeriod.endDate}`);
    lines.push(`Generated: ${data.generatedAt}`);
    lines.push('');
    
    lines.push('-'.repeat(40));
    lines.push('OVERTIME SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`  Total Requests: ${data.overtime.summary.totalRequests}`);
    lines.push(`  Approved: ${data.overtime.summary.approved}`);
    lines.push(`  Pending: ${data.overtime.summary.pending}`);
    lines.push(`  Rejected: ${data.overtime.summary.rejected}`);
    lines.push(`  Total Overtime Hours: ${data.overtime.summary.totalOvertimeHours}`);
    lines.push(`  Approved Overtime Hours: ${data.overtime.summary.approvedOvertimeHours}`);
    lines.push('');
    
    lines.push('-'.repeat(40));
    lines.push('TOP OVERTIME EMPLOYEES');
    lines.push('-'.repeat(40));
    data.overtime.topEmployees.forEach((emp: any, idx: number) => {
      lines.push(`  ${idx + 1}. ${emp.name}: ${emp.totalOvertimeHours} hours`);
    });
    lines.push('');
    
    lines.push('-'.repeat(40));
    lines.push('EXCEPTION SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`  Total Exceptions: ${data.exceptions.totalCount}`);
    data.exceptions.byType.forEach((exc: any) => {
      lines.push(`  ${exc.type}: ${exc.count} (Approved: ${exc.approved}, Pending: ${exc.pending})`);
    });
    lines.push('');
    
    lines.push('-'.repeat(40));
    lines.push('COMPLIANCE STATUS');
    lines.push('-'.repeat(40));
    lines.push(`  Status: ${data.compliance.complianceStatus}`);
    lines.push(`  Overtime Approval Rate: ${data.compliance.overtimeApprovalRate}%`);
    lines.push(`  Payroll Ready: ${data.payrollReadiness.isReady ? 'YES' : 'NO'}`);
    lines.push(`  Pending Items: ${data.payrollReadiness.pendingItems}`);
    lines.push(`  Message: ${data.payrollReadiness.message}`);
    lines.push('');
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  // ===== LEAVES MODULE INTEGRATION =====
  // Helper methods to use LeavesService functions

  /**
   * Get holidays and rest days for a specific year
   * Uses: LeavesService.getCalendarByYear()
   * @param year - The year to get calendar for
   * @returns Calendar with holidays populated
   */
  async getHolidaysAndRestDays(year: number) {
    return await this.leavesService.getCalendarByYear(year);
  }

  /**
   * Check if a date is a holiday or rest day
   * Uses: LeavesService.getCalendarByYear()
   * @param date - Date to check
   * @returns Object with holiday/rest day information
   */
  async checkIfHolidayOrRestDay(date: Date): Promise<{
    isHoliday: boolean;
    isRestDay: boolean;
    holidayName?: string;
    holidayType?: string;
    dayOfWeek: number;
    dayName: string;
  }> {
    const year = date.getFullYear();
    const calendar = await this.leavesService.getCalendarByYear(year);
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const isRestDay = dayOfWeek === 0 || dayOfWeek === 6; // Weekend
    
    let isHoliday = false;
    let holidayName: string | undefined;
    let holidayType: string | undefined;
    
    if (calendar && calendar.holidays) {
      const dateString = date.toISOString().split('T')[0];
      
      // Check if date falls within any holiday period
      for (const holidayId of calendar.holidays) {
        try {
          const HolidayModel = this.attendanceRecordModel.db.model('Holiday');
          const holiday = await HolidayModel.findById(holidayId).exec();
          
          if (holiday) {
            const holidayStart = new Date(holiday.startDate);
            const holidayEnd = holiday.endDate ? new Date(holiday.endDate) : holidayStart;
            
            if (date >= holidayStart && date <= holidayEnd) {
              isHoliday = true;
              holidayName = holiday.name;
              holidayType = holiday.type;
              break;
            }
          }
        } catch (err) {
          // Skip if holiday not found
        }
      }
    }
    
    return {
      isHoliday,
      isRestDay,
      holidayName,
      holidayType,
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
    };
  }

  /**
   * Get employee vacation packages (leave requests) for a date range
   * Uses: LeavesService.getPastLeaveRequests()
   * @param employeeId - Employee ID
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @returns Array of leave requests
   */
  async getEmployeeVacationPackages(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const filters: any = {};
    if (startDate) filters.fromDate = startDate;
    if (endDate) filters.toDate = endDate;
    
    return await this.leavesService.getPastLeaveRequests(employeeId, filters);
  }

  /**
   * Check if employee is on vacation (approved leave) for a specific date
   * Uses: LeavesService.getPastLeaveRequests()
   * @param employeeId - Employee ID
   * @param date - Date to check
   * @returns Leave request if employee is on vacation, null otherwise
   */
  async checkIfEmployeeOnVacation(
    employeeId: string,
    date: Date,
  ): Promise<any | null> {
    const leaveRequests = await this.leavesService.getPastLeaveRequests(employeeId, {
      fromDate: date,
      toDate: date,
      status: 'APPROVED', // Only check approved leaves
    });
    
    // Check if date falls within any approved leave request
    for (const request of leaveRequests) {
      const leaveStart = new Date(request.dates.from);
      const leaveEnd = new Date(request.dates.to);
      
      if (date >= leaveStart && date <= leaveEnd) {
        return request;
      }
    }
    
    return null;
  }

  /**
   * Get all holidays and rest days for attendance validation
   * Combines holiday calendar with rest days
   * @param year - Year to get calendar for
   * @param restDays - Array of day numbers (0-6) that are rest days (default: [0, 6] for weekends)
   * @returns Object with all non-working days
   */
  async getAllNonWorkingDays(
    year: number,
    restDays: number[] = [0, 6], // Sunday and Saturday by default
  ) {
    const calendar = await this.leavesService.getCalendarByYear(year);
    
    const holidays: Array<{ date: Date; name?: string; type?: string }> = [];
    const restDayDates: Date[] = [];
    
    // Get holidays
    if (calendar && calendar.holidays) {
      for (const holidayId of calendar.holidays) {
        try {
          const HolidayModel = this.attendanceRecordModel.db.model('Holiday');
          const holiday = await HolidayModel.findById(holidayId).exec();
          
          if (holiday && holiday.active) {
            const startDate = new Date(holiday.startDate);
            const endDate = holiday.endDate ? new Date(holiday.endDate) : startDate;
            
            // Add all dates in the holiday range
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
              holidays.push({
                date: new Date(currentDate),
                name: holiday.name,
                type: holiday.type,
              });
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        } catch (err) {
          // Skip if holiday not found
        }
      }
    }
    
    // Calculate rest days for the year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const currentDate = new Date(startOfYear);
    
    while (currentDate <= endOfYear) {
      const dayOfWeek = currentDate.getDay();
      if (restDays.includes(dayOfWeek)) {
        restDayDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      year,
      holidays,
      restDays: restDayDates,
      totalNonWorkingDays: holidays.length + restDayDates.length,
    };
  }
}
