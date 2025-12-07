import { IsMongoId, IsString, IsOptional } from 'class-validator';

export class FlagPayrollIrregularityDto {
  @IsMongoId()
  payrollRunId: string; // Link to the payroll run being flagged

  @IsMongoId()
  employeeId: string; // Link to the employee whose payroll is flagged

  @IsString()
  irregularityCode: string; // Code for the type of irregularity (e.g., "negative_net_pay", "missing_bank_account")

  @IsString()
  message: string; // Detailed message explaining the irregularity

  @IsOptional()
  @IsString()
  additionalDetails?: string; // Optional additional details if needed
}
