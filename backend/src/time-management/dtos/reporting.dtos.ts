import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsEnum,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';

// Custom validator to ensure endDate >= startDate
@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: any, args: ValidationArguments) {
    const obj = args.object as any;
    const startDate = obj.startDate;
    if (!startDate || !endDate) return true; // Let @IsOptional handle missing dates
    return new Date(endDate).getTime() >= new Date(startDate).getTime();
  }

  defaultMessage(args: ValidationArguments) {
    return 'endDate must be greater than or equal to startDate';
  }
}

// DTO for generating an overtime report
export class GenerateOvertimeReportDto {
  @IsOptional()
  @IsString()
  employeeId?: string; // Optional: Employee ID to generate overtime report for

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for the report

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date; // Optional: End date for the report
}

// DTO for generating a lateness report
export class GenerateLatenessReportDto {
  @IsOptional()
  @IsString()
  employeeId?: string; // Optional: Employee ID to generate lateness report for

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for the report

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date; // Optional: End date for the report
}

// DTO for generating an exception attendance report
export class GenerateExceptionReportDto {
  @IsOptional()
  @IsString()
  employeeId?: string; // Optional: Employee ID to generate exception report for

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for the report

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date; // Optional: End date for the report
}

// DTO for exporting reports
export class ExportReportDto {
  @IsNotEmpty()
  @IsString()
  reportType: 'overtime' | 'lateness' | 'exception'; // Type of report to export

  @IsNotEmpty()
  @IsString()
  format: 'excel' | 'csv' | 'text'; // Export format

  @IsOptional()
  @IsString()
  employeeId?: string; // Optional: Employee ID for filtering

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date; // Optional: Start date for the export

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: Date; // Optional: End date for the export
}

