import {
  IsOptional,
  IsMongoId,
  IsEnum,
  ValidateNested,
  IsObject,
  IsString,
  IsNumber,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RefundStatus } from '../enums/payroll-tracking-enum';

class RefundDetailsDTO {
  @IsString()
  @MinLength(5, {
    message: 'Refund description must be at least 5 characters long',
  })
  description: string; // Description of the refund

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Refund amount must be greater than 0' })
  amount: number; // Refund amount
}

export class UpdateRefundDTO {
  @IsOptional()
  @ValidateNested()
  @Type(() => RefundDetailsDTO)
  @IsObject()
  refundDetails?: RefundDetailsDTO; // Nested refund details object (optional)

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string; // Finance staff assigned to handle the refund

  @IsOptional()
  @IsMongoId()
  claimId?: string; // Associated claim ID (optional)

  @IsOptional()
  @IsMongoId()
  disputeId?: string; // Associated dispute ID (optional)

  @IsOptional()
  @IsMongoId()
  paidInPayrollRunId?: string; // Payroll run ID if refund is paid (executed in payroll cycle)

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus; // Refund status (optional)
}
