import {
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingTaskDto } from './create-onboarding.dto';

export class UpdateOnboardingDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaskDto)
  tasks?: OnboardingTaskDto[];

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date;
}
