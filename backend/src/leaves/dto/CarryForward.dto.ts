import { IsString, IsNumber, IsOptional, IsDate, IsBoolean } from 'class-validator';

export class CarryForwardSettingsDto {
  @IsString()
  leaveTypeId: string;

  @IsNumber()
  maxCarryForwardDays: number;

  @IsOptional()
  @IsNumber()
  expiryDays?: number;

  @IsOptional()
  @IsString()
  carryForwardRule?: string;

  @IsOptional()
  @IsBoolean()
  autoCarryForward?: boolean;
}

export class RunCarryForwardDto {
  @IsString()
  leaveTypeId: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDate()
  asOfDate?: Date;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
