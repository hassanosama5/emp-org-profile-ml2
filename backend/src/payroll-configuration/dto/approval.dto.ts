import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Note: approvedBy/rejectedBy are now taken from the authenticated user (CurrentUser)
// These DTOs are kept for potential future use (e.g., comments, notes)
export class ApprovalDto {
  // Optional comment/note for approval
  @ApiProperty({ required: false, description: 'Optional approval comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectionDto {
  // Optional comment/note for rejection
  @ApiProperty({ required: false, description: 'Optional rejection comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
