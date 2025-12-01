import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class EvaluationCriterionDto {
  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
