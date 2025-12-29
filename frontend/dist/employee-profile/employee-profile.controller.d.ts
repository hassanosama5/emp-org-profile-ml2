import { EmployeeProfileService } from './employee-profile.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeSelfServiceDto, QueryEmployeeDto, AssignSystemRoleDto, CreateCandidateDto, UpdateCandidateDto, CreateProfileChangeRequestDto, ProcessProfileChangeRequestDto } from './dto';
export declare class EmployeeProfileController {
    private readonly employeeProfileService;
    constructor(employeeProfileService: EmployeeProfileService);
    create(createEmployeeDto: CreateEmployeeDto): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    findAll(query: QueryEmployeeDto, user: any): Promise<{
        data: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./models/employee-profile.schema").EmployeeProfile, {}, {}> & import("./models/employee-profile.schema").EmployeeProfile & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        message: string;
    }>;
    getMyProfile(user: any): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    updateMyProfile(user: any, updateDto: UpdateEmployeeSelfServiceDto): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    getStats(): Promise<{
        message: string;
        data: {
            total: number;
            byStatus: any;
        };
    }>;
    findByDepartment(departmentId: string): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile[];
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    assignRoles(assignRoleDto: AssignSystemRoleDto): Promise<{
        message: string;
        data: import("./models/employee-system-role.schema").EmployeeSystemRole;
    }>;
    getEmployeeRoles(id: string): Promise<{
        message: string;
        data: import("./models/employee-system-role.schema").EmployeeSystemRole;
    }>;
    createCandidate(createCandidateDto: CreateCandidateDto): Promise<{
        message: string;
        data: import("./models/candidate.schema").Candidate;
    }>;
    findAllCandidates(): Promise<{
        message: string;
        data: import("./models/candidate.schema").Candidate[];
    }>;
    findCandidateById(id: string): Promise<{
        message: string;
        data: import("./models/candidate.schema").Candidate;
    }>;
    updateCandidate(id: string, updateCandidateDto: UpdateCandidateDto): Promise<{
        message: string;
        data: import("./models/candidate.schema").Candidate;
    }>;
    removeCandidate(id: string): Promise<{
        message: string;
    }>;
    convertCandidateToEmployee(candidateId: string, employeeData: {
        workEmail: string;
        dateOfHire: Date;
        contractType: string;
        workType: string;
        password?: string;
        primaryDepartmentId?: string;
        primaryPositionId?: string;
    }): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    findCandidatesByStatus(status: string): Promise<{
        message: string;
        data: import("./models/candidate.schema").Candidate[];
    }>;
    createProfileChangeRequest(user: any, createRequestDto: CreateProfileChangeRequestDto): Promise<{
        message: string;
        data: import("./models/ep-change-request.schema").EmployeeProfileChangeRequest;
    }>;
    getMyChangeRequests(user: any): Promise<{
        message: string;
        data: import("./models/ep-change-request.schema").EmployeeProfileChangeRequest[];
    }>;
    getAllChangeRequests(status?: string): Promise<{
        message: string;
        data: import("./models/ep-change-request.schema").EmployeeProfileChangeRequest[];
    }>;
    getChangeRequestById(id: string): Promise<{
        message: string;
        data: import("./models/ep-change-request.schema").EmployeeProfileChangeRequest;
    }>;
    processChangeRequest(id: string, processDto: ProcessProfileChangeRequestDto): Promise<{
        message: string;
        data: import("./models/ep-change-request.schema").EmployeeProfileChangeRequest;
    }>;
    addQualification(user: any, qualificationData: {
        establishmentName: string;
        graduationType: string;
    }): Promise<{
        message: string;
        data: import("./models/qualification.schema").EmployeeQualification;
    }>;
    getMyQualifications(user: any): Promise<{
        message: string;
        data: import("./models/qualification.schema").EmployeeQualification[];
    }>;
    getEmployeeQualifications(employeeId: string): Promise<{
        message: string;
        data: import("./models/qualification.schema").EmployeeQualification[];
    }>;
    removeQualification(qualificationId: string, user: any): Promise<{
        message: string;
    }>;
    findByEmployeeNumber(employeeNumber: string): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
    findByNationalId(nationalId: string): Promise<{
        message: string;
        data: import("./models/employee-profile.schema").EmployeeProfile;
    }>;
}
