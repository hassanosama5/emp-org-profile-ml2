import { IsString, IsOptional, IsMongoId, IsEnum } from 'class-validator';
import { ApprovalDecision } from '../enums/organization-structure.enums';

export class CreateStructureApprovalDto {
  @IsMongoId()
  changeRequestId: string;

  @IsMongoId()
  @IsOptional()
  approverEmployeeId?: string; // Optional - will be auto-set from current user if not provided

  @IsString()
  @IsOptional()
  comments?: string;
}

export class UpdateApprovalDecisionDto {
  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class ApproveRejectChangeRequestDto {
  @IsString()
  @IsOptional()
  comments?: string;
}

export class StructureApprovalResponseDto {
  _id: string;
  changeRequestId: string;
  approverEmployeeId: string;
  decision: ApprovalDecision;
  decidedAt?: Date;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}
