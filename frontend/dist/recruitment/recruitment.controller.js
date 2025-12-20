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
exports.RecruitmentController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_config_1 = require("./multer.config");
const document_type_enum_1 = require("./enums/document-type.enum");
const recruitment_service_1 = require("./recruitment.service");
const job_requisition_dto_1 = require("./dto/job-requisition.dto");
const application_dto_1 = require("./dto/application.dto");
const interview_dto_1 = require("./dto/interview.dto");
const offer_dto_1 = require("./dto/offer.dto");
const create_onboarding_dto_1 = require("./dto/create-onboarding.dto");
const update_onboarding_dto_1 = require("./dto/update-onboarding.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const employee_profile_enums_1 = require("../employee-profile/enums/employee-profile.enums");
const create_employee_from_contract_dto_1 = require("./dto/create-employee-from-contract.dto");
const termination_request_dto_1 = require("./dto/termination-request.dto");
const clearance_checklist_dto_1 = require("./dto/clearance-checklist.dto");
const system_access_dto_1 = require("./dto/system-access.dto");
let RecruitmentController = class RecruitmentController {
    constructor(service) {
        this.service = service;
    }
    createJob(dto) {
        return this.service.createJobRequisition(dto);
    }
    getJobs() {
        return this.service.getAllJobRequisitions();
    }
    getJobById(id) {
        return this.service.getJobRequisitionById(id);
    }
    updateJobStatus(id, dto) {
        return this.service.updateJobRequisitionStatus(id, dto.status);
    }
    publishJob(id) {
        return this.service.publishJobRequisition(id);
    }
    previewJob(id) {
        return this.service.previewJobRequisition(id);
    }
    createJobTemplate(dto) {
        return this.service.createJobTemplate(dto);
    }
    getAllJobTemplates() {
        return this.service.getAllJobTemplates();
    }
    getJobTemplateById(id) {
        return this.service.getJobTemplateById(id);
    }
    updateJobTemplate(id, dto) {
        return this.service.updateJobTemplate(id, dto);
    }
    apply(dto) {
        if (!dto.consentGiven) {
            throw new common_1.BadRequestException('Consent for data processing is required to submit application');
        }
        return this.service.apply(dto, dto.consentGiven);
    }
    getAllApplications(requisitionId, prioritizeReferrals) {
        const prioritize = prioritizeReferrals !== 'false';
        return this.service.getAllApplications(requisitionId, prioritize);
    }
    getRankedApplications(requisitionId) {
        return this.service.getRankedApplications(requisitionId);
    }
    updateAppStatus(id, dto, req) {
        const changedBy = req.user?.id || req.user?._id;
        return this.service.updateApplicationStatus(id, dto, changedBy);
    }
    scheduleInterview(dto) {
        return this.service.scheduleInterview(dto);
    }
    updateInterviewStatus(id, dto) {
        return this.service.updateInterviewStatus(id, dto);
    }
    submitInterviewFeedback(interviewId, dto, req) {
        const interviewerId = req.user?.id || req.user?._id;
        if (!interviewerId) {
            throw new common_1.BadRequestException('Interviewer ID not found in request');
        }
        return this.service.submitInterviewFeedback(interviewId, interviewerId, dto.score, dto.comments);
    }
    getInterviewFeedback(interviewId) {
        return this.service.getInterviewFeedback(interviewId);
    }
    getInterviewAverageScore(interviewId) {
        return this.service.getInterviewAverageScore(interviewId);
    }
    createOffer(dto) {
        return this.service.createOffer(dto);
    }
    respond(id, dto) {
        return this.service.respondToOffer(id, dto);
    }
    finalize(id, dto) {
        return this.service.finalizeOffer(id, dto);
    }
    async createEmployeeFromContract(offerId, dto) {
        return this.service.createEmployeeFromContract(offerId, dto);
    }
    async createOnboarding(createOnboardingDto) {
        return this.service.createOnboarding(createOnboardingDto);
    }
    async getAllOnboardings() {
        return this.service.getAllOnboardings();
    }
    async getOnboardingStats() {
        return this.service.getOnboardingStats();
    }
    async getOnboardingById(id) {
        return this.service.getOnboardingById(id);
    }
    async getOnboardingByEmployeeId(employeeId) {
        return this.service.getOnboardingByEmployeeId(employeeId);
    }
    async updateOnboarding(id, updateOnboardingDto) {
        return this.service.updateOnboarding(id, updateOnboardingDto);
    }
    async updateOnboardingTask(id, taskIndex, updateTaskDto) {
        return this.service.updateOnboardingTask(id, parseInt(taskIndex), updateTaskDto);
    }
    async addTaskToOnboarding(id, taskDto) {
        return this.service.addTaskToOnboarding(id, taskDto);
    }
    async removeTaskFromOnboarding(id, taskIndex) {
        return this.service.removeTaskFromOnboarding(id, parseInt(taskIndex, 10));
    }
    async deleteOnboarding(id) {
        return this.service.deleteOnboarding(id);
    }
    async uploadTaskDocument(onboardingId, taskIndex, file, documentType) {
        return this.service.uploadTaskDocument(onboardingId, parseInt(taskIndex, 10), file, documentType);
    }
    async downloadDocument(documentId, res) {
        return this.service.downloadDocument(documentId, res);
    }
    async getTaskDocument(onboardingId, taskIndex) {
        return this.service.getTaskDocument(onboardingId, parseInt(taskIndex, 10));
    }
    async deleteDocument(documentId) {
        return this.service.deleteDocument(documentId);
    }
    async sendOnboardingReminders() {
        await this.service.sendOnboardingReminders();
        return { message: 'Reminders sent successfully' };
    }
    async provisionSystemAccess(employeeId, taskIndex) {
        return this.service.provisionSystemAccess(employeeId, parseInt(taskIndex, 10));
    }
    async reserveEquipment(employeeId, dto) {
        return this.service.reserveEquipment(employeeId, dto.equipmentType, dto.equipmentDetails);
    }
    async scheduleAccessProvisioning(employeeId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
        return this.service.scheduleAccessProvisioning(employeeId, startDate, endDate);
    }
    async triggerPayrollInitiation(employeeId, dto) {
        const contractSigningDate = new Date(dto.contractSigningDate);
        return this.service.triggerPayrollInitiation(employeeId, contractSigningDate, dto.grossSalary);
    }
    async processSigningBonus(employeeId, dto) {
        const contractSigningDate = new Date(dto.contractSigningDate);
        return this.service.processSigningBonus(employeeId, dto.signingBonus, contractSigningDate);
    }
    async cancelOnboarding(employeeId, dto) {
        return this.service.cancelOnboarding(employeeId, dto.reason);
    }
    tagCandidateAsReferral(candidateId, dto, req) {
        const referringEmployeeId = dto.referringEmployeeId || req.user?.id || req.user?._id;
        if (!referringEmployeeId) {
            throw new common_1.BadRequestException('Referring employee ID is required');
        }
        return this.service.tagCandidateAsReferral(candidateId, referringEmployeeId, dto.role, dto.level);
    }
    getCandidateReferrals(candidateId) {
        return this.service.getCandidateReferrals(candidateId);
    }
    recordCandidateConsent(candidateId, dto) {
        return this.service.recordCandidateConsent(candidateId, dto.consentGiven, dto.consentType || 'data_processing', dto.notes);
    }
    createTerminationRequest(dto, req) {
        return this.service.createTerminationRequest(dto, req.user);
    }
    getMyResignationRequests(req) {
        return this.service.getMyResignationRequests(req.user);
    }
    getTerminationRequest(id) {
        return this.service.getTerminationRequestById(id);
    }
    updateTerminationStatus(id, dto, req) {
        return this.service.updateTerminationStatus(id, dto, req.user);
    }
    updateTerminationDetails(id, dto, req) {
        return this.service.updateTerminationDetails(id, dto, req.user);
    }
    createClearanceChecklist(dto, req) {
        return this.service.createClearanceChecklist(dto, req.user);
    }
    sendClearanceReminders(opts = { force: false }) {
        return this.service.sendClearanceReminders(opts);
    }
    getChecklistByEmployee(employeeId) {
        return this.service.getChecklistByEmployee(employeeId);
    }
    updateClearanceItem(checklistId, dto, req) {
        return this.service.updateClearanceItemStatus(checklistId, dto, req.user);
    }
    markChecklistCompleted(checklistId, req) {
        return this.service.markChecklistCompleted(checklistId, req.user);
    }
    getLatestAppraisal(employeeId) {
        return this.service.getLatestAppraisalForEmployee(employeeId);
    }
    revokeAccess(dto, req) {
        return this.service.revokeSystemAccess(dto, req.user);
    }
};
exports.RecruitmentController = RecruitmentController;
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('job'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [job_requisition_dto_1.CreateJobRequisitionDto]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createJob", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('job'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getJobs", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('job/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getJobById", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Patch)('job/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateJobStatus", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('job/:id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "publishJob", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('job/:id/preview'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "previewJob", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('job-template'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createJobTemplate", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('job-template'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getAllJobTemplates", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('job-template/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getJobTemplateById", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Put)('job-template/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateJobTemplate", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.JOB_CANDIDATE),
    (0, common_1.Post)('application'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "apply", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('application'),
    __param(0, (0, common_1.Query)('requisitionId')),
    __param(1, (0, common_1.Query)('prioritizeReferrals')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getAllApplications", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Get)('application/ranked/:requisitionId'),
    __param(0, (0, common_1.Param)('requisitionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getRankedApplications", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Patch)('application/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, application_dto_1.UpdateApplicationStatusDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateAppStatus", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.RECRUITER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('interview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [interview_dto_1.ScheduleInterviewDto]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "scheduleInterview", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.RECRUITER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Patch)('interview/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, interview_dto_1.UpdateInterviewStatusDto]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateInterviewStatus", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.RECRUITER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('interview/:id/feedback'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "submitInterviewFeedback", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('interview/:id/feedback'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getInterviewFeedback", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('interview/:id/score'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getInterviewAverageScore", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('offer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [offer_dto_1.CreateOfferDto]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createOffer", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.JOB_CANDIDATE),
    (0, common_1.Patch)('offer/:id/respond'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, offer_dto_1.RespondToOfferDto]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "respond", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Patch)('offer/:id/finalize'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, offer_dto_1.FinalizeOfferDto]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "finalize", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('offer/:id/create-employee'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_employee_from_contract_dto_1.CreateEmployeeFromContractDto]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "createEmployeeFromContract", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_onboarding_dto_1.CreateOnboardingDto]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "createOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Get)('onboarding'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getAllOnboardings", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Get)('onboarding/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getOnboardingStats", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('onboarding/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getOnboardingById", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('onboarding/employee/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getOnboardingByEmployeeId", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Put)('onboarding/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_onboarding_dto_1.UpdateOnboardingDto]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "updateOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Patch)('onboarding/:id/task/:taskIndex'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('taskIndex')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_task_dto_1.UpdateOnboardingTaskDto]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "updateOnboardingTask", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:id/task'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "addTaskToOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Delete)('onboarding/:id/task/:taskIndex'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('taskIndex')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "removeTaskFromOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Delete)('onboarding/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "deleteOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:id/task/:taskIndex/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', multer_config_1.multerConfig)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('taskIndex')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('documentType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "uploadTaskDocument", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('document/:documentId/download'),
    __param(0, (0, common_1.Param)('documentId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "downloadDocument", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('onboarding/:id/task/:taskIndex/document'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('taskIndex')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "getTaskDocument", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Delete)('document/:documentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/send-reminders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "sendOnboardingReminders", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:employeeId/provision-access/:taskIndex'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('taskIndex')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "provisionSystemAccess", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:employeeId/reserve-equipment'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "reserveEquipment", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:employeeId/schedule-access'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "scheduleAccessProvisioning", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:employeeId/trigger-payroll'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "triggerPayrollInitiation", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:employeeId/process-bonus'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "processSigningBonus", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('onboarding/:employeeId/cancel'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecruitmentController.prototype, "cancelOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    (0, common_1.Post)('candidate/:candidateId/referral'),
    __param(0, (0, common_1.Param)('candidateId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "tagCandidateAsReferral", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('candidate/:candidateId/referrals'),
    __param(0, (0, common_1.Param)('candidateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getCandidateReferrals", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Post)('candidate/:candidateId/consent'),
    __param(0, (0, common_1.Param)('candidateId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "recordCandidateConsent", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Post)('offboarding/termination'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [termination_request_dto_1.CreateTerminationRequestDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createTerminationRequest", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Get)('offboarding/my-resignation'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getMyResignationRequests", null);
__decorate([
    (0, common_1.Get)('offboarding/termination/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getTerminationRequest", null);
__decorate([
    (0, common_1.Patch)('offboarding/termination/:id/status'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, termination_request_dto_1.UpdateTerminationStatusDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateTerminationStatus", null);
__decorate([
    (0, common_1.Patch)('offboarding/termination/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, termination_request_dto_1.UpdateTerminationDetailsDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateTerminationDetails", null);
__decorate([
    (0, common_1.Post)('offboarding/clearance'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [clearance_checklist_dto_1.CreateClearanceChecklistDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createClearanceChecklist", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Post)('offboarding/clearance/send-reminders'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "sendClearanceReminders", null);
__decorate([
    (0, common_1.Get)('offboarding/clearance/employee/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getChecklistByEmployee", null);
__decorate([
    (0, common_1.Patch)('offboarding/clearance/:id/item'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.FINANCE_STAFF, employee_profile_enums_1.SystemRole.PAYROLL_MANAGER, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, clearance_checklist_dto_1.UpdateClearanceItemStatusDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateClearanceItem", null);
__decorate([
    (0, common_1.Patch)('offboarding/clearance/:id/complete'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "markChecklistCompleted", null);
__decorate([
    (0, common_1.Get)('offboarding/appraisal/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getLatestAppraisal", null);
__decorate([
    (0, common_1.Patch)('offboarding/system-revoke'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [system_access_dto_1.RevokeSystemAccessDto, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "revokeAccess", null);
exports.RecruitmentController = RecruitmentController = __decorate([
    (0, common_1.Controller)('recruitment'),
    __metadata("design:paramtypes", [recruitment_service_1.RecruitmentService])
], RecruitmentController);
//# sourceMappingURL=recruitment.controller.js.map