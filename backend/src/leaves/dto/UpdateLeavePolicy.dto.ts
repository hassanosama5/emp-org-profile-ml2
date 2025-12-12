import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';

export class UpdateLeavePolicyDto {
  @IsOptional()
  @IsString()
  leaveTypeId?: string;

  @IsOptional()
  @IsEnum(AccrualMethod)
  accrualMethod?: AccrualMethod;

  @IsOptional()
  @IsNumber()
  monthlyRate?: number;

  @IsOptional()
  @IsNumber()
  yearlyRate?: number;

  @IsOptional()
  @IsEnum(RoundingRule)
  roundingRule?: RoundingRule;

  @IsOptional()
  @IsNumber()
  maxCarryForward?: number;

  @IsOptional()
  @IsNumber()
  minNoticeDays?: number;

  @IsOptional()
  @IsNumber()
  maxConsecutiveDays?: number;

  @IsOptional()
  eligibility?: Record<string, any>;
}
