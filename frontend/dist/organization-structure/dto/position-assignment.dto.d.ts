export declare class CreatePositionAssignmentDto {
    employeeProfileId: string;
    positionId: string;
    departmentId: string;
    startDate: string;
    endDate?: string;
    changeRequestId?: string;
    reason?: string;
    notes?: string;
}
export declare class UpdatePositionAssignmentDto {
    endDate?: string;
    reason?: string;
    notes?: string;
}
export declare class PositionAssignmentResponseDto {
    _id: string;
    employeeProfileId: string;
    positionId: string;
    departmentId: string;
    startDate: Date;
    endDate?: Date;
    changeRequestId?: string;
    reason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
