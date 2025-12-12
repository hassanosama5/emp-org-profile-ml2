import { IsMongoId, IsISO8601 } from 'class-validator';

export class EditPayrollPeriodDto {
  @IsMongoId()
  payrollRunId: string;

  @IsISO8601()
  payrollPeriod: string;
}
