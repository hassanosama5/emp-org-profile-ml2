import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsEnum,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { ClaimStatus } from '../enums/payroll-tracking-enum';

export class UpdateClaimDTO {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Description must be at least 3 characters long' })
  description?: string; // Optional, can update claim description

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Claim type must be at least 2 characters long' })
  claimType?: string; // Optional, can update claim type (e.g., medical, overtime)

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number; // Optional, can update claimed amount

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Approved amount must be greater than 0' })
  @Max(
    1000000, // Set to a maximum amount that makes sense based on your system requirements
    { message: 'Approved amount cannot exceed the claimed amount' },
  ) // Ensure the approved amount is less than or equal to the original claim amount
  approvedAmount?: number; // Optional, can update approved amount

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string; // Optional, finance staff handling the claim

  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus; // Optional, can update status (defaults to 'UNDER_REVIEW')

  @IsOptional()
  @IsString()
  @MinLength(5, {
    message: 'Rejection reason must be at least 5 characters long',
  })
  rejectionReason?: string; // Optional, reason for rejection if applicable

  @IsOptional()
  @IsString()
  resolutionComment?: string; // Optional, resolution comment
}
