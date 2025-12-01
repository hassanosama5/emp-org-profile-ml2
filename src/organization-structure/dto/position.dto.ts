import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  code: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  departmentId: string;

  @IsMongoId()
  @IsOptional()
  reportsToPositionId?: string;
}

export class UpdatePositionDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsMongoId()
  @IsOptional()
  reportsToPositionId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class PositionResponseDto {
  _id: string;
  code: string;
  title: string;
  description?: string;
  departmentId: string;
  reportsToPositionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
