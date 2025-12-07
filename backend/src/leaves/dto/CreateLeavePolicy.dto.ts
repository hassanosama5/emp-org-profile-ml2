import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';

export class CreateLeavePolicyDto {
  @IsString()
  leaveTypeId: string;

  @IsEnum(AccrualMethod)
  accrualMethod: AccrualMethod;

  @IsNumber()
  monthlyRate: number;

  @IsNumber()
  yearlyRate: number;

  @IsOptional()
  @IsEnum(RoundingRule)
  roundingRule: RoundingRule;

  @IsOptional()
  @IsNumber()
  maxCarryForward: number;

  @IsNumber()
  minNoticeDays: number;

  @IsOptional()
  @IsNumber()
  maxConsecutiveDays?: number;

  @IsOptional()
  eligibility: Record<string, any>;
}
