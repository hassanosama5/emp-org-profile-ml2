"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitmentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const job_requisition_schema_1 = require("./models/job-requisition.schema");
const application_schema_1 = require("./models/application.schema");
const interview_schema_1 = require("./models/interview.schema");
const offer_schema_1 = require("./models/offer.schema");
const nodemailer = __importStar(require("nodemailer"));
const onboarding_schema_1 = require("./models/onboarding.schema");
const onboarding_task_status_enum_1 = require("./enums/onboarding-task-status.enum");
const document_schema_1 = require("./models/document.schema");
const fs = __importStar(require("fs-extra"));
const employee_profile_service_1 = require("../employee-profile/employee-profile.service");
const organization_structure_service_1 = require("../organization-structure/organization-structure.service");
const contract_schema_1 = require("./models/contract.schema");
const offer_response_status_enum_1 = require("./enums/offer-response-status.enum");
const offer_final_status_enum_1 = require("./enums/offer-final-status.enum");
const employee_profile_enums_1 = require("../employee-profile/enums/employee-profile.enums");
const candidate_schema_1 = require("../employee-profile/models/candidate.schema");
const referral_schema_1 = require("./models/referral.schema");
const assessment_result_schema_1 = require("./models/assessment-result.schema");
const application_history_schema_1 = require("./models/application-history.schema");
const application_stage_enum_1 = require("./enums/application-stage.enum");
const application_status_enum_1 = require("./enums/application-status.enum");
const termination_request_schema_1 = require("./models/termination-request.schema");
const clearance_checklist_schema_1 = require("./models/clearance-checklist.schema");
const termination_status_enum_1 = require("./enums/termination-status.enum");
const termination_initiation_enum_1 = require("./enums/termination-initiation.enum");
const approval_status_enum_1 = require("./enums/approval-status.enum");
const employee_profile_schema_1 = require("../employee-profile/models/employee-profile.schema");
const employee_system_role_schema_1 = require("../employee-profile/models/employee-system-role.schema");
const appraisal_record_schema_1 = require("../performance/models/appraisal-record.schema");
const employee_profile_enums_2 = require("../employee-profile/enums/employee-profile.enums");
let RecruitmentService = class RecruitmentService {
    constructor(jobModel, applicationModel, interviewModel, offerModel, jobTemplateModel, onboardingModel, documentModel, contractModel, candidateModel, referralModel, assessmentResultModel, applicationStatusHistoryModel, employeeProfileService, organizationStructureService, terminationModel, clearanceModel, employeeModel, appraisalRecordModel, employeeSystemRoleModel) {
        this.jobModel = jobModel;
        this.applicationModel = applicationModel;
        this.interviewModel = interviewModel;
        this.offerModel = offerModel;
        this.jobTemplateModel = jobTemplateModel;
        this.onboardingModel = onboardingModel;
        this.documentModel = documentModel;
        this.contractModel = contractModel;
        this.candidateModel = candidateModel;
        this.referralModel = referralModel;
        this.assessmentResultModel = assessmentResultModel;
        this.applicationStatusHistoryModel = applicationStatusHistoryModel;
        this.employeeProfileService = employeeProfileService;
        this.organizationStructureService = organizationStructureService;
        this.terminationModel = terminationModel;
        this.clearanceModel = clearanceModel;
        this.employeeModel = employeeModel;
        this.appraisalRecordModel = appraisalRecordModel;
        this.employeeSystemRoleModel = employeeSystemRoleModel;
    }
    getErrorMessage(error) {
        if (error instanceof Error)
            return this.getErrorMessage(error);
        return String(error);
    }
    calculateProgress(status) {
        const s = (status || '').toString().toLowerCase();
        const mapping = {
            screening: 20,
            shortlisting: 40,
            department_interview: 50,
            hr_interview: 60,
            interview: 60,
            offer: 80,
            hired: 100,
            submitted: 10,
            in_process: 40,
        };
        return mapping[s] ?? 0;
    }
    async createJobRequisition(dto) {
        if (!mongoose_2.Types.ObjectId.isValid(dto.templateId)) {
            throw new common_1.BadRequestException('Invalid template ID format');
        }
        const template = await this.jobTemplateModel.findById(dto.templateId);
        if (!template) {
            throw new common_1.NotFoundException('Job template not found');
        }
        if (dto.openings <= 0 || !Number.isInteger(dto.openings)) {
            throw new common_1.BadRequestException('Openings must be a positive integer');
        }
        if (dto.hiringManagerId && !mongoose_2.Types.ObjectId.isValid(dto.hiringManagerId)) {
            throw new common_1.BadRequestException('Invalid hiring manager ID format');
        }
        const requisitionId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const jobRequisition = new this.jobModel({
            requisitionId,
            templateId: dto.templateId,
            openings: dto.openings,
            location: dto.location,
            hiringManagerId: dto.hiringManagerId || null,
            publishStatus: 'draft',
        });
        return jobRequisition.save();
    }
    async createJobTemplate(dto) {
        if (!dto.title ||
            typeof dto.title !== 'string' ||
            dto.title.trim().length === 0) {
            throw new common_1.BadRequestException('Title is required and must be a non-empty string');
        }
        if (!dto.department ||
            typeof dto.department !== 'string' ||
            dto.department.trim().length === 0) {
            throw new common_1.BadRequestException('Department is required and must be a non-empty string');
        }
        const tpl = new this.jobTemplateModel({
            title: dto.title,
            department: dto.department,
            qualifications: dto.qualifications || [],
            skills: dto.skills || [],
            description: dto.description || '',
        });
        return tpl.save();
    }
    async getAllJobTemplates() {
        return this.jobTemplateModel.find();
    }
    async getJobTemplateById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid job template ID format');
        }
        const template = await this.jobTemplateModel.findById(id);
        if (!template) {
            throw new common_1.NotFoundException('Job Template not found');
        }
        return template;
    }
    async updateJobTemplate(id, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid job template ID format');
        }
        const existingTemplate = await this.jobTemplateModel.findById(id);
        if (!existingTemplate) {
            throw new common_1.NotFoundException('Job Template not found');
        }
        if (dto.title !== undefined &&
            (typeof dto.title !== 'string' || dto.title.trim().length === 0)) {
            throw new common_1.BadRequestException('Title must be a non-empty string');
        }
        if (dto.department !== undefined &&
            (typeof dto.department !== 'string' || dto.department.trim().length === 0)) {
            throw new common_1.BadRequestException('Department must be a non-empty string');
        }
        const updated = await this.jobTemplateModel.findByIdAndUpdate(id, dto, {
            new: true,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Job Template not found');
        }
        return updated;
    }
    async publishJobRequisition(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid job requisition ID format');
        }
        const requisition = await this.jobModel.findById(id);
        if (!requisition) {
            throw new common_1.NotFoundException('Job Requisition not found');
        }
        if (requisition.publishStatus === 'closed') {
            throw new common_1.BadRequestException('Cannot publish a closed job requisition');
        }
        if (!requisition.openings || requisition.openings <= 0) {
            throw new common_1.BadRequestException('Cannot publish job requisition: Number of openings must be greater than 0');
        }
        const update = { publishStatus: 'published', postingDate: new Date() };
        const updated = await this.jobModel.findByIdAndUpdate(id, update, {
            new: true,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Job Requisition not found');
        }
        return updated;
    }
    async previewJobRequisition(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid job requisition ID format');
        }
        const job = await this.jobModel.findById(id).populate('templateId');
        if (!job) {
            throw new common_1.NotFoundException('Job Requisition not found');
        }
        return job;
    }
    async getAllJobRequisitions() {
        return this.jobModel.find();
    }
    async getJobRequisitionById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid job requisition ID format');
        }
        const job = await this.jobModel.findById(id);
        if (!job) {
            throw new common_1.NotFoundException('Job Requisition not found');
        }
        return job;
    }
    async updateJobRequisitionStatus(id, newStatus) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid job requisition ID format');
        }
        if (!newStatus || typeof newStatus !== 'string') {
            throw new common_1.BadRequestException('Invalid status value');
        }
        const jobRequisition = await this.jobModel.findById(id);
        if (!jobRequisition) {
            throw new common_1.NotFoundException('Job Requisition not found');
        }
        const update = {};
        if (newStatus.toLowerCase() === 'approved' &&
            jobRequisition.publishStatus === 'draft') {
            update.publishStatus = 'published';
            update.postingDate = new Date();
        }
        const updated = await this.jobModel.findByIdAndUpdate(id, update, {
            new: true,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Job Requisition not found');
        }
        return updated;
    }
    async apply(dto, consentGiven = false) {
        if (!mongoose_2.Types.ObjectId.isValid(dto.candidateId)) {
            throw new common_1.BadRequestException('Invalid candidate ID format');
        }
        if (!mongoose_2.Types.ObjectId.isValid(dto.requisitionId)) {
            throw new common_1.BadRequestException('Invalid requisition ID format');
        }
        if (dto.assignedHr && !mongoose_2.Types.ObjectId.isValid(dto.assignedHr)) {
            throw new common_1.BadRequestException('Invalid assigned HR ID format');
        }
        if (!consentGiven) {
            throw new common_1.BadRequestException('Applicant consent for data processing is required before storing application. Please provide consent first.');
        }
        const candidate = await this.candidateModel.findById(dto.candidateId);
        if (!candidate) {
            throw new common_1.NotFoundException('Candidate not found');
        }
        const jobRequisition = await this.jobModel.findById(dto.requisitionId);
        if (!jobRequisition) {
            throw new common_1.NotFoundException('Job requisition not found');
        }
        if (jobRequisition.publishStatus === 'closed') {
            throw new common_1.BadRequestException('Cannot apply to a closed job requisition');
        }
        if (jobRequisition.publishStatus !== 'published') {
            throw new common_1.BadRequestException('Cannot apply to a job that is not published');
        }
        if (jobRequisition.expiryDate &&
            new Date(jobRequisition.expiryDate) < new Date()) {
            throw new common_1.BadRequestException('Cannot apply to an expired job requisition');
        }
        const hiredCount = await this.applicationModel.countDocuments({
            requisitionId: new mongoose_2.Types.ObjectId(dto.requisitionId),
            status: application_status_enum_1.ApplicationStatus.HIRED,
        });
        if (hiredCount >= jobRequisition.openings) {
            throw new common_1.BadRequestException(`All ${jobRequisition.openings} position(s) for this requisition have been filled. No more applications are being accepted.`);
        }
        const existingApplication = await this.applicationModel.findOne({
            candidateId: new mongoose_2.Types.ObjectId(dto.candidateId),
            requisitionId: new mongoose_2.Types.ObjectId(dto.requisitionId),
        });
        if (existingApplication) {
            throw new common_1.BadRequestException('You have already applied to this position');
        }
        const application = new this.applicationModel({
            candidateId: dto.candidateId,
            requisitionId: dto.requisitionId,
            assignedHr: dto.assignedHr || undefined,
            currentStage: application_stage_enum_1.ApplicationStage.SCREENING,
            status: application_status_enum_1.ApplicationStatus.SUBMITTED,
        });
        return application.save();
    }
    async getAllApplications(requisitionId, prioritizeReferrals = true) {
        let query = {};
        if (requisitionId) {
            if (!mongoose_2.Types.ObjectId.isValid(requisitionId)) {
                throw new common_1.BadRequestException('Invalid requisition ID format');
            }
            query.requisitionId = new mongoose_2.Types.ObjectId(requisitionId);
        }
        const applications = await this.applicationModel
            .find(query)
            .populate('candidateId')
            .lean();
        if (prioritizeReferrals) {
            const referralCandidates = await this.referralModel
                .find()
                .select('candidateId')
                .lean();
            const referralCandidateIds = new Set(referralCandidates.map((ref) => ref.candidateId.toString()));
            const referrals = [];
            const nonReferrals = [];
            for (const app of applications) {
                const candidateId = app.candidateId?._id?.toString() ||
                    app.candidateId?.toString();
                if (candidateId && referralCandidateIds.has(candidateId)) {
                    referrals.push(app);
                }
                else {
                    nonReferrals.push(app);
                }
            }
            return [...referrals, ...nonReferrals];
        }
        return applications;
    }
    async updateApplicationStatus(id, dto, changedBy) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid application ID format');
        }
        const currentApplication = await this.applicationModel
            .findById(id)
            .populate('candidateId');
        if (!currentApplication) {
            throw new common_1.NotFoundException('Application not found');
        }
        const oldStatus = currentApplication.status;
        const oldStage = currentApplication.currentStage;
        if (oldStatus === application_status_enum_1.ApplicationStatus.REJECTED &&
            dto.status !== application_status_enum_1.ApplicationStatus.REJECTED) {
            throw new common_1.BadRequestException('Cannot change status of a rejected application. Rejected applications cannot be reactivated.');
        }
        if (oldStatus === application_status_enum_1.ApplicationStatus.HIRED &&
            dto.status !== application_status_enum_1.ApplicationStatus.HIRED) {
            throw new common_1.BadRequestException('Cannot change status of a hired application. Hired applications are final.');
        }
        const statusOrder = [
            application_status_enum_1.ApplicationStatus.SUBMITTED,
            application_status_enum_1.ApplicationStatus.IN_PROCESS,
            application_status_enum_1.ApplicationStatus.OFFER,
            application_status_enum_1.ApplicationStatus.HIRED,
        ];
        const oldIndex = statusOrder.indexOf(oldStatus);
        const newIndex = statusOrder.indexOf(dto.status);
        if (oldIndex > -1 &&
            newIndex > -1 &&
            newIndex < oldIndex &&
            dto.status !== application_status_enum_1.ApplicationStatus.REJECTED) {
            throw new common_1.BadRequestException(`Invalid status transition: Cannot change from ${oldStatus} to ${dto.status}. Status can only progress forward in the workflow.`);
        }
        let newStage = oldStage;
        if (dto.status === application_status_enum_1.ApplicationStatus.REJECTED) {
            newStage = application_stage_enum_1.ApplicationStage.SCREENING;
        }
        else if (dto.status === application_status_enum_1.ApplicationStatus.IN_PROCESS) {
            if (oldStage === application_stage_enum_1.ApplicationStage.SCREENING) {
                newStage = application_stage_enum_1.ApplicationStage.DEPARTMENT_INTERVIEW;
            }
        }
        else if (dto.status === application_status_enum_1.ApplicationStatus.OFFER) {
            newStage = application_stage_enum_1.ApplicationStage.OFFER;
        }
        else if (dto.status === application_status_enum_1.ApplicationStatus.HIRED) {
            newStage = application_stage_enum_1.ApplicationStage.OFFER;
        }
        const application = await this.applicationModel
            .findByIdAndUpdate(id, { status: dto.status, currentStage: newStage }, { new: true })
            .populate('candidateId');
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        try {
            if (changedBy && mongoose_2.Types.ObjectId.isValid(changedBy)) {
                await this.applicationStatusHistoryModel.create({
                    applicationId: new mongoose_2.Types.ObjectId(id),
                    oldStage: oldStage,
                    newStage: newStage,
                    oldStatus: oldStatus,
                    newStatus: dto.status,
                    changedBy: new mongoose_2.Types.ObjectId(changedBy),
                });
            }
        }
        catch (e) {
            console.warn('Failed to log application status history:', e);
        }
        try {
            const candidate = application.candidateId;
            if (candidate && candidate.personalEmail) {
                await this.sendNotification('application_status', candidate.personalEmail, {
                    candidateName: candidate.firstName || 'Candidate',
                    status: dto.status,
                }, { nonBlocking: true });
            }
        }
        catch (e) {
            console.warn('Failed to send status update notification:', e);
        }
        try {
            const reqId = application.requisitionId;
            if (reqId) {
                const progress = this.calculateProgress(newStage);
                await this.jobModel.findByIdAndUpdate(reqId, { progress });
                if (dto.status === application_status_enum_1.ApplicationStatus.HIRED) {
                    const hiredCount = await this.applicationModel.countDocuments({
                        requisitionId: reqId,
                        status: application_status_enum_1.ApplicationStatus.HIRED,
                    });
                    const requisition = await this.jobModel.findById(reqId);
                    if (requisition && hiredCount >= requisition.openings) {
                        await this.jobModel.findByIdAndUpdate(reqId, {
                            publishStatus: 'closed',
                        });
                        console.log(`Job requisition ${reqId} automatically closed: all positions filled`);
                    }
                }
            }
        }
        catch (e) {
            console.warn('Failed to update job requisition progress:', e);
        }
        return application;
    }
    async scheduleInterview(dto) {
        if (!mongoose_2.Types.ObjectId.isValid(dto.applicationId)) {
            throw new common_1.BadRequestException('Invalid application ID format');
        }
        const application = await this.applicationModel.findById(dto.applicationId);
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        if (application.status === application_status_enum_1.ApplicationStatus.REJECTED) {
            throw new common_1.BadRequestException('Cannot schedule interview for a rejected application');
        }
        if (application.status === application_status_enum_1.ApplicationStatus.HIRED) {
            throw new common_1.BadRequestException('Cannot schedule interview for a hired candidate');
        }
        const scheduledDate = new Date(dto.scheduledDate);
        if (isNaN(scheduledDate.getTime())) {
            throw new common_1.BadRequestException('Invalid scheduledDate format. Expected ISO 8601 date string.');
        }
        if (scheduledDate <= new Date()) {
            throw new common_1.BadRequestException('Interview date must be in the future');
        }
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (scheduledDate > oneYearFromNow) {
            throw new common_1.BadRequestException('Interview date cannot be more than 1 year in the future');
        }
        const existingInterview = await this.interviewModel.findOne({
            applicationId: new mongoose_2.Types.ObjectId(dto.applicationId),
            stage: dto.stage,
            status: { $ne: 'cancelled' },
        });
        if (existingInterview) {
            throw new common_1.BadRequestException(`An interview for stage '${dto.stage}' already exists for this application. Please update the existing interview or cancel it first.`);
        }
        if (dto.panel && Array.isArray(dto.panel)) {
            if (dto.panel.length === 0) {
                throw new common_1.BadRequestException('Panel must have at least one member');
            }
            for (const panelId of dto.panel) {
                if (!mongoose_2.Types.ObjectId.isValid(panelId)) {
                    throw new common_1.BadRequestException(`Invalid panel member ID format: ${panelId}`);
                }
            }
        }
        const interview = new this.interviewModel({
            applicationId: dto.applicationId,
            stage: dto.stage,
            scheduledDate: scheduledDate,
            method: dto.method,
            panel: dto.panel || [],
            videoLink: dto.videoLink,
            status: 'scheduled',
        });
        const saved = await interview.save();
        try {
            await this.applicationModel.findByIdAndUpdate(dto.applicationId, {
                currentStage: dto.stage,
            });
            const app = await this.applicationModel
                .findById(dto.applicationId)
                .populate('candidateId');
            if (app?.requisitionId) {
                const progress = this.calculateProgress(dto.stage);
                await this.jobModel.findByIdAndUpdate(app.requisitionId, { progress });
            }
            const candidate = app?.candidateId;
            const interviewDate = scheduledDate.toLocaleString();
            const methodText = dto.method || 'TBD';
            const videoLinkText = dto.videoLink
                ? `\nVideo Link: ${dto.videoLink}`
                : '';
            if (candidate && candidate.personalEmail) {
                try {
                    await this.sendNotification('interview_scheduled', candidate.personalEmail, {
                        candidateName: candidate.firstName || 'Candidate',
                        interviewDate: interviewDate,
                        method: methodText,
                        videoLink: dto.videoLink,
                    }, { nonBlocking: true });
                }
                catch (e) {
                    console.warn('Failed to send candidate interview notification:', e);
                }
            }
            if (dto.panel && dto.panel.length > 0) {
                const jobRequisition = app?.requisitionId
                    ? await this.jobModel.findById(app.requisitionId).lean().exec()
                    : null;
                const positionTitle = jobRequisition?.title || 'Position';
                for (const panelMemberId of dto.panel) {
                    try {
                        const panelMember = await this.employeeProfileService.findOne(panelMemberId);
                        const panelMemberEmail = panelMember.workEmail || panelMember.personalEmail;
                        if (panelMemberEmail) {
                            await this.sendNotification('panel_invitation', panelMemberEmail, {
                                interviewDate: interviewDate,
                                method: methodText,
                                videoLink: dto.videoLink,
                                candidateName: candidate?.fullName || candidate?.firstName || 'Candidate',
                                position: positionTitle,
                            }, { nonBlocking: true });
                        }
                        else {
                            console.warn(`Panel member ${panelMemberId} has no email address. Notification skipped.`);
                        }
                    }
                    catch (error) {
                        console.warn(`Failed to send panel invitation to ${panelMemberId}:`, error);
                    }
                }
            }
        }
        catch (e) {
            console.warn('Failed to send interview notifications:', e);
        }
        return saved;
    }
    async updateInterviewStatus(id, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid interview ID format');
        }
        const interview = await this.interviewModel.findById(id);
        if (!interview) {
            throw new common_1.NotFoundException('Interview not found');
        }
        if (interview.status === 'completed' && dto.status !== 'completed') {
            throw new common_1.BadRequestException('Cannot change status of a completed interview');
        }
        if (interview.status === 'cancelled' && dto.status !== 'cancelled') {
            throw new common_1.BadRequestException('Cannot change status of a cancelled interview. Please schedule a new interview.');
        }
        const updated = await this.interviewModel.findByIdAndUpdate(id, { status: dto.status }, { new: true });
        if (!updated) {
            throw new common_1.NotFoundException('Interview not found');
        }
        return updated;
    }
    async createOffer(dto) {
        if (!mongoose_2.Types.ObjectId.isValid(dto.applicationId)) {
            throw new common_1.BadRequestException('Invalid application ID format');
        }
        if (!mongoose_2.Types.ObjectId.isValid(dto.candidateId)) {
            throw new common_1.BadRequestException('Invalid candidate ID format');
        }
        const application = await this.applicationModel.findById(dto.applicationId);
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        if (application.candidateId.toString() !== dto.candidateId) {
            throw new common_1.BadRequestException('Candidate ID does not match the application');
        }
        if (application.status === application_status_enum_1.ApplicationStatus.REJECTED) {
            throw new common_1.BadRequestException('Cannot create offer for a rejected application');
        }
        if (application.status === application_status_enum_1.ApplicationStatus.HIRED) {
            throw new common_1.BadRequestException('Cannot create offer for a hired candidate');
        }
        const existingOffer = await this.offerModel.findOne({
            applicationId: new mongoose_2.Types.ObjectId(dto.applicationId),
        });
        if (existingOffer) {
            throw new common_1.BadRequestException('An offer already exists for this application');
        }
        if (dto.grossSalary <= 0 || !Number.isFinite(dto.grossSalary)) {
            throw new common_1.BadRequestException('Gross salary must be a positive number');
        }
        if (dto.signingBonus !== undefined &&
            (dto.signingBonus < 0 || !Number.isFinite(dto.signingBonus))) {
            throw new common_1.BadRequestException('Signing bonus must be a non-negative number');
        }
        const deadline = new Date(dto.deadline);
        if (isNaN(deadline.getTime())) {
            throw new common_1.BadRequestException('Invalid deadline format. Expected ISO 8601 date string.');
        }
        if (deadline <= new Date()) {
            throw new common_1.BadRequestException('Deadline must be in the future');
        }
        const offer = new this.offerModel({
            applicationId: dto.applicationId,
            candidateId: dto.candidateId,
            grossSalary: dto.grossSalary,
            signingBonus: dto.signingBonus,
            benefits: dto.benefits,
            conditions: dto.conditions,
            insurances: dto.insurances,
            content: dto.content,
            role: dto.role,
            deadline: deadline,
            applicantResponse: 'pending',
            finalStatus: 'pending',
        });
        const savedOffer = await offer.save();
        try {
            const candidate = await this.candidateModel
                .findById(dto.candidateId)
                .lean();
            if (candidate && candidate.personalEmail) {
                const offerDeadlineFormatted = deadline.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
                await this.sendNotification('offer_letter', candidate.personalEmail, {
                    candidateName: candidate.firstName || 'Candidate',
                    role: dto.role,
                    grossSalary: dto.grossSalary,
                    signingBonus: dto.signingBonus,
                    benefits: dto.benefits,
                    deadline: offerDeadlineFormatted,
                    content: dto.content,
                }, { nonBlocking: true });
            }
        }
        catch (e) {
            console.warn('Failed to send offer letter notification:', e);
        }
        return savedOffer;
    }
    async respondToOffer(id, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid offer ID format');
        }
        const offer = await this.offerModel.findById(id);
        if (!offer) {
            throw new common_1.NotFoundException('Offer not found');
        }
        if (offer.finalStatus !== offer_final_status_enum_1.OfferFinalStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot respond to offer: Offer has already been finalized with status: ${offer.finalStatus}.`);
        }
        if (offer.deadline && new Date(offer.deadline) < new Date()) {
            throw new common_1.BadRequestException(`Cannot respond to offer: The response deadline (${offer.deadline.toLocaleDateString()}) has passed. Please contact HR.`);
        }
        if (offer.applicantResponse !== offer_response_status_enum_1.OfferResponseStatus.PENDING) {
            throw new common_1.BadRequestException(`Offer has already been ${offer.applicantResponse}. Cannot change response.`);
        }
        const updateData = { applicantResponse: dto.applicantResponse };
        if (dto.applicantResponse === offer_response_status_enum_1.OfferResponseStatus.ACCEPTED) {
            updateData.candidateSignedAt = new Date();
        }
        const updated = await this.offerModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('applicationId');
        if (!updated) {
            throw new common_1.NotFoundException('Offer not found');
        }
        if (dto.applicantResponse === offer_response_status_enum_1.OfferResponseStatus.ACCEPTED) {
            try {
                const application = updated.applicationId;
                if (application && application.candidateId) {
                    console.log(`Offer accepted. Onboarding should be triggered after employee profile creation for candidate: ${application.candidateId}`);
                }
            }
            catch (e) {
                console.warn('Could not trigger onboarding automatically:', e);
            }
        }
        return updated;
    }
    async finalizeOffer(id, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid offer ID format');
        }
        const offer = await this.offerModel.findById(id).populate('applicationId');
        if (!offer) {
            throw new common_1.NotFoundException('Offer not found');
        }
        if (offer.applicantResponse === offer_response_status_enum_1.OfferResponseStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot finalize offer: Candidate has not responded yet. Please wait for candidate response.');
        }
        if (offer.finalStatus !== offer_final_status_enum_1.OfferFinalStatus.PENDING &&
            offer.finalStatus !== dto.finalStatus) {
            throw new common_1.BadRequestException(`Offer has already been finalized with status: ${offer.finalStatus}. Cannot change final status.`);
        }
        const updated = await this.offerModel.findByIdAndUpdate(id, { finalStatus: dto.finalStatus }, { new: true });
        if (!updated) {
            throw new common_1.NotFoundException('Offer not found');
        }
        if (dto.finalStatus === offer_final_status_enum_1.OfferFinalStatus.APPROVED &&
            offer.applicantResponse === offer_response_status_enum_1.OfferResponseStatus.ACCEPTED) {
            try {
                const application = offer.applicationId;
                if (application && application._id) {
                    await this.applicationModel.findByIdAndUpdate(application._id, {
                        status: application_status_enum_1.ApplicationStatus.HIRED,
                        currentStage: application_stage_enum_1.ApplicationStage.OFFER,
                    });
                    if (application.requisitionId) {
                        const progress = this.calculateProgress('hired');
                        await this.jobModel.findByIdAndUpdate(application.requisitionId, {
                            progress,
                        });
                    }
                    console.log(`Offer finalized and approved. Ready for employee profile creation and onboarding trigger.`);
                }
            }
            catch (e) {
                console.warn('Could not update application status after offer finalization:', e);
            }
        }
        return updated;
    }
    async sendNotification(notificationType, recipientEmail, context, options) {
        if (!recipientEmail ||
            typeof recipientEmail !== 'string' ||
            recipientEmail.trim().length === 0) {
            if (options?.nonBlocking) {
                console.warn('Recipient email is missing. Notification skipped.');
                return;
            }
            throw new common_1.BadRequestException('Recipient email is required');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail.trim())) {
            if (options?.nonBlocking) {
                console.warn(`Invalid recipient email format: ${recipientEmail}. Notification skipped.`);
                return;
            }
            throw new common_1.BadRequestException('Invalid recipient email format');
        }
        let subject;
        let text;
        try {
            switch (notificationType) {
                case 'application_status':
                    subject =
                        context.status === application_status_enum_1.ApplicationStatus.REJECTED
                            ? 'Application Update'
                            : 'Application Status Update';
                    const candidateName = context.candidateName || 'Candidate';
                    text = `Dear ${candidateName},\n\n`;
                    if (context.status === application_status_enum_1.ApplicationStatus.REJECTED) {
                        text +=
                            'Thank you for your interest in our company. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\n';
                        text +=
                            'We appreciate the time you invested in the application process and wish you the best in your job search.\n\n';
                    }
                    else if (context.status === application_status_enum_1.ApplicationStatus.IN_PROCESS) {
                        text += `Your application status has been updated to: In Process.\n\n`;
                        text +=
                            'We are currently reviewing your application and will keep you updated on the next steps.\n\n';
                    }
                    else if (context.status === application_status_enum_1.ApplicationStatus.OFFER) {
                        text += `Congratulations! Your application has progressed to the offer stage.\n\n`;
                        text +=
                            'You will receive further communication regarding the offer details shortly.\n\n';
                    }
                    else if (context.status === application_status_enum_1.ApplicationStatus.HIRED) {
                        text += `Congratulations! We are pleased to offer you the position.\n\n`;
                        text +=
                            'You will receive further communication regarding onboarding and next steps.\n\n';
                    }
                    else {
                        text += `Your application status has been updated to: ${context.status}.\n\n`;
                    }
                    text += 'Best regards,\nHR Team';
                    break;
                case 'interview_scheduled':
                    subject = 'Interview Scheduled';
                    const interviewDate = context.interviewDate || 'TBD';
                    const method = context.method || 'TBD';
                    const videoLink = context.videoLink
                        ? `\nVideo Link: ${context.videoLink}`
                        : '';
                    text = `Dear ${context.candidateName || 'Candidate'},\n\n`;
                    text += `Your interview has been scheduled for ${interviewDate}.\n`;
                    text += `Interview Method: ${method}${videoLink}\n\n`;
                    text += `We look forward to meeting with you.\n\n`;
                    text += `Best regards,\nHR Team`;
                    break;
                case 'offer_letter':
                    const role = context.role || 'the position';
                    const grossSalary = context.grossSalary
                        ? `$${context.grossSalary.toLocaleString()}`
                        : 'TBD';
                    const signingBonus = context.signingBonus
                        ? `$${context.signingBonus.toLocaleString()}`
                        : null;
                    const benefits = context.benefits && context.benefits.length > 0
                        ? context.benefits.join(', ')
                        : null;
                    const deadline = context.deadline || 'TBD';
                    const offerContent = context.content || '';
                    subject = `Job Offer - ${role} - Action Required`;
                    text = `Dear ${context.candidateName || 'Candidate'},\n\n`;
                    text += `We are pleased to offer you the position of ${role}.\n\n`;
                    text += `OFFER DETAILS:\n`;
                    text += `- Position: ${role}\n`;
                    text += `- Gross Salary: ${grossSalary}\n`;
                    if (signingBonus)
                        text += `- Signing Bonus: ${signingBonus}\n`;
                    if (benefits)
                        text += `- Benefits: ${benefits}\n`;
                    text += `- Response Deadline: ${deadline}\n\n`;
                    if (offerContent)
                        text += `${offerContent}\n\n`;
                    text += `Please review the offer details carefully. You can accept or decline this offer through the system.\n\n`;
                    text += `If you have any questions, please contact HR.\n\n`;
                    text += `Best regards,\nHR Team`;
                    break;
                case 'onboarding_welcome':
                    subject = 'Welcome! Onboarding Checklist Created';
                    const taskCount = context.taskCount || 0;
                    text = `Dear ${context.employeeName || 'New Hire'},\n\n`;
                    text += `Your onboarding checklist has been created with ${taskCount} tasks to complete.\n\n`;
                    text += `Please log in to view your onboarding tracker and complete the required steps.\n\n`;
                    text += `Best regards,\nHR Team`;
                    break;
                case 'onboarding_reminder':
                    subject = 'Onboarding Reminder';
                    const overdueTasks = context.overdueTasks || [];
                    const upcomingTasks = context.upcomingTasks || [];
                    text = `Dear ${context.employeeName || 'New Hire'},\n\n`;
                    if (overdueTasks.length > 0) {
                        text += `You have ${overdueTasks.length} overdue task(s):\n`;
                        overdueTasks.forEach((task) => {
                            text += `- ${task.name} (${task.department})\n`;
                        });
                        text += '\n';
                    }
                    if (upcomingTasks.length > 0) {
                        text += `You have ${upcomingTasks.length} task(s) due soon:\n`;
                        upcomingTasks.forEach((task) => {
                            const daysLeft = task.daysLeft || 0;
                            text += `- ${task.name} (${task.department}) - Due in ${daysLeft} day(s)\n`;
                        });
                        text += '\n';
                    }
                    text += 'Please complete these tasks as soon as possible.\n\n';
                    text += 'Best regards,\nHR Team';
                    break;
                case 'panel_invitation':
                    subject = 'Interview Panel Invitation';
                    const panelInterviewDate = context.interviewDate || 'TBD';
                    const panelMethod = context.method || 'TBD';
                    const panelVideoLink = context.videoLink
                        ? `\nVideo Link: ${context.videoLink}`
                        : '';
                    const panelCandidateName = context.candidateName || 'Candidate';
                    const panelPosition = context.position || 'Position';
                    text = `You have been invited to participate in an interview panel.\n\n`;
                    text += `Position: ${panelPosition}\n`;
                    text += `Candidate: ${panelCandidateName}\n`;
                    text += `Interview Date: ${panelInterviewDate}\n`;
                    text += `Interview Method: ${panelMethod}${panelVideoLink}\n\n`;
                    text += `Please confirm your availability.\n\n`;
                    text += `Best regards,\nHR Team`;
                    break;
                case 'clearance_reminder':
                    subject = `Clearance Reminder - ${context.department || 'Department'} Approval Required`;
                    const name = context.employeeName || 'Employee';
                    const dept = context.department || 'Department';
                    const itemName = context.itemName || dept;
                    const due = context.dueDate
                        ? `
Due: ${context.dueDate}`
                        : '';
                    text = `Dear ${context.recipientName || 'Approver'},\n\n`;
                    text += `${name} requires your attention to complete the clearance step for ${itemName} (Department: ${dept}).${due}\n\n`;
                    if (context.note)
                        text += `Note: ${context.note}\n\n`;
                    text += `Please review and take action via the HR system (clearance checklist ID: ${context.checklistId}).\n\n`;
                    text += `Best regards,\nHR Team`;
                    break;
                case 'access_revoked':
                    subject = `Access Revoked - ${context.employeeName || context.employeeNumber || 'Employee'}`;
                    text = `Dear ${context.employeeName || 'Employee'},\n\n`;
                    text += `Your system access has been revoked for security/compliance reasons.${context.reason ? '\n\nReason: ' + context.reason : ''}\n\n`;
                    text += `If you believe this was done in error please contact HR or IT immediately.\n\n`;
                    text += `Best regards,\nSecurity Team`;
                    break;
                default:
                    throw new common_1.BadRequestException(`Unknown notification type: ${notificationType}`);
            }
            await this.sendEmailInternal(recipientEmail, subject, text);
        }
        catch (error) {
            if (options?.nonBlocking) {
                console.warn(`Failed to send ${notificationType} notification to ${recipientEmail}:`, error);
                return;
            }
            throw error;
        }
    }
    async sendEmailInternal(recipient, subject, text) {
        if (!subject ||
            typeof subject !== 'string' ||
            subject.trim().length === 0) {
            throw new common_1.BadRequestException('Email subject is required');
        }
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new common_1.BadRequestException('Email text content is required');
        }
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email credentials not configured. Email will not be sent.');
            return;
        }
        try {
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
            await transporter.sendMail({
                from: '"HR System" <your-email@gmail.com>',
                to: recipient.trim(),
                subject: subject.trim(),
                text: text.trim(),
            });
        }
        catch (error) {
            console.error('Failed to send email:', error);
            throw error;
        }
    }
    async sendEmail(recipient, subject, text) {
        return this.sendEmailInternal(recipient, subject, text);
    }
    async createOnboarding(createOnboardingDto, contractSigningDate, startDate, workEmail) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(createOnboardingDto.employeeId.toString())) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            const existingOnboarding = await this.onboardingModel
                .findOne({ employeeId: createOnboardingDto.employeeId })
                .lean();
            if (existingOnboarding) {
                throw new common_1.BadRequestException('Onboarding checklist already exists for this employee');
            }
            const defaultDeadline = startDate
                ? new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            let tasks = createOnboardingDto.tasks || [];
            if (tasks.length === 0) {
                const emailNote = workEmail
                    ? `Automated task: Email account provisioning\nEmail to create: ${workEmail}`
                    : 'Automated task: Email account provisioning';
                tasks.push({
                    name: 'Allocate Email Account',
                    department: 'IT',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: emailNote,
                });
                tasks.push({
                    name: 'Allocate Laptop/Equipment',
                    department: 'IT',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Automated task: Hardware allocation',
                });
                tasks.push({
                    name: 'Set up System Access (SSO)',
                    department: 'IT',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Automated task: SSO and internal systems access',
                });
                tasks.push({
                    name: 'Reserve Workspace/Desk',
                    department: 'Admin',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Automated task: Workspace allocation',
                });
                tasks.push({
                    name: 'Issue ID Badge/Access Card',
                    department: 'Admin',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Automated task: Access card provisioning',
                });
                tasks.push({
                    name: 'Create Payroll Profile',
                    department: 'HR',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: contractSigningDate || defaultDeadline,
                    notes: 'Automated task: Payroll initiation (REQ-PY-23)',
                });
                tasks.push({
                    name: 'Process Signing Bonus',
                    department: 'HR',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: contractSigningDate || defaultDeadline,
                    notes: 'Automated task: Signing bonus processing (REQ-PY-27)',
                });
                tasks.push({
                    name: 'Set up Benefits',
                    department: 'HR',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Automated task: Benefits enrollment',
                });
                tasks.push({
                    name: 'Upload Signed Contract',
                    department: 'HR',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Required: Signed contract document',
                });
                tasks.push({
                    name: 'Upload ID Document',
                    department: 'HR',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Required: Government-issued ID for compliance',
                });
                tasks.push({
                    name: 'Upload Certifications',
                    department: 'HR',
                    status: onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
                    deadline: defaultDeadline,
                    notes: 'Required: Professional certifications if applicable',
                });
            }
            const onboarding = new this.onboardingModel({
                employeeId: createOnboardingDto.employeeId,
                tasks: tasks,
                completed: false,
            });
            const saved = await onboarding.save();
            try {
                const employee = await this.employeeProfileService.findOne(createOnboardingDto.employeeId.toString());
                if (employee && employee.personalEmail) {
                    await this.sendNotification('onboarding_welcome', employee.personalEmail, {
                        employeeName: employee.firstName || 'New Hire',
                        taskCount: tasks.length,
                    }, { nonBlocking: true });
                }
            }
            catch (e) {
                console.warn('Failed to send onboarding welcome notification:', e);
            }
            return saved.toObject();
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to create onboarding: ' + this.getErrorMessage(error));
        }
    }
    async getAllOnboardings() {
        try {
            return await this.onboardingModel.find().select('-__v').lean().exec();
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch onboarding records: ' + this.getErrorMessage(error));
        }
    }
    async getOnboardingByEmployeeId(employeeId) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            const onboarding = await this.onboardingModel
                .findOne({
                $or: [
                    { employeeId: employeeId },
                    { employeeId: new mongoose_2.Types.ObjectId(employeeId) },
                ],
            })
                .select('-__v')
                .lean()
                .exec();
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding checklist not found for this employee');
            }
            const totalTasks = onboarding.tasks?.length || 0;
            const completedTasks = onboarding.tasks?.filter((task) => task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED).length || 0;
            const inProgressTasks = onboarding.tasks?.filter((task) => task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.IN_PROGRESS).length || 0;
            const pendingTasks = onboarding.tasks?.filter((task) => task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING).length || 0;
            const overdueTasks = onboarding.tasks?.filter((task) => {
                if (!task.deadline)
                    return false;
                return (new Date(task.deadline) < new Date() &&
                    task.status !== onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED);
            }).length || 0;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const nextTask = onboarding.tasks?.find((task) => task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING);
            return {
                ...onboarding,
                progress: {
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    pendingTasks,
                    overdueTasks,
                    progressPercentage,
                    nextTask: nextTask || null,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to fetch onboarding: ' + this.getErrorMessage(error));
        }
    }
    async getOnboardingById(id) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(id)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            const onboarding = await this.onboardingModel
                .findById(id)
                .select('-__v')
                .lean()
                .exec();
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            return onboarding;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to fetch onboarding: ' + this.getErrorMessage(error));
        }
    }
    async updateOnboarding(id, updateOnboardingDto) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(id)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            const onboarding = await this.onboardingModel
                .findByIdAndUpdate(id, { $set: updateOnboardingDto }, { new: true })
                .select('-__v')
                .lean()
                .exec();
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            return onboarding;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to update onboarding: ' + this.getErrorMessage(error));
        }
    }
    async updateOnboardingTask(onboardingId, taskIndex, updateTaskDto) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(onboardingId)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            if (!Number.isInteger(taskIndex) || taskIndex < 0) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const onboarding = await this.onboardingModel.findById(onboardingId);
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (taskIndex >= onboarding.tasks.length) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            if (updateTaskDto.status &&
                !Object.values(onboarding_task_status_enum_1.OnboardingTaskStatus).includes(updateTaskDto.status)) {
                throw new common_1.BadRequestException(`Invalid task status: ${updateTaskDto.status}`);
            }
            Object.assign(onboarding.tasks[taskIndex], updateTaskDto);
            if (updateTaskDto.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED) {
                onboarding.tasks[taskIndex].completedAt = new Date();
            }
            else if (updateTaskDto.status &&
                onboarding.tasks[taskIndex].completedAt) {
                onboarding.tasks[taskIndex].completedAt = undefined;
            }
            const allCompleted = onboarding.tasks.length > 0 &&
                onboarding.tasks.every((task) => task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED);
            if (allCompleted) {
                onboarding.completed = true;
                onboarding.completedAt = new Date();
            }
            else if (onboarding.completed) {
                onboarding.completed = false;
                onboarding.completedAt = undefined;
            }
            const saved = await onboarding.save();
            return saved.toObject();
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to update task: ' + this.getErrorMessage(error));
        }
    }
    async addTaskToOnboarding(onboardingId, taskDto) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(onboardingId)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            const onboarding = await this.onboardingModel.findById(onboardingId);
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (!taskDto.name ||
                typeof taskDto.name !== 'string' ||
                taskDto.name.trim().length === 0) {
                throw new common_1.BadRequestException('Task name is required and must be a non-empty string');
            }
            if (!taskDto.department ||
                typeof taskDto.department !== 'string' ||
                taskDto.department.trim().length === 0) {
                throw new common_1.BadRequestException('Task department is required and must be a non-empty string');
            }
            if (onboarding.completed) {
                throw new common_1.BadRequestException('Cannot add tasks to a completed onboarding checklist');
            }
            onboarding.tasks.push({
                ...taskDto,
                status: taskDto.status || onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING,
            });
            const saved = await onboarding.save();
            return saved.toObject();
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to add task: ' + this.getErrorMessage(error));
        }
    }
    async removeTaskFromOnboarding(onboardingId, taskIndex) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(onboardingId)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            if (!Number.isInteger(taskIndex) || taskIndex < 0) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const onboarding = await this.onboardingModel.findById(onboardingId);
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (taskIndex >= onboarding.tasks.length) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const task = onboarding.tasks[taskIndex];
            if (task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED) {
                console.warn(`Removing completed task: ${task.name}`);
            }
            onboarding.tasks.splice(taskIndex, 1);
            const saved = await onboarding.save();
            return saved.toObject();
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to remove task: ' + this.getErrorMessage(error));
        }
    }
    async deleteOnboarding(id) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(id)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            const result = await this.onboardingModel.findByIdAndDelete(id);
            if (!result) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to delete onboarding: ' + this.getErrorMessage(error));
        }
    }
    async getOnboardingStats() {
        try {
            const total = await this.onboardingModel.countDocuments();
            const completed = await this.onboardingModel.countDocuments({
                completed: true,
            });
            const inProgress = total - completed;
            return {
                total,
                completed,
                inProgress,
                completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%',
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch stats: ' + this.getErrorMessage(error));
        }
    }
    async uploadTaskDocument(onboardingId, taskIndex, file, documentType) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(onboardingId)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            if (!Number.isInteger(taskIndex) || taskIndex < 0) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            if (!file) {
                throw new common_1.BadRequestException('No file uploaded');
            }
            const onboarding = await this.onboardingModel.findById(onboardingId);
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (taskIndex >= onboarding.tasks.length) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const allowedTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
            if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
                throw new common_1.BadRequestException('Invalid file type. Allowed: jpg, jpeg, png, pdf, doc, docx');
            }
            const maxSize = 5 * 1024 * 1024;
            if (!file.size || file.size > maxSize) {
                throw new common_1.BadRequestException('File size exceeds 5MB limit');
            }
            if (!file.path) {
                throw new common_1.BadRequestException('File path is missing');
            }
            const filePath = file.path;
            const document = new this.documentModel({
                ownerId: onboarding.employeeId,
                type: documentType,
                filePath: filePath,
                uploadedAt: new Date(),
            });
            const savedDocument = await document.save();
            onboarding.tasks[taskIndex].documentId = savedDocument._id;
            if (onboarding.tasks[taskIndex].status === onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING) {
                onboarding.tasks[taskIndex].status = onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED;
                onboarding.tasks[taskIndex].completedAt = new Date();
            }
            const allCompleted = onboarding.tasks.every((task) => task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED);
            if (allCompleted) {
                onboarding.completed = true;
                onboarding.completedAt = new Date();
            }
            const savedOnboarding = await onboarding.save();
            return {
                message: 'Document uploaded successfully',
                document: savedDocument.toObject(),
                onboarding: savedOnboarding.toObject(),
            };
        }
        catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    }
    async downloadDocument(documentId, res) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(documentId)) {
                throw new common_1.BadRequestException('Invalid document ID format');
            }
            const document = await this.documentModel.findById(documentId).lean();
            if (!document) {
                throw new common_1.NotFoundException('Document not found');
            }
            if (!document.filePath) {
                throw new common_1.NotFoundException('File path not found in document record');
            }
            const fileExists = await fs.pathExists(document.filePath);
            if (!fileExists) {
                throw new common_1.NotFoundException('File not found on server');
            }
            res.download(document.filePath);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to download document: ' + this.getErrorMessage(error));
        }
    }
    async getTaskDocument(onboardingId, taskIndex) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(onboardingId)) {
                throw new common_1.BadRequestException('Invalid onboarding ID format');
            }
            if (!Number.isInteger(taskIndex) || taskIndex < 0) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const onboarding = await this.onboardingModel
                .findById(onboardingId)
                .lean();
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (taskIndex >= onboarding.tasks.length) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const task = onboarding.tasks[taskIndex];
            if (!task.documentId) {
                throw new common_1.NotFoundException('No document attached to this task');
            }
            const document = await this.documentModel
                .findById(task.documentId)
                .lean();
            if (!document) {
                throw new common_1.NotFoundException('Document not found');
            }
            return document;
        }
        catch (error) {
            console.error('Error getting task document:', error);
            throw error;
        }
    }
    async deleteDocument(documentId) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(documentId)) {
                throw new common_1.BadRequestException('Invalid document ID format');
            }
            const document = await this.documentModel.findById(documentId);
            if (!document) {
                throw new common_1.NotFoundException('Document not found');
            }
            if (document.filePath) {
                try {
                    const fileExists = await fs.pathExists(document.filePath);
                    if (fileExists) {
                        await fs.remove(document.filePath);
                    }
                }
                catch (fileError) {
                    console.warn('Failed to delete file from disk:', fileError);
                }
            }
            await this.documentModel.findByIdAndDelete(documentId);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to delete document: ' + this.getErrorMessage(error));
        }
    }
    async createEmployeeFromContract(offerId, dto) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(offerId)) {
                throw new common_1.BadRequestException('Invalid offer ID');
            }
            const offer = (await this.offerModel.findById(offerId).lean());
            if (!offer) {
                throw new common_1.NotFoundException('Offer not found');
            }
            if (offer.applicantResponse !== offer_response_status_enum_1.OfferResponseStatus.ACCEPTED) {
                throw new common_1.BadRequestException('Offer must be accepted by candidate before creating employee profile');
            }
            if (offer.finalStatus !== offer_final_status_enum_1.OfferFinalStatus.APPROVED) {
                throw new common_1.BadRequestException('Offer must be approved before creating employee profile');
            }
            let contract = null;
            if (dto.contractId) {
                if (!mongoose_2.Types.ObjectId.isValid(dto.contractId)) {
                    throw new common_1.BadRequestException('Invalid contract ID format');
                }
                contract = await this.contractModel.findById(dto.contractId).lean();
                if (!contract) {
                    throw new common_1.NotFoundException('Contract not found');
                }
                const contractOfferId = contract.offerId
                    ? contract.offerId.toString()
                    : null;
                if (contractOfferId && contractOfferId !== offerId) {
                    throw new common_1.BadRequestException('Contract does not match the specified offer');
                }
            }
            else {
                contract = await this.contractModel
                    .findOne({ offerId: new mongoose_2.Types.ObjectId(offerId) })
                    .lean();
            }
            if (!contract) {
                throw new common_1.NotFoundException('No contract found for this offer. Please create and upload signed contract first.');
            }
            if (!contract.documentId) {
                throw new common_1.BadRequestException('Contract must have a signed document attached before creating employee profile');
            }
            const contractDocument = await this.documentModel
                .findById(contract.documentId)
                .lean();
            if (!contractDocument) {
                throw new common_1.NotFoundException('Signed contract document not found');
            }
            const candidate = await this.candidateModel
                .findById(offer.candidateId)
                .lean();
            if (!candidate) {
                throw new common_1.NotFoundException('Candidate not found');
            }
            let workEmail = dto.workEmail;
            if (!workEmail) {
                const firstName = candidate.firstName
                    ?.toLowerCase()
                    .replace(/\s+/g, '')
                    .replace(/[^a-z0-9]/g, '') || 'user';
                const lastName = candidate.lastName
                    ?.toLowerCase()
                    .replace(/\s+/g, '')
                    .replace(/[^a-z0-9]/g, '') || '';
                const baseEmail = lastName
                    ? `${firstName}.${lastName}@company.com`
                    : `${firstName}@company.com`;
                workEmail = baseEmail;
            }
            const createEmployeeDto = {
                firstName: candidate.firstName,
                middleName: candidate.middleName,
                lastName: candidate.lastName,
                nationalId: candidate.nationalId,
                gender: candidate.gender,
                maritalStatus: candidate.maritalStatus,
                dateOfBirth: candidate.dateOfBirth,
                personalEmail: candidate.personalEmail,
                mobilePhone: candidate.mobilePhone,
                homePhone: candidate.homePhone,
                address: candidate.address,
                profilePictureUrl: candidate.profilePictureUrl,
                workEmail: workEmail,
                dateOfHire: contract.acceptanceDate || new Date(),
                contractStartDate: contract.acceptanceDate,
                contractEndDate: undefined,
                contractType: dto.contractType,
                workType: dto.workType,
                status: employee_profile_enums_1.EmployeeStatus.PROBATION,
                primaryDepartmentId: dto.primaryDepartmentId,
                supervisorPositionId: dto.supervisorPositionId,
                payGradeId: dto.payGradeId,
                primaryPositionId: undefined,
            };
            if (dto.primaryDepartmentId) {
                try {
                    const department = await this.organizationStructureService.getDepartmentById(dto.primaryDepartmentId);
                    if (!department.isActive) {
                        throw new common_1.BadRequestException(`Department with ID ${dto.primaryDepartmentId} is not active. Cannot assign employee to inactive department.`);
                    }
                }
                catch (error) {
                    if (error instanceof common_1.NotFoundException) {
                        throw new common_1.BadRequestException(`Department with ID ${dto.primaryDepartmentId} not found. Please provide a valid department ID.`);
                    }
                    if (error instanceof common_1.BadRequestException) {
                        throw error;
                    }
                    throw new common_1.BadRequestException(`Failed to validate department: ${this.getErrorMessage(error)}`);
                }
            }
            if (dto.supervisorPositionId) {
                try {
                    const position = await this.organizationStructureService.getPositionById(dto.supervisorPositionId);
                    if (!position.isActive) {
                        throw new common_1.BadRequestException(`Position with ID ${dto.supervisorPositionId} is not active. Cannot assign supervisor with inactive position.`);
                    }
                    if (dto.primaryDepartmentId && position.departmentId) {
                        const positionDeptId = position.departmentId.toString();
                        const employeeDeptId = dto.primaryDepartmentId.toString();
                        if (positionDeptId !== employeeDeptId) {
                            throw new common_1.BadRequestException(`Supervisor position (${dto.supervisorPositionId}) belongs to a different department than the employee's assigned department (${dto.primaryDepartmentId}).`);
                        }
                    }
                }
                catch (error) {
                    if (error instanceof common_1.NotFoundException) {
                        throw new common_1.BadRequestException(`Position with ID ${dto.supervisorPositionId} not found. Please provide a valid position ID.`);
                    }
                    if (error instanceof common_1.BadRequestException) {
                        throw error;
                    }
                    throw new common_1.BadRequestException(`Failed to validate position: ${this.getErrorMessage(error)}`);
                }
            }
            const employee = await this.employeeProfileService.create(createEmployeeDto);
            const employeeId = employee._id?.toString() || employee.id?.toString();
            if (!employeeId || !mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Failed to retrieve valid employee ID after creation');
            }
            let onboardingCreated = null;
            try {
                const contractSigningDate = contract.acceptanceDate || new Date();
                const startDate = createEmployeeDto.dateOfHire || contractSigningDate;
                onboardingCreated = await this.createOnboarding({
                    employeeId: new mongoose_2.Types.ObjectId(employeeId),
                    tasks: [],
                }, contractSigningDate, startDate, workEmail);
                if (contract.grossSalary && contract.grossSalary > 0) {
                    try {
                        await this.triggerPayrollInitiation(employeeId, contractSigningDate, contract.grossSalary);
                    }
                    catch (e) {
                        console.warn('Failed to trigger payroll initiation:', e);
                    }
                }
                if (contract.signingBonus && contract.signingBonus > 0) {
                    try {
                        await this.processSigningBonus(employeeId, contract.signingBonus, contractSigningDate);
                    }
                    catch (e) {
                        console.warn('Failed to process signing bonus:', e);
                    }
                }
                try {
                    await this.scheduleAccessProvisioning(employeeId, startDate);
                }
                catch (e) {
                    console.warn('Failed to schedule access provisioning:', e);
                }
            }
            catch (e) {
                console.warn('Failed to create onboarding automatically:', e);
            }
            return {
                message: 'Employee profile created successfully from contract',
                employee: employee,
                onboarding: onboardingCreated,
                contractDetails: {
                    contractId: contract._id,
                    offerId: offer._id,
                    role: contract.role,
                    grossSalary: contract.grossSalary,
                    signingBonus: contract.signingBonus,
                    benefits: contract.benefits,
                    documentId: contract.documentId,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to create employee from contract: ' +
                this.getErrorMessage(error));
        }
    }
    async tagCandidateAsReferral(candidateId, referringEmployeeId, role, level) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(candidateId)) {
                throw new common_1.BadRequestException('Invalid candidate ID format');
            }
            if (!mongoose_2.Types.ObjectId.isValid(referringEmployeeId)) {
                throw new common_1.BadRequestException('Invalid referring employee ID format');
            }
            const candidate = await this.candidateModel.findById(candidateId);
            if (!candidate) {
                throw new common_1.NotFoundException('Candidate not found');
            }
            const existingReferral = await this.referralModel.findOne({
                candidateId: new mongoose_2.Types.ObjectId(candidateId),
                referringEmployeeId: new mongoose_2.Types.ObjectId(referringEmployeeId),
            });
            if (existingReferral) {
                throw new common_1.BadRequestException('Candidate is already tagged as a referral by this employee');
            }
            const referral = new this.referralModel({
                candidateId: new mongoose_2.Types.ObjectId(candidateId),
                referringEmployeeId: new mongoose_2.Types.ObjectId(referringEmployeeId),
                role: role || '',
                level: level || '',
            });
            const saved = await referral.save();
            return saved.toObject();
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to tag candidate as referral: ' + this.getErrorMessage(error));
        }
    }
    async getCandidateReferrals(candidateId) {
        if (!mongoose_2.Types.ObjectId.isValid(candidateId)) {
            throw new common_1.BadRequestException('Invalid candidate ID format');
        }
        return this.referralModel
            .find({ candidateId: new mongoose_2.Types.ObjectId(candidateId) })
            .populate('referringEmployeeId')
            .lean()
            .exec();
    }
    async recordCandidateConsent(candidateId, consentGiven, consentType = 'data_processing', notes) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(candidateId)) {
                throw new common_1.BadRequestException('Invalid candidate ID format');
            }
            const candidate = await this.candidateModel.findById(candidateId);
            if (!candidate) {
                throw new common_1.NotFoundException('Candidate not found');
            }
            const consentNote = `[CONSENT ${new Date().toISOString()}] ${consentType}: ${consentGiven ? 'GRANTED' : 'DENIED'}${notes ? ` - ${notes}` : ''}`;
            const updatedNotes = candidate.notes
                ? `${candidate.notes}\n${consentNote}`
                : consentNote;
            const updated = await this.candidateModel.findByIdAndUpdate(candidateId, { notes: updatedNotes }, { new: true });
            return {
                candidateId: updated?._id,
                consentGiven,
                consentType,
                recordedAt: new Date(),
                message: 'Consent recorded successfully',
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to record candidate consent: ' + this.getErrorMessage(error));
        }
    }
    async submitInterviewFeedback(interviewId, interviewerId, score, comments) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(interviewId)) {
                throw new common_1.BadRequestException('Invalid interview ID format');
            }
            if (!mongoose_2.Types.ObjectId.isValid(interviewerId)) {
                throw new common_1.BadRequestException('Invalid interviewer ID format');
            }
            if (score < 0 || score > 100) {
                throw new common_1.BadRequestException('Score must be between 0 and 100');
            }
            const interview = await this.interviewModel.findById(interviewId);
            if (!interview) {
                throw new common_1.NotFoundException('Interview not found');
            }
            if (interview.status === 'cancelled') {
                throw new common_1.BadRequestException('Cannot submit feedback for a cancelled interview');
            }
            if (!interview.scheduledDate) {
                throw new common_1.BadRequestException('Interview has not been scheduled yet');
            }
            if (interview.scheduledDate &&
                new Date(interview.scheduledDate) >
                    new Date(Date.now() + 24 * 60 * 60 * 1000)) {
                console.warn(`Feedback submitted for interview scheduled more than 1 day in the future: ${interview.scheduledDate}`);
            }
            const panelIds = interview.panel?.map((id) => id.toString()) || [];
            if (panelIds.length === 0) {
                throw new common_1.BadRequestException('Interview panel is empty. Cannot submit feedback without panel members.');
            }
            if (!panelIds.includes(interviewerId)) {
                throw new common_1.BadRequestException('Interviewer is not part of the interview panel');
            }
            const existingFeedback = await this.assessmentResultModel.findOne({
                interviewId: new mongoose_2.Types.ObjectId(interviewId),
                interviewerId: new mongoose_2.Types.ObjectId(interviewerId),
            });
            let assessmentResult;
            if (existingFeedback) {
                assessmentResult = await this.assessmentResultModel.findByIdAndUpdate(existingFeedback._id, { score, comments }, { new: true });
            }
            else {
                assessmentResult = new this.assessmentResultModel({
                    interviewId: new mongoose_2.Types.ObjectId(interviewId),
                    interviewerId: new mongoose_2.Types.ObjectId(interviewerId),
                    score,
                    comments: comments || '',
                });
                assessmentResult = await assessmentResult.save();
                await this.interviewModel.findByIdAndUpdate(interviewId, {
                    feedbackId: assessmentResult._id,
                });
            }
            return assessmentResult.toObject();
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to submit interview feedback: ' + this.getErrorMessage(error));
        }
    }
    async getInterviewFeedback(interviewId) {
        if (!mongoose_2.Types.ObjectId.isValid(interviewId)) {
            throw new common_1.BadRequestException('Invalid interview ID format');
        }
        return this.assessmentResultModel
            .find({ interviewId: new mongoose_2.Types.ObjectId(interviewId) })
            .populate('interviewerId')
            .lean()
            .exec();
    }
    async getInterviewAverageScore(interviewId) {
        if (!mongoose_2.Types.ObjectId.isValid(interviewId)) {
            throw new common_1.BadRequestException('Invalid interview ID format');
        }
        const feedbacks = await this.assessmentResultModel
            .find({
            interviewId: new mongoose_2.Types.ObjectId(interviewId),
        })
            .lean();
        if (feedbacks.length === 0) {
            return 0;
        }
        const totalScore = feedbacks.reduce((sum, feedback) => sum + (feedback.score || 0), 0);
        return totalScore / feedbacks.length;
    }
    async getRankedApplications(requisitionId) {
        if (!mongoose_2.Types.ObjectId.isValid(requisitionId)) {
            throw new common_1.BadRequestException('Invalid requisition ID format');
        }
        const requisition = await this.jobModel.findById(requisitionId);
        if (!requisition) {
            throw new common_1.NotFoundException('Job requisition not found');
        }
        const applications = await this.applicationModel
            .find({ requisitionId: new mongoose_2.Types.ObjectId(requisitionId) })
            .populate('candidateId')
            .lean();
        if (!applications || applications.length === 0) {
            return [];
        }
        const referrals = await this.referralModel.find().lean();
        const referralCandidateIds = new Set(referrals.map((ref) => ref.candidateId.toString()));
        const interviews = await this.interviewModel
            .find({
            applicationId: { $in: applications.map((app) => app._id) },
        })
            .lean();
        const interviewScores = {};
        for (const interview of interviews) {
            const interviewId = interview._id.toString();
            const avgScore = await this.getInterviewAverageScore(interviewId);
            const applicationId = interview.applicationId.toString();
            if (!interviewScores[applicationId] ||
                avgScore > interviewScores[applicationId]) {
                interviewScores[applicationId] = avgScore;
            }
        }
        const ranked = applications.map((app) => {
            const candidateId = app.candidateId?._id?.toString() || app.candidateId?.toString();
            const isReferral = candidateId && referralCandidateIds.has(candidateId);
            const appId = app._id.toString();
            const score = interviewScores[appId] || 0;
            return {
                ...app,
                isReferral,
                averageScore: score,
                rankingScore: isReferral ? score + 10 : score,
            };
        });
        ranked.sort((a, b) => {
            if (b.rankingScore !== a.rankingScore) {
                return b.rankingScore - a.rankingScore;
            }
            return (new Date(a.createdAt || 0).getTime() -
                new Date(b.createdAt || 0).getTime());
        });
        return ranked;
    }
    async sendOnboardingReminders() {
        try {
            const allOnboardings = await this.onboardingModel
                .find({ completed: false })
                .populate('employeeId')
                .lean();
            for (const onboarding of allOnboardings) {
                const employee = onboarding.employeeId;
                if (!employee || !employee.personalEmail)
                    continue;
                const overdueTasks = onboarding.tasks?.filter((task) => {
                    if (!task.deadline ||
                        task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED)
                        return false;
                    const deadline = new Date(task.deadline);
                    const now = new Date();
                    return deadline < now;
                }) || [];
                const upcomingTasks = onboarding.tasks?.filter((task) => {
                    if (!task.deadline ||
                        task.status === onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED)
                        return false;
                    const deadline = new Date(task.deadline);
                    const now = new Date();
                    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntilDeadline <= 2 && daysUntilDeadline > 0;
                }) || [];
                if (overdueTasks.length > 0 || upcomingTasks.length > 0) {
                    const formattedOverdueTasks = overdueTasks.map((task) => ({
                        name: task.name,
                        department: task.department,
                    }));
                    const formattedUpcomingTasks = upcomingTasks.map((task) => {
                        const deadline = new Date(task.deadline);
                        const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24));
                        return {
                            name: task.name,
                            department: task.department,
                            daysLeft: daysLeft,
                        };
                    });
                    try {
                        await this.sendNotification('onboarding_reminder', employee.personalEmail, {
                            employeeName: employee.firstName || 'New Hire',
                            overdueTasks: formattedOverdueTasks,
                            upcomingTasks: formattedUpcomingTasks,
                        }, { nonBlocking: true });
                    }
                    catch (e) {
                        console.warn(`Failed to send reminder to ${employee.personalEmail}:`, e);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error sending onboarding reminders:', error);
        }
    }
    async provisionSystemAccess(employeeId, taskIndex) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            const onboarding = await this.onboardingModel.findOne({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
            });
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (taskIndex < 0 || taskIndex >= onboarding.tasks.length) {
                throw new common_1.BadRequestException('Invalid task index');
            }
            const task = onboarding.tasks[taskIndex];
            if (task.department !== 'IT') {
                throw new common_1.BadRequestException('This method is only for IT tasks');
            }
            task.status = onboarding_task_status_enum_1.OnboardingTaskStatus.IN_PROGRESS;
            await onboarding.save();
            console.log(`Provisioning system access for employee ${employeeId}: ${task.name}`);
            task.status = onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED;
            task.completedAt = new Date();
            task.notes =
                (task.notes || '') +
                    `\n[${new Date().toISOString()}] System access provisioned automatically.`;
            await onboarding.save();
            return {
                message: 'System access provisioned successfully',
                task: task,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to provision system access: ' + this.getErrorMessage(error));
        }
    }
    async reserveEquipment(employeeId, equipmentType, equipmentDetails) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            if (!equipmentType ||
                typeof equipmentType !== 'string' ||
                equipmentType.trim().length === 0) {
                throw new common_1.BadRequestException('Equipment type is required and must be a non-empty string');
            }
            if (!equipmentDetails || typeof equipmentDetails !== 'object') {
                throw new common_1.BadRequestException('Equipment details are required and must be an object');
            }
            const onboarding = await this.onboardingModel.findOne({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
            });
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (onboarding.completed) {
                throw new common_1.BadRequestException('Cannot reserve equipment for a completed onboarding checklist');
            }
            const adminTasks = onboarding.tasks.filter((task) => task.department === 'Admin');
            if (adminTasks.length === 0) {
                throw new common_1.BadRequestException('No Admin tasks found in onboarding checklist');
            }
            let targetTask = null;
            if (equipmentType === 'workspace' || equipmentType === 'desk') {
                targetTask = adminTasks.find((task) => task.name.includes('Workspace') || task.name.includes('Desk'));
            }
            else if (equipmentType === 'access_card' || equipmentType === 'badge') {
                targetTask = adminTasks.find((task) => task.name.includes('ID Badge') || task.name.includes('Access Card'));
            }
            else {
                throw new common_1.BadRequestException(`Invalid equipment type: ${equipmentType}. Valid types: workspace, desk, access_card, badge`);
            }
            if (!targetTask) {
                throw new common_1.BadRequestException(`No matching Admin task found for equipment type: ${equipmentType}`);
            }
            const taskIndex = onboarding.tasks.indexOf(targetTask);
            targetTask.status = onboarding_task_status_enum_1.OnboardingTaskStatus.IN_PROGRESS;
            targetTask.notes =
                (targetTask.notes || '') +
                    `\n[${new Date().toISOString()}] Reserved: ${JSON.stringify(equipmentDetails)}`;
            await onboarding.save();
            return {
                message: `${equipmentType} reserved successfully`,
                taskIndex,
                equipmentDetails,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to reserve equipment: ' + this.getErrorMessage(error));
        }
    }
    async scheduleAccessProvisioning(employeeId, startDate, endDate) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            if (!startDate || isNaN(new Date(startDate).getTime())) {
                throw new common_1.BadRequestException('Invalid start date format. Expected ISO 8601 date string or Date object.');
            }
            const startDateObj = new Date(startDate);
            if (startDateObj < new Date()) {
                throw new common_1.BadRequestException('Start date cannot be in the past');
            }
            if (endDate !== undefined && endDate !== null) {
                if (isNaN(new Date(endDate).getTime())) {
                    throw new common_1.BadRequestException('Invalid end date format. Expected ISO 8601 date string or Date object.');
                }
                const endDateObj = new Date(endDate);
                if (endDateObj <= startDateObj) {
                    throw new common_1.BadRequestException('End date must be after start date');
                }
            }
            const onboarding = await this.onboardingModel.findOne({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
            });
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            const itTasks = onboarding.tasks.filter((task) => task.department === 'IT');
            if (itTasks.length === 0) {
                throw new common_1.BadRequestException('No IT tasks found in onboarding checklist. Cannot schedule access provisioning.');
            }
            for (const task of itTasks) {
                const taskDeadline = task.deadline;
                if (!taskDeadline || new Date(taskDeadline) > startDateObj) {
                    task.deadline = startDateObj;
                    task.notes =
                        (task.notes || '') +
                            `\n[${new Date().toISOString()}] Scheduled for automatic provisioning on ${startDateObj.toISOString()}`;
                    if (endDate) {
                        task.notes +=
                            `\n[${new Date().toISOString()}] Scheduled for automatic revocation on ${new Date(endDate).toISOString()}`;
                    }
                }
            }
            await onboarding.save();
            return {
                message: 'Access provisioning scheduled',
                startDate: startDateObj,
                endDate: endDate ? new Date(endDate) : undefined,
                note: endDate
                    ? `Access will be provisioned on ${startDateObj.toISOString()} and revoked on ${new Date(endDate).toISOString()}`
                    : `Access will be provisioned on ${startDateObj.toISOString()}`,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to schedule access provisioning: ' +
                this.getErrorMessage(error));
        }
    }
    async triggerPayrollInitiation(employeeId, contractSigningDate, grossSalary) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            if (!contractSigningDate ||
                isNaN(new Date(contractSigningDate).getTime())) {
                throw new common_1.BadRequestException('Invalid contract signing date format');
            }
            if (!grossSalary || grossSalary <= 0 || !Number.isFinite(grossSalary)) {
                throw new common_1.BadRequestException('Gross salary must be a positive number');
            }
            const onboarding = await this.onboardingModel.findOne({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
            });
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            const payrollTask = onboarding.tasks.find((task) => task.department === 'HR' &&
                (task.name.includes('Payroll') || task.name.includes('payroll')));
            if (!payrollTask) {
                throw new common_1.BadRequestException('Payroll task not found in onboarding checklist');
            }
            payrollTask.status = onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED;
            payrollTask.completedAt = new Date();
            payrollTask.notes =
                (payrollTask.notes || '') +
                    `\n[${new Date().toISOString()}] Payroll initiated automatically. ` +
                    `Contract signed: ${contractSigningDate.toISOString()}, Gross Salary: ${grossSalary}`;
            await onboarding.save();
            console.log(`Payroll initiation triggered for employee ${employeeId} (REQ-PY-23)`);
            return {
                message: 'Payroll initiation triggered successfully',
                contractSigningDate,
                grossSalary,
                task: payrollTask,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to trigger payroll initiation: ' + this.getErrorMessage(error));
        }
    }
    async processSigningBonus(employeeId, signingBonus, contractSigningDate) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            if (!signingBonus ||
                signingBonus <= 0 ||
                !Number.isFinite(signingBonus)) {
                throw new common_1.BadRequestException('Signing bonus must be a positive number');
            }
            if (!contractSigningDate ||
                isNaN(new Date(contractSigningDate).getTime())) {
                throw new common_1.BadRequestException('Invalid contract signing date format');
            }
            const onboarding = await this.onboardingModel.findOne({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
            });
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            const bonusTask = onboarding.tasks.find((task) => task.department === 'HR' &&
                (task.name.includes('Signing Bonus') ||
                    task.name.includes('signing bonus')));
            if (!bonusTask) {
                throw new common_1.BadRequestException('Signing bonus task not found in onboarding checklist');
            }
            bonusTask.status = onboarding_task_status_enum_1.OnboardingTaskStatus.COMPLETED;
            bonusTask.completedAt = new Date();
            bonusTask.notes =
                (bonusTask.notes || '') +
                    `\n[${new Date().toISOString()}] Signing bonus processed automatically. ` +
                    `Amount: ${signingBonus}, Contract signed: ${contractSigningDate.toISOString()}`;
            await onboarding.save();
            console.log(`Signing bonus processed for employee ${employeeId} (REQ-PY-27): ${signingBonus}`);
            return {
                message: 'Signing bonus processed successfully',
                signingBonus,
                contractSigningDate,
                task: bonusTask,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to process signing bonus: ' + this.getErrorMessage(error));
        }
    }
    async cancelOnboarding(employeeId, reason) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(employeeId)) {
                throw new common_1.BadRequestException('Invalid employee ID format');
            }
            if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
                throw new common_1.BadRequestException('Cancellation reason is required and must be a non-empty string');
            }
            const onboarding = await this.onboardingModel.findOne({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
            });
            if (!onboarding) {
                throw new common_1.NotFoundException('Onboarding not found');
            }
            if (onboarding.completed) {
                throw new common_1.BadRequestException('Cannot cancel a completed onboarding checklist');
            }
            for (const task of onboarding.tasks) {
                const taskStatus = task.status;
                if (taskStatus === onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING ||
                    taskStatus === onboarding_task_status_enum_1.OnboardingTaskStatus.IN_PROGRESS) {
                    task.status = onboarding_task_status_enum_1.OnboardingTaskStatus.PENDING;
                    task.notes =
                        (task.notes || '') +
                            `\n[${new Date().toISOString()}] CANCELLED: ${reason}`;
                }
            }
            if (onboarding.tasks.length > 0) {
                onboarding.tasks[0].notes =
                    (onboarding.tasks[0].notes || '') +
                        `\n[${new Date().toISOString()}] ONBOARDING CANCELLED: ${reason}`;
            }
            await onboarding.save();
            console.log(`Onboarding cancelled for employee ${employeeId}. Access revocation should be triggered.`);
            return {
                message: 'Onboarding cancelled successfully',
                reason,
                employeeId,
                note: 'All pending tasks have been cancelled. System access revocation should be scheduled.',
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to cancel onboarding: ' + this.getErrorMessage(error));
        }
    }
    async createTerminationRequest(dto, user) {
        if (!user || !user.role) {
            throw new common_1.ForbiddenException('User role missing from token.');
        }
        if (!dto.employeeId ||
            typeof dto.employeeId !== 'string' ||
            dto.employeeId.trim().length === 0) {
            throw new common_1.BadRequestException('Employee ID (employeeNumber) is required and must be a non-empty string');
        }
        if (!dto.initiator ||
            !Object.values(termination_initiation_enum_1.TerminationInitiation).includes(dto.initiator)) {
            throw new common_1.BadRequestException('Invalid termination initiator. Must be one of: employee, hr, manager');
        }
        const employee = await this.employeeModel
            .findOne({ employeeNumber: dto.employeeId })
            .exec();
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found.');
        }
        if (dto.initiator === termination_initiation_enum_1.TerminationInitiation.EMPLOYEE) {
            if (user.role !== employee_profile_enums_2.SystemRole.DEPARTMENT_EMPLOYEE) {
                throw new common_1.ForbiddenException('Only employees can initiate a resignation.');
            }
            if (user.employeeNumber && user.employeeNumber !== dto.employeeId) {
                throw new common_1.ForbiddenException('You can only submit a resignation for your own profile.');
            }
            const termination = await this.terminationModel.create({
                employeeId: employee._id,
                initiator: dto.initiator,
                reason: dto.reason,
                employeeComments: dto.employeeComments,
                terminationDate: dto.terminationDate
                    ? new Date(dto.terminationDate)
                    : undefined,
                status: termination_status_enum_1.TerminationStatus.PENDING,
                contractId: employee._id,
            });
            return termination;
        }
        if (dto.initiator === termination_initiation_enum_1.TerminationInitiation.HR ||
            dto.initiator === termination_initiation_enum_1.TerminationInitiation.MANAGER) {
            if (user.role !== employee_profile_enums_2.SystemRole.HR_MANAGER) {
                throw new common_1.ForbiddenException('Only HR Manager can initiate termination based on performance.');
            }
            const latestRecord = await this.appraisalRecordModel
                .findOne({ employeeProfileId: employee._id })
                .sort({ createdAt: -1 })
                .exec();
            if (!latestRecord) {
                throw new common_1.ForbiddenException('Cannot terminate: employee has no appraisal record.');
            }
            if (latestRecord.totalScore === undefined ||
                latestRecord.totalScore === null) {
                throw new common_1.ForbiddenException('Cannot terminate: appraisal has no total score.');
            }
            if (latestRecord.totalScore >= 2.5) {
                throw new common_1.ForbiddenException('Cannot terminate: performance score is not low enough for termination.');
            }
            const termination = await this.terminationModel.create({
                employeeId: employee._id,
                initiator: dto.initiator,
                reason: dto.reason ||
                    `Termination due to poor performance (score: ${latestRecord.totalScore})`,
                employeeComments: dto.employeeComments,
                terminationDate: dto.terminationDate
                    ? new Date(dto.terminationDate)
                    : undefined,
                status: termination_status_enum_1.TerminationStatus.PENDING,
                contractId: employee._id,
            });
            return termination;
        }
        throw new common_1.ForbiddenException('Unsupported termination initiator.');
    }
    async getTerminationRequestById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid termination request ID format');
        }
        const termination = await this.terminationModel.findById(id).exec();
        if (!termination) {
            throw new common_1.NotFoundException('Termination request not found.');
        }
        return termination;
    }
    async getMyResignationRequests(user) {
        if (!user || !user.role) {
            throw new common_1.ForbiddenException('Unauthorized');
        }
        if (user.role !== employee_profile_enums_2.SystemRole.DEPARTMENT_EMPLOYEE) {
            throw new common_1.ForbiddenException('Only employees can access their resignation requests.');
        }
        const employeeNumber = user.employeeNumber;
        if (!employeeNumber) {
            throw new common_1.BadRequestException('Employee number not present in token');
        }
        const employee = await this.employeeModel
            .findOne({ employeeNumber })
            .exec();
        if (!employee) {
            throw new common_1.NotFoundException('Employee profile not found');
        }
        const requests = await this.terminationModel
            .find({ employeeId: employee._id })
            .sort({ createdAt: -1 })
            .exec();
        return requests;
    }
    async updateTerminationStatus(id, dto, user) {
        if (!user || user.role !== employee_profile_enums_2.SystemRole.HR_MANAGER) {
            throw new common_1.ForbiddenException('Only HR Manager can update termination status.');
        }
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid termination request ID format');
        }
        if (!dto.status || !Object.values(termination_status_enum_1.TerminationStatus).includes(dto.status)) {
            throw new common_1.BadRequestException('Invalid termination status');
        }
        const termination = await this.terminationModel.findById(id);
        if (!termination) {
            throw new common_1.NotFoundException('Termination request not found.');
        }
        if (termination.status === termination_status_enum_1.TerminationStatus.APPROVED &&
            dto.status !== termination_status_enum_1.TerminationStatus.APPROVED) {
            throw new common_1.BadRequestException('Cannot change status of an approved termination request');
        }
        termination.status = dto.status;
        if (dto.hrComments !== undefined) {
            termination.hrComments = dto.hrComments;
        }
        if (dto.terminationDate) {
            termination.terminationDate = new Date(dto.terminationDate);
        }
        const saved = await termination.save();
        if (dto.status === termination_status_enum_1.TerminationStatus.APPROVED) {
            try {
                const existingChecklist = await this.clearanceModel.findOne({
                    terminationId: termination._id,
                });
                if (!existingChecklist) {
                    await this.createClearanceChecklist({
                        terminationId: termination._id.toString(),
                    }, user);
                }
            }
            catch (e) {
                console.warn('Failed to create clearance checklist automatically:', e);
            }
        }
        return saved;
    }
    async updateTerminationDetails(id, dto, user) {
        if (!user || user.role !== employee_profile_enums_2.SystemRole.HR_MANAGER) {
            throw new common_1.ForbiddenException('Only HR Manager can edit termination details.');
        }
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid termination request ID format');
        }
        const termination = await this.terminationModel.findById(id);
        if (!termination) {
            throw new common_1.NotFoundException('Termination request not found.');
        }
        if (termination.status === termination_status_enum_1.TerminationStatus.APPROVED) {
            throw new common_1.BadRequestException('Cannot edit details of an approved termination request');
        }
        if (dto.terminationDate) {
            const terminationDate = new Date(dto.terminationDate);
            if (isNaN(terminationDate.getTime())) {
                throw new common_1.BadRequestException('Invalid termination date format. Expected ISO 8601 date string.');
            }
            if (terminationDate < new Date() &&
                termination.initiator !== termination_initiation_enum_1.TerminationInitiation.EMPLOYEE) {
                throw new common_1.BadRequestException('Termination date cannot be in the past for HR/Manager initiated terminations');
            }
        }
        const update = {};
        if (dto.reason !== undefined) {
            if (typeof dto.reason !== 'string' || dto.reason.trim().length === 0) {
                throw new common_1.BadRequestException('Reason must be a non-empty string');
            }
            update.reason = dto.reason;
        }
        if (dto.employeeComments !== undefined)
            update.employeeComments = dto.employeeComments;
        if (dto.terminationDate)
            update.terminationDate = new Date(dto.terminationDate);
        const updated = await this.terminationModel.findByIdAndUpdate(id, update, {
            new: true,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Termination request not found.');
        }
        return updated;
    }
    async createClearanceChecklist(dto, user) {
        if (!user || user.role !== employee_profile_enums_2.SystemRole.HR_MANAGER) {
            throw new common_1.ForbiddenException('Only HR Manager can create clearance checklist.');
        }
        if (!dto.terminationId || !mongoose_2.Types.ObjectId.isValid(dto.terminationId)) {
            throw new common_1.BadRequestException('Invalid termination ID format');
        }
        const termination = await this.terminationModel.findById(dto.terminationId);
        if (!termination) {
            throw new common_1.NotFoundException('Termination request not found.');
        }
        const existingChecklist = await this.clearanceModel.findOne({
            terminationId: new mongoose_2.Types.ObjectId(dto.terminationId),
        });
        if (existingChecklist) {
            throw new common_1.BadRequestException('Clearance checklist already exists for this termination request');
        }
        const employee = await this.employeeModel
            .findById(termination.employeeId)
            .exec();
        if (!employee) {
            const checklistFallback = new this.clearanceModel({
                terminationId: new mongoose_2.Types.ObjectId(dto.terminationId),
                items: [
                    {
                        department: 'LINE_MANAGER',
                        assignedTo: null,
                        status: approval_status_enum_1.ApprovalStatus.PENDING,
                    },
                    { department: 'HR', status: approval_status_enum_1.ApprovalStatus.PENDING },
                    { department: 'IT', status: approval_status_enum_1.ApprovalStatus.PENDING },
                    { department: 'FINANCE', status: approval_status_enum_1.ApprovalStatus.PENDING },
                    { department: 'FACILITIES', status: approval_status_enum_1.ApprovalStatus.PENDING },
                    { department: 'ADMIN', status: approval_status_enum_1.ApprovalStatus.PENDING },
                ],
                equipmentList: [],
                cardReturned: false,
            });
            return checklistFallback.save();
        }
        let departmentManagerId = null;
        try {
            const manager = await this._findDepartmentManagerForEmployee(employee);
            if (manager && manager._id)
                departmentManagerId = manager._id;
        }
        catch (err) {
            console.warn('createClearanceChecklist: failed to resolve department manager:', this.getErrorMessage(err) || err);
        }
        let equipmentList = [];
        try {
            const onboarding = await this.onboardingModel
                .findOne({ employeeId: employee._id })
                .exec();
            equipmentList = this._extractEquipmentFromOnboarding(onboarding);
        }
        catch (err) {
            console.warn('createClearanceChecklist: failed to extract onboarding equipment:', this.getErrorMessage(err) || err);
        }
        const items = [
            {
                department: 'LINE_MANAGER',
                assignedTo: departmentManagerId,
                status: approval_status_enum_1.ApprovalStatus.PENDING,
            },
            { department: 'HR', status: approval_status_enum_1.ApprovalStatus.PENDING },
            { department: 'IT', status: approval_status_enum_1.ApprovalStatus.PENDING },
            { department: 'FINANCE', status: approval_status_enum_1.ApprovalStatus.PENDING },
            { department: 'FACILITIES', status: approval_status_enum_1.ApprovalStatus.PENDING },
            { department: 'ADMIN', status: approval_status_enum_1.ApprovalStatus.PENDING },
        ];
        const checklist = new this.clearanceModel({
            terminationId: new mongoose_2.Types.ObjectId(dto.terminationId),
            items,
            equipmentList,
            cardReturned: false,
        });
        return checklist.save();
    }
    async _findDepartmentManagerForEmployee(employee) {
        if (!employee || !employee.primaryDepartmentId)
            return null;
        try {
            const department = await this.organizationStructureService.getDepartmentById(employee.primaryDepartmentId.toString());
            if (!department || !department.headPositionId)
                return null;
            const assignments = await this.organizationStructureService.getPositionAssignments(department.headPositionId.toString());
            if (!assignments || assignments.length === 0)
                return null;
            const active = assignments.find((a) => !a.endDate) || assignments[0];
            if (!active || !active.employeeProfileId)
                return null;
            const manager = await this.employeeModel
                .findById(active.employeeProfileId)
                .select('-password')
                .exec();
            return manager || null;
        }
        catch (err) {
            return null;
        }
    }
    _extractEquipmentFromOnboarding(onboarding) {
        if (!onboarding || !Array.isArray(onboarding.tasks))
            return [];
        const found = [];
        for (const task of onboarding.tasks) {
            if (task.department !== 'Admin')
                continue;
            const notes = task.notes || '';
            const matches = Array.from(notes.matchAll(/Reserved:\s*(\{.*?\}|\[.*?\])/g));
            for (const m of matches) {
                try {
                    const parsed = JSON.parse(m[1]);
                    if (Array.isArray(parsed)) {
                        for (const p of parsed) {
                            found.push({
                                equipmentId: p.id || null,
                                name: p.name || p.type || 'Unknown',
                                returned: false,
                                condition: null,
                            });
                        }
                    }
                    else {
                        found.push({
                            equipmentId: parsed.id || null,
                            name: parsed.name || parsed.type || 'Unknown',
                            returned: false,
                            condition: null,
                        });
                    }
                }
                catch (err) {
                }
            }
        }
        return found;
    }
    async _internalRevokeSystemAccess(employee) {
        if (!employee)
            return;
        try {
            employee.status = employee_profile_enums_1.EmployeeStatus.INACTIVE;
            employee.statusEffectiveFrom = new Date();
            await employee.save();
            await this.terminationModel
                .updateMany({ employeeId: employee._id }, {
                $set: {
                    hrComments: (await this.terminationModel.findOne({
                        employeeId: employee._id,
                    }))?.hrComments +
                        `\n[ACCESS_REVOKED:${new Date().toISOString()}]`,
                },
            })
                .exec();
            console.log(`_internalRevokeSystemAccess: marked employee ${employee.employeeNumber} INACTIVE`);
        }
        catch (err) {
            console.warn('_internalRevokeSystemAccess failed:', this.getErrorMessage(err) || err);
        }
    }
    async getChecklistByEmployee(employeeId) {
        if (!employeeId ||
            typeof employeeId !== 'string' ||
            employeeId.trim().length === 0) {
            throw new common_1.BadRequestException('Employee ID (employeeNumber) is required and must be a non-empty string');
        }
        const employee = await this.employeeModel
            .findOne({ employeeNumber: employeeId })
            .exec();
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found.');
        }
        const termination = await this.terminationModel.findOne({
            employeeId: employee._id,
        });
        if (!termination) {
            throw new common_1.NotFoundException('No termination found for this employee.');
        }
        const checklist = await this.clearanceModel.findOne({
            terminationId: termination._id,
        });
        if (!checklist) {
            throw new common_1.NotFoundException('No clearance checklist found for this employee.');
        }
        return checklist;
    }
    async updateClearanceItemStatus(checklistId, dto, user) {
        if (!user || !user.role) {
            throw new common_1.ForbiddenException('Unauthorized clearance update. missing user/role');
        }
        if (!mongoose_2.Types.ObjectId.isValid(checklistId)) {
            throw new common_1.BadRequestException('Invalid checklist ID format');
        }
        if (!dto.department || typeof dto.department !== 'string') {
            throw new common_1.BadRequestException('Department is required and must be a non-empty string');
        }
        if (!dto.status || !Object.values(approval_status_enum_1.ApprovalStatus).includes(dto.status)) {
            throw new common_1.BadRequestException('Invalid approval status');
        }
        const checklist = await this.clearanceModel.findById(checklistId);
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found.');
        }
        const departmentItem = checklist.items.find((item) => item.department === dto.department);
        if (!departmentItem) {
            throw new common_1.BadRequestException(`Department '${dto.department}' not found in clearance checklist`);
        }
        const dept = dto.department;
        const role = user.role;
        const hasPermission = (() => {
            switch (dept) {
                case 'LINE_MANAGER':
                    if (departmentItem.assignedTo &&
                        user.id &&
                        departmentItem.assignedTo.toString() === user.id.toString())
                        return true;
                    return (role === employee_profile_enums_2.SystemRole.DEPARTMENT_HEAD ||
                        role === employee_profile_enums_2.SystemRole.HR_MANAGER);
                case 'IT':
                    return (role === employee_profile_enums_2.SystemRole.SYSTEM_ADMIN || role === employee_profile_enums_2.SystemRole.HR_MANAGER);
                case 'FINANCE':
                    return (role === employee_profile_enums_2.SystemRole.FINANCE_STAFF ||
                        role === employee_profile_enums_2.SystemRole.PAYROLL_MANAGER ||
                        role === employee_profile_enums_2.SystemRole.PAYROLL_SPECIALIST ||
                        role === employee_profile_enums_2.SystemRole.HR_MANAGER);
                case 'FACILITIES':
                    return (role === employee_profile_enums_2.SystemRole.HR_ADMIN ||
                        role === employee_profile_enums_2.SystemRole.SYSTEM_ADMIN ||
                        role === employee_profile_enums_2.SystemRole.HR_MANAGER);
                case 'ADMIN':
                    return (role === employee_profile_enums_2.SystemRole.HR_ADMIN ||
                        role === employee_profile_enums_2.SystemRole.HR_MANAGER ||
                        role === employee_profile_enums_2.SystemRole.SYSTEM_ADMIN);
                case 'HR':
                    return (role === employee_profile_enums_2.SystemRole.HR_EMPLOYEE ||
                        role === employee_profile_enums_2.SystemRole.HR_MANAGER ||
                        role === employee_profile_enums_2.SystemRole.SYSTEM_ADMIN);
                default:
                    return (role === employee_profile_enums_2.SystemRole.HR_MANAGER || role === employee_profile_enums_2.SystemRole.SYSTEM_ADMIN);
            }
        })();
        if (!hasPermission) {
            throw new common_1.ForbiddenException('User does not have permission to update this department clearance item');
        }
        const coreOrder = ['LINE_MANAGER', 'FINANCE', 'HR'];
        const deptIndex = coreOrder.indexOf(dept);
        if (deptIndex > 0) {
            for (let i = 0; i < deptIndex; i++) {
                const prev = checklist.items.find((it) => it.department === coreOrder[i]);
                if (!prev || prev.status !== approval_status_enum_1.ApprovalStatus.APPROVED) {
                    throw new common_1.BadRequestException(`Cannot approve '${dept}' before '${coreOrder[i]}' is approved`);
                }
            }
        }
        if (dept === 'HR' &&
            dto.status === approval_status_enum_1.ApprovalStatus.APPROVED &&
            role !== employee_profile_enums_2.SystemRole.HR_MANAGER) {
            throw new common_1.ForbiddenException('Only HR Manager can finalize HR approval');
        }
        await this.clearanceModel.updateOne({ _id: checklistId, 'items.department': dto.department }, {
            $set: {
                'items.$.status': dto.status,
                'items.$.comments': dto.comments ?? null,
                'items.$.updatedBy': user.id ? new mongoose_2.Types.ObjectId(user.id) : null,
                'items.$.updatedAt': new Date(),
            },
        });
        const updatedChecklist = await this.clearanceModel.findById(checklistId);
        if (!updatedChecklist) {
            throw new common_1.NotFoundException('Checklist not found.');
        }
        if (dto.status === approval_status_enum_1.ApprovalStatus.APPROVED) {
            try {
                const termination = await this.terminationModel.findById(updatedChecklist.terminationId);
                const employee = termination
                    ? await this.employeeModel.findById(termination.employeeId)
                    : null;
                if (dept === 'IT') {
                    if (employee)
                        await this._internalRevokeSystemAccess(employee);
                }
                if (dept === 'FACILITIES' &&
                    Array.isArray(dto.equipmentReturns)) {
                    const returns = dto.equipmentReturns;
                    for (const r of returns) {
                        const idx = updatedChecklist.equipmentList.findIndex((e) => e.equipmentId?.toString?.() === r.equipmentId?.toString?.() ||
                            e.name === r.equipmentId);
                        if (idx >= 0) {
                            updatedChecklist.equipmentList[idx].returned = true;
                            if (r.condition)
                                updatedChecklist.equipmentList[idx].condition = r.condition;
                        }
                    }
                    await updatedChecklist.save();
                    if (employee) {
                        const onboarding = await this.onboardingModel.findOne({
                            employeeId: employee._id,
                        });
                        if (onboarding) {
                            onboarding.tasks = onboarding.tasks.map((t) => {
                                if (t.department === 'Admin') {
                                    t.notes =
                                        (t.notes || '') +
                                            `\n[${new Date().toISOString()}] Equipment returned: ${JSON.stringify(dto.equipmentReturns)}`;
                                }
                                return t;
                            });
                            await onboarding.save();
                        }
                    }
                }
            }
            catch (err) {
                console.warn('Post-approval side-effects failed:', this.getErrorMessage(err) || err);
            }
        }
        const allApproved = updatedChecklist.items.every((i) => i.status === approval_status_enum_1.ApprovalStatus.APPROVED);
        if (allApproved) {
            updatedChecklist.cardReturned = true;
            await updatedChecklist.save();
            await this.terminationModel.findByIdAndUpdate(updatedChecklist.terminationId, {
                status: termination_status_enum_1.TerminationStatus.APPROVED,
            });
            try {
                const termination = await this.terminationModel.findById(updatedChecklist.terminationId);
                if (termination && termination.employeeId) {
                    await this.triggerFinalSettlement(termination.employeeId.toString(), updatedChecklist.terminationId.toString());
                }
            }
            catch (err) {
                console.warn('Failed to trigger final settlement after all clearances approved:', this.getErrorMessage(err) || err);
            }
        }
        return { message: 'Clearance item updated.' };
    }
    async markChecklistCompleted(checklistId, user) {
        if (!user || user.role !== employee_profile_enums_2.SystemRole.HR_MANAGER) {
            throw new common_1.ForbiddenException('Only HR Manager can manually complete checklist.');
        }
        if (!mongoose_2.Types.ObjectId.isValid(checklistId)) {
            throw new common_1.BadRequestException('Invalid checklist ID format');
        }
        const checklist = await this.clearanceModel.findById(checklistId);
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found.');
        }
        const updated = await this.clearanceModel.findByIdAndUpdate(checklistId, { cardReturned: true }, { new: true });
        if (!updated) {
            throw new common_1.NotFoundException('Checklist not found.');
        }
        return updated;
    }
    async triggerFinalSettlement(employeeId, terminationId) {
        if (!employeeId || !mongoose_2.Types.ObjectId.isValid(employeeId)) {
            throw new common_1.BadRequestException('Invalid employee ID for final settlement');
        }
        if (!terminationId || !mongoose_2.Types.ObjectId.isValid(terminationId)) {
            throw new common_1.BadRequestException('Invalid termination ID for final settlement');
        }
        const employee = await this.employeeModel.findById(employeeId).exec();
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found for final settlement');
        }
        const termination = await this.terminationModel
            .findById(terminationId)
            .exec();
        if (!termination) {
            throw new common_1.NotFoundException('Termination request not found for final settlement');
        }
        const settlementData = {
            employeeId: employee._id,
            employeeNumber: employee.employeeNumber,
            terminationId: termination._id,
            terminationDate: termination.terminationDate,
            initiatedAt: new Date().toISOString(),
            status: 'INITIATED',
            components: {
                leaveEncashment: null,
                finalPay: null,
                benefitsTermination: null,
                deductions: null,
                severance: null,
            },
            errors: [],
        };
        settlementData.status =
            settlementData.errors.length > 0 ? 'PARTIAL' : 'QUEUED';
        settlementData.completedAt = new Date().toISOString();
        try {
            await this.terminationModel
                .updateOne({ _id: terminationId }, {
                $set: {
                    '_meta.finalSettlement': settlementData,
                },
            })
                .exec();
        }
        catch (err) {
            console.warn('triggerFinalSettlement: Failed to save settlement metadata:', this.getErrorMessage(err) || err);
        }
        const settlementNote = `[FINAL_SETTLEMENT_TRIGGERED:${new Date().toISOString()}] Status: ${settlementData.status}`;
        termination.hrComments =
            (termination.hrComments || '') + '\n' + settlementNote;
        await termination.save();
        console.log(`triggerFinalSettlement: Initiated for employee ${employee.employeeNumber}, status: ${settlementData.status}`);
        return {
            message: 'Final settlement process initiated',
            settlementData,
        };
    }
    async sendClearanceReminders(options) {
        const REMINDER_INTERVAL_DAYS = 3;
        const ESCALATION_AFTER_DAYS = 7;
        const MAX_REMINDERS = 3;
        const pendingChecklists = await this.clearanceModel
            .find({ 'items.status': approval_status_enum_1.ApprovalStatus.PENDING })
            .exec();
        for (const checklist of pendingChecklists) {
            try {
                const termination = await this.terminationModel
                    .findById(checklist.terminationId)
                    .exec();
                const employee = termination
                    ? await this.employeeModel.findById(termination.employeeId).exec()
                    : null;
                const meta = checklist._meta || {};
                meta.reminders = meta.reminders || {};
                const now = new Date();
                for (const item of checklist.items || []) {
                    if (item.status !== approval_status_enum_1.ApprovalStatus.PENDING)
                        continue;
                    const dept = item.department;
                    meta.reminders[dept] = meta.reminders[dept] || {
                        count: 0,
                        lastSent: null,
                        firstSent: null,
                        escalated: false,
                    };
                    const dmeta = meta.reminders[dept];
                    const lastSent = dmeta.lastSent ? new Date(dmeta.lastSent) : null;
                    const firstSent = dmeta.firstSent ? new Date(dmeta.firstSent) : null;
                    const daysSinceLast = lastSent
                        ? Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24))
                        : Infinity;
                    const daysSinceFirst = firstSent
                        ? Math.floor((now.getTime() - firstSent.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;
                    if (dmeta.count >= MAX_REMINDERS && !options?.force)
                        continue;
                    if (lastSent &&
                        daysSinceLast < REMINDER_INTERVAL_DAYS &&
                        !options?.force)
                        continue;
                    const recipients = await this._resolveRecipientsForClearanceDept(item, checklist, employee);
                    if (!recipients || recipients.length === 0) {
                        continue;
                    }
                    for (const r of recipients) {
                        try {
                            await this.sendNotification('clearance_reminder', r.email, {
                                recipientName: r.name,
                                employeeName: employee
                                    ? employee.employeeNumber ||
                                        employee.workEmail ||
                                        'Employee'
                                    : 'Employee',
                                checklistId: checklist._id?.toString(),
                                department: dept,
                                itemName: dept,
                                note: `Pending since ${item.updatedAt ? new Date(item.updatedAt).toISOString() : 'unknown'}`,
                            }, { nonBlocking: true });
                        }
                        catch (err) {
                            console.warn(`Failed to send clearance reminder to ${r.email}:`, this.getErrorMessage(err) || err);
                        }
                    }
                    dmeta.count = (dmeta.count || 0) + 1;
                    dmeta.lastSent = now.toISOString();
                    if (!dmeta.firstSent)
                        dmeta.firstSent = now.toISOString();
                    if (!dmeta.escalated &&
                        firstSent &&
                        daysSinceFirst >= ESCALATION_AFTER_DAYS) {
                        const escalationRecipients = [];
                        const hrRoles = await this.employeeSystemRoleModel
                            .find({ roles: { $in: [employee_profile_enums_2.SystemRole.HR_MANAGER] }, isActive: true })
                            .exec();
                        for (const r of hrRoles) {
                            const emp = await this.employeeModel
                                .findById(r.employeeProfileId)
                                .exec();
                            if (emp && emp.workEmail)
                                escalationRecipients.push({
                                    name: emp.employeeNumber || emp.workEmail,
                                    email: emp.workEmail,
                                });
                        }
                        try {
                            const manager = await this._findDepartmentManagerForEmployee(employee);
                            if (manager && manager.workEmail)
                                escalationRecipients.push({
                                    name: manager.employeeNumber || manager.workEmail,
                                    email: manager.workEmail,
                                });
                        }
                        catch (err) {
                        }
                        for (const e of escalationRecipients) {
                            try {
                                await this.sendNotification('clearance_reminder', e.email, {
                                    recipientName: e.name,
                                    employeeName: employee
                                        ? employee.employeeNumber ||
                                            employee.workEmail ||
                                            'Employee'
                                        : 'Employee',
                                    checklistId: checklist._id?.toString(),
                                    department: dept,
                                    itemName: dept,
                                    note: `ESCALATION: ${dmeta.count} reminder(s) sent with no resolution. Please intervene.`,
                                }, { nonBlocking: true });
                            }
                            catch (err) {
                                console.warn('Failed to send escalation reminder:', this.getErrorMessage(err) || err);
                            }
                        }
                        dmeta.escalated = true;
                    }
                }
                await this.clearanceModel
                    .updateOne({ _id: checklist._id }, { $set: { '_meta.reminders': meta.reminders } })
                    .exec();
            }
            catch (err) {
                console.warn('sendClearanceReminders: failed for checklist', checklist._id?.toString(), this.getErrorMessage(err) || err);
            }
        }
        return { message: 'Clearance reminders processed.' };
    }
    async _resolveRecipientsForClearanceDept(item, checklist, employee) {
        const dept = item.department;
        const recipients = [];
        if (item.assignedTo) {
            try {
                const manager = await this.employeeModel
                    .findById(item.assignedTo)
                    .exec();
                if (manager && manager.workEmail)
                    return [
                        {
                            name: manager.employeeNumber || manager.workEmail,
                            email: manager.workEmail,
                        },
                    ];
            }
            catch (_) {
            }
        }
        const roleMap = {
            LINE_MANAGER: [employee_profile_enums_2.SystemRole.DEPARTMENT_HEAD],
            HR: [employee_profile_enums_2.SystemRole.HR_MANAGER, employee_profile_enums_2.SystemRole.HR_EMPLOYEE, employee_profile_enums_2.SystemRole.HR_ADMIN],
            IT: [employee_profile_enums_2.SystemRole.SYSTEM_ADMIN],
            FINANCE: [
                employee_profile_enums_2.SystemRole.FINANCE_STAFF,
                employee_profile_enums_2.SystemRole.PAYROLL_MANAGER,
                employee_profile_enums_2.SystemRole.PAYROLL_SPECIALIST,
            ],
            FACILITIES: [employee_profile_enums_2.SystemRole.HR_ADMIN, employee_profile_enums_2.SystemRole.SYSTEM_ADMIN],
            ADMIN: [employee_profile_enums_2.SystemRole.HR_ADMIN, employee_profile_enums_2.SystemRole.SYSTEM_ADMIN],
        };
        const roles = roleMap[dept] || [employee_profile_enums_2.SystemRole.HR_MANAGER];
        for (const r of roles) {
            try {
                const matches = await this.employeeSystemRoleModel
                    .find({ roles: { $in: [r] }, isActive: true })
                    .exec();
                for (const m of matches) {
                    const emp = await this.employeeModel
                        .findById(m.employeeProfileId)
                        .exec();
                    if (emp && emp.workEmail)
                        recipients.push({
                            name: emp.employeeNumber || emp.workEmail,
                            email: emp.workEmail,
                        });
                }
            }
            catch (err) {
            }
        }
        const uniq = new Map();
        for (const r of recipients)
            uniq.set(r.email, r);
        return Array.from(uniq.values());
    }
    async getLatestAppraisalForEmployee(employeeId) {
        if (!employeeId ||
            typeof employeeId !== 'string' ||
            employeeId.trim().length === 0) {
            throw new common_1.BadRequestException('Employee ID (employeeNumber) is required and must be a non-empty string');
        }
        const employee = await this.employeeModel
            .findOne({ employeeNumber: employeeId })
            .exec();
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found.');
        }
        if (employee.lastAppraisalRecordId) {
            const record = await this.appraisalRecordModel
                .findById(employee.lastAppraisalRecordId)
                .exec();
            if (!record) {
                throw new common_1.NotFoundException('No appraisal record found for this employee.');
            }
            return {
                employee: {
                    id: employee._id,
                    employeeNumber: employee.employeeNumber,
                    status: employee.status,
                    lastAppraisalDate: employee.lastAppraisalDate,
                    lastAppraisalScore: employee.lastAppraisalScore,
                    lastAppraisalRatingLabel: employee.lastAppraisalRatingLabel,
                },
                appraisal: record,
            };
        }
        const latestRecord = await this.appraisalRecordModel
            .findOne({ employeeProfileId: employee._id })
            .sort({ createdAt: -1 })
            .exec();
        if (!latestRecord) {
            throw new common_1.NotFoundException('No appraisal record found for this employee.');
        }
        return {
            employee: {
                id: employee._id,
                employeeNumber: employee.employeeNumber,
                status: employee.status,
                lastAppraisalDate: employee.lastAppraisalDate,
                lastAppraisalScore: employee.lastAppraisalScore,
                lastAppraisalRatingLabel: employee.lastAppraisalRatingLabel,
            },
            appraisal: latestRecord,
        };
    }
    async revokeSystemAccess(dto, user) {
        if (!user || user.role !== employee_profile_enums_2.SystemRole.SYSTEM_ADMIN) {
            throw new common_1.ForbiddenException('Only System Admin can revoke system access.');
        }
        if (!dto.employeeId ||
            typeof dto.employeeId !== 'string' ||
            dto.employeeId.trim().length === 0) {
            throw new common_1.BadRequestException('Employee ID (employeeNumber) is required and must be a non-empty string');
        }
        const employee = await this.employeeModel.findOne({
            employeeNumber: dto.employeeId,
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found.');
        }
        if (employee.status === employee_profile_enums_1.EmployeeStatus.INACTIVE) {
            const termination = await this.terminationModel
                .findOne({ employeeId: employee._id })
                .lean();
            const existingLog = termination
                ? termination._meta?.revocationLog || null
                : null;
            return {
                message: 'Employee is already inactive. No further action taken.',
                employeeId: employee._id,
                employeeNumber: employee.employeeNumber,
                previousStatus: employee_profile_enums_1.EmployeeStatus.INACTIVE,
                newStatus: employee_profile_enums_1.EmployeeStatus.INACTIVE,
                revocationLog: existingLog,
            };
        }
        const previousStatus = employee.status;
        employee.status = employee_profile_enums_1.EmployeeStatus.INACTIVE;
        await employee.save();
        const termination = await this.terminationModel
            .findOne({ employeeId: employee._id })
            .exec();
        const note = `[ACCESS_REVOKED:${new Date().toISOString()}] by ${user?.id || user?.employeeNumber || 'SYSTEM'}`;
        if (termination) {
            termination.hrComments = (termination.hrComments || '') + '\n' + note;
            termination._meta = termination._meta || {};
            termination._meta.revocationLog =
                termination._meta.revocationLog || [];
            termination._meta.revocationLog.push({
                at: new Date().toISOString(),
                by: user?.id || user?.employeeNumber || 'SYSTEM',
                reason: dto?.reason || 'manual_revoke',
                actions: [],
            });
            await termination.save();
        }
        const actions = [];
        try {
            const result = await this._revokeIdentityProvider(employee);
            actions.push(result);
            if (termination)
                await this._appendRevocationAction(termination._id, result);
        }
        catch (err) {
            const result = {
                service: 'idp',
                success: false,
                details: this.getErrorMessage(err) || String(err),
            };
            actions.push(result);
            if (termination)
                await this._appendRevocationAction(termination._id, result);
        }
        try {
            const result = await this._deactivateMailbox(employee);
            actions.push(result);
            if (termination)
                await this._appendRevocationAction(termination._id, result);
        }
        catch (err) {
            const result = {
                service: 'mail',
                success: false,
                details: this.getErrorMessage(err) || String(err),
            };
            actions.push(result);
            if (termination)
                await this._appendRevocationAction(termination._id, result);
        }
        try {
            const result = await this._deprovisionApplications(employee);
            actions.push(result);
            if (termination)
                await this._appendRevocationAction(termination._id, result);
        }
        catch (err) {
            const result = {
                service: 'apps',
                success: false,
                details: this.getErrorMessage(err) || String(err),
            };
            actions.push(result);
            if (termination)
                await this._appendRevocationAction(termination._id, result);
        }
        try {
            if (employee.workEmail) {
                await this.sendNotification('access_revoked', employee.workEmail, {
                    employeeName: employee.fullName || employee.employeeNumber || 'Employee',
                    employeeNumber: employee.employeeNumber,
                    reason: dto?.reason || 'Manual revocation by System Admin',
                }, { nonBlocking: true });
            }
            const admins = await this.employeeSystemRoleModel
                .find({ roles: { $in: [employee_profile_enums_2.SystemRole.SYSTEM_ADMIN] }, isActive: true })
                .exec();
            for (const a of admins) {
                const admin = await this.employeeModel
                    .findById(a.employeeProfileId)
                    .exec();
                if (admin && admin.workEmail) {
                    await this.sendNotification('access_revoked', admin.workEmail, {
                        employeeName: employee.fullName || employee.employeeNumber || 'Employee',
                        employeeNumber: employee.employeeNumber,
                        reason: dto?.reason || 'Manual revocation requested',
                    }, { nonBlocking: true });
                }
            }
        }
        catch (err) {
            console.warn('revokeSystemAccess notifications failed:', this.getErrorMessage(err) || err);
        }
        return {
            message: 'System access revoked (employee status set to INACTIVE). De-provisioning actions initiated.',
            employeeId: employee._id,
            employeeNumber: employee.employeeNumber,
            previousStatus,
            newStatus: employee_profile_enums_1.EmployeeStatus.INACTIVE,
            actions,
        };
    }
    async _appendRevocationAction(terminationId, entry) {
        try {
            if (!terminationId)
                return;
            await this.terminationModel
                .updateOne({ _id: terminationId }, { $push: { '_meta.revocationLog': entry } })
                .exec();
        }
        catch (err) {
            console.warn('_appendRevocationAction failed:', this.getErrorMessage(err) || err);
        }
    }
    async _revokeIdentityProvider(employee) {
        try {
            console.log(`_revokeIdentityProvider: (placeholder) revoking IdP access for ${employee.employeeNumber || employee._id}`);
            return {
                service: 'idp',
                success: true,
                details: `IdP revoke queued for ${employee.employeeNumber || employee._id}`,
            };
        }
        catch (err) {
            return {
                service: 'idp',
                success: false,
                details: this.getErrorMessage(err) || String(err),
            };
        }
    }
    async _deactivateMailbox(employee) {
        try {
            console.log(`_deactivateMailbox: (placeholder) deactivating mailbox for ${employee.workEmail || employee.employeeNumber}`);
            return {
                service: 'mail',
                success: true,
                details: `Mailbox deactivation queued for ${employee.workEmail || employee.employeeNumber}`,
            };
        }
        catch (err) {
            return {
                service: 'mail',
                success: false,
                details: this.getErrorMessage(err) || String(err),
            };
        }
    }
    async _deprovisionApplications(employee) {
        try {
            console.log(`_deprovisionApplications: (placeholder) deprovisioning apps for ${employee.employeeNumber || employee._id}`);
            return {
                service: 'apps',
                success: true,
                details: 'Applications deprovisioning queued (placeholder)',
            };
        }
        catch (err) {
            return {
                service: 'apps',
                success: false,
                details: this.getErrorMessage(err) || String(err),
            };
        }
    }
};
exports.RecruitmentService = RecruitmentService;
exports.RecruitmentService = RecruitmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(job_requisition_schema_1.JobRequisition.name)),
    __param(1, (0, mongoose_1.InjectModel)(application_schema_1.Application.name)),
    __param(2, (0, mongoose_1.InjectModel)(interview_schema_1.Interview.name)),
    __param(3, (0, mongoose_1.InjectModel)(offer_schema_1.Offer.name)),
    __param(4, (0, mongoose_1.InjectModel)('JobTemplate')),
    __param(5, (0, mongoose_1.InjectModel)(onboarding_schema_1.Onboarding.name)),
    __param(6, (0, mongoose_1.InjectModel)(document_schema_1.Document.name)),
    __param(7, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(8, (0, mongoose_1.InjectModel)(candidate_schema_1.Candidate.name)),
    __param(9, (0, mongoose_1.InjectModel)(referral_schema_1.Referral.name)),
    __param(10, (0, mongoose_1.InjectModel)(assessment_result_schema_1.AssessmentResult.name)),
    __param(11, (0, mongoose_1.InjectModel)(application_history_schema_1.ApplicationStatusHistory.name)),
    __param(14, (0, mongoose_1.InjectModel)(termination_request_schema_1.TerminationRequest.name)),
    __param(15, (0, mongoose_1.InjectModel)(clearance_checklist_schema_1.ClearanceChecklist.name)),
    __param(16, (0, mongoose_1.InjectModel)(employee_profile_schema_1.EmployeeProfile.name)),
    __param(17, (0, mongoose_1.InjectModel)(appraisal_record_schema_1.AppraisalRecord.name)),
    __param(18, (0, mongoose_1.InjectModel)(employee_system_role_schema_1.EmployeeSystemRole.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        employee_profile_service_1.EmployeeProfileService,
        organization_structure_service_1.OrganizationStructureService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], RecruitmentService);
//# sourceMappingURL=recruitment.service.js.map