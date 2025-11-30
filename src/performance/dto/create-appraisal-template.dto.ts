import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppraisalTemplateType } from '../enums/performance.enums';
import { RatingScaleDefinitionDto } from './rating-scale-definition.dto';
import { EvaluationCriterionDto } from './evaluation-criterion.dto';

export class CreateAppraisalTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AppraisalTemplateType)
  templateType: AppraisalTemplateType;

  @ValidateNested()
  @Type(() => RatingScaleDefinitionDto)
  ratingScale: RatingScaleDefinitionDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriterionDto)
  criteria: EvaluationCriterionDto[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableDepartmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicablePositionIds?: string[];
}
