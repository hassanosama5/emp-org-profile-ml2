import { IsMongoId, IsNotEmpty } from 'class-validator';

export class ProcessRefundDTO {
  @IsMongoId()
  @IsNotEmpty()
  paidInPayrollRunId: string; // The payroll run ID where the refund was processed/paid (executed in payroll cycle)
}