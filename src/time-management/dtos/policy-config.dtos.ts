import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HolidayType } from '../models/enums'; // Importing existing enums

// ===== OVERTIME RULE DTOs =====

// DTO for creating an overtime rule - ALL FIELDS FROM SCHEMA
export class CreateOvertimeRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the overtime rule (required)

  @IsNotEmpty()
  @IsString()
  description: string; // Description of the rule (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the rule is active (required)

  @IsNotEmpty()
  @IsBoolean()
  approved: boolean; // Whether the rule is approved (required)
}

// DTO for updating an overtime rule - ALL FIELDS FROM SCHEMA
export class UpdateOvertimeRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the overtime rule (required)

  @IsNotEmpty()
  @IsString()
  description: string; // Description of the rule (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the rule is active (required)

  @IsNotEmpty()
  @IsBoolean()
  approved: boolean; // Whether the rule is approved (required)
}

// ===== LATENESS RULE DTOs =====

// DTO for creating a lateness rule - ALL FIELDS FROM SCHEMA
export class CreateLatenessRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the lateness rule (required)

  @IsNotEmpty()
  @IsString()
  description: string; // Description of the rule (required)

  @IsNotEmpty()
  @IsNumber()
  gracePeriodMinutes: number; // Grace period in minutes (required)

  @IsNotEmpty()
  @IsNumber()
  deductionForEachMinute: number; // Deduction amount per minute late (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the rule is active (required)
}

// DTO for updating a lateness rule - ALL FIELDS FROM SCHEMA
export class UpdateLatenessRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Name of the lateness rule (required)

  @IsNotEmpty()
  @IsString()
  description: string; // Description of the rule (required)

  @IsNotEmpty()
  @IsNumber()
  gracePeriodMinutes: number; // Grace period in minutes (required)

  @IsNotEmpty()
  @IsNumber()
  deductionForEachMinute: number; // Deduction amount per minute (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the rule is active (required)
}

// ===== HOLIDAY DTOs =====

// DTO for creating a holiday - ALL FIELDS FROM SCHEMA
export class CreateHolidayDto {
  @IsNotEmpty()
  @IsEnum(HolidayType)
  type: HolidayType; // Type of holiday (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date; // Start date of the holiday (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date; // End date of the holiday (required)

  @IsNotEmpty()
  @IsString()
  name: string; // Name of the holiday (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the holiday is active (required)
}

// DTO for updating a holiday - ALL FIELDS FROM SCHEMA
export class UpdateHolidayDto {
  @IsNotEmpty()
  @IsEnum(HolidayType)
  type: HolidayType; // Type of holiday (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date; // Start date of the holiday (required)

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date; // End date of the holiday (required)

  @IsNotEmpty()
  @IsString()
  name: string; // Name of the holiday (required)

  @IsNotEmpty()
  @IsBoolean()
  active: boolean; // Whether the holiday is active (required)
}

// DTO for getting holidays with filters
export class GetHolidaysDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Filter: Start date range

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date; // Filter: End date range

  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType; // Filter: Type of holiday

  @IsOptional()
  @IsBoolean()
  active?: boolean; // Filter: Active holidays only
}

// ===== GENERAL POLICY FILTER DTOs =====

// DTO for getting policies with filters
export class GetPoliciesDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean; // Filter: Active policies only

  @IsOptional()
  @IsBoolean()
  approved?: boolean; // Filter: Approved policies only
}

// DTO for checking if a date is a holiday
export class CheckHolidayDto {
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  date: Date; // Date to check for holiday
}

// DTO for validating attendance against holiday
export class ValidateAttendanceHolidayDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  date: Date; // Date to validate

  @IsOptional()
  @IsBoolean()
  suppressPenalty?: boolean; // Whether to suppress penalty if holiday
}
