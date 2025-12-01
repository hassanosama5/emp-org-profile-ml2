import { IsString, IsOptional, IsMongoId, IsEnum } from 'class-validator';
import { ApprovalDecision } from '../enums/organization-structure.enums';

export class CreateStructureApprovalDto {
  @IsMongoId()
  changeRequestId: string;

  @IsMongoId()
  approverEmployeeId: string;

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
