"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeProfileController = void 0;
const common_1 = require("@nestjs/common");
const employee_profile_service_1 = require("./employee-profile.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const employee_profile_enums_1 = require("./enums/employee-profile.enums");
let EmployeeProfileController = class EmployeeProfileController {
    constructor(employeeProfileService) {
        this.employeeProfileService = employeeProfileService;
    }
    async create(createEmployeeDto) {
        const employee = await this.employeeProfileService.create(createEmployeeDto);
        return {
            message: 'Employee created successfully',
            data: employee,
        };
    }
    async findAll(query, user) {
        const result = await this.employeeProfileService.findAll(query, user.userId);
        return {
            message: 'Employees retrieved successfully',
            ...result,
        };
    }
    async getMyProfile(user) {
        if (!user || !user.userId) {
            throw new common_1.UnauthorizedException('User information not found in token');
        }
        const employee = await this.employeeProfileService.findOne(user.userId);
        return {
            message: 'Profile retrieved successfully',
            data: employee,
        };
    }
    async updateMyProfile(user, updateDto) {
        const employee = await this.employeeProfileService.updateSelfService(user.userId, updateDto);
        return {
            message: 'Profile updated successfully',
            data: employee,
        };
    }
    async getStats() {
        const stats = await this.employeeProfileService.getEmployeeStats();
        return {
            message: 'Statistics retrieved successfully',
            data: stats,
        };
    }
    async findByDepartment(departmentId) {
        const employees = await this.employeeProfileService.findByDepartment(departmentId);
        return {
            message: 'Department employees retrieved successfully',
            data: employees,
        };
    }
    async findOne(id) {
        const employee = await this.employeeProfileService.findOne(id);
        return {
            message: 'Employee retrieved successfully',
            data: employee,
        };
    }
    async update(id, updateEmployeeDto) {
        const employee = await this.employeeProfileService.update(id, updateEmployeeDto);
        return {
            message: 'Employee updated successfully',
            data: employee,
        };
    }
    async remove(id) {
        await this.employeeProfileService.remove(id);
        return {
            message: 'Employee deactivated successfully',
        };
    }
    async assignRoles(assignRoleDto) {
        const systemRole = await this.employeeProfileService.assignSystemRoles(assignRoleDto.employeeProfileId, assignRoleDto.roles, assignRoleDto.permissions);
        return {
            message: 'Roles assigned successfully',
            data: systemRole,
        };
    }
    async getEmployeeRoles(id) {
        const roles = await this.employeeProfileService.getSystemRoles(id);
        return {
            message: 'Employee roles retrieved successfully',
            data: roles,
        };
    }
    async createCandidate(createCandidateDto) {
        const candidate = await this.employeeProfileService.createCandidate(createCandidateDto);
        return {
            message: 'Candidate created successfully',
            data: candidate,
        };
    }
    async findAllCandidates() {
        const candidates = await this.employeeProfileService.findAllCandidates();
        return {
            message: 'Candidates retrieved successfully',
            data: candidates,
        };
    }
    async findCandidateById(id) {
        const candidate = await this.employeeProfileService.findCandidateById(id);
        return {
            message: 'Candidate retrieved successfully',
            data: candidate,
        };
    }
    async updateCandidate(id, updateCandidateDto) {
        const candidate = await this.employeeProfileService.updateCandidate(id, updateCandidateDto);
        return {
            message: 'Candidate updated successfully',
            data: candidate,
        };
    }
    async removeCandidate(id) {
        await this.employeeProfileService.removeCandidate(id);
        return {
            message: 'Candidate removed successfully',
        };
    }
    async convertCandidateToEmployee(candidateId, employeeData) {
        const employee = await this.employeeProfileService.convertCandidateToEmployee(candidateId, employeeData);
        return {
            message: 'Candidate converted to employee successfully',
            data: employee,
        };
    }
    async findCandidatesByStatus(status) {
        const candidates = await this.employeeProfileService.findCandidatesByStatus(status);
        return {
            message: 'Candidates retrieved successfully',
            data: candidates,
        };
    }
    async createProfileChangeRequest(user, createRequestDto) {
        const changeRequest = await this.employeeProfileService.createProfileChangeRequest(user.userId, createRequestDto);
        return {
            message: 'Profile change request submitted successfully',
            data: changeRequest,
        };
    }
    async getMyChangeRequests(user) {
        const requests = await this.employeeProfileService.getProfileChangeRequestsByEmployee(user.userId);
        return {
            message: 'Your change requests retrieved successfully',
            data: requests,
        };
    }
    async getAllChangeRequests(status) {
        const requests = await this.employeeProfileService.getAllProfileChangeRequests(status);
        return {
            message: 'Change requests retrieved successfully',
            data: requests,
        };
    }
    async getChangeRequestById(id) {
        const request = await this.employeeProfileService.getProfileChangeRequestById(id);
        return {
            message: 'Change request retrieved successfully',
            data: request,
        };
    }
    async processChangeRequest(id, processDto) {
        const updatedRequest = await this.employeeProfileService.processProfileChangeRequest(id, processDto);
        return {
            message: 'Change request processed successfully',
            data: updatedRequest,
        };
    }
    async addQualification(user, qualificationData) {
        const qualification = await this.employeeProfileService.addQualification(user.userId, qualificationData);
        return {
            message: 'Qualification added successfully',
            data: qualification,
        };
    }
    async getMyQualifications(user) {
        const qualifications = await this.employeeProfileService.getQualificationsByEmployee(user.userId);
        return {
            message: 'Your qualifications retrieved successfully',
            data: qualifications,
        };
    }
    async getEmployeeQualifications(employeeId) {
        const qualifications = await this.employeeProfileService.getQualificationsByEmployee(employeeId);
        return {
            message: 'Employee qualifications retrieved successfully',
            data: qualifications,
        };
    }
    async removeQualification(qualificationId, user) {
        await this.employeeProfileService.removeQualification(qualificationId, user.userId);
        return {
            message: 'Qualification removed successfully',
        };
    }
    async findByEmployeeNumber(employeeNumber) {
        const employee = await this.employeeProfileService.findByEmployeeNumber(employeeNumber);
        return {
            message: 'Employee retrieved successfully',
            data: employee,
        };
    }
    async findByNationalId(nationalId) {
        const employee = await this.employeeProfileService.findByNationalId(nationalId);
        return {
            message: 'Employee retrieved successfully',
            data: employee,
        };
    }
};
exports.EmployeeProfileController = EmployeeProfileController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.QueryEmployeeDto, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpdateEmployeeSelfServiceDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('department/:departmentId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Param)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findByDepartment", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('assign-roles'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AssignSystemRoleDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "assignRoles", null);
__decorate([
    (0, common_1.Get)(':id/roles'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getEmployeeRoles", null);
__decorate([
    (0, common_1.Post)('candidate'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.RECRUITER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCandidateDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "createCandidate", null);
__decorate([
    (0, common_1.Get)('candidate'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.RECRUITER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findAllCandidates", null);
__decorate([
    (0, common_1.Get)('candidate/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.RECRUITER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findCandidateById", null);
__decorate([
    (0, common_1.Patch)('candidate/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.RECRUITER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateCandidateDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "updateCandidate", null);
__decorate([
    (0, common_1.Delete)('candidate/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "removeCandidate", null);
__decorate([
    (0, common_1.Post)('candidate/:id/convert-to-employee'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "convertCandidateToEmployee", null);
__decorate([
    (0, common_1.Get)('candidate/status/:status'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.RECRUITER),
    __param(0, (0, common_1.Param)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findCandidatesByStatus", null);
__decorate([
    (0, common_1.Post)('change-request'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateProfileChangeRequestDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "createProfileChangeRequest", null);
__decorate([
    (0, common_1.Get)('change-request/my-requests'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getMyChangeRequests", null);
__decorate([
    (0, common_1.Get)('change-request'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getAllChangeRequests", null);
__decorate([
    (0, common_1.Get)('change-request/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getChangeRequestById", null);
__decorate([
    (0, common_1.Patch)('change-request/:id/process'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ProcessProfileChangeRequestDto]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "processChangeRequest", null);
__decorate([
    (0, common_1.Post)('qualification'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "addQualification", null);
__decorate([
    (0, common_1.Get)('qualification/my-qualifications'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getMyQualifications", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId/qualifications'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "getEmployeeQualifications", null);
__decorate([
    (0, common_1.Delete)('qualification/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "removeQualification", null);
__decorate([
    (0, common_1.Get)('search/by-number/:employeeNumber'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Param)('employeeNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findByEmployeeNumber", null);
__decorate([
    (0, common_1.Get)('search/by-national-id/:nationalId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('nationalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmployeeProfileController.prototype, "findByNationalId", null);
exports.EmployeeProfileController = EmployeeProfileController = __decorate([
    (0, common_1.Controller)('employee-profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [employee_profile_service_1.EmployeeProfileService])
], EmployeeProfileController);
//# sourceMappingURL=employee-profile.controller.js.map