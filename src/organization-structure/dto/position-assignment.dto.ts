import { IsString, IsOptional, IsMongoId, IsDateString } from 'class-validator';

export class CreatePositionAssignmentDto {
  @IsMongoId()
  employeeProfileId: string;

  @IsMongoId()
  positionId: string;

  @IsMongoId()
  departmentId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsMongoId()
  @IsOptional()
  changeRequestId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePositionAssignmentDto {
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PositionAssignmentResponseDto {
  _id: string;
  employeeProfileId: string;
  positionId: string;
  departmentId: string;
  startDate: Date;
  endDate?: Date;
  changeRequestId?: string;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
