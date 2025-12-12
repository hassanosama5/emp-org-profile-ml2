import { IsMongoId } from 'class-validator';

export class LockPayrollDto {
  @IsMongoId()
  payrollRunId: string;
}
