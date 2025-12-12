import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class PunchMetadataDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsDate()
  @Type(() => Date)
  time: Date;
}

export class CreateTimePermissionRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  permissionType: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  requestedStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  requestedEnd?: Date;
}

export class ProcessTimePermissionDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  actorId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ApplyPermissionToPayrollDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  payrollPeriodId: string;
}

export class RecordPunchWithMetadataDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchMetadataDto)
  punches: PunchMetadataDto[];

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class ApplyAttendanceRoundingDto {
  @IsString()
  @IsNotEmpty()
  attendanceRecordId: string;

  @IsNumber()
  @IsNotEmpty()
  intervalMinutes: number;

  @IsString()
  @IsNotEmpty()
  strategy: 'NEAREST' | 'CEILING' | 'FLOOR';
}

export class EnforcePunchPolicyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchMetadataDto)
  punches: PunchMetadataDto[];

  @IsString()
  @IsNotEmpty()
  policy: 'FIRST_LAST' | 'MULTIPLE';
}

export class EnforceShiftPunchPolicyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchMetadataDto)
  punches: PunchMetadataDto[];

  @IsString()
  @IsNotEmpty()
  shiftStart: string; // HH:mm

  @IsString()
  @IsNotEmpty()
  shiftEnd: string; // HH:mm

  @IsOptional()
  @IsNumber()
  allowEarlyMinutes = 0;

  @IsOptional()
  @IsNumber()
  allowLateMinutes = 0;
}

export class MonitorRepeatedLatenessDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsNumber()
  threshold: number;

  @IsOptional()
  @IsNumber()
  lookbackDays?: number;
}

export class TriggerLatenessDisciplinaryDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsString()
  action?: string;
}


