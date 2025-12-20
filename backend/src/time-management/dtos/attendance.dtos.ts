import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDate,
  IsBoolean,
  IsEnum,
  IsNumber,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CorrectionRequestStatus, TimeExceptionType, TimeExceptionStatus, PunchType } from '../models/enums';  // Importing enums from index.ts

// Custom validator to ensure endDate >= startDate
@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: any, args: ValidationArguments) {
    const obj = args.object as any;
    const startDate = obj.startDate;
    if (!startDate || !endDate) return true; // Let @IsOptional handle missing dates
    return new Date(endDate).getTime() >= new Date(startDate).getTime();
  }

  defaultMessage(args: ValidationArguments) {
    return 'endDate must be greater than or equal to startDate';
  }
}

// Nested DTO for attendance punches
// Needed because global ValidationPipe uses whitelist=true, which strips nested fields
// unless they are defined in a class with decorators.
export class AttendancePunchDto {
  @IsNotEmpty()
  @IsEnum(PunchType)
  type: PunchType;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  time: Date;
}

// DTO for creating an attendance record - ALL FIELDS FROM SCHEMA
export class CreateAttendanceRecordDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID referencing the employee (required)

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendancePunchDto)
  punches: AttendancePunchDto[];  // Array of punch records with PunchType enum (required)

  @IsNotEmpty()
  @IsNumber()
  totalWorkMinutes: number;  // Total work minutes computed (required)

  @IsNotEmpty()
  @IsBoolean()
  hasMissedPunch: boolean;  // Whether there's a missed punch (required)

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  exceptionIds: string[];  // Array of TimeException IDs (required)

  @IsNotEmpty()
  @IsBoolean()
  finalisedForPayroll: boolean;  // Whether the record is finalised for payroll (required)
}

// DTO for getting attendance records by employee
export class GetAttendanceRecordDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to fetch attendance records for

  @IsOptional()
  @IsDate()
  startDate?: Date;  // Optional: Start date for the attendance period

  @IsOptional()
  @IsDate()
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date;  // Optional: End date for the attendance period
}

// DTO for updating an attendance record - ALL FIELDS FROM SCHEMA
export class UpdateAttendanceRecordDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendancePunchDto)
  punches: AttendancePunchDto[];  // Array of punch records with PunchType enum (required)

  @IsNotEmpty()
  @IsNumber()
  totalWorkMinutes: number;  // Total work minutes computed (required)

  @IsNotEmpty()
  @IsBoolean()
  hasMissedPunch: boolean;  // Whether there's a missed punch (required)

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  exceptionIds: string[];  // Array of TimeException IDs (required)

  @IsNotEmpty()
  @IsBoolean()
  finalisedForPayroll: boolean;  // Whether the record is finalised for payroll (required)
}

// DTO for validating an attendance record
export class ValidateAttendanceDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to validate their attendance

  @IsOptional()
  @IsDate()
  date?: Date;  // Optional: Specific date for validation (if not specified, it will check for today)

  @IsOptional()
  @IsString()
  shiftId?: string;  // Optional: If you want to validate against a specific shift
}

// DTO for calculating total work minutes for an attendance record
export class CalculateWorkMinutesDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to calculate work minutes for

  @IsOptional()
  @IsDate()
  startDate?: Date;  // Optional: Start date for calculating work minutes

  @IsOptional()
  @IsDate()
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date;  // Optional: End date for calculating work minutes
}

// DTO for submitting a correction request - ALL FIELDS FROM SCHEMA
export class SubmitCorrectionRequestDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID requesting the correction (required)

  @IsNotEmpty()
  @IsString()
  attendanceRecord: string;  // Attendance record ID that needs correction (required) - matches schema field name

  @IsNotEmpty()
  @IsString()
  reason: string;  // Reason for the correction request (required)

  @IsOptional()
  @IsEnum(CorrectionRequestStatus)
  status?: CorrectionRequestStatus;  // Correction request status (optional - defaults to SUBMITTED)
}

