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
exports.OrganizationStructureService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const department_schema_1 = require("./models/department.schema");
const position_schema_1 = require("./models/position.schema");
const position_assignment_schema_1 = require("./models/position-assignment.schema");
const structure_change_request_schema_1 = require("./models/structure-change-request.schema");
const structure_approval_schema_1 = require("./models/structure-approval.schema");
const structure_change_log_schema_1 = require("./models/structure-change-log.schema");
const organization_structure_enums_1 = require("./enums/organization-structure.enums");
let OrganizationStructureService = class OrganizationStructureService {
    constructor(departmentModel, positionModel, assignmentModel, changeRequestModel, approvalModel, changeLogModel) {
        this.departmentModel = departmentModel;
        this.positionModel = positionModel;
        this.assignmentModel = assignmentModel;
        this.changeRequestModel = changeRequestModel;
        this.approvalModel = approvalModel;
        this.changeLogModel = changeLogModel;
    }
    async createDepartment(dto) {
        const existing = await this.departmentModel.findOne({ code: dto.code });
        if (existing) {
            throw new common_1.ConflictException(`Department with code ${dto.code} already exists`);
        }
        try {
            const payload = { ...dto };
            if (payload.headPositionId !== undefined) {
                if (!mongoose_2.Types.ObjectId.isValid(payload.headPositionId)) {
                    throw new common_1.BadRequestException('Invalid headPositionId');
                }
                payload.headPositionId = new mongoose_2.Types.ObjectId(payload.headPositionId);
            }
            if (payload._id !== undefined) {
                delete payload._id;
            }
            payload._id = new mongoose_2.Types.ObjectId();
            const department = await this.departmentModel.create(payload);
            await this.logChange(organization_structure_enums_1.ChangeLogAction.CREATED, 'Department', department._id, null, department.toObject()).catch(() => undefined);
            return department;
        }
        catch (error) {
            if (error?.message && error.message.includes('must have an _id')) {
                throw new common_1.BadRequestException('Invalid `_id` in payload. Remove `_id`; a new one is assigned automatically.');
            }
            throw error;
        }
    }
    async getAllDepartments(isActive) {
        const filter = isActive !== undefined ? { isActive } : {};
        return this.departmentModel.find(filter).populate('headPositionId').exec();
    }
    async getDepartmentById(id) {
        const department = await this.departmentModel
            .findById(id)
            .populate('headPositionId')
            .exec();
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found`);
        }
        return department;
    }
    async updateDepartment(id, dto) {
        const department = await this.departmentModel.findById(id);
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found`);
        }
        if (dto.code && dto.code !== department.code) {
            const existing = await this.departmentModel.findOne({ code: dto.code });
            if (existing) {
                throw new common_1.ConflictException(`Department with code ${dto.code} already exists`);
            }
        }
        const beforeSnapshot = department.toObject();
        Object.assign(department, dto);
        await department.save();
        await this.logChange(organization_structure_enums_1.ChangeLogAction.UPDATED, 'Department', department._id, beforeSnapshot, department.toObject());
        return department;
    }
    async deactivateDepartment(id) {
        const department = await this.departmentModel.findById(id);
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found`);
        }
        const beforeSnapshot = department.toObject();
        department.isActive = false;
        await department.save();
        await this.logChange(organization_structure_enums_1.ChangeLogAction.DEACTIVATED, 'Department', department._id, beforeSnapshot, department.toObject());
        return department;
    }
    async createPosition(dto) {
        const existing = await this.positionModel.findOne({ code: dto.code });
        if (existing) {
            throw new common_1.ConflictException(`Position with code ${dto.code} already exists`);
        }
        const department = await this.departmentModel.findById(dto.departmentId);
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${dto.departmentId} not found`);
        }
        try {
            const payload = { ...dto };
            if (payload._id !== undefined) {
                delete payload._id;
            }
            if (payload.departmentId) {
                if (!mongoose_2.Types.ObjectId.isValid(payload.departmentId)) {
                    throw new common_1.BadRequestException('Invalid departmentId');
                }
                payload.departmentId = new mongoose_2.Types.ObjectId(payload.departmentId);
            }
            if (payload.reportsToPositionId !== undefined) {
                if (!mongoose_2.Types.ObjectId.isValid(payload.reportsToPositionId)) {
                    throw new common_1.BadRequestException('Invalid reportsToPositionId');
                }
                payload.reportsToPositionId = new mongoose_2.Types.ObjectId(payload.reportsToPositionId);
            }
            payload._id = new mongoose_2.Types.ObjectId();
            const position = await this.positionModel.create(payload);
            await this.logChange(organization_structure_enums_1.ChangeLogAction.CREATED, 'Position', position._id, null, position.toObject()).catch(() => undefined);
            return position;
        }
        catch (error) {
            if (error?.message && error.message.includes('must have an _id')) {
                throw new common_1.BadRequestException('Invalid `_id` in payload. Remove `_id`; a new one is assigned automatically.');
            }
            throw error;
        }
    }
    async getAllPositions(departmentId, isActive) {
        const filter = {};
        if (departmentId)
            filter.departmentId = departmentId;
        if (isActive !== undefined)
            filter.isActive = isActive;
        return this.positionModel
            .find(filter)
            .populate('departmentId')
            .populate('reportsToPositionId')
            .exec();
    }
    async getPositionById(id) {
        const position = await this.positionModel
            .findById(id)
            .populate('departmentId')
            .populate('reportsToPositionId')
            .exec();
        if (!position) {
            throw new common_1.NotFoundException(`Position with ID ${id} not found`);
        }
        return position;
    }
    async updatePosition(id, dto) {
        const position = await this.positionModel.findById(id);
        if (!position) {
            throw new common_1.NotFoundException(`Position with ID ${id} not found`);
        }
        if (dto.code && dto.code !== position.code) {
            const existing = await this.positionModel.findOne({ code: dto.code });
            if (existing) {
                throw new common_1.ConflictException(`Position with code ${dto.code} already exists`);
            }
        }
        if (dto.departmentId) {
            const department = await this.departmentModel.findById(dto.departmentId);
            if (!department) {
                throw new common_1.NotFoundException(`Department with ID ${dto.departmentId} not found`);
            }
        }
        const beforeSnapshot = position.toObject();
        Object.assign(position, dto);
        await position.save();
        await this.logChange(organization_structure_enums_1.ChangeLogAction.UPDATED, 'Position', position._id, beforeSnapshot, position.toObject());
        return position;
    }
    async deactivatePosition(id) {
        const position = await this.positionModel.findById(id);
        if (!position) {
            throw new common_1.NotFoundException(`Position with ID ${id} not found`);
        }
        const beforeSnapshot = position.toObject();
        position.isActive = false;
        await position.save();
        await this.logChange(organization_structure_enums_1.ChangeLogAction.DEACTIVATED, 'Position', position._id, beforeSnapshot, position.toObject());
        return position;
    }
    async getPositionHierarchy(positionId) {
        const position = await this.getPositionById(positionId);
        const subordinates = await this.positionModel
            .find({ reportsToPositionId: positionId })
            .populate('departmentId')
            .exec();
        return {
            position,
            subordinates: await Promise.all(subordinates.map((sub) => this.getPositionHierarchy(sub._id.toString()))),
        };
    }
    async createPositionAssignment(dto) {
        const position = await this.positionModel.findById(dto.positionId);
        if (!position) {
            throw new common_1.NotFoundException(`Position with ID ${dto.positionId} not found`);
        }
        const department = await this.departmentModel.findById(dto.departmentId);
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${dto.departmentId} not found`);
        }
        const overlapping = await this.assignmentModel.findOne({
            employeeProfileId: dto.employeeProfileId,
            startDate: { $lte: new Date(dto.endDate || new Date()) },
            $or: [{ endDate: null }, { endDate: { $gte: new Date(dto.startDate) } }],
        });
        if (overlapping) {
            throw new common_1.ConflictException('Employee already has an active assignment in this period');
        }
        const assignment = await this.assignmentModel.create(dto);
        await this.logChange(organization_structure_enums_1.ChangeLogAction.CREATED, 'PositionAssignment', assignment._id, null, assignment.toObject());
        return assignment;
    }
    async getEmployeeAssignments(employeeProfileId, activeOnly = false) {
        const filter = { employeeProfileId };
        if (activeOnly) {
            filter.$or = [{ endDate: null }, { endDate: { $gte: new Date() } }];
        }
        return this.assignmentModel
            .find(filter)
            .populate('positionId')
            .populate('departmentId')
            .sort({ startDate: -1 })
            .exec();
    }
    async getPositionAssignments(positionId) {
        return this.assignmentModel
            .find({ positionId })
            .populate('employeeProfileId')
            .sort({ startDate: -1 })
            .exec();
    }
    async updatePositionAssignment(id, dto) {
        const assignment = await this.assignmentModel.findById(id);
        if (!assignment) {
            throw new common_1.NotFoundException(`Position assignment with ID ${id} not found`);
        }
        const beforeSnapshot = assignment.toObject();
        Object.assign(assignment, dto);
        await assignment.save();
        await this.logChange(organization_structure_enums_1.ChangeLogAction.UPDATED, 'PositionAssignment', assignment._id, beforeSnapshot, assignment.toObject());
        return assignment;
    }
    async endPositionAssignment(id, endDate) {
        return this.updatePositionAssignment(id, {
            endDate: endDate.toISOString(),
        });
    }
    async createChangeRequest(dto) {
        const requestNumber = await this.generateRequestNumber();
        const changeRequest = await this.changeRequestModel.create({
            ...dto,
            requestNumber,
        });
        return changeRequest;
    }
    async getChangeRequestById(id) {
        const request = await this.changeRequestModel
            .findById(id)
            .populate('requestedByEmployeeId')
            .populate('submittedByEmployeeId')
            .populate('targetDepartmentId')
            .populate('targetPositionId')
            .exec();
        if (!request) {
            throw new common_1.NotFoundException(`Change request with ID ${id} not found`);
        }
        return request;
    }
    async getAllChangeRequests(status) {
        const filter = status ? { status } : {};
        return this.changeRequestModel
            .find(filter)
            .populate('requestedByEmployeeId')
            .populate('submittedByEmployeeId')
            .sort({ createdAt: -1 })
            .exec();
    }
    async updateChangeRequest(id, dto) {
        const request = await this.changeRequestModel.findById(id);
        if (!request) {
            throw new common_1.NotFoundException(`Change request with ID ${id} not found`);
        }
        if (request.status !== organization_structure_enums_1.StructureRequestStatus.DRAFT) {
            throw new common_1.BadRequestException('Can only update draft requests');
        }
        Object.assign(request, dto);
        await request.save();
        return request;
    }
    async submitChangeRequest(id, dto) {
        const request = await this.changeRequestModel.findById(id);
        if (!request) {
            throw new common_1.NotFoundException(`Change request with ID ${id} not found`);
        }
        if (request.status !== organization_structure_enums_1.StructureRequestStatus.DRAFT) {
            throw new common_1.BadRequestException('Can only submit draft requests');
        }
        request.status = organization_structure_enums_1.StructureRequestStatus.SUBMITTED;
        request.submittedByEmployeeId = new mongoose_2.Types.ObjectId(dto.submittedByEmployeeId);
        request.submittedAt = new Date();
        await request.save();
        return request;
    }
    async cancelChangeRequest(id) {
        const request = await this.changeRequestModel.findById(id);
        if (!request) {
            throw new common_1.NotFoundException(`Change request with ID ${id} not found`);
        }
        if (![
            organization_structure_enums_1.StructureRequestStatus.DRAFT,
            organization_structure_enums_1.StructureRequestStatus.SUBMITTED,
            organization_structure_enums_1.StructureRequestStatus.UNDER_REVIEW,
        ].includes(request.status)) {
            throw new common_1.BadRequestException('Cannot cancel request in current status');
        }
        request.status = organization_structure_enums_1.StructureRequestStatus.CANCELED;
        await request.save();
        return request;
    }
    async createApproval(dto) {
        const request = await this.changeRequestModel.findById(dto.changeRequestId);
        if (!request) {
            throw new common_1.NotFoundException(`Change request not found`);
        }
        const approval = await this.approvalModel.create(dto);
        if (request.status === organization_structure_enums_1.StructureRequestStatus.SUBMITTED) {
            request.status = organization_structure_enums_1.StructureRequestStatus.UNDER_REVIEW;
            await request.save();
        }
        return approval;
    }
    async updateApprovalDecision(id, dto) {
        const approval = await this.approvalModel.findById(id);
        if (!approval) {
            throw new common_1.NotFoundException(`Approval with ID ${id} not found`);
        }
        if (approval.decision !== organization_structure_enums_1.ApprovalDecision.PENDING) {
            throw new common_1.BadRequestException('Approval decision already made');
        }
        approval.decision = dto.decision;
        approval.decidedAt = new Date();
        if (dto.comments)
            approval.comments = dto.comments;
        await approval.save();
        await this.checkAndUpdateRequestStatus(approval.changeRequestId);
        return approval;
    }
    async getRequestApprovals(changeRequestId) {
        return this.approvalModel
            .find({ changeRequestId })
            .populate('approverEmployeeId')
            .exec();
    }
    async getChangeLogs(entityType, entityId) {
        const filter = {};
        if (entityType)
            filter.entityType = entityType;
        if (entityId)
            filter.entityId = entityId;
        return this.changeLogModel
            .find(filter)
            .populate('performedByEmployeeId')
            .sort({ createdAt: -1 })
            .exec();
    }
    async generateRequestNumber() {
        const count = await this.changeRequestModel.countDocuments();
        const year = new Date().getFullYear();
        return `SCR-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    async logChange(action, entityType, entityId, beforeSnapshot, afterSnapshot, performedBy) {
        await this.changeLogModel.create({
            action,
            entityType,
            entityId,
            beforeSnapshot,
            afterSnapshot,
            performedByEmployeeId: performedBy
                ? new mongoose_2.Types.ObjectId(performedBy)
                : undefined,
        });
    }
    async checkAndUpdateRequestStatus(changeRequestId) {
        const approvals = await this.approvalModel.find({ changeRequestId });
        const allDecided = approvals.every((a) => a.decision !== organization_structure_enums_1.ApprovalDecision.PENDING);
        if (!allDecided)
            return;
        const hasRejection = approvals.some((a) => a.decision === organization_structure_enums_1.ApprovalDecision.REJECTED);
        const request = await this.changeRequestModel.findById(changeRequestId);
        if (request) {
            request.status = hasRejection
                ? organization_structure_enums_1.StructureRequestStatus.REJECTED
                : organization_structure_enums_1.StructureRequestStatus.APPROVED;
            await request.save();
        }
    }
    async getDepartmentHierarchy() {
        const departments = await this.departmentModel
            .find({ isActive: true })
            .populate('headPositionId')
            .exec();
        return Promise.all(departments.map(async (dept) => {
            const positions = await this.positionModel
                .find({ departmentId: dept._id, isActive: true })
                .exec();
            return {
                department: dept,
                positions,
            };
        }));
    }
};
exports.OrganizationStructureService = OrganizationStructureService;
exports.OrganizationStructureService = OrganizationStructureService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(department_schema_1.Department.name)),
    __param(1, (0, mongoose_1.InjectModel)(position_schema_1.Position.name)),
    __param(2, (0, mongoose_1.InjectModel)(position_assignment_schema_1.PositionAssignment.name)),
    __param(3, (0, mongoose_1.InjectModel)(structure_change_request_schema_1.StructureChangeRequest.name)),
    __param(4, (0, mongoose_1.InjectModel)(structure_approval_schema_1.StructureApproval.name)),
    __param(5, (0, mongoose_1.InjectModel)(structure_change_log_schema_1.StructureChangeLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], OrganizationStructureService);
//# sourceMappingURL=organization-structure.service.js.map