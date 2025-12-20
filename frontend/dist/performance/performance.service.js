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
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const appraisal_template_schema_1 = require("./models/appraisal-template.schema");
const appraisal_cycle_schema_1 = require("./models/appraisal-cycle.schema");
const appraisal_assignment_schema_1 = require("./models/appraisal-assignment.schema");
const appraisal_record_schema_1 = require("./models/appraisal-record.schema");
const appraisal_dispute_schema_1 = require("./models/appraisal-dispute.schema");
const performance_enums_1 = require("./enums/performance.enums");
let PerformanceService = class PerformanceService {
    constructor(templateModel, cycleModel, assignmentModel, recordModel, disputeModel) {
        this.templateModel = templateModel;
        this.cycleModel = cycleModel;
        this.assignmentModel = assignmentModel;
        this.recordModel = recordModel;
        this.disputeModel = disputeModel;
    }
    async createTemplate(dto) {
        const totalWeight = (dto.criteria || [])
            .map((c) => c.weight ?? 0)
            .reduce((a, b) => a + b, 0);
        if (totalWeight > 0 && totalWeight !== 100) {
            throw new common_1.BadRequestException('Sum of criteria weights must be either 0 or 100.');
        }
        const created = new this.templateModel({
            ...dto,
            applicableDepartmentIds: dto.applicableDepartmentIds || [],
            applicablePositionIds: dto.applicablePositionIds || [],
        });
        return created.save();
    }
    async findAllTemplates() {
        return this.templateModel.find().lean().exec();
    }
    async findTemplateById(id) {
        const template = await this.templateModel.findById(id).lean().exec();
        if (!template) {
            throw new common_1.NotFoundException('Appraisal template not found');
        }
        return template;
    }
    async updateTemplate(id, dto) {
        const updated = await this.templateModel
            .findByIdAndUpdate(id, { $set: dto }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException('Appraisal template not found');
        }
        return updated;
    }
    async deleteTemplate(id) {
        const res = await this.templateModel.findByIdAndDelete(id).exec();
        if (!res)
            throw new common_1.NotFoundException('Appraisal template not found');
    }
    async createCycle(dto) {
        if (new Date(dto.startDate) >= new Date(dto.endDate)) {
            throw new common_1.BadRequestException('startDate must be before endDate');
        }
        const cycle = await new this.cycleModel({
            name: dto.name,
            description: dto.description,
            cycleType: dto.cycleType,
            startDate: dto.startDate,
            endDate: dto.endDate,
            managerDueDate: dto.managerDueDate,
            employeeAcknowledgementDueDate: dto.employeeAcknowledgementDueDate,
            templateAssignments: dto.templateAssignments || [],
            status: performance_enums_1.AppraisalCycleStatus.PLANNED,
        }).save();
        const assignmentDocs = await this.assignmentModel.insertMany(dto.assignments.map((a) => ({
            cycleId: cycle._id,
            templateId: new mongoose_2.Types.ObjectId(a.templateId),
            employeeProfileId: new mongoose_2.Types.ObjectId(a.employeeProfileId),
            managerProfileId: new mongoose_2.Types.ObjectId(a.managerProfileId),
            departmentId: new mongoose_2.Types.ObjectId(a.departmentId),
            positionId: a.positionId
                ? new mongoose_2.Types.ObjectId(a.positionId)
                : undefined,
            status: performance_enums_1.AppraisalAssignmentStatus.NOT_STARTED,
            dueDate: a.dueDate ?? dto.managerDueDate ?? dto.endDate,
            assignedAt: new Date(),
        })));
        return { cycle, assignments: assignmentDocs };
    }
    async findAllCycles() {
        return this.cycleModel.find().lean().exec();
    }
    async findCycleById(id) {
        const cycle = await this.cycleModel.findById(id).lean().exec();
        if (!cycle)
            throw new common_1.NotFoundException('Appraisal cycle not found');
        return cycle;
    }
    async activateCycle(id) {
        const cycle = await this.cycleModel
            .findByIdAndUpdate(id, { $set: { status: performance_enums_1.AppraisalCycleStatus.ACTIVE } }, { new: true })
            .exec();
        if (!cycle)
            throw new common_1.NotFoundException('Appraisal cycle not found');
        return cycle;
    }
    async publishCycle(id) {
        const cycle = await this.cycleModel.findById(id).exec();
        if (!cycle)
            throw new common_1.NotFoundException('Appraisal cycle not found');
        await this.recordModel.updateMany({
            cycleId: cycle._id,
            status: performance_enums_1.AppraisalRecordStatus.MANAGER_SUBMITTED,
        }, {
            $set: {
                status: performance_enums_1.AppraisalRecordStatus.HR_PUBLISHED,
                hrPublishedAt: new Date(),
            },
        });
        cycle.status = performance_enums_1.AppraisalCycleStatus.CLOSED;
        cycle.publishedAt = new Date();
        await cycle.save();
    }
    async closeCycle(id) {
        const cycle = await this.cycleModel
            .findByIdAndUpdate(id, {
            $set: {
                status: performance_enums_1.AppraisalCycleStatus.CLOSED,
                closedAt: new Date(),
            },
        }, { new: true })
            .exec();
        if (!cycle)
            throw new common_1.NotFoundException('Appraisal cycle not found');
        return cycle;
    }
    async archiveCycle(id) {
        const cycle = await this.cycleModel
            .findByIdAndUpdate(id, {
            $set: {
                status: performance_enums_1.AppraisalCycleStatus.ARCHIVED,
                archivedAt: new Date(),
            },
        }, { new: true })
            .exec();
        if (!cycle)
            throw new common_1.NotFoundException('Appraisal cycle not found');
        await this.recordModel.updateMany({ cycleId: cycle._id }, { $set: { archivedAt: new Date() } });
        return cycle;
    }
    async getAssignmentsForManager(managerProfileId, cycleId) {
        const filter = { managerProfileId };
        if (cycleId)
            filter.cycleId = cycleId;
        return this.assignmentModel
            .find(filter)
            .populate('employeeProfileId templateId cycleId')
            .lean()
            .exec();
    }
    async getAssignmentsForEmployee(employeeProfileId, cycleId) {
        const filter = { employeeProfileId };
        if (cycleId)
            filter.cycleId = cycleId;
        return this.assignmentModel
            .find(filter)
            .populate('templateId cycleId')
            .lean()
            .exec();
    }
    async upsertAppraisalRecord(assignmentId, managerProfileId, dto) {
        const assignment = await this.assignmentModel.findById(assignmentId).exec();
        if (!assignment)
            throw new common_1.NotFoundException('Appraisal assignment not found');
        if (assignment.managerProfileId.toString() !== managerProfileId) {
            throw new common_1.BadRequestException('Manager not authorized');
        }
        let record = null;
        if (assignment.latestAppraisalId) {
            record = await this.recordModel
                .findById(assignment.latestAppraisalId)
                .exec();
        }
        if (!record) {
            record = new this.recordModel({
                assignmentId: assignment._id,
                cycleId: assignment.cycleId,
                templateId: assignment.templateId,
                employeeProfileId: assignment.employeeProfileId,
                managerProfileId: assignment.managerProfileId,
            });
        }
        record.ratings = dto.ratings;
        record.totalScore = dto.totalScore;
        record.overallRatingLabel = dto.overallRatingLabel;
        record.managerSummary = dto.managerSummary;
        record.strengths = dto.strengths;
        record.improvementAreas = dto.improvementAreas;
        record.status = performance_enums_1.AppraisalRecordStatus.DRAFT;
        await record.save();
        if (!assignment.latestAppraisalId) {
            assignment.latestAppraisalId = record._id;
            assignment.status = performance_enums_1.AppraisalAssignmentStatus.IN_PROGRESS;
            await assignment.save();
        }
        return record;
    }
    async submitAppraisalRecord(recordId, managerProfileId) {
        const record = await this.recordModel.findById(recordId).exec();
        if (!record)
            throw new common_1.NotFoundException('Appraisal record not found');
        if (record.managerProfileId.toString() !== managerProfileId) {
            throw new common_1.BadRequestException('Not authorized to submit this record');
        }
        record.status = performance_enums_1.AppraisalRecordStatus.MANAGER_SUBMITTED;
        record.managerSubmittedAt = new Date();
        await record.save();
        await this.assignmentModel.findByIdAndUpdate(record.assignmentId, {
            $set: {
                status: performance_enums_1.AppraisalAssignmentStatus.SUBMITTED,
                submittedAt: new Date(),
            },
        });
        return record;
    }
    async getEmployeeAppraisals(employeeProfileId) {
        return this.recordModel
            .find({
            employeeProfileId,
            status: { $in: [performance_enums_1.AppraisalRecordStatus.HR_PUBLISHED] },
        })
            .populate('assignmentId cycleId templateId managerProfileId')
            .lean()
            .exec();
    }
    async submitDispute(appraisalId, employeeProfileId, dto) {
        const record = await this.recordModel.findById(appraisalId).exec();
        if (!record)
            throw new common_1.NotFoundException('Appraisal record not found');
        if (record.employeeProfileId.toString() !== employeeProfileId) {
            throw new common_1.BadRequestException('Employee cannot dispute another employee’s record');
        }
        const assignment = await this.assignmentModel
            .findById(record.assignmentId)
            .exec();
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        const dispute = new this.disputeModel({
            appraisalId: record._id,
            assignmentId: assignment._id,
            cycleId: record.cycleId,
            raisedByEmployeeId: employeeProfileId,
            reason: dto.reason,
            details: dto.details,
            submittedAt: new Date(),
            status: performance_enums_1.AppraisalDisputeStatus.OPEN,
        });
        return dispute.save();
    }
    async resolveDispute(disputeId, resolverEmployeeId, dto) {
        const dispute = await this.disputeModel.findById(disputeId).exec();
        if (!dispute)
            throw new common_1.NotFoundException('Dispute not found');
        dispute.status = dto.status;
        dispute.resolutionSummary = dto.resolutionSummary;
        dispute.resolvedAt = new Date();
        dispute.resolvedByEmployeeId = resolverEmployeeId;
        await dispute.save();
        return dispute;
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(appraisal_template_schema_1.AppraisalTemplate.name)),
    __param(1, (0, mongoose_1.InjectModel)(appraisal_cycle_schema_1.AppraisalCycle.name)),
    __param(2, (0, mongoose_1.InjectModel)(appraisal_assignment_schema_1.AppraisalAssignment.name)),
    __param(3, (0, mongoose_1.InjectModel)(appraisal_record_schema_1.AppraisalRecord.name)),
    __param(4, (0, mongoose_1.InjectModel)(appraisal_dispute_schema_1.AppraisalDispute.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], PerformanceService);
//# sourceMappingURL=performance.service.js.map