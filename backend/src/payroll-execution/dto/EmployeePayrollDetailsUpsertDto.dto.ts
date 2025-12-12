import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BankStatus } from '../enums/payroll-execution-enum';

export class EmployeePayrollDetailsUpsertDto {
  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  payrollRunId: string;

  @IsNumber()
  baseSalary: number;

  @IsNumber()
  allowances: number;

  @IsNumber()
  deductions: number; // including penalties

  @IsNumber()
  netSalary: number;

  @IsNumber()
  netPay: number;

  @IsEnum(BankStatus)
  bankStatus: BankStatus; // 'valid' | 'missing'

  @IsOptional()
  @IsString()
  exceptions?: string;

  @IsOptional()
  @IsNumber()
  bonus?: number;

  @IsOptional()
  @IsNumber()
  benefit?: number;
}
