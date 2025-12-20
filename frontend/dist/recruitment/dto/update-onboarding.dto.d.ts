import { OnboardingTaskDto } from './create-onboarding.dto';
export declare class UpdateOnboardingDto {
    tasks?: OnboardingTaskDto[];
    completed?: boolean;
    completedAt?: Date;
}
