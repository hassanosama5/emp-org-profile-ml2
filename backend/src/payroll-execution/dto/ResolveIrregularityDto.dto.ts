import {
  IsMongoId,
  IsString,
} from 'class-validator';

export class ResolveIrregularityDto {
  @IsMongoId()
  payrollRunId: string; // MongoDB ObjectId

  @IsMongoId()
  employeeId: string; // MongoDB ObjectId

  @IsString()
  exceptionCode: string; // Exception code (e.g., 'MISSING_BANK', 'NEGATIVE_NET_PAY', 'SALARY_SPIKE')

  @IsString()
  resolution: string; // Resolution description/notes

  @IsMongoId()
  managerId: string; // MongoDB ObjectId of Payroll Manager resolving the irregularity
}

