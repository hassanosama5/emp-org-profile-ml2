export declare class CreateDepartmentDto {
    code: string;
    name: string;
    description?: string;
    headPositionId?: string;
}
export declare class UpdateDepartmentDto {
    code?: string;
    name?: string;
    description?: string;
    headPositionId?: string;
    isActive?: boolean;
}
export declare class DepartmentResponseDto {
    _id: string;
    code: string;
    name: string;
    description?: string;
    headPositionId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
