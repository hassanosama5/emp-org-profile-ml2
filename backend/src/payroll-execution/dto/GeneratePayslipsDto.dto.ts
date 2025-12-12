import { IsMongoId } from 'class-validator';

export class GeneratePayslipsDto {
  @IsMongoId()
  payrollRunId: string;
}
