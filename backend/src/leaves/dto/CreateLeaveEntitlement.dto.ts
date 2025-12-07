import { IsString, IsNumber, IsOptional, IsDate } from 'class-validator';
import { Types } from 'mongoose';

export class CreateLeaveEntitlementDto {
  @IsString()
  employeeId: string;  

  @IsString()
  leaveTypeId: string;  

  @IsNumber()
  yearlyEntitlement: number;  

  @IsNumber()
  accruedActual: number;  

  @IsNumber()
  accruedRounded: number;  

  @IsNumber()
  carryForward: number;  

  @IsNumber()
  taken: number;  

  @IsNumber()
  pending: number;  

  @IsNumber()
  remaining: number; 

  @IsOptional()
  @IsDate()
  lastAccrualDate?: Date;  

  @IsOptional()
  @IsDate()
  nextResetDate?: Date;  
}
