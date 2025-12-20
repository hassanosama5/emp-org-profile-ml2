import { ApplicationStatus } from '../enums/application-status.enum';
export declare class CreateApplicationDto {
    candidateId: string;
    requisitionId: string;
    assignedHr?: string;
}
export declare class UpdateApplicationStatusDto {
    status: ApplicationStatus;
}
