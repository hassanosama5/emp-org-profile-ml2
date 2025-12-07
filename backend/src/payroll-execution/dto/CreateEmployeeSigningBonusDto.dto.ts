import { IsMongoId, IsEnum, IsISO8601, IsNumber, Min, IsOptional } from 'class-validator';
import { BonusStatus } from '../enums/payroll-execution-enum';

export class CreateEmployeeSigningBonusDto {
  @IsMongoId()
  employeeId: string; // Employee who will receive the signing bonus

  @IsMongoId()
  signingBonusId: string; // Reference to the signing bonus configuration

  @IsNumber()
  @Min(0)
  givenAmount: number; // The amount to be given to this employee

  @IsOptional()
  @IsEnum(BonusStatus)
  status?: BonusStatus; // Optional, defaults to PENDING

  @IsOptional()
  @IsISO8601()
  paymentDate?: string; // Optional payment date
}

