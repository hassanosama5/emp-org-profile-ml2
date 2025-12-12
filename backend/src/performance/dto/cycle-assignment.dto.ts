import { IsMongoId, IsOptional, IsDateString } from 'class-validator';

export class CycleAssignmentDto {
  @IsMongoId()
  employeeProfileId: string;

  @IsMongoId()
  managerProfileId: string;

  @IsMongoId()
  departmentId: string;

  @IsOptional()
  @IsMongoId()
  positionId?: string;

  @IsMongoId()
  templateId: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
