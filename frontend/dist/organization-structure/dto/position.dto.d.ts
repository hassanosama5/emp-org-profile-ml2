export declare class CreatePositionDto {
    code: string;
    title: string;
    description?: string;
    departmentId: string;
    reportsToPositionId?: string;
}
export declare class UpdatePositionDto {
    code?: string;
    title?: string;
    description?: string;
    departmentId?: string;
    reportsToPositionId?: string;
    isActive?: boolean;
}
export declare class PositionResponseDto {
    _id: string;
    code: string;
    title: string;
    description?: string;
    departmentId: string;
    reportsToPositionId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
