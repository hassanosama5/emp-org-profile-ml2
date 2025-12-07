import {
  IsString,
  IsMongoId,
  IsISO8601,
  IsOptional,
} from 'class-validator';

export class ProcessPayrollInitiationDto {
  @IsISO8601()
  payrollPeriod: string; // ISO 8601 date string

  @IsString()
  entity: string; // Entity name (e.g., "Company Name|USD")

  @IsMongoId()
  payrollSpecialistId: string; // MongoDB ObjectId

  @IsOptional()
  @IsString()
  currency?: string; // Optional currency code (e.g., 'USD', 'EUR', 'GBP')

  @IsOptional()
  @IsMongoId()
  payrollManagerId?: string; // Optional - if not provided, system will find a default payroll manager
}

