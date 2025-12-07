/**
 * ============================================================================
 * RECRUITMENT SERVICE - INTEGRATION POINTS DOCUMENTATION
 * ============================================================================
 *
 * This service integrates with the following subsystems:
 *
 * 1. EMPLOYEE PROFILE SERVICE (ACTIVE INTEGRATION)
 *    - Location: createEmployeeFromContract()
 *    - Purpose: Create employee profile from candidate data (ONB-002, REC-029)
 *    - Status: ✅ ACTIVE - Already integrated and working
 *
 * 2. PAYROLL EXECUTION SERVICE (PENDING INTEGRATION)
 *    - Locations:
 *      - triggerPayrollInitiation() - ONB-018 (REQ-PY-23)
 *      - processSigningBonus() - ONB-019 (REQ-PY-27)
 *    - Purpose: Automatically initiate payroll and process signing bonuses
 *    - Schema Reference: EmployeeSigningBonus, employeePayrollDetails
 *    - Status: ⏳ PENDING - Integration code commented out, ready to uncomment
 *
 * 3. TIME MANAGEMENT SERVICE (PENDING INTEGRATION)
 *    - Locations:
 *      - provisionSystemAccess() - ONB-009
 *      - scheduleAccessProvisioning() - ONB-013
 *    - Purpose: Provision clock access for time tracking
 *    - Schema Reference: AttendanceRecord
 *    - Status: ⏳ PENDING - Integration code commented out, ready to uncomment
 *
 * 4. ORGANIZATION STRUCTURE SERVICE (ACTIVE INTEGRATION)
 *    - Location: createEmployeeFromContract()
 *    - Purpose: Validate departments and positions exist and are active
 *    - Schema Reference: Department, Position, PositionAssignment
 *    - Status: ✅ ACTIVE - Validates department and position IDs when creating employees
 *
 * 5. IT SERVICE / CALENDAR SERVICE (PENDING INTEGRATION)
 *    - Location: scheduleInterview() - REC-011
 *    - Purpose: Send calendar invites to interview panel members
 *    - Status: ⏳ PENDING - Integration code commented out, ready to uncomment
 *
 * ============================================================================
 * INSTRUCTIONS FOR INTEGRATION:
 * ============================================================================
 * 1. Uncomment the import statements at the top of this file
 * 2. Uncomment the service injections in the constructor
 * 3. Uncomment the integration code blocks marked with "INTEGRATION:" comments
 * 4. Update the module imports in recruitment.module.ts
 * 5. Ensure the target services are exported from their respective modules
 * 6. Test each integration point individually
 *
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobRequisition } from './models/job-requisition.schema';
import { Application } from './models/application.schema';
import { Interview } from './models/interview.schema';
import { Offer } from './models/offer.schema';
import { CreateJobRequisitionDto } from './dto/job-requisition.dto';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
} from './dto/application.dto';
import {
  ScheduleInterviewDto,
  UpdateInterviewStatusDto,
} from './dto/interview.dto';
import {
  CreateOfferDto,
  RespondToOfferDto,
  FinalizeOfferDto,
} from './dto/offer.dto';
import * as nodemailer from 'nodemailer';
import { Onboarding, OnboardingDocument } from './models/onboarding.schema';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateOnboardingTaskDto } from './dto/update-task.dto';
import { OnboardingTaskStatus } from './enums/onboarding-task-status.enum';
import { Document, DocumentDocument } from './models/document.schema';
import * as fs from 'fs-extra';
import { DocumentType } from './enums/document-type.enum';
import { Response } from 'express';
// ============= INTEGRATION IMPORTS =============
// Employee Profile Service - Already integrated
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
// Payroll Execution Service - Integration pending (uncomment when ready)
// import { PayrollExecutionService } from '../payroll-execution/payroll-execution.service';
// Time Management Service - Integration pending (uncomment when ready)
// import { TimeManagementService } from '../time-management/time-management.service';
// Organization Structure Service - ACTIVE INTEGRATION
import { OrganizationStructureService } from '../organization-structure/organization-structure.service';

// ============= SCHEMA IMPORTS =============
import { Contract, ContractDocument } from './models/contract.schema';
import { CreateEmployeeFromContractDto } from './dto/create-employee-from-contract.dto';
import { OfferResponseStatus } from './enums/offer-response-status.enum';
import { OfferFinalStatus } from './enums/offer-final-status.enum';
import { CreateEmployeeDto } from '../employee-profile/dto/create-employee.dto';
import { EmployeeStatus } from '../employee-profile/enums/employee-profile.enums';
import {
  Candidate,
  CandidateDocument,
} from '../employee-profile/models/candidate.schema';
import { Referral, ReferralDocument } from './models/referral.schema';
import {
  AssessmentResult,
  AssessmentResultDocument,
} from './models/assessment-result.schema';
import {
  ApplicationStatusHistory,
  ApplicationStatusHistoryDocument,
} from './models/application-history.schema';
import { ApplicationStage } from './enums/application-stage.enum';
import { ApplicationStatus } from './enums/application-status.enum';

// ============= EXTERNAL SUBSYSTEM SCHEMA REFERENCES =============
// These schemas exist in other subsystems and can be referenced when needed:
// - Payroll Execution: EmployeeSigningBonus, employeePayrollDetails (from payroll-execution/models)
// - Organization Structure: Department, Position (from organization-structure/models)
// - Time Management: AttendanceRecord (from time-management/models)

import { TerminationRequest } from './models/termination-request.schema';
import { ClearanceChecklist } from './models/clearance-checklist.schema';

import { TerminationStatus } from './enums/termination-status.enum';
import { TerminationInitiation } from './enums/termination-initiation.enum';
import { ApprovalStatus } from './enums/approval-status.enum';

import {
  CreateTerminationRequestDto,
  UpdateTerminationStatusDto,
  UpdateTerminationDetailsDto,
} from './dto/termination-request.dto';

import {
  CreateClearanceChecklistDto,
  UpdateClearanceItemStatusDto,
} from './dto/clearance-checklist.dto';

import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';

import {
  EmployeeSystemRole,
  EmployeeSystemRoleDocument,
} from '../employee-profile/models/employee-system-role.schema';

// NEW – performance linkage
import {
  AppraisalRecord,
  AppraisalRecordDocument,
} from '../performance/models/appraisal-record.schema';

// System enums (EmployeeStatus already imported above, only import SystemRole here)
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

import { RevokeSystemAccessDto } from './dto/system-access.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectModel(JobRequisition.name)
    private jobModel: Model<JobRequisition>,

    @InjectModel(Application.name)
    private applicationModel: Model<Application>,

    @InjectModel(Interview.name)
    private interviewModel: Model<Interview>,

    @InjectModel(Offer.name)
    private offerModel: Model<Offer>,

    @InjectModel('JobTemplate') private jobTemplateModel: Model<any>,

    @InjectModel(Onboarding.name)
    private readonly onboardingModel: Model<OnboardingDocument>,

    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,

    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,

    @InjectModel(Candidate.name)
    private readonly candidateModel: Model<CandidateDocument>,

    @InjectModel(Referral.name)
    private readonly referralModel: Model<ReferralDocument>,

    @InjectModel(AssessmentResult.name)
    private readonly assessmentResultModel: Model<AssessmentResultDocument>,

    @InjectModel(ApplicationStatusHistory.name)
    private readonly applicationStatusHistoryModel: Model<ApplicationStatusHistoryDocument>,

    // ============= INTEGRATED SERVICES =============
    // Employee Profile Service - ACTIVE INTEGRATION
    private readonly employeeProfileService: EmployeeProfileService,

    // Organization Structure Service - ACTIVE INTEGRATION
    // For validating departments and positions exist and are active
    private readonly organizationStructureService: OrganizationStructureService,

    // ============= PENDING INTEGRATIONS (Uncomment when services are ready) =============
    // Payroll Execution Service - For ONB-018 (REQ-PY-23) and ONB-019 (REQ-PY-27)
    // private readonly payrollExecutionService: PayrollExecutionService,

    // Time Management Service - For ONB-009 (clock access provisioning)
    // private readonly timeManagementService: TimeManagementService,

    // ============= OFFBOARDING MODELS =============
    @InjectModel(TerminationRequest.name)
    private terminationModel: Model<TerminationRequest>,

    @InjectModel(ClearanceChecklist.name)
    private clearanceModel: Model<ClearanceChecklist>,

    @InjectModel(EmployeeProfile.name)
    private employeeModel: Model<EmployeeProfileDocument>,

    @InjectModel(AppraisalRecord.name)
    private appraisalRecordModel: Model<AppraisalRecordDocument>,

    @InjectModel(EmployeeSystemRole.name)
    private readonly employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return this.getErrorMessage(error);
    return String(error);
  }

  // Utility function to calculate job requisition progress
  calculateProgress(status: string): number {
    const s = (status || '').toString().toLowerCase();
    const mapping: Record<string, number> = {
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

  // ---------------------------------------------------
  // JOB REQUISITIONS
  // ---------------------------------------------------
  async createJobRequisition(
    dto: CreateJobRequisitionDto,
  ): Promise<JobRequisition> {
    // Validate templateId
    if (!Types.ObjectId.isValid(dto.templateId)) {
      throw new BadRequestException('Invalid template ID format');
    }

    // Validate that template exists
    const template = await this.jobTemplateModel.findById(dto.templateId);
    if (!template) {
      throw new NotFoundException('Job template not found');
    }

    // Validate openings
    if (dto.openings <= 0 || !Number.isInteger(dto.openings)) {
      throw new BadRequestException('Openings must be a positive integer');
    }

    // Validate hiringManagerId if provided
    if (dto.hiringManagerId && !Types.ObjectId.isValid(dto.hiringManagerId)) {
      throw new BadRequestException('Invalid hiring manager ID format');
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

  // JobTemplate CRUD
  async createJobTemplate(dto: any) {
    if (
      !dto.title ||
      typeof dto.title !== 'string' ||
      dto.title.trim().length === 0
    ) {
      throw new BadRequestException(
        'Title is required and must be a non-empty string',
      );
    }
    if (
      !dto.department ||
      typeof dto.department !== 'string' ||
      dto.department.trim().length === 0
    ) {
      throw new BadRequestException(
        'Department is required and must be a non-empty string',
      );
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

  async getJobTemplateById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job template ID format');
    }
    const template = await this.jobTemplateModel.findById(id);
    if (!template) {
      throw new NotFoundException('Job Template not found');
    }
    return template;
  }

  async updateJobTemplate(id: string, dto: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job template ID format');
    }

    // Validate that template exists
    const existingTemplate = await this.jobTemplateModel.findById(id);
    if (!existingTemplate) {
      throw new NotFoundException('Job Template not found');
    }

    // Validate update data if provided
    if (
      dto.title !== undefined &&
      (typeof dto.title !== 'string' || dto.title.trim().length === 0)
    ) {
      throw new BadRequestException('Title must be a non-empty string');
    }
    if (
      dto.department !== undefined &&
      (typeof dto.department !== 'string' || dto.department.trim().length === 0)
    ) {
      throw new BadRequestException('Department must be a non-empty string');
    }

    const updated = await this.jobTemplateModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException('Job Template not found');
    }
    return updated;
  }

  // Publish/Preview
  async publishJobRequisition(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job requisition ID format');
    }

    const requisition = await this.jobModel.findById(id);
    if (!requisition) {
      throw new NotFoundException('Job Requisition not found');
    }

    // Cannot publish if already closed
    if (requisition.publishStatus === 'closed') {
      throw new BadRequestException('Cannot publish a closed job requisition');
    }

    // Validate openings is greater than 0
    if (!requisition.openings || requisition.openings <= 0) {
      throw new BadRequestException(
        'Cannot publish job requisition: Number of openings must be greater than 0',
      );
    }

    const update = { publishStatus: 'published', postingDate: new Date() };
    const updated = await this.jobModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException('Job Requisition not found');
    }
    return updated;
  }

  async previewJobRequisition(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job requisition ID format');
    }
    const job = await this.jobModel.findById(id).populate('templateId');
    if (!job) {
      throw new NotFoundException('Job Requisition not found');
    }
    return job;
  }

  async getAllJobRequisitions() {
    return this.jobModel.find();
  }

  async getJobRequisitionById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job requisition ID format');
    }
    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job Requisition not found');
    }
    return job;
  }

  async updateJobRequisitionStatus(id: string, newStatus: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job requisition ID format');
    }
    if (!newStatus || typeof newStatus !== 'string') {
      throw new BadRequestException('Invalid status value');
    }

    const jobRequisition = await this.jobModel.findById(id);
    if (!jobRequisition) {
      throw new NotFoundException('Job Requisition not found');
    }

    const update: any = {};

    // BR: Posting must be automatic once approved
    // If status is being set to 'approved' or similar, automatically publish
    if (
      newStatus.toLowerCase() === 'approved' &&
      jobRequisition.publishStatus === 'draft'
    ) {
      update.publishStatus = 'published';
      update.postingDate = new Date();
    }

    // Note: Progress field is calculated but not stored in schema (as per constraint)
    // Progress calculation is done dynamically when needed via calculateProgress()

    const updated = await this.jobModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException('Job Requisition not found');
    }
    return updated;
  }

  // ---------------------------------------------------
  // APPLICATIONS
  // ---------------------------------------------------
  async apply(
    dto: CreateApplicationDto,
    consentGiven: boolean = false,
  ): Promise<Application> {
    // Validate ObjectIds
    if (!Types.ObjectId.isValid(dto.candidateId)) {
      throw new BadRequestException('Invalid candidate ID format');
    }
    if (!Types.ObjectId.isValid(dto.requisitionId)) {
      throw new BadRequestException('Invalid requisition ID format');
    }
    if (dto.assignedHr && !Types.ObjectId.isValid(dto.assignedHr)) {
      throw new BadRequestException('Invalid assigned HR ID format');
    }

    // BR: Storing applications requires applicant authorization (REC-028)
    if (!consentGiven) {
      throw new BadRequestException(
        'Applicant consent for data processing is required before storing application. Please provide consent first.',
      );
    }

    // Validate candidate exists
    const candidate = await this.candidateModel.findById(dto.candidateId);
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // Check if job requisition exists and is published
    const jobRequisition = await this.jobModel.findById(dto.requisitionId);
    if (!jobRequisition) {
      throw new NotFoundException('Job requisition not found');
    }

    // Check if job requisition is closed
    if (jobRequisition.publishStatus === 'closed') {
      throw new BadRequestException('Cannot apply to a closed job requisition');
    }

    // Check if job requisition is published
    if (jobRequisition.publishStatus !== 'published') {
      throw new BadRequestException(
        'Cannot apply to a job that is not published',
      );
    }

    // Check if job requisition has expired
    if (
      jobRequisition.expiryDate &&
      new Date(jobRequisition.expiryDate) < new Date()
    ) {
      throw new BadRequestException(
        'Cannot apply to an expired job requisition',
      );
    }

    // Check if all positions are filled
    const hiredCount = await this.applicationModel.countDocuments({
      requisitionId: new Types.ObjectId(dto.requisitionId),
      status: ApplicationStatus.HIRED,
    });
    if (hiredCount >= jobRequisition.openings) {
      throw new BadRequestException(
        `All ${jobRequisition.openings} position(s) for this requisition have been filled. No more applications are being accepted.`,
      );
    }

    // Check if candidate already applied to this requisition
    const existingApplication = await this.applicationModel.findOne({
      candidateId: new Types.ObjectId(dto.candidateId),
      requisitionId: new Types.ObjectId(dto.requisitionId),
    });
    if (existingApplication) {
      throw new BadRequestException(
        'You have already applied to this position',
      );
    }

    const application = new this.applicationModel({
      candidateId: dto.candidateId,
      requisitionId: dto.requisitionId,
      assignedHr: dto.assignedHr || undefined,
      currentStage: ApplicationStage.SCREENING,
      status: ApplicationStatus.SUBMITTED,
    });
    return application.save();
  }

  async getAllApplications(
    requisitionId?: string,
    prioritizeReferrals: boolean = true,
  ) {
    const query: any = {};
    if (requisitionId) {
      if (!Types.ObjectId.isValid(requisitionId)) {
        throw new BadRequestException('Invalid requisition ID format');
      }
      query.requisitionId = new Types.ObjectId(requisitionId);
    }

    const applications = await this.applicationModel
      .find(query)
      .populate('candidateId')
      .lean();

    // BR: Referrals get preferential filtering (REC-030)
    if (prioritizeReferrals) {
      // Get all referral candidate IDs
      const referralCandidates = await this.referralModel
        .find()
        .select('candidateId')
        .lean();
      const referralCandidateIds = new Set(
        referralCandidates.map((ref: any) => ref.candidateId.toString()),
      );

      // Separate referrals from non-referrals
      const referrals: any[] = [];
      const nonReferrals: any[] = [];

      for (const app of applications) {
        const candidateId =
          (app as any).candidateId?._id?.toString() ||
          (app as any).candidateId?.toString();
        if (candidateId && referralCandidateIds.has(candidateId)) {
          referrals.push(app);
        } else {
          nonReferrals.push(app);
        }
      }

      // Return referrals first, then non-referrals
      return [...referrals, ...nonReferrals];
    }

    return applications;
  }

  async updateApplicationStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    changedBy?: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid application ID format');
    }

    // Get current application state
    const currentApplication = await this.applicationModel
      .findById(id)
      .populate('candidateId');
    if (!currentApplication) {
      throw new NotFoundException('Application not found');
    }

    const oldStatus = currentApplication.status;
    const oldStage = currentApplication.currentStage;

    // Validate status transition is allowed
    // Cannot transition from REJECTED or HIRED to other statuses
    if (
      oldStatus === ApplicationStatus.REJECTED &&
      dto.status !== ApplicationStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Cannot change status of a rejected application. Rejected applications cannot be reactivated.',
      );
    }
    if (
      oldStatus === ApplicationStatus.HIRED &&
      dto.status !== ApplicationStatus.HIRED
    ) {
      throw new BadRequestException(
        'Cannot change status of a hired application. Hired applications are final.',
      );
    }
    // Cannot go backwards in workflow (e.g., from OFFER to IN_PROCESS)
    const statusOrder = [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.IN_PROCESS,
      ApplicationStatus.OFFER,
      ApplicationStatus.HIRED,
    ];
    const oldIndex = statusOrder.indexOf(oldStatus);
    const newIndex = statusOrder.indexOf(dto.status);
    if (
      oldIndex > -1 &&
      newIndex > -1 &&
      newIndex < oldIndex &&
      dto.status !== ApplicationStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Invalid status transition: Cannot change from ${oldStatus} to ${dto.status}. Status can only progress forward in the workflow.`,
      );
    }

    // Determine new stage based on status
    let newStage = oldStage;
    if (dto.status === ApplicationStatus.REJECTED) {
      newStage = ApplicationStage.SCREENING; // Keep at screening if rejected
    } else if (dto.status === ApplicationStatus.IN_PROCESS) {
      if (oldStage === ApplicationStage.SCREENING) {
        newStage = ApplicationStage.DEPARTMENT_INTERVIEW;
      }
    } else if (dto.status === ApplicationStatus.OFFER) {
      newStage = ApplicationStage.OFFER;
    } else if (dto.status === ApplicationStatus.HIRED) {
      newStage = ApplicationStage.OFFER; // Already at offer stage when hired
    }

    // Update application
    const application = await this.applicationModel
      .findByIdAndUpdate(
        id,
        { status: dto.status, currentStage: newStage },
        { new: true },
      )
      .populate('candidateId');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Log status change history (REC-008: Track candidates through stages)
    try {
      if (changedBy && Types.ObjectId.isValid(changedBy)) {
        await this.applicationStatusHistoryModel.create({
          applicationId: new Types.ObjectId(id),
          oldStage: oldStage,
          newStage: newStage,
          oldStatus: oldStatus,
          newStatus: dto.status,
          changedBy: new Types.ObjectId(changedBy),
        });
      }
    } catch (e) {
      // non-critical, log but don't fail
      console.warn('Failed to log application status history:', e);
    }

    // REC-017, REC-022: Send notification to candidate about status update
    try {
      const candidate = (application as any).candidateId;
      if (candidate && candidate.personalEmail) {
        await this.sendNotification(
          'application_status',
          candidate.personalEmail,
          {
            candidateName: candidate.firstName || 'Candidate',
            status: dto.status,
          },
          { nonBlocking: true }, // Non-blocking - don't fail if email fails
        );
      }
    } catch (e) {
      // non-critical, log but don't fail
      console.warn('Failed to send status update notification:', e);
    }

    // Update related job requisition progress if possible
    try {
      const reqId = application.requisitionId;
      if (reqId) {
        const progress = this.calculateProgress(newStage);
        await this.jobModel.findByIdAndUpdate(reqId, { progress });

        // Auto-close requisition if all positions are filled
        if (dto.status === ApplicationStatus.HIRED) {
          const hiredCount = await this.applicationModel.countDocuments({
            requisitionId: reqId,
            status: ApplicationStatus.HIRED,
          });
          const requisition = await this.jobModel.findById(reqId);
          if (requisition && hiredCount >= requisition.openings) {
            await this.jobModel.findByIdAndUpdate(reqId, {
              publishStatus: 'closed',
            });
            console.log(
              `Job requisition ${reqId} automatically closed: all positions filled`,
            );
          }
        }
      }
    } catch (e) {
      // non-critical
      console.warn('Failed to update job requisition progress:', e);
    }

    return application;
  }

  // ---------------------------------------------------
  // INTERVIEWS
  // ---------------------------------------------------
  async scheduleInterview(dto: ScheduleInterviewDto) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(dto.applicationId)) {
      throw new BadRequestException('Invalid application ID format');
    }

    // Validate application exists
    const application = await this.applicationModel.findById(dto.applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Validate application is not rejected or hired
    if (application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot schedule interview for a rejected application',
      );
    }
    if (application.status === ApplicationStatus.HIRED) {
      throw new BadRequestException(
        'Cannot schedule interview for a hired candidate',
      );
    }

    // Convert ISO date string to Date object for proper storage
    const scheduledDate = new Date(dto.scheduledDate);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException(
        'Invalid scheduledDate format. Expected ISO 8601 date string.',
      );
    }

    // Validate scheduled date is in the future
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('Interview date must be in the future');
    }

    // Validate scheduled date is not too far in the future (reasonable limit: 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (scheduledDate > oneYearFromNow) {
      throw new BadRequestException(
        'Interview date cannot be more than 1 year in the future',
      );
    }

    // Check for duplicate interview for same application and stage
    const existingInterview = await this.interviewModel.findOne({
      applicationId: new Types.ObjectId(dto.applicationId),
      stage: dto.stage,
      status: { $ne: 'cancelled' }, // Allow if previous interview was cancelled
    });
    if (existingInterview) {
      throw new BadRequestException(
        `An interview for stage '${dto.stage}' already exists for this application. Please update the existing interview or cancel it first.`,
      );
    }

    // Validate panel member IDs if provided
    if (dto.panel && Array.isArray(dto.panel)) {
      if (dto.panel.length === 0) {
        throw new BadRequestException('Panel must have at least one member');
      }
      for (const panelId of dto.panel) {
        if (!Types.ObjectId.isValid(panelId)) {
          throw new BadRequestException(
            `Invalid panel member ID format: ${panelId}`,
          );
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

      // REC-011: Send calendar invites to panel members and notify candidate
      const candidate = (app as any)?.candidateId;
      const interviewDate = scheduledDate.toLocaleString();
      const methodText = dto.method || 'TBD';
      const videoLinkText = dto.videoLink
        ? `\nVideo Link: ${dto.videoLink}`
        : '';

      // REC-011: Notify candidate about interview scheduling
      if (candidate && candidate.personalEmail) {
        try {
          await this.sendNotification(
            'interview_scheduled',
            candidate.personalEmail,
            {
              candidateName: candidate.firstName || 'Candidate',
              interviewDate: interviewDate,
              method: methodText,
              videoLink: dto.videoLink,
            },
            { nonBlocking: true }, // Non-blocking - don't fail if email fails
          );
        } catch (e) {
          console.warn('Failed to send candidate interview notification:', e);
        }
      }

      // REC-011: Send email notifications to panel members
      // Note: Calendar invites would require a calendar API (Google Calendar, Outlook, etc.)
      // For now, we send email notifications with interview details
      if (dto.panel && dto.panel.length > 0) {
        // Get job requisition details for context
        const jobRequisition = app?.requisitionId
          ? await this.jobModel.findById(app.requisitionId).lean().exec()
          : null;
        const positionTitle = (jobRequisition as any)?.title || 'Position';

        // Send email notifications to each panel member using existing EmployeeProfileService
        for (const panelMemberId of dto.panel) {
          try {
            // Use existing EmployeeProfileService to get panel member details
            const panelMember =
              await this.employeeProfileService.findOne(panelMemberId);

            // Get email - prefer workEmail, fallback to personalEmail
            const panelMemberEmail =
              panelMember.workEmail || panelMember.personalEmail;

            if (panelMemberEmail) {
              await this.sendNotification(
                'panel_invitation',
                panelMemberEmail,
                {
                  interviewDate: interviewDate,
                  method: methodText,
                  videoLink: dto.videoLink,
                  candidateName:
                    candidate?.fullName || candidate?.firstName || 'Candidate',
                  position: positionTitle,
                },
                { nonBlocking: true }, // Non-blocking - don't fail if one email fails
              );
            } else {
              console.warn(
                `Panel member ${panelMemberId} has no email address. Notification skipped.`,
              );
            }
          } catch (error) {
            // Non-blocking - log error but continue with other panel members
            console.warn(
              `Failed to send panel invitation to ${panelMemberId}:`,
              error,
            );
          }
        }
      }
    } catch (e) {
      // non-critical
      console.warn('Failed to send interview notifications:', e);
    }

    return saved;
  }

  async updateInterviewStatus(id: string, dto: UpdateInterviewStatusDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid interview ID format');
    }

    const interview = await this.interviewModel.findById(id);
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    // Validate status transition
    // Cannot change status of completed or cancelled interviews
    if (interview.status === 'completed' && dto.status !== 'completed') {
      throw new BadRequestException(
        'Cannot change status of a completed interview',
      );
    }
    if (interview.status === 'cancelled' && dto.status !== 'cancelled') {
      throw new BadRequestException(
        'Cannot change status of a cancelled interview. Please schedule a new interview.',
      );
    }

    const updated = await this.interviewModel.findByIdAndUpdate(
      id,
      { status: dto.status },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Interview not found');
    }
    return updated;
  }

  // ---------------------------------------------------
  // OFFERS
  // ---------------------------------------------------
  async createOffer(dto: CreateOfferDto) {
    // Validate ObjectIds
    if (!Types.ObjectId.isValid(dto.applicationId)) {
      throw new BadRequestException('Invalid application ID format');
    }
    if (!Types.ObjectId.isValid(dto.candidateId)) {
      throw new BadRequestException('Invalid candidate ID format');
    }

    // Validate application exists
    const application = await this.applicationModel.findById(dto.applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Validate candidate matches application
    if (application.candidateId.toString() !== dto.candidateId) {
      throw new BadRequestException(
        'Candidate ID does not match the application',
      );
    }

    // Validate application is in valid status for offer
    if (application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot create offer for a rejected application',
      );
    }
    if (application.status === ApplicationStatus.HIRED) {
      throw new BadRequestException(
        'Cannot create offer for a hired candidate',
      );
    }

    // Check if offer already exists for this application
    const existingOffer = await this.offerModel.findOne({
      applicationId: new Types.ObjectId(dto.applicationId),
    });
    if (existingOffer) {
      throw new BadRequestException(
        'An offer already exists for this application',
      );
    }

    // Validate salary
    if (dto.grossSalary <= 0 || !Number.isFinite(dto.grossSalary)) {
      throw new BadRequestException('Gross salary must be a positive number');
    }

    // Validate signing bonus if provided
    if (
      dto.signingBonus !== undefined &&
      (dto.signingBonus < 0 || !Number.isFinite(dto.signingBonus))
    ) {
      throw new BadRequestException(
        'Signing bonus must be a non-negative number',
      );
    }

    // Convert ISO date string to Date object for proper storage
    const deadline = new Date(dto.deadline);
    if (isNaN(deadline.getTime())) {
      throw new BadRequestException(
        'Invalid deadline format. Expected ISO 8601 date string.',
      );
    }

    // Validate deadline is in the future
    if (deadline <= new Date()) {
      throw new BadRequestException('Deadline must be in the future');
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

    // REC-018: Send offer letter notification to candidate
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

        await this.sendNotification(
          'offer_letter',
          candidate.personalEmail,
          {
            candidateName: candidate.firstName || 'Candidate',
            role: dto.role,
            grossSalary: dto.grossSalary,
            signingBonus: dto.signingBonus,
            benefits: dto.benefits,
            deadline: offerDeadlineFormatted,
            content: dto.content,
          },
          { nonBlocking: true }, // Non-blocking - don't fail if email fails
        );
      }
    } catch (e) {
      // Non-critical - log but don't fail offer creation
      console.warn('Failed to send offer letter notification:', e);
    }

    return savedOffer;
  }

  async respondToOffer(id: string, dto: RespondToOfferDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid offer ID format');
    }

    // Get offer to validate deadline
    const offer = await this.offerModel.findById(id);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Check if offer is already finalized
    if (offer.finalStatus !== OfferFinalStatus.PENDING) {
      throw new BadRequestException(
        `Cannot respond to offer: Offer has already been finalized with status: ${offer.finalStatus}.`,
      );
    }

    // Check if offer deadline has passed
    if (offer.deadline && new Date(offer.deadline) < new Date()) {
      throw new BadRequestException(
        `Cannot respond to offer: The response deadline (${offer.deadline.toLocaleDateString()}) has passed. Please contact HR.`,
      );
    }

    // Check if offer has already been responded to
    if (offer.applicantResponse !== OfferResponseStatus.PENDING) {
      throw new BadRequestException(
        `Offer has already been ${offer.applicantResponse}. Cannot change response.`,
      );
    }

    const updateData: Partial<{
      applicantResponse: OfferResponseStatus;
      candidateSignedAt: Date;
    }> = { applicantResponse: dto.applicantResponse };

    // Track electronic signature when offer is accepted (REC-018)
    if (dto.applicantResponse === OfferResponseStatus.ACCEPTED) {
      updateData.candidateSignedAt = new Date();
    }

    const updated = await this.offerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('applicationId');
    if (!updated) {
      throw new NotFoundException('Offer not found');
    }

    // BR: Offer acceptance triggers Onboarding (REC-029)
    // When offer is accepted and finalized, trigger pre-boarding
    if (dto.applicantResponse === OfferResponseStatus.ACCEPTED) {
      try {
        const application = (updated as any).applicationId;
        if (application && application.candidateId) {
          // Note: Onboarding is typically created after employee profile is created
          // This happens in createEmployeeFromContract which is called after contract signing
          // For now, we log that onboarding should be triggered
          console.log(
            `Offer accepted. Onboarding should be triggered after employee profile creation for candidate: ${application.candidateId}`,
          );
        }
      } catch (e) {
        // Non-critical, onboarding will be created when employee profile is created
        console.warn('Could not trigger onboarding automatically:', e);
      }
    }

    return updated;
  }

  async finalizeOffer(id: string, dto: FinalizeOfferDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid offer ID format');
    }

    const offer = await this.offerModel.findById(id).populate('applicationId');
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Validate offer can be finalized
    // Cannot finalize if candidate hasn't responded
    if (offer.applicantResponse === OfferResponseStatus.PENDING) {
      throw new BadRequestException(
        'Cannot finalize offer: Candidate has not responded yet. Please wait for candidate response.',
      );
    }

    // Cannot change final status if already finalized (unless it's the same status)
    if (
      offer.finalStatus !== OfferFinalStatus.PENDING &&
      offer.finalStatus !== dto.finalStatus
    ) {
      throw new BadRequestException(
        `Offer has already been finalized with status: ${offer.finalStatus}. Cannot change final status.`,
      );
    }

    const updated = await this.offerModel.findByIdAndUpdate(
      id,
      { finalStatus: dto.finalStatus },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Offer not found');
    }

    // BR: When offer is approved and accepted, it's ready for onboarding
    // Onboarding is triggered when employee profile is created from contract (REC-029)
    if (
      dto.finalStatus === OfferFinalStatus.APPROVED &&
      offer.applicantResponse === OfferResponseStatus.ACCEPTED
    ) {
      try {
        const application = (offer as any).applicationId;
        if (application && application._id) {
          // Update application status to HIRED
          await this.applicationModel.findByIdAndUpdate(application._id, {
            status: ApplicationStatus.HIRED,
            currentStage: ApplicationStage.OFFER,
          });

          // Update job requisition progress
          if (application.requisitionId) {
            const progress = this.calculateProgress('hired');
            // Note: Progress field may not exist in schema, but Mongoose allows dynamic fields
            await this.jobModel.findByIdAndUpdate(application.requisitionId, {
              progress,
            });
          }

          console.log(
            `Offer finalized and approved. Ready for employee profile creation and onboarding trigger.`,
          );
        }
      } catch (e) {
        // Non-critical
        console.warn(
          'Could not update application status after offer finalization:',
          e,
        );
      }
    }

    return updated;
  }

  // ============================================================================
  // CENTRALIZED NOTIFICATION SYSTEM FOR RECRUITMENT SUBSYSTEM
  // ============================================================================
  // This method handles all notifications for the recruitment subsystem
  // Supports: Application status updates, Interview scheduling, Offers, Onboarding
  // ============================================================================

  /**
   * Centralized notification method for recruitment subsystem
   * Handles all notification types: application status, interviews, offers, onboarding
   *
   * @param notificationType - Type of notification to send
   * @param recipientEmail - Recipient email address
   * @param context - Context data for building notification content
   * @param options - Additional options (nonBlocking, etc.)
   */
  async sendNotification(
    notificationType:
      | 'application_status'
      | 'interview_scheduled'
      | 'offer_letter'
      | 'onboarding_welcome'
      | 'onboarding_reminder'
      | 'panel_invitation'
      | 'clearance_reminder'
      | 'access_revoked',
    recipientEmail: string,
    context: any,
    options?: { nonBlocking?: boolean },
  ): Promise<void> {
    // Validate recipient email
    if (
      !recipientEmail ||
      typeof recipientEmail !== 'string' ||
      recipientEmail.trim().length === 0
    ) {
      if (options?.nonBlocking) {
        console.warn('Recipient email is missing. Notification skipped.');
        return;
      }
      throw new BadRequestException('Recipient email is required');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      if (options?.nonBlocking) {
        console.warn(
          `Invalid recipient email format: ${recipientEmail}. Notification skipped.`,
        );
        return;
      }
      throw new BadRequestException('Invalid recipient email format');
    }

    // Build notification content based on type
    let subject: string;
    let text: string;

    try {
      switch (notificationType) {
        case 'application_status':
          // REC-017: Application status updates, REC-022: Automated rejection notifications
          subject =
            context.status === ApplicationStatus.REJECTED
              ? 'Application Update'
              : 'Application Status Update';

          const candidateName = context.candidateName || 'Candidate';
          text = `Dear ${candidateName},\n\n`;

          if (context.status === ApplicationStatus.REJECTED) {
            // REC-022: Automated rejection notification template
            text +=
              'Thank you for your interest in our company. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\n';
            text +=
              'We appreciate the time you invested in the application process and wish you the best in your job search.\n\n';
          } else if (context.status === ApplicationStatus.IN_PROCESS) {
            text += `Your application status has been updated to: In Process.\n\n`;
            text +=
              'We are currently reviewing your application and will keep you updated on the next steps.\n\n';
          } else if (context.status === ApplicationStatus.OFFER) {
            text += `Congratulations! Your application has progressed to the offer stage.\n\n`;
            text +=
              'You will receive further communication regarding the offer details shortly.\n\n';
          } else if (context.status === ApplicationStatus.HIRED) {
            text += `Congratulations! We are pleased to offer you the position.\n\n`;
            text +=
              'You will receive further communication regarding onboarding and next steps.\n\n';
          } else {
            text += `Your application status has been updated to: ${context.status}.\n\n`;
          }
          text += 'Best regards,\nHR Team';
          break;

        case 'interview_scheduled':
          // REC-011: Interview scheduling notifications
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
          // REC-018: Offer letter notifications
          const role = context.role || 'the position';
          const grossSalary = context.grossSalary
            ? `$${context.grossSalary.toLocaleString()}`
            : 'TBD';
          const signingBonus = context.signingBonus
            ? `$${context.signingBonus.toLocaleString()}`
            : null;
          const benefits =
            context.benefits && context.benefits.length > 0
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
          if (signingBonus) text += `- Signing Bonus: ${signingBonus}\n`;
          if (benefits) text += `- Benefits: ${benefits}\n`;
          text += `- Response Deadline: ${deadline}\n\n`;
          if (offerContent) text += `${offerContent}\n\n`;
          text += `Please review the offer details carefully. You can accept or decline this offer through the system.\n\n`;
          text += `If you have any questions, please contact HR.\n\n`;
          text += `Best regards,\nHR Team`;
          break;

        case 'onboarding_welcome':
          // ONB-005: Welcome notification for new hires
          subject = 'Welcome! Onboarding Checklist Created';
          const taskCount = context.taskCount || 0;
          text = `Dear ${context.employeeName || 'New Hire'},\n\n`;
          text += `Your onboarding checklist has been created with ${taskCount} tasks to complete.\n\n`;
          text += `Please log in to view your onboarding tracker and complete the required steps.\n\n`;
          text += `Best regards,\nHR Team`;
          break;

        case 'onboarding_reminder':
          // ONB-005: Reminders for overdue or upcoming tasks
          subject = 'Onboarding Reminder';
          const overdueTasks = context.overdueTasks || [];
          const upcomingTasks = context.upcomingTasks || [];

          text = `Dear ${context.employeeName || 'New Hire'},\n\n`;

          if (overdueTasks.length > 0) {
            text += `You have ${overdueTasks.length} overdue task(s):\n`;
            overdueTasks.forEach((task: any) => {
              text += `- ${task.name} (${task.department})\n`;
            });
            text += '\n';
          }

          if (upcomingTasks.length > 0) {
            text += `You have ${upcomingTasks.length} task(s) due soon:\n`;
            upcomingTasks.forEach((task: any) => {
              const daysLeft = task.daysLeft || 0;
              text += `- ${task.name} (${task.department}) - Due in ${daysLeft} day(s)\n`;
            });
            text += '\n';
          }

          text += 'Please complete these tasks as soon as possible.\n\n';
          text += 'Best regards,\nHR Team';
          break;

        case 'panel_invitation':
          // REC-011: Interview panel member invitations
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
          // OFF-REMIND: Clearance reminder notifications
          // context should include: employeeName, checklistId, department, itemName, dueDate (optional), comment
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
          if (context.note) text += `Note: ${context.note}\n\n`;
          text += `Please review and take action via the HR system (clearance checklist ID: ${context.checklistId}).\n\n`;
          text += `Best regards,\nHR Team`;
          break;

        case 'access_revoked':
          // OFF-007: notification confirming account/system access revocation
          subject = `Access Revoked - ${context.employeeName || context.employeeNumber || 'Employee'}`;
          text = `Dear ${context.employeeName || 'Employee'},\n\n`;
          text += `Your system access has been revoked for security/compliance reasons.${context.reason ? '\n\nReason: ' + context.reason : ''}\n\n`;
          text += `If you believe this was done in error please contact HR or IT immediately.\n\n`;
          text += `Best regards,\nSecurity Team`;
          break;

        default:
          throw new BadRequestException(
            `Unknown notification type: ${notificationType}`,
          );
      }

      // Send the notification using the email service
      await this.sendEmailInternal(recipientEmail, subject, text);
    } catch (error) {
      if (options?.nonBlocking) {
        // Non-blocking: log error but don't throw
        console.warn(
          `Failed to send ${notificationType} notification to ${recipientEmail}:`,
          error,
        );
        return;
      }
      // Blocking: re-throw error
      throw error;
    }
  }

  /**
   * Internal email sending method (low-level)
   * This is the actual email sending implementation
   */
  private async sendEmailInternal(
    recipient: string,
    subject: string,
    text: string,
  ): Promise<void> {
    // Validate subject
    if (
      !subject ||
      typeof subject !== 'string' ||
      subject.trim().length === 0
    ) {
      throw new BadRequestException('Email subject is required');
    }

    // Validate text content
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new BadRequestException('Email text content is required');
    }

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. Email will not be sent.');
      return; // Don't throw error, just log warning
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER, // Use environment variable
          pass: process.env.EMAIL_PASS, // Use environment variable
        },
      });

      await transporter.sendMail({
        from: '"HR System" <your-email@gmail.com>',
        to: recipient.trim(),
        subject: subject.trim(),
        text: text.trim(),
      });
    } catch (error) {
      // Log error but don't throw - email sending failures should not break the main flow
      console.error('Failed to send email:', error);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use sendNotification() instead for better structure
   */
  async sendEmail(recipient: string, subject: string, text: string) {
    return this.sendEmailInternal(recipient, subject, text);
  }

  // ============= ONBOARDING METHODS =============

  /**
   * ONB-001: Create onboarding task checklists
   * BR: Triggered by offer acceptance; checklists customizable
   * Auto-generates tasks for IT, Admin, and HR departments
   */
  async createOnboarding(
    createOnboardingDto: CreateOnboardingDto,
    contractSigningDate?: Date,
    startDate?: Date,
    workEmail?: string,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(createOnboardingDto.employeeId.toString())) {
        throw new BadRequestException('Invalid employee ID format');
      }

      const existingOnboarding = await this.onboardingModel
        .findOne({ employeeId: createOnboardingDto.employeeId })
        .lean();
      if (existingOnboarding) {
        throw new BadRequestException(
          'Onboarding checklist already exists for this employee',
        );
      }

      // Calculate deadlines based on start date (default to 7 days before start date)
      const defaultDeadline = startDate
        ? new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days before start
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      // Auto-generate standard tasks if not provided (ONB-001: Customizable checklists)
      const tasks = createOnboardingDto.tasks || [];

      // If no tasks provided, auto-generate based on business rules
      if (tasks.length === 0) {
        // IT Tasks (ONB-009: System access provisioning)
        // Include generated work email in task notes for IT reference
        const emailNote = workEmail
          ? `Automated task: Email account provisioning\nEmail to create: ${workEmail}`
          : 'Automated task: Email account provisioning';
        tasks.push({
          name: 'Allocate Email Account',
          department: 'IT',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: emailNote,
        });
        tasks.push({
          name: 'Allocate Laptop/Equipment',
          department: 'IT',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Hardware allocation',
        });
        tasks.push({
          name: 'Set up System Access (SSO)',
          department: 'IT',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: SSO and internal systems access',
        });

        // Admin Tasks (ONB-012: Equipment, desk, and access cards)
        tasks.push({
          name: 'Reserve Workspace/Desk',
          department: 'Admin',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Workspace allocation',
        });
        tasks.push({
          name: 'Issue ID Badge/Access Card',
          department: 'Admin',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Access card provisioning',
        });

        // HR Tasks (ONB-018, ONB-019: Payroll and benefits)
        tasks.push({
          name: 'Create Payroll Profile',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: contractSigningDate || defaultDeadline,
          notes: 'Automated task: Payroll initiation (REQ-PY-23)',
        });
        tasks.push({
          name: 'Process Signing Bonus',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: contractSigningDate || defaultDeadline,
          notes: 'Automated task: Signing bonus processing (REQ-PY-27)',
        });
        tasks.push({
          name: 'Set up Benefits',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Benefits enrollment',
        });

        // New Hire Tasks (ONB-007: Document upload)
        tasks.push({
          name: 'Upload Signed Contract',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Required: Signed contract document',
        });
        tasks.push({
          name: 'Upload ID Document',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Required: Government-issued ID for compliance',
        });
        tasks.push({
          name: 'Upload Certifications',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
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

      // ONB-005: Send initial welcome notification to new hire
      try {
        const employee = await this.employeeProfileService.findOne(
          createOnboardingDto.employeeId.toString(),
        );
        if (employee && (employee as any).personalEmail) {
          await this.sendNotification(
            'onboarding_welcome',
            (employee as any).personalEmail,
            {
              employeeName: (employee as any).firstName || 'New Hire',
              taskCount: tasks.length,
            },
            { nonBlocking: true }, // Non-blocking - don't fail if email fails
          );
        }
      } catch (e) {
        // Non-critical
        console.warn('Failed to send onboarding welcome notification:', e);
      }

      return saved.toObject();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create onboarding: ' + this.getErrorMessage(error),
      );
    }
  }

  async getAllOnboardings(): Promise<any[]> {
    try {
      return await this.onboardingModel.find().select('-__v').lean().exec();
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch onboarding records: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * ONB-004: View onboarding tracker with progress
   * BR: Tracker and reminders required
   */
  async getOnboardingByEmployeeId(employeeId: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }
      const onboarding = await this.onboardingModel
        .findOne({
          $or: [
            { employeeId: employeeId },
            { employeeId: new Types.ObjectId(employeeId) },
          ],
        })
        .select('-__v')
        .lean()
        .exec();

      if (!onboarding) {
        throw new NotFoundException(
          'Onboarding checklist not found for this employee',
        );
      }

      // Calculate progress for tracker (ONB-004)
      const totalTasks = onboarding.tasks?.length || 0;
      const completedTasks =
        onboarding.tasks?.filter(
          (task: any) => task.status === OnboardingTaskStatus.COMPLETED,
        ).length || 0;
      const inProgressTasks =
        onboarding.tasks?.filter(
          (task: any) => task.status === OnboardingTaskStatus.IN_PROGRESS,
        ).length || 0;
      const pendingTasks =
        onboarding.tasks?.filter(
          (task: any) => task.status === OnboardingTaskStatus.PENDING,
        ).length || 0;
      const overdueTasks =
        onboarding.tasks?.filter((task: any) => {
          if (!task.deadline) return false;
          return (
            new Date(task.deadline) < new Date() &&
            task.status !== OnboardingTaskStatus.COMPLETED
          );
        }).length || 0;

      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get next task to complete
      const nextTask = onboarding.tasks?.find(
        (task: any) => task.status === OnboardingTaskStatus.PENDING,
      );

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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch onboarding: ' + this.getErrorMessage(error),
      );
    }
  }

  async getOnboardingById(id: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }
      const onboarding = await this.onboardingModel
        .findById(id)
        .select('-__v')
        .lean()
        .exec();
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }
      return onboarding;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch onboarding: ' + this.getErrorMessage(error),
      );
    }
  }

  async updateOnboarding(
    id: string,
    updateOnboardingDto: UpdateOnboardingDto,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }
      const onboarding = await this.onboardingModel
        .findByIdAndUpdate(id, { $set: updateOnboardingDto }, { new: true })
        .select('-__v')
        .lean()
        .exec();
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }
      return onboarding;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update onboarding: ' + this.getErrorMessage(error),
      );
    }
  }

  async updateOnboardingTask(
    onboardingId: string,
    taskIndex: number,
    updateTaskDto: UpdateOnboardingTaskDto,
  ): Promise<any> {
    try {
      // Validate ObjectId
      if (!Types.ObjectId.isValid(onboardingId)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }

      // Validate task index
      if (!Number.isInteger(taskIndex) || taskIndex < 0) {
        throw new BadRequestException('Invalid task index');
      }

      const onboarding = await this.onboardingModel.findById(onboardingId);
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }
      if (taskIndex >= onboarding.tasks.length) {
        throw new BadRequestException('Invalid task index');
      }
      // Validate task status if provided
      if (
        updateTaskDto.status &&
        !Object.values(OnboardingTaskStatus).includes(updateTaskDto.status)
      ) {
        throw new BadRequestException(
          `Invalid task status: ${updateTaskDto.status}`,
        );
      }

      Object.assign(onboarding.tasks[taskIndex], updateTaskDto);
      // Only set completedAt if status is actually COMPLETED
      if (updateTaskDto.status === OnboardingTaskStatus.COMPLETED) {
        onboarding.tasks[taskIndex].completedAt = new Date();
      } else if (
        updateTaskDto.status &&
        onboarding.tasks[taskIndex].completedAt
      ) {
        // Clear completedAt if status changed from COMPLETED to something else
        onboarding.tasks[taskIndex].completedAt = undefined;
      }
      const allCompleted =
        onboarding.tasks.length > 0 &&
        onboarding.tasks.every(
          (task) => task.status === OnboardingTaskStatus.COMPLETED,
        );
      if (allCompleted) {
        onboarding.completed = true;
        onboarding.completedAt = new Date();
      } else if (onboarding.completed) {
        // If a task is uncompleted, mark onboarding as incomplete
        onboarding.completed = false;
        onboarding.completedAt = undefined;
      }
      const saved = await onboarding.save();
      return saved.toObject();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update task: ' + this.getErrorMessage(error),
      );
    }
  }

  async addTaskToOnboarding(onboardingId: string, taskDto: any): Promise<any> {
    try {
      // Validate ObjectId
      if (!Types.ObjectId.isValid(onboardingId)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }

      const onboarding = await this.onboardingModel.findById(onboardingId);
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // Validate task data
      if (
        !taskDto.name ||
        typeof taskDto.name !== 'string' ||
        taskDto.name.trim().length === 0
      ) {
        throw new BadRequestException(
          'Task name is required and must be a non-empty string',
        );
      }
      if (
        !taskDto.department ||
        typeof taskDto.department !== 'string' ||
        taskDto.department.trim().length === 0
      ) {
        throw new BadRequestException(
          'Task department is required and must be a non-empty string',
        );
      }

      // Check if onboarding is already completed
      if (onboarding.completed) {
        throw new BadRequestException(
          'Cannot add tasks to a completed onboarding checklist',
        );
      }

      onboarding.tasks.push({
        ...taskDto,
        status: taskDto.status || OnboardingTaskStatus.PENDING,
      });
      const saved = await onboarding.save();
      return saved.toObject();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to add task: ' + this.getErrorMessage(error),
      );
    }
  }

  async removeTaskFromOnboarding(
    onboardingId: string,
    taskIndex: number,
  ): Promise<any> {
    try {
      // Validate ObjectId
      if (!Types.ObjectId.isValid(onboardingId)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }

      // Validate task index
      if (!Number.isInteger(taskIndex) || taskIndex < 0) {
        throw new BadRequestException('Invalid task index');
      }

      const onboarding = await this.onboardingModel.findById(onboardingId);
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }
      if (taskIndex >= onboarding.tasks.length) {
        throw new BadRequestException('Invalid task index');
      }

      // Check if task is completed - warn but allow removal
      const task = onboarding.tasks[taskIndex];
      if (task.status === OnboardingTaskStatus.COMPLETED) {
        console.warn(`Removing completed task: ${task.name}`);
      }

      onboarding.tasks.splice(taskIndex, 1);
      const saved = await onboarding.save();
      return saved.toObject();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to remove task: ' + this.getErrorMessage(error),
      );
    }
  }

  async deleteOnboarding(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }
      const result = await this.onboardingModel.findByIdAndDelete(id);
      if (!result) {
        throw new NotFoundException('Onboarding not found');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to delete onboarding: ' + this.getErrorMessage(error),
      );
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
        completionRate:
          total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%',
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch stats: ' + this.getErrorMessage(error),
      );
    }
  }
  // ============= DOCUMENT UPLOAD METHODS (ONB-007) =============

  /**
   * Upload document for onboarding task
   * ONB-007: Document upload for compliance
   */
  async uploadTaskDocument(
    onboardingId: string,
    taskIndex: number,
    file: any,
    documentType: DocumentType,
  ): Promise<any> {
    try {
      // 1. Validate ObjectId
      if (!Types.ObjectId.isValid(onboardingId)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }

      // 2. Validate task index
      if (!Number.isInteger(taskIndex) || taskIndex < 0) {
        throw new BadRequestException('Invalid task index');
      }

      // 3. Validate file exists
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      // 4. Validate onboarding exists
      const onboarding = await this.onboardingModel.findById(onboardingId);
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // 5. Validate task index is within bounds
      if (taskIndex >= onboarding.tasks.length) {
        throw new BadRequestException('Invalid task index');
      }

      // 6. Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Allowed: jpg, jpeg, png, pdf, doc, docx',
        );
      }

      // 7. Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (!file.size || file.size > maxSize) {
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      // 8. Validate file path exists
      if (!file.path) {
        throw new BadRequestException('File path is missing');
      }

      // 9. Use the file path that Multer already saved
      // (Multer's diskStorage already saved the file for us)
      const filePath = file.path;

      // 10. Create Document record
      const document = new this.documentModel({
        ownerId: onboarding.employeeId,
        type: documentType,
        filePath: filePath,
        uploadedAt: new Date(),
      });

      const savedDocument = await document.save();

      // 11. Update task with documentId
      onboarding.tasks[taskIndex].documentId = savedDocument._id;

      // Auto-complete task if it was pending
      if (onboarding.tasks[taskIndex].status === OnboardingTaskStatus.PENDING) {
        onboarding.tasks[taskIndex].status = OnboardingTaskStatus.COMPLETED;
        onboarding.tasks[taskIndex].completedAt = new Date();
      }

      // 12. Check if all tasks completed
      const allCompleted = onboarding.tasks.every(
        (task) => task.status === OnboardingTaskStatus.COMPLETED,
      );

      if (allCompleted) {
        onboarding.completed = true;
        onboarding.completedAt = new Date();
      }

      // 13. Save onboarding
      const savedOnboarding = await onboarding.save();

      return {
        message: 'Document uploaded successfully',
        document: savedDocument.toObject(),
        onboarding: savedOnboarding.toObject(),
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Download document by ID
   */
  async downloadDocument(documentId: string, res: Response): Promise<void> {
    try {
      // 1. Validate ObjectId
      if (!Types.ObjectId.isValid(documentId)) {
        throw new BadRequestException('Invalid document ID format');
      }

      // 2. Find document
      const document = await this.documentModel.findById(documentId).lean();
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // 3. Check file exists on disk
      if (!document.filePath) {
        throw new NotFoundException('File path not found in document record');
      }

      const fileExists = await fs.pathExists(document.filePath);
      if (!fileExists) {
        throw new NotFoundException('File not found on server');
      }

      // 4. Send file
      res.download(document.filePath);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to download document: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * Get document attached to specific task
   */
  async getTaskDocument(onboardingId: string, taskIndex: number): Promise<any> {
    try {
      // 1. Validate ObjectId
      if (!Types.ObjectId.isValid(onboardingId)) {
        throw new BadRequestException('Invalid onboarding ID format');
      }

      // 2. Validate task index
      if (!Number.isInteger(taskIndex) || taskIndex < 0) {
        throw new BadRequestException('Invalid task index');
      }

      // 3. Find onboarding
      const onboarding = await this.onboardingModel
        .findById(onboardingId)
        .lean();
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // 4. Validate task index is within bounds
      if (taskIndex >= onboarding.tasks.length) {
        throw new BadRequestException('Invalid task index');
      }

      const task = onboarding.tasks[taskIndex];
      if (!task.documentId) {
        throw new NotFoundException('No document attached to this task');
      }

      const document = await this.documentModel
        .findById(task.documentId)
        .lean();
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      return document;
    } catch (error) {
      console.error('Error getting task document:', error);
      throw error;
    }
  }

  /**
   * Delete document (optional - for cleanup)
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // 1. Validate ObjectId
      if (!Types.ObjectId.isValid(documentId)) {
        throw new BadRequestException('Invalid document ID format');
      }

      // 2. Find document
      const document = await this.documentModel.findById(documentId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // 3. Delete file from disk if it exists
      if (document.filePath) {
        try {
          const fileExists = await fs.pathExists(document.filePath);
          if (fileExists) {
            await fs.remove(document.filePath);
          }
        } catch (fileError) {
          // Log but don't fail if file deletion fails
          console.warn('Failed to delete file from disk:', fileError);
        }
      }

      // 4. Delete document record
      await this.documentModel.findByIdAndDelete(documentId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to delete document: ' + this.getErrorMessage(error),
      );
    }
  }

  // ============= EMPLOYEE CREATION FROM CONTRACT =============

  /**
   * Create employee profile from accepted offer and signed contract
   * HR Manager can access signed contract details to create employee profile
   */
  async createEmployeeFromContract(
    offerId: string,
    dto: CreateEmployeeFromContractDto,
  ): Promise<any> {
    try {
      // 1. Validate and get offer
      if (!Types.ObjectId.isValid(offerId)) {
        throw new BadRequestException('Invalid offer ID');
      }

      const offer = (await this.offerModel.findById(offerId).lean()) as
        | (Offer & { _id: Types.ObjectId })
        | null;
      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      // 2. Validate offer status - must be accepted by candidate AND approved
      if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
        throw new BadRequestException(
          'Offer must be accepted by candidate before creating employee profile',
        );
      }

      if (offer.finalStatus !== OfferFinalStatus.APPROVED) {
        throw new BadRequestException(
          'Offer must be approved before creating employee profile',
        );
      }

      // 3. Find contract for this offer
      let contract: (Contract & { _id: Types.ObjectId }) | null = null;
      if (dto.contractId) {
        if (!Types.ObjectId.isValid(dto.contractId)) {
          throw new BadRequestException('Invalid contract ID format');
        }
        contract = await this.contractModel.findById(dto.contractId).lean();
        if (!contract) {
          throw new NotFoundException('Contract not found');
        }
        // Validate contract matches the offer
        const contractOfferId = contract.offerId
          ? contract.offerId.toString()
          : null;
        if (contractOfferId && contractOfferId !== offerId) {
          throw new BadRequestException(
            'Contract does not match the specified offer',
          );
        }
      } else {
        // Find contract by offerId
        contract = await this.contractModel
          .findOne({ offerId: new Types.ObjectId(offerId) })
          .lean();
      }

      // 4. Validate contract exists and has signed document
      if (!contract) {
        throw new NotFoundException(
          'No contract found for this offer. Please create and upload signed contract first.',
        );
      }

      if (!contract.documentId) {
        throw new BadRequestException(
          'Contract must have a signed document attached before creating employee profile',
        );
      }

      // 5. Verify the contract document exists
      const contractDocument = await this.documentModel
        .findById(contract.documentId)
        .lean();
      if (!contractDocument) {
        throw new NotFoundException('Signed contract document not found');
      }

      // 6. Get candidate data
      const candidate = await this.candidateModel
        .findById(offer.candidateId)
        .lean();
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      // 7. Generate work email if not provided
      // Format: firstname.lastname@company.com
      // Handles duplicates by appending numbers
      let workEmail = dto.workEmail;
      if (!workEmail) {
        const firstName =
          candidate.firstName
            ?.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '') || 'user';
        const lastName =
          candidate.lastName
            ?.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '') || '';

        // Generate base email
        const baseEmail = lastName
          ? `${firstName}.${lastName}@company.com`
          : `${firstName}@company.com`;

        // Check for duplicates - try to find existing employee with this email
        // Note: Email uniqueness will be enforced at employee creation level
        // For now, we generate the email and let the employee service handle uniqueness
        workEmail = baseEmail;

        // In production, you might want to check for duplicates here
        // For now, we rely on the employee profile service to handle uniqueness
      }

      // 8. Map data to CreateEmployeeDto
      const createEmployeeDto: CreateEmployeeDto = {
        // Personal info from candidate
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

        // Work info from offer/contract
        workEmail: workEmail,
        dateOfHire: contract.acceptanceDate || new Date(),
        contractStartDate: contract.acceptanceDate,
        contractEndDate: undefined, // Can be set manually by HR if needed
        contractType: dto.contractType,
        workType: dto.workType,
        status: EmployeeStatus.PROBATION, // Default to probation for new hires

        // Organizational assignment (from DTO or can be derived from offer)
        primaryDepartmentId: dto.primaryDepartmentId,
        supervisorPositionId: dto.supervisorPositionId,
        payGradeId: dto.payGradeId,

        // Position - Note: primaryPositionId should be set separately by HR if needed
        // Using primaryDepartmentId as fallback is incorrect, so leaving undefined
        primaryPositionId: undefined,
      };

      // ============= INTEGRATION: Organization Structure Service =============
      // Validate department and position exist and are active before creating employee
      // BR: Ensure organizational structure is valid before employee creation

      // Validate primary department if provided
      if (dto.primaryDepartmentId) {
        try {
          const department =
            await this.organizationStructureService.getDepartmentById(
              dto.primaryDepartmentId,
            );
          if (!department.isActive) {
            throw new BadRequestException(
              `Department with ID ${dto.primaryDepartmentId} is not active. Cannot assign employee to inactive department.`,
            );
          }
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new BadRequestException(
              `Department with ID ${dto.primaryDepartmentId} not found. Please provide a valid department ID.`,
            );
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(
            `Failed to validate department: ${this.getErrorMessage(error)}`,
          );
        }
      }

      // Validate supervisor position if provided
      if (dto.supervisorPositionId) {
        try {
          const position =
            await this.organizationStructureService.getPositionById(
              dto.supervisorPositionId,
            );
          if (!position.isActive) {
            throw new BadRequestException(
              `Position with ID ${dto.supervisorPositionId} is not active. Cannot assign supervisor with inactive position.`,
            );
          }

          // Validate that the supervisor position belongs to the same department (if department is provided)
          if (dto.primaryDepartmentId && position.departmentId) {
            const positionDeptId = position.departmentId.toString();
            const employeeDeptId = dto.primaryDepartmentId.toString();
            if (positionDeptId !== employeeDeptId) {
              throw new BadRequestException(
                `Supervisor position (${dto.supervisorPositionId}) belongs to a different department than the employee's assigned department (${dto.primaryDepartmentId}).`,
              );
            }
          }
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new BadRequestException(
              `Position with ID ${dto.supervisorPositionId} not found. Please provide a valid position ID.`,
            );
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(
            `Failed to validate position: ${this.getErrorMessage(error)}`,
          );
        }
      }
      // ============= END INTEGRATION =============

      // 9. Create employee profile
      const employee =
        await this.employeeProfileService.create(createEmployeeDto);

      // Get employee ID consistently - handle both _id (Mongoose) and id (serialized) formats
      const employeeId =
        (employee as any)._id?.toString() || (employee as any).id?.toString();
      if (!employeeId || !Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException(
          'Failed to retrieve valid employee ID after creation',
        );
      }

      // 10. ONB-001, ONB-002: Trigger onboarding creation with auto-generated tasks
      // BR: Triggered by offer acceptance; checklists customizable
      let onboardingCreated = null;
      try {
        const contractSigningDate = contract.acceptanceDate || new Date();
        const startDate = createEmployeeDto.dateOfHire || contractSigningDate;

        onboardingCreated = await this.createOnboarding(
          {
            employeeId: new Types.ObjectId(employeeId),
            tasks: [], // Auto-generate tasks
          },
          contractSigningDate,
          startDate,
          workEmail, // Pass work email to include in onboarding tasks
        );

        // ONB-018: Automatically trigger payroll initiation
        if (contract.grossSalary && contract.grossSalary > 0) {
          try {
            await this.triggerPayrollInitiation(
              employeeId,
              contractSigningDate,
              contract.grossSalary,
            );
          } catch (e) {
            console.warn('Failed to trigger payroll initiation:', e);
          }
        }

        // ONB-019: Automatically process signing bonus
        if (contract.signingBonus && contract.signingBonus > 0) {
          try {
            await this.processSigningBonus(
              employeeId,
              contract.signingBonus,
              contractSigningDate,
            );
          } catch (e) {
            console.warn('Failed to process signing bonus:', e);
          }
        }

        // ONB-013: Schedule access provisioning for start date
        try {
          await this.scheduleAccessProvisioning(employeeId, startDate);
        } catch (e) {
          console.warn('Failed to schedule access provisioning:', e);
        }
      } catch (e) {
        // Non-critical - onboarding can be created manually if auto-creation fails
        console.warn('Failed to create onboarding automatically:', e);
      }

      // 11. Return success response with employee and contract details
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
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create employee from contract: ' +
          this.getErrorMessage(error),
      );
    }
  }

  // ============= REFERRALS (REC-030) =============

  /**
   * REC-030: Tag candidate as referral
   * HR Employee can tag candidates as referrals to give them higher priority
   */
  async tagCandidateAsReferral(
    candidateId: string,
    referringEmployeeId: string,
    role?: string,
    level?: string,
  ): Promise<any> {
    try {
      // Validate ObjectIds
      if (!Types.ObjectId.isValid(candidateId)) {
        throw new BadRequestException('Invalid candidate ID format');
      }
      if (!Types.ObjectId.isValid(referringEmployeeId)) {
        throw new BadRequestException('Invalid referring employee ID format');
      }

      // Check if candidate exists
      const candidate = await this.candidateModel.findById(candidateId);
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      // Check if referral already exists
      const existingReferral = await this.referralModel.findOne({
        candidateId: new Types.ObjectId(candidateId),
        referringEmployeeId: new Types.ObjectId(referringEmployeeId),
      });

      if (existingReferral) {
        throw new BadRequestException(
          'Candidate is already tagged as a referral by this employee',
        );
      }

      // Create referral record
      const referral = new this.referralModel({
        candidateId: new Types.ObjectId(candidateId),
        referringEmployeeId: new Types.ObjectId(referringEmployeeId),
        role: role || '',
        level: level || '',
      });

      const saved = await referral.save();
      return saved.toObject();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to tag candidate as referral: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * Get all referrals for a candidate
   */
  async getCandidateReferrals(candidateId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(candidateId)) {
      throw new BadRequestException('Invalid candidate ID format');
    }
    return this.referralModel
      .find({ candidateId: new Types.ObjectId(candidateId) })
      .populate('referringEmployeeId')
      .lean()
      .exec();
  }

  // ============= CANDIDATE CONSENT (REC-028) =============

  /**
   * REC-028: Record candidate consent for data processing
   * Note: This stores consent as metadata. For full GDPR compliance,
   * a consent schema may be needed to track consent history and withdrawals.
   */
  async recordCandidateConsent(
    candidateId: string,
    consentGiven: boolean,
    consentType: string = 'data_processing',
    notes?: string,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(candidateId)) {
        throw new BadRequestException('Invalid candidate ID format');
      }

      const candidate = await this.candidateModel.findById(candidateId);
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      // Store consent in candidate notes or create a separate consent record
      // For now, we'll add it to the candidate's notes field
      // In production, you should create a separate Consent schema for GDPR compliance
      const consentNote = `[CONSENT ${new Date().toISOString()}] ${consentType}: ${consentGiven ? 'GRANTED' : 'DENIED'}${notes ? ` - ${notes}` : ''}`;
      const updatedNotes = candidate.notes
        ? `${candidate.notes}\n${consentNote}`
        : consentNote;

      const updated = await this.candidateModel.findByIdAndUpdate(
        candidateId,
        { notes: updatedNotes },
        { new: true },
      );

      return {
        candidateId: updated?._id,
        consentGiven,
        consentType,
        recordedAt: new Date(),
        message: 'Consent recorded successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to record candidate consent: ' + this.getErrorMessage(error),
      );
    }
  }

  // ============= INTERVIEW FEEDBACK & ASSESSMENT (REC-011, REC-020) =============

  /**
   * REC-011, REC-020: Submit interview feedback and assessment score
   * Interviewers provide structured feedback and scoring
   */
  async submitInterviewFeedback(
    interviewId: string,
    interviewerId: string,
    score: number,
    comments?: string,
  ): Promise<any> {
    try {
      // Validate ObjectIds
      if (!Types.ObjectId.isValid(interviewId)) {
        throw new BadRequestException('Invalid interview ID format');
      }
      if (!Types.ObjectId.isValid(interviewerId)) {
        throw new BadRequestException('Invalid interviewer ID format');
      }

      // Validate score (typically 0-100 or 0-10)
      if (score < 0 || score > 100) {
        throw new BadRequestException('Score must be between 0 and 100');
      }

      // Check if interview exists
      const interview = await this.interviewModel.findById(interviewId);
      if (!interview) {
        throw new NotFoundException('Interview not found');
      }

      // Validate interview status - cannot submit feedback for cancelled interviews
      if (interview.status === 'cancelled') {
        throw new BadRequestException(
          'Cannot submit feedback for a cancelled interview',
        );
      }

      // Check if interview has been scheduled (basic validation)
      if (!interview.scheduledDate) {
        throw new BadRequestException('Interview has not been scheduled yet');
      }

      // Validate that interview has been conducted (scheduled date is in the past) - optional business rule
      // Allow feedback submission even if interview is in the future (for pre-interview notes)
      // But warn if interview is more than 1 day in the future
      if (
        interview.scheduledDate &&
        new Date(interview.scheduledDate) >
          new Date(Date.now() + 24 * 60 * 60 * 1000)
      ) {
        console.warn(
          `Feedback submitted for interview scheduled more than 1 day in the future: ${interview.scheduledDate}`,
        );
      }

      // Check if interviewer is part of the panel
      const panelIds = interview.panel?.map((id: any) => id.toString()) || [];
      if (panelIds.length === 0) {
        throw new BadRequestException(
          'Interview panel is empty. Cannot submit feedback without panel members.',
        );
      }
      if (!panelIds.includes(interviewerId)) {
        throw new BadRequestException(
          'Interviewer is not part of the interview panel',
        );
      }

      // Check if feedback already exists for this interviewer
      const existingFeedback = await this.assessmentResultModel.findOne({
        interviewId: new Types.ObjectId(interviewId),
        interviewerId: new Types.ObjectId(interviewerId),
      });

      let assessmentResult;
      if (existingFeedback) {
        // Update existing feedback
        assessmentResult = await this.assessmentResultModel.findByIdAndUpdate(
          existingFeedback._id,
          { score, comments },
          { new: true },
        );
      } else {
        // Create new feedback
        assessmentResult = new this.assessmentResultModel({
          interviewId: new Types.ObjectId(interviewId),
          interviewerId: new Types.ObjectId(interviewerId),
          score,
          comments: comments || '',
        });
        assessmentResult = await assessmentResult.save();

        // Link feedback to interview
        await this.interviewModel.findByIdAndUpdate(interviewId, {
          feedbackId: assessmentResult._id,
        });
      }

      return assessmentResult.toObject();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to submit interview feedback: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * Get all feedback for an interview
   */
  async getInterviewFeedback(interviewId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(interviewId)) {
      throw new BadRequestException('Invalid interview ID format');
    }

    return this.assessmentResultModel
      .find({ interviewId: new Types.ObjectId(interviewId) })
      .populate('interviewerId')
      .lean()
      .exec();
  }

  /**
   * Get average score for an interview
   */
  async getInterviewAverageScore(interviewId: string): Promise<number> {
    if (!Types.ObjectId.isValid(interviewId)) {
      throw new BadRequestException('Invalid interview ID format');
    }

    const feedbacks = await this.assessmentResultModel
      .find({
        interviewId: new Types.ObjectId(interviewId),
      })
      .lean();

    if (feedbacks.length === 0) {
      return 0;
    }

    const totalScore = feedbacks.reduce(
      (sum, feedback) => sum + (feedback.score || 0),
      0,
    );
    return totalScore / feedbacks.length;
  }

  /**
   * BR: Ranking rules enforced - Get ranked applications based on assessment scores
   * Applications are ranked by: 1) Referral status, 2) Average interview scores, 3) Application date
   */
  async getRankedApplications(requisitionId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(requisitionId)) {
      throw new BadRequestException('Invalid requisition ID format');
    }

    // Validate requisition exists
    const requisition = await this.jobModel.findById(requisitionId);
    if (!requisition) {
      throw new NotFoundException('Job requisition not found');
    }

    // Get all applications for this requisition
    const applications = await this.applicationModel
      .find({ requisitionId: new Types.ObjectId(requisitionId) })
      .populate('candidateId')
      .lean();

    // Handle empty applications
    if (!applications || applications.length === 0) {
      return [];
    }

    // Get all referrals
    const referrals = await this.referralModel.find().lean();
    const referralCandidateIds = new Set(
      referrals.map((ref: any) => ref.candidateId.toString()),
    );

    // Get all interviews and their scores
    const interviews = await this.interviewModel
      .find({
        applicationId: { $in: applications.map((app: any) => app._id) },
      })
      .lean();

    const interviewScores: Record<string, number> = {};
    for (const interview of interviews) {
      const interviewId = (interview as any)._id.toString();
      const avgScore = await this.getInterviewAverageScore(interviewId);
      const applicationId = (interview as any).applicationId.toString();
      if (
        !interviewScores[applicationId] ||
        avgScore > interviewScores[applicationId]
      ) {
        interviewScores[applicationId] = avgScore;
      }
    }

    // Rank applications
    const ranked = applications.map((app: any) => {
      const candidateId =
        app.candidateId?._id?.toString() || app.candidateId?.toString();
      const isReferral = candidateId && referralCandidateIds.has(candidateId);
      const appId = app._id.toString();
      const score = interviewScores[appId] || 0;

      return {
        ...app,
        isReferral,
        averageScore: score,
        rankingScore: isReferral ? score + 10 : score, // Referrals get +10 bonus
      };
    });

    // Sort by ranking score (descending), then by application date
    ranked.sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    });

    return ranked;
  }

  // ============= ONBOARDING ENHANCEMENTS =============

  /**
   * ONB-005: Send reminders for overdue or upcoming tasks
   * BR: Reminders required
   */
  async sendOnboardingReminders(): Promise<void> {
    try {
      const allOnboardings = await this.onboardingModel
        .find({ completed: false })
        .populate('employeeId')
        .lean();

      for (const onboarding of allOnboardings) {
        const employee = (onboarding as any).employeeId;
        if (!employee || !employee.personalEmail) continue;

        const overdueTasks =
          onboarding.tasks?.filter((task: any) => {
            if (
              !task.deadline ||
              task.status === OnboardingTaskStatus.COMPLETED
            )
              return false;
            const deadline = new Date(task.deadline);
            const now = new Date();
            return deadline < now;
          }) || [];

        const upcomingTasks =
          onboarding.tasks?.filter((task: any) => {
            if (
              !task.deadline ||
              task.status === OnboardingTaskStatus.COMPLETED
            )
              return false;
            const deadline = new Date(task.deadline);
            const now = new Date();
            const daysUntilDeadline = Math.ceil(
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return daysUntilDeadline <= 2 && daysUntilDeadline > 0; // 2 days or less
          }) || [];

        if (overdueTasks.length > 0 || upcomingTasks.length > 0) {
          // Format tasks for notification
          const formattedOverdueTasks = overdueTasks.map((task: any) => ({
            name: task.name,
            department: task.department,
          }));

          const formattedUpcomingTasks = upcomingTasks.map((task: any) => {
            const deadline = new Date(task.deadline);
            const daysLeft = Math.ceil(
              (deadline.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return {
              name: task.name,
              department: task.department,
              daysLeft: daysLeft,
            };
          });

          try {
            await this.sendNotification(
              'onboarding_reminder',
              employee.personalEmail,
              {
                employeeName: employee.firstName || 'New Hire',
                overdueTasks: formattedOverdueTasks,
                upcomingTasks: formattedUpcomingTasks,
              },
              { nonBlocking: true }, // Non-blocking - don't fail if email fails
            );
          } catch (e) {
            console.warn(
              `Failed to send reminder to ${employee.personalEmail}:`,
              e,
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending onboarding reminders:', error);
    }
  }

  /**
   * ONB-009: Provision system access (SSO/email/tools)
   * BR: IT access automated
   */
  async provisionSystemAccess(
    employeeId: string,
    taskIndex: number,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      if (taskIndex < 0 || taskIndex >= onboarding.tasks.length) {
        throw new BadRequestException('Invalid task index');
      }

      const task = onboarding.tasks[taskIndex];
      if (task.department !== 'IT') {
        throw new BadRequestException('This method is only for IT tasks');
      }

      // Mark task as in progress
      task.status = OnboardingTaskStatus.IN_PROGRESS;
      await onboarding.save();

      // ============= INTEGRATION: IT System & Time Management Service =============
      // ONB-009: Provision system access (SSO/email/tools)
      // BR: IT access automated
      // TODO: Uncomment when IT service and Time Management Service are ready

      // Get employee details for provisioning
      // const employee = await this.employeeProfileService.findOne(employeeId);
      // if (!employee) {
      //   throw new NotFoundException('Employee not found');
      // }

      // 1. Provision email account (work email should already be generated in createEmployeeFromContract)
      // const workEmail = employee.workEmail;
      // await this.itService.provisionEmailAccount({
      //   employeeId: employeeId,
      //   email: workEmail,
      //   firstName: employee.firstName,
      //   lastName: employee.lastName,
      // });

      // 2. Set up SSO access
      // await this.itService.provisionSSOAccess({
      //   employeeId: employeeId,
      //   email: workEmail,
      //   departmentId: employee.primaryDepartmentId,
      // });

      // 3. Grant access to internal systems based on department/position
      // await this.itService.grantSystemAccess({
      //   employeeId: employeeId,
      //   departmentId: employee.primaryDepartmentId,
      //   positionId: employee.primaryPositionId,
      // });

      // 4. Allocate hardware (laptop, etc.)
      // await this.itService.allocateHardware({
      //   employeeId: employeeId,
      //   departmentId: employee.primaryDepartmentId,
      //   workType: employee.workType,
      // });

      // 5. INTEGRATION: Time Management Service - Provision clock access
      // ONB-009: Clock access should be provisioned for time tracking
      // await this.timeManagementService.provisionClockAccess({
      //   employeeId: employeeId,
      //   startDate: new Date(), // Or use onboarding start date
      // });
      // ============= END INTEGRATION =============

      // For now, we simulate the process
      console.log(
        `Provisioning system access for employee ${employeeId}: ${task.name}`,
      );

      // Mark as completed after provisioning
      task.status = OnboardingTaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.notes =
        (task.notes || '') +
        `\n[${new Date().toISOString()}] System access provisioned automatically.`;

      await onboarding.save();

      return {
        message: 'System access provisioned successfully',
        task: task,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to provision system access: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * ONB-012: Reserve and track equipment, desk, and access cards
   * BR: All resources tracked
   */
  async reserveEquipment(
    employeeId: string,
    equipmentType: string,
    equipmentDetails: any,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }

      // Validate equipmentType
      if (
        !equipmentType ||
        typeof equipmentType !== 'string' ||
        equipmentType.trim().length === 0
      ) {
        throw new BadRequestException(
          'Equipment type is required and must be a non-empty string',
        );
      }

      // Validate equipmentDetails
      if (!equipmentDetails || typeof equipmentDetails !== 'object') {
        throw new BadRequestException(
          'Equipment details are required and must be an object',
        );
      }

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // Check if onboarding is already completed
      if (onboarding.completed) {
        throw new BadRequestException(
          'Cannot reserve equipment for a completed onboarding checklist',
        );
      }

      // Find Admin tasks related to equipment
      const adminTasks = onboarding.tasks.filter(
        (task: any) => task.department === 'Admin',
      );

      if (adminTasks.length === 0) {
        throw new BadRequestException(
          'No Admin tasks found in onboarding checklist',
        );
      }

      let targetTask = null;
      if (equipmentType === 'workspace' || equipmentType === 'desk') {
        targetTask = adminTasks.find(
          (task: any) =>
            task.name.includes('Workspace') || task.name.includes('Desk'),
        );
      } else if (equipmentType === 'access_card' || equipmentType === 'badge') {
        targetTask = adminTasks.find(
          (task: any) =>
            task.name.includes('ID Badge') || task.name.includes('Access Card'),
        );
      } else {
        throw new BadRequestException(
          `Invalid equipment type: ${equipmentType}. Valid types: workspace, desk, access_card, badge`,
        );
      }

      if (!targetTask) {
        throw new BadRequestException(
          `No matching Admin task found for equipment type: ${equipmentType}`,
        );
      }

      const taskIndex = onboarding.tasks.indexOf(targetTask);
      targetTask.status = OnboardingTaskStatus.IN_PROGRESS;
      targetTask.notes =
        (targetTask.notes || '') +
        `\n[${new Date().toISOString()}] Reserved: ${JSON.stringify(equipmentDetails)}`;

      await onboarding.save();

      return {
        message: `${equipmentType} reserved successfully`,
        taskIndex,
        equipmentDetails,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to reserve equipment: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * ONB-013: Schedule automatic account provisioning and revocation
   * BR: Provisioning and security must be consistent
   */
  async scheduleAccessProvisioning(
    employeeId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }

      // Validate startDate
      if (!startDate || isNaN(new Date(startDate).getTime())) {
        throw new BadRequestException(
          'Invalid start date format. Expected ISO 8601 date string or Date object.',
        );
      }

      const startDateObj = new Date(startDate);
      if (startDateObj < new Date()) {
        throw new BadRequestException('Start date cannot be in the past');
      }

      // Validate endDate if provided
      if (endDate !== undefined && endDate !== null) {
        if (isNaN(new Date(endDate).getTime())) {
          throw new BadRequestException(
            'Invalid end date format. Expected ISO 8601 date string or Date object.',
          );
        }
        const endDateObj = new Date(endDate);
        if (endDateObj <= startDateObj) {
          throw new BadRequestException('End date must be after start date');
        }
      }

      // ============= INTEGRATION: IT Service & Time Management Service =============
      // ONB-013: Schedule automatic account provisioning and revocation
      // BR: Provisioning and security must be consistent
      // TODO: Uncomment when IT service and Time Management Service are ready

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // Get employee details
      // const employee = await this.employeeProfileService.findOne(employeeId);
      // if (!employee) {
      //   throw new NotFoundException('Employee not found');
      // }

      // 1. Schedule provisioning job for startDate
      // await this.itService.scheduleProvisioning({
      //   employeeId: employeeId,
      //   scheduledDate: startDate,
      //   workEmail: employee.workEmail,
      //   departmentId: employee.primaryDepartmentId,
      //   positionId: employee.primaryPositionId,
      // });

      // 2. Schedule revocation job for endDate (if provided) - for future offboarding
      // if (endDate) {
      //   await this.itService.scheduleRevocation({
      //     employeeId: employeeId,
      //     scheduledDate: endDate,
      //     reason: 'Contract end date reached',
      //   });
      // }

      // 3. INTEGRATION: Time Management Service - Schedule clock access provisioning
      // await this.timeManagementService.scheduleClockAccessProvisioning({
      //   employeeId: employeeId,
      //   startDate: startDate,
      //   endDate: endDate, // If provided, schedule revocation
      // });

      // 4. Store scheduling information in onboarding tasks
      // Update IT tasks with scheduled dates
      const itTasks = onboarding.tasks.filter(
        (task: any) => task.department === 'IT',
      );
      if (itTasks.length === 0) {
        throw new BadRequestException(
          'No IT tasks found in onboarding checklist. Cannot schedule access provisioning.',
        );
      }
      for (const task of itTasks) {
        const taskDeadline = task.deadline;
        if (!taskDeadline || new Date(taskDeadline) > startDateObj) {
          task.deadline = startDateObj;
          task.notes =
            (task.notes || '') +
            `\n[${new Date().toISOString()}] Scheduled for automatic provisioning on ${startDateObj.toISOString()}`;
          if (endDate) {
            task.notes += `\n[${new Date().toISOString()}] Scheduled for automatic revocation on ${new Date(endDate).toISOString()}`;
          }
        }
      }
      // ============= END INTEGRATION =============

      await onboarding.save();

      return {
        message: 'Access provisioning scheduled',
        startDate: startDateObj,
        endDate: endDate ? new Date(endDate) : undefined,
        note: endDate
          ? `Access will be provisioned on ${startDateObj.toISOString()} and revoked on ${new Date(endDate).toISOString()}`
          : `Access will be provisioned on ${startDateObj.toISOString()}`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to schedule access provisioning: ' +
          this.getErrorMessage(error),
      );
    }
  }

  /**
   * ONB-018: Automatically handle payroll initiation based on contract signing day
   * BR: Payroll trigger automatic (REQ-PY-23)
   */
  async triggerPayrollInitiation(
    employeeId: string,
    contractSigningDate: Date,
    grossSalary: number,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }

      // Validate contract signing date
      if (
        !contractSigningDate ||
        isNaN(new Date(contractSigningDate).getTime())
      ) {
        throw new BadRequestException('Invalid contract signing date format');
      }

      // Validate gross salary
      if (!grossSalary || grossSalary <= 0 || !Number.isFinite(grossSalary)) {
        throw new BadRequestException('Gross salary must be a positive number');
      }

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // Find HR payroll task
      const payrollTask = onboarding.tasks.find(
        (task: any) =>
          task.department === 'HR' &&
          (task.name.includes('Payroll') || task.name.includes('payroll')),
      );

      if (!payrollTask) {
        throw new BadRequestException(
          'Payroll task not found in onboarding checklist',
        );
      }

      // ============= INTEGRATION: Payroll Execution Service =============
      // ONB-018: Automatically handle payroll initiation based on contract signing day
      // BR: Payroll trigger automatic (REQ-PY-23)
      // TODO: Uncomment when PayrollExecutionService is ready

      // Get employee details
      // const employee = await this.employeeProfileService.findOne(employeeId);
      // if (!employee) {
      //   throw new NotFoundException('Employee not found');
      // }

      // 1. Call payroll service to initiate payroll for the employee
      // const payrollInitiationResult = await this.payrollExecutionService.initiateEmployeePayroll({
      //   employeeId: employeeId,
      //   baseSalary: grossSalary,
      //   contractSigningDate: contractSigningDate,
      //   startDate: employee.dateOfHire || contractSigningDate,
      //   departmentId: employee.primaryDepartmentId,
      //   positionId: employee.primaryPositionId,
      //   payGradeId: employee.payGradeId,
      // });

      // 2. Set up payroll cycle based on contract signing date
      // await this.payrollExecutionService.setupPayrollCycle({
      //   employeeId: employeeId,
      //   startDate: contractSigningDate,
      //   payrollRunId: payrollInitiationResult.payrollRunId, // If returned from initiation
      // });

      // 3. Configure salary and deductions (if needed)
      // await this.payrollExecutionService.configureEmployeePayrollDetails({
      //   employeeId: employeeId,
      //   baseSalary: grossSalary,
      //   // Additional configuration based on employee profile
      // });

      // For now, we mark the task and log the action
      payrollTask.status = OnboardingTaskStatus.COMPLETED;
      payrollTask.completedAt = new Date();
      payrollTask.notes =
        (payrollTask.notes || '') +
        `\n[${new Date().toISOString()}] Payroll initiated automatically. ` +
        `Contract signed: ${contractSigningDate.toISOString()}, Gross Salary: ${grossSalary}`;
      // Add integration result to notes when ready:
      // `\n[INTEGRATION] Payroll Run ID: ${payrollInitiationResult.payrollRunId}`;

      await onboarding.save();

      console.log(
        `Payroll initiation triggered for employee ${employeeId} (REQ-PY-23)`,
      );
      // ============= END INTEGRATION =============

      return {
        message: 'Payroll initiation triggered successfully',
        contractSigningDate,
        grossSalary,
        task: payrollTask,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to trigger payroll initiation: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * ONB-019: Automatically process signing bonuses based on contract
   * BR: Bonuses treated as distinct payroll components (REQ-PY-27)
   */
  async processSigningBonus(
    employeeId: string,
    signingBonus: number,
    contractSigningDate: Date,
  ): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }

      // Validate signing bonus amount
      if (
        !signingBonus ||
        signingBonus <= 0 ||
        !Number.isFinite(signingBonus)
      ) {
        throw new BadRequestException(
          'Signing bonus must be a positive number',
        );
      }

      // Validate contract signing date
      if (
        !contractSigningDate ||
        isNaN(new Date(contractSigningDate).getTime())
      ) {
        throw new BadRequestException('Invalid contract signing date format');
      }

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // Find HR signing bonus task
      const bonusTask = onboarding.tasks.find(
        (task: any) =>
          task.department === 'HR' &&
          (task.name.includes('Signing Bonus') ||
            task.name.includes('signing bonus')),
      );

      if (!bonusTask) {
        throw new BadRequestException(
          'Signing bonus task not found in onboarding checklist',
        );
      }

      // ============= INTEGRATION: Payroll Execution Service =============
      // ONB-019: Automatically process signing bonuses based on contract
      // BR: Bonuses treated as distinct payroll components (REQ-PY-27)
      // TODO: Uncomment when PayrollExecutionService is ready

      // Get employee details
      // const employee = await this.employeeProfileService.findOne(employeeId);
      // if (!employee) {
      //   throw new NotFoundException('Employee not found');
      // }

      // 1. Call payroll service to process signing bonus
      // Reference: EmployeeSigningBonus schema in payroll-execution/models/EmployeeSigningBonus.schema.ts
      // const signingBonusResult = await this.payrollExecutionService.processSigningBonus({
      //   employeeId: employeeId,
      //   signingBonusAmount: signingBonus,
      //   contractSigningDate: contractSigningDate,
      //   paymentDate: contractSigningDate, // Or schedule for first payroll cycle
      //   status: 'pending', // Will be updated to 'approved' or 'paid' by payroll service
      // });

      // 2. Add bonus as distinct payroll component
      // The EmployeeSigningBonus record is created in the payroll-execution subsystem
      // This creates a record in the employeeSigningBonus collection

      // 3. Schedule bonus payment (if not immediate)
      // await this.payrollExecutionService.scheduleBonusPayment({
      //   employeeId: employeeId,
      //   signingBonusId: signingBonusResult.signingBonusId,
      //   scheduledPaymentDate: contractSigningDate, // Or first payroll date
      // });

      // For now, we mark the task and log the action
      bonusTask.status = OnboardingTaskStatus.COMPLETED;
      bonusTask.completedAt = new Date();
      bonusTask.notes =
        (bonusTask.notes || '') +
        `\n[${new Date().toISOString()}] Signing bonus processed automatically. ` +
        `Amount: ${signingBonus}, Contract signed: ${contractSigningDate.toISOString()}`;
      // Add integration result to notes when ready:
      // `\n[INTEGRATION] Signing Bonus ID: ${signingBonusResult.signingBonusId}`;

      await onboarding.save();

      console.log(
        `Signing bonus processed for employee ${employeeId} (REQ-PY-27): ${signingBonus}`,
      );
      // ============= END INTEGRATION =============

      return {
        message: 'Signing bonus processed successfully',
        signingBonus,
        contractSigningDate,
        task: bonusTask,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to process signing bonus: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * Cancel/terminate onboarding in case of no-show
   * BR: Allow onboarding cancellation/termination
   */
  async cancelOnboarding(employeeId: string, reason: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException('Invalid employee ID format');
      }

      // Validate reason
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new BadRequestException(
          'Cancellation reason is required and must be a non-empty string',
        );
      }

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // Check if already completed
      if (onboarding.completed) {
        throw new BadRequestException(
          'Cannot cancel a completed onboarding checklist',
        );
      }

      // Mark all pending tasks as cancelled
      for (const task of onboarding.tasks) {
        const taskStatus = task.status;
        if (
          taskStatus === OnboardingTaskStatus.PENDING ||
          taskStatus === OnboardingTaskStatus.IN_PROGRESS
        ) {
          task.status = OnboardingTaskStatus.PENDING; // Keep as pending but mark onboarding as cancelled
          task.notes =
            (task.notes || '') +
            `\n[${new Date().toISOString()}] CANCELLED: ${reason}`;
        }
      }

      // Mark onboarding as cancelled (we can't change schema, so we'll use a note or status field if available)
      // Since we can't modify schema, we'll add a cancellation note to the first task
      if (onboarding.tasks.length > 0) {
        onboarding.tasks[0].notes =
          (onboarding.tasks[0].notes || '') +
          `\n[${new Date().toISOString()}] ONBOARDING CANCELLED: ${reason}`;
      }

      await onboarding.save();

      // Revoke any provisioned access (ONB-013)
      console.log(
        `Onboarding cancelled for employee ${employeeId}. Access revocation should be triggered.`,
      );

      return {
        message: 'Onboarding cancelled successfully',
        reason,
        employeeId,
        note: 'All pending tasks have been cancelled. System access revocation should be scheduled.',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to cancel onboarding: ' + this.getErrorMessage(error),
      );
    }
  }

  // ================================== OFFBOARDING =======================================

  // 1) CREATE TERMINATION / RESIGNATION REQUEST
  async createTerminationRequest(dto: CreateTerminationRequestDto, user: any) {
    // Guard: user must be authenticated
    if (!user || !user.role) {
      throw new ForbiddenException('User role missing from token.');
    }

    // Validate employeeId format (employeeNumber)
    if (
      !dto.employeeId ||
      typeof dto.employeeId !== 'string' ||
      dto.employeeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Employee ID (employeeNumber) is required and must be a non-empty string',
      );
    }

    // Validate initiator
    if (
      !dto.initiator ||
      !Object.values(TerminationInitiation).includes(dto.initiator)
    ) {
      throw new BadRequestException(
        'Invalid termination initiator. Must be one of: employee, hr, manager',
      );
    }

    // Find employee by employeeNumber (EMP-001, EMP-002, ...)
    const employee = await this.employeeModel
      .findOne({ employeeNumber: dto.employeeId })
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    // --- A) RESIGNATION: employee initiates their own request ---
    if (dto.initiator === TerminationInitiation.EMPLOYEE) {
      // Must be an EMPLOYEE in token
      if (user.role !== SystemRole.DEPARTMENT_EMPLOYEE) {
        throw new ForbiddenException(
          'Only employees can initiate a resignation.',
        );
      }

      // Optional extra safety: make sure the employee is resigning themselves
      if (user.employeeNumber && user.employeeNumber !== dto.employeeId) {
        throw new ForbiddenException(
          'You can only submit a resignation for your own profile.',
        );
      }

      const termination = await this.terminationModel.create({
        employeeId: employee._id,
        initiator: dto.initiator, // 'employee'
        reason: dto.reason,
        employeeComments: dto.employeeComments,
        terminationDate: dto.terminationDate
          ? new Date(dto.terminationDate)
          : undefined,
        status: TerminationStatus.PENDING,
        // no separate contract entity → use employee._id as dummy ObjectId
        contractId: employee._id,
      });

      return termination;
    }

    // --- B) HR TERMINATION BASED ON PERFORMANCE AND WARNINGS ---
    if (
      dto.initiator === TerminationInitiation.HR ||
      dto.initiator === TerminationInitiation.MANAGER
    ) {
      // Only HR_MANAGER is allowed to do this
      if (user.role !== SystemRole.HR_MANAGER) {
        throw new ForbiddenException(
          'Only HR Manager can initiate termination based on performance.',
        );
      }

      // ============================================================================
      // OFF-001: WARNINGS/DISCIPLINARY CHECK (PLACEHOLDER)
      // ============================================================================
      // TODO: Integrate with Warnings/Disciplinary Service when available
      // The Warnings Service does not exist yet. When implemented, uncomment below:
      //
      // let warningsCount = 0;
      // let warningsInfo = '';
      // try {
      //   const warnings = await this.warningsService.getActiveWarnings(employee._id);
      //   if (warnings && warnings.length > 0) {
      //     warningsCount = warnings.length;
      //     warningsInfo = ` with ${warningsCount} active warning(s)`;
      //   }
      // } catch (err) {
      //   console.warn('Failed to fetch warnings for employee:', this.getErrorMessage(err) || err);
      // }
      // ============================================================================

      // Get latest performance appraisal for this employee
      const latestRecord = await this.appraisalRecordModel
        .findOne({ employeeProfileId: employee._id })
        .sort({ createdAt: -1 })
        .exec();

      if (!latestRecord) {
        throw new ForbiddenException(
          'Cannot terminate: employee has no appraisal record.',
        );
      }

      if (
        latestRecord.totalScore === undefined ||
        latestRecord.totalScore === null
      ) {
        throw new ForbiddenException(
          'Cannot terminate: appraisal has no total score.',
        );
      }

      // Example rule: only allow termination if totalScore < 2.5
      // TODO: When warnings integration is available, also allow termination based on warnings count
      // e.g., if (latestRecord.totalScore >= 2.5 && warningsCount < 3) { throw... }
      if (latestRecord.totalScore >= 2.5) {
        throw new ForbiddenException(
          'Cannot terminate: performance score is not low enough for termination.',
        );
      }

      const termination = await this.terminationModel.create({
        employeeId: employee._id,
        initiator: dto.initiator, // 'hr' or 'manager'
        reason:
          dto.reason ||
          `Termination due to poor performance (score: ${latestRecord.totalScore})`,
        employeeComments: dto.employeeComments,
        terminationDate: dto.terminationDate
          ? new Date(dto.terminationDate)
          : undefined,
        status: TerminationStatus.PENDING,
        contractId: employee._id,
      });

      return termination;
    }

    // --- C) Any other initiator value ---
    throw new ForbiddenException('Unsupported termination initiator.');
  }

  // 2) GET TERMINATION REQUEST
  async getTerminationRequestById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid termination request ID format');
    }

    const termination = await this.terminationModel.findById(id).exec();
    if (!termination) {
      throw new NotFoundException('Termination request not found.');
    }

    return termination;
  }

  // 2b) GET MY RESIGNATION REQUESTS (for employees)
  async getMyResignationRequests(user: any) {
    if (!user || !user.role) {
      throw new ForbiddenException('Unauthorized');
    }

    // Only EMPLOYEE role can call this endpoint to fetch their own resignations
    if (user.role !== SystemRole.DEPARTMENT_EMPLOYEE) {
      throw new ForbiddenException(
        'Only employees can access their resignation requests.',
      );
    }

    const employeeNumber = user.employeeNumber;
    if (!employeeNumber) {
      throw new BadRequestException('Employee number not present in token');
    }

    const employee = await this.employeeModel
      .findOne({ employeeNumber })
      .exec();
    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    const requests = await this.terminationModel
      .find({ employeeId: employee._id })
      .sort({ createdAt: -1 })
      .exec();
    return requests;
  }

  // 3) HR UPDATES TERMINATION STATUS
  async updateTerminationStatus(
    id: string,
    dto: UpdateTerminationStatusDto,
    user: any,
  ) {
    // Only HR Manager
    if (!user || user.role !== SystemRole.HR_MANAGER) {
      throw new ForbiddenException(
        'Only HR Manager can update termination status.',
      );
    }

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid termination request ID format');
    }

    // Validate status
    if (!dto.status || !Object.values(TerminationStatus).includes(dto.status)) {
      throw new BadRequestException('Invalid termination status');
    }

    const termination = await this.terminationModel.findById(id);
    if (!termination) {
      throw new NotFoundException('Termination request not found.');
    }

    // Validate status transition - cannot change from APPROVED to other statuses
    if (
      termination.status === TerminationStatus.APPROVED &&
      dto.status !== TerminationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Cannot change status of an approved termination request',
      );
    }

    termination.status = dto.status;

    if (dto.hrComments !== undefined) {
      termination.hrComments = dto.hrComments;
    }

    if (dto.terminationDate) {
      termination.terminationDate = new Date(dto.terminationDate);
    }

    const saved = await termination.save();

    // When approved → create clearance checklist (if it doesn't already exist)
    if (dto.status === TerminationStatus.APPROVED) {
      try {
        // Check if checklist already exists
        const existingChecklist = await this.clearanceModel.findOne({
          terminationId: termination._id,
        });
        if (!existingChecklist) {
          await this.createClearanceChecklist(
            {
              terminationId: termination._id.toString(),
            } as CreateClearanceChecklistDto,
            user,
          );
        }
      } catch (e) {
        // Non-critical - log but don't fail status update
        console.warn('Failed to create clearance checklist automatically:', e);
      }
    }

    return saved;
  }

  // 4) UPDATE TERMINATION DETAILS (reason/comments/date)
  async updateTerminationDetails(
    id: string,
    dto: UpdateTerminationDetailsDto,
    user: any,
  ) {
    // Reasonable to restrict to HR Manager
    if (!user || user.role !== SystemRole.HR_MANAGER) {
      throw new ForbiddenException(
        'Only HR Manager can edit termination details.',
      );
    }

    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid termination request ID format');
    }

    // Validate termination exists
    const termination = await this.terminationModel.findById(id);
    if (!termination) {
      throw new NotFoundException('Termination request not found.');
    }

    // Cannot edit approved terminations
    if (termination.status === TerminationStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot edit details of an approved termination request',
      );
    }

    // Validate termination date if provided
    if (dto.terminationDate) {
      const terminationDate = new Date(dto.terminationDate);
      if (isNaN(terminationDate.getTime())) {
        throw new BadRequestException(
          'Invalid termination date format. Expected ISO 8601 date string.',
        );
      }
      // OFF-004 FIX: Only validate future dates for HR/Manager-initiated terminations
      // Allow past dates for employee-initiated resignations (employee may have already left)
      if (
        terminationDate < new Date() &&
        termination.initiator !== TerminationInitiation.EMPLOYEE
      ) {
        throw new BadRequestException(
          'Termination date cannot be in the past for HR/Manager initiated terminations',
        );
      }
    }

    const update: any = {};

    if (dto.reason !== undefined) {
      if (typeof dto.reason !== 'string' || dto.reason.trim().length === 0) {
        throw new BadRequestException('Reason must be a non-empty string');
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
      throw new NotFoundException('Termination request not found.');
    }
    return updated;
  }

  // 5) CREATE CLEARANCE CHECKLIST
  async createClearanceChecklist(dto: CreateClearanceChecklistDto, user: any) {
    // Only HR Manager
    if (!user || user.role !== SystemRole.HR_MANAGER) {
      throw new ForbiddenException(
        'Only HR Manager can create clearance checklist.',
      );
    }

    // Validate terminationId format
    if (!dto.terminationId || !Types.ObjectId.isValid(dto.terminationId)) {
      throw new BadRequestException('Invalid termination ID format');
    }

    // Validate termination exists
    const termination = await this.terminationModel.findById(dto.terminationId);
    if (!termination) {
      throw new NotFoundException('Termination request not found.');
    }

    // Check if checklist already exists for this termination
    const existingChecklist = await this.clearanceModel.findOne({
      terminationId: new Types.ObjectId(dto.terminationId),
    });
    if (existingChecklist) {
      throw new BadRequestException(
        'Clearance checklist already exists for this termination request',
      );
    }

    // Build the clearance checklist.
    // 1) Add a LINE_MANAGER step (mapped to department manager) — assigned when resolvable
    // 2) Auto-populate equipmentList using Onboarding reservation notes (best-effort)
    // 3) Keep existing department items intact

    // find employee record referenced by the termination (guarded — may be missing)
    const employee = await this.employeeModel
      .findById(termination.employeeId)
      .exec();
    if (!employee) {
      // Employee unexpectedly missing — create checklist without department manager/equipment
      const checklistFallback = new this.clearanceModel({
        terminationId: new Types.ObjectId(dto.terminationId),
        items: [
          {
            department: 'LINE_MANAGER',
            assignedTo: null,
            status: ApprovalStatus.PENDING,
          },
          { department: 'HR', status: ApprovalStatus.PENDING },
          { department: 'IT', status: ApprovalStatus.PENDING },
          { department: 'FINANCE', status: ApprovalStatus.PENDING },
          { department: 'FACILITIES', status: ApprovalStatus.PENDING },
          { department: 'ADMIN', status: ApprovalStatus.PENDING },
        ],
        equipmentList: [],
        cardReturned: false,
      });

      return checklistFallback.save();
    }

    // Determine the department manager (LINE_MANAGER) by inspecting the employee's primary department
    // We use OrganizationStructureService.getDepartmentById() to get the department's head position and
    // then pick the active assignment for that position to resolve the manager's employeeProfileId.
    let departmentManagerId: Types.ObjectId | null = null;
    try {
      const manager = await this._findDepartmentManagerForEmployee(employee);
      if (manager && manager._id) departmentManagerId = manager._id;
    } catch (err) {
      // non-fatal — checklist should still be created
      console.warn(
        'createClearanceChecklist: failed to resolve department manager:',
        this.getErrorMessage(err) || err,
      );
    }

    // Auto-populate equipment list where possible by reading onboarding reservation notes
    // (reserveEquipment saves a note like `Reserved: {...}` which we parse)
    let equipmentList: any[] = [];
    try {
      const onboarding = await this.onboardingModel
        .findOne({ employeeId: employee._id })
        .exec();
      equipmentList = this._extractEquipmentFromOnboarding(onboarding);
    } catch (err) {
      // fallback - leave equipmentList empty
      console.warn(
        'createClearanceChecklist: failed to extract onboarding equipment:',
        this.getErrorMessage(err) || err,
      );
    }

    // Default checklist order: LINE_MANAGER (assigned), HR, IT, FINANCE, FACILITIES, ADMIN
    const items = [
      {
        department: 'LINE_MANAGER',
        assignedTo: departmentManagerId,
        status: ApprovalStatus.PENDING,
      },
      { department: 'HR', status: ApprovalStatus.PENDING },
      { department: 'IT', status: ApprovalStatus.PENDING },
      { department: 'FINANCE', status: ApprovalStatus.PENDING },
      { department: 'FACILITIES', status: ApprovalStatus.PENDING },
      { department: 'ADMIN', status: ApprovalStatus.PENDING },
    ];

    const checklist = new this.clearanceModel({
      terminationId: new Types.ObjectId(dto.terminationId),
      items,
      equipmentList,
      cardReturned: false,
    });

    return checklist.save();
  }

  // ---------------------------- Helper functions ----------------------------
  // Helper: Resolve department manager (LINE_MANAGER) based on employee.primaryDepartmentId
  // This uses OrganizationStructureService.getDepartmentById() to find the head position and
  // then gets position assignments to resolve the employee who holds that position currently.
  private async _findDepartmentManagerForEmployee(employee: any) {
    if (!employee || !employee.primaryDepartmentId) return null;

    try {
      const department =
        await this.organizationStructureService.getDepartmentById(
          employee.primaryDepartmentId.toString(),
        );
      if (!department || !department.headPositionId) return null;

      // Get assignments for the head position and pick the active assignment
      const assignments =
        await this.organizationStructureService.getPositionAssignments(
          department.headPositionId.toString(),
        );
      if (!assignments || assignments.length === 0) return null;

      // prefer active assignment (endDate not set) or last assignment
      const active = assignments.find((a: any) => !a.endDate) || assignments[0];
      if (!active || !active.employeeProfileId) return null;

      // load the manager employee profile
      const manager = await this.employeeModel
        .findById(active.employeeProfileId)
        .select('-password')
        .exec();
      return manager || null;
    } catch (err) {
      // fail safely
      return null;
    }
  }

  // Helper: extract equipment reservation entries from onboarding's admin tasks notes
  // Format expected: reserveEquipment() writes notes with "Reserved: <JSON>" which we parse
  private _extractEquipmentFromOnboarding(onboarding: any): any[] {
    if (!onboarding || !Array.isArray(onboarding.tasks)) return [];
    const found: any[] = [];
    for (const task of onboarding.tasks) {
      if (task.department !== 'Admin') continue;
      const notes = task.notes || '';
      // capture 'Reserved: {...}' or 'Reserved: [{...}]'
      const matches = Array.from(
        notes.matchAll(/Reserved:\s*(\{.*?\}|\[.*?\])/g),
      );
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
          } else {
            found.push({
              equipmentId: parsed.id || null,
              name: parsed.name || parsed.type || 'Unknown',
              returned: false,
              condition: null,
            });
          }
        } catch (err) {
          // ignore parse error
        }
      }
    }
    return found;
  }

  // Helper: internal access revocation placeholder
  // This function marks employee status to INACTIVE and records a lightweight audit note.
  private async _internalRevokeSystemAccess(employee: any) {
    if (!employee) return;
    try {
      // set the employee status to INACTIVE and update effective date
      employee.status = EmployeeStatus.INACTIVE;
      employee.statusEffectiveFrom = new Date();
      await employee.save();

      // best-effort: record the change on the termination record(s) if present
      // (this is a non-invasive placeholder; real integrations should call IT services)
      await this.terminationModel
        .updateMany(
          { employeeId: employee._id },
          {
            $set: {
              hrComments:
                (
                  await this.terminationModel.findOne({
                    employeeId: employee._id,
                  })
                )?.hrComments +
                `\n[ACCESS_REVOKED:${new Date().toISOString()}]`,
            },
          },
        )
        .exec();
      console.log(
        `_internalRevokeSystemAccess: marked employee ${employee.employeeNumber} INACTIVE`,
      );
    } catch (err) {
      console.warn(
        '_internalRevokeSystemAccess failed:',
        this.getErrorMessage(err) || err,
      );
    }
  }

  // NOTE: _queueFinalSettlement() was removed - final settlement is now handled by
  // triggerFinalSettlement() which is called when ALL clearances are approved.
  // This ensures proper workflow: all departments must sign off before final pay processing.

  // 6) GET CHECKLIST BY EMPLOYEE (employeeNumber)
  async getChecklistByEmployee(employeeId: string) {
    // Validate employeeId format
    if (
      !employeeId ||
      typeof employeeId !== 'string' ||
      employeeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Employee ID (employeeNumber) is required and must be a non-empty string',
      );
    }

    const employee = await this.employeeModel
      .findOne({ employeeNumber: employeeId })
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const termination = await this.terminationModel.findOne({
      employeeId: employee._id,
    });

    if (!termination) {
      throw new NotFoundException('No termination found for this employee.');
    }

    const checklist = await this.clearanceModel.findOne({
      terminationId: termination._id,
    });
    if (!checklist) {
      throw new NotFoundException(
        'No clearance checklist found for this employee.',
      );
    }

    return checklist;
  }

  // 7) UPDATE CLEARANCE ITEM STATUS
  async updateClearanceItemStatus(
    checklistId: string,
    dto: UpdateClearanceItemStatusDto,
    user: any,
  ) {
    // Authorization and department-specific rules
    if (!user || !user.role) {
      throw new ForbiddenException(
        'Unauthorized clearance update. missing user/role',
      );
    }

    // Validate checklistId format
    if (!Types.ObjectId.isValid(checklistId)) {
      throw new BadRequestException('Invalid checklist ID format');
    }

    // Validate department
    if (!dto.department || typeof dto.department !== 'string') {
      throw new BadRequestException(
        'Department is required and must be a non-empty string',
      );
    }

    // Validate status
    if (!dto.status || !Object.values(ApprovalStatus).includes(dto.status)) {
      throw new BadRequestException('Invalid approval status');
    }

    // Check if checklist exists
    const checklist = await this.clearanceModel.findById(checklistId);
    if (!checklist) {
      throw new NotFoundException('Checklist not found.');
    }

    // Check if department item exists in checklist
    const departmentItem = checklist.items.find(
      (item: any) => item.department === dto.department,
    );
    if (!departmentItem) {
      throw new BadRequestException(
        `Department '${dto.department}' not found in clearance checklist`,
      );
    }

    // Department-specific permissions/authorization
    const dept = dto.department;
    const role = user.role;

    const hasPermission = (() => {
      switch (dept) {
        case 'LINE_MANAGER':
          // allowed if user is department head or assignedTo matches user
          if (
            departmentItem.assignedTo &&
            user.id &&
            departmentItem.assignedTo.toString() === user.id.toString()
          )
            return true;
          return (
            role === SystemRole.DEPARTMENT_HEAD ||
            role === SystemRole.HR_MANAGER
          );
        case 'IT':
          return (
            role === SystemRole.SYSTEM_ADMIN || role === SystemRole.HR_MANAGER
          );
        case 'FINANCE':
          return (
            role === SystemRole.FINANCE_STAFF ||
            role === SystemRole.PAYROLL_MANAGER ||
            role === SystemRole.PAYROLL_SPECIALIST ||
            role === SystemRole.HR_MANAGER
          );
        case 'FACILITIES':
          return (
            role === SystemRole.HR_ADMIN ||
            role === SystemRole.SYSTEM_ADMIN ||
            role === SystemRole.HR_MANAGER
          );
        case 'ADMIN':
          return (
            role === SystemRole.HR_ADMIN ||
            role === SystemRole.HR_MANAGER ||
            role === SystemRole.SYSTEM_ADMIN
          );
        case 'HR':
          // HR employees can update, but final APPROVED must be performed by HR_MANAGER
          return (
            role === SystemRole.HR_EMPLOYEE ||
            role === SystemRole.HR_MANAGER ||
            role === SystemRole.SYSTEM_ADMIN
          );
        default:
          return (
            role === SystemRole.HR_MANAGER || role === SystemRole.SYSTEM_ADMIN
          );
      }
    })();

    if (!hasPermission) {
      throw new ForbiddenException(
        'User does not have permission to update this department clearance item',
      );
    }

    // Enforce core approval sequence for final workflow: LINE_MANAGER -> FINANCE -> HR
    const coreOrder = ['LINE_MANAGER', 'FINANCE', 'HR'];
    const deptIndex = coreOrder.indexOf(dept);
    if (deptIndex > 0) {
      for (let i = 0; i < deptIndex; i++) {
        const prev = checklist.items.find(
          (it: any) => it.department === coreOrder[i],
        );
        if (!prev || prev.status !== ApprovalStatus.APPROVED) {
          throw new BadRequestException(
            `Cannot approve '${dept}' before '${coreOrder[i]}' is approved`,
          );
        }
      }
    }

    // Special enforcement: HR final APPROVED must be by HR_MANAGER explicitly
    if (
      dept === 'HR' &&
      dto.status === ApprovalStatus.APPROVED &&
      role !== SystemRole.HR_MANAGER
    ) {
      throw new ForbiddenException('Only HR Manager can finalize HR approval');
    }

    // Update the item
    await this.clearanceModel.updateOne(
      { _id: checklistId, 'items.department': dto.department },
      {
        $set: {
          'items.$.status': dto.status,
          'items.$.comments': dto.comments ?? null,
          'items.$.updatedBy': user.id ? new Types.ObjectId(user.id) : null,
          'items.$.updatedAt': new Date(),
        },
      },
    );

    // Reload checklist to get updated data
    const updatedChecklist = await this.clearanceModel.findById(checklistId);
    if (!updatedChecklist) {
      throw new NotFoundException('Checklist not found.');
    }

    // Run department-specific side-effects when a department marks APPROVED
    if (dto.status === ApprovalStatus.APPROVED) {
      try {
        // find termination and employee linked to this checklist
        const termination = await this.terminationModel.findById(
          updatedChecklist.terminationId,
        );
        const employee = termination
          ? await this.employeeModel.findById(termination.employeeId)
          : null;

        // IT approval → trigger internal access revocation placeholder
        if (dept === 'IT') {
          // mark account revocation (internal, safe placeholder)
          if (employee) await this._internalRevokeSystemAccess(employee);
        }

        // FACILITIES approval → mark equipment items as returned and annotate onboarding
        if (
          dept === 'FACILITIES' &&
          Array.isArray((dto as any).equipmentReturns)
        ) {
          const returns = (dto as any).equipmentReturns;
          for (const r of returns) {
            const idx = updatedChecklist.equipmentList.findIndex(
              (e: any) =>
                e.equipmentId?.toString?.() === r.equipmentId?.toString?.() ||
                e.name === r.equipmentId,
            );
            if (idx >= 0) {
              updatedChecklist.equipmentList[idx].returned = true;
              if (r.condition)
                updatedChecklist.equipmentList[idx].condition = r.condition;
            }
          }
          await updatedChecklist.save();

          // Append notes to onboarding admin task when present
          if (employee) {
            const onboarding = await this.onboardingModel.findOne({
              employeeId: employee._id,
            });
            if (onboarding) {
              onboarding.tasks = onboarding.tasks.map((t: any) => {
                if (t.department === 'Admin') {
                  t.notes =
                    (t.notes || '') +
                    `\n[${new Date().toISOString()}] Equipment returned: ${JSON.stringify((dto as any).equipmentReturns)}`;
                }
                return t;
              });
              await onboarding.save();
            }
          }
        }

        // FINANCE approval: Final settlement is now triggered when ALL clearances are approved
        // (see triggerFinalSettlement() call below in the allApproved block)
        // This ensures proper sequencing: all departments must sign off before final pay is processed
      } catch (err) {
        console.warn(
          'Post-approval side-effects failed:',
          this.getErrorMessage(err) || err,
        );
      }
    }

    const allApproved = updatedChecklist.items.every(
      (i: any) => i.status === ApprovalStatus.APPROVED,
    );

    if (allApproved) {
      updatedChecklist.cardReturned = true;
      await updatedChecklist.save();

      await this.terminationModel.findByIdAndUpdate(
        updatedChecklist.terminationId,
        {
          status: TerminationStatus.APPROVED,
        },
      );

      // OFF-013: Trigger final settlement when all clearances are approved
      try {
        const termination = await this.terminationModel.findById(
          updatedChecklist.terminationId,
        );
        if (termination && termination.employeeId) {
          await this.triggerFinalSettlement(
            termination.employeeId.toString(),
            updatedChecklist.terminationId.toString(),
          );
        }
      } catch (err) {
        // Non-blocking - log but don't fail the clearance update
        console.warn(
          'Failed to trigger final settlement after all clearances approved:',
          this.getErrorMessage(err) || err,
        );
      }
    }

    return { message: 'Clearance item updated.' };
  }

  // 8) MANUAL COMPLETE
  async markChecklistCompleted(checklistId: string, user: any) {
    if (!user || user.role !== SystemRole.HR_MANAGER) {
      throw new ForbiddenException(
        'Only HR Manager can manually complete checklist.',
      );
    }

    // Validate checklistId format
    if (!Types.ObjectId.isValid(checklistId)) {
      throw new BadRequestException('Invalid checklist ID format');
    }

    // Check if checklist exists
    const checklist = await this.clearanceModel.findById(checklistId);
    if (!checklist) {
      throw new NotFoundException('Checklist not found.');
    }

    const updated = await this.clearanceModel.findByIdAndUpdate(
      checklistId,
      { cardReturned: true },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Checklist not found.');
    }

    return updated;
  }

  // ---------------------------------------------------
  // OFF-013: FINAL SETTLEMENT TRIGGER
  // ---------------------------------------------------
  /**
   * OFF-013: Trigger Benefits Termination and Final Pay Calculation
   *
   * This method is called when all clearances are approved to initiate:
   * 1. Unused leave balance calculation and encashment
   * 2. Final pay calculation (outstanding salary, deductions, severance)
   * 3. Benefits plan termination
   * 4. Final payroll queue
   *
   * INTEGRATIONS (commented out - uncomment when services are ready):
   * - LeavesService: For leave balance calculation
   * - PayrollExecutionService: For final pay calculation and processing
   * - BenefitsManagementService: For benefits termination (service doesn't exist yet)
   */
  async triggerFinalSettlement(employeeId: string, terminationId: string) {
    // Validate inputs
    if (!employeeId || !Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID for final settlement');
    }
    if (!terminationId || !Types.ObjectId.isValid(terminationId)) {
      throw new BadRequestException(
        'Invalid termination ID for final settlement',
      );
    }

    // Find employee
    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found for final settlement');
    }

    // Find termination
    const termination = await this.terminationModel
      .findById(terminationId)
      .exec();
    if (!termination) {
      throw new NotFoundException(
        'Termination request not found for final settlement',
      );
    }

    // Initialize settlement data
    const settlementData: any = {
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

    // ============================================================================
    // STEP 1: LEAVE BALANCE CALCULATION (LEAVES SERVICE INTEGRATION)
    // ============================================================================
    // TODO: Uncomment when LeavesService is injected and ready
    //
    // try {
    //   // Get unused leave balance for the employee
    //   const leaveBalance = await this.leavesService.getLeaveBalance(employee._id.toString());
    //
    //   if (leaveBalance && leaveBalance.unusedDays > 0) {
    //     // Calculate leave encashment based on daily rate
    //     // const dailyRate = employee.grossSalary / 30; // Approximate daily rate
    //     // const encashmentAmount = leaveBalance.unusedDays * dailyRate;
    //
    //     settlementData.components.leaveEncashment = {
    //       unusedDays: leaveBalance.unusedDays,
    //       // encashmentAmount: encashmentAmount,
    //       calculatedAt: new Date().toISOString(),
    //     };
    //   }
    // } catch (err) {
    //   console.warn('triggerFinalSettlement: Failed to calculate leave balance:', this.getErrorMessage(err) || err);
    //   settlementData.errors.push({ step: 'leaveBalance', error: this.getErrorMessage(err) || String(err) });
    // }
    // ============================================================================

    // ============================================================================
    // STEP 2: FINAL PAY CALCULATION (PAYROLL EXECUTION SERVICE INTEGRATION)
    // ============================================================================
    // TODO: Uncomment when PayrollExecutionService is injected and ready
    //
    // try {
    //   // Calculate final pay including:
    //   // - Outstanding salary (prorated for partial month)
    //   // - Leave encashment (from step 1)
    //   // - Deductions (loans, advances, etc.)
    //   // - Severance pay (if applicable based on termination type and tenure)
    //
    //   const finalPayRequest = {
    //     employeeId: employee._id.toString(),
    //     terminationDate: termination.terminationDate,
    //     includeLeaveEncashment: true,
    //     leaveEncashmentAmount: settlementData.components.leaveEncashment?.encashmentAmount || 0,
    //   };
    //
    //   const finalPayResult = await this.payrollExecutionService.calculateFinalPay(finalPayRequest);
    //
    //   settlementData.components.finalPay = {
    //     grossAmount: finalPayResult?.grossAmount,
    //     deductions: finalPayResult?.deductions,
    //     netAmount: finalPayResult?.netAmount,
    //     calculatedAt: new Date().toISOString(),
    //   };
    //
    //   // Queue the final payroll for processing
    //   // await this.payrollExecutionService.queueFinalPayroll(employee._id.toString(), finalPayResult);
    //
    // } catch (err) {
    //   console.warn('triggerFinalSettlement: Failed to calculate final pay:', this.getErrorMessage(err) || err);
    //   settlementData.errors.push({ step: 'finalPay', error: this.getErrorMessage(err) || String(err) });
    // }
    // ============================================================================

    // ============================================================================
    // STEP 3: BENEFITS TERMINATION (BENEFITS MANAGEMENT SERVICE - PLACEHOLDER)
    // ============================================================================
    // NOTE: BenefitsManagementService does NOT exist yet. This is a placeholder.
    //
    // try {
    //   // Terminate all active benefits plans for the employee
    //   // Schedule termination for the notice period end date
    //
    //   const benefitsTerminationRequest = {
    //     employeeId: employee._id.toString(),
    //     effectiveDate: termination.terminationDate,
    //     reason: 'EMPLOYMENT_TERMINATION',
    //   };
    //
    //   const benefitsResult = await this.benefitsManagementService.terminateAllBenefits(benefitsTerminationRequest);
    //
    //   settlementData.components.benefitsTermination = {
    //     terminatedPlans: benefitsResult?.terminatedPlans || [],
    //     effectiveDate: termination.terminationDate,
    //     processedAt: new Date().toISOString(),
    //   };
    //
    // } catch (err) {
    //   console.warn('triggerFinalSettlement: Failed to terminate benefits:', this.getErrorMessage(err) || err);
    //   settlementData.errors.push({ step: 'benefitsTermination', error: this.getErrorMessage(err) || String(err) });
    // }
    // ============================================================================

    // Mark settlement as processed (placeholder - actual status depends on integrations)
    settlementData.status =
      settlementData.errors.length > 0 ? 'PARTIAL' : 'QUEUED';
    settlementData.completedAt = new Date().toISOString();

    // Store settlement data on termination record metadata
    try {
      await this.terminationModel
        .updateOne(
          { _id: terminationId },
          {
            $set: {
              '_meta.finalSettlement': settlementData,
            },
          },
        )
        .exec();
    } catch (err) {
      console.warn(
        'triggerFinalSettlement: Failed to save settlement metadata:',
        this.getErrorMessage(err) || err,
      );
    }

    // Append note to HR comments
    const settlementNote = `[FINAL_SETTLEMENT_TRIGGERED:${new Date().toISOString()}] Status: ${settlementData.status}`;
    termination.hrComments =
      (termination.hrComments || '') + '\n' + settlementNote;
    await termination.save();

    // Send notification to HR about final settlement initiation
    // TODO: Add 'final_settlement_initiated' to sendNotification allowed types when ready
    // For now, this is commented out as the notification type doesn't exist yet
    //
    // try {
    //   const hrManagers = await this.employeeSystemRoleModel.find({
    //     roles: { $in: [SystemRole.HR_MANAGER] },
    //     isActive: true
    //   }).exec();
    //
    //   for (const hr of hrManagers) {
    //     const hrEmployee = await this.employeeModel.findById(hr.employeeProfileId).exec();
    //     if (hrEmployee && hrEmployee.workEmail) {
    //       await this.sendNotification('final_settlement_initiated', hrEmployee.workEmail, {
    //         employeeName: employee.fullName || employee.employeeNumber || 'Employee',
    //         employeeNumber: employee.employeeNumber,
    //         terminationDate: termination.terminationDate?.toISOString(),
    //         settlementStatus: settlementData.status,
    //       }, { nonBlocking: true });
    //     }
    //   }
    // } catch (err) {
    //   console.warn('triggerFinalSettlement: Failed to send notifications:', this.getErrorMessage(err) || err);
    // }

    console.log(
      `triggerFinalSettlement: Initiated for employee ${employee.employeeNumber}, status: ${settlementData.status}`,
    );

    return {
      message: 'Final settlement process initiated',
      settlementData,
    };
  }

  // ---------------------------------------------------
  // CLEARANCE REMINDERS
  // ---------------------------------------------------
  /**
   * Send reminders for pending clearance checklist items.
   * - Stores metadata on checklist._meta.reminders to track lastSent, count, firstSent, escalated
   * - Uses employeeSystemRoleModel and employeeModel to resolve recipients for role-based departments
   * - Defaults: intervalDays=3, escalationAfterDays=7, maxReminders=3
   */
  async sendClearanceReminders(options?: { force?: boolean }) {
    const REMINDER_INTERVAL_DAYS = 3;
    const ESCALATION_AFTER_DAYS = 7;
    const MAX_REMINDERS = 3;

    // Find checklists that have at least one pending item
    const pendingChecklists = await this.clearanceModel
      .find({ 'items.status': ApprovalStatus.PENDING })
      .exec();

    for (const checklist of pendingChecklists) {
      try {
        // Load termination & employee
        const termination = await this.terminationModel
          .findById(checklist.terminationId)
          .exec();
        const employee = termination
          ? await this.employeeModel.findById(termination.employeeId).exec()
          : null;

        // ensure dynamic meta holder exists
        const meta: any = (checklist as any)._meta || {};
        meta.reminders = meta.reminders || {};

        const now = new Date();

        for (const item of checklist.items || []) {
          if (item.status !== ApprovalStatus.PENDING) continue;

          const dept = item.department;
          meta.reminders[dept] = meta.reminders[dept] || {
            count: 0,
            lastSent: null,
            firstSent: null,
            escalated: false,
          };
          const dmeta = meta.reminders[dept];

          // compute days since last and since first
          const lastSent = dmeta.lastSent ? new Date(dmeta.lastSent) : null;
          const firstSent = dmeta.firstSent ? new Date(dmeta.firstSent) : null;

          const daysSinceLast = lastSent
            ? Math.floor(
                (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24),
              )
            : Infinity;
          const daysSinceFirst = firstSent
            ? Math.floor(
                (now.getTime() - firstSent.getTime()) / (1000 * 60 * 60 * 24),
              )
            : 0;

          // skip if we've reached max reminders
          if (dmeta.count >= MAX_REMINDERS && !options?.force) continue;

          // skip if not enough days have passed since last reminder
          if (
            lastSent &&
            daysSinceLast < REMINDER_INTERVAL_DAYS &&
            !options?.force
          )
            continue;

          // resolve recipients
          const recipients = await this._resolveRecipientsForClearanceDept(
            item,
            checklist,
            employee,
          );
          if (!recipients || recipients.length === 0) {
            // nothing to notify
            continue;
          }

          // send reminders to each recipient (non-blocking)
          for (const r of recipients) {
            try {
              await this.sendNotification(
                'clearance_reminder',
                r.email,
                {
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
                },
                { nonBlocking: true },
              );
            } catch (err) {
              console.warn(
                `Failed to send clearance reminder to ${r.email}:`,
                this.getErrorMessage(err) || err,
              );
            }
          }

          // Update meta
          dmeta.count = (dmeta.count || 0) + 1;
          dmeta.lastSent = now.toISOString();
          if (!dmeta.firstSent) dmeta.firstSent = now.toISOString();

          // Escalation logic
          if (
            !dmeta.escalated &&
            firstSent &&
            daysSinceFirst >= ESCALATION_AFTER_DAYS
          ) {
            // escalate to HR Manager + department head (best-effort)
            const escalationRecipients = [] as any[];

            // HR managers
            const hrRoles = await this.employeeSystemRoleModel
              .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
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

            // department manager (if resolvable)
            try {
              const manager =
                await this._findDepartmentManagerForEmployee(employee);
              if (manager && manager.workEmail)
                escalationRecipients.push({
                  name: manager.employeeNumber || manager.workEmail,
                  email: manager.workEmail,
                });
            } catch (err) {
              // ignore
            }

            // send escalation notices
            for (const e of escalationRecipients) {
              try {
                await this.sendNotification(
                  'clearance_reminder',
                  e.email,
                  {
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
                  },
                  { nonBlocking: true },
                );
              } catch (err) {
                console.warn(
                  'Failed to send escalation reminder:',
                  this.getErrorMessage(err) || err,
                );
              }
            }

            dmeta.escalated = true;
          }
        }

        // persist meta back to document (no schema change)
        await this.clearanceModel
          .updateOne(
            { _id: checklist._id },
            { $set: { '_meta.reminders': meta.reminders } },
          )
          .exec();
      } catch (err) {
        console.warn(
          'sendClearanceReminders: failed for checklist',
          checklist._id?.toString(),
          this.getErrorMessage(err) || err,
        );
      }
    }

    return { message: 'Clearance reminders processed.' };
  }

  // Helper: resolve recipients for a pending department item
  private async _resolveRecipientsForClearanceDept(
    item: any,
    checklist: any,
    employee: any,
  ): Promise<Array<{ name: string; email: string }>> {
    const dept = item.department;
    const recipients: Array<{ name: string; email: string }> = [];

    // If assignedTo is present (LINE_MANAGER), try to notify that user specifically
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
      } catch (_) {
        // continue to role-based resolution
      }
    }

    // role mapping for departments (best-effort)
    const roleMap: Record<string, SystemRole[]> = {
      LINE_MANAGER: [SystemRole.DEPARTMENT_HEAD],
      HR: [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN],
      IT: [SystemRole.SYSTEM_ADMIN],
      FINANCE: [
        SystemRole.FINANCE_STAFF,
        SystemRole.PAYROLL_MANAGER,
        SystemRole.PAYROLL_SPECIALIST,
      ],
      FACILITIES: [SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
      ADMIN: [SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
    };

    const roles = roleMap[dept] || [SystemRole.HR_MANAGER];

    // Find system role assignments and extract their employee email addresses
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
      } catch (err) {
        // ignore lookup errors
      }
    }

    // remove duplicates
    const uniq = new Map<string, { name: string; email: string }>();
    for (const r of recipients) uniq.set(r.email, r);

    return Array.from(uniq.values());
  }

  // 9) GET LATEST APPRAISAL FOR AN EMPLOYEE (by employeeNumber)
  async getLatestAppraisalForEmployee(employeeId: string) {
    // Validate employeeId format
    if (
      !employeeId ||
      typeof employeeId !== 'string' ||
      employeeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Employee ID (employeeNumber) is required and must be a non-empty string',
      );
    }

    const employee = await this.employeeModel
      .findOne({ employeeNumber: employeeId })
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    // If EmployeeProfile has lastAppraisalRecordId, prefer it
    if (employee.lastAppraisalRecordId) {
      const record = await this.appraisalRecordModel
        .findById(employee.lastAppraisalRecordId)
        .exec();

      if (!record) {
        throw new NotFoundException(
          'No appraisal record found for this employee.',
        );
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

    // Fallback: latest by employeeProfileId
    const latestRecord = await this.appraisalRecordModel
      .findOne({ employeeProfileId: employee._id })
      .sort({ createdAt: -1 })
      .exec();

    if (!latestRecord) {
      throw new NotFoundException(
        'No appraisal record found for this employee.',
      );
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

  // 10) FUNCTION TO MAKE EMPLOYEE INACTIVE (SYSTEM ADMIN)
  async revokeSystemAccess(dto: RevokeSystemAccessDto, user: any) {
    // Only SYSTEM_ADMIN can do this
    if (!user || user.role !== SystemRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Only System Admin can revoke system access.',
      );
    }

    // Validate employeeId format
    if (
      !dto.employeeId ||
      typeof dto.employeeId !== 'string' ||
      dto.employeeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Employee ID (employeeNumber) is required and must be a non-empty string',
      );
    }

    // Find employee by employeeNumber
    const employee = await this.employeeModel.findOne({
      employeeNumber: dto.employeeId,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    // Check if employee is already inactive -> idempotent behavior: return existing revocation metadata
    if (employee.status === EmployeeStatus.INACTIVE) {
      // Try to surface existing revocation log if present
      const termination = await this.terminationModel
        .findOne({ employeeId: employee._id })
        .lean();
      const existingLog = termination
        ? (termination as any)._meta?.revocationLog || null
        : null;
      return {
        message: 'Employee is already inactive. No further action taken.',
        employeeId: employee._id,
        employeeNumber: employee.employeeNumber,
        previousStatus: EmployeeStatus.INACTIVE,
        newStatus: EmployeeStatus.INACTIVE,
        revocationLog: existingLog,
      };
    }

    // Capture previous status and Update status to INACTIVE
    const previousStatus = employee.status;
    employee.status = EmployeeStatus.INACTIVE;
    await employee.save();

    // Try to find a termination for audit logging
    const termination = await this.terminationModel
      .findOne({ employeeId: employee._id })
      .exec();

    // append a top-level access revoked note to termination.hrComments (if termination exists)
    const note = `[ACCESS_REVOKED:${new Date().toISOString()}] by ${user?.id || user?.employeeNumber || 'SYSTEM'}`;
    if (termination) {
      termination.hrComments = (termination.hrComments || '') + '\n' + note;
      // ensure _meta.revocationLog exists and append starter entry
      (termination as any)._meta = (termination as any)._meta || {};
      (termination as any)._meta.revocationLog =
        (termination as any)._meta.revocationLog || [];
      (termination as any)._meta.revocationLog.push({
        at: new Date().toISOString(),
        by: user?.id || user?.employeeNumber || 'SYSTEM',
        reason: dto?.reason || 'manual_revoke',
        actions: [],
      });
      await termination.save();
    }

    // Perform actual de-provisioning actions (non-blocking placeholders)
    const actions: any[] = [];

    // 1) Identity provider / SSO revoke (placeholder)
    try {
      const result = await this._revokeIdentityProvider(employee);
      actions.push(result);
      if (termination)
        await this._appendRevocationAction(termination._id, result);
    } catch (err) {
      const result = {
        service: 'idp',
        success: false,
        details: this.getErrorMessage(err) || String(err),
      };
      actions.push(result);
      if (termination)
        await this._appendRevocationAction(termination._id, result);
    }

    // 2) Email mailbox deactivation (placeholder)
    try {
      const result = await this._deactivateMailbox(employee);
      actions.push(result);
      if (termination)
        await this._appendRevocationAction(termination._id, result);
    } catch (err) {
      const result = {
        service: 'mail',
        success: false,
        details: this.getErrorMessage(err) || String(err),
      };
      actions.push(result);
      if (termination)
        await this._appendRevocationAction(termination._id, result);
    }

    // 3) Application de-provisioning (placeholder)
    try {
      const result = await this._deprovisionApplications(employee);
      actions.push(result);
      if (termination)
        await this._appendRevocationAction(termination._id, result);
    } catch (err) {
      const result = {
        service: 'apps',
        success: false,
        details: this.getErrorMessage(err) || String(err),
      };
      actions.push(result);
      if (termination)
        await this._appendRevocationAction(termination._id, result);
    }

    // Send notification to the employee (if email exists) and notify system admins
    try {
      if (employee.workEmail) {
        await this.sendNotification(
          'access_revoked',
          employee.workEmail,
          {
            employeeName:
              employee.fullName || employee.employeeNumber || 'Employee',
            employeeNumber: employee.employeeNumber,
            reason: dto?.reason || 'Manual revocation by System Admin',
          },
          { nonBlocking: true },
        );
      }

      const admins = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true })
        .exec();
      for (const a of admins) {
        const admin = await this.employeeModel
          .findById(a.employeeProfileId)
          .exec();
        if (admin && admin.workEmail) {
          await this.sendNotification(
            'access_revoked',
            admin.workEmail,
            {
              employeeName:
                employee.fullName || employee.employeeNumber || 'Employee',
              employeeNumber: employee.employeeNumber,
              reason: dto?.reason || 'Manual revocation requested',
            },
            { nonBlocking: true },
          );
        }
      }
    } catch (err) {
      console.warn(
        'revokeSystemAccess notifications failed:',
        this.getErrorMessage(err) || err,
      );
    }

    return {
      message:
        'System access revoked (employee status set to INACTIVE). De-provisioning actions initiated.',
      employeeId: employee._id,
      employeeNumber: employee.employeeNumber,
      previousStatus,
      newStatus: EmployeeStatus.INACTIVE,
      actions,
    };
  }

  // Append a revocation action entry into termination._meta.revocationLog (non-destructive)
  private async _appendRevocationAction(terminationId: any, entry: any) {
    try {
      if (!terminationId) return;
      await this.terminationModel
        .updateOne(
          { _id: terminationId },
          { $push: { '_meta.revocationLog': entry } },
        )
        .exec();
    } catch (err) {
      console.warn(
        '_appendRevocationAction failed:',
        this.getErrorMessage(err) || err,
      );
    }
  }

  // Placeholder: revoke identity provider account (SSO/IdP)
  // Replace with a real integration when available (IdP SDK / HTTP calls)
  private async _revokeIdentityProvider(employee: any): Promise<any> {
    try {
      // Simulate provisioning action
      console.log(
        `_revokeIdentityProvider: (placeholder) revoking IdP access for ${employee.employeeNumber || employee._id}`,
      );
      return {
        service: 'idp',
        success: true,
        details: `IdP revoke queued for ${employee.employeeNumber || employee._id}`,
      };
    } catch (err) {
      return {
        service: 'idp',
        success: false,
        details: this.getErrorMessage(err) || String(err),
      };
    }
  }

  // Placeholder: deactivate mailbox (e.g., Google Workspace / Microsoft Graph)
  private async _deactivateMailbox(employee: any): Promise<any> {
    try {
      console.log(
        `_deactivateMailbox: (placeholder) deactivating mailbox for ${employee.workEmail || employee.employeeNumber}`,
      );
      return {
        service: 'mail',
        success: true,
        details: `Mailbox deactivation queued for ${employee.workEmail || employee.employeeNumber}`,
      };
    } catch (err) {
      return {
        service: 'mail',
        success: false,
        details: this.getErrorMessage(err) || String(err),
      };
    }
  }

  // Placeholder: deprovision application access for common apps (Slack, Jira, etc.)
  private async _deprovisionApplications(employee: any): Promise<any> {
    try {
      console.log(
        `_deprovisionApplications: (placeholder) deprovisioning apps for ${employee.employeeNumber || employee._id}`,
      );
      return {
        service: 'apps',
        success: true,
        details: 'Applications deprovisioning queued (placeholder)',
      };
    } catch (err) {
      return {
        service: 'apps',
        success: false,
        details: this.getErrorMessage(err) || String(err),
      };
    }
  }
}
