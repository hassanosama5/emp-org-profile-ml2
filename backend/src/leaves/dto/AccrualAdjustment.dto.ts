import { IsString, IsNumber, IsOptional, IsDate, IsEnum } from 'class-validator';

export enum AccrualAdjustmentType {
  SUSPENSION = 'suspension',
  REDUCTION = 'reduction',
  ADJUSTMENT = 'adjustment',
  RESTORATION = 'restoration',
}

export class AccrualAdjustmentDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsEnum(AccrualAdjustmentType)
  adjustmentType: AccrualAdjustmentType;

  @IsNumber()
  adjustmentAmount: number;

  @IsDate()
  fromDate: Date;

  @IsOptional()
  @IsDate()
  toDate?: Date;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AccrualSuspensionDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsDate()
  suspensionFromDate: Date;

  @IsOptional()
  @IsDate()
  suspensionToDate?: Date;

  @IsString()
  suspensionReason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
