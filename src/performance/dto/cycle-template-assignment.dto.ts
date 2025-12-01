import { IsArray, IsMongoId } from 'class-validator';

export class CycleTemplateAssignmentDto {
  @IsMongoId()
  templateId: string;

  @IsArray()
  @IsMongoId({ each: true })
  departmentIds: string[];
}
