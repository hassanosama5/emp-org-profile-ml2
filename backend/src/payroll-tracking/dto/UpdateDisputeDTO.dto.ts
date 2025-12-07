import {
  IsString,
  IsMongoId,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { DisputeStatus } from '../enums/payroll-tracking-enum';

export class UpdateDisputeDTO {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description?: string; // Optional, can update dispute description

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string; // Optional, finance staff handling the dispute

  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus; // Optional, can update dispute status

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