// DTO for getting all attendance correction requests by employee
export class GetCorrectionsDto {
  @IsOptional()
  @IsEnum(CorrectionRequestStatus)
  status?: CorrectionRequestStatus;  // Optional: Filter by status (pending, approved, rejected)

  @IsOptional()
  @IsString()
  employeeId?: string;  // Optional: Filter by employee ID
}

// DTO for getting all attendance correction requests (for HR/Admin)
export class GetAllCorrectionsDto {
  @IsOptional()
  @IsEnum(CorrectionRequestStatus)
  status?: CorrectionRequestStatus;  // Optional: Filter by status (pending, approved, rejected)

  @IsOptional()
  @IsString()
  employeeId?: string;  // Optional: Filter by employee ID
}

// DTO for creating a time exception - ALL FIELDS FROM SCHEMA
export class CreateTimeExceptionDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID requesting the exception (required)

  @IsNotEmpty()
  @IsEnum(TimeExceptionType)
  type: TimeExceptionType;  // Type of exception (required)

  @IsNotEmpty()
  @IsString()
  attendanceRecordId: string;  // Attendance record associated with the exception (required)

  @IsNotEmpty()
  @IsString()
  assignedTo: string;  // Person responsible for handling the exception (required)

  @IsNotEmpty()
  @IsEnum(TimeExceptionStatus)
  status: TimeExceptionStatus;  // Status of the exception (required)

  @IsNotEmpty()
  @IsString()
  reason: string;  // Reason for the time exception (required)
}

// DTO for updating a time exception - ALL FIELDS FROM SCHEMA
export class UpdateTimeExceptionDto {
  @IsNotEmpty()
  @IsEnum(TimeExceptionStatus)
  status: TimeExceptionStatus;  // Status of the exception (required)

  @IsNotEmpty()
  @IsString()
  assignedTo: string;  // Person responsible for handling the exception (required)

  @IsNotEmpty()
  @IsString()
  reason: string;  // Reason for the status change (required)
}

// DTO for retrieving all time exceptions by employee
export class GetTimeExceptionsByEmployeeDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to fetch time exceptions for

  @IsOptional()
  @IsEnum(TimeExceptionStatus)
  status?: TimeExceptionStatus;  // Optional filter by exception status (e.g., open, approved, rejected)
}

// DTO for approving a time exception
export class ApproveTimeExceptionDto {
  @IsNotEmpty()
  @IsString()
  timeExceptionId: string;  // Time exception ID to approve

  @IsOptional()
  @IsString()
  approvalNotes?: string;  // Optional approval notes
}

// DTO for rejecting a time exception
export class RejectTimeExceptionDto {
  @IsNotEmpty()
  @IsString()
  timeExceptionId: string;  // Time exception ID to reject

  @IsOptional()
  @IsString()
  rejectionReason?: string;  // Optional rejection reason
}

// DTO for escalating a time exception
export class EscalateTimeExceptionDto {
  @IsNotEmpty()
  @IsString()
  timeExceptionId: string;  // Time exception ID to escalate
}

// DTO for approving a correction request
export class ApproveCorrectionRequestDto {
  @IsNotEmpty()
  @IsString()
  correctionRequestId: string;  // Correction request ID to approve

  @IsOptional()
  @IsString()
  reason?: string;  // Optional reason for approval
}

// DTO for rejecting a correction request
export class RejectCorrectionRequestDto {
  @IsNotEmpty()
  @IsString()
  correctionRequestId: string;  // Correction request ID to reject

  @IsOptional()
  @IsString()
  reason?: string;  // Optional reason for rejection
}

// DTO for importing attendance data from CSV
// Note: We intentionally keep this simple (raw CSV string) to avoid
// adding new models or enums. The service is responsible for parsing.
export class ImportAttendanceCsvDto {
  @IsNotEmpty()
  @IsString()
  csv: string;  // Raw CSV content including header line
}