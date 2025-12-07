import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  PayRollPaymentStatus,
  PayRollStatus,
} from '../enums/payroll-execution-enum';

export class CreatePayrollRunDto {
  @IsString()
  runId: string;

  @IsISO8601()
  payrollPeriod: string; // end-of-month date

  @IsString()
  entity: string;

  @IsNumber()
  employees: number;

  @IsOptional()
  @IsNumber()
  exceptions?: number; // Count of exceptions/issues in the payroll run

  @IsNumber()
  totalnetpay: number;

  @IsMongoId()
  payrollSpecialistId: string;

  @IsOptional()
  @IsEnum(PayRollStatus)
  status?: PayRollStatus; // defaults to DRAFT in schema

  @IsOptional()
  @IsEnum(PayRollPaymentStatus)
  paymentStatus?: PayRollPaymentStatus; // defaults to PENDING in schema

  @IsOptional()
  @IsMongoId()
  payrollManagerId?: string;

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string;
}
