import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  Validate,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApplicationStage } from '../enums/application-stage.enum';
import { InterviewMethod } from '../enums/interview-method.enum';
import { InterviewStatus } from '../enums/interview-status.enum';

@ValidatorConstraint({ name: 'isValidISODate', async: false })
export class IsValidISODateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Check if it's a valid ISO 8601 date that can be parsed
    const date = new Date(value);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value);
  }

  defaultMessage() {
    return 'scheduledDate must be a valid ISO 8601 date string';
  }
}

export class ScheduleInterviewDto {
  @IsString() applicationId: string; // ObjectId as string
  @IsEnum(ApplicationStage) stage: ApplicationStage; // Must be one of: screening, department_interview, hr_interview, offer
  @Validate(IsValidISODateConstraint) scheduledDate: string; // ISO 8601 date string
  @IsOptional() @IsEnum(InterviewMethod) method?: InterviewMethod; // onsite, video, phone
  @IsOptional() @IsArray() panel?: string[]; // Array of ObjectIds as strings
  @IsOptional() @IsString() videoLink?: string;
}

export class UpdateInterviewStatusDto {
  @IsEnum(InterviewStatus) status: InterviewStatus; // Must be one of: scheduled, completed, cancelled
}
