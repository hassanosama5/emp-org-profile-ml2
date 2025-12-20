import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeManagementService } from '../services/time-management.service';
import { SyncSchedulerService } from '../services/sync-scheduler.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';
// Import DTOs from DTOs folder
import {
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  SubmitCorrectionRequestDto,
  GetAllCorrectionsDto,
  CreateTimeExceptionDto,
  UpdateTimeExceptionDto,
  GetTimeExceptionsByEmployeeDto,
  ApproveTimeExceptionDto,
  RejectTimeExceptionDto,
  EscalateTimeExceptionDto,
  ApproveCorrectionRequestDto,
  RejectCorrectionRequestDto,
  ImportAttendanceCsvDto,
} from '../DTOs/attendance.dtos';
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

@Controller('time-management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeManagementController {
  constructor(
    private readonly timeManagementService: TimeManagementService,
    private readonly syncSchedulerService: SyncSchedulerService,
  ) {}

  // ===== US5: Clock-In/Out and Attendance Records =====
  // BR-TM-06: Time-in/out captured via Biometric, Web Login, Mobile App, or Manual Input (with audit trail)
  // BR-TM-07: Attendance data must follow HR rounding rules
  // BR-TM-11: Allow multiple punches per day, or first in/last out
  // BR-TM-12: Clock-ins must be tagged with location, terminal ID, or device

  @Post('clock-in/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.FINANCE_STAFF,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_EMPLOYEE,
  )
  async clockInWithID(
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
    return this.timeManagementService.clockInWithID(employeeId, user.userId);
  }

  @Post('clock-out/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.FINANCE_STAFF,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_EMPLOYEE,
  )
  async clockOutWithID(
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
    return this.timeManagementService.clockOutWithID(employeeId, user.userId);
  }

  // BR-TM-06 & BR-TM-12: Enhanced clock-in with metadata
  @Post('clock-in/:employeeId/metadata')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async clockInWithMetadata(
    @Param('employeeId') employeeId: string,
    @Body() body: {
      source: 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
      deviceId?: string;
      terminalId?: string;
      location?: string;
      gpsCoordinates?: { lat: number; lng: number };
      ipAddress?: string;
    },
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
    return this.timeManagementService.clockInWithMetadata(employeeId, body, user.userId);
  }

  // BR-TM-06 & BR-TM-12: Enhanced clock-out with metadata
  @Post('clock-out/:employeeId/metadata')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async clockOutWithMetadata(
    @Param('employeeId') employeeId: string,
    @Body() body: {
      source: 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
      deviceId?: string;
      terminalId?: string;
      location?: string;
      gpsCoordinates?: { lat: number; lng: number };
      ipAddress?: string;
    },
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
    return this.timeManagementService.clockOutWithMetadata(employeeId, body, user.userId);
  }

  // US5 Flow: Validate clock-in against assigned shifts and rest days
  @Post('clock-in/:employeeId/validate')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async validateClockInAgainstShift(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.validateClockInAgainstShift(employeeId, user.userId);
  }

  // Get employee's attendance status for today
  @Get('attendance/status/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
  )
  async getEmployeeAttendanceStatus(
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
    return this.timeManagementService.getEmployeeAttendanceStatus(employeeId, user.userId);
  }

  @Get('attendance/records/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
  )
  async getEmployeeAttendanceRecords(
    @Param('employeeId') employeeId: string,
    @Query('days') days: string = '30',
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
    return this.timeManagementService.getEmployeeAttendanceRecords(employeeId, parseInt(days), user.userId);
  }

  @Post('attendance')

  @Roles(SystemRole.DEPARTMENT_HEAD)
  async createAttendanceRecord(
    @Body() createAttendanceRecordDto: CreateAttendanceRecordDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.createAttendanceRecord(
      createAttendanceRecordDto,
      user.userId,
    );
  }

  @Put('attendance/:id')
  @Roles(SystemRole.DEPARTMENT_HEAD)
  async updateAttendanceRecord(
    @Param('id') id: string,
    @Body() updateAttendanceRecordDto: UpdateAttendanceRecordDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.updateAttendanceRecord(
      id,
      updateAttendanceRecordDto,
      user.userId,
    );
  }

  @Post('attendance/correction')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.FINANCE_STAFF,
    SystemRole.SYSTEM_ADMIN,
  )
  async submitAttendanceCorrectionRequest(
    @Body() submitCorrectionRequestDto: SubmitCorrectionRequestDto,
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== submitCorrectionRequestDto.employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.timeManagementService.submitAttendanceCorrectionRequest(
      submitCorrectionRequestDto,
      user.userId,
    );
  }

  // ===== Attendance Punch Enhancements =====
  @Post('attendance/punch/metadata')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async recordPunchWithMetadata(
    @Body() recordPunchWithMetadataDto: RecordPunchWithMetadataDto,
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== recordPunchWithMetadataDto.employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.timeManagementService.recordPunchWithMetadata(
      recordPunchWithMetadataDto,
      user.userId,
    );
  }

  @Post('attendance/punch/device')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.HR_EMPLOYEE,
  )
  async recordPunchFromDevice(
    @Body() recordPunchWithMetadataDto: RecordPunchWithMetadataDto,
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== recordPunchWithMetadataDto.employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.timeManagementService.recordPunchFromDevice(
      recordPunchWithMetadataDto,
      user.userId,
    );
  }

  @Post('attendance/enforce-punch-policy')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async enforcePunchPolicy(
    @Body() enforcePunchPolicyDto: EnforcePunchPolicyDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.enforcePunchPolicy(
      enforcePunchPolicyDto,
      user.userId,
    );
  }

  @Post('attendance/rounding')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async applyAttendanceRounding(
    @Body() applyAttendanceRoundingDto: ApplyAttendanceRoundingDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.applyAttendanceRounding(
      applyAttendanceRoundingDto,
      user.userId,
    );
  }

  @Post('attendance/enforce-shift-policy')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async enforceShiftPunchPolicy(
    @Body() enforceShiftPunchPolicyDto: EnforceShiftPunchPolicyDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.enforceShiftPunchPolicy(
      enforceShiftPunchPolicyDto,
      user.userId,
    );
  }

  // ===== US13: ATTENDANCE CORRECTION REQUESTS (BR-TM-15) =====

  /**
   * US13: Submit correction request for missing/incorrect punch
   * BR-TM-15: Employees submit correction requests via ESS
   */
  @Post('correction-request')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async submitCorrectionRequest(
    @Body()
    body: {
      employeeId: string;
      attendanceRecord: string;
      reason: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.submitAttendanceCorrectionRequest(
      {
        employeeId: body.employeeId,
        attendanceRecord: body.attendanceRecord,
        reason: body.reason,
      },
      user.userId,
    );
  }

  /**
   * US13: Get correction requests by employee
   * BR-TM-15: Track approval status of own requests
   */
  @Get('correction-request/employee/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getCorrectionRequestsByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getCorrectionRequestsByEmployee(
      {
        employeeId,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user.userId,
    );
  }

  /**
   * US13: Get correction request by ID
   * BR-TM-15: View detailed request information
   */
  @Get('correction-request/:requestId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getCorrectionRequestById(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.getCorrectionRequestById(
      requestId,
      user.userId,
    );
  }

  // ===== ATTENDANCE IMPORT (CSV) =====
  // BR-TM-06, BR-TM-13, BR-TM-14, BR-TM-22
  /**
   * Import attendance punches from a CSV file.
   * The CSV should include at least: employeeId, clockInTime, clockOutTime (optional).
   * This endpoint allows HR, System Admin, and Employees to import attendance data
   * from biometric devices or external systems.
   *
   * The service will:
   * - Create attendance records with punches for each row
   * - Calculate total work minutes when IN/OUT are present
   * - Flag records with missing clock-out as hasMissedPunch = true
   */
  @Post('attendance/import-csv')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
  )
  async importAttendanceFromCsv(
    @Body() body: ImportAttendanceCsvDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.importAttendanceFromCsv(
      body.csv,
      user.userId,
    );
  }

  /**
   * Import attendance punches from an Excel file (.xlsx, .xls)
   * The Excel file should have the same format as CSV:
   * - Punch rows: employeeId, punchType, time
   * - Legacy rows: employeeId, clockInTime, clockOutTime (optional)
   */
  @Post('attendance/import-excel')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
  )
  async importAttendanceFromExcel(
    @Body() body: { excelData: string }, // base64 encoded Excel file
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.importAttendanceFromExcel(
      body.excelData,
      user.userId,
    );
  }

  /**
   * US13: Get all correction requests (for managers/admins)
   * BR-TM-15: Managers review pending requests
   */
  @Get('correction-request')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getAllCorrectionRequests(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getAllCorrectionRequests(
      { status, employeeId },
      user.userId,
    );
  }

  /**
   * US13: Get pending requests for manager approval
   * BR-TM-15: Routed to Line Manager for approval
   */
  @Get('correction-request/pending/manager')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async getPendingCorrectionRequestsForManager(
    @Query('managerId') managerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getPendingCorrectionRequestsForManager(
      {
        managerId,
        departmentId,
        limit: limit ? Number(limit) : undefined,
      },
      user.userId,
    );
  }

  /**
   * US13: Mark correction request as in-review
   * BR-TM-15: Workflow status transition
   */
  @Post('correction-request/:requestId/in-review')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async markCorrectionRequestInReview(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.markCorrectionRequestInReview(
      requestId,
      user.userId,
    );
  }

  /**
   * US13: Approve correction request
   * BR-TM-15: Line Manager approves the request
   */
  @Post('correction-request/:requestId/approve')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async approveCorrectionRequest(
    @Param('requestId') requestId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.approveCorrectionRequest(
      {
        correctionRequestId: requestId,
        reason: body.reason,
      },
      user.userId,
    );
  }

  /**
   * US13: Reject correction request
   * BR-TM-15: Line Manager rejects with reason
   */
  @Post('correction-request/:requestId/reject')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async rejectCorrectionRequest(
    @Param('requestId') requestId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.rejectCorrectionRequest(
      {
        correctionRequestId: requestId,
        reason: body.reason,
      },
      user.userId,
    );
  }

  /**
   * US13: Escalate correction request
   * BR-TM-15: Route to HR for approval
   */
  @Post('correction-request/:requestId/escalate')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async escalateCorrectionRequest(
    @Param('requestId') requestId: string,
    @Body()
    body: {
      escalateTo: 'LINE_MANAGER' | 'HR_ADMIN' | 'HR_MANAGER';
      reason?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.escalateCorrectionRequest(
      {
        requestId,
        escalateTo: body.escalateTo,
        reason: body.reason,
      },
      user.userId,
    );
  }

  /**
   * US13: Cancel/withdraw correction request
   * BR-TM-15: Employee can withdraw pending request
   */
  @Post('correction-request/:requestId/cancel')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async cancelCorrectionRequest(
    @Param('requestId') requestId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.cancelCorrectionRequest(
      {
        requestId,
        reason: body.reason,
      },
      user.userId,
    );
  }

  /**
   * US13: Get correction request statistics
   * BR-TM-15: Summary for HR/payroll reporting
   */
  @Get('correction-request/statistics')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getCorrectionRequestStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getCorrectionRequestStatistics(
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        departmentId,
      },
      user.userId,
    );
  }

  // ===== Time Exceptions =====
  @Post('time-exception')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
  )
  async createTimeException(
    @Body() createTimeExceptionDto: CreateTimeExceptionDto,
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== createTimeExceptionDto.employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.timeManagementService.createTimeException(
      createTimeExceptionDto,
      user.userId,
    );
  }

  @Put('time-exception/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updateTimeException(
    @Param('id') id: string,
    @Body() updateTimeExceptionDto: UpdateTimeExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.updateTimeException(
      id,
      updateTimeExceptionDto,
      user.userId,
    );
  }

  @Get('time-exception/employee/:id')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getTimeExceptionsByEmployee(
    @Param('id') id: string,
    @Body() getTimeExceptionsByEmployeeDto: GetTimeExceptionsByEmployeeDto,
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== id
    ) {
      throw new Error('Access denied');
    }
    return this.timeManagementService.getTimeExceptionsByEmployee(
      id,
      getTimeExceptionsByEmployeeDto,
      user.userId,
    );
  }

  @Post('time-exception/approve')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async approveTimeException(
    @Body() approveTimeExceptionDto: ApproveTimeExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.approveTimeException(
      approveTimeExceptionDto,
      user.userId,
    );
  }

  @Post('time-exception/reject')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
  )
  async rejectTimeException(
    @Body() rejectTimeExceptionDto: RejectTimeExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.rejectTimeException(
      rejectTimeExceptionDto,
      user.userId,
    );
  }

  @Post('time-exception/escalate')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async escalateTimeException(
    @Body() escalateTimeExceptionDto: EscalateTimeExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.escalateTimeException(
      escalateTimeExceptionDto,
      user.userId,
    );
  }

  // ===== US6 ENHANCEMENTS: Time Exception Management =====
  // BR-TM-08: Exception types (MISSED_PUNCH, LATE, EARLY_LEAVE, SHORT_TIME, OVERTIME_REQUEST, MANUAL_ADJUSTMENT)
  // BR-TM-09: Exception approval workflows (Open → Pending → Approved/Rejected/Escalated → Resolved)

  // Get all time exceptions with filters
  @Get('time-exceptions')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.DEPARTMENT_EMPLOYEE, // Allow employees to view their own exceptions
  )
  async getAllTimeExceptions(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('employeeId') employeeId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    // Security check: If user is DEPARTMENT_EMPLOYEE, they can only view their own exceptions
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      (!employeeId || employeeId !== user.userId)
    ) {
      throw new Error('Access denied: Employees can only view their own time exceptions');
    }
    
    return this.timeManagementService.getAllTimeExceptions(
      {
        status,
        type,
        employeeId,
        assignedTo,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user.userId,
    );
  }

  // Get time exception by ID
  @Get('time-exception/:id')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getTimeExceptionById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.getTimeExceptionById(id, user.userId);
  }

  // Resolve time exception (mark as resolved after approval action is completed)
  // BR-TM-09: Final status transition
  @Post('time-exception/resolve')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async resolveTimeException(
    @Body() body: { timeExceptionId: string; resolutionNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.resolveTimeException(body, user.userId);
  }

  // Reassign time exception to a different handler
  // BR-TM-09: Workflow reassignment
  @Post('time-exception/reassign')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async reassignTimeException(
    @Body() body: { timeExceptionId: string; newAssigneeId: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.reassignTimeException(body, user.userId);
  }

  // Get exception statistics/summary
  // BR-TM-08: Track all exception types
  @Get('time-exceptions/statistics')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getTimeExceptionStatistics(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getTimeExceptionStatistics(
      {
        employeeId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user.userId,
    );
  }

  // Bulk approve time exceptions
  // BR-TM-09: Bulk operations for efficiency
  @Post('time-exceptions/bulk-approve')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async bulkApproveTimeExceptions(
    @Body() body: { exceptionIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.bulkApproveTimeExceptions(
      body.exceptionIds,
      user.userId,
    );
  }

  // Bulk reject time exceptions
  @Post('time-exceptions/bulk-reject')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async bulkRejectTimeExceptions(
    @Body() body: { exceptionIds: string[]; reason: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.bulkRejectTimeExceptions(body, user.userId);
  }

  // Get pending exceptions for a handler
  // BR-TM-09: Workflow - handlers see their assigned exceptions
  @Get('time-exceptions/my-pending')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getPendingExceptionsForHandler(@CurrentUser() user: any) {
    return this.timeManagementService.getPendingExceptionsForHandler(
      user.userId,
      user.userId,
    );
  }

  // Get escalated exceptions
  // BR-TM-09 & BR-TM-15: View escalated exceptions requiring immediate attention
  @Get('time-exceptions/escalated')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getEscalatedExceptions(@CurrentUser() user: any) {
    return this.timeManagementService.getEscalatedExceptions(user.userId);
  }

  // ===== US14: TIME EXCEPTION APPROVAL WORKFLOW (BR-TM-01, BR-TM-19, BR-TM-20) =====

  /**
   * US14: Auto-escalate overdue exceptions
   * BR-TM-20: Unreviewed employee requests must auto-escalate after a defined time
   */
  @Post('time-exceptions/auto-escalate-overdue')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async autoEscalateOverdueExceptions(
    @Body() body: {
      thresholdDays: number;
      excludeTypes?: string[];
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.autoEscalateOverdueExceptions(
      {
        thresholdDays: body.thresholdDays,
        excludeTypes: body.excludeTypes,
      },
      user.userId,
    );
  }

  /**
   * US14: Get overdue exceptions
   * BR-TM-20: Identify requests needing escalation
   */
  @Get('time-exceptions/overdue')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getOverdueExceptions(
    @Query('thresholdDays') thresholdDays: number,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getOverdueExceptions(
      {
        thresholdDays: Number(thresholdDays),
        status: status ? status.split(',') : undefined,
      },
      user.userId,
    );
  }

  /**
   * US14: Get approval workflow configuration
   * BR-TM-01 & BR-TM-20: Escalation rules and thresholds
   */
  @Get('time-exceptions/workflow-config')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getApprovalWorkflowConfig(@CurrentUser() user: any) {
    return this.timeManagementService.getApprovalWorkflowConfig(user.userId);
  }

  /**
   * US14: Get approval workflow dashboard
   * BR-TM-01: Line Managers and HR approve or reject time management permissions
   */
  @Get('time-exceptions/workflow-dashboard')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getApprovalWorkflowDashboard(
    @Query('managerId') managerId?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getApprovalWorkflowDashboard(
      {
        managerId,
        departmentId,
      },
      user.userId,
    );
  }

  /**
   * US14: Set exception deadline
   * BR-TM-20: Support deadline-based escalation
   */
  @Post('time-exception/set-deadline')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async setExceptionDeadline(
    @Body() body: {
      exceptionId: string;
      deadlineDate: Date;
      notifyBeforeDays?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.setExceptionDeadline(
      {
        exceptionId: body.exceptionId,
        deadlineDate: new Date(body.deadlineDate),
        notifyBeforeDays: body.notifyBeforeDays,
      },
      user.userId,
    );
  }

  /**
   * US14: Get requests approaching deadline
   * BR-TM-20: Identify requests needing action before deadline
   */
  @Get('time-exceptions/approaching-deadline')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getRequestsApproachingDeadline(
    @Query('withinDays') withinDays: number,
    @Query('payrollCutoffDate') payrollCutoffDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getRequestsApproachingDeadline(
      {
        withinDays: Number(withinDays),
        payrollCutoffDate: payrollCutoffDate ? new Date(payrollCutoffDate) : undefined,
      },
      user.userId,
    );
  }

  // Auto-create lateness exception
  // BR-TM-08 & BR-TM-17: Auto-detect lateness
  @Post('time-exception/auto-lateness')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async autoCreateLatenessException(
    @Body() body: {
      employeeId: string;
      attendanceRecordId: string;
      assignedTo: string;
      lateMinutes: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.autoCreateLatenessException(
      body.employeeId,
      body.attendanceRecordId,
      body.assignedTo,
      body.lateMinutes,
      user.userId,
    );
  }

  // Scan and flag existing late attendance records
  // This retroactively creates LATE exceptions for past late clock-ins
  @Post('lateness/scan-existing')
  @Roles(SystemRole.HR_ADMIN)
  async scanExistingForLateness(
    @Body() body: { employeeId?: string; days?: number },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.scanAndFlagExistingLateness(
      body.employeeId,
      body.days || 30,
      user.userId,
    );
  }

  // Auto-create early leave exception
  // BR-TM-08: Support EARLY_LEAVE exception type
  @Post('time-exception/auto-early-leave')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async autoCreateEarlyLeaveException(
    @Body() body: {
      employeeId: string;
      attendanceRecordId: string;
      assignedTo: string;
      earlyMinutes: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.autoCreateEarlyLeaveException(
      body.employeeId,
      body.attendanceRecordId,
      body.assignedTo,
      body.earlyMinutes,
      user.userId,
    );
  }

  // ===== US4: Shift Expiry Notifications - Automatic Detection Methods =====
  // BR-TM-05: Shift schedules must be assignable by Department, Position, or Individual
  
  @Post('automation/check-expiring-shifts')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async checkExpiringShiftAssignments(
    @Body() body: { daysBeforeExpiry?: number },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.checkExpiringShiftAssignments(
      body.daysBeforeExpiry || 7,
      user.userId,
    );
  }

  @Get('automation/expired-unprocessed')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getExpiredUnprocessedAssignments(@CurrentUser() user: any) {
    return this.timeManagementService.getExpiredUnprocessedAssignments(user.userId);
  }

  @Post('automation/detect-missed-punches')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async detectMissedPunches(@CurrentUser() user: any) {
    return this.timeManagementService.detectMissedPunches(user.userId);
  }

  @Post('automation/escalate-before-payroll')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async escalateUnresolvedRequestsBeforePayroll(
    @Body() body: { payrollCutOffDate: Date },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.escalateUnresolvedRequestsBeforePayroll(
      new Date(body.payrollCutOffDate),
      user.userId,
    );
  }

  @Post('automation/monitor-lateness')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async monitorRepeatedLateness(
    @Body() monitorRepeatedLatenessDto: MonitorRepeatedLatenessDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.monitorRepeatedLateness(
      monitorRepeatedLatenessDto,
      user.userId,
    );
  }

  @Post('automation/trigger-lateness')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async triggerLatenessDisciplinary(
    @Body() triggerLatenessDisciplinaryDto: TriggerLatenessDisciplinaryDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.triggerLatenessDisciplinary(
      triggerLatenessDisciplinaryDto,
      user.userId,
    );
  }

  // ===== US12: REPEATED LATENESS HANDLING (BR-TM-09, BR-TM-16) =====

  /**
   * US12: Get detailed employee lateness history
   * BR-TM-09: Track lateness for disciplinary purposes
   */
  @Get('lateness/history/:employeeId')
  @Roles(SystemRole.HR_ADMIN)
  async getEmployeeLatenessHistory(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getEmployeeLatenessHistory(
      {
        employeeId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      user.userId,
    );
  }

  /**
   * US12: Flag employee for repeated lateness
   * BR-TM-09: Create disciplinary flag for tracking
   */
  @Post('lateness/flag')
  @Roles(SystemRole.HR_ADMIN)
  async flagEmployeeForRepeatedLateness(
    @Body()
    body: {
      employeeId: string;
      occurrenceCount: number;
      periodDays: number;
      severity: 'WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION';
      notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.flagEmployeeForRepeatedLateness(
      {
        employeeId: body.employeeId,
        occurrenceCount: body.occurrenceCount,
        periodDays: body.periodDays,
        severity: body.severity,
        notes: body.notes,
      },
      user.userId,
    );
  }

  /**
   * US12: Get all lateness disciplinary flags
   * BR-TM-09: Retrieve flagged employees for HR review
   */
  @Get('lateness/flags')
  @Roles(SystemRole.HR_ADMIN)
  async getLatenesDisciplinaryFlags(
    @Query('status') status?: 'PENDING' | 'RESOLVED' | 'ESCALATED',
    @Query('severity') severity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getLatenesDisciplinaryFlags(
      {
        status,
        severity,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user.userId,
    );
  }

  /**
   * US12: Analyze lateness patterns for an employee
   * BR-TM-09: Pattern analysis for identifying systemic issues
   */
  @Get('lateness/patterns/:employeeId')
  @Roles(SystemRole.HR_ADMIN)
  async analyzeLatenessPatterns(
    @Param('employeeId') employeeId: string,
    @Query('periodDays') periodDays?: number,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.analyzeLatenessPatterns(
      {
        employeeId,
        periodDays: periodDays ? Number(periodDays) : undefined,
      },
      user.userId,
    );
  }

  /**
   * US12: Get lateness trend report for department/organization
   * BR-TM-09: Organizational-level lateness tracking
   */
  @Post('lateness/trend-report')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async getLatenessTrendReport(
    @Body()
    body: {
      departmentId?: string;
      startDate: string;
      endDate: string;
      groupBy?: 'day' | 'week' | 'month';
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.getLatenessTrendReport(
      {
        departmentId: body.departmentId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        groupBy: body.groupBy,
      },
      user.userId,
    );
  }

  /**
   * US12: Resolve/clear a disciplinary flag
   * BR-TM-09: Mark flags as resolved after corrective action
   */
  @Post('lateness/flag/resolve')
  @Roles(SystemRole.HR_ADMIN)
  async resolveDisciplinaryFlag(
    @Body()
    body: {
      flagId: string;
      resolution: 'RESOLVED' | 'ESCALATED' | 'DISMISSED';
      resolutionNotes: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.resolveDisciplinaryFlag(
      {
        flagId: body.flagId,
        resolution: body.resolution,
        resolutionNotes: body.resolutionNotes,
      },
      user.userId,
    );
  }

  /**
   * US12: Manually trigger repeated lateness detection
   * BR-TM-09: Allow HR Admin to run the check on demand
   */
  @Post('lateness/check')
  @Roles(SystemRole.HR_ADMIN)
  async triggerRepeatedLatenessCheck(@CurrentUser() user: any) {
    await this.syncSchedulerService.handleRepeatedLatenessDetection();
    return {
      success: true,
      message: 'Repeated lateness check completed. Refresh the page to see updated flags.',
      triggeredBy: user.userId,
      triggeredAt: new Date().toISOString(),
    };
  }

  /**
   * US12: Get employees with repeated lateness exceeding thresholds
   * BR-TM-09: Identify repeat offenders for HR review
   */
  @Get('lateness/offenders')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  async getRepeatedLatenessOffenders(
    @Query('threshold') threshold: number,
    @Query('periodDays') periodDays: number,
    @Query('includeResolved') includeResolved?: boolean,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getRepeatedLatenessOffenders(
      {
        threshold: Number(threshold),
        periodDays: Number(periodDays),
        includeResolved: includeResolved === true,
      },
      user.userId,
    );
  }

  @Post('automation/schedule-backup')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async scheduleTimeDataBackup(@CurrentUser() user: any) {
    return this.timeManagementService.scheduleTimeDataBackup(user.userId);
  }

  // ===== US7: OVERTIME MANAGEMENT =====
  // BR-TM-13: Overtime calculation based on work hours exceeding standard hours
  // BR-TM-14: Overtime approval workflow (request → approve/reject)
  // BR-TM-18: Overtime rates and multipliers based on rules
  // BR-TM-19: Overtime reporting and tracking

  // Request overtime approval
  @Post('overtime/request')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async requestOvertimeApproval(
    @Body() body: {
      employeeId: string;
      attendanceRecordId: string;
      requestedMinutes: number;
      reason: string;
      assignedTo: string;
    },
    @CurrentUser() user: any,
  ) {
    // Self-access check: Allow DEPARTMENT_HEAD to access their own data
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      user.userId !== body.employeeId
    ) {
      throw new Error('Access denied');
    }
    return this.timeManagementService.requestOvertimeApproval(body, user.userId);
  }

  // Calculate overtime from attendance record
  @Post('overtime/calculate/:attendanceRecordId')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.SYSTEM_ADMIN,
  )
  async calculateOvertimeFromAttendance(
    @Param('attendanceRecordId') attendanceRecordId: string,
    @Body() body: { standardWorkMinutes?: number },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.calculateOvertimeFromAttendance(
      attendanceRecordId,
      body.standardWorkMinutes || 480,
      user.userId,
    );
  }

  // Get employee overtime summary
  @Get('overtime/summary/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.SYSTEM_ADMIN,
  )
  async getEmployeeOvertimeSummary(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
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
    return this.timeManagementService.getEmployeeOvertimeSummary(
      employeeId,
      new Date(startDate),
      new Date(endDate),
      user.userId,
    );
  }

  // Get pending overtime requests
  @Get('overtime/pending')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getPendingOvertimeRequests(
    @Query('departmentId') departmentId?: string,
    @Query('assignedTo') assignedTo?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getPendingOvertimeRequests(
      { departmentId, assignedTo },
      user.userId,
    );
  }

  // Approve overtime request
  @Post('overtime/approve/:id')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async approveOvertimeRequest(
    @Param('id') id: string,
    @Body() body: { approvalNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.approveOvertimeRequest(
      id,
      body.approvalNotes,
      user.userId,
    );
  }

  // Reject overtime request
  @Post('overtime/reject/:id')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async rejectOvertimeRequest(
    @Param('id') id: string,
    @Body() body: { rejectionReason: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.rejectOvertimeRequest(
      id,
      body.rejectionReason,
      user.userId,
    );
  }

  // Auto-detect and create overtime exception
  @Post('overtime/auto-detect/:attendanceRecordId')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async autoDetectAndCreateOvertimeException(
    @Param('attendanceRecordId') attendanceRecordId: string,
    @Body() body: { standardWorkMinutes?: number; assignedTo: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.autoDetectAndCreateOvertimeException(
      attendanceRecordId,
      body.standardWorkMinutes || 480,
      body.assignedTo,
      user.userId,
    );
  }

  // Get overtime statistics
  @Get('overtime/statistics')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.SYSTEM_ADMIN,
  )
  async getOvertimeStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getOvertimeStatistics(
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        departmentId,
      },
      user.userId,
    );
  }

  // Bulk process overtime requests
  @Post('overtime/bulk-process')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async bulkProcessOvertimeRequests(
    @Body() body: { action: 'approve' | 'reject'; requestIds: string[]; notes: string },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.bulkProcessOvertimeRequests(
      body.action,
      body.requestIds,
      body.notes,
      user.userId,
    );
  }

  // ===== REPORTING =====
  @Post('reports/overtime')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async generateOvertimeReport(
    @Body() generateOvertimeReportDto: GenerateOvertimeReportDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateOvertimeReport(
      generateOvertimeReportDto,
      user.userId,
    );
  }

  @Post('reports/lateness')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async generateLatenessReport(
    @Body() generateLatenessReportDto: GenerateLatenessReportDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateLatenessReport(
      generateLatenessReportDto,
      user.userId,
    );
  }

  @Post('reports/exception')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async generateExceptionReport(
    @Body() generateExceptionReportDto: GenerateExceptionReportDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateExceptionReport(
      generateExceptionReportDto,
      user.userId,
    );
  }

  @Post('reports/export')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async exportReport(
    @Body() exportReportDto: ExportReportDto,
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.exportReport(
      exportReportDto,
      user.userId,
    );
  }

  // ===== US15: TIME MANAGEMENT REPORTING & ANALYTICS (BR-TM-19, BR-TM-13, BR-TM-22) =====

  /**
   * US15: Generate comprehensive attendance summary report
   * BR-TM-19: Time management reporting and tracking
   */
  @Post('reports/attendance-summary')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.DEPARTMENT_HEAD,
  )
  async generateAttendanceSummaryReport(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      groupBy?: 'day' | 'week' | 'month';
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateAttendanceSummaryReport(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
        departmentId: body.departmentId,
        groupBy: body.groupBy,
      },
      user.userId,
    );
  }

  /**
   * US15: Generate overtime cost analysis report
   * BR-TM-13: Overtime calculation based on work hours
   * BR-TM-19: Overtime reporting and tracking
   */
  @Post('reports/overtime-cost-analysis')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async generateOvertimeCostAnalysis(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      hourlyRate?: number;
      overtimeMultiplier?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateOvertimeCostAnalysis(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
        departmentId: body.departmentId,
        hourlyRate: body.hourlyRate,
        overtimeMultiplier: body.overtimeMultiplier,
      },
      user.userId,
    );
  }

  /**
   * US15: Generate payroll-ready attendance data
   * BR-TM-22: All time management data must sync with payroll
   */
  @Post('reports/payroll-ready')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async generatePayrollReadyReport(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeIds?: string[];
      departmentId?: string;
      includeExceptions?: boolean;
      includePenalties?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generatePayrollReadyReport(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeIds: body.employeeIds,
        departmentId: body.departmentId,
        includeExceptions: body.includeExceptions,
        includePenalties: body.includePenalties,
      },
      user.userId,
    );
  }

  /**
   * US15: Generate disciplinary summary report
   * BR-TM-16: Repeated offenses trigger auto-escalation
   * BR-TM-09: Track for disciplinary purposes
   */
  @Post('reports/disciplinary-summary')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  )
  async generateDisciplinarySummaryReport(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
      severityFilter?: string[];
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateDisciplinarySummaryReport(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        departmentId: body.departmentId,
        severityFilter: body.severityFilter,
      },
      user.userId,
    );
  }

  /**
   * US15: Get time management analytics dashboard
   * BR-TM-19: Time management reporting and tracking
   */
  @Post('reports/analytics-dashboard')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getTimeManagementAnalyticsDashboard(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      departmentId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.getTimeManagementAnalyticsDashboard(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        departmentId: body.departmentId,
      },
      user.userId,
    );
  }

  // ===== US19: OVERTIME & EXCEPTION REPORTS (BR-TM-21) =====

  /**
   * US19: Get detailed lateness logs
   * BR-TM-21: HR and Line Managers must have access to lateness logs
   */
  @Post('reports/lateness-logs')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getLatenessLogs(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      includeResolved?: boolean;
      sortBy?: 'date' | 'employee' | 'duration';
      sortOrder?: 'asc' | 'desc';
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.getLatenessLogs(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
        departmentId: body.departmentId,
        includeResolved: body.includeResolved,
        sortBy: body.sortBy,
        sortOrder: body.sortOrder,
      },
      user.userId,
    );
  }

  /**
   * US19: Generate overtime and exception compliance report
   * BR-TM-21: HR and Line Managers must have access to overtime reports
   */
  @Post('reports/overtime-exception-compliance')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async generateOvertimeAndExceptionComplianceReport(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      includeAllExceptionTypes?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.generateOvertimeAndExceptionComplianceReport(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
        departmentId: body.departmentId,
        includeAllExceptionTypes: body.includeAllExceptionTypes,
      },
      user.userId,
    );
  }

  /**
   * US19: Get employee attendance history with overtime and exceptions
   * BR-TM-21: Line Managers must have access to attendance summaries
   */
  @Post('reports/employee-attendance-history')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.DEPARTMENT_EMPLOYEE,
  )
  async getEmployeeAttendanceHistory(
    @Body() body: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
      includeExceptions?: boolean;
      includeOvertime?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    // Self-access check: employees can only view their own history
    if (
      user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE) &&
      !user.roles.includes(SystemRole.DEPARTMENT_HEAD) &&
      !user.roles.includes(SystemRole.HR_MANAGER) &&
      !user.roles.includes(SystemRole.HR_ADMIN) &&
      user.userId !== body.employeeId
    ) {
      throw new Error('Access denied: You can only view your own attendance history');
    }

    return this.timeManagementService.getEmployeeAttendanceHistory(
      {
        employeeId: body.employeeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        includeExceptions: body.includeExceptions,
        includeOvertime: body.includeOvertime,
      },
      user.userId,
    );
  }

  /**
   * US19: Export overtime and exception report
   * BR-TM-21: Access to overtime reports
   * BR-TM-23: Reports must be exportable in multiple formats
   */
  @Post('reports/overtime-exception-export')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async exportOvertimeExceptionReport(
    @Body() body: {
      startDate: Date;
      endDate: Date;
      employeeId?: string;
      departmentId?: string;
      format: 'excel' | 'csv' | 'text';
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.exportOvertimeExceptionReport(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        employeeId: body.employeeId,
        departmentId: body.departmentId,
        format: body.format,
      },
      user.userId,
    );
  }

  // ===== DATA SYNCHRONIZATION (BR-TM-22) =====

  /**
   * Sync time management data with payroll, leaves, and benefits modules
   * BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules
   * As an HR Admin, I want attendance records to sync daily with payroll and leave systems
   * As an HR Manager, I want attendance and time management data synchronized with payroll and leave modules
   */
  @Post('sync-data')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async syncData(
    @Body() body: {
      syncDate?: Date;
      modules?: ('payroll' | 'leaves' | 'benefits')[];
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.syncTimeManagementData(
      {
        syncDate: body.syncDate ? new Date(body.syncDate) : new Date(),
        modules: body.modules || ['payroll', 'leaves', 'benefits'],
      },
      user.userId,
    );
  }

  /**
   * Get sync status
   * BR-TM-22: Check sync status across modules
   */
  @Get('sync-status')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getSyncStatus(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.timeManagementService.getSyncStatus(
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user?.userId || 'system',
    );
  }

  /**
   * Device sync - sync attendance data from devices when they reconnect
   * BR-TM-13: Attendance devices must sync automatically once reconnected online
   */
  @Post('sync-device')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async syncDeviceData(
    @Body() body: {
      deviceId: string;
      employeeId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.syncDeviceData(
      {
        deviceId: body.deviceId,
        employeeId: body.employeeId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
      user.userId,
    );
  }

  // ===== US16: VACATION PACKAGE - ATTENDANCE INTEGRATION =====
  // BR-TM-19: Vacation packages must be linked to shift schedules
  // Auto-reflect approved leave in attendance records

  /**
   * Create attendance records for approved leave period
   * Called when a leave request is finalized/approved
   */
  @Post('leave-attendance/create')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async createLeaveAttendanceRecords(
    @Body() body: {
      employeeId: string;
      leaveRequestId: string;
      startDate: Date;
      endDate: Date;
      leaveType: string;
      durationDays: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.timeManagementService.createLeaveAttendanceRecords(
      {
        employeeId: body.employeeId,
        leaveRequestId: body.leaveRequestId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        leaveType: body.leaveType,
        durationDays: body.durationDays,
      },
      user.userId,
    );
  }

  /**
   * Get employee's leave-attendance integration status
   */
  @Get('leave-attendance/status/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getEmployeeLeaveAttendanceStatus(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeManagementService.getEmployeeLeaveAttendanceStatus(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Validate shift assignment against approved leaves
   */
  @Post('leave-attendance/validate-shift')
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async validateShiftAgainstApprovedLeave(
    @Body() body: {
      employeeId: string;
      shiftStartDate: Date;
      shiftEndDate: Date;
    },
  ) {
    return this.timeManagementService.validateShiftAgainstApprovedLeave({
      employeeId: body.employeeId,
      shiftStartDate: new Date(body.shiftStartDate),
      shiftEndDate: new Date(body.shiftEndDate),
    });
  }

  /**
   * Get department vacation-attendance summary
   */
  @Get('leave-attendance/department-summary/:departmentId')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getDepartmentVacationAttendanceSummary(
    @Param('departmentId') departmentId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.timeManagementService.getDepartmentVacationAttendanceSummary(
      departmentId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  // ===== US18: PAYROLL CUT-OFF ESCALATION (BR-TM-20) =====

  /**
   * US18: Trigger manual payroll cut-off escalation
   * BR-TM-20: Escalate pending requests before payroll cut-off
   */
  @Post('payroll-escalation/trigger')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async triggerPayrollCutoffEscalation(@CurrentUser() user: any) {
    return this.syncSchedulerService.triggerPayrollCutoffEscalation();
  }

  /**
   * US18: Get payroll readiness status
   * BR-TM-20: Check pending requests before payroll cut-off
   */
  @Get('payroll-escalation/status')
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async getPayrollReadinessStatus() {
    return this.syncSchedulerService.getPayrollReadinessStatus();
  }

  /**
   * TEST ONLY: Reset escalated items back to pending
   * For testing purposes only - removes escalation status
   */
  @Post('payroll-escalation/reset-to-pending')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async resetEscalatedToPending() {
    return this.syncSchedulerService.resetEscalatedToPending();
  }
}
