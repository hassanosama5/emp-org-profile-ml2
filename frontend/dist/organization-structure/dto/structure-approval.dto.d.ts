import { ApprovalDecision } from '../enums/organization-structure.enums';
export declare class CreateStructureApprovalDto {
    changeRequestId: string;
    approverEmployeeId: string;
    comments?: string;
}
export declare class UpdateApprovalDecisionDto {
    decision: ApprovalDecision;
    comments?: string;
}
export declare class StructureApprovalResponseDto {
    _id: string;
    changeRequestId: string;
    approverEmployeeId: string;
    decision: ApprovalDecision;
    decidedAt?: Date;
    comments?: string;
    createdAt: Date;
    updatedAt: Date;
}
