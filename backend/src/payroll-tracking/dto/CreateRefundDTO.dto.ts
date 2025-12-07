import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsObject,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RefundStatus } from '../enums/payroll-tracking-enum';

class RefundDetailsDTO {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Refund description must be at least 5 characters long',
  })
  description: string; // Description of the refund

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Refund amount must be greater than 0' })
  amount: number; // Refund amount
}

export class CreateRefundDTO {
  @ValidateNested()
  @Type(() => RefundDetailsDTO)
  @IsObject()
  @IsNotEmpty()
  refundDetails: RefundDetailsDTO; // Nested refund details object

  @IsMongoId()
  @IsNotEmpty()
  employeeId: string; // Employee for whom the refund is issued

  @IsMongoId()
  @IsNotEmpty()
  financeStaffId: string; // Finance staff who processes the refund (REQ-PY-45, REQ-PY-46)

  @IsOptional()
  @IsMongoId()
  claimId?: string; // Associated claim ID (optional - for expense claim refunds)

  @IsOptional()
  @IsMongoId()
  disputeId?: string; // Associated dispute ID (optional - for dispute refunds)

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus; // Refund status (optional, defaults to PENDING - pending until executed in payroll cycle)
}