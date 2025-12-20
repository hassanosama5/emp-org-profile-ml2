// Enums
// All 7 required statuses per business requirements:
// Shifts must be assigned per employee for a defined term and hold these statuses
export enum ShiftAssignmentStatus {
  ENTERED = 'ENTERED',       // Initial entry - assignment has been entered but not yet submitted
  SUBMITTED = 'SUBMITTED',   // Submitted for approval
  APPROVED = 'APPROVED',     // Approved by manager/HR
  REJECTED = 'REJECTED',     // Rejected by approver
  CANCELLED = 'CANCELLED',   // Cancelled assignment
  POSTPONED = 'POSTPONED',   // Temporarily postponed
  EXPIRED = 'EXPIRED',       // Assignment term has expired
}

export enum PunchPolicy {
  MULTIPLE = 'MULTIPLE',
  FIRST_LAST = 'FIRST_LAST',
  ONLY_FIRST = 'ONLY_FIRST',
}

// Shift Assignment Types
export interface ShiftAssignment {
  _id: string;
  employeeId?: string;
  departmentId?: string;
  positionId?: string;
  shiftId: string;
  scheduleRuleId?: string;
  startDate: Date | string;
  endDate?: Date | string;
  status: ShiftAssignmentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignShiftToEmployeeDto {
  employeeId: string;
  shiftId: string;
  startDate: string; // DateString format (YYYY-MM-DD)
  endDate: string; // DateString format (YYYY-MM-DD)
  status: ShiftAssignmentStatus;
  departmentId?: string;
  positionId?: string;
  scheduleRuleId?: string;
}

export interface AssignShiftToDepartmentDto {
  departmentId: string;
  shiftId: string;
  includePositions?: string[];
  startDate?: Date;
  endDate?: Date;
  status?: ShiftAssignmentStatus;
}

export interface AssignShiftToPositionDto {
  positionId: string;
  shiftId: string;
  startDate?: Date;
  endDate?: Date;
  status?: ShiftAssignmentStatus;
}

export interface UpdateShiftAssignmentDto {
  status: ShiftAssignmentStatus;
  startDate: Date;
  endDate: Date;
  employeeId?: string;
  departmentId?: string;
  positionId?: string;
  shiftId?: string;
  scheduleRuleId?: string;
}

// Optional: Shift and ShiftType for display purposes
export interface ShiftType {
  _id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shift {
  _id: string;
  name: string;
  shiftType: string; // ShiftType ID reference
  startTime: string;
  endTime: string;
  punchPolicy: PunchPolicy;
  graceInMinutes: number;
  graceOutMinutes: number;
  requiresApprovalForOvertime: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Shift Expiry Notification Types
export interface ShiftExpiryNotification {
  _id: string;
  to: string;
  type: 'SHIFT_EXPIRY_ALERT' | 'SHIFT_EXPIRY_BULK_ALERT';
  message: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface ExpiringShiftAssignment {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  employeeNumber?: string;
  shiftId: string;
  shiftName: string;
  shiftTimes?: string;
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionName?: string;
  startDate: Date | string;
  endDate: Date | string;
  daysRemaining: number;
  status: ShiftAssignmentStatus;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CheckExpiringShiftsResponse {
  count: number;
  daysBeforeExpiry: number;
  summary: {
    highUrgency: number;
    mediumUrgency: number;
    lowUrgency: number;
  };
  assignments: ExpiringShiftAssignment[];
}

// Correction Request Types
export enum CorrectionRequestStatus {
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export interface AttendanceCorrectionRequest {
  _id?: string;
  id?: string;
  employeeId: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    employeeNumber?: string;
  };
  attendanceRecord: string | {
    _id: string;
    date?: Date | string;
    clockIn?: Date | string;
    clockOut?: Date | string;
    totalWorkMinutes?: number;
    punches?: Array<{ time: Date | string; type: string }>;
  };
  reason?: string;
  status: CorrectionRequestStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CorrectionRequestResponse {
  success?: boolean;
  message?: string;
  request?: AttendanceCorrectionRequest;
  id?: string;
  status?: CorrectionRequestStatus;
}

export interface GetAllCorrectionRequestsFilters {
  status?: CorrectionRequestStatus | string;
  employeeId?: string;
}

export interface PendingCorrectionRequestsResponse {
  summary: {
    total: number;
    submitted: number;
    inReview: number;
    escalated: number;
  };
  requests: Array<{
    id: string;
    employee: any;
    status: CorrectionRequestStatus;
    reason?: string;
    attendanceRecord: any;
    createdAt: Date | string;
    waitingDays: number;
  }>;
  byStatus?: {
    submitted: any[];
    inReview: any[];
    escalated: any[];
  };
}

// Time Exception Types
export enum TimeExceptionType {
  MISSED_PUNCH = 'MISSED_PUNCH',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  SHORT_TIME = 'SHORT_TIME',
  OVERTIME_REQUEST = 'OVERTIME_REQUEST',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export enum TimeExceptionStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
}

export interface TimeException {
  _id?: string;
  id?: string;
  employeeId: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    employeeNumber?: string;
  };
  type: TimeExceptionType;
  attendanceRecordId: string | {
    _id: string;
    date?: Date | string;
    clockIn?: Date | string;
    clockOut?: Date | string;
  };
  assignedTo: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  status: TimeExceptionStatus;
  reason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface GetAllTimeExceptionsFilters {
  status?: TimeExceptionStatus | string;
  type?: TimeExceptionType | string;
  employeeId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
}

export interface OverdueExceptionsResponse {
  thresholdDays: number;
  thresholdDate: Date | string;
  totalOverdue: number;
  exceptions: Array<{
    id: string;
    employeeId: any;
    type: TimeExceptionType;
    status: TimeExceptionStatus;
    assignedTo: any;
    reason?: string;
    createdAt: Date | string;
    daysPending: number;
  }>;
}

export interface AutoEscalateResponse {
  thresholdDays: number;
  thresholdDate: Date | string;
  summary: {
    totalOverdue: number;
    escalated: number;
    failed: number;
  };
  escalatedIds: string[];
  failedIds: string[];
  executedAt: Date | string;
}

// Overtime Limits & Validation Types
export interface OvertimeLimitsConfig {
  daily: {
    maxOvertimeMinutes: number;
    maxOvertimeHours: number;
    softLimitMinutes: number;
  };
  weekly: {
    maxOvertimeMinutes: number;
    maxOvertimeHours: number;
    softLimitMinutes: number;
  };
  monthly: {
    maxOvertimeMinutes: number;
    maxOvertimeHours: number;
    softLimitMinutes: number;
  };
  policies: {
    enforceHardLimits: boolean;
    requireApprovalAboveSoftLimit: boolean;
    carryOverAllowed: boolean;
  };
}

export interface CheckOvertimeLimitsRequest {
  employeeId: string;
  currentOvertimeMinutes: number;
  period: 'daily' | 'weekly' | 'monthly';
  additionalOvertimeMinutes?: number;
}

export interface CheckOvertimeLimitsResponse {
  employeeId: string;
  period: 'daily' | 'weekly' | 'monthly';
  limits: {
    maxOvertimeMinutes: number;
    maxOvertimeHours: number;
    softLimitMinutes: number;
  };
  current: {
    minutes: number;
    hours: number;
  };
  projected: {
    minutes: number;
    hours: number;
  };
  remaining: {
    toSoftLimit: number;
    toHardLimit: number;
  };
  status: {
    withinSoftLimit: boolean;
    withinHardLimit: boolean;
    requiresApproval: boolean;
    blocked: boolean;
  };
  recommendation: string;
}

export interface ValidatePreApprovalRequest {
  employeeId: string;
  date: string;
  expectedOvertimeMinutes: number;
}

export interface ValidatePreApprovalResponse {
  employeeId: string;
  date: Date | string;
  expectedOvertimeMinutes: number;
  expectedOvertimeHours: number;
  preApprovalRequired: boolean;
  reason: string;
  dateInfo: {
    isHoliday: boolean;
    isWeekend: boolean;
    dayOfWeek: string;
  };
}

// Holiday & Rest Day Types
export enum HolidayType {
  NATIONAL = 'NATIONAL',
  ORGANIZATIONAL = 'ORGANIZATIONAL',
  WEEKLY_REST = 'WEEKLY_REST',
}

export interface Holiday {
  _id?: string;
  id?: string;
  type: HolidayType;
  startDate: Date | string;
  endDate?: Date | string;
  name: string;
  active: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateHolidayRequest {
  type: HolidayType;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  name: string;
  active: boolean;
}

export interface BulkCreateHolidaysRequest {
  holidays: Array<{
    name: string;
    type: HolidayType | string;
    startDate: string;
    endDate?: string;
  }>;
  year?: number;
}

export interface BulkCreateHolidaysResponse {
  success: boolean;
  year: number;
  summary: {
    total: number;
    created: number;
    failed: number;
  };
  createdHolidays: Array<{
    id: string;
    name: string;
    startDate: Date | string;
  }>;
  failedHolidays?: Array<{
    name: string;
    error: string;
  }>;
  createdAt: Date | string;
  createdBy: string;
}

export interface GetHolidaysFilters {
  type?: HolidayType | string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ConfigureRestDaysRequest {
  restDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  effectiveFrom?: string;
  effectiveTo?: string;
  departmentId?: string;
}

export interface ConfigureRestDaysResponse {
  success: boolean;
  configuration: {
    restDays: number[];
    restDayNames: string[];
    effectiveFrom: Date | string;
    effectiveTo: Date | string | null;
    departmentId: string;
    scope: 'DEPARTMENT' | 'ORGANIZATION';
  };
  penaltySuppression: {
    enabled: boolean;
    message: string;
  };
  configuredAt: Date | string;
  configuredBy: string;
}

export interface LinkHolidaysToShiftRequest {
  shiftId: string;
  holidayIds: string[];
  action: 'NO_WORK' | 'OPTIONAL' | 'OVERTIME_ELIGIBLE';
}

export interface LinkHolidaysToShiftResponse {
  success: boolean;
  shiftId: string;
  action: 'NO_WORK' | 'OPTIONAL' | 'OVERTIME_ELIGIBLE';
  actionDescription: string;
  linkedHolidays: Array<{
    holidayId: string;
    name: string;
    startDate: Date | string;
    type: HolidayType | string;
  }>;
  holidayCount: number;
  linkedAt: Date | string;
  linkedBy: string;
}

// ===== REPORTS =====

export interface GenerateOvertimeReportRequest {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GenerateExceptionReportRequest {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportReportRequest {
  reportType: 'overtime' | 'lateness' | 'exception';
  format: 'excel' | 'csv' | 'text';
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface OvertimeReportResponse {
  employeeId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  records: any[];
  summary: {
    totalRecords: number;
    totalOvertimeMinutes: number;
    totalOvertimeHours: number;
  };
}

export interface ExceptionReportResponse {
  employeeId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  records: any[];
  summary: {
    totalRecords: number;
    byType: Array<{
      type: string;
      count: number;
    }>;
  };
}

export interface ExportReportResponse {
  format: 'excel' | 'csv' | 'text';
  data: string;
  reportType: 'overtime' | 'lateness' | 'exception';
  generatedAt: Date | string;
}
 

// ===== ATTENDANCE RECORDS =====

export interface AttendanceRecord {
  _id?: string;
  id?: string;
  employeeId: string;
  date: Date | string;
  clockIn?: Date | string;
  clockOut?: Date | string;
  totalWorkMinutes?: number;
  hasMissedPunch?: boolean;
  status: 'COMPLETE' | 'INCOMPLETE' | 'CORRECTION_PENDING';
  exceptionIds?: string[];
  finalisedForPayroll?: boolean;
  correctionRequest?: {
    id: string;
    status: CorrectionRequestStatus;
    reason?: string;
  };
  punches?: Array<{
    time: Date | string;
    type: 'IN' | 'OUT';
    source?: 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
    location?: string;
    deviceId?: string;
  }>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AttendanceStatus {
  employeeId: string;
  date: Date | string;
  isClockedIn: boolean;
  currentRecord?: AttendanceRecord;
  clockInTime?: Date | string;
  elapsedMinutes?: number;
  message?: string;
  // BR-TM-11: Punch policy information
  punchPolicy?: 'MULTIPLE' | 'FIRST_LAST' | 'ONLY_FIRST';
  shiftName?: string;
  canClockInMultiple?: boolean;
  hasClockInToday?: boolean;
  canClockIn?: boolean;
}

export interface ClockInRequest {
  source?: 'WEB' | 'MOBILE' | 'MANUAL';
  location?: string;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  ipAddress?: string;
}

export interface ClockOutRequest {
  source?: 'WEB' | 'MOBILE' | 'MANUAL';
  location?: string;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  ipAddress?: string;
}

export interface SubmitCorrectionRequest {
  employeeId: string;
  attendanceRecord: string;
  reason: string;
}
