import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  IsBoolean,
} from 'class-validator';

// DTO for sending a notification - ALL FIELDS FROM SCHEMA
export class SendNotificationDto {
  @IsNotEmpty()
  @IsString()
  to: string; // The employee ID or the recipient of the notification (required)

  @IsNotEmpty()
  @IsString()
  type: string; // The type of the notification (required)

  @IsNotEmpty()
  @IsString()
  message: string; // Message to send along with the notification (required)
}

// DTO for getting notification logs by employee
export class GetNotificationLogsByEmployeeDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID to fetch notification logs for
}

// DTO for synchronizing attendance with payroll
export class SyncAttendanceWithPayrollDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID for whom attendance is being synchronized

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for filtering

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date; // Optional: End date for filtering
}

// DTO for synchronizing leave with payroll
export class SyncLeaveWithPayrollDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID for whom leave is being synchronized

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for filtering

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date; // Optional: End date for filtering
}

// DTO for synchronizing attendance and leave with payroll
export class SynchronizeAttendanceAndPayrollDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string; // Employee ID for whom attendance and leave are being synchronized

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for filtering

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date; // Optional: End date for filtering
}

export class BlockPayrollForMissedPunchDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncTimeDataWithPayrollDto {
  @IsOptional()
  @IsString()
  payrollRunId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveDate?: Date;

  @IsOptional()
  @IsBoolean()
  includeAdjustments?: boolean;
}

export class SyncWithBenefitsDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  benefitType?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveDate?: Date;
}

export class SyncWithLeaveDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  leaveType?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  windowStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  windowEnd?: Date;
}

export class CreateNotificationTemplateDto {
  @IsNotEmpty()
  @IsString()
  templateKey: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  channel?: 'email' | 'sms' | 'in-app';
}

export class UpdateNotificationTemplateDto {
  @IsNotEmpty()
  @IsString()
  templateKey: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  channel?: 'email' | 'sms' | 'in-app';
}
