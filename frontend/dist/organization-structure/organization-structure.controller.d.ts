import { OrganizationStructureService } from './organization-structure.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';
import { CreatePositionAssignmentDto, UpdatePositionAssignmentDto } from './dto/position-assignment.dto';
import { CreateStructureChangeRequestDto, UpdateStructureChangeRequestDto, SubmitChangeRequestDto } from './dto/structure-change-request.dto';
import { CreateStructureApprovalDto, UpdateApprovalDecisionDto } from './dto/structure-approval.dto';
import { StructureRequestStatus } from './enums/organization-structure.enums';
export declare class OrganizationStructureController {
    private readonly structureService;
    constructor(structureService: OrganizationStructureService);
    createDepartment(dto: CreateDepartmentDto): Promise<import("mongoose").Document<unknown, {}, import("./models/department.schema").Department, {}, {}> & import("./models/department.schema").Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAllDepartments(isActive?: boolean): Promise<(import("mongoose").Document<unknown, {}, import("./models/department.schema").Department, {}, {}> & import("./models/department.schema").Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getDepartmentById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/department.schema").Department, {}, {}> & import("./models/department.schema").Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<import("mongoose").Document<unknown, {}, import("./models/department.schema").Department, {}, {}> & import("./models/department.schema").Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deactivateDepartment(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/department.schema").Department, {}, {}> & import("./models/department.schema").Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getDepartmentHierarchy(): Promise<any[]>;
    createPosition(dto: CreatePositionDto): Promise<import("mongoose").Document<unknown, {}, import("./models/position.schema").Position, {}, {}> & import("./models/position.schema").Position & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAllPositions(departmentId?: string, isActive?: boolean): Promise<(import("mongoose").Document<unknown, {}, import("./models/position.schema").Position, {}, {}> & import("./models/position.schema").Position & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getPositionById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/position.schema").Position, {}, {}> & import("./models/position.schema").Position & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updatePosition(id: string, dto: UpdatePositionDto): Promise<import("mongoose").Document<unknown, {}, import("./models/position.schema").Position, {}, {}> & import("./models/position.schema").Position & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deactivatePosition(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/position.schema").Position, {}, {}> & import("./models/position.schema").Position & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getPositionHierarchy(id: string): Promise<any>;
    createPositionAssignment(dto: CreatePositionAssignmentDto): Promise<import("mongoose").Document<unknown, {}, import("./models/position-assignment.schema").PositionAssignment, {}, {}> & import("./models/position-assignment.schema").PositionAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getEmployeeAssignments(employeeProfileId: string, activeOnly?: boolean): Promise<(import("mongoose").Document<unknown, {}, import("./models/position-assignment.schema").PositionAssignment, {}, {}> & import("./models/position-assignment.schema").PositionAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getPositionAssignments(positionId: string): Promise<(import("mongoose").Document<unknown, {}, import("./models/position-assignment.schema").PositionAssignment, {}, {}> & import("./models/position-assignment.schema").PositionAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    updatePositionAssignment(id: string, dto: UpdatePositionAssignmentDto): Promise<import("mongoose").Document<unknown, {}, import("./models/position-assignment.schema").PositionAssignment, {}, {}> & import("./models/position-assignment.schema").PositionAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    endPositionAssignment(id: string, endDate: string): Promise<import("mongoose").Document<unknown, {}, import("./models/position-assignment.schema").PositionAssignment, {}, {}> & import("./models/position-assignment.schema").PositionAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createChangeRequest(dto: CreateStructureChangeRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-change-request.schema").StructureChangeRequest, {}, {}> & import("./models/structure-change-request.schema").StructureChangeRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getAllChangeRequests(status?: StructureRequestStatus): Promise<(import("mongoose").Document<unknown, {}, import("./models/structure-change-request.schema").StructureChangeRequest, {}, {}> & import("./models/structure-change-request.schema").StructureChangeRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getChangeRequestById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-change-request.schema").StructureChangeRequest, {}, {}> & import("./models/structure-change-request.schema").StructureChangeRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateChangeRequest(id: string, dto: UpdateStructureChangeRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-change-request.schema").StructureChangeRequest, {}, {}> & import("./models/structure-change-request.schema").StructureChangeRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    submitChangeRequest(id: string, dto: SubmitChangeRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-change-request.schema").StructureChangeRequest, {}, {}> & import("./models/structure-change-request.schema").StructureChangeRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    cancelChangeRequest(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-change-request.schema").StructureChangeRequest, {}, {}> & import("./models/structure-change-request.schema").StructureChangeRequest & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    createApproval(dto: CreateStructureApprovalDto): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-approval.schema").StructureApproval, {}, {}> & import("./models/structure-approval.schema").StructureApproval & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateApprovalDecision(id: string, dto: UpdateApprovalDecisionDto): Promise<import("mongoose").Document<unknown, {}, import("./models/structure-approval.schema").StructureApproval, {}, {}> & import("./models/structure-approval.schema").StructureApproval & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getRequestApprovals(changeRequestId: string): Promise<(import("mongoose").Document<unknown, {}, import("./models/structure-approval.schema").StructureApproval, {}, {}> & import("./models/structure-approval.schema").StructureApproval & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getChangeLogs(entityType?: string, entityId?: string): Promise<(import("mongoose").Document<unknown, {}, import("./models/structure-change-log.schema").StructureChangeLog, {}, {}> & import("./models/structure-change-log.schema").StructureChangeLog & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
