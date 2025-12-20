import { TerminationStatus } from '../enums/termination-status.enum';
import { TerminationInitiation } from '../enums/termination-initiation.enum';
export declare class CreateTerminationRequestDto {
    employeeId: string;
    initiator: TerminationInitiation;
    reason: string;
    employeeComments?: string;
    terminationDate?: string;
}
export declare class UpdateTerminationStatusDto {
    status: TerminationStatus;
    hrComments?: string;
    terminationDate?: string;
}
export declare class UpdateTerminationDetailsDto {
    reason?: string;
    employeeComments?: string;
    terminationDate?: string;
}
