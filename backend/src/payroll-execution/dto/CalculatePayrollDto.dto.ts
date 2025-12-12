import {
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CalculatePayrollDto {
  @IsMongoId()
  employeeId: string; // MongoDB ObjectId

  @IsMongoId()
  payrollRunId: string; // MongoDB ObjectId

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number; // Optional - if not provided, will be fetched from employee's PayGrade configuration
}

