import {
  IsMongoId,
  IsNumber,
  Min,
} from 'class-validator';

export class ApplyStatutoryRulesDto {
  @IsNumber()
  @Min(0)
  baseSalary: number; // Base salary (Taxes = % of Base Salary per BR 35)

  @IsMongoId()
  employeeId: string; // MongoDB ObjectId - used to fetch employee-specific tax/insurance rules
}

