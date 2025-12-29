import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsDate,
  IsDateString,
  IsBoolean,
  IsNumber,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PunchPolicy, ShiftAssignmentStatus } from '../models/enums';  // Importing existing enums

// Custom validator to check if a date is valid (not auto-corrected by JavaScript)
@ValidatorConstraint({ name: 'isValidDate', async: false })
export class IsValidDateConstraint implements ValidatorConstraintInterface {
  validate(date: any, args: ValidationArguments) {
    if (!date) return true; // Let @IsOptional handle missing dates
    const dateObj = new Date(date);
    // Check if the date is invalid (NaN)
    if (isNaN(dateObj.getTime())) return false;
    // Check if the date string matches the parsed date (catches auto-corrections like Nov 31 -> Dec 1)
    if (typeof date === 'string') {
      const originalDate = new Date(date);
      const dateStr = date.split('T')[0]; // Get YYYY-MM-DD part
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        const expectedDate = new Date(year, month - 1, day);
        // If the parsed date doesn't match the expected date, it was auto-corrected
        if (
          expectedDate.getFullYear() !== originalDate.getFullYear() ||
          expectedDate.getMonth() !== originalDate.getMonth() ||
          expectedDate.getDate() !== originalDate.getDate()
        ) {
          return false;
        }
      }
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid date. Please provide a valid calendar date.';
  }
}

// Helper function to validate if a date string represents a valid calendar date
// (prevents JavaScript from auto-correcting invalid dates like Nov 31 -> Dec 1)
function isValidCalendarDateString(dateStr: string): boolean {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  
  // Create date from components
  const constructedDate = new Date(year, month - 1, day);
  const parsedDate = new Date(dateStr);
  
  // If the constructed date doesn't match the parsed date, it was auto-corrected
  return (
    constructedDate.getFullYear() === parsedDate.getFullYear() &&
    constructedDate.getMonth() === parsedDate.getMonth() &&
    constructedDate.getDate() === parsedDate.getDate()
  );
}

// Custom validator to check if a date string represents a valid calendar date
@ValidatorConstraint({ name: 'isValidCalendarDate', async: false })
export class IsValidCalendarDateConstraint
  implements ValidatorConstraintInterface
{
  validate(date: any, args: ValidationArguments) {
    if (!date) return true; // Let @IsOptional handle missing dates
    
    // If it's a string, validate it before transformation
    if (typeof date === 'string') {
      return isValidCalendarDateString(date);
    }
    
    // If it's already a Date object (after transformation), we can't check the original string
    // So we just check if it's a valid date
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid calendar date. Please provide a valid date (e.g., November has only 30 days).';
  }
}

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

// DTO for creating a shift type - ALL FIELDS FROM SCHEMA
export class CreateShiftTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;  // Name of the shift type (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;  // Whether the shift type is active (required)
}

// DTO for updating a shift type - ALL FIELDS FROM SCHEMA
export class UpdateShiftTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;  // Name of the shift type (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;  // Whether the shift type is active (required)
}

// DTO for getting shift types (no parameters needed)
export class GetShiftTypesDto {}

// DTO for creating a shift - ALL FIELDS FROM SCHEMA
export class CreateShiftDto {
  @IsNotEmpty()
  @IsString()
  name: string;  // Name of the shift (required)

  @IsNotEmpty()
  @IsString()
  shiftType: string;  // ShiftType ID reference (required)

  @IsNotEmpty()
  @IsString()
  startTime: string;  // Shift start time (required)

  @IsNotEmpty()
  @IsString()
  endTime: string;  // Shift end time (required)

  @IsNotEmpty()
  @IsEnum(PunchPolicy)
  punchPolicy: PunchPolicy;  // Punch policy (required)

  @IsNotEmpty()
  @IsNumber()
  graceInMinutes: number;  // Grace time for punch-in (required)

  @IsNotEmpty()
  @IsNumber()
  graceOutMinutes: number;  // Grace time for punch-out (required)

  @IsNotEmpty()
  @IsBoolean()
  requiresApprovalForOvertime: boolean;  // Whether overtime requires approval (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;  // Whether the shift is active (required)
}

// DTO for updating a shift - ALL FIELDS FROM SCHEMA
export class UpdateShiftDto {
  @IsNotEmpty()
  @IsString()
  name: string;  // Shift name (required)

  @IsNotEmpty()
  @IsString()
  shiftType: string;  // ShiftType ID reference (required)

  @IsNotEmpty()
  @IsEnum(PunchPolicy)
  punchPolicy: PunchPolicy;  // Shift punch policy (required)

  @IsNotEmpty()
  @IsString()
  startTime: string;  // Shift start time (required)

  @IsNotEmpty()
  @IsString()
  endTime: string;  // Shift end time (required)

