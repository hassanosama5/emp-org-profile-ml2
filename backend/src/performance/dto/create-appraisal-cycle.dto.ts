import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppraisalTemplateType } from '../enums/performance.enums';
import { CycleTemplateAssignmentDto } from './cycle-template-assignment.dto';
import { CycleAssignmentDto } from './cycle-assignment.dto';

export class CreateAppraisalCycleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AppraisalTemplateType)
  cycleType: AppraisalTemplateType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsDateString()
  managerDueDate?: string;

  @IsOptional()
  @IsDateString()
  employeeAcknowledgementDueDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CycleTemplateAssignmentDto)
  templateAssignments: CycleTemplateAssignmentDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CycleAssignmentDto)
  assignments: CycleAssignmentDto[];
}
