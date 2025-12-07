import { IsMongoId, IsString } from 'class-validator';

export class UnlockPayrollDto {
  @IsMongoId()
  payrollRunId: string;

  @IsString()
  unlockReason: string;
}