  @IsNotEmpty()
  @IsNumber()
  graceInMinutes: number;  // Grace time for punch-in (required)

  @IsNotEmpty()
  @IsNumber()
  graceOutMinutes: number;  // Grace time for punch-out (required)

  @IsNotEmpty()
  @IsBoolean()
  requiresApprovalForOvertime: boolean;  // Whether overtime requires approval (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;  // Whether the shift is active (required)
}

// DTO for getting shifts by type (without using ShiftType enum)
export class GetShiftsByTypeDto {
  @IsNotEmpty()
  @IsString()
  shiftType: string;  // Shift type as string (Normal, Rotational, etc.)
}

// DTO for assigning a shift to an employee - ALL FIELDS FROM SCHEMA
export class AssignShiftToEmployeeDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to assign the shift to (required)

  @IsNotEmpty()
  @IsString()
  shiftId: string;  // Shift ID to assign to the employee (required)

  @IsNotEmpty()
  @IsDateString()
  startDate: string;  // Start date for the shift assignment (required)

  @IsNotEmpty()
  @IsDateString()
  endDate: string;  // End date for the shift assignment (required)

  @IsNotEmpty()
  @IsEnum(ShiftAssignmentStatus)
  status: ShiftAssignmentStatus;  // Status of the shift assignment (required)

  @IsOptional()
  @IsString()
  departmentId?: string;  // Department ID (optional per schema)

  @IsOptional()
  @IsString()
  positionId?: string;  // Position ID (optional per schema)

  @IsOptional()
  @IsString()
  scheduleRuleId?: string;  // Schedule rule ID (optional per schema)
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
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date;

  @IsOptional()
  @IsEnum(ShiftAssignmentStatus)
  status?: ShiftAssignmentStatus;
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
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date;

  @IsOptional()
  @IsEnum(ShiftAssignmentStatus)
  status?: ShiftAssignmentStatus;
}

// DTO for updating a shift assignment - ALL FIELDS FROM SCHEMA
export class UpdateShiftAssignmentDto {
  @IsNotEmpty()
  @IsEnum(ShiftAssignmentStatus)
  status: ShiftAssignmentStatus;  // Status of the shift assignment (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;  // Start date for the shift assignment (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate: Date;  // End date for the shift assignment (required)

  @IsOptional()
  @IsString()
  employeeId?: string;  // Employee ID (optional)

  @IsOptional()
  @IsString()
  departmentId?: string;  // Department ID (optional)

  @IsOptional()
  @IsString()
  positionId?: string;  // Position ID (optional)

  @IsOptional()
  @IsString()
  shiftId?: string;  // Shift ID (optional)

  @IsOptional()
  @IsString()
  scheduleRuleId?: string;  // Schedule rule ID (optional)
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

export class ReassignShiftAssignmentDto {
  @IsNotEmpty()
  @IsString()
  assignmentId: string;

  @IsNotEmpty()
  @IsString()
  newEmployeeId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// DTO for getting all shift assignments for an employee
export class GetEmployeeShiftAssignmentsDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to retrieve shift assignments
}

// DTO for getting the status of a shift assignment
export class GetShiftAssignmentStatusDto {
  @IsNotEmpty()
  @IsString()
  shiftAssignmentId: string;  // Shift assignment ID to check status
}
export class CreateScheduleRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string;  // Name of the schedule rule (required)

  @IsNotEmpty()
  @IsString()
  pattern: string;  // Pattern of the schedule rule (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;  // Whether the schedule rule is active (required)
}

// DTO for getting all schedule rules
export class GetScheduleRulesDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;  // Optional: Filter by active/inactive status
}

// DTO for assigning a schedule rule to an employee
export class AssignScheduleRuleToEmployeeDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;  // Employee ID to assign the schedule rule to

  @IsNotEmpty()
  @IsString()
  scheduleRuleId: string;  // Schedule rule ID to assign to the employee

  @IsOptional()
  @IsDate()
  startDate?: Date;  // Start date for the schedule assignment

  @IsOptional()
  @IsDate()
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date;  // End date for the schedule assignment (if it's ongoing)
}

// DTO for defining flexible scheduling rules - ALL FIELDS FROM SCHEMA
export class DefineFlexibleSchedulingRulesDto {
  @IsNotEmpty()
  @IsString()
  name: string;  // Name of the flexible scheduling rule (required)

  @IsNotEmpty()
  @IsString()
  pattern: string;  // Pattern for flexible scheduling (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;  // Whether the flexible schedule is active (required)
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
  @Validate(IsEndDateAfterStartDateConstraint)
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
  @Validate(IsEndDateAfterStartDateConstraint)
  effectiveEnd?: Date;
}