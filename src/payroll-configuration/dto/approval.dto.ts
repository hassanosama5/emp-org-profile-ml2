import { ApiProperty } from '@nestjs/swagger';

// Note: approvedBy/rejectedBy are now taken from the authenticated user (CurrentUser)
// These DTOs are kept for potential future use (e.g., comments, notes)
export class ApprovalDto {
  // Optional comment/note for approval
  @ApiProperty({ required: false, description: 'Optional approval comment' })
  comment?: string;
}

export class RejectionDto {
  // Optional comment/note for rejection
  @ApiProperty({ required: false, description: 'Optional rejection comment' })
  comment?: string;
}
