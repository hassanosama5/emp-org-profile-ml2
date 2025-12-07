import { IsMongoId, IsEnum, IsOptional, IsString } from 'class-validator';
import { PayRollStatus } from '../enums/payroll-execution-enum';

export class PayrollSpecialistReviewDto {
  @IsMongoId()
  payrollRunId: string; // The payroll run being reviewed

  @IsEnum(PayRollStatus)
  status: PayRollStatus; // Status of the payroll run (e.g., DRAFT, UNDER_REVIEW)

  @IsOptional()
  @IsMongoId()
  payrollSpecialistId?: string; // Optional link to the payroll specialist reviewing the run

  @IsOptional()
  @IsString()
  reviewNotes?: string; // Optional notes from the payroll specialist
}
