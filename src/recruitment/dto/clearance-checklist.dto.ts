// src/recruitment/dto/clearance-checklist.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApprovalStatus } from '../enums/approval-status.enum';

export class CreateClearanceChecklistDto {
  @IsString()
  terminationId: string; // maps to ClearanceChecklist.terminationId (ObjectId as string)

  // simple "auth"
  @IsString()
  actorRole: string; // must be 'HR_MANAGER'
}

export class UpdateClearanceItemStatusDto {
  @IsString()
  department: string; // department name in items.department (e.g. 'HR', 'IT', 'FINANCE')

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus; // maps to items.status

  @IsOptional()
  @IsString()
  comments?: string; // maps to items.comments

  // for audit
  @IsString()
  actorId: string; // will go to items.updatedBy

  @IsString()
  actorRole: string; // must match department or be 'HR_MANAGER'
}
