import {
    IsString,
    IsNumber,
    IsMongoId,
    IsObject,
    ValidateNested,
    IsNotEmpty,
    MinLength,
    Min,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
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
  
  export class GenerateRefundForDisputeDTO {
    @IsMongoId()
    @IsNotEmpty()
    financeStaffId: string; // Finance staff generating the refund (REQ-PY-45)
  
    @ValidateNested()
    @Type(() => RefundDetailsDTO)
    @IsObject()
    @IsNotEmpty()
    refundDetails: RefundDetailsDTO; // Refund details (status: pending until executed in payroll cycle)
  }