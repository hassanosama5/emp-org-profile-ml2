import { IsString, IsNumber, IsOptional, IsDate } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateLeaveEntitlementDto {
  @IsOptional()
  @IsNumber()
  yearlyEntitlement?: number;  // Total leave entitlement for the employee per year

  @IsOptional()
  @IsNumber()
  accruedActual?: number;  // Actual leave accrued so far

  @IsOptional()
  @IsNumber()
  accruedRounded?: number;  // Rounded accrued leave (if applicable)

  @IsOptional()
  @IsNumber()
  carryForward?: number;  // Carry forward leave from previous periods

  @IsOptional()
  @IsNumber()
  taken?: number;  // Leave that has been taken by the employee

  @IsOptional()
  @IsNumber()
  pending?: number;  // Leave that is pending approval

  @IsOptional()
  @IsNumber()
  remaining?: number;  // Remaining leave balance (calculated)

  @IsOptional()
  @IsDate()
  lastAccrualDate?: Date;  // Date of the last accrual (optional)

  @IsOptional()
  @IsDate()
  nextResetDate?: Date;  // Date of the next reset (optional)
}
