import { Types } from 'mongoose';
import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';
export declare class OnboardingTaskDto {
    name: string;
    department: string;
    status?: OnboardingTaskStatus;
    deadline?: Date;
    documentId?: Types.ObjectId;
    notes?: string;
}
export declare class CreateOnboardingDto {
    employeeId: Types.ObjectId;
    tasks: OnboardingTaskDto[];
}
