import { IsString, IsMongoId, IsOptional, IsEnum } from 'class-validator';
import { DisputeStatus } from '../enums/payroll-tracking-enum';

export class DisputeResponseDTO {
  @IsString()
  disputeId: string;

  @IsString()
  description: string;

  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  payslipId: string;

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string;

  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  resolutionComment?: string;
}