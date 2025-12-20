import { IsString, IsArray, ValidateNested, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStage } from '../enums/application-stage.enum';

export class StageDefinitionDto {
  @IsString()
  stage: ApplicationStage;

  @IsString()
  name: string;

  @IsNumber()
  order: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;
}

export class CreateHiringProcessTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageDefinitionDto)
  stages: StageDefinitionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHiringProcessTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageDefinitionDto)
  stages?: StageDefinitionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}




