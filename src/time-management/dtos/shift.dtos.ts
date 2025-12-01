import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsDate,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PunchPolicy, ShiftAssignmentStatus } from '../models/enums'; // Importing existing enums

// DTO for creating a shift type - ALL FIELDS FROM SCHEMA
export class CreateShiftTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the shift type (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the shift type is active (required)
}

// DTO for updating a shift type - ALL FIELDS FROM SCHEMA
export class UpdateShiftTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the shift type (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the shift type is active (required)
}

// DTO for getting shift types (no parameters needed)
export class GetShiftTypesDto {}

// DTO for creating a shift - ALL FIELDS FROM SCHEMA
export class CreateShiftDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the shift (required)

  @IsNotEmpty()
  @IsString()
  shiftType: string; // ShiftType ID reference (required)

  @IsNotEmpty()
  @IsString()
  startTime: string; // Shift start time (required)

  @IsNotEmpty()
  @IsString()
  endTime: string; // Shift end time (required)

  @IsNotEmpty()
  @IsEnum(PunchPolicy)
  punchPolicy: PunchPolicy; // Punch policy (required)

  @IsNotEmpty()
  @IsNumber()
  graceInMinutes: number; // Grace time for punch-in (required)

  @IsNotEmpty()
  @IsNumber()
  graceOutMinutes: number; // Grace time for punch-out (required)

  @IsNotEmpty()
  @IsBoolean()
  requiresApprovalForOvertime: boolean; // Whether overtime requires approval (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the shift is active (required)
}

// DTO for updating a shift - ALL FIELDS FROM SCHEMA
export class UpdateShiftDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Shift name (required)

  @IsNotEmpty()
  @IsString()
  shiftType: string; // ShiftType ID reference (required)

  @IsNotEmpty()
  @IsEnum(PunchPolicy)
  punchPolicy: PunchPolicy; // Shift punch policy (required)

  @IsNotEmpty()
  @IsString()
  startTime: string; // Shift start time (required)

  @IsNotEmpty()
  @IsString()
  endTime: string; // Shift end time (required)

  @IsNotEmpty()
  @IsNumber()
  graceInMinutes: number; // Grace time for punch-in (required)

  @IsNotEmpty()
  @IsNumber()
  graceOutMinutes: number; // Grace time for punch-out (required)

  @IsNotEmpty()
  @IsBoolean()
  requiresApprovalForOvertime: boolean; // Whether overtime requires approval (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the shift is active (required)
}

// DTO for getting shifts by type (without using ShiftType enum)
export class GetShiftsByTypeDto {
  @IsNotEmpty()
  @IsString()
  shiftType: string; // Shift type as string (Normal, Rotational, etc.)
}

// DTO for assigning a shift to an employee - ALL FIELDS FROM SCHEMA
export class AssignShiftToEmployeeDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID to assign the shift to (required)

  @IsNotEmpty()
  @IsString()
  shiftId: string; // Shift ID to assign to the employee (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date; // Start date for the shift assignment (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date; // End date for the shift assignment (required)

  @IsNotEmpty()
  @IsEnum(ShiftAssignmentStatus)
  status: ShiftAssignmentStatus; // Status of the shift assignment (required)

  @IsOptional()
  @IsString()
  departmentId?: string; // Department ID (optional per schema)

  @IsOptional()
  @IsString()
  positionId?: string; // Position ID (optional per schema)

  @IsOptional()
  @IsString()
  scheduleRuleId?: string; // Schedule rule ID (optional per schema)
}

export class AssignShiftToDepartmentDto {
  @IsNotEmpty()
  @IsString()
  departmentId: string;

  @IsNotEmpty()
  @IsString()
  shiftId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePositions?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

export class AssignShiftToPositionDto {
  @IsNotEmpty()
  @IsString()
  positionId: string;

  @IsNotEmpty()
  @IsString()
  shiftId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

// DTO for updating a shift assignment - ALL FIELDS FROM SCHEMA
export class UpdateShiftAssignmentDto {
  @IsNotEmpty()
  @IsEnum(ShiftAssignmentStatus)
  status: ShiftAssignmentStatus; // Status of the shift assignment (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date; // Start date for the shift assignment (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date; // End date for the shift assignment (required)

  @IsOptional()
  @IsString()
  employeeId?: string; // Employee ID (optional)

  @IsOptional()
  @IsString()
  departmentId?: string; // Department ID (optional)

  @IsOptional()
  @IsString()
  positionId?: string; // Position ID (optional)

  @IsOptional()
  @IsString()
  shiftId?: string; // Shift ID (optional)

  @IsOptional()
  @IsString()
  scheduleRuleId?: string; // Schedule rule ID (optional)
}

export class RenewShiftAssignmentDto {
  @IsNotEmpty()
  @IsString()
  assignmentId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  newEndDate?: Date;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelShiftAssignmentDto {
  @IsNotEmpty()
  @IsString()
  assignmentId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PostponeShiftAssignmentDto {
  @IsNotEmpty()
  @IsString()
  assignmentId: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  postponeUntil: Date;
}

// DTO for getting all shift assignments for an employee
export class GetEmployeeShiftAssignmentsDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID to retrieve shift assignments
}

// DTO for getting the status of a shift assignment
export class GetShiftAssignmentStatusDto {
  @IsNotEmpty()
  @IsString()
  shiftAssignmentId: string; // Shift assignment ID to check status
}
export class CreateScheduleRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the schedule rule (required)

  @IsNotEmpty()
  @IsString()
  pattern: string; // Pattern of the schedule rule (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the schedule rule is active (required)
}

// DTO for getting all schedule rules
export class GetScheduleRulesDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean; // Optional: Filter by active/inactive status
}

// DTO for assigning a schedule rule to an employee
export class AssignScheduleRuleToEmployeeDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID to assign the schedule rule to

  @IsNotEmpty()
  @IsString()
  scheduleRuleId: string; // Schedule rule ID to assign to the employee

  @IsOptional()
  @IsDate()
  startDate?: Date; // Start date for the schedule assignment

  @IsOptional()
  @IsDate()
  endDate?: Date; // End date for the schedule assignment (if it's ongoing)
}

// DTO for defining flexible scheduling rules - ALL FIELDS FROM SCHEMA
export class DefineFlexibleSchedulingRulesDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the flexible scheduling rule (required)

  @IsNotEmpty()
  @IsString()
  pattern: string; // Pattern for flexible scheduling (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the flexible schedule is active (required)
}

export class CreateShiftTypeWithDatesDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  effectiveStart: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveEnd?: Date;
}

export class ValidateScheduleRuleDto {
  @IsNotEmpty()
  @IsString()
  scheduleRuleId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  assignmentDate?: Date;
}

export class ApplyFlexibleScheduleRulesDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  targetDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduleRuleIds?: string[];
}

export class LinkShiftToVacationAndHolidaysDto {
  @IsNotEmpty()
  @IsString()
  shiftId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidayIds?: string[];

  @IsOptional()
  @IsString()
  vacationPackageId?: string;
}

export class ValidateHolidayBeforeShiftAssignmentDto {
  @IsNotEmpty()
  @IsString()
  shiftId: string;

  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  assignmentDate: Date;
}

export class LinkVacationPackageToScheduleDto {
  @IsNotEmpty()
  @IsString()
  scheduleRuleId: string;

  @IsNotEmpty()
  @IsString()
  vacationPackageId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveEnd?: Date;
}
