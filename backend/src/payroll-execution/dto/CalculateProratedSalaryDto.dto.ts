import {
  IsMongoId,
  IsNumber,
  IsISO8601,
  Min,
} from 'class-validator';

export class CalculateProratedSalaryDto {
  @IsMongoId()
  employeeId: string; // MongoDB ObjectId

  @IsNumber()
  @Min(0)
  baseSalary: number; // Base salary amount

  @IsISO8601()
  startDate: string; // ISO 8601 date string - contract start date or hire date

  @IsISO8601()
  endDate: string; // ISO 8601 date string - contract end date or termination date

  @IsISO8601()
  payrollPeriodEnd: string; // ISO 8601 date string - end of payroll period
}

