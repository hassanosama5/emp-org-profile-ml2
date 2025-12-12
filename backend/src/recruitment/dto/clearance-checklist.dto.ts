// src/recruitment/dto/clearance-checklist.dto.ts
// ============================================================================
// NEW CHANGES FOR OFFBOARDING: Removed actorId and actorRole from DTOs
// These values are now taken from JWT token (req.user) for security
// ============================================================================
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApprovalStatus } from '../enums/approval-status.enum';

export class CreateClearanceChecklistDto {
  @IsString()
  terminationId: string; // maps to ClearanceChecklist.terminationId (ObjectId as string)

  // actorRole removed - now checked via JWT token (user.roles)
}

export class UpdateClearanceItemStatusDto {
  @IsString()
  department: string; // department name in items.department (e.g. 'HR', 'IT', 'FINANCE')

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus; // maps to items.status

  @IsOptional()
  @IsString()
  comments?: string; // maps to items.comments

  // actorId removed - now taken from JWT token (user.userId)
  // actorRole removed - now taken from JWT token (user.roles)
}

// ============================================================================
// NEW CHANGES FOR OFFBOARDING: Final Settlement DTO (OFF-013)
// ============================================================================
export class TriggerFinalSettlementDto {
  @IsString()
  employeeId: string; // Employee _id (ObjectId as string)

  @IsString()
  terminationId: string; // Termination request _id (ObjectId as string)
}
