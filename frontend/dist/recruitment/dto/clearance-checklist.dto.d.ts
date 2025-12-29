import { ApprovalStatus } from '../enums/approval-status.enum';
export declare class CreateClearanceChecklistDto {
    terminationId: string;
    actorRole: string;
}
export declare class UpdateClearanceItemStatusDto {
    department: string;
    status: ApprovalStatus;
    comments?: string;
    actorId: string;
    actorRole: string;
}
