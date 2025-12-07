import {
  IsMongoId,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum PayslipDistributionMethod {
  PDF = 'PDF',
  EMAIL = 'EMAIL',
  PORTAL = 'PORTAL',
}

export class GenerateAndDistributePayslipsDto {
  @IsMongoId()
  payrollRunId: string; // MongoDB ObjectId

  @IsOptional()
  @IsEnum(PayslipDistributionMethod)
  distributionMethod?: PayslipDistributionMethod; // Optional, defaults to 'PORTAL'
}

