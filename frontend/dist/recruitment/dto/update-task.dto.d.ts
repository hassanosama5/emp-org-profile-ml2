import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';
import { Types } from 'mongoose';
export declare class UpdateOnboardingTaskDto {
    status?: OnboardingTaskStatus;
    completedAt?: Date;
    documentId?: Types.ObjectId;
    notes?: string;
}
