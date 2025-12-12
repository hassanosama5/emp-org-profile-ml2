import { IsMongoId, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { BenefitStatus } from '../enums/payroll-execution-enum';

export class CreateEmployeeTerminationBenefitDto {
  @IsMongoId()
  employeeId: string; // Employee who will receive the termination benefit

  @IsMongoId()
  benefitId: string; // Reference to the termination/resignation benefit configuration

  @IsMongoId()
  terminationId: string; // Reference to the termination request

  @IsNumber()
  @Min(0)
  givenAmount: number; // The amount to be given to this employee

  @IsOptional()
  @IsEnum(BenefitStatus)
  status?: BenefitStatus; // Optional, defaults to PENDING
}

