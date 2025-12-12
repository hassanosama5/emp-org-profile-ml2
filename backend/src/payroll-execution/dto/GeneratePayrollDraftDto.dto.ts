import { IsMongoId } from 'class-validator';

export class GeneratePayrollDraftDto {
  @IsMongoId()
  payrollRunId: string;
}
