import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class FlagPayrollExceptionDto {
  @IsMongoId()
  payrollRunId: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsString()
  code: string;

  @IsString()
  message: string;
}
