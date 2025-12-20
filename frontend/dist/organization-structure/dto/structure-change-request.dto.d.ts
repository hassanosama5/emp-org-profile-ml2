import { StructureRequestType, StructureRequestStatus } from '../enums/organization-structure.enums';
export declare class CreateStructureChangeRequestDto {
    requestedByEmployeeId: string;
    requestType: StructureRequestType;
    targetDepartmentId?: string;
    targetPositionId?: string;
    details?: string;
    reason?: string;
}
export declare class UpdateStructureChangeRequestDto {
    requestType?: StructureRequestType;
    targetDepartmentId?: string;
    targetPositionId?: string;
    details?: string;
    reason?: string;
}
export declare class SubmitChangeRequestDto {
    submittedByEmployeeId: string;
}
export declare class StructureChangeRequestResponseDto {
    _id: string;
    requestNumber: string;
    requestedByEmployeeId: string;
    requestType: StructureRequestType;
    targetDepartmentId?: string;
    targetPositionId?: string;
    details?: string;
    reason?: string;
    status: StructureRequestStatus;
    submittedByEmployeeId?: string;
    submittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
