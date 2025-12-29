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
exports.OrganizationStructureController = void 0;
const common_1 = require("@nestjs/common");
const organization_structure_service_1 = require("./organization-structure.service");
const department_dto_1 = require("./dto/department.dto");
const position_dto_1 = require("./dto/position.dto");
const position_assignment_dto_1 = require("./dto/position-assignment.dto");
const structure_change_request_dto_1 = require("./dto/structure-change-request.dto");
const structure_approval_dto_1 = require("./dto/structure-approval.dto");
const organization_structure_enums_1 = require("./enums/organization-structure.enums");
let OrganizationStructureController = class OrganizationStructureController {
    constructor(structureService) {
        this.structureService = structureService;
    }
    async createDepartment(dto) {
        return this.structureService.createDepartment(dto);
    }
    async getAllDepartments(isActive) {
        return this.structureService.getAllDepartments(isActive !== undefined ? isActive === true : undefined);
    }
    async getDepartmentById(id) {
        return this.structureService.getDepartmentById(id);
    }
    async updateDepartment(id, dto) {
        return this.structureService.updateDepartment(id, dto);
    }
    async deactivateDepartment(id) {
        return this.structureService.deactivateDepartment(id);
    }
    async getDepartmentHierarchy() {
        return this.structureService.getDepartmentHierarchy();
    }
    async createPosition(dto) {
        return this.structureService.createPosition(dto);
    }
    async getAllPositions(departmentId, isActive) {
        return this.structureService.getAllPositions(departmentId, isActive !== undefined ? isActive === true : undefined);
    }
    async getPositionById(id) {
        return this.structureService.getPositionById(id);
    }
    async updatePosition(id, dto) {
        return this.structureService.updatePosition(id, dto);
    }
    async deactivatePosition(id) {
        return this.structureService.deactivatePosition(id);
    }
    async getPositionHierarchy(id) {
        return this.structureService.getPositionHierarchy(id);
    }
    async createPositionAssignment(dto) {
        return this.structureService.createPositionAssignment(dto);
    }
    async getEmployeeAssignments(employeeProfileId, activeOnly) {
        return this.structureService.getEmployeeAssignments(employeeProfileId, activeOnly === true);
    }
    async getPositionAssignments(positionId) {
        return this.structureService.getPositionAssignments(positionId);
    }
    async updatePositionAssignment(id, dto) {
        return this.structureService.updatePositionAssignment(id, dto);
    }
    async endPositionAssignment(id, endDate) {
        return this.structureService.endPositionAssignment(id, new Date(endDate));
    }
    async createChangeRequest(dto) {
        return this.structureService.createChangeRequest(dto);
    }
    async getAllChangeRequests(status) {
        return this.structureService.getAllChangeRequests(status);
    }
    async getChangeRequestById(id) {
        return this.structureService.getChangeRequestById(id);
    }
    async updateChangeRequest(id, dto) {
        return this.structureService.updateChangeRequest(id, dto);
    }
    async submitChangeRequest(id, dto) {
        return this.structureService.submitChangeRequest(id, dto);
    }
    async cancelChangeRequest(id) {
        return this.structureService.cancelChangeRequest(id);
    }
    async createApproval(dto) {
        return this.structureService.createApproval(dto);
    }
    async updateApprovalDecision(id, dto) {
        return this.structureService.updateApprovalDecision(id, dto);
    }
    async getRequestApprovals(changeRequestId) {
        return this.structureService.getRequestApprovals(changeRequestId);
    }
    async getChangeLogs(entityType, entityId) {
        return this.structureService.getChangeLogs(entityType, entityId);
    }
};
exports.OrganizationStructureController = OrganizationStructureController;
__decorate([
    (0, common_1.Post)('departments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [department_dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Get)('departments'),
    __param(0, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getAllDepartments", null);
__decorate([
    (0, common_1.Get)('departments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getDepartmentById", null);
__decorate([
    (0, common_1.Put)('departments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, department_dto_1.UpdateDepartmentDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "updateDepartment", null);
__decorate([
    (0, common_1.Delete)('departments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "deactivateDepartment", null);
__decorate([
    (0, common_1.Get)('departments/hierarchy/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getDepartmentHierarchy", null);
__decorate([
    (0, common_1.Post)('positions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [position_dto_1.CreatePositionDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "createPosition", null);
__decorate([
    (0, common_1.Get)('positions'),
    __param(0, (0, common_1.Query)('departmentId')),
    __param(1, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getAllPositions", null);
__decorate([
    (0, common_1.Get)('positions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getPositionById", null);
__decorate([
    (0, common_1.Put)('positions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, position_dto_1.UpdatePositionDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "updatePosition", null);
__decorate([
    (0, common_1.Delete)('positions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "deactivatePosition", null);
__decorate([
    (0, common_1.Get)('positions/:id/hierarchy'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getPositionHierarchy", null);
__decorate([
    (0, common_1.Post)('assignments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [position_assignment_dto_1.CreatePositionAssignmentDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "createPositionAssignment", null);
__decorate([
    (0, common_1.Get)('assignments/employee/:employeeProfileId'),
    __param(0, (0, common_1.Param)('employeeProfileId')),
    __param(1, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getEmployeeAssignments", null);
__decorate([
    (0, common_1.Get)('assignments/position/:positionId'),
    __param(0, (0, common_1.Param)('positionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getPositionAssignments", null);
__decorate([
    (0, common_1.Patch)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, position_assignment_dto_1.UpdatePositionAssignmentDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "updatePositionAssignment", null);
__decorate([
    (0, common_1.Patch)('assignments/:id/end'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "endPositionAssignment", null);
__decorate([
    (0, common_1.Post)('change-requests'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [structure_change_request_dto_1.CreateStructureChangeRequestDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "createChangeRequest", null);
__decorate([
    (0, common_1.Get)('change-requests'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getAllChangeRequests", null);
__decorate([
    (0, common_1.Get)('change-requests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getChangeRequestById", null);
__decorate([
    (0, common_1.Put)('change-requests/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, structure_change_request_dto_1.UpdateStructureChangeRequestDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "updateChangeRequest", null);
__decorate([
    (0, common_1.Post)('change-requests/:id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, structure_change_request_dto_1.SubmitChangeRequestDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "submitChangeRequest", null);
__decorate([
    (0, common_1.Post)('change-requests/:id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "cancelChangeRequest", null);
__decorate([
    (0, common_1.Post)('approvals'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [structure_approval_dto_1.CreateStructureApprovalDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "createApproval", null);
__decorate([
    (0, common_1.Patch)('approvals/:id/decision'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, structure_approval_dto_1.UpdateApprovalDecisionDto]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "updateApprovalDecision", null);
__decorate([
    (0, common_1.Get)('approvals/change-request/:changeRequestId'),
    __param(0, (0, common_1.Param)('changeRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getRequestApprovals", null);
__decorate([
    (0, common_1.Get)('change-logs'),
    __param(0, (0, common_1.Query)('entityType')),
    __param(1, (0, common_1.Query)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrganizationStructureController.prototype, "getChangeLogs", null);
exports.OrganizationStructureController = OrganizationStructureController = __decorate([
    (0, common_1.Controller)('organization-structure'),
    __metadata("design:paramtypes", [organization_structure_service_1.OrganizationStructureService])
], OrganizationStructureController);
//# sourceMappingURL=organization-structure.controller.js.map