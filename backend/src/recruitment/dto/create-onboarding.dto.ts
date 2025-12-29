import {
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsString,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';

export class OnboardingTaskDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  department: string;

  @IsOptional()
  @IsEnum(OnboardingTaskStatus)
  status?: OnboardingTaskStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deadline?: Date;

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

export class CreateOnboardingDto {
  @IsNotEmpty()
  @IsMongoId()
  employeeId: Types.ObjectId;

  // changed - added contractId field for onboarding
  @IsOptional()
  @IsMongoId()
  contractId?: Types.ObjectId;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaskDto)
  tasks: OnboardingTaskDto[];
}
