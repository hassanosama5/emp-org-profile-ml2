import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccrualMethod } from '../enums/accrual-method.enum';

export class CalculateAccrualDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsEnum(AccrualMethod)
  accrualMethod: AccrualMethod; // AccrualMethod enum: 'MONTHLY', 'YEARLY', 'PER_TERM'
}
