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
exports.PerformanceController = void 0;
const common_1 = require("@nestjs/common");
const performance_service_1 = require("./performance.service");
const create_appraisal_template_dto_1 = require("./dto/create-appraisal-template.dto");
const update_appraisal_template_dto_1 = require("./dto/update-appraisal-template.dto");
const create_appraisal_cycle_dto_1 = require("./dto/create-appraisal-cycle.dto");
const upsert_appraisal_record_dto_1 = require("./dto/upsert-appraisal-record.dto");
const submit_dispute_dto_1 = require("./dto/submit-dispute.dto");
const resolve_dispute_dto_1 = require("./dto/resolve-dispute.dto");
let PerformanceController = class PerformanceController {
    constructor(performanceService) {
        this.performanceService = performanceService;
    }
    createTemplate(dto) {
        return this.performanceService.createTemplate(dto);
    }
    findAllTemplates() {
        return this.performanceService.findAllTemplates();
    }
    findTemplateById(id) {
        return this.performanceService.findTemplateById(id);
    }
    updateTemplate(id, dto) {
        return this.performanceService.updateTemplate(id, dto);
    }
    createCycle(dto) {
        return this.performanceService.createCycle(dto);
    }
    findAllCycles() {
        return this.performanceService.findAllCycles();
    }
    findCycleById(id) {
        return this.performanceService.findCycleById(id);
    }
    activateCycle(id) {
        return this.performanceService.activateCycle(id);
    }
    publishCycle(id) {
        return this.performanceService.publishCycle(id);
    }
    closeCycle(id) {
        return this.performanceService.closeCycle(id);
    }
    archiveCycle(id) {
        return this.performanceService.archiveCycle(id);
    }
    getAssignmentsForManager(managerProfileId, cycleId) {
        return this.performanceService.getAssignmentsForManager(managerProfileId, cycleId);
    }
    getAssignmentsForEmployee(employeeProfileId, cycleId) {
        return this.performanceService.getAssignmentsForEmployee(employeeProfileId, cycleId);
    }
    upsertAppraisalRecord(assignmentId, managerProfileId, dto) {
        return this.performanceService.upsertAppraisalRecord(assignmentId, managerProfileId, dto);
    }
    submitAppraisalRecord(id, managerProfileId) {
        return this.performanceService.submitAppraisalRecord(id, managerProfileId);
    }
    getEmployeeAppraisals(employeeProfileId) {
        return this.performanceService.getEmployeeAppraisals(employeeProfileId);
    }
    submitDispute(appraisalId, employeeProfileId, dto) {
        return this.performanceService.submitDispute(appraisalId, employeeProfileId, dto);
    }
    resolveDispute(id, resolverEmployeeId, dto) {
        return this.performanceService.resolveDispute(id, resolverEmployeeId, dto);
    }
};
exports.PerformanceController = PerformanceController;
__decorate([
    (0, common_1.Post)('templates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appraisal_template_dto_1.CreateAppraisalTemplateDto]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "findAllTemplates", null);
__decorate([
    (0, common_1.Get)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "findTemplateById", null);
__decorate([
    (0, common_1.Patch)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_appraisal_template_dto_1.UpdateAppraisalTemplateDto]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Post)('cycles'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appraisal_cycle_dto_1.CreateAppraisalCycleDto]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "createCycle", null);
__decorate([
    (0, common_1.Get)('cycles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "findAllCycles", null);
__decorate([
    (0, common_1.Get)('cycles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "findCycleById", null);
__decorate([
    (0, common_1.Patch)('cycles/:id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "activateCycle", null);
__decorate([
    (0, common_1.Patch)('cycles/:id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "publishCycle", null);
__decorate([
    (0, common_1.Patch)('cycles/:id/close'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "closeCycle", null);
__decorate([
    (0, common_1.Patch)('cycles/:id/archive'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "archiveCycle", null);
__decorate([
    (0, common_1.Get)('assignments/manager/:managerProfileId'),
    __param(0, (0, common_1.Param)('managerProfileId')),
    __param(1, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getAssignmentsForManager", null);
__decorate([
    (0, common_1.Get)('assignments/employee/:employeeProfileId'),
    __param(0, (0, common_1.Param)('employeeProfileId')),
    __param(1, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getAssignmentsForEmployee", null);
__decorate([
    (0, common_1.Post)('assignments/:assignmentId/records'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Query)('managerProfileId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, upsert_appraisal_record_dto_1.UpsertAppraisalRecordDto]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "upsertAppraisalRecord", null);
__decorate([
    (0, common_1.Patch)('appraisals/:id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('managerProfileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "submitAppraisalRecord", null);
__decorate([
    (0, common_1.Get)('appraisals/employee/:employeeProfileId'),
    __param(0, (0, common_1.Param)('employeeProfileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getEmployeeAppraisals", null);
__decorate([
    (0, common_1.Post)('appraisals/:appraisalId/disputes'),
    __param(0, (0, common_1.Param)('appraisalId')),
    __param(1, (0, common_1.Query)('employeeProfileId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, submit_dispute_dto_1.SubmitDisputeDto]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "submitDispute", null);
__decorate([
    (0, common_1.Patch)('disputes/:id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('resolverEmployeeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, resolve_dispute_dto_1.ResolveDisputeDto]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "resolveDispute", null);
exports.PerformanceController = PerformanceController = __decorate([
    (0, common_1.Controller)('performance'),
    __metadata("design:paramtypes", [performance_service_1.PerformanceService])
], PerformanceController);
//# sourceMappingURL=performance.controller.js.map