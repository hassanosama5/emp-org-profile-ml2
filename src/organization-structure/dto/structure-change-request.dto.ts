import { IsString, IsOptional, IsMongoId, IsEnum } from 'class-validator';
import {
  StructureRequestType,
  StructureRequestStatus,
} from '../enums/organization-structure.enums';

export class CreateStructureChangeRequestDto {
  @IsMongoId()
  requestedByEmployeeId: string;

  @IsEnum(StructureRequestType)
  requestType: StructureRequestType;

  @IsMongoId()
  @IsOptional()
  targetDepartmentId?: string;

  @IsMongoId()
  @IsOptional()
  targetPositionId?: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateStructureChangeRequestDto {
  @IsEnum(StructureRequestType)
  @IsOptional()
  requestType?: StructureRequestType;

  @IsMongoId()
  @IsOptional()
  targetDepartmentId?: string;

  @IsMongoId()
  @IsOptional()
  targetPositionId?: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class SubmitChangeRequestDto {
  @IsMongoId()
  submittedByEmployeeId: string;
}

export class StructureChangeRequestResponseDto {
  _id: string;
  requestNumber: string;
  requestedByEmployeeId: string;
  requestType: StructureRequestType;
  targetDepartmentId?: string;
  targetPositionId?: string;
  details?: string;
  reason?: string;
  status: StructureRequestStatus;
  submittedByEmployeeId?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
