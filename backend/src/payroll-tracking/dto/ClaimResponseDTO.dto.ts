import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ClaimStatus } from '../enums/payroll-tracking-enum';

export class ClaimResponseDTO {
  @IsString()
  claimId: string;

  @IsString()
  description: string;

  @IsString()
  claimType: string;

  @IsMongoId()
  employeeId: string;

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string;

  @IsNumber()
  @Min(0.01, { message: 'Claim amount must be greater than 0' }) // Ensure claim amount is greater than 0
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Approved amount must be greater than 0' }) // Ensure approved amount is greater than 0
  @Max(
    1000000, // You can replace this with a dynamic value (e.g., the amount of the claim)
    { message: 'Approved amount cannot exceed the claimed amount' },
  ) // Ensure approved amount is less than or equal to the claimed amount
  approvedAmount?: number;

  @IsEnum(ClaimStatus)
  status: ClaimStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  resolutionComment?: string;
}