import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PayRollStatus } from '../enums/payroll-execution-enum';

export class ReviewPayrollPeriodDto {
  @IsMongoId()
  payrollRunId: string;

  @IsEnum(PayRollStatus)
  status: PayRollStatus; // e.g., DRAFT -> UNDER_REVIEW or back to DRAFT

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
