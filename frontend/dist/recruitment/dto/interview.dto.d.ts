import { ValidatorConstraintInterface } from 'class-validator';
import { ApplicationStage } from '../enums/application-stage.enum';
import { InterviewMethod } from '../enums/interview-method.enum';
import { InterviewStatus } from '../enums/interview-status.enum';
export declare class IsValidISODateConstraint implements ValidatorConstraintInterface {
    validate(value: any): boolean;
    defaultMessage(): string;
}
export declare class ScheduleInterviewDto {
    applicationId: string;
    stage: ApplicationStage;
    scheduledDate: string;
    method?: InterviewMethod;
    panel?: string[];
    videoLink?: string;
}
export declare class UpdateInterviewStatusDto {
    status: InterviewStatus;
}
