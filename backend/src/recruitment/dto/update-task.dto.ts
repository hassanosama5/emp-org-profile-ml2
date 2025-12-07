import {
  IsOptional,
  IsEnum,
  IsString,
  IsDate,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';
import { Types } from 'mongoose';

export class UpdateOnboardingTaskDto {
  @IsOptional()
  @IsEnum(OnboardingTaskStatus)
  status?: OnboardingTaskStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date;

  @IsOptional()
  @IsMongoId()
  documentId?: Types.ObjectId;

  @IsOptional()
  @IsString()
  notes?: string;
}
