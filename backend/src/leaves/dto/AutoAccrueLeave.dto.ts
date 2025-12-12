import { IsString, IsNumber, IsOptional, IsDate, IsEnum } from 'class-validator';

export enum AccrualType {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
}

export class AutoAccrueLeaveDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsNumber()
  accrualAmount: number;

  @IsEnum(AccrualType)
  accrualType: AccrualType;

  @IsOptional()
  @IsString()
  policyId?: string;

  @IsOptional()
  @IsDate()
  accrualDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AccrueAllEmployeesDto {
  @IsString()
  leaveTypeId: string;

  @IsNumber()
  accrualAmount: number;

  @IsEnum(AccrualType)
  accrualType: AccrualType;

  @IsOptional()
  @IsString()
  policyId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
