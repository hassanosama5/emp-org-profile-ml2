import { IsMongoId } from 'class-validator';

export class SalaryCalculationInputDto {
  @IsMongoId()
  payrollRunId: string;

  @IsMongoId()
  employeeId: string;
}
