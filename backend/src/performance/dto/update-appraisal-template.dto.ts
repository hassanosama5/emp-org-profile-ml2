import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RatingScaleDefinitionDto } from './rating-scale-definition.dto';
import { EvaluationCriterionDto } from './evaluation-criterion.dto';

export class UpdateAppraisalTemplateDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RatingScaleDefinitionDto)
  ratingScale?: RatingScaleDefinitionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriterionDto)
  criteria?: EvaluationCriterionDto[];

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
