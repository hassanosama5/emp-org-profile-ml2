/**
 * Recruitment Service
 * 
 * Handles the complete employee lifecycle: recruitment, onboarding, and offboarding.
 * Integrates with Employee Profile, Payroll Execution, Time Management, Organization Structure, and Leaves services.
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
import { CreateJobTemplateDto, UpdateJobTemplateDto } from './dto/job-template.dto';
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
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { PayrollExecutionService } from '../payroll-execution/payroll-execution.service';
import { TimeManagementService } from '../time-management/services/time-management.service';
import { PayrollConfigurationService } from '../payroll-configuration/payroll-configuration.service';
import { OrganizationStructureService } from '../organization-structure/organization-structure.service';
import { LeavesService } from '../leaves/leaves.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Contract, ContractDocument } from './models/contract.schema';
import { CreateEmployeeFromContractDto } from './dto/create-employee-from-contract.dto';
import { OfferResponseStatus } from './enums/offer-response-status.enum';
import { OfferFinalStatus } from './enums/offer-final-status.enum';
import { CreateEmployeeDto } from '../employee-profile/dto/create-employee.dto';
import { EmployeeStatus, CandidateStatus } from '../employee-profile/enums/employee-profile.enums';
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

import { ConfigStatus } from '../payroll-configuration/enums/payroll-configuration-enums';
import { BonusStatus } from '../payroll-execution/enums/payroll-execution-enum';
import { ShiftAssignmentStatus } from '../time-management/models/enums/index';

import { TerminationRequest } from './models/termination-request.schema';
import { ClearanceChecklist } from './models/clearance-checklist.schema';

import { TerminationStatus } from './enums/termination-status.enum';
import { TerminationInitiation } from './enums/termination-initiation.enum';
import { ApprovalStatus } from './enums/approval-status.enum';

import {
  CreateTerminationRequestDto,
  UpdateTerminationStatusDto,
  UpdateTerminationDetailsDto,
  SubmitResignationDto,
  TerminateEmployeeDto,
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

import {
  AppraisalRecord,
  AppraisalRecordDocument,
} from '../performance/models/appraisal-record.schema';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

import { RevokeSystemAccessDto } from './dto/system-access.dto';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';

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

    private readonly employeeProfileService: EmployeeProfileService,
    private readonly organizationStructureService: OrganizationStructureService,
    private readonly payrollExecutionService: PayrollExecutionService,
    private readonly payrollConfigurationService: PayrollConfigurationService,
    private readonly timeManagementService: TimeManagementService,
    private readonly leavesService: LeavesService,
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

    // CHANGED - Added Department model for panel member filtering by department
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,

    private readonly notificationsService: NotificationsService,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
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

  async createJobRequisition(
    dto: CreateJobRequisitionDto,
  ): Promise<JobRequisition> {
    try {
      console.log('📥 Creating job requisition with data:', dto);
      
      // Validate templateId
      if (!dto.templateId || !Types.ObjectId.isValid(dto.templateId)) {
        console.error('❌ Invalid template ID:', dto.templateId);
      throw new BadRequestException('Invalid template ID format');
    }

      // Check if template exists
      console.log('🔍 Checking template existence...');
      const templateExists = await this.jobTemplateModel.findById(dto.templateId);
      if (!templateExists) {
        console.error('❌ Template not found:', dto.templateId);
      throw new NotFoundException('Job template not found');
    }
      console.log('✅ Template found');

      // Validate openings
      if (!dto.openings || dto.openings <= 0 || !Number.isInteger(dto.openings)) {
        console.error('❌ Invalid openings:', dto.openings);
      throw new BadRequestException('Openings must be a positive integer');
    }

      // Resolve hiringManagerId - can be either a MongoDB ObjectId or an employee number (e.g., "EMP-2025-0005")
      let resolvedHiringManagerId: Types.ObjectId | undefined;
      if (dto.hiringManagerId) {
        const trimmedId = dto.hiringManagerId.trim();
        if (Types.ObjectId.isValid(trimmedId)) {
          // It's already a valid MongoDB ObjectId
          resolvedHiringManagerId = new Types.ObjectId(trimmedId);
          console.log('✅ hiringManagerId is a valid ObjectId:', trimmedId);
        } else {
          // Try to look up by employee number
          console.log('🔍 Looking up employee by employeeNumber:', trimmedId);
          const employee = await this.employeeModel.findOne({ employeeNumber: trimmedId }).exec();
          if (employee) {
            resolvedHiringManagerId = employee._id as Types.ObjectId;
            console.log('✅ Found employee by employeeNumber, _id:', resolvedHiringManagerId.toString());
          } else {
            console.error('❌ Employee not found with employeeNumber:', trimmedId);
            throw new BadRequestException(`Hiring manager with employee number "${trimmedId}" not found`);
          }
        }
      }

      // Generate unique requisition ID
    const requisitionId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated requisition ID:', requisitionId);
      
      // Build job requisition data - only include fields that have values
      // This ensures optional fields are completely omitted if not provided
      const jobRequisitionData: any = {
      requisitionId,
        templateId: new Types.ObjectId(dto.templateId), // Convert string to ObjectId
      openings: dto.openings,
      publishStatus: 'draft',
      };

      // Only include optional fields if they have valid values
      // Using explicit checks to ensure fields are completely omitted when not provided
      const trimmedLocation = dto.location?.trim();
      if (trimmedLocation) {
        jobRequisitionData.location = trimmedLocation;
      }
      
      // Include hiringManagerId if we successfully resolved it
      if (resolvedHiringManagerId) {
        jobRequisitionData.hiringManagerId = resolvedHiringManagerId;
      }

      console.log('💾 Saving job requisition:', JSON.stringify(jobRequisitionData, null, 2));
      console.log('💾 hiringManagerId in data?', 'hiringManagerId' in jobRequisitionData);
      
      // Use create() method which handles optional fields better than new + save()
      const saved = await this.jobModel.create(jobRequisitionData);
      console.log('✅ Job requisition saved:', saved._id);
      
      // Fetch the template separately to include in response
      console.log('📋 Fetching template...');
      const jobTemplateDoc = await this.jobTemplateModel.findById(dto.templateId);
      const jobTemplate: any = jobTemplateDoc ? jobTemplateDoc.toObject() : null;
      
      // Get the saved requisition as plain object
      console.log('📥 Fetching saved requisition...');
      const populatedDoc = await this.jobModel.findById(saved._id);
      if (!populatedDoc) {
        console.error('❌ Failed to retrieve saved requisition');
        throw new NotFoundException('Failed to retrieve created job requisition');
      }
      
      const populated: any = populatedDoc.toObject();
      
      // Add template to response for frontend compatibility
      if (jobTemplate && jobTemplate._id) {
        populated.template = jobTemplate;
        populated.templateId = jobTemplate._id.toString();
      }
      
      console.log('✅ Returning populated requisition');
      return populated;
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        console.error('⚠️ Known exception:', error.message);
        throw error;
      }
      
      // Handle Mongoose validation errors
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
        const validationError = error as any;
        const errorMessages = Object.keys(validationError.errors || {}).map(
          (key) => `${key}: ${validationError.errors[key].message}`,
        );
        console.error('❌ Mongoose validation error:', errorMessages.join(', '));
        throw new BadRequestException(
          `Validation failed: ${errorMessages.join(', ')}`,
        );
      }
      
      // Log and wrap unexpected errors
      console.error('❌ Unexpected error creating job requisition:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create job requisition',
      );
    }
  }

  // JobTemplate CRUD
  async createJobTemplate(dto: CreateJobTemplateDto) {
    // Validation is handled by class-validator in the DTO, but keeping additional checks for safety
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException(
        'Title is required and must be a non-empty string',
      );
    }
    if (!dto.department || dto.department.trim().length === 0) {
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

  async updateJobTemplate(id: string, dto: UpdateJobTemplateDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job template ID format');
    }

    // Validate that template exists
    const existingTemplate = await this.jobTemplateModel.findById(id);
    if (!existingTemplate) {
      throw new NotFoundException('Job Template not found');
    }

    // Validation is handled by class-validator in the DTO, but keeping additional checks for safety
    if (dto.title !== undefined && dto.title.trim().length === 0) {
      throw new BadRequestException('Title must be a non-empty string');
    }
    if (dto.department !== undefined && dto.department.trim().length === 0) {
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

    if (requisition.publishStatus === 'closed') {
      throw new BadRequestException('Cannot publish a closed job requisition');
    }

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

    const populatedJob = job.toObject ? job.toObject() : job;
    if (!populatedJob.templateId) {
      throw new BadRequestException(
        'Job requisition is missing template. Cannot preview without template details.',
      );
    }

    const totalApplications = await this.applicationModel.countDocuments({
      requisitionId: id,
    });
    const filledPositions = await this.applicationModel.countDocuments({
      requisitionId: id,
      status: ApplicationStatus.HIRED,
    });

    return {
      ...populatedJob,
      preview: true,
      template: populatedJob.templateId,
      statistics: {
        totalApplications,
        filledPositions,
        availablePositions: Math.max(0, populatedJob.openings - filledPositions),
        isFilled: filledPositions >= populatedJob.openings,
      },
    };
  }

  async getAllJobRequisitions() {
    const requisitions = await this.jobModel
      .find()
      .populate('templateId')
      //.populate('hiringManagerId')
      .lean();

    const enrichedRequisitions = await Promise.all(
      requisitions.map(async (req: any) => {
        const totalApps = await this.applicationModel.countDocuments({
          requisitionId: req._id,
        });
        const hiredCount = await this.applicationModel.countDocuments({
          requisitionId: req._id,
          status: ApplicationStatus.HIRED,
        });
        const inProcessCount = await this.applicationModel.countDocuments({
          requisitionId: req._id,
          status: ApplicationStatus.IN_PROCESS,
        });
        const offerCount = await this.applicationModel.countDocuments({
          requisitionId: req._id,
          status: ApplicationStatus.OFFER,
        });

        let maxProgress = 0;
        const applications = await this.applicationModel
          .find({ requisitionId: req._id })
          .select('currentStage')
          .lean();
        for (const app of applications) {
          const progress = this.calculateProgress(app.currentStage);
          if (progress > maxProgress) maxProgress = progress;
        }

        // Map templateId to template for frontend compatibility
        const result: any = {
          ...req,
          statistics: {
            totalApplications: totalApps,
            hired: hiredCount,
            inProcess: inProcessCount,
            offer: offerCount,
            filledPositions: hiredCount,
            availablePositions: Math.max(0, req.openings - hiredCount),
            progress: maxProgress,
            isFilled: hiredCount >= req.openings,
          },
        };
        if (req.templateId) {
          result.template = req.templateId;
        }
        return result;
      }),
    );

    return enrichedRequisitions;
  }

  async getJobRequisitionById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job requisition ID format');
    }
    const job: any = await this.jobModel.findById(id).populate('templateId').lean();
    if (!job) {
      throw new NotFoundException('Job Requisition not found');
    }
    // Map templateId to template for frontend compatibility
    if (job.templateId) {
      job.template = job.templateId;
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

    const updated = await this.jobModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException('Job Requisition not found');
    }
    return updated;
  }

  // =============================================================================
  // ELECTRONIC SCREENING WITH FLEXIBLE RULE MATCHING
  // =============================================================================
  // BR: Electronic screening includes rule-based filters with flexible matching
  // Handles variations in wording, case-insensitive matching, partial matches
  // =============================================================================

  /**
   * Flexible text matching - handles variations in wording
   * Case-insensitive, partial matching, handles synonyms
   */
  private flexibleTextMatch(text: string, pattern: string): boolean {
    if (!text || !pattern) return false;
    
    const normalizedText = text.toLowerCase().trim();
    const normalizedPattern = pattern.toLowerCase().trim();
    
    // Exact match
    if (normalizedText === normalizedPattern) return true;
    
    // Contains match
    if (normalizedText.includes(normalizedPattern) || normalizedPattern.includes(normalizedText)) {
      return true;
    }
    
    // Word boundary matching (handles "JavaScript" matching "JS" or "javascript")
    const textWords = normalizedText.split(/\s+/);
    const patternWords = normalizedPattern.split(/\s+/);
    
    // Check if all pattern words appear in text (in any order)
    const allWordsMatch = patternWords.every(patternWord => 
      textWords.some(textWord => 
        textWord.includes(patternWord) || patternWord.includes(textWord)
      )
    );
    
    if (allWordsMatch) return true;
    
    // Synonym matching for common tech terms
    const synonyms: Record<string, string[]> = {
      'js': ['javascript', 'ecmascript'],
      'react': ['reactjs', 'react.js'],
      'node': ['nodejs', 'node.js'],
      'vue': ['vuejs', 'vue.js'],
      'angular': ['angularjs', 'angular.js'],
      'python': ['py'],
      'c++': ['cpp', 'c plus plus'],
      'c#': ['csharp', 'c sharp'],
      'ai': ['artificial intelligence', 'machine learning', 'ml'],
      'ui': ['user interface', 'ux', 'user experience'],
      'api': ['application programming interface'],
    };
    
    // Check synonyms
    for (const [key, values] of Object.entries(synonyms)) {
      if (normalizedPattern.includes(key) || normalizedText.includes(key)) {
        if (values.some(syn => normalizedText.includes(syn) || normalizedPattern.includes(syn))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Extract years of experience from text
   * Handles: "3 years", "3+ years", "minimum 3 years", "3yrs", etc.
   */
  private extractYearsOfExperience(text: string): number {
    if (!text) return 0;
    
    const normalized = text.toLowerCase();
    // Match patterns like: "3 years", "3+", "3yrs", "minimum 3", etc.
    const patterns = [
      /(\d+)\s*\+?\s*(?:years?|yrs?|y\.?)/i,
      /(?:minimum|min|at least|over)\s*(\d+)/i,
      /(\d+)\s*(?:years?|yrs?)\s*(?:of|experience|exp)/i,
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    // Fallback: find any number that might be years
    const numberMatch = normalized.match(/(\d+)/);
    if (numberMatch && numberMatch[1]) {
      const num = parseInt(numberMatch[1], 10);
      // Reasonable assumption: if number is between 0-50, might be years
      if (num >= 0 && num <= 50) {
        return num;
      }
    }
    
    return 0;
  }

  /**
   * Extract education level from text
   * Handles: "Bachelor", "Bachelor's", "BS", "BSc", "Master's", "PhD", etc.
   */
  private extractEducationLevel(text: string): string[] {
    if (!text) return [];
    
    const normalized = text.toLowerCase();
    const educationLevels: string[] = [];
    
    const educationPatterns = {
      'phd': ['phd', 'ph.d', 'doctorate', 'doctoral'],
      'masters': ['master', 'masters', 'ms', 'msc', 'm.sc', 'mba', 'ma'],
      'bachelors': ['bachelor', 'bachelors', 'bs', 'bsc', 'b.sc', 'ba', 'be', 'b.eng'],
      'diploma': ['diploma', 'certificate', 'cert'],
      'highschool': ['high school', 'secondary', 'hs'],
    };
    
    for (const [level, patterns] of Object.entries(educationPatterns)) {
      if (patterns.some(pattern => normalized.includes(pattern))) {
        educationLevels.push(level);
      }
    }
    
    return educationLevels;
  }

  /**
   * Check if candidate meets qualification requirements (flexible matching)
   */
  private checkQualificationsMatch(
    candidateText: string,
    requiredQualifications: string[],
  ): { matched: string[]; missing: string[] } {
    const matched: string[] = [];
    const missing: string[] = [];
    
    if (!candidateText) {
      return { matched: [], missing: requiredQualifications };
    }
    
    const candidateLower = candidateText.toLowerCase();
    
    for (const qualification of requiredQualifications) {
      if (this.flexibleTextMatch(candidateText, qualification)) {
        matched.push(qualification);
      } else {
        missing.push(qualification);
      }
    }
    
    return { matched, missing };
  }

  /**
   * Check if candidate meets skill requirements (flexible matching)
   */
  private checkSkillsMatch(
    candidateText: string,
    requiredSkills: string[],
  ): { matched: string[]; missing: string[] } {
    return this.checkQualificationsMatch(candidateText, requiredSkills);
  }

  /**
   * Perform electronic screening with flexible rule matching
   * BR: Electronic screening includes rule-based filters
   */
  private async performElectronicScreening(
    candidate: CandidateDocument,
    jobTemplate: any,
  ): Promise<{
    passed: boolean;
    score: number;
    reasons: string[];
    warnings: string[];
  }> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    const maxScore = 100;
    
    // Combine candidate information for screening
    const candidateInfo = [
      candidate.notes || '',
      candidate.resumeUrl ? 'Resume uploaded' : '',
    ].filter(Boolean).join(' ').toLowerCase();
    
    // 1. Resume check (basic requirement)
    if (candidate.resumeUrl) {
      score += 20;
      reasons.push('✓ Resume uploaded');
    } else {
      warnings.push('⚠ Resume not uploaded');
    }
    
    // 2. Qualifications matching (flexible)
    if (jobTemplate.qualifications && jobTemplate.qualifications.length > 0) {
      const qualMatch = this.checkQualificationsMatch(
        candidateInfo,
        jobTemplate.qualifications,
      );
      
      if (qualMatch.matched.length > 0) {
        const qualScore = (qualMatch.matched.length / jobTemplate.qualifications.length) * 40;
        score += qualScore;
        reasons.push(`✓ Matched ${qualMatch.matched.length}/${jobTemplate.qualifications.length} qualifications: ${qualMatch.matched.join(', ')}`);
      }
      
      if (qualMatch.missing.length > 0) {
        warnings.push(`⚠ Missing qualifications: ${qualMatch.missing.join(', ')}`);
      }
    } else {
      // No qualifications specified, give partial credit
      score += 20;
    }
    
    // 3. Skills matching (flexible)
    if (jobTemplate.skills && jobTemplate.skills.length > 0) {
      const skillMatch = this.checkSkillsMatch(candidateInfo, jobTemplate.skills);
      
      if (skillMatch.matched.length > 0) {
        const skillScore = (skillMatch.matched.length / jobTemplate.skills.length) * 30;
        score += skillScore;
        reasons.push(`✓ Matched ${skillMatch.matched.length}/${jobTemplate.skills.length} skills: ${skillMatch.matched.join(', ')}`);
      }
      
      if (skillMatch.missing.length > 0) {
        warnings.push(`⚠ Missing skills: ${skillMatch.missing.join(', ')}`);
      }
    } else {
      // No skills specified, give partial credit
      score += 15;
    }
    
    // 4. Parse description for additional rules (flexible)
    if (jobTemplate.description) {
      const desc = jobTemplate.description.toLowerCase();
      
      // Check for experience requirement
      const expYears = this.extractYearsOfExperience(desc);
      if (expYears > 0) {
        const candidateExp = this.extractYearsOfExperience(candidateInfo);
        if (candidateExp >= expYears) {
          score += 10;
          reasons.push(`✓ Meets experience requirement (${candidateExp} years >= ${expYears} years)`);
        } else {
          warnings.push(`⚠ Experience requirement: ${expYears} years, candidate has: ${candidateExp} years`);
        }
      }
      
      // Check for education requirement
      const requiredEducation = this.extractEducationLevel(desc);
      if (requiredEducation.length > 0) {
        const candidateEducation = this.extractEducationLevel(candidateInfo);
        const hasRequiredEducation = requiredEducation.some(req => 
          candidateEducation.some(cand => 
            this.flexibleTextMatch(cand, req) || 
            (req === 'masters' && cand === 'phd') || // Masters requirement met by PhD
            (req === 'bachelors' && (cand === 'masters' || cand === 'phd')) // Bachelor's requirement met by higher degree
          )
        );
        
        if (hasRequiredEducation) {
          score += 10;
          reasons.push(`✓ Meets education requirement: ${requiredEducation.join(' or ')}`);
        } else {
          warnings.push(`⚠ Education requirement: ${requiredEducation.join(' or ')}, candidate: ${candidateEducation.join(', ') || 'not specified'}`);
        }
      }
    }
    
    // Determine if passed (threshold: 60% or more)
    const passed = score >= (maxScore * 0.6);
    
    return {
      passed,
      score: Math.round(score),
      reasons,
      warnings,
    };
  }

  /**
   * Identify if candidate is an internal candidate (existing employee)
   * BR: Internal candidate preference for tie-breaking
   */
  private async identifyInternalCandidate(
    candidate: CandidateDocument,
  ): Promise<boolean> {
    if (!candidate.personalEmail && !candidate.nationalId) {
      return false;
    }
    
    try {
      // Check by email (personalEmail matches employee's personalEmail or workEmail)
      if (candidate.personalEmail) {
        const employeeByEmail = await this.employeeModel.findOne({
          $or: [
            { personalEmail: candidate.personalEmail },
            { workEmail: candidate.personalEmail },
          ],
          status: { $ne: EmployeeStatus.TERMINATED },
        }).lean();
        
        if (employeeByEmail) {
          return true;
        }
      }
      
      // Check by national ID
      if (candidate.nationalId) {
        const employeeByNationalId = await this.employeeModel.findOne({
          nationalId: candidate.nationalId,
          status: { $ne: EmployeeStatus.TERMINATED },
        }).lean();
        
        if (employeeByNationalId) {
          return true;
        }
      }
    } catch (error) {
      console.warn('[SCREENING] Error identifying internal candidate:', error);
      // Don't fail if check fails, just return false
    }
    
    return false;
  }

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

    // CHANGED: Check if openings is greater than 0
    if (!jobRequisition.openings || jobRequisition.openings <= 0) {
      throw new BadRequestException(
        'This job has no available positions. Cannot apply.',
      );
    }

    // Check if all positions are filled (by counting HIRED applications)
    const hiredCount = await this.applicationModel.countDocuments({
      requisitionId: new Types.ObjectId(dto.requisitionId),
      status: ApplicationStatus.HIRED,
    });
    
    // Calculate remaining positions
    const remainingPositions = jobRequisition.openings - hiredCount;
    
    if (remainingPositions <= 0) {
      throw new BadRequestException(
        `All ${jobRequisition.openings} position(s) for this requisition have been filled. No more applications are being accepted.`,
      );
    }
    
    console.log(`[APPLICATION] Job ${dto.requisitionId}: ${remainingPositions} of ${jobRequisition.openings} positions remaining`);

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

    // =========================================================================
    // ELECTRONIC SCREENING WITH RULE-BASED FILTERS
    // =========================================================================
    // BR: Electronic screening includes rule-based filters
    // Performs flexible matching against job requirements
    // =========================================================================
    let screeningResult: {
      passed: boolean;
      score: number;
      reasons: string[];
      warnings: string[];
    } | null = null;
    
    try {
      const jobTemplate = await this.jobTemplateModel
        .findById(jobRequisition.templateId)
        .lean()
        .exec();
      
      if (jobTemplate) {
        screeningResult = await this.performElectronicScreening(candidate, jobTemplate);
        console.log(`[SCREENING] Application screening result:`, {
          passed: screeningResult.passed,
          score: screeningResult.score,
          candidateId: dto.candidateId,
        });
      }
    } catch (screeningError) {
      console.warn('[SCREENING] Electronic screening failed, continuing with manual review:', screeningError);
      // Don't fail application if screening fails
    }

    // =========================================================================
    // IDENTIFY INTERNAL CANDIDATE
    // =========================================================================
    // BR: Internal candidate preference for tie-breaking
    // =========================================================================
    const isInternalCandidate = await this.identifyInternalCandidate(candidate);
    if (isInternalCandidate) {
      console.log(`[SCREENING] Internal candidate identified: ${candidate.personalEmail || candidate.nationalId}`);
    }

    // =========================================================================
    // CREATE APPLICATION
    // =========================================================================
    // Store screening results in notes field (since we can't modify schema)
    const applicationNotes = screeningResult
      ? `[ELECTRONIC SCREENING] Score: ${screeningResult.score}/100, Passed: ${screeningResult.passed ? 'Yes' : 'No'}. ` +
        `Reasons: ${screeningResult.reasons.join('; ')}. ` +
        (screeningResult.warnings.length > 0 ? `Warnings: ${screeningResult.warnings.join('; ')}. ` : '') +
        (isInternalCandidate ? '[INTERNAL CANDIDATE]' : '')
      : (isInternalCandidate ? '[INTERNAL CANDIDATE]' : '');
    
    const application = new this.applicationModel({
      candidateId: new Types.ObjectId(dto.candidateId),
      requisitionId: new Types.ObjectId(dto.requisitionId),
      assignedHr: dto.assignedHr ? new Types.ObjectId(dto.assignedHr) : undefined,
      currentStage: ApplicationStage.SCREENING,
      status: ApplicationStatus.SUBMITTED,
    });
    
    // Store screening metadata (we'll add it to the returned object, not schema)
    const savedApplication = await application.save();
    
    // Add screening metadata to application object (for frontend use)
    const applicationWithMetadata = {
      ...savedApplication.toObject(),
      screeningResult: screeningResult || null,
      isInternalCandidate: isInternalCandidate,
    };

    // =========================================================================
    // NOTIFICATION: Notify HR Employees and HR Managers about new application
    // =========================================================================
    // When a candidate applies, HR staff should be notified to review the 
    // application and begin the screening process.
    // =========================================================================
    try {
      // Get job requisition details for the notification
      const jobTemplate = await this.jobTemplateModel
        .findById(jobRequisition.templateId)
        .lean()
        .exec();
      const positionTitle = (jobTemplate as any)?.title || 'Position';

      // Check if candidate is a referral
      const isReferral = await this.referralModel.exists({
        candidateId: new Types.ObjectId(dto.candidateId),
      });
      
      // Include internal candidate status in notification
      const isInternal = isInternalCandidate;

      // Find all HR Employees and HR Managers to notify
      const hrStaff = await this.employeeSystemRoleModel
        .find({
          roles: { $in: [SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER] },
          isActive: true,
        })
        .select('employeeProfileId')
        .lean()
        .exec();

      const hrRecipientIds = hrStaff
        .map((hr: any) => hr.employeeProfileId?.toString())
        .filter(Boolean);

      if (hrRecipientIds.length > 0) {
        // Prepare notification data (only include fields that exist in the interface)
        const notificationData: any = {
          applicationId: savedApplication._id.toString(),
          candidateName: candidate.firstName + ' ' + (candidate.lastName || ''),
          positionTitle: positionTitle,
          requisitionId: dto.requisitionId,
          isReferral: !!isReferral,
        };
        
        // Add optional screening metadata if available
        if (screeningResult) {
          notificationData.screeningScore = screeningResult.score;
          notificationData.screeningPassed = screeningResult.passed;
        }
        if (isInternal) {
          notificationData.isInternalCandidate = true;
        }
        
        await this.notificationsService.notifyHRNewApplication(
          hrRecipientIds,
          notificationData,
        );
        console.log(`[APPLICATION] Notified ${hrRecipientIds.length} HR staff about new application`);
      }
    } catch (notifError) {
      console.warn('[APPLICATION] Failed to send HR notifications:', notifError);
      // Don't fail the application submission if notification fails
    }

    return applicationWithMetadata as any;
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
      .populate({
        path: 'requisitionId',
        populate: {
          path: 'templateId',
          model: 'JobTemplate'
        }
      })
      .lean();

    // DEBUG: Log what data is being returned
    if (applications.length > 0) {
      const sampleApp = applications[0] as any;
      console.log('=== DEBUG: Application Data Structure ===');
      console.log('Sample Application ID:', sampleApp._id);
      console.log('requisitionId exists:', !!sampleApp.requisitionId);
      console.log('requisitionId type:', typeof sampleApp.requisitionId);
      if (sampleApp.requisitionId) {
        console.log('requisitionId._id:', sampleApp.requisitionId._id);
        console.log('requisitionId.templateId exists:', !!sampleApp.requisitionId.templateId);
        console.log('requisitionId.templateId type:', typeof sampleApp.requisitionId.templateId);
        if (sampleApp.requisitionId.templateId) {
          console.log('templateId.title:', sampleApp.requisitionId.templateId.title);
          console.log('templateId.department:', sampleApp.requisitionId.templateId.department);
        }
        console.log('requisitionId.location:', sampleApp.requisitionId.location);
      }
      console.log('=========================================');
    }

    // Fetch interviews for all applications and attach them
    let applicationsWithInterviews = applications;
    
    if (applications.length > 0) {
      const applicationIds = applications.map((app: any) => {
        // Handle both ObjectId and string formats
        const id = app._id;
        return id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id));
      });
      
      const interviews = await this.interviewModel
        .find({ applicationId: { $in: applicationIds } })
        .lean();

      // Group interviews by application ID - normalize IDs for consistent comparison
      const interviewsByApplication: Record<string, any[]> = {};
      for (const interview of interviews) {
        const interviewAppId = (interview as any).applicationId;
        // Normalize to string for consistent comparison
        const appId = interviewAppId instanceof Types.ObjectId 
          ? interviewAppId.toString() 
          : String(interviewAppId);
        
        if (!interviewsByApplication[appId]) {
          interviewsByApplication[appId] = [];
        }
        interviewsByApplication[appId].push(interview);
      }

      // Attach interviews to applications - normalize application IDs too
      applicationsWithInterviews = applications.map((app: any) => {
        const appId = app._id instanceof Types.ObjectId 
          ? app._id.toString() 
          : String(app._id);
        
        return {
          ...app,
          interviews: interviewsByApplication[appId] || [],
        };
      });
    } else {
      // If no applications, ensure each has an empty interviews array
      applicationsWithInterviews = applications.map((app: any) => ({
        ...app,
        interviews: [],
      }));
    }

    // =============================================================
    // REFERRAL & INTERNAL CANDIDATE HANDLING
    // =============================================================
    // BR: Tie-breaking rules - Internal candidate > Referral > Score > Date
    // =============================================================
    const referralCandidates = await this.referralModel
      .find()
      .select('candidateId')
      .lean();
    const referralCandidateIds = new Set(
      referralCandidates.map((ref: any) => ref.candidateId.toString()),
    );

    // Identify internal candidates (existing employees)
    const candidateIds = applicationsWithInterviews.map((app: any) => {
      return app.candidateId?._id?.toString() || app.candidateId?.toString();
    }).filter(Boolean);
    
    const internalCandidateIds = new Set<string>();
    if (candidateIds.length > 0) {
      try {
        // Check by email and national ID
        const candidates = await this.candidateModel
          .find({ _id: { $in: candidateIds.map(id => new Types.ObjectId(id)) } })
          .select('personalEmail nationalId')
          .lean();
        
        for (const candidate of candidates) {
          const candidateId = candidate._id.toString();
          const isInternal = await this.identifyInternalCandidate(candidate as any);
          if (isInternal) {
            internalCandidateIds.add(candidateId);
          }
        }
      } catch (error) {
        console.warn('[APPLICATIONS] Error identifying internal candidates:', error);
      }
    }

    // Add isReferral and isInternalCandidate flags to each application
    // Also add 'requisition' and 'template' aliases for frontend compatibility
    const applicationsWithFlags = applicationsWithInterviews.map((app: any) => {
      const candidateId =
        app.candidateId?._id?.toString() ||
        app.candidateId?.toString();
      const isReferral = candidateId ? referralCandidateIds.has(candidateId) : false;
      const isInternal = candidateId ? internalCandidateIds.has(candidateId) : false;
      
      // Create aliases for frontend compatibility
      const requisition = app.requisitionId ? {
        ...app.requisitionId,
        // Add template alias for templateId
        template: app.requisitionId.templateId || null,
      } : null;
      
      return {
        ...app,
        // Add requisition alias (points to same data as requisitionId but with template alias)
        requisition,
        isReferral,
        isInternalCandidate: isInternal,
      };
    });

    // Sort by priority: Internal Candidates > Referrals > Others
    // BR: Tie-breaking rules - Internal candidate preference
    if (prioritizeReferrals) {
      const internalCandidates: any[] = [];
      const referrals: any[] = [];
      const others: any[] = [];

      for (const app of applicationsWithFlags) {
        if (app.isInternalCandidate) {
          internalCandidates.push(app);
        } else if (app.isReferral) {
          referrals.push(app);
        } else {
          others.push(app);
        }
      }

      // Return: Internal candidates first, then referrals, then others
      return [...internalCandidates, ...referrals, ...others];
    }

    return applicationsWithFlags;
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

    // CHANGED - Sync CandidateStatus with ApplicationStatus
    try {
      const candidateId = typeof application.candidateId === 'object' 
        ? (application.candidateId as any)._id 
        : application.candidateId;
      
      if (candidateId) {
        let newCandidateStatus: CandidateStatus | null = null;
        
        // Map ApplicationStatus to CandidateStatus
        switch (dto.status) {
          case ApplicationStatus.IN_PROCESS:
            // Check stage to determine if SCREENING or INTERVIEW
            if (newStage === ApplicationStage.SCREENING) {
              newCandidateStatus = CandidateStatus.SCREENING;
            } else {
              newCandidateStatus = CandidateStatus.INTERVIEW;
            }
            break;
          case ApplicationStatus.OFFER:
            newCandidateStatus = CandidateStatus.OFFER_SENT;
            break;
          case ApplicationStatus.HIRED:
            newCandidateStatus = CandidateStatus.HIRED;
            break;
          case ApplicationStatus.REJECTED:
            newCandidateStatus = CandidateStatus.REJECTED;
            break;
          // SUBMITTED stays as APPLIED (already set during registration)
        }
        
        if (newCandidateStatus) {
          await this.candidateModel.findByIdAndUpdate(candidateId, {
            status: newCandidateStatus,
          });
          console.log(`✅ Synced CandidateStatus to ${newCandidateStatus} for candidate ${candidateId}`);
        }
      }
    } catch (e) {
      // non-critical, log but don't fail
      console.warn('Failed to sync candidate status:', e);
    }

    // REC-017, REC-022: Send notification to candidate about status update
    try {
      const candidate = (application as any).candidateId;
      if (candidate && candidate.personalEmail) {
        // CHANGED - REC-022: Include rejection reason in notification context
        await this.sendNotification(
          'application_status',
          candidate.personalEmail,
          {
            candidateName: candidate.firstName || 'Candidate',
            status: dto.status,
            // CHANGED - Pass rejection reason if provided
            rejectionReason: dto.rejectionReason,
          },
          { nonBlocking: true },
        );
      }
    } catch (e) {
      // non-critical, log but don't fail
      console.warn('Failed to send status update notification:', e);
    }

    // Notify HR Employees when application is REJECTED or HIRED
    if (dto.status === ApplicationStatus.REJECTED || dto.status === ApplicationStatus.HIRED) {
      try {
        const candidate = (application as any).candidateId;
        const candidateName = candidate?.fullName || 
          `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() || 
          'Candidate';
        const candidateIdStr = candidate?._id?.toString() || candidate?.toString();

        // Get position title
        let positionTitle = 'Position';
        if (application.requisitionId) {
          const job = await this.jobModel.findById(application.requisitionId).populate('template').lean();
          positionTitle = (job as any)?.template?.title || 'Position';
        }

        // Get all HR Employee IDs
        const hrEmployees = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.HR_EMPLOYEE] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();
        const hrEmployeeIds = hrEmployees.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

        if (hrEmployeeIds.length > 0) {
          if (dto.status === ApplicationStatus.REJECTED) {
            // Notify HR Employees about rejection
            await this.notificationsService.notifyHREmployeesCandidateRejected(
              hrEmployeeIds,
              {
                candidateName,
                candidateId: candidateIdStr || '',
                positionTitle,
                applicationId: id,
                rejectionReason: dto.rejectionReason,
              },
            );

            // Send in-app notification to candidate about rejection
            if (candidateIdStr) {
              await this.notificationsService.notifyCandidateRejected(
                candidateIdStr,
                {
                  positionTitle,
                  applicationId: id,
                  rejectionReason: dto.rejectionReason,
                },
              );
            }

            console.log(`[UPDATE_STATUS] Notified ${hrEmployeeIds.length} HR Employees about rejection`);
          } else if (dto.status === ApplicationStatus.HIRED) {
            // Notify HR Employees about hiring
            await this.notificationsService.notifyHREmployeesCandidateHired(
              hrEmployeeIds,
              {
                candidateName,
                candidateId: candidateIdStr || '',
                positionTitle,
                applicationId: id,
              },
            );

            // Send in-app notification to candidate about acceptance
            if (candidateIdStr) {
              await this.notificationsService.notifyCandidateAccepted(
                candidateIdStr,
                {
                  positionTitle,
                  applicationId: id,
                },
              );
            }

            console.log(`[UPDATE_STATUS] Notified ${hrEmployeeIds.length} HR Employees about hiring`);
          }
        }
      } catch (notifError) {
        console.warn('Failed to notify HR Employees about status change:', notifError);
      }
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

  // =============================================================================
  // GET HR EMPLOYEES FOR INTERVIEW PANEL SELECTION
  // =============================================================================
  // Returns ONLY employees with HR_EMPLOYEE role who can be assigned as 
  // panel members for conducting interviews.
  // HR Managers are NOT included - only HR Employees can be panel members.
  // =============================================================================
  async getHREmployeesForPanel() {
    try {
      // Get ONLY employees with HR_EMPLOYEE role (not HR_MANAGER)
      const hrEmployeeRoles = await this.employeeSystemRoleModel
        .find({
          roles: { $in: [SystemRole.HR_EMPLOYEE] },  // HR_EMPLOYEE only
          isActive: true,
        })
        .select('employeeProfileId')
        .lean()
        .exec();

      const hrEmployeeIds = hrEmployeeRoles
        .map((role: any) => role.employeeProfileId?.toString())
        .filter(Boolean);

      if (hrEmployeeIds.length === 0) {
        return [];
      }

      // Get the employee profiles for these HR employees using the service
      // CHANGED: Only include ACTIVE employees as panel members
      const hrEmployees: any[] = [];
      for (const empId of hrEmployeeIds) {
        try {
          const emp: any = await this.employeeProfileService.findOne(empId);
          if (emp && emp.status === EmployeeStatus.ACTIVE) {
            hrEmployees.push({
              _id: emp._id?.toString() || empId,
              id: emp._id?.toString() || empId,
              firstName: emp.firstName,
              lastName: emp.lastName,
              fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
              email: emp.workEmail || emp.personalEmail,
              department: typeof emp.department === 'object' 
                ? emp.department?.name 
                : emp.department,
            });
          }
        } catch (e) {
          // Skip this employee if not found
          console.warn(`Could not fetch employee ${empId}:`, e);
        }
      }

      return hrEmployees;
    } catch (error) {
      console.error('Error fetching HR Employees for panel:', error);
      return [];
    }
  }

  // CHANGED - New endpoint to get eligible panel members based on interview stage
  /**
   * Get Eligible Panel Members based on Interview Stage
   * 
   * - HR_INTERVIEW: Only HR Employees can be panel members
   * - DEPARTMENT_INTERVIEW: HR Employees + Employees from the job's department
   * 
   * @param applicationId - The application being interviewed
   * @param stage - The interview stage (hr_interview or department_interview)
   */
  async getEligiblePanelMembers(applicationId: string, stage: string) {
    try {
      // 1. Validate applicationId
      if (!Types.ObjectId.isValid(applicationId)) {
        throw new BadRequestException('Invalid application ID format');
      }

      // 2. Get the application with requisition and template to find department
      const application = await this.applicationModel
        .findById(applicationId)
        .populate({
          path: 'requisitionId',
          populate: {
            path: 'templateId',  // FIXED: was 'template', should be 'templateId'
            model: 'JobTemplate',
            select: 'department title',
          },
        })
        .lean();

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      // 3. Build list of eligible employees
      const eligibleEmployees: any[] = [];
      const addedIds = new Set<string>(); // Prevent duplicates

      // Helper function to add employee to list
      const addEmployee = (emp: any, isHR: boolean, deptName?: string) => {
        const empId = emp._id?.toString();
        if (empId && !addedIds.has(empId)) {
          addedIds.add(empId);
          eligibleEmployees.push({
            _id: empId,
            id: empId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            workEmail: emp.workEmail,
            department: deptName || (typeof emp.department === 'object' ? emp.department?.name : emp.department),
            isHR: isHR,
          });
        }
      };

      // 4. For HR_INTERVIEW: Get ALL employees from HR department
      if (stage === ApplicationStage.HR_INTERVIEW || stage === 'hr_interview') {
        console.log(`[getEligiblePanelMembers] HR Interview - fetching HR department employees`);
        
        // First, get HR Employees by role
        const hrEmployeeRoles = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();

        const hrEmployeeIds = hrEmployeeRoles
          .map((role: any) => role.employeeProfileId?.toString())
          .filter(Boolean);

        // Add HR role-based employees - CHANGED: Only ACTIVE employees
        for (const empId of hrEmployeeIds) {
          try {
            const emp: any = await this.employeeProfileService.findOne(empId);
            // CHANGED: Only include ACTIVE employees as panel members
            if (emp && emp.status === EmployeeStatus.ACTIVE) {
              addEmployee(emp, true, 'HR');
            }
          } catch (e) {
            console.warn(`Could not fetch HR employee ${empId}:`, e);
          }
        }

        // Also get employees from HR department by department name
        const hrDepartment = await this.departmentModel.findOne({ 
          name: { $regex: /^(hr|human\s*resource)/i } 
        }).lean();

        if (hrDepartment) {
          // CHANGED: Only ACTIVE employees
          const hrDeptEmployees = await this.employeeModel
            .find({
              primaryDepartmentId: hrDepartment._id,
              status: EmployeeStatus.ACTIVE,
            })
            .select('_id firstName lastName fullName workEmail primaryDepartmentId')
            .lean()
            .exec();

          for (const emp of hrDeptEmployees) {
            addEmployee(emp, true, 'HR');
          }
          console.log(`[getEligiblePanelMembers] Found ${hrDeptEmployees.length} HR department employees`);
        }
      }

      // 5. For DEPARTMENT_INTERVIEW: Get employees from the job's target department
      if (stage === ApplicationStage.DEPARTMENT_INTERVIEW || stage === 'department_interview') {
        // Get department name from the job template
        let departmentName: string | undefined;
        const requisition = application.requisitionId as any;
        
        // Try to get department from populated requisition
        departmentName = requisition?.templateId?.department || requisition?.template?.department;
        
        // If requisition wasn't populated, try to fetch it directly
        if (!departmentName && application.requisitionId) {
          try {
            const reqId = typeof application.requisitionId === 'object' 
              ? (application.requisitionId as any)._id 
              : application.requisitionId;
            
            if (reqId) {
              const jobReq = await this.jobModel
                .findById(reqId)
                .populate('templateId')
                .lean();
              
              if (jobReq) {
                departmentName = (jobReq as any).templateId?.department || (jobReq as any).template?.department;
                console.log(`[getEligiblePanelMembers] Fetched department from job requisition: ${departmentName}`);
              }
            }
          } catch (e) {
            console.warn('[getEligiblePanelMembers] Could not fetch job requisition:', e);
          }
        }

        console.log(`[getEligiblePanelMembers] Department Interview - target department: ${departmentName || 'NOT FOUND'}`);

        // Check if the target department is HR-related
        const isHRDepartment = departmentName && /^(hr|human\s*resource)/i.test(departmentName);

        if (isHRDepartment) {
          // If the job is for HR department, include HR role employees AND HR department employees
          console.log(`[getEligiblePanelMembers] Target department is HR - including HR role employees`);
          
          // Get HR role employees
          const hrEmployeeRoles = await this.employeeSystemRoleModel
            .find({
              roles: { $in: [SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER] },
              isActive: true,
            })
            .select('employeeProfileId')
            .lean()
            .exec();

          const hrEmployeeIds = hrEmployeeRoles
            .map((role: any) => role.employeeProfileId?.toString())
            .filter(Boolean);

          // CHANGED: Only ACTIVE employees
          for (const empId of hrEmployeeIds) {
            try {
              const emp: any = await this.employeeProfileService.findOne(empId);
              if (emp && emp.status === EmployeeStatus.ACTIVE) {
                addEmployee(emp, true, departmentName);
              }
            } catch (e) {
              console.warn(`Could not fetch HR employee ${empId}:`, e);
            }
          }

          // Also get employees from HR department by department record
          const hrDepartment = await this.departmentModel.findOne({ 
            name: { $regex: /^(hr|human\s*resource)/i } 
          }).lean();

          if (hrDepartment) {
            // CHANGED: Only ACTIVE employees
            const hrDeptEmployees = await this.employeeModel
              .find({
                primaryDepartmentId: hrDepartment._id,
                status: EmployeeStatus.ACTIVE,
              })
              .select('_id firstName lastName fullName workEmail primaryDepartmentId')
              .lean()
              .exec();

            for (const emp of hrDeptEmployees) {
              addEmployee(emp, true, departmentName);
            }
            console.log(`[getEligiblePanelMembers] Found ${hrDeptEmployees.length} HR department employees`);
          }
        } else if (departmentName) {
          // Non-HR department - find employees in that specific department
          // First try exact match (case-insensitive)
          let department = await this.departmentModel.findOne({ 
            name: { $regex: new RegExp(`^${departmentName}$`, 'i') }
          }).lean();

          // If no exact match, try partial match (department name contains the search term)
          if (!department) {
            department = await this.departmentModel.findOne({ 
              name: { $regex: new RegExp(departmentName, 'i') }
            }).lean();
            if (department) {
              console.log(`[getEligiblePanelMembers] Found partial match department: ${(department as any).name}`);
            }
          }

          // If still no match, try reverse partial match (search term contains department name)
          if (!department) {
            const allDepartments = await this.departmentModel.find().select('_id name').lean();
            department = allDepartments.find((d: any) => 
              departmentName.toLowerCase().includes(d.name.toLowerCase()) ||
              d.name.toLowerCase().includes(departmentName.toLowerCase())
            );
            if (department) {
              console.log(`[getEligiblePanelMembers] Found reverse partial match department: ${(department as any).name}`);
            }
          }

          if (department) {
            const deptId = department._id;
            const deptName = (department as any).name || departmentName;
            
            console.log(`[getEligiblePanelMembers] Searching for employees in department ID: ${deptId}, Name: ${deptName}`);
            
            // CHANGED: Get only ACTIVE employees and filter by department
            const allEmployees = await this.employeeModel
              .find({
                status: EmployeeStatus.ACTIVE,
              })
              .select('_id firstName lastName fullName workEmail primaryDepartmentId')
              .populate('primaryDepartmentId', 'name')
              .lean()
              .exec();

            console.log(`[getEligiblePanelMembers] Total active employees: ${allEmployees.length}`);

            // Filter employees that belong to this department
            const departmentEmployees = allEmployees.filter((emp: any) => {
              // Check if employee's department matches (by ID or name)
              const empDeptId = emp.primaryDepartmentId?._id?.toString() || emp.primaryDepartmentId?.toString();
              const empDeptName = emp.primaryDepartmentId?.name;
              
              const matchById = empDeptId === deptId.toString();
              const matchByName = empDeptName && empDeptName.toLowerCase() === deptName.toLowerCase();
              
              return matchById || matchByName;
            });

            console.log(`[getEligiblePanelMembers] Found ${departmentEmployees.length} employees in ${deptName} department`);

            // Add only department employees
            for (const emp of departmentEmployees) {
              addEmployee(emp, false, deptName);
            }

            // If no employees in this specific department, log for debugging
            if (departmentEmployees.length === 0) {
              console.log(`[getEligiblePanelMembers] No employees found in ${deptName}. Checking employee departments...`);
              const deptCounts: Record<string, number> = {};
              allEmployees.forEach((emp: any) => {
                const dept = emp.primaryDepartmentId?.name || 'Unassigned';
                deptCounts[dept] = (deptCounts[dept] || 0) + 1;
              });
              console.log(`[getEligiblePanelMembers] Employee distribution by department:`, deptCounts);
            }

            console.log(`[getEligiblePanelMembers] Total eligible for ${deptName}: ${departmentEmployees.length} employees`);
          } else {
            console.warn(`[getEligiblePanelMembers] Department not found: ${departmentName}`);
            
            // List available departments for debugging
            const availableDepts = await this.departmentModel.find().select('name').lean();
            console.log(`[getEligiblePanelMembers] Available departments:`, availableDepts.map((d: any) => d.name));
            
            // Try to find similar department name
            const similarDept = await this.departmentModel.findOne({ 
              name: { $regex: new RegExp(departmentName, 'i') }
            }).lean();
            
            if (similarDept) {
              // CHANGED: Only ACTIVE employees
              const deptEmployees = await this.employeeModel
                .find({
                  primaryDepartmentId: similarDept._id,
                  status: EmployeeStatus.ACTIVE,
                })
                .select('_id firstName lastName fullName workEmail primaryDepartmentId')
                .lean()
                .exec();

              for (const emp of deptEmployees) {
                addEmployee(emp, false, (similarDept as any).name);
              }
              console.log(`[getEligiblePanelMembers] Found ${deptEmployees.length} employees in similar department: ${(similarDept as any).name}`);
            }
          }
        } else {
          // If no department found in job, get all employees as fallback
          console.warn(`[getEligiblePanelMembers] No department in job requisition, fetching all active employees`);
          
          // CHANGED: Only ACTIVE employees
          const allEmployees = await this.employeeModel
            .find({
              status: EmployeeStatus.ACTIVE,
            })
            .select('_id firstName lastName fullName workEmail primaryDepartmentId')
            .populate('primaryDepartmentId', 'name')
            .limit(50) // Limit to prevent too many results
            .lean()
            .exec();

          for (const emp of allEmployees) {
            const deptName = (emp as any).primaryDepartmentId?.name || 'Unknown';
            addEmployee(emp, false, deptName);
          }
          console.log(`[getEligiblePanelMembers] Added ${allEmployees.length} employees as fallback`);
        }
      }

      console.log(`[getEligiblePanelMembers] Total eligible panel members: ${eligibleEmployees.length} (stage: ${stage})`);
      return eligibleEmployees;
    } catch (error) {
      console.error('Error fetching eligible panel members:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      return [];
    }
  }

  // =============================================================================
  // INTERVIEWS - RECRUITMENT SUBSYSTEM
  // =============================================================================
  // 
  // Interview Flow:
  // 1. HR Employee schedules interview via scheduleInterview()
  // 2. Panel members receive in-app notification (notifyInterviewPanelMembers)
  // 3. Panel members receive email notification (sendNotification 'panel_invitation')
  // 4. Candidate receives in-app notification (notifyCandidateInterviewScheduled)
  // 5. Candidate receives email notification (sendNotification 'interview_scheduled')
  // 6. Application status changes from SUBMITTED → IN_PROCESS
  // 7. Panel members conduct interview and submit feedback
  // 8. When all panel members submit → interview status = 'completed'
  // 9. Application appears in HR Manager's "Job Offers" page
  //
  // =============================================================================

  /**
   * Schedule Interview
   * 
   * Creates a new interview for an application and notifies all parties:
   * - Panel members (employees assigned to interview) - in-app + email
   * - Candidate - in-app + email
   * 
   * Also updates application status from SUBMITTED to IN_PROCESS.
   */
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

    // =============================================================
    // INTERVIEW STAGE SELECTION LOGIC
    // =============================================================
    // The interview stage (SCREENING, DEPARTMENT_INTERVIEW, HR_INTERVIEW, OFFER)
    // must be manually selected because:
    // 1. An application can have multiple interviews at different stages
    //    (e.g., department interview, then HR interview)
    // 2. The stage determines what type of interview it is and which
    //    department/team should conduct it
    // 3. The stage is used to track progress through the hiring process
    // 
    // The stage selection is required and validated against ApplicationStage enum.
    // When an interview is scheduled, the application's currentStage is updated
    // to match the interview stage, and status changes from SUBMITTED to IN_PROCESS.
    // =============================================================
    
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
      applicationId: new Types.ObjectId(dto.applicationId),
      stage: dto.stage,
      scheduledDate: scheduledDate,
      method: dto.method,
      panel: dto.panel ? dto.panel.map(id => new Types.ObjectId(id)) : [],
      videoLink: dto.videoLink,
      status: 'scheduled',
    });
    const saved = await interview.save();

    try {
      // Get the current application to check its status
      const currentApp = await this.applicationModel.findById(dto.applicationId);
      
      // Build update object - always update stage, conditionally update status
      const updateData: any = {
        currentStage: dto.stage,
      };
      
      // If application is still in SUBMITTED status, change to IN_PROCESS when interview is scheduled
      if (currentApp && currentApp.status === ApplicationStatus.SUBMITTED) {
        updateData.status = ApplicationStatus.IN_PROCESS;
        console.log(`[INTERVIEW] Application ${dto.applicationId} status changed from SUBMITTED to IN_PROCESS`);
      }
      
      await this.applicationModel.findByIdAndUpdate(dto.applicationId, updateData);
      
      const app = await this.applicationModel
        .findById(dto.applicationId)
        .populate('candidateId');
      
      // Update candidate status to INTERVIEW when interview is scheduled
      if (app?.candidateId) {
        const candidateId = typeof app.candidateId === 'object' 
          ? (app.candidateId as any)._id 
          : app.candidateId;
        await this.candidateModel.findByIdAndUpdate(candidateId, {
          status: CandidateStatus.INTERVIEW,
        });
        console.log(`[INTERVIEW] Candidate ${candidateId} status changed to INTERVIEW`);
      }
      
      if (app?.requisitionId) {
        const progress = this.calculateProgress(dto.stage);
        await this.jobModel.findByIdAndUpdate(app.requisitionId, { progress });
      }

      // =====================================================================
      // INTERVIEW NOTIFICATIONS - Using RecruitmentNotificationsService
      // =====================================================================
      // 1. Send notification to CANDIDATE
      // 2. Send notifications to all PANEL MEMBERS
      // =====================================================================
      
      const candidate = (app as any)?.candidateId;
      const candidateId = candidate?._id?.toString();
      const candidateName = candidate?.fullName || candidate?.firstName || 'Candidate';
      
      // Get position title from job requisition
      const jobRequisition = app?.requisitionId
        ? await this.jobModel.findById(app.requisitionId).populate('templateId').lean().exec()
        : null;
      const positionTitle = (jobRequisition as any)?.templateId?.title || 
                           (jobRequisition as any)?.template?.title || 
                           'Position';
      
      console.log(`[INTERVIEW-NOTIF] Interview scheduled - preparing notifications:`, {
        interviewId: saved._id.toString(),
        candidateId,
        candidateName,
        positionTitle,
        scheduledDate: scheduledDate.toISOString(),
        panelMembers: dto.panel,
      });

      // =====================================================================
      // 1. SEND NOTIFICATION TO CANDIDATE via RecruitmentNotificationsService
      // =====================================================================
      if (candidateId) {
        try {
          console.log(`[INTERVIEW-NOTIF] Calling notifyCandidateInterviewScheduled for candidate: ${candidateId}`);
          const candidateResult = await this.notificationsService.notifyCandidateInterviewScheduled(
            candidateId,
            {
              interviewId: saved._id.toString(),
              positionTitle: positionTitle,
              scheduledDate: scheduledDate,
              method: dto.method || 'TBD',
              videoLink: dto.videoLink,
              stage: dto.stage,
            }
          );
          console.log(`[INTERVIEW-NOTIF] ✅ Candidate notification result:`, candidateResult);
        } catch (candidateNotifError) {
          console.error(`[INTERVIEW-NOTIF] ❌ Failed to send candidate notification:`, candidateNotifError);
        }
      } else {
        console.warn(`[INTERVIEW-NOTIF] ⚠️ No candidate ID found - skipping candidate notification`);
      }

      // =====================================================================
      // 2. SEND NOTIFICATIONS TO ALL PANEL MEMBERS via RecruitmentNotificationsService
      // =====================================================================
      if (dto.panel && dto.panel.length > 0) {
        try {
          console.log(`[INTERVIEW-NOTIF] Calling notifyInterviewPanelMembers for ${dto.panel.length} panel members:`, dto.panel);
          const panelResult = await this.notificationsService.notifyInterviewPanelMembers(
            dto.panel,
            {
              interviewId: saved._id.toString(),
              candidateName: candidateName,
              positionTitle: positionTitle,
              scheduledDate: scheduledDate,
              method: dto.method || 'TBD',
              videoLink: dto.videoLink,
              stage: dto.stage,
            }
          );
          console.log(`[INTERVIEW-NOTIF] ✅ Panel members notification result:`, panelResult);
        } catch (panelNotifError) {
          console.error(`[INTERVIEW-NOTIF] ❌ Failed to send panel notifications:`, panelNotifError);
        }
      } else {
        console.warn(`[INTERVIEW-NOTIF] ⚠️ No panel members - skipping panel notifications`);
      }
    } catch (e) {
      console.error('[INTERVIEW-NOTIF] ❌ Error in notification block:', e);
    }

    // Convert to plain object to ensure proper serialization
    return saved.toObject ? saved.toObject() : saved;
  }

  async updateInterviewStatus(id: string, dto: UpdateInterviewStatusDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid interview ID format');
    }

    const interview = await this.interviewModel.findById(id);
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

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

    const application = await this.applicationModel.findById(dto.applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.candidateId.toString() !== dto.candidateId) {
      throw new BadRequestException(
        'Candidate ID does not match the application',
      );
    }

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

    const existingOffer = await this.offerModel.findOne({
      applicationId: new Types.ObjectId(dto.applicationId),
    });
    if (existingOffer) {
      throw new BadRequestException(
        'An offer already exists for this application',
      );
    }

    if (dto.grossSalary <= 0 || !Number.isFinite(dto.grossSalary)) {
      throw new BadRequestException('Gross salary must be a positive number');
    }

    if (
      dto.signingBonus !== undefined &&
      (dto.signingBonus < 0 || !Number.isFinite(dto.signingBonus))
    ) {
      throw new BadRequestException(
        'Signing bonus must be a non-negative number',
      );
    }

    const deadline = new Date(dto.deadline);
    if (isNaN(deadline.getTime())) {
      throw new BadRequestException(
        'Invalid deadline format. Expected ISO 8601 date string.',
      );
    }

    if (deadline <= new Date()) {
      throw new BadRequestException('Deadline must be in the future');
    }

    const offer = new this.offerModel({
      applicationId: new Types.ObjectId(dto.applicationId), // Ensure ObjectId format
      candidateId: new Types.ObjectId(dto.candidateId), // Ensure ObjectId format
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

    // Update candidate status to OFFER_SENT when offer is created
    await this.candidateModel.findByIdAndUpdate(dto.candidateId, {
      status: CandidateStatus.OFFER_SENT,
    });
    console.log(`[CREATE_OFFER] Candidate ${dto.candidateId} status changed to OFFER_SENT`);

    // Update application status to OFFER and stage to OFFER
    await this.applicationModel.findByIdAndUpdate(dto.applicationId, {
      status: ApplicationStatus.OFFER,
      currentStage: ApplicationStage.OFFER,
    });
    console.log(`[CREATE_OFFER] Application ${dto.applicationId} status changed to OFFER`);

    // =============================================================
    // RECRUITMENT NOTIFICATION: Candidate - New Offer Received
    // =============================================================
    // Send both EMAIL and IN-APP notifications to the candidate
    // about their new job offer. Candidate can view and respond
    // in their "Job Offers" page.
    // =============================================================
    try {
      const candidate = await this.candidateModel
        .findById(dto.candidateId)
        .lean();
      
      // Get position title from job requisition if available
      let positionTitle = dto.role || 'Position';
      
      if (candidate) {
        // 1. Send EMAIL notification
        if (candidate.personalEmail) {
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
            { nonBlocking: true },
          );
          console.log(`[CREATE_OFFER] Email notification sent to candidate: ${candidate.personalEmail}`);
        }

        // 2. Send IN-APP notification
        if (candidate._id) {
          await this.notificationsService.notifyCandidateOfferReceived(
            candidate._id.toString(),
            {
              offerId: savedOffer._id.toString(),
              positionTitle: positionTitle,
              grossSalary: dto.grossSalary,
              deadline: deadline,
            },
          );
          console.log(`[CREATE_OFFER] In-app notification sent to candidate: ${candidate._id}`);
        }
      }
    } catch (e) {
      // Non-critical - log but don't fail offer creation
      console.warn('Failed to send offer notifications:', e);
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

    if (offer.finalStatus !== OfferFinalStatus.PENDING) {
      throw new BadRequestException(
        `Cannot respond to offer: Offer has already been finalized with status: ${offer.finalStatus}.`,
      );
    }

    if (offer.deadline && new Date(offer.deadline) < new Date()) {
      throw new BadRequestException(
        `Cannot respond to offer: The response deadline (${offer.deadline.toLocaleDateString()}) has passed. Please contact HR.`,
      );
    }

    if (offer.applicantResponse !== OfferResponseStatus.PENDING) {
      throw new BadRequestException(
        `Offer has already been ${offer.applicantResponse}. Cannot change response.`,
      );
    }

    const updateData: Partial<{
      applicantResponse: OfferResponseStatus;
      candidateSignedAt: Date;
    }> = { applicantResponse: dto.applicantResponse };

    if (dto.applicantResponse === OfferResponseStatus.ACCEPTED) {
      updateData.candidateSignedAt = new Date();
    }

    const updated = await this.offerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('applicationId');
    if (!updated) {
      throw new NotFoundException('Offer not found');
    }

    // CHANGED - Sync CandidateStatus when candidate rejects offer (WITHDRAWN)
    if (dto.applicantResponse === OfferResponseStatus.REJECTED) {
      try {
        const application = (updated as any).applicationId;
        if (application && application.candidateId) {
          const candidateId = typeof application.candidateId === 'object'
            ? application.candidateId._id
            : application.candidateId;
          
          await this.candidateModel.findByIdAndUpdate(candidateId, {
            status: CandidateStatus.WITHDRAWN,
          });
          console.log(`✅ Synced CandidateStatus to WITHDRAWN for candidate ${candidateId} (rejected offer)`);
        }
      } catch (e) {
        console.warn('Could not update candidate status after offer rejection:', e);
      }
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
          
          // CHANGED - Sync CandidateStatus to OFFER_ACCEPTED when candidate accepts offer
          const candidateId = typeof application.candidateId === 'object'
            ? application.candidateId._id
            : application.candidateId;
          
          await this.candidateModel.findByIdAndUpdate(candidateId, {
            status: CandidateStatus.OFFER_ACCEPTED,
          });
          console.log(`✅ Synced CandidateStatus to OFFER_ACCEPTED for candidate ${candidateId}`);
        }
      } catch (e) {
        // Non-critical, onboarding will be created when employee profile is created
        console.warn('Could not trigger onboarding automatically:', e);
      }
    }

    // =============================================================
    // RECRUITMENT NOTIFICATION: HR Manager - Candidate Responded
    // =============================================================
    // Notify HR Manager and HR Employees when candidate accepts or rejects.
    // This allows HR Manager to:
    // - If accepted: Finalize the offer and mark as hired
    // - If rejected: Consider other candidates or close position
    // =============================================================
    try {
      const application = (updated as any).applicationId;
      const candidateId = updated.candidateId?.toString() || application?.candidateId?.toString();
      
      // Get candidate name
      let candidateName = 'Candidate';
      if (candidateId) {
        const candidate = await this.candidateModel.findById(candidateId).lean();
        if (candidate) {
          candidateName = (candidate as any).fullName || 
            `${(candidate as any).firstName || ''} ${(candidate as any).lastName || ''}`.trim() || 
            'Candidate';
        }
      }

      // Get position title from job requisition
      let positionTitle = (updated as any).role || 'Position';
      if (application?.requisitionId) {
        try {
          const job = await this.jobModel.findById(application.requisitionId).populate('template').lean();
          positionTitle = (job as any)?.template?.title || positionTitle;
        } catch (e) {
          console.warn('Could not get job title:', e);
        }
      }

      // Get all HR users to notify (HR Manager + HR Employees)
      const hrUsers = await this.employeeSystemRoleModel
        .find({
          roles: { $in: [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE] },
          isActive: true,
        })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrUserIds = hrUsers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

      if (hrUserIds.length > 0) {
        await this.notificationsService.notifyHROfferResponse(
          hrUserIds,
          {
            candidateName,
            candidateId: candidateId || '',
            positionTitle,
            offerId: id,
            applicationId: application?._id?.toString() || '',
            response: dto.applicantResponse === OfferResponseStatus.ACCEPTED ? 'accepted' : 'rejected',
          },
        );
        console.log(`[RESPOND_OFFER] Notified ${hrUserIds.length} HR users about candidate ${dto.applicantResponse}`);
      }
    } catch (e) {
      // Non-critical - notification failure shouldn't fail the response
      console.warn('Failed to notify HR about offer response:', e);
    }

    return updated;
  }

  /**
   * Finalize Offer - RECRUITMENT SUBSYSTEM
   * 
   * This method handles the final step of the hiring workflow.
   * HR Manager uses this to approve or reject an offer after candidate response.
   * 
   * HIRING NOTIFICATION FLOW (when offer APPROVED and candidate ACCEPTED):
   * 1. Application status → HIRED
   * 2. notifyHREmployeesCandidateHired() → All HR Employees get in-app notification
   *    "🎉 A candidate has been HIRED! [candidateName] for [positionTitle]"
   * 3. notifyCandidateAccepted() → Candidate gets in-app notification
   *    "Congratulations! You have been HIRED for [positionTitle]!"
   * 4. sendNotification('application_status') → Candidate gets acceptance EMAIL
   * 5. HR Employee can now see HIRED status in "Candidate Tracking" page
   * 
   * REJECTION NOTIFICATION FLOW (when offer REJECTED):
   * 1. Application status → REJECTED
   * 2. notifyHREmployeesCandidateRejected() → All HR Employees get in-app notification
   *    "❌ A candidate has been REJECTED. [candidateName] for [positionTitle]"
   * 3. notifyCandidateRejected() → Candidate gets in-app notification
   *    "Thank you for your interest... we will not be moving forward..."
   * 4. sendNotification('application_status') → Candidate gets rejection EMAIL
   * 5. HR Employee can now see REJECTED status in "Candidate Tracking" page
   */
  async finalizeOffer(id: string, dto: FinalizeOfferDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid offer ID format');
    }

    const offer = await this.offerModel.findById(id).populate('applicationId');
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

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

    // Get application and candidate details for notifications
    const application = (offer as any).applicationId;
    const candidateId = (offer as any).candidateId?.toString() || application?.candidateId?.toString();
    
    // Get job requisition for position title
    let positionTitle = 'Position';
    if (application?.requisitionId) {
      try {
        const job = await this.jobModel.findById(application.requisitionId).populate('template').lean();
        positionTitle = (job as any)?.template?.title || 'Position';
      } catch (e) {
        console.warn('Could not get job title for notification:', e);
      }
    }

    // Get candidate name
    let candidateName = 'Candidate';
    if (candidateId) {
      try {
        const candidate = await this.candidateModel.findById(candidateId).lean();
        if (candidate) {
          candidateName = (candidate as any).fullName || 
            `${(candidate as any).firstName || ''} ${(candidate as any).lastName || ''}`.trim() || 
            'Candidate';
        }
      } catch (e) {
        console.warn('Could not get candidate name for notification:', e);
      }
    }

    // Get all HR Employee IDs for notifications
    const getHREmployeeIds = async (): Promise<string[]> => {
      try {
        const hrEmployees = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.HR_EMPLOYEE] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();
        return hrEmployees.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);
      } catch (e) {
        console.warn('Could not fetch HR Employee IDs:', e);
        return [];
      }
    };

    // BR: When offer is APPROVED and accepted, hire the candidate
    if (
      dto.finalStatus === OfferFinalStatus.APPROVED &&
      offer.applicantResponse === OfferResponseStatus.ACCEPTED
    ) {
      try {
        if (application && application._id) {
          // Update application status to HIRED
          await this.applicationModel.findByIdAndUpdate(application._id, {
            status: ApplicationStatus.HIRED,
            currentStage: ApplicationStage.OFFER,
          });

          // Update job requisition progress
          if (application.requisitionId) {
            const progress = this.calculateProgress('hired');
            await this.jobModel.findByIdAndUpdate(application.requisitionId, {
              progress,
            });
          }

          console.log(
            `Offer finalized and approved. Application ${application._id} marked as HIRED.`,
          );

          // =============================================================
          // RECRUITMENT NOTIFICATION: HR Employees - Candidate Hired
          // =============================================================
          // Notify all HR Employees that a candidate has been hired.
          // This allows HR Employees to:
          // - Track the candidate's status in "Candidate Tracking"
          // - Prepare onboarding documents
          // - Send the official acceptance letter
          // =============================================================
          try {
            const hrEmployeeIds = await getHREmployeeIds();
            if (hrEmployeeIds.length > 0) {
              await this.notificationsService.notifyHREmployeesCandidateHired(
                hrEmployeeIds,
                {
                  candidateName,
                  candidateId: candidateId || '',
                  positionTitle,
                  applicationId: application._id.toString(),
                  offerId: id,
                },
              );
              console.log(`[FINALIZE_OFFER] Notified ${hrEmployeeIds.length} HR Employees about hiring`);
            }
          } catch (notifError) {
            console.warn('Failed to notify HR Employees about hiring:', notifError);
          }

          // =============================================================
          // RECRUITMENT NOTIFICATION: Candidate - Hired (In-App)
          // =============================================================
          // Send in-app notification to candidate about acceptance.
          // Candidate sees this in their notification center.
          // Message: "Congratulations! You have been HIRED!"
          // =============================================================
          if (candidateId) {
            try {
              await this.notificationsService.notifyCandidateAccepted(
                candidateId,
                {
                  positionTitle,
                  applicationId: application._id.toString(),
                },
              );
              console.log(`[FINALIZE_OFFER] Sent acceptance notification to candidate ${candidateId}`);
            } catch (notifError) {
              console.warn('Failed to send acceptance notification to candidate:', notifError);
            }
          }

          // SEND ACCEPTANCE EMAIL to candidate
          const candidateDoc = await this.candidateModel.findById(candidateId).lean();
          if (candidateDoc && (candidateDoc as any).personalEmail) {
            try {
              await this.sendNotification(
                'application_status',
                (candidateDoc as any).personalEmail,
                {
                  candidateName,
                  status: ApplicationStatus.HIRED,
                },
                { nonBlocking: true },
              );
            } catch (e) {
              console.warn('Failed to send acceptance email:', e);
            }
          }
        }
      } catch (e) {
        // Non-critical
        console.warn(
          'Could not complete post-approval actions:',
          e,
        );
      }
    }

    // =============================================================
    // REJECTION FLOW
    // =============================================================
    // When HR Manager rejects the offer, we need to:
    // 1. Update application status to REJECTED
    // 2. Notify all HR Employees (in-app)
    // 3. Notify candidate (in-app)
    // 4. Send rejection email to candidate
    // =============================================================
    if (dto.finalStatus === OfferFinalStatus.REJECTED) {
      try {
        if (application && application._id) {
          // Step 1: Update application status to REJECTED
          await this.applicationModel.findByIdAndUpdate(application._id, {
            status: ApplicationStatus.REJECTED,
          });

          console.log(
            `Offer rejected. Application ${application._id} marked as REJECTED.`,
          );

          // =============================================================
          // RECRUITMENT NOTIFICATION: HR Employees - Candidate Rejected
          // =============================================================
          // Notify all HR Employees that a candidate has been rejected.
          // This allows HR Employees to:
          // - Track the candidate's status in "Candidate Tracking"
          // - Update their records accordingly
          // =============================================================
          try {
            const hrEmployeeIds = await getHREmployeeIds();
            if (hrEmployeeIds.length > 0) {
              await this.notificationsService.notifyHREmployeesCandidateRejected(
                hrEmployeeIds,
                {
                  candidateName,
                  candidateId: candidateId || '',
                  positionTitle,
                  applicationId: application._id.toString(),
                },
              );
              console.log(`[FINALIZE_OFFER] Notified ${hrEmployeeIds.length} HR Employees about rejection`);
            }
          } catch (notifError) {
            console.warn('Failed to notify HR Employees about rejection:', notifError);
          }

          // =============================================================
          // RECRUITMENT NOTIFICATION: Candidate - Rejected (In-App)
          // =============================================================
          // Send in-app notification to candidate about rejection.
          // Candidate sees this in their notification center.
          // Message: "Thank you for your interest... we will not be moving forward..."
          // =============================================================
          if (candidateId) {
            try {
              await this.notificationsService.notifyCandidateRejected(
                candidateId,
                {
                  positionTitle,
                  applicationId: application._id.toString(),
                },
              );
              console.log(`[FINALIZE_OFFER] Sent rejection notification to candidate ${candidateId}`);
            } catch (notifError) {
              console.warn('Failed to send rejection notification to candidate:', notifError);
            }
          }

          // =============================================================
          // RECRUITMENT EMAIL: Candidate - Rejection Letter
          // =============================================================
          // Send rejection email to candidate's personal email.
          // Uses the 'application_status' email template.
          // =============================================================
          const candidateDoc = await this.candidateModel.findById(candidateId).lean();
          if (candidateDoc && (candidateDoc as any).personalEmail) {
            try {
              await this.sendNotification(
                'application_status',
                (candidateDoc as any).personalEmail,
                {
                  candidateName,
                  status: ApplicationStatus.REJECTED,
                },
                { nonBlocking: true },
              );
            } catch (e) {
              console.warn('Failed to send rejection email:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Could not complete post-rejection actions:', e);
      }
    }

    return updated;
  }

  // =============================================================
  // HR EMPLOYEE: REJECT CANDIDATE
  // =============================================================
  // This method is ONLY accessible by HR_EMPLOYEE role.
  // HR Manager cannot reject candidates - only HR Employee can.
  // Cannot reject if:
  // - Candidate is already finalized (hired)
  // - Employee has already been created
  // - Offer is already approved
  // =============================================================
  async rejectCandidateByHrEmployee(offerId: string, reason: string) {
    if (!Types.ObjectId.isValid(offerId)) {
      throw new BadRequestException('Invalid offer ID format');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const offer = await this.offerModel.findById(offerId).populate('applicationId');
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Get application details
    const application = (offer as any).applicationId;
    const candidateId = (offer as any).candidateId?.toString() || application?.candidateId?.toString();

    // =============================================================
    // VALIDATION: Cannot reject finalized candidates
    // =============================================================

    // 1. Cannot reject if offer is already approved (finalized)
    if (offer.finalStatus === OfferFinalStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot reject candidate: Offer has already been approved/finalized by HR Manager.',
      );
    }

    // 2. Cannot reject if application is already HIRED
    if (application && application.status === ApplicationStatus.HIRED) {
      throw new BadRequestException(
        'Cannot reject candidate: Candidate has already been hired.',
      );
    }

    // 3. Cannot reject if employee profile already exists for this candidate
    if (candidateId) {
      const employeeExists = await this.employeeModel.findOne({
        candidateId: new Types.ObjectId(candidateId),
      }).lean();
      
      if (employeeExists) {
        throw new BadRequestException(
          'Cannot reject candidate: Employee profile has already been created for this candidate.',
        );
      }
    }

    // 4. Cannot reject if application is already rejected
    if (application && application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot reject candidate: Application has already been rejected.',
      );
    }

    // =============================================================
    // PERFORM REJECTION
    // =============================================================

    // Update offer status to rejected
    const updatedOffer = await this.offerModel.findByIdAndUpdate(
      offerId,
      { 
        finalStatus: OfferFinalStatus.REJECTED,
      },
      { new: true },
    );

    // Update application status to REJECTED
    if (application && application._id) {
      await this.applicationModel.findByIdAndUpdate(application._id, {
        status: ApplicationStatus.REJECTED,
      });
    }

    // Update candidate status to REJECTED
    if (candidateId) {
      await this.candidateModel.findByIdAndUpdate(candidateId, {
        status: CandidateStatus.REJECTED,
      });
    }

    // =============================================================
    // SEND NOTIFICATIONS
    // =============================================================

    // Get position title for notifications
    let positionTitle = 'Position';
    if (application?.requisitionId) {
      try {
        const job = await this.jobModel.findById(application.requisitionId).populate('template').lean();
        positionTitle = (job as any)?.template?.title || 'Position';
      } catch (e) {
        console.warn('Could not get job title for notification:', e);
      }
    }

    // Get candidate name
    let candidateName = 'Candidate';
    if (candidateId) {
      try {
        const candidate = await this.candidateModel.findById(candidateId).lean();
        if (candidate) {
          candidateName = (candidate as any).fullName || 
            `${(candidate as any).firstName || ''} ${(candidate as any).lastName || ''}`.trim() || 
            'Candidate';
        }
      } catch (e) {
        console.warn('Could not get candidate name for notification:', e);
      }
    }

    // Notify candidate about rejection (in-app)
    if (candidateId) {
      try {
        await this.notificationsService.notifyCandidateRejected(
          candidateId,
          {
            positionTitle,
            applicationId: application?._id?.toString() || '',
            rejectionReason: reason, // Use rejectionReason parameter name as expected by the notification service
          },
        );
        console.log(`[REJECT_CANDIDATE] Sent rejection notification to candidate ${candidateId}`);
      } catch (notifError) {
        console.warn('Failed to send rejection notification to candidate:', notifError);
      }
    }

    // Send rejection email to candidate
    const candidateDoc = await this.candidateModel.findById(candidateId).lean();
    if (candidateDoc && (candidateDoc as any).personalEmail) {
      try {
        await this.sendNotification(
          'application_status',
          (candidateDoc as any).personalEmail,
          {
            candidateName,
            status: ApplicationStatus.REJECTED,
            reason: reason,
          },
          { nonBlocking: true },
        );
        console.log(`[REJECT_CANDIDATE] Sent rejection email to ${(candidateDoc as any).personalEmail}`);
      } catch (e) {
        console.warn('Failed to send rejection email:', e);
      }
    }

    console.log(`[REJECT_CANDIDATE] HR Employee rejected candidate ${candidateId} for offer ${offerId}. Reason: ${reason}`);

    return {
      message: 'Candidate rejected successfully',
      offer: updatedOffer,
      reason: reason,
    };
  }

  async getOfferByApplicationId(applicationId: string) {
    if (!Types.ObjectId.isValid(applicationId)) {
      throw new BadRequestException('Invalid application ID format');
    }

    // Try multiple query formats to handle potential type mismatches
    const applicationObjectId = new Types.ObjectId(applicationId);
    
    // Population config with nested requisition and template
    const populateConfig = [
      {
        path: 'applicationId',
        populate: {
          path: 'requisitionId',
          populate: {
            path: 'templateId',
            model: 'JobTemplate',
          },
        },
      },
      { path: 'candidateId' },
    ];
    
    // First try: exact ObjectId match
    let offer = await this.offerModel
      .findOne({ applicationId: applicationObjectId })
      .populate(populateConfig)
      .lean();

    // Second try: string match (in case it was stored as string)
    if (!offer) {
      offer = await this.offerModel
        .findOne({ applicationId: applicationId })
        .populate(populateConfig)
        .lean();
    }

    // Third try: find by string representation
    if (!offer) {
      offer = await this.offerModel
        .findOne({ applicationId: applicationId.toString() })
        .populate(populateConfig)
        .lean();
    }

    if (!offer) {
      throw new NotFoundException('Offer not found for this application');
    }

    // Add requisition and template aliases for frontend compatibility
    if (offer && (offer as any).applicationId?.requisitionId) {
      const appData = (offer as any).applicationId;
      (offer as any).applicationId = {
        ...appData,
        requisition: {
          ...appData.requisitionId,
          template: appData.requisitionId?.templateId || null,
        },
      };
    }

    return offer;
  }

  async getOffersByCandidateId(candidateId: string) {
    if (!Types.ObjectId.isValid(candidateId)) {
      throw new BadRequestException('Invalid candidate ID format');
    }

    const candidateObjectId = new Types.ObjectId(candidateId);
    
    // Population config with nested requisition and template
    const populateConfig = [
      {
        path: 'applicationId',
        populate: {
          path: 'requisitionId',
          populate: {
            path: 'templateId',
            model: 'JobTemplate',
          },
        },
      },
      { path: 'candidateId' },
    ];
    
    // Try multiple query formats to handle potential type mismatches
    // First try: exact ObjectId match
    let offers = await this.offerModel
      .find({ candidateId: candidateObjectId })
      .populate(populateConfig)
      .sort({ createdAt: -1 })
      .lean();

    // Second try: string match (in case it was stored as string)
    if (!offers || offers.length === 0) {
      offers = await this.offerModel
        .find({ candidateId: candidateId })
        .populate(populateConfig)
        .sort({ createdAt: -1 })
        .lean();
    }

    // Third try: find by string representation
    if (!offers || offers.length === 0) {
      offers = await this.offerModel
        .find({ candidateId: candidateId.toString() })
        .populate(populateConfig)
        .sort({ createdAt: -1 })
        .lean();
    }

    // Fourth try: Find candidate by ID and then find offers through applications
    // This handles cases where candidateId in offer might be from application
    if (!offers || offers.length === 0) {
      try {
        // Find all applications for this candidate
        const applications = await this.applicationModel
          .find({ candidateId: candidateObjectId })
          .select('_id')
          .lean();
        
        if (applications && applications.length > 0) {
          const applicationIds = applications.map(app => app._id);
          // Find offers for these applications
          offers = await this.offerModel
            .find({ applicationId: { $in: applicationIds } })
            .populate('applicationId')
            .populate('candidateId')
            .sort({ createdAt: -1 })
            .lean();
        }
      } catch (e) {
        console.warn('Error finding offers through applications:', e);
      }
    }

    // Debug logging - also check what candidateIds are actually in the database
    if (!offers || offers.length === 0) {
      // Try to find any offers to see what candidateIds exist
      const allOffers = await this.offerModel.find({}).select('candidateId applicationId').limit(5).lean();
      console.log(`[getOffersByCandidateId] No offers found for candidateId: ${candidateId}`);
      console.log(`[getOffersByCandidateId] Sample candidateIds in database:`, 
        allOffers.map(o => ({ 
          candidateId: o.candidateId?.toString(), 
          candidateIdType: typeof o.candidateId,
          applicationId: o.applicationId?.toString()
        }))
      );
      
      // Also check applications for this candidate
      try {
        const candidateApps = await this.applicationModel
          .find({ candidateId: candidateObjectId })
          .select('_id candidateId')
          .lean();
        console.log(`[getOffersByCandidateId] Applications for candidate:`, candidateApps);
      } catch (e) {
        console.warn('Error checking applications:', e);
      }
    } else {
      console.log(`[getOffersByCandidateId] Found ${offers.length} offers for candidateId: ${candidateId}`);
    }

    return offers || [];
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
      | 'onboarding_completed'
      | 'panel_invitation'
      | 'clearance_reminder'
      | 'access_revoked'
      // CHANGED - OFF-013: Added final_settlement notification type
      | 'final_settlement',
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
            text +=
              'Thank you for your interest in our company. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\n';
            // CHANGED - REC-022: Include custom rejection reason if provided
            if (context.rejectionReason) {
              text += `Feedback from our hiring team:\n${context.rejectionReason}\n\n`;
            }
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

        case 'onboarding_completed':
          // ONB-005: Completion notification for new hires
          subject = 'Congratulations! Onboarding Completed';
          text = `Dear ${context.employeeName || 'New Hire'},\n\n`;
          text += `Congratulations! You have successfully completed all onboarding tasks.\n\n`;
          text += `Your onboarding checklist is now complete, and you are ready to begin your journey with us.\n\n`;
          text += `If you have any questions or need assistance, please don't hesitate to contact HR.\n\n`;
          text += `Welcome aboard!\n\n`;
          text += `Best regards,\nHR Team`;
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

        // CHANGED - OFF-013: Final settlement notification
        case 'final_settlement':
          subject = `Final Settlement Initiated - ${context.employeeName || context.employeeNumber || 'Employee'}`;
          text = `Dear HR Team,\n\n`;
          text += `Final settlement process has been initiated for the following employee:\n\n`;
          text += `Employee: ${context.employeeName || 'N/A'}\n`;
          text += `Employee Number: ${context.employeeNumber || 'N/A'}\n`;
          text += `Termination Date: ${context.terminationDate || 'N/A'}\n`;
          text += `Settlement Status: ${context.settlementStatus || 'INITIATED'}\n\n`;
          text += `Settlement Components:\n`;
          text += `- Leave Encashment: ${context.leaveEncashment || 'Pending calculation'}\n`;
          text += `- Benefits Termination: ${context.benefitsTermination || 'Pending processing'}\n`;
          text += `- Final Pay: ${context.finalPay || 'Pending calculation'}\n\n`;
          if (context.errors && context.errors.length > 0) {
            text += `⚠️ Warnings/Errors:\n`;
            context.errors.forEach((err: any) => {
              text += `- ${err.step}: ${err.error}\n`;
            });
            text += '\n';
          }
          text += `Please review the settlement details in the HR system and ensure all calculations are accurate before final payout.\n\n`;
          text += `Best regards,\nHR System`;
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
      // CHANGED - REC-022: Log email content for demo/testing purposes
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL NOTIFICATION (Demo Mode - No credentials configured)');
      console.log('='.repeat(60));
      console.log(`📬 TO:      ${recipient.trim()}`);
      console.log(`📋 SUBJECT: ${subject.trim()}`);
      console.log('-'.repeat(60));
      console.log('📝 BODY:');
      console.log(text.trim());
      console.log('='.repeat(60));
      console.log('ℹ️  To send real emails, configure EMAIL_USER and EMAIL_PASS');
      console.log('='.repeat(60) + '\n');
      return; // Don't throw error, just log
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

  async createOnboarding(
    createOnboardingDto: CreateOnboardingDto,
    contractSigningDate?: Date,
    startDate?: Date,
    workEmail?: string,
    contractId?: Types.ObjectId,
    candidateId?: string, // NEW: Candidate ID to send notifications to candidate account
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

      // Validate contractId if provided (required by schema)
      let finalContractId: Types.ObjectId | null = null;
      if (contractId) {
        if (!Types.ObjectId.isValid(contractId.toString())) {
          throw new BadRequestException('Invalid contract ID format');
        }
        // Verify contract exists
        const contract = await this.contractModel.findById(contractId).lean();
        if (!contract) {
          throw new NotFoundException('Contract not found');
        }
        finalContractId = contractId;
      } else {
        // Try to find contract by employee's offer (if employee was created from contract)
        // This is a fallback - ideally contractId should be provided
        try {
          const employee = await this.employeeProfileService.findOne(
            createOnboardingDto.employeeId.toString(),
          );
          if (employee) {
            // Try to find contract through offer -> candidate -> application chain
            // This is best-effort; contractId should ideally be provided explicitly
            const candidate = await this.candidateModel
              .findOne({ personalEmail: (employee as any).personalEmail })
              .lean();
            if (candidate) {
              const offer = await this.offerModel
                .findOne({ candidateId: candidate._id })
                .lean();
              if (offer) {
                const contract = await this.contractModel
                  .findOne({ offerId: offer._id })
                  .lean();
                if (contract) {
                  finalContractId = contract._id;
                }
              }
            }
          }
        } catch (e) {
          // Non-critical - will use a placeholder if needed
          console.warn('Could not auto-resolve contractId for onboarding:', e);
        }
      }

      // If still no contractId found, we need to create a placeholder or throw error
      // Since schema requires contractId, we'll throw an error if it's still missing
      if (!finalContractId) {
        throw new BadRequestException(
          'Contract ID is required for onboarding. Please provide contractId or ensure contract exists for this employee.',
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
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Hardware allocation (ONB-012: HR Employee)',
        });
        tasks.push({
          name: 'Set up System Access (SSO)',
          department: 'IT',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: SSO and internal systems access',
        });

        // HR Employee Tasks (ONB-012: Equipment, desk, and access cards)
        // NOTE: HR Employee handles all equipment - department is HR, not Admin
        tasks.push({
          name: 'Reserve Workspace/Desk',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Workspace allocation (ONB-012: HR Employee)',
        });
        tasks.push({
          name: 'Issue ID Badge/Access Card',
          department: 'HR',
          status: OnboardingTaskStatus.PENDING,
          deadline: defaultDeadline,
          notes: 'Automated task: Access card provisioning (ONB-012: HR Employee)',
        });

        // HR Tasks (ONB-018, ONB-019: Payroll and benefits)
        // These are AUTOMATED tasks - they are triggered automatically when onboarding starts
        // So they should be marked as COMPLETED immediately
        const automatedTaskCompletedAt = new Date();
        
        tasks.push({
          name: 'Create Payroll Profile',
          department: 'HR',
          status: OnboardingTaskStatus.COMPLETED, // Auto-completed: triggered automatically
          deadline: contractSigningDate || defaultDeadline,
          completedAt: automatedTaskCompletedAt,
          notes: 'Automated task: Payroll initiation (REQ-PY-23) - Auto-completed on onboarding creation',
        });
        tasks.push({
          name: 'Process Signing Bonus',
          department: 'HR',
          status: OnboardingTaskStatus.COMPLETED, // Auto-completed: triggered automatically
          deadline: contractSigningDate || defaultDeadline,
          completedAt: automatedTaskCompletedAt,
          notes: 'Automated task: Signing bonus processing (REQ-PY-27) - Auto-completed on onboarding creation',
        });
        tasks.push({
          name: 'Set up Benefits',
          department: 'HR',
          status: OnboardingTaskStatus.COMPLETED, // Auto-completed: triggered automatically
          deadline: defaultDeadline,
          completedAt: automatedTaskCompletedAt,
          notes: 'Automated task: Benefits enrollment - Auto-completed on onboarding creation',
        });

        // New Hire Tasks (ONB-007: Document upload)
        // Check if contract was already uploaded during recruitment (ONB-002)
        // If so, mark this task as completed
        let contractTaskStatus = OnboardingTaskStatus.PENDING;
        let contractTaskNotes = 'Required: Signed contract document';
        
        if (finalContractId) {
          try {
            const existingContract = await this.contractModel.findById(finalContractId).lean();
            if (existingContract && existingContract.documentId) {
              // Contract document was already uploaded during recruitment
              contractTaskStatus = OnboardingTaskStatus.COMPLETED;
              contractTaskNotes = 'Contract already uploaded during recruitment (ONB-002)';
            }
          } catch (e) {
            // If check fails, leave as pending
          }
        }
        
        tasks.push({
          name: 'Upload Signed Contract',
          department: 'HR',
          status: contractTaskStatus,
          deadline: defaultDeadline,
          notes: contractTaskNotes,
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
        contractId: finalContractId, // Required by schema
        tasks: tasks,
        completed: false,
      });
      const saved = await onboarding.save();

      // ONB-005: Send initial welcome notification to new hire
      try {
        const employee = await this.employeeProfileService.findOne(
          createOnboardingDto.employeeId.toString(),
        );
        if (employee) {
          // Send email notification (existing behavior)
          if ((employee as any).personalEmail) {
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

          // ONB-005: Send in-app welcome notification to new hire with employee number for login
          const employeeName = `${(employee as any).firstName || ''} ${(employee as any).lastName || ''}`.trim() || 'New Hire';
          const employeeNumber = (employee as any).employeeNumber || 'N/A';
          let positionTitle = 'New Position';
          
          if ((employee as any).primaryPositionId) {
            try {
              const position = await this.organizationStructureService.getPositionById(
                (employee as any).primaryPositionId.toString(),
              );
              if (position) {
                positionTitle = position.title || 'New Position';
              }
            } catch (e) {
              // Position lookup failed, use default
            }
          }

          // ONB-004/ONB-005: Include employee number so new hire knows how to log in
          // Also include specific document upload tasks so new hire knows exactly what to upload
          const documentUploadTasks = tasks
            .filter((task: any) => 
              task.name.toLowerCase().includes('upload') ||
              task.notes?.toLowerCase().includes('required:')
            )
            .map((task: any) => ({
              name: task.name,
              notes: task.notes,
              deadline: task.deadline,
            }));

          // =====================================================================
          // ONBOARDING NOTIFICATIONS - Send to CANDIDATE account
          // =====================================================================
          // The candidate needs to receive the onboarding checklist notification
          // so they know what documents to upload and tasks to complete
          // =====================================================================
          
          console.log(`[ONBOARDING-NOTIF] Preparing onboarding notifications:`, {
            employeeId: createOnboardingDto.employeeId.toString(),
            candidateId: candidateId,
            employeeName,
            employeeNumber,
            positionTitle,
            totalTasks: tasks.length,
            documentUploadTasks: documentUploadTasks?.length || 0,
          });

          // Send notification to CANDIDATE account FIRST (this is the important one!)
          // The candidate can log in with their candidate credentials and see this
          if (candidateId) {
            try {
              console.log(`[ONBOARDING-NOTIF] Calling notifyNewHireWelcome for CANDIDATE: ${candidateId}`);
              const candidateResult = await this.notificationsService.notifyNewHireWelcome(
                candidateId,
                {
                  employeeName,
                  employeeNumber,
                  positionTitle,
                  startDate: startDate || new Date(),
                  totalTasks: tasks.length,
                  onboardingId: saved._id.toString(),
                  documentUploadTasks,
                },
              );
              console.log(`[ONBOARDING-NOTIF] ✅ CANDIDATE notification result:`, candidateResult);
            } catch (candidateNotifError) {
              console.error(`[ONBOARDING-NOTIF] ❌ Failed to send notification to CANDIDATE:`, candidateNotifError);
            }
          } else {
            console.warn(`[ONBOARDING-NOTIF] ⚠️ No candidateId provided - skipping candidate notification`);
          }

          // Also send to employee account (for when they activate their employee login)
          try {
            console.log(`[ONBOARDING-NOTIF] Calling notifyNewHireWelcome for EMPLOYEE: ${createOnboardingDto.employeeId.toString()}`);
            const employeeResult = await this.notificationsService.notifyNewHireWelcome(
              createOnboardingDto.employeeId.toString(),
              {
                employeeName,
                employeeNumber,
                positionTitle,
                startDate: startDate || new Date(),
                totalTasks: tasks.length,
                onboardingId: saved._id.toString(),
                documentUploadTasks,
              },
            );
            console.log(`[ONBOARDING-NOTIF] ✅ EMPLOYEE notification result:`, employeeResult);
          } catch (employeeNotifError) {
            console.error(`[ONBOARDING-NOTIF] ❌ Failed to send notification to EMPLOYEE:`, employeeNotifError);
          }
        }
      } catch (e) {
        // Non-critical - don't fail onboarding creation if notification fails
        console.warn('Failed to send onboarding welcome notification:', e);
      }

      // ============= ONB-001: NOTIFY DEPARTMENTS ABOUT THEIR ONBOARDING TASKS =============
      // Send notifications to IT, Admin, and HR about their assigned tasks
      try {
        // Fetch employee for notification details
        const employeeForDeptNotif = await this.employeeProfileService.findOne(
          createOnboardingDto.employeeId.toString(),
        );
        const employeeName = employeeForDeptNotif 
          ? `${(employeeForDeptNotif as any).firstName || ''} ${(employeeForDeptNotif as any).lastName || ''}`.trim() || 'New Hire'
          : 'New Hire';
        
        // Group tasks by department
        const tasksByDepartment: Record<string, string[]> = {};
        for (const task of tasks) {
          const dept = task.department || 'HR';
          if (!tasksByDepartment[dept]) {
            tasksByDepartment[dept] = [];
          }
          tasksByDepartment[dept].push(task.name);
        }

        // Get IT/System Admin users for IT tasks
        if (tasksByDepartment['IT'] && tasksByDepartment['IT'].length > 0) {
          const systemAdmins = await this.employeeSystemRoleModel
            .find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true })
            .select('employeeProfileId')
            .lean()
            .exec();
          const adminIds = systemAdmins.map((a: any) => a.employeeProfileId?.toString()).filter(Boolean);
          
          if (adminIds.length > 0) {
            await this.notificationsService.notifyOnboardingTaskAssigned(
              adminIds,
              {
                employeeId: createOnboardingDto.employeeId.toString(),
                employeeName: employeeName,
                department: 'IT',
                tasks: tasksByDepartment['IT'],
                deadline: defaultDeadline,
                onboardingId: saved._id.toString(),
              },
            );
            console.log(`[ONB-001] IT onboarding tasks notification sent to ${adminIds.length} System Admin(s)`);
          }
        }

        // Get HR users for HR and Admin tasks
        if ((tasksByDepartment['HR'] && tasksByDepartment['HR'].length > 0) || 
            (tasksByDepartment['Admin'] && tasksByDepartment['Admin'].length > 0)) {
          const hrRoles = await this.employeeSystemRoleModel
            .find({ roles: { $in: [SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER] }, isActive: true })
            .select('employeeProfileId')
            .lean()
            .exec();
          const hrIds = hrRoles.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);
          
          if (hrIds.length > 0) {
            // Notify about HR tasks
            if (tasksByDepartment['HR'] && tasksByDepartment['HR'].length > 0) {
              await this.notificationsService.notifyOnboardingTaskAssigned(
                hrIds,
                {
                  employeeId: createOnboardingDto.employeeId.toString(),
                  employeeName: employeeName,
                  department: 'HR',
                  tasks: tasksByDepartment['HR'],
                  deadline: defaultDeadline,
                  onboardingId: saved._id.toString(),
                },
              );
              console.log(`[ONB-001] HR onboarding tasks notification sent to ${hrIds.length} HR user(s)`);
            }
            
            // Notify about Admin tasks
            if (tasksByDepartment['Admin'] && tasksByDepartment['Admin'].length > 0) {
              await this.notificationsService.notifyOnboardingTaskAssigned(
                hrIds,
                {
                  employeeId: createOnboardingDto.employeeId.toString(),
                  employeeName: employeeName,
                  department: 'Admin',
                  tasks: tasksByDepartment['Admin'],
                  deadline: defaultDeadline,
                  onboardingId: saved._id.toString(),
                },
              );
              console.log(`[ONB-001] Admin onboarding tasks notification sent to ${hrIds.length} HR user(s)`);
            }
          }
        }
      } catch (deptNotifyError) {
        console.warn('[ONB-001] Failed to send department task notifications:', deptNotifyError);
        // Non-critical - don't fail onboarding creation
      }
      // ============= END ONB-001 DEPARTMENT NOTIFICATIONS =============

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
      // Use Mongoose populate to fetch employee data
      const onboardings = await this.onboardingModel
        .find()
        .populate({
          path: 'employeeId',
          select: 'firstName lastName fullName employeeNumber workEmail personalEmail',
          model: 'EmployeeProfile',
        })
        .select('-__v')
        .lean()
        .exec();

      // Transform the data to have 'employee' field for frontend
      return onboardings.map((onboarding: any) => {
        const employeeData = onboarding.employeeId;
        return {
          ...onboarding,
          // Keep original employeeId as string for reference
          employeeId: employeeData?._id?.toString() || onboarding.employeeId?.toString(),
          // Add employee object with all details
          employee: employeeData ? {
            _id: employeeData._id,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            fullName: employeeData.fullName || `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim(),
            employeeNumber: employeeData.employeeNumber,
            workEmail: employeeData.workEmail,
            personalEmail: employeeData.personalEmail,
          } : {
            fullName: 'Unknown Employee',
            employeeNumber: 'N/A',
          },
        };
      });
    } catch (error) {
      console.error('Error fetching onboardings:', error);
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

      // Convert to ObjectId for consistent comparison
      const employeeObjectId = new Types.ObjectId(employeeId);
      
      console.log(`🔍 Searching for onboarding with employeeId: ${employeeId} (ObjectId: ${employeeObjectId.toString()})`);
      
      // Try multiple query approaches to handle different storage formats
      let onboarding = await this.onboardingModel
        .findOne({ employeeId: employeeObjectId })
        .select('-__v')
        .lean()
        .exec();

      // If not found, try with string match (in case it was stored as string)
      if (!onboarding) {
        console.log(`⚠️ Not found with ObjectId, trying string match...`);
        onboarding = await this.onboardingModel
          .findOne({ employeeId: employeeId })
          .select('-__v')
          .lean()
          .exec();
      }

      // If still not found, try with $or query
      if (!onboarding) {
        console.log(`⚠️ Not found with string, trying $or query...`);
        onboarding = await this.onboardingModel
          .findOne({
            $or: [
              { employeeId: employeeId },
              { employeeId: employeeObjectId },
            ],
          })
          .select('-__v')
          .lean()
          .exec();
      }

      // Debug: Check what onboarding records exist for debugging
      if (!onboarding) {
        const allOnboardings = await this.onboardingModel
          .find({})
          .select('employeeId _id')
          .lean()
          .exec();
        console.log(`📋 Total onboarding records in DB: ${allOnboardings.length}`);
        console.log(`📋 Sample employeeIds in DB:`, allOnboardings.slice(0, 5).map(o => ({
          _id: o._id,
          employeeId: o.employeeId,
          employeeIdType: typeof o.employeeId,
          employeeIdString: o.employeeId?.toString(),
        })));
      }

      if (!onboarding) {
        throw new NotFoundException(
          `Onboarding checklist not found for employee ID: ${employeeId}`,
        );
      }

      console.log(`✅ Found onboarding record: ${onboarding._id}`);

      // Get employee info for response
      let employeeInfo: any = null;
      try {
        employeeInfo = await this.employeeModel
          .findById(employeeId)
          .select('firstName lastName employeeNumber workEmail status')
          .lean();
      } catch (e) {
        console.warn('Could not fetch employee info:', e);
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
        employee: employeeInfo ? {
          _id: employeeInfo._id,
          firstName: employeeInfo.firstName,
          lastName: employeeInfo.lastName,
          fullName: `${employeeInfo.firstName || ''} ${employeeInfo.lastName || ''}`.trim(),
          employeeNumber: employeeInfo.employeeNumber,
          workEmail: employeeInfo.workEmail,
          status: employeeInfo.status,
        } : null,
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

  // ONB-004: Allow candidates to view their onboarding after being hired
  // This method finds the employee profile linked to a candidate and returns their onboarding
  async getOnboardingByCandidateId(candidateId: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(candidateId)) {
        throw new BadRequestException('Invalid candidate ID format');
      }

      console.log(`🔍 [ONB-004] Searching for onboarding by candidateId: ${candidateId}`);

      // Step 1: Find the candidate to get their personal email
      const candidate = await this.candidateModel.findById(candidateId).lean();
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      const personalEmail = (candidate as any).personalEmail;
      console.log(`📧 Found candidate with email: ${personalEmail}`);

      // Step 2: Find the employee profile that was created from this candidate
      // The employee profile is linked via personal email (transferred from candidate)
      const employee = await this.employeeModel
        .findOne({ personalEmail: personalEmail?.toLowerCase()?.trim() })
        .select('_id firstName lastName employeeNumber workEmail status')
        .lean();

      if (!employee) {
        // No employee profile found - candidate hasn't been hired yet
        throw new NotFoundException(
          'You have not been hired yet. Once HR creates your employee profile from your signed contract, you will be able to view your onboarding tasks.',
        );
      }

      console.log(`👤 Found linked employee profile: ${(employee as any)._id}`);

      // Step 3: Get the onboarding for this employee
      const employeeId = (employee as any)._id?.toString();
      
      // Reuse the existing method to get onboarding with all progress calculations
      return this.getOnboardingByEmployeeId(employeeId);
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

      // Store the task before updating to check if it's an IT task
      const currentTask = onboarding.tasks[taskIndex];
      const isITTask = currentTask.department === 'IT';
      const wasNotCompleted = currentTask.status !== OnboardingTaskStatus.COMPLETED;
      
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

      // Store task department for checking
      const isAdminTask = currentTask.department === 'Admin';

      // ============= ONB-009: Check if all IT tasks are complete and notify employee =============
      if (isITTask && wasNotCompleted && updateTaskDto.status === OnboardingTaskStatus.COMPLETED) {
        // Check if ALL IT tasks are now complete
        const itTasks = onboarding.tasks.filter((task: any) => task.department === 'IT');
        const allITTasksComplete = itTasks.every(
          (task: any) => task.status === OnboardingTaskStatus.COMPLETED
        );

        if (allITTasksComplete) {
          // Send notification to the employee that all IT access has been provisioned
          try {
            const employee = await this.employeeProfileService.findOne(
              onboarding.employeeId.toString(),
            );
            
            if (employee) {
              const completedITTasks = itTasks.map((t: any) => t.name).join(', ');
              
              await this.notificationsService.notifyAccessProvisioned(
                [onboarding.employeeId.toString()],
                {
                  employeeId: onboarding.employeeId.toString(),
                  employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Employee',
                  accessType: 'System Access (IT)',
                  systemName: completedITTasks || 'Email, Laptop, SSO',
                  provisionedBy: 'IT Department (System Admin)',
                },
              );
              
              console.log(
                `✅ [ONB-009] All IT tasks complete! Notification sent to employee ${employee.employeeNumber}`,
              );
            }
          } catch (notifyError) {
            console.warn(
              `⚠️ Failed to send IT access provisioned notification:`,
              this.getErrorMessage(notifyError),
            );
          }
        }
      }
      // ============= END ONB-009 =============

      // ============= ONB-012: Check if all Admin tasks are complete and notify employee =============
      if (isAdminTask && wasNotCompleted && updateTaskDto.status === OnboardingTaskStatus.COMPLETED) {
        // Check if ALL Admin tasks are now complete
        const adminTasks = onboarding.tasks.filter((task: any) => task.department === 'Admin');
        const allAdminTasksComplete = adminTasks.every(
          (task: any) => task.status === OnboardingTaskStatus.COMPLETED
        );

        if (allAdminTasksComplete) {
          // Send notification to the employee that all equipment/resources are ready
          try {
            const employee = await this.employeeProfileService.findOne(
              onboarding.employeeId.toString(),
            );
            
            if (employee) {
              const completedAdminTaskNames = adminTasks.map((t: any) => t.name);
              
              await this.notificationsService.notifyEquipmentReserved(
                [onboarding.employeeId.toString()],
                {
                  employeeId: onboarding.employeeId.toString(),
                  employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Employee',
                  equipmentList: completedAdminTaskNames.length > 0 ? completedAdminTaskNames : ['Desk', 'ID Badge', 'Access Card'],
                  workspaceDetails: 'Your workspace has been prepared',
                  reservedBy: 'HR Employee',
                  readyDate: new Date(), // Resources are ready now
                },
              );
              
              console.log(
                `✅ [ONB-012] All Admin tasks complete! Notification sent to employee ${employee.employeeNumber}`,
              );
            }
          } catch (notifyError) {
            console.warn(
              `⚠️ Failed to send equipment reserved notification:`,
              this.getErrorMessage(notifyError),
            );
          }
        }
      }
      // ============= END ONB-012 =============

      const allCompleted =
        onboarding.tasks.length > 0 &&
        onboarding.tasks.every(
          (task) => task.status === OnboardingTaskStatus.COMPLETED,
        );
      if (allCompleted) {
        onboarding.completed = true;
        onboarding.completedAt = new Date();

        // ============= INTEGRATION: Auto-update employee status =============
        // When onboarding is completed, automatically change employee status from PROBATION to ACTIVE
        let employeeData: any = null;
        try {
          employeeData = await this.employeeProfileService.findOne(
            onboarding.employeeId.toString(),
          );
          // CHANGED - Check for INACTIVE status instead of PROBATION
          if (employeeData && employeeData.status === EmployeeStatus.INACTIVE) {
            // Use onboarding.employeeId directly instead of employee._id to avoid TypeScript issues
            await this.employeeProfileService.update(onboarding.employeeId.toString(), {
              status: EmployeeStatus.ACTIVE,
            });
            console.log(
              `✅ Employee ${employeeData.employeeNumber} (${onboarding.employeeId.toString()}) status automatically changed from INACTIVE to ACTIVE after completing onboarding`,
            );
          }
        } catch (error) {
          // Non-blocking: log but don't fail if status update fails
          console.warn(
            `⚠️ Failed to auto-update employee status to ACTIVE after onboarding completion:`,
            this.getErrorMessage(error),
          );
        }
        // ============= END INTEGRATION =============

        // ============= ONBOARDING COMPLETE NOTIFICATIONS =============
        try {
          const employeeName = employeeData 
            ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'New Employee'
            : 'New Employee';
          const positionTitle = employeeData?.position || employeeData?.jobTitle || 'Employee';

          // 1. Notify the EMPLOYEE that their onboarding is complete
          await this.notificationsService.notifyOnboardingCompleted(
            [onboarding.employeeId.toString()],
            {
              employeeId: onboarding.employeeId.toString(),
              employeeName: employeeName,
              positionTitle: positionTitle,
              completedDate: new Date(),
              totalTasks: onboarding.tasks.length,
            },
          );
          console.log(`✅ [ONBOARDING] Completion notification sent to employee ${employeeData?.employeeNumber || onboarding.employeeId}`);

          // 2. Notify HR MANAGERS that the employee completed onboarding
          const hrManagers = await this.employeeSystemRoleModel
            .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
            .select('employeeProfileId')
            .lean()
            .exec();
          const hrManagerIds = hrManagers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

          if (hrManagerIds.length > 0) {
            await this.notificationsService.notifyOnboardingCompleted(
              hrManagerIds,
              {
                employeeId: onboarding.employeeId.toString(),
                employeeName: employeeName,
                positionTitle: positionTitle,
                completedDate: new Date(),
                totalTasks: onboarding.tasks.length,
              },
            );
            console.log(`✅ [ONBOARDING] Completion notification sent to ${hrManagerIds.length} HR Manager(s)`);
          }
        } catch (notifyError) {
          console.warn(
            `⚠️ Failed to send onboarding completion notifications:`,
            this.getErrorMessage(notifyError),
          );
        }
        // ============= END ONBOARDING COMPLETE NOTIFICATIONS =============
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
  // changed - modified to accept either file upload OR manual entry for testing
  async uploadTaskDocument(
    onboardingId: string,
    taskIndex: number,
    file: any,
    documentType: DocumentType,
    manualDocumentData?: { nationalId?: string; documentDescription?: string },
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

      // 3. Check if we have file OR manual data
      const hasFile = file && file.path;
      const hasManualData = manualDocumentData && (manualDocumentData.nationalId || manualDocumentData.documentDescription);

      if (!hasFile && !hasManualData) {
        throw new BadRequestException('Either file upload or manual document data (nationalId/documentDescription) is required');
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

      let filePath: string;

      if (hasFile) {
        // File upload flow
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

        filePath = file.path;
      } else {
        // Manual entry flow - create a descriptive filePath string
        const parts: string[] = ['MANUAL_ENTRY'];
        if (manualDocumentData?.nationalId) {
          parts.push(`NationalID=${manualDocumentData.nationalId}`);
        }
        if (manualDocumentData?.documentDescription) {
          parts.push(`Desc=${manualDocumentData.documentDescription}`);
        }
        filePath = parts.join(' | ');
      }

      // 10. Create Document record
      const document = new this.documentModel({
        ownerId: onboarding.employeeId,
        type: documentType,
        filePath: filePath,
        uploadedAt: new Date(),
      });

      const savedDocument = await document.save();

      // 10. Validate onboarding is not already completed
      if (onboarding.completed) {
        throw new BadRequestException(
          'Cannot upload documents for a completed onboarding checklist',
        );
      }

      // 11. Validate task is not already completed (unless re-uploading)
      const task = onboarding.tasks[taskIndex];
      if (task.status === OnboardingTaskStatus.COMPLETED && task.documentId) {
        // Allow re-upload if needed (replace existing document)
        // Delete old document reference (document file itself can be kept for audit)
        console.log(
          `Replacing existing document for task ${taskIndex}: ${task.documentId}`,
        );
      }

      // 12. Update task with documentId
      onboarding.tasks[taskIndex].documentId = savedDocument._id;

      // 13. Auto-complete task if it was pending (ONB-007: Document upload completes task)
      if (onboarding.tasks[taskIndex].status === OnboardingTaskStatus.PENDING) {
        onboarding.tasks[taskIndex].status = OnboardingTaskStatus.COMPLETED;
        onboarding.tasks[taskIndex].completedAt = new Date();
      } else if (
        onboarding.tasks[taskIndex].status === OnboardingTaskStatus.IN_PROGRESS
      ) {
        // If task was in progress, mark as completed
        onboarding.tasks[taskIndex].status = OnboardingTaskStatus.COMPLETED;
        onboarding.tasks[taskIndex].completedAt = new Date();
      }

      // Get employee details for notifications
      let employeeName = 'New Hire';
      let positionTitle = 'New Position';
      const employeeForNotification = await this.employeeProfileService.findOne(
        onboarding.employeeId.toString(),
      );
      
      if (employeeForNotification) {
        employeeName = `${(employeeForNotification as any).firstName || ''} ${(employeeForNotification as any).lastName || ''}`.trim() || 'New Hire';
        
        if ((employeeForNotification as any).primaryPositionId) {
          try {
            const position = await this.organizationStructureService.getPositionById(
              (employeeForNotification as any).primaryPositionId.toString(),
            );
            if (position) {
              positionTitle = position.title || 'New Position';
            }
          } catch (e) {
            // Position lookup failed, use default
          }
        }
      }

      // ONB-007: Send notification to HR about document upload
      try {
        const hrRoles = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();

        const hrUserIds = hrRoles.map((role: any) => role.employeeProfileId.toString());

        if (hrUserIds.length > 0) {
          // Extract filename from filePath or use document type as name
          const documentName = savedDocument.filePath 
            ? savedDocument.filePath.split('/').pop() || savedDocument.filePath.split('\\').pop() || 'Uploaded Document'
            : documentType || 'Uploaded Document';
          
          await this.notificationsService.notifyHRDocumentUploaded(
            hrUserIds,
            {
              employeeId: onboarding.employeeId.toString(),
              employeeName,
              documentType: documentType || 'DOCUMENT',
              documentName,
              taskName: task.name,
              onboardingId: onboardingId,
            },
          );
          
          console.log(
            `[ONB-007] Sent ONBOARDING_DOCUMENT_UPLOADED notification to ${hrUserIds.length} HR user(s)`,
          );
        }
      } catch (notificationError) {
        console.warn('Failed to send document upload notification to HR:', notificationError);
      }

      // 14. Check if all tasks completed
      const allCompleted = onboarding.tasks.every(
        (t) => t.status === OnboardingTaskStatus.COMPLETED,
      );

      if (allCompleted) {
        onboarding.completed = true;
        onboarding.completedAt = new Date();

        // ONB-005: Send completion notification + Auto-update employee status
        try {
          const employee = await this.employeeProfileService.findOne(
            onboarding.employeeId.toString(),
          );
          
          if (employee) {
            // ============= INTEGRATION: Auto-update employee status =============
            // When onboarding is completed, automatically change employee status from PROBATION to ACTIVE
            // This is a business rule: employees become ACTIVE after completing onboarding
            // CHANGED - Check for INACTIVE status instead of PROBATION
            if (employee.status === EmployeeStatus.INACTIVE) {
              // Use onboarding.employeeId directly instead of employee._id to avoid TypeScript issues
              await this.employeeProfileService.update(onboarding.employeeId.toString(), {
                status: EmployeeStatus.ACTIVE,
              });
              console.log(
                `✅ Employee ${employee.employeeNumber} (${onboarding.employeeId.toString()}) status automatically changed from INACTIVE to ACTIVE after completing onboarding`,
              );
            }
            // ============= END INTEGRATION =============

            // Send email completion notification
            if ((employee as any).personalEmail) {
              await this.sendNotification(
                'onboarding_completed',
                (employee as any).personalEmail,
                {
                  employeeName: (employee as any).firstName || 'New Hire',
                },
                { nonBlocking: true },
              );
            }

            // Send in-app completion notification to new hire and HR
            try {
              const recipientIds = [onboarding.employeeId.toString()];
              
              // Also notify HR
              const hrRoles = await this.employeeSystemRoleModel
                .find({
                  roles: { $in: [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE] },
                  isActive: true,
                })
                .select('employeeProfileId')
                .lean()
                .exec();
              
              hrRoles.forEach((role: any) => {
                recipientIds.push(role.employeeProfileId.toString());
              });

              await this.notificationsService.notifyOnboardingCompleted(
                recipientIds,
                {
                  employeeId: onboarding.employeeId.toString(),
                  employeeName,
                  positionTitle,
                  completedDate: new Date(),
                  totalTasks: onboarding.tasks.length,
                },
              );
              
              console.log(
                `[ONBOARDING] Sent ONBOARDING_COMPLETED notification to ${recipientIds.length} recipient(s)`,
              );
            } catch (notificationError) {
              console.warn('Failed to send onboarding completion in-app notification:', notificationError);
            }
          }
        } catch (e) {
          console.warn('Failed to send onboarding completion notification or update employee status:', e);
        }
      }

      // 15. Save onboarding
      const savedOnboarding = await onboarding.save();

      return {
        message: 'Document uploaded successfully',
        document: savedDocument.toObject(),
        onboarding: savedOnboarding.toObject(),
        notificationsSent: true,
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
   * CHANGED BY RECRUITMENT SUBSYSTEM - Talent Pool Feature
   * Download candidate resume/CV by candidate ID
   * This method finds the CV document associated with a candidate and downloads it
   */
  async downloadCandidateResume(candidateId: string, res: Response): Promise<void> {
    try {
      // 1. Validate candidateId
      if (!Types.ObjectId.isValid(candidateId)) {
        throw new BadRequestException('Invalid candidate ID format');
      }

      // 2. Find candidate to get resumeUrl
      const candidate = await this.candidateModel.findById(candidateId).lean();
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      if (!candidate.resumeUrl) {
        throw new NotFoundException('No resume found for this candidate');
      }

      // 3. Try to find document record first (preferred method)
      const document = await this.documentModel
        .findOne({
          ownerId: new Types.ObjectId(candidateId),
          type: DocumentType.CV,
        })
        .sort({ uploadedAt: -1 }) // Get most recent CV
        .lean();

      let filePath: string;

      if (document && document.filePath) {
        // Use document record file path
        filePath = document.filePath;
      } else if (candidate.resumeUrl) {
        // Fallback to candidate's resumeUrl
        filePath = candidate.resumeUrl;
      } else {
        throw new NotFoundException('Resume file path not found');
      }

      // 4. Check if file exists
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw new NotFoundException('Resume file not found on server');
      }

      // 5. Determine file extension for proper download name
      const fileExtension = filePath.split('.').pop() || 'pdf';
      const candidateName = `${candidate.firstName || ''}_${candidate.lastName || ''}`.trim() || 'Candidate';
      
      // 6. Set headers and send file
      res.setHeader('Content-Disposition', `attachment; filename="${candidateName}_Resume.${fileExtension}"`);
      res.download(filePath);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to download candidate resume: ' + this.getErrorMessage(error),
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

      // 4. ONB-002: Validate contract exists and has signed document
      // BR: HR Manager must access signed contract detail to create employee profile
      if (!contract) {
        throw new BadRequestException(
          'Cannot create employee: No signed contract found. The candidate must upload their signed contract first before you can create their employee profile.',
        );
      }

      if (!contract.documentId) {
        throw new BadRequestException(
          'Cannot create employee: The contract does not have a signed document attached. Please ensure the candidate has uploaded their signed contract.',
        );
      }

      // 5. Verify the contract document exists
      const contractDocument = await this.documentModel
        .findById(contract.documentId)
        .lean();
      if (!contractDocument) {
        throw new NotFoundException(
          'Cannot create employee: Signed contract document not found in the system. Please contact support.',
        );
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

      // =============================================================================
      // 7.5 DETERMINE SYSTEM ROLE FROM JOB TEMPLATE
      // =============================================================================
      // When creating an employee from recruitment, we need to assign the correct
      // system role based on what position they were hired for.
      //
      // This is crucial because:
      // - If someone is hired as "HR Manager", they need SystemRole.HR_MANAGER
      //   to access HR dashboards and perform HR functions
      // - If hired as "Payroll Specialist", they need SystemRole.PAYROLL_SPECIALIST
      // - etc.
      //
      // The role can be:
      // 1. Explicitly provided in the DTO (dto.systemRole) - HR can override
      // 2. Auto-determined from the job template's title/department
      // 3. Default to DEPARTMENT_EMPLOYEE if no match found
      //
      // Role mapping is based on job title (case-insensitive matching):
      // - Contains "HR Manager" → HR_MANAGER
      // - Contains "HR Employee" or "HR Staff" → HR_EMPLOYEE
      // - Contains "HR Admin" → HR_ADMIN
      // - Contains "Payroll Manager" → PAYROLL_MANAGER
      // - Contains "Payroll Specialist" or "Payroll Staff" → PAYROLL_SPECIALIST
      // - Contains "System Admin" or "System Administrator" → SYSTEM_ADMIN
      // - Contains "Legal" and ("Admin" or "Policy") → LEGAL_POLICY_ADMIN
      // - Contains "Recruiter" or "Recruitment" → RECRUITER
      // - Contains "Finance" → FINANCE_STAFF
      // - Contains "Department Head" or "Head of" or "Director" or "Manager" (not HR/Payroll) → DEPARTMENT_HEAD
      // - Default → DEPARTMENT_EMPLOYEE
      // =============================================================================
      let determinedSystemRole: SystemRole = SystemRole.DEPARTMENT_EMPLOYEE;
      
      // Try to get job title from offer's application → requisition → template
      let jobTitle = '';
      let jobDepartment = '';
      
      try {
        if (offer.applicationId) {
          const application = await this.applicationModel
            .findById(offer.applicationId)
            .populate({
              path: 'requisitionId',
              populate: {
                path: 'templateId',
                model: 'JobTemplate'
              }
            })
            .lean();
          
          if (application) {
            const requisition = (application as any).requisitionId;
            const template = requisition?.templateId;
            
            if (template) {
              jobTitle = template.title || '';
              jobDepartment = template.department || '';
              
              console.log(`[CREATE_EMPLOYEE] Job Template - Title: "${jobTitle}", Department: "${jobDepartment}"`);
            }
          }
        }
      } catch (e) {
        console.warn('[CREATE_EMPLOYEE] Could not get job template for role determination:', e);
      }
      
      // Determine system role from job title (if not explicitly provided in DTO)
      if (dto.systemRole) {
        // HR explicitly specified the role - use it
        determinedSystemRole = dto.systemRole;
        console.log(`[CREATE_EMPLOYEE] Using HR-specified system role: ${determinedSystemRole}`);
      } else if (jobTitle) {
        // Auto-determine role from job title
        const titleLower = jobTitle.toLowerCase();
        const deptLower = jobDepartment.toLowerCase();
        
        // HR roles (check specific first, then general)
        if (titleLower.includes('hr manager') || (titleLower.includes('manager') && deptLower.includes('hr'))) {
          determinedSystemRole = SystemRole.HR_MANAGER;
        } else if (titleLower.includes('hr admin') || (titleLower.includes('admin') && deptLower.includes('hr'))) {
          determinedSystemRole = SystemRole.HR_ADMIN;
        } else if (titleLower.includes('hr employee') || titleLower.includes('hr staff') || 
                   titleLower.includes('hr specialist') || titleLower.includes('hr coordinator') ||
                   (deptLower.includes('hr') && !titleLower.includes('manager') && !titleLower.includes('admin'))) {
          determinedSystemRole = SystemRole.HR_EMPLOYEE;
        }
        // Payroll roles
        else if (titleLower.includes('payroll manager') || (titleLower.includes('manager') && deptLower.includes('payroll'))) {
          determinedSystemRole = SystemRole.PAYROLL_MANAGER;
        } else if (titleLower.includes('payroll specialist') || titleLower.includes('payroll staff') ||
                   titleLower.includes('payroll coordinator') || deptLower.includes('payroll')) {
          determinedSystemRole = SystemRole.PAYROLL_SPECIALIST;
        }
        // System Admin
        else if (titleLower.includes('system admin') || titleLower.includes('system administrator') ||
                 titleLower.includes('sysadmin') || titleLower.includes('it admin')) {
          determinedSystemRole = SystemRole.SYSTEM_ADMIN;
        }
        // Legal & Policy Admin
        else if ((titleLower.includes('legal') && (titleLower.includes('admin') || titleLower.includes('policy'))) ||
                 titleLower.includes('policy admin') || titleLower.includes('compliance')) {
          determinedSystemRole = SystemRole.LEGAL_POLICY_ADMIN;
        }
        // Recruiter
        else if (titleLower.includes('recruiter') || titleLower.includes('recruitment') || 
                 titleLower.includes('talent acquisition')) {
          determinedSystemRole = SystemRole.RECRUITER;
        }
        // Finance Staff
        else if (titleLower.includes('finance') || titleLower.includes('accountant') || 
                 titleLower.includes('accounting') || deptLower.includes('finance')) {
          determinedSystemRole = SystemRole.FINANCE_STAFF;
        }
        // Department Head (check last as "manager" is common)
        else if (titleLower.includes('department head') || titleLower.includes('head of') ||
                 titleLower.includes('director') || titleLower.includes('chief') ||
                 (titleLower.includes('manager') && !titleLower.includes('hr') && !titleLower.includes('payroll'))) {
          determinedSystemRole = SystemRole.DEPARTMENT_HEAD;
        }
        // Default remains DEPARTMENT_EMPLOYEE
        
        console.log(`[CREATE_EMPLOYEE] Auto-determined system role from job title "${jobTitle}": ${determinedSystemRole}`);
      } else {
        console.log(`[CREATE_EMPLOYEE] No job title found, using default role: ${determinedSystemRole}`);
      }
      // =============================================================================
      // END SYSTEM ROLE DETERMINATION
      // =============================================================================

      // 8. Map data to CreateEmployeeDto
      // IMPORTANT: Pass candidateId so employee-profile service gets password directly from candidate
      // DO NOT pass password here - it would get double-hashed!
      console.log('🔑 [CREATE_EMPLOYEE] Candidate password hash (first 30 chars):', candidate.password?.substring(0, 30));
      console.log('🔑 [CREATE_EMPLOYEE] Candidate ID being passed:', candidate._id.toString());
      console.log('🔑 [CREATE_EMPLOYEE] NOTE: Not passing password - will be fetched from candidate by employee-profile service');
      
      const createEmployeeDto: CreateEmployeeDto = {
        // Link to candidate - ensures password is taken from candidate directly (not re-hashed)
        candidateId: candidate._id.toString(),
        
        // Personal info from candidate
        firstName: candidate.firstName,
        middleName: candidate.middleName,
        lastName: candidate.lastName,
        nationalId: candidate.nationalId,
        // DO NOT PASS PASSWORD! Let employee-profile service get it from candidate directly
        // password: candidate.password, // REMOVED - was causing double-hashing
        gender: candidate.gender,
        maritalStatus: candidate.maritalStatus,
        dateOfBirth: candidate.dateOfBirth,
        personalEmail: candidate.personalEmail,
        mobilePhone: candidate.mobilePhone,
        homePhone: candidate.homePhone,
        address: candidate.address,
        profilePictureUrl: candidate.profilePictureUrl,

        // ONB-004/ONB-005: Use HR-specified employee number (will be sent to candidate in notification)
        employeeNumber: dto.employeeNumber,

        // Work info from contract (ONB-002: use signed contract data)
        workEmail: workEmail,
        dateOfHire: dto.startDate ? new Date(dto.startDate) : (contract.acceptanceDate || new Date()),
        contractStartDate: dto.startDate ? new Date(dto.startDate) : contract.acceptanceDate,
        contractEndDate: undefined, // Can be set manually by HR if needed
        contractType: dto.contractType,
        workType: dto.workType,
        status: EmployeeStatus.INACTIVE, // CHANGED - New employees start as INACTIVE until onboarding is complete

        // Organizational assignment (from DTO or can be derived from offer)
        primaryDepartmentId: dto.primaryDepartmentId,
        supervisorPositionId: dto.supervisorPositionId,
        payGradeId: dto.payGradeId,

        // Position - Note: primaryPositionId should be set separately by HR if needed
        // Using primaryDepartmentId as fallback is incorrect, so leaving undefined
        primaryPositionId: undefined,

        // System role - determined from job template or explicitly provided by HR
        // This ensures hired employees get the correct dashboard access
        systemRole: determinedSystemRole,
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
          contract._id, // Pass contractId (required by ONB-002)
          candidate._id.toString(), // Pass candidateId to send notification to candidate account
        );

        // ONB-018: Automatically trigger payroll initiation using contract data
        // Pass jobTitle from the job template for accurate position in notifications
        if (contract.grossSalary && contract.grossSalary > 0) {
          try {
            await this.triggerPayrollInitiation(
              employeeId,
              contractSigningDate,
              contract.grossSalary,
              jobTitle || contract.role || undefined, // Pass position title from job template or contract
            );
          } catch (e) {
            console.warn('Failed to trigger payroll initiation:', e);
          }
        }

        // ONB-019: Automatically process signing bonus using contract data
        // Pass jobTitle from the job template for accurate position in notifications
        if (contract.signingBonus && contract.signingBonus > 0) {
          try {
            await this.processSigningBonus(
              employeeId,
              contract.signingBonus,
              contractSigningDate,
              jobTitle || contract.role || undefined, // Pass position title from job template or contract
            );
          } catch (e) {
            console.warn('Failed to process signing bonus:', e);
          }
        }

        // ONB-013: Schedule access provisioning for start date
        try {
          // If start date is in the past, use today's date for access provisioning
          // (employee is being created now, so they should get access now)
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset to start of day
          const provisioningDate = startDate < today ? today : startDate;
          
          await this.scheduleAccessProvisioning(employeeId, provisioningDate);
        } catch (e) {
          console.warn('Failed to schedule access provisioning:', e);
        }
      } catch (e) {
        // Non-critical - onboarding can be created manually if auto-creation fails
        console.warn('Failed to create onboarding automatically:', e);
      }

      // 11. Update application status to HIRED after employee creation
      // BR: Once employee is created, application status should be HIRED
      // This prevents showing "Create Employee" button again for already-hired candidates
      try {
        if (offer.applicationId) {
          const applicationObjectId = new Types.ObjectId(
            typeof offer.applicationId === 'string' 
              ? offer.applicationId 
              : (offer.applicationId as any)._id?.toString() || offer.applicationId.toString()
          );
          
          await this.applicationModel.findByIdAndUpdate(
            applicationObjectId,
            {
              $set: {
                status: ApplicationStatus.HIRED,
                currentStage: ApplicationStage.OFFER,
              },
            },
            { new: true }
          ).exec();
          
          console.log(`✅ Application ${applicationObjectId} status updated to HIRED after employee creation`);
        }
      } catch (appUpdateError) {
        // Non-critical - log but don't fail employee creation
        console.warn('Failed to update application status to HIRED:', this.getErrorMessage(appUpdateError));
      }

      // 11b. Update candidate status to HIRED after employee creation
      // BR: Candidate status should be HIRED when employee profile is finalized
      try {
        if (offer.candidateId) {
          await this.candidateModel.findByIdAndUpdate(offer.candidateId, {
            status: CandidateStatus.HIRED,
          });
          console.log(`✅ Candidate ${offer.candidateId} status updated to HIRED after employee creation`);
        }
      } catch (candidateUpdateError) {
        console.warn('Failed to update candidate status to HIRED:', this.getErrorMessage(candidateUpdateError));
      }

      // 12. Return success response with employee and contract details (ONB-002)
      return {
        message: 'Employee profile created successfully from signed contract',
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

  // ============= EMPLOYEE EXISTENCE CHECK =============

  /**
   * Check if an employee already exists for a candidate/application
   * Used to determine if "Create Employee" button should be shown
   */
  async checkEmployeeExistsForApplication(applicationId: string): Promise<{
    employeeExists: boolean;
    employee: any | null;
    message: string;
  }> {
    try {
      if (!Types.ObjectId.isValid(applicationId)) {
        throw new BadRequestException('Invalid application ID format');
      }

      // Find application to get candidateId
      const application = await this.applicationModel
        .findById(applicationId)
        .populate('candidateId')
        .lean();
      
      if (!application) {
        throw new NotFoundException('Application not found');
      }

      const candidateId = application.candidateId?._id?.toString() || 
                         (application.candidateId as any)?.toString() ||
                         application.candidateId?.toString();
      
      if (!candidateId) {
        return {
          employeeExists: false,
          employee: null,
          message: 'Candidate information not found in application',
        };
      }

      // Get candidate to check by nationalId or email
      const candidate = await this.candidateModel.findById(candidateId).lean();
      if (!candidate) {
        return {
          employeeExists: false,
          employee: null,
          message: 'Candidate not found',
        };
      }

      // Check if employee exists by nationalId (most reliable)
      let employee = null;
      if (candidate.nationalId) {
        employee = await this.employeeModel
          .findOne({
            nationalId: candidate.nationalId,
            status: { $ne: EmployeeStatus.TERMINATED },
          })
          .select('_id employeeNumber firstName lastName workEmail status')
          .lean();
      }

      // If not found by nationalId, check by email
      if (!employee && candidate.personalEmail) {
        employee = await this.employeeModel
          .findOne({
            $or: [
              { personalEmail: candidate.personalEmail },
              { workEmail: candidate.personalEmail },
            ],
            status: { $ne: EmployeeStatus.TERMINATED },
          })
          .select('_id employeeNumber firstName lastName workEmail status')
          .lean();
      }

      if (employee) {
        return {
          employeeExists: true,
          employee: {
            _id: employee._id,
            employeeNumber: employee.employeeNumber,
            fullName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            workEmail: employee.workEmail,
            status: employee.status,
          },
          message: `Employee already exists: ${employee.employeeNumber}`,
        };
      }

      return {
        employeeExists: false,
        employee: null,
        message: 'No employee found for this candidate',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error checking employee existence:', error);
      return {
        employeeExists: false,
        employee: null,
        message: 'Error checking employee existence',
      };
    }
  }

  // ============= CONTRACT STATUS CHECK (ONB-002) =============

  /**
   * ONB-002: Get contract status for an offer
   * HR Manager needs to see if candidate has uploaded signed contract before creating employee
   */
  async getContractStatusForOffer(offerId: string): Promise<{
    hasContract: boolean;
    hasSignedDocument: boolean;
    contract: any | null;
    message: string;
  }> {
    try {
      if (!Types.ObjectId.isValid(offerId)) {
        throw new BadRequestException('Invalid offer ID format');
      }

      const offer = await this.offerModel.findById(offerId).lean();
      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      // Find contract for this offer
      const contract = await this.contractModel
        .findOne({ offerId: new Types.ObjectId(offerId) })
        .populate('documentId')
        .lean();

      if (!contract) {
        return {
          hasContract: false,
          hasSignedDocument: false,
          contract: null,
          message: 'Candidate has not uploaded a signed contract yet. Please wait for the candidate to upload their signed contract.',
        };
      }

      if (!contract.documentId) {
        return {
          hasContract: true,
          hasSignedDocument: false,
          contract: {
            _id: contract._id,
          },
          message: 'Contract record exists but signed document has not been uploaded yet.',
        };
      }

      return {
        hasContract: true,
        hasSignedDocument: true,
        contract: {
          _id: contract._id,
          documentId: contract.documentId,
          grossSalary: contract.grossSalary,
          signingBonus: contract.signingBonus,
          acceptanceDate: contract.acceptanceDate,
          employeeSignedAt: contract.employeeSignedAt,
        },
        message: 'Signed contract is available. You can now create the employee profile.',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get contract status: ' + this.getErrorMessage(error));
    }
  }

  // ============= CONTRACT DOCUMENT UPLOAD (ONB-007) =============

  /**
   * ONB-007: Candidate uploads signed contract and required forms/templates
   * As a Candidate, I want to upload signed contract and candidate required forms and templates to initiate the onboarding process
   * BR: Documents must be collected and verified by HR before first working day
   */
  // changed - modified to accept either file upload OR manual document data for testing
  async uploadContractDocument(
    offerId: string,
    file: any,
    documentType: DocumentType = DocumentType.CONTRACT,
    manualDocumentData?: { nationalId?: string; documentDescription?: string },
  ): Promise<any> {
    try {
      // 1. Validate offerId
      if (!Types.ObjectId.isValid(offerId)) {
        throw new BadRequestException('Invalid offer ID format');
      }

      // 2. Check if we have file OR manual data
      const hasFile = file && file.path;
      const hasManualData = manualDocumentData && (manualDocumentData.nationalId || manualDocumentData.documentDescription);

      if (!hasFile && !hasManualData) {
        throw new BadRequestException('Either file upload or manual document data (nationalId/documentDescription) is required');
      }

      let filePath: string;

      if (hasFile) {
        // File upload flow
        // 3. Validate file type
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

        // 4. Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (!file.size || file.size > maxSize) {
          throw new BadRequestException('File size exceeds 5MB limit');
        }

        filePath = file.path;
      } else {
        // Manual entry flow - create a descriptive filePath string
        const parts: string[] = ['MANUAL_ENTRY'];
        if (manualDocumentData?.nationalId) {
          parts.push(`NationalID=${manualDocumentData.nationalId}`);
        }
        if (manualDocumentData?.documentDescription) {
          parts.push(`Desc=${manualDocumentData.documentDescription}`);
        }
        filePath = parts.join(' | ');
      }

      // 6. Get offer and validate
      const offer = await this.offerModel.findById(offerId).lean();
      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      // 7. Validate offer is accepted
      if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
        throw new BadRequestException(
          'Offer must be accepted before uploading signed contract',
        );
      }

      // 8. Get candidate
      const candidate = await this.candidateModel
        .findById(offer.candidateId)
        .lean();
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      // 9. Create Document record
      const document = new this.documentModel({
        ownerId: candidate._id,
        type: documentType,
        filePath: filePath,
        uploadedAt: new Date(),
      });

      const savedDocument = await document.save();

      // 10. Find or create contract
      let contract = await this.contractModel
        .findOne({ offerId: new Types.ObjectId(offerId) })
        .lean();

      if (!contract) {
        // Create contract if it doesn't exist
        contract = await this.contractModel.create({
          offerId: new Types.ObjectId(offerId),
          acceptanceDate: new Date(),
          grossSalary: offer.grossSalary,
          signingBonus: offer.signingBonus,
          role: offer.role,
          benefits: offer.benefits,
          documentId: savedDocument._id,
          employeeSignedAt: new Date(),
        });
      } else {
        // Update existing contract with document
        await this.contractModel.findByIdAndUpdate(contract._id, {
          $set: {
            documentId: savedDocument._id,
            employeeSignedAt: new Date(),
            acceptanceDate: contract.acceptanceDate || new Date(),
          },
        });
        contract = await this.contractModel.findById(contract._id).lean();
      }

      return {
        message: 'Contract document uploaded successfully',
        document: savedDocument.toObject(),
        contract: contract,
        offerId: offerId,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to upload contract document: ' + this.getErrorMessage(error),
      );
    }
  }

  /**
   * ONB-007: Candidate uploads required forms and templates
   * Upload additional documents (ID, certifications, etc.) for onboarding
   */
  // changed - modified to accept either file upload OR manual entry for testing
  async uploadCandidateForm(
    offerId: string,
    file: any,
    documentType: DocumentType,
    manualDocumentData?: { nationalId?: string; documentDescription?: string },
  ): Promise<any> {
    try {
      // 1. Validate offerId
      if (!Types.ObjectId.isValid(offerId)) {
        throw new BadRequestException('Invalid offer ID format');
      }

      // 2. Check if we have file OR manual data
      const hasFile = file && file.path;
      const hasManualData = manualDocumentData && (manualDocumentData.nationalId || manualDocumentData.documentDescription);

      if (!hasFile && !hasManualData) {
        throw new BadRequestException('Either file upload or manual document data (nationalId/documentDescription) is required');
      }

      // 3. Validate document type (must be ID or CERTIFICATE for forms)
      if (
        documentType !== DocumentType.ID &&
        documentType !== DocumentType.CERTIFICATE
      ) {
        throw new BadRequestException(
          'Invalid document type for candidate form. Must be ID or CERTIFICATE',
        );
      }

      let filePath: string;

      if (hasFile) {
        // File upload flow
        // Validate file type
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

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (!file.size || file.size > maxSize) {
          throw new BadRequestException('File size exceeds 5MB limit');
        }

        filePath = file.path;
      } else {
        // Manual entry flow - create a descriptive filePath string
        const parts: string[] = ['MANUAL_ENTRY'];
        if (manualDocumentData?.nationalId) {
          parts.push(`NationalID=${manualDocumentData.nationalId}`);
        }
        if (manualDocumentData?.documentDescription) {
          parts.push(`Desc=${manualDocumentData.documentDescription}`);
        }
        filePath = parts.join(' | ');
      }

      // 7. Get offer and validate
      const offer = await this.offerModel.findById(offerId).lean();
      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      // 8. Get candidate
      const candidate = await this.candidateModel
        .findById(offer.candidateId)
        .lean();
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      // 9. Create Document record
      const document = new this.documentModel({
        ownerId: candidate._id,
        type: documentType,
        filePath: filePath,
        uploadedAt: new Date(),
      });

      const savedDocument = await document.save();

      return {
        message: 'Candidate form uploaded successfully',
        document: savedDocument.toObject(),
        documentType: documentType,
        offerId: offerId,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to upload candidate form: ' + this.getErrorMessage(error),
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
    // changed - removed populate('referringEmployeeId') because 'User' model not registered
    return this.referralModel
      .find({ candidateId: new Types.ObjectId(candidateId) })
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

  // CHANGED - Added CV upload method for candidates (REC-003)
  /**
   * REC-003: Candidate uploads CV/resume during application
   * As a Candidate, I want to upload my CV and apply for positions
   */
  async uploadCandidateCV(
    candidateId: string,
    file: any,
    manualDocumentData?: { resumeUrl?: string },
  ): Promise<any> {
    try {
      // 1. Validate candidateId
      if (!Types.ObjectId.isValid(candidateId)) {
        throw new BadRequestException('Invalid candidate ID format');
      }

      // 2. Check if file or manual data provided
      const hasFile = file && file.path;
      const hasManualData = manualDocumentData && manualDocumentData.resumeUrl;

      if (!hasFile && !hasManualData) {
        throw new BadRequestException(
          'Either file upload or resume URL is required',
        );
      }

      // 3. Validate candidate exists
      const candidate = await this.candidateModel.findById(candidateId);
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      let resumeUrl: string;

      if (hasFile) {
        // File upload flow
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          throw new BadRequestException(
            'Invalid file type. Only PDF and DOC/DOCX files are allowed for CV',
          );
        }

        // Store file path as resume URL
        resumeUrl = file.path;
      } else {
        // Manual URL entry flow
        resumeUrl = manualDocumentData!.resumeUrl!;
      }

      // 4. Update candidate with resume URL
      const updated = await this.candidateModel.findByIdAndUpdate(
        candidateId,
        { resumeUrl },
        { new: true },
      );

      // 5. Create document record for tracking
      const document = new this.documentModel({
        ownerId: candidate._id,
        type: DocumentType.CV,
        filePath: resumeUrl,
        uploadedAt: new Date(),
      });
      await document.save();

      return {
        message: 'CV uploaded successfully',
        candidateId: updated?._id,
        resumeUrl,
        documentId: document._id,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to upload CV: ' + this.getErrorMessage(error),
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
    console.log('🎯 submitInterviewFeedback called:', {
      interviewId,
      interviewerId,
      score,
      comments,
      timestamp: new Date().toISOString(),
    });
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
      // Convert interviewerId to string for comparison
      const interviewerIdStr = String(interviewerId);
      const panelIds = interview.panel?.map((id: any) => {
        // Handle both ObjectId and string formats
        if (id && typeof id === 'object' && id.toString) {
          return id.toString();
        }
        return String(id);
      }) || [];
      
      if (panelIds.length === 0) {
        throw new BadRequestException(
          'Interview panel is empty. Cannot submit feedback without panel members.',
        );
      }
      
      if (!panelIds.includes(interviewerIdStr)) {
        console.error('Panel validation failed:', {
          interviewerId: interviewerIdStr,
          panelIds: panelIds,
          interviewId: interviewId,
        });
        throw new BadRequestException(
          'Interviewer is not part of the interview panel',
        );
      }

      // Check if feedback already exists for this interviewer
      // Ensure both IDs are valid ObjectIds
      const interviewerObjectId = new Types.ObjectId(interviewerIdStr);
      const interviewObjectId = new Types.ObjectId(interviewId);
      
      const existingFeedback = await this.assessmentResultModel.findOne({
        interviewId: interviewObjectId,
        interviewerId: interviewerObjectId,
      });

      let assessmentResult;
      if (existingFeedback) {
        // Update existing feedback
        console.log('📝 Updating existing feedback:', existingFeedback._id);
        assessmentResult = await this.assessmentResultModel.findByIdAndUpdate(
          existingFeedback._id,
          { score, comments },
          { new: true },
        );
        console.log('✅ Updated existing feedback:', assessmentResult._id);
      } else {
        // Create new feedback using create() method for better reliability
        console.log('🆕 Creating new feedback:', {
          interviewId: interviewId,
          interviewerId: interviewerIdStr,
          score: score,
        });
        
        try {
          // Save using the model first (for Mongoose validation)
          assessmentResult = await this.assessmentResultModel.create({
            interviewId: interviewObjectId,
            interviewerId: interviewerObjectId,
            score,
            comments: comments || '',
          });
          
          // Also save directly to interviewfeedbacks collection using native MongoDB
          const db = this.assessmentResultModel.db;
          const interviewfeedbacksCollection = db.collection('interviewfeedbacks');
          
          const feedbackDocument = {
            interviewId: interviewObjectId,
            interviewerId: interviewerObjectId,
            score,
            comments: comments || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const insertResult = await interviewfeedbacksCollection.insertOne(feedbackDocument);
          
          if (insertResult.insertedId) {
            // Update the assessmentResult with the inserted ID for consistency
            assessmentResult._id = insertResult.insertedId;
          }

          // Note: Not linking feedbackId to interview since multiple feedbacks can exist per interview
          // (one per panel member). The interview.feedbackId field would only store one ID.
        } catch (saveError: any) {
          throw new BadRequestException(
            `Failed to save feedback: ${this.getErrorMessage(saveError)}`,
          );
        }
      }

      const result = assessmentResult.toObject();
      console.log('📤 Returning feedback result:', {
        _id: result._id,
        interviewId: result.interviewId,
        interviewerId: result.interviewerId,
        score: result.score,
      });

      // Check if all panel members have submitted feedback
      // If so, mark interview as 'completed' and send notifications
      try {
        const panelSize = interview.panel?.length || 0;
        const feedbackCount = await this.assessmentResultModel.countDocuments({
          interviewId: interviewObjectId,
        });
        
        console.log(`📊 Feedback submitted: ${feedbackCount}/${panelSize} panel members`);
        
        if (feedbackCount >= panelSize && panelSize > 0) {
          // All panel members have submitted feedback - mark interview as completed
          await this.interviewModel.findByIdAndUpdate(interviewId, {
            status: 'completed',
          });
          console.log(`✅ Interview ${interviewId} marked as COMPLETED - all feedback received`);

          // =============================================================
          // NOTIFICATIONS: Interview Completed - All Feedback Submitted
          // =============================================================
          // When all panel members submit feedback:
          // 1. Notify candidate: "Interview completed, waiting for decision"
          // 2. Notify HR Manager: "Application ready for review"
          // =============================================================
          try {
            // Get application and candidate details
            const application = await this.applicationModel
              .findById(interview.applicationId)
              .populate('candidateId')
              .populate('requisitionId')
              .lean()
              .exec();

            if (application) {
              const candidate = (application as any).candidateId;
              const jobRequisition = (application as any).requisitionId;
              const jobTemplate = jobRequisition?.templateId
                ? await this.jobTemplateModel.findById(jobRequisition.templateId).lean().exec()
                : null;
              const positionTitle = (jobTemplate as any)?.title || 'Position';
              const candidateName = candidate?.fullName || 
                `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() || 
                'Candidate';

              // 1. Notify candidate that interview is completed (waiting for decision)
              if (candidate && candidate._id) {
                try {
                  await this.notificationsService.notifyCandidateInterviewCompleted(
                    candidate._id.toString(),
                    {
                      positionTitle: positionTitle,
                      applicationId: application._id.toString(),
                      interviewId: interviewId,
                    },
                  );
                  console.log(`[INTERVIEW] Notified candidate ${candidate._id} that interview is completed`);
                } catch (candidateNotifError) {
                  console.warn('Failed to notify candidate about interview completion:', candidateNotifError);
                }
              }

              // 2. Notify HR Managers that feedback is ready for review
              try {
                const hrManagers = await this.employeeSystemRoleModel
                  .find({
                    roles: { $in: [SystemRole.HR_MANAGER] },
                    isActive: true,
                  })
                  .select('employeeProfileId')
                  .lean()
                  .exec();

                const hrManagerIds = hrManagers
                  .map((hr: any) => hr.employeeProfileId?.toString())
                  .filter(Boolean);

                if (hrManagerIds.length > 0) {
                  await this.notificationsService.notifyHRManagerFeedbackReady(
                    hrManagerIds,
                    {
                      candidateName: candidateName,
                      positionTitle: positionTitle,
                      applicationId: application._id.toString(),
                      interviewId: interviewId,
                    },
                  );
                  console.log(`[INTERVIEW] Notified ${hrManagerIds.length} HR Manager(s) that feedback is ready for review`);
                }
              } catch (hrManagerNotifError) {
                console.warn('Failed to notify HR Managers about ready feedback:', hrManagerNotifError);
              }
            }
          } catch (notifError) {
            // Non-critical - don't fail the feedback submission if notifications fail
            console.warn('Failed to send interview completion notifications:', notifError);
          }
        }
      } catch (statusError) {
        // Non-critical - don't fail the feedback submission
        console.warn('Could not update interview status to completed:', statusError);
      }

      return result;
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

    // changed - removed populate('interviewerId') because 'User' model not registered
    return this.assessmentResultModel
      .find({ interviewId: new Types.ObjectId(interviewId) })
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
   * Get interviews where the user is a panel member
   * Returns interviews with application and candidate details
   * Used by the "My Panel Interviews" page for any employee selected as a panel member
   */
  async getMyPanelInterviews(userId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const userObjectId = new Types.ObjectId(userId);

    // Find all interviews where the user is in the panel
    const interviews = await this.interviewModel
      .find({
        panel: userObjectId,
        status: { $ne: 'cancelled' }, // Exclude cancelled interviews
      })
      .sort({ scheduledDate: -1 })
      .lean()
      .exec();

    // Enrich each interview with application and candidate details
    const enrichedInterviews = await Promise.all(
      interviews.map(async (interview: any) => {
        try {
          // Get the application
          const application = await this.applicationModel
            .findById(interview.applicationId)
            .populate('candidateId')
            .lean()
            .exec();

          if (!application) {
            return null;
          }

          // Get the job requisition for position title
          const job = await this.jobModel
            .findById(application.requisitionId)
            .populate('templateId')
            .lean()
            .exec();

          const candidate = application.candidateId as any;
          const jobTemplate = job?.templateId as any;

          // Get existing feedback from this user for this interview
          const myFeedback = await this.assessmentResultModel
            .findOne({
              interviewId: interview._id,
              interviewerId: userObjectId,
            })
            .lean()
            .exec();

          // Get all feedback for this interview to check completion
          const allFeedback = await this.assessmentResultModel
            .find({ interviewId: interview._id })
            .lean()
            .exec();

          return {
            _id: interview._id,
            applicationId: interview.applicationId,
            stage: interview.stage,
            scheduledDate: interview.scheduledDate,
            method: interview.method,
            videoLink: interview.videoLink,
            status: interview.status,
            panelSize: interview.panel?.length || 0,
            feedbackSubmitted: allFeedback.length,
            allFeedbackComplete: allFeedback.length >= (interview.panel?.length || 0),
            candidate: {
              _id: candidate?._id,
              fullName: candidate?.fullName || `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() || 'Unknown',
              email: candidate?.email,
            },
            position: {
              title: jobTemplate?.title || 'Position',
              department: jobTemplate?.department || 'Department',
            },
            application: {
              _id: application._id,
              status: (application as any).status,
              stage: (application as any).stage || (application as any).currentStage,
              isReferral: (application as any).isReferral || false,
            },
            myFeedback: myFeedback ? {
              _id: myFeedback._id,
              score: myFeedback.score,
              comments: myFeedback.comments,
              hasSubmitted: true,
            } : {
              hasSubmitted: false,
            },
          };
        } catch (err) {
          console.error(`Error enriching interview ${interview._id}:`, err);
          return null;
        }
      }),
    );

    // Filter out null entries and return
    return enrichedInterviews.filter((interview) => interview !== null);
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

    // Identify internal candidates for tie-breaking
    const internalCandidateIds = new Set<string>();
    try {
      const candidateIds = applications.map((app: any) => {
        return app.candidateId?._id?.toString() || app.candidateId?.toString();
      }).filter(Boolean);
      
      if (candidateIds.length > 0) {
        const candidates = await this.candidateModel
          .find({ _id: { $in: candidateIds.map(id => new Types.ObjectId(id)) } })
          .select('personalEmail nationalId')
          .lean();
        
        for (const candidate of candidates) {
          const candidateId = candidate._id.toString();
          const isInternal = await this.identifyInternalCandidate(candidate as any);
          if (isInternal) {
            internalCandidateIds.add(candidateId);
          }
        }
      }
    } catch (error) {
      console.warn('[RANKING] Error identifying internal candidates:', error);
    }

    // Rank applications with enhanced tie-breaking rules
    // BR: Tie-breaking priority: Internal Candidate (+20) > Referral (+10) > Score > Date
    const ranked = applications.map((app: any) => {
      const candidateId =
        app.candidateId?._id?.toString() || app.candidateId?.toString();
      const isReferral = candidateId && referralCandidateIds.has(candidateId);
      const isInternal = candidateId && internalCandidateIds.has(candidateId);
      const appId = app._id.toString();
      const score = interviewScores[appId] || 0;

      // Calculate ranking score with tie-breaking bonuses
      let rankingScore = score;
      if (isInternal) {
        rankingScore += 20; // Internal candidates get highest priority
      } else if (isReferral) {
        rankingScore += 10; // Referrals get second priority
      }

      return {
        ...app,
        isReferral,
        isInternalCandidate: isInternal,
        averageScore: score,
        rankingScore: rankingScore,
      };
    });

    // Sort by ranking score (descending), then by application date (earlier preferred)
    ranked.sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }
      // Tie-breaker: earlier application date preferred
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
  /**
   * ONB-005: Send reminders for incomplete onboarding tasks
   * BR: Reminders required; track delivery and status accordingly
   * 
   * IMPORTANT: Reminders go to the RESPONSIBLE PARTY based on user stories:
   * - ONB-007 tasks (document uploads) → New Hire
   * - ONB-009 tasks (IT/system access) → System Admin
   * - ONB-012 tasks (equipment/workspace) → HR Employee
   * - Other HR tasks → HR Manager
   */
  async sendOnboardingReminders(): Promise<void> {
    try {
      // Get all incomplete onboardings
      const allOnboardings = await this.onboardingModel
        .find({ completed: false })
        .populate('employeeId')
        .lean();

      if (!allOnboardings || allOnboardings.length === 0) {
        console.log('[ONB-005] No incomplete onboardings found for reminders');
        return;
      }
      
      console.log(`[ONB-005] Processing ${allOnboardings.length} incomplete onboarding(s) for reminders`);

      // Helper function to determine who is responsible for a task based on user stories
      const getTaskResponsibility = (taskName: string, department: string): 'NEW_HIRE' | 'SYSTEM_ADMIN' | 'HR_EMPLOYEE' | 'HR_MANAGER' => {
        const name = taskName.toLowerCase();
        const dept = department.toLowerCase();
        
        // ONB-007: Candidate/New Hire tasks (document uploads)
        if (name.includes('upload') || name.includes('document') || 
            name.includes('id document') || name.includes('certification') ||
            name.includes('contract') || name.includes('photo') || name.includes('form')) {
          return 'NEW_HIRE';
        }
        
        // ONB-009: System Admin tasks (email, SSO, system access, internal systems)
        if (dept === 'it' || name.includes('email') || name.includes('sso') || 
            name.includes('system access') || name.includes('internal systems')) {
          return 'SYSTEM_ADMIN';
        }
        
        // ONB-012: HR Employee tasks (equipment, desk, badge, access card ONLY)
        if (name.includes('laptop') || name.includes('equipment') ||
            name.includes('workspace') || name.includes('desk') ||
            name.includes('badge') || name.includes('access card')) {
          return 'HR_EMPLOYEE';
        }
        
        // ONB-018/019: Automatic tasks (payroll, signing bonus, benefits)
        // These are system-handled, but notify HR Manager if they're overdue
        // Default - HR Manager for visibility
        return 'HR_MANAGER';
      };

      // Get System Admins
      const systemAdmins = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const systemAdminIds = systemAdmins.map((a: any) => a.employeeProfileId?.toString()).filter(Boolean);
      console.log(`[ONB-005] Found ${systemAdminIds.length} System Admins:`, systemAdminIds);

      // Get HR Employees
      const hrEmployees = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_EMPLOYEE] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrEmployeeIds = hrEmployees.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);
      console.log(`[ONB-005] Found ${hrEmployeeIds.length} HR Employees:`, hrEmployeeIds);

      // Get HR Managers
      const hrManagers = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrManagerIds = hrManagers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);
      console.log(`[ONB-005] Found ${hrManagerIds.length} HR Managers:`, hrManagerIds);

      let remindersSent = 0;
      let remindersFailed = 0;
      const now = new Date();

      for (const onboarding of allOnboardings) {
        try {
          const employee = (onboarding as any).employeeId;
          if (!employee) {
            console.warn(`Onboarding ${onboarding._id} has no associated employee`);
            continue;
          }

          // Validate tasks array exists
          if (!onboarding.tasks || !Array.isArray(onboarding.tasks)) {
            console.warn(`Onboarding ${onboarding._id} has no tasks`);
            continue;
          }

          const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Hire';

          // Process each incomplete task
          for (const task of onboarding.tasks) {
            // Skip completed tasks
            if (task.status === OnboardingTaskStatus.COMPLETED) {
              continue;
            }

            // Skip tasks without deadlines
            if (!task.deadline) {
              continue;
            }

            const deadline = new Date(task.deadline);
            if (isNaN(deadline.getTime())) {
              continue;
            }

            // Calculate if overdue or upcoming (within 2 days)
            const daysUntilDeadline = Math.ceil(
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            
            const isOverdue = deadline < now;
            const isUpcoming = daysUntilDeadline <= 2 && daysUntilDeadline > 0;

            // Only send reminder if overdue or upcoming
            if (!isOverdue && !isUpcoming) {
              continue;
            }

            // Determine who should receive the reminder based on user stories
            const responsibility = getTaskResponsibility(task.name || '', task.department || '');
            let recipientIds: string[] = [];

            switch (responsibility) {
              case 'NEW_HIRE':
                // ONB-007: New hire gets reminder for document upload tasks
                recipientIds = [employee._id.toString()];
                break;
              case 'SYSTEM_ADMIN':
                // ONB-009: System admins get reminder for IT tasks
                recipientIds = systemAdminIds.length > 0 ? systemAdminIds : hrManagerIds;
                break;
              case 'HR_EMPLOYEE':
                // ONB-012: HR employees get reminder for equipment/workspace tasks
                recipientIds = hrEmployeeIds.length > 0 ? hrEmployeeIds : hrManagerIds;
                break;
              case 'HR_MANAGER':
                // HR managers get reminder for other HR tasks
                recipientIds = hrManagerIds;
                break;
            }

            // Send notification to each responsible party
            console.log(`[ONB-005] Task "${task.name}" (${task.department}) -> Responsibility: ${responsibility}, Recipients: ${recipientIds.length}`);
            
            if (recipientIds.length === 0) {
              console.warn(`[ONB-005] No recipients found for task "${task.name}" with responsibility ${responsibility}`);
              continue;
            }

            for (const recipientId of recipientIds) {
              try {
                console.log(`[ONB-005] Sending reminder to ${recipientId} for task "${task.name}"...`);
                const result = await this.notificationsService.notifyOnboardingTaskReminder(
                  recipientId,
                  {
                    employeeName: employeeName,
                    taskName: task.name || 'Unnamed Task',
                    taskDepartment: task.department || 'Unknown',
                    deadline: deadline,
                    isOverdue: isOverdue,
                    daysRemaining: isOverdue ? 0 : daysUntilDeadline,
                  },
                );
                if (result.success) {
                  remindersSent++;
                  console.log(
                    `[ONB-005] ✅ Reminder SENT to ${responsibility} (${recipientId}) for task "${task.name}" - Employee: ${employeeName}`,
                  );
                } else {
                  remindersFailed++;
                  console.warn(`[ONB-005] ❌ Reminder FAILED for ${recipientId}: ${result.message || 'Unknown error'}`);
                }
              } catch (e) {
                remindersFailed++;
                console.warn(`[ONB-005] ❌ Exception sending task reminder:`, this.getErrorMessage(e));
              }
            }
          }
        } catch (error) {
          remindersFailed++;
          console.error(
            `Error processing reminder for onboarding ${onboarding._id}:`,
            this.getErrorMessage(error),
          );
        }
      }

      console.log(
        `[ONB-005] Onboarding reminders completed: ${remindersSent} sent, ${remindersFailed} failed`,
      );
    } catch (error) {
      console.error('Error sending onboarding reminders:', error);
      throw new BadRequestException(
        'Failed to send onboarding reminders: ' + this.getErrorMessage(error),
      );
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

      // ============= INTEGRATION: Time Management Service =============
      // ONB-009: Provision system access - Clock access provisioning
      // BR: IT access automated (clock access via shift assignments)
      // Note: IT Service is not available in the system - only clock access is provisioned

      // INTEGRATION: Time Management Service - Provision clock access
      // ONB-009: Clock access should be provisioned for time tracking via shift assignment
      let shiftAssignmentResult = null;
      let shiftAssignmentNote = '';

      try {
        // Access models via database connection (models registered in TimeManagementModule)
        const ShiftModel = this.jobModel.db.model('Shift');
        const ShiftAssignmentModel = this.jobModel.db.model('ShiftAssignment');

        // Get employee details
        const employee = await this.employeeProfileService.findOne(employeeId);
        if (!employee) {
          throw new NotFoundException('Employee not found');
        }

        // Find an active shift to assign (use first available active shift)
        const activeShiftRaw = await ShiftModel.findOne({ active: true }).lean().exec();
        const activeShift = activeShiftRaw as any;

        if (activeShift && activeShift._id) {
          // Create shift assignment for clock access
          // CHANGED: Auto-approve shift assignment for automatic provisioning
          // This enables immediate time clock access as per ONB-009 integration requirements
          const shiftAssignment = new ShiftAssignmentModel({
            employeeId: new Types.ObjectId(employeeId),
            shiftId: new Types.ObjectId(activeShift._id),
            departmentId: employee.primaryDepartmentId
              ? new Types.ObjectId(employee.primaryDepartmentId.toString())
              : undefined,
            positionId: employee.primaryPositionId
              ? new Types.ObjectId(employee.primaryPositionId.toString())
              : undefined,
            startDate: employee.dateOfHire || employee.contractStartDate || new Date(),
            status: ShiftAssignmentStatus.APPROVED, // Auto-approved for automatic provisioning (ONB-009)
          });

          shiftAssignmentResult = await shiftAssignment.save();
          shiftAssignmentNote = `\n[INTEGRATION] Shift assignment created for clock access: ${shiftAssignmentResult._id.toString()}`;
          console.log(
            `Clock access provisioned for employee ${employeeId} via shift assignment ${shiftAssignmentResult._id}`,
          );
        } else {
          console.warn(
            `No active shift found. Clock access cannot be provisioned automatically for employee ${employeeId}. Please assign a shift manually.`,
          );
          shiftAssignmentNote =
            '\n[INTEGRATION] Warning: No active shift found. Clock access requires manual shift assignment.';
        }
      } catch (error) {
        console.warn(
          'Failed to provision clock access via shift assignment:',
          this.getErrorMessage(error),
        );
        shiftAssignmentNote =
          '\n[INTEGRATION] Warning: Failed to automatically create shift assignment. Manual assignment may be required.';
      }

      // ============= END INTEGRATION =============

      console.log(
        `Provisioning system access for employee ${employeeId}: ${task.name}`,
      );

      // Mark as completed after provisioning
      task.status = OnboardingTaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.notes =
        (task.notes || '') +
        `\n[${new Date().toISOString()}] System access provisioned automatically.` +
        shiftAssignmentNote;

      await onboarding.save();

      // ============= ONB-009: NOTIFY NEW HIRE ABOUT ACCESS PROVISIONING =============
      try {
        const employee = await this.employeeProfileService.findOne(employeeId);
        if (employee) {
          const employeeName = `${(employee as any).firstName || ''} ${(employee as any).lastName || ''}`.trim() || 'New Hire';
          const provisionedSystems = ['Email', 'SSO', 'Internal Systems'];
          if (shiftAssignmentResult) {
            provisionedSystems.push('Time Clock Access');
          }

          await this.notificationsService.notifyAccessProvisioned(
            [employeeId],
            {
              employeeId: employeeId,
              employeeName: employeeName,
              accessType: task.name,
              systemName: provisionedSystems.join(', '),
              provisionedBy: 'System (Automatic)',
            },
          );
          console.log(`[ONB-009] Access provisioning notification sent to new hire: ${employeeId}`);
        }
      } catch (notifyError) {
        console.warn('[ONB-009] Failed to send access provisioning notification:', notifyError);
        // Non-critical - don't fail the provisioning
      }
      // ============= END ONB-009 NOTIFICATION =============

      return {
        message: 'System access provisioned successfully',
        task: task,
        shiftAssignment: shiftAssignmentResult
          ? {
              id: shiftAssignmentResult._id.toString(),
              status: shiftAssignmentResult.status,
              startDate: shiftAssignmentResult.startDate,
              note: 'Time clock access created via shift assignment',
            }
          : null,
        warnings: shiftAssignmentNote.includes('Warning') ? [shiftAssignmentNote] : [],
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

      // Find equipment tasks (ONB-012: HR Employee handles equipment)
      // Check by task NAME only - department doesn't matter
      const equipmentTasks = onboarding.tasks.filter((task: any) => {
        const nameLower = task.name?.toLowerCase() || '';
        return nameLower.includes('workspace') || 
          nameLower.includes('desk') ||
          nameLower.includes('badge') ||
          nameLower.includes('access card') ||
          nameLower.includes('laptop') ||
          nameLower.includes('equipment');
      });

      if (equipmentTasks.length === 0) {
        throw new BadRequestException(
          'No equipment tasks found in onboarding checklist. Tasks available: ' + 
          onboarding.tasks.map((t: any) => `${t.name} (${t.department})`).join(', '),
        );
      }

      let targetTask = null;
      if (equipmentType === 'workspace' || equipmentType === 'desk') {
        targetTask = equipmentTasks.find(
          (task: any) =>
            task.name.toLowerCase().includes('workspace') || task.name.toLowerCase().includes('desk'),
        );
      } else if (equipmentType === 'access_card' || equipmentType === 'badge') {
        targetTask = equipmentTasks.find(
          (task: any) =>
            task.name.toLowerCase().includes('badge') || task.name.toLowerCase().includes('access card'),
        );
      } else if (equipmentType === 'laptop' || equipmentType === 'equipment') {
        targetTask = equipmentTasks.find(
          (task: any) =>
            task.name.toLowerCase().includes('laptop') || task.name.toLowerCase().includes('equipment'),
        );
      } else {
        throw new BadRequestException(
          `Invalid equipment type: ${equipmentType}. Valid types: workspace, desk, access_card, badge, laptop, equipment`,
        );
      }

      if (!targetTask) {
        throw new BadRequestException(
          `No matching equipment task found for type: ${equipmentType}. Available equipment tasks: ` +
          equipmentTasks.map((t: any) => t.name).join(', '),
        );
      }

      const taskIndex = onboarding.tasks.indexOf(targetTask);
      // CHANGED: Auto-complete the task when equipment is reserved (ONB-012)
      targetTask.status = OnboardingTaskStatus.COMPLETED;
      targetTask.completedAt = new Date();
      targetTask.notes =
        (targetTask.notes || '') +
        `\n[${new Date().toISOString()}] ✅ Reserved & Completed: ${JSON.stringify(equipmentDetails)}`;

      await onboarding.save();

      // ============= ONB-012: NOTIFY NEW HIRE ABOUT EQUIPMENT RESERVATION =============
      try {
        const employee = await this.employeeProfileService.findOne(employeeId);
        if (employee) {
          const employeeName = `${(employee as any).firstName || ''} ${(employee as any).lastName || ''}`.trim() || 'New Hire';
          
          // Build equipment list for notification
          const equipmentList: string[] = [];
          if (equipmentType === 'workspace' || equipmentType === 'desk') {
            equipmentList.push('Workspace/Desk');
            if (equipmentDetails?.location) {
              equipmentList.push(`Location: ${equipmentDetails.location}`);
            }
          } else if (equipmentType === 'access_card' || equipmentType === 'badge') {
            equipmentList.push('ID Badge/Access Card');
          }
          
          // Add any additional equipment details
          if (equipmentDetails?.model) equipmentList.push(equipmentDetails.model);
          if (equipmentDetails?.accessories) {
            equipmentList.push(...(Array.isArray(equipmentDetails.accessories) ? equipmentDetails.accessories : [equipmentDetails.accessories]));
          }

          await this.notificationsService.notifyEquipmentReserved(
            [employeeId],
            {
              employeeId: employeeId,
              employeeName: employeeName,
              equipmentList: equipmentList.length > 0 ? equipmentList : [equipmentType],
              workspaceDetails: equipmentDetails?.location || equipmentDetails?.desk || 'To be assigned',
              reservedBy: 'HR (Automatic)',
              readyDate: new Date(), // Ready now
            },
          );
          console.log(`[ONB-012] Equipment reservation notification sent to new hire: ${employeeId}`);
        }
      } catch (notifyError) {
        console.warn('[ONB-012] Failed to send equipment reservation notification:', notifyError);
        // Non-critical - don't fail the reservation
      }
      // ============= END ONB-012 NOTIFICATION =============

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

      // ============= INTEGRATION: Time Management Service =============
      // ONB-013: Schedule automatic clock access provisioning
      // BR: Provisioning and security must be consistent
      // Note: IT Service is not available in the system - only clock access scheduling is implemented

      const onboarding = await this.onboardingModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      });
      if (!onboarding) {
        throw new NotFoundException('Onboarding not found');
      }

      // INTEGRATION: Time Management Service - Schedule clock access provisioning
      // ONB-013: Schedule automatic shift assignment for clock access
      let shiftSchedulingNote = '';

      try {
        // Access models via database connection (models registered in TimeManagementModule)
        const ShiftModel = this.jobModel.db.model('Shift');
        const ShiftAssignmentModel = this.jobModel.db.model('ShiftAssignment');

        // Get employee details
        const employee = await this.employeeProfileService.findOne(employeeId);
        if (employee) {
          // Check if shift assignment already exists for this employee
          const existingAssignment = await ShiftAssignmentModel.findOne({
            employeeId: new Types.ObjectId(employeeId),
            startDate: { $lte: startDateObj },
            $or: [{ endDate: null }, { endDate: { $gte: startDateObj } }],
          }).lean().exec();

          if (!existingAssignment) {
            // Find an active shift to assign
            const activeShiftRaw = await ShiftModel.findOne({ active: true }).lean().exec();
            const activeShift = activeShiftRaw as any;

            if (activeShift && activeShift._id) {
              // Create shift assignment scheduled for startDate
              const shiftAssignment = new ShiftAssignmentModel({
                employeeId: new Types.ObjectId(employeeId),
                shiftId: new Types.ObjectId(activeShift._id),
                departmentId: employee.primaryDepartmentId
                  ? new Types.ObjectId(employee.primaryDepartmentId.toString())
                  : undefined,
                positionId: employee.primaryPositionId
                  ? new Types.ObjectId(employee.primaryPositionId.toString())
                  : undefined,
                startDate: startDateObj,
                endDate: endDate ? new Date(endDate) : undefined,
                status: ShiftAssignmentStatus.PENDING, // Will be approved by HR/Manager before startDate
              });

              await shiftAssignment.save();
              shiftSchedulingNote = `\n[INTEGRATION] Shift assignment scheduled for clock access starting ${startDateObj.toISOString()}`;
              console.log(
                `Scheduled shift assignment for employee ${employeeId} starting ${startDateObj.toISOString()}`,
              );
            } else {
              shiftSchedulingNote =
                '\n[INTEGRATION] Warning: No active shift found. Clock access requires manual shift assignment.';
            }
          } else {
            shiftSchedulingNote =
              '\n[INTEGRATION] Note: Shift assignment already exists for this employee.';
          }
        }
      } catch (error) {
        console.warn(
          'Failed to schedule clock access provisioning:',
          this.getErrorMessage(error),
        );
        shiftSchedulingNote =
          '\n[INTEGRATION] Warning: Failed to automatically schedule shift assignment. Manual assignment may be required.';
      }

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
            `\n[${new Date().toISOString()}] Scheduled for automatic provisioning on ${startDateObj.toISOString()}` +
            shiftSchedulingNote;
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
   * 
   * This method:
   * 1. Validates employee and onboarding data
   * 2. Marks the payroll task as completed
   * 3. Sends notifications to Payroll team (NEW_HIRE_PAYROLL_READY)
   * 4. Sends confirmation to HR (ONBOARDING_PAYROLL_TASK_COMPLETED)
   */
  async triggerPayrollInitiation(
    employeeId: string,
    contractSigningDate: Date,
    grossSalary: number,
    providedPositionTitle?: string, // Optional: position title from job template/contract
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
      // Note: Payroll runs are created for periods (monthly), not individual employees.
      // Active employees are automatically included in payroll runs when they are processed.
      // This integration ensures the employee is ready and will be included in future payroll runs.

      // Get employee details to verify readiness
      const employee = await this.employeeProfileService.findOne(employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Get position and department details for notifications
      // Use provided position title (from job template/contract) first, then try lookup, then default
      let positionTitle = providedPositionTitle || 'New Hire';
      let departmentName = '';
      
      // Only try position lookup if no position title was provided
      if (!providedPositionTitle && employee.primaryPositionId) {
        try {
          const position = await this.organizationStructureService.getPositionById(
            employee.primaryPositionId.toString(),
          );
          if (position) {
            positionTitle = position.title || 'New Hire';
          }
        } catch (e) {
          // Position lookup failed, use default
        }
      }

      if (employee.primaryDepartmentId) {
        try {
          const department = await this.organizationStructureService.getDepartmentById(
            employee.primaryDepartmentId.toString(),
          );
          if (department) {
            departmentName = department.name || '';
          }
        } catch (e) {
          // Department lookup failed, use default
        }
      }

      // Employee is ready for payroll inclusion:
      // 1. Employee profile exists and is active
      // 2. Contract has been signed with gross salary
      // 3. Employee will be automatically included in payroll runs when processPayrollInitiation is called for the period
      // PayrollExecutionService.processPayrollInitiation() creates payroll runs for periods and includes all active employees

      payrollTask.status = OnboardingTaskStatus.COMPLETED;
      payrollTask.completedAt = new Date();
      payrollTask.notes =
        (payrollTask.notes || '') +
        `\n[${new Date().toISOString()}] Payroll readiness confirmed. ` +
        `Employee will be automatically included in payroll runs when processPayrollInitiation() is called for the payroll period. ` +
        `Contract signed: ${contractSigningDate.toISOString()}, Gross Salary: ${grossSalary}`;

      await onboarding.save();

      console.log(
        `Payroll readiness confirmed for employee ${employeeId} (REQ-PY-23). Employee will be included in payroll runs automatically.`,
      );

      // ============= NOTIFICATION: Notify Payroll Team (ONB-018) =============
      // Send notifications to Payroll Specialists and Payroll Managers
      try {
        // Find all Payroll Specialists and Payroll Managers
        const payrollTeamRoles = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();

        const payrollTeamIds = payrollTeamRoles.map(
          (role: any) => role.employeeProfileId.toString(),
        );

        if (payrollTeamIds.length > 0) {
          const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Employee';
          
          await this.notificationsService.notifyPayrollTeamNewHire(
            payrollTeamIds,
            {
              employeeId,
              employeeName,
              employeeNumber: employee.employeeNumber,
              positionTitle,
              departmentName,
              grossSalary,
              contractStartDate: contractSigningDate,
            },
          );
          
          console.log(
            `[ONB-018] Sent NEW_HIRE_PAYROLL_READY notification to ${payrollTeamIds.length} payroll team member(s)`,
          );
        } else {
          console.warn(
            '[ONB-018] No payroll team members found to notify. Consider adding Payroll Specialists/Managers.',
          );
        }

        // Also notify HR about task completion
        const hrRoles = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();

        const hrUserIds = hrRoles.map((role: any) => role.employeeProfileId.toString());

        if (hrUserIds.length > 0) {
          const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Employee';
          
          await this.notificationsService.notifyHRPayrollTaskCompleted(
            hrUserIds,
            {
              employeeId,
              employeeName,
              positionTitle,
              grossSalary,
            },
          );
          
          console.log(
            `[ONB-018] Sent ONBOARDING_PAYROLL_TASK_COMPLETED notification to ${hrUserIds.length} HR user(s)`,
          );
        }
      } catch (notificationError) {
        // Log notification error but don't fail the main operation
        console.error(
          '[ONB-018] Failed to send payroll notifications:',
          this.getErrorMessage(notificationError),
        );
      }
      // ============= END NOTIFICATION =============

      // ============= END INTEGRATION =============

      return {
        message: 'Payroll initiation triggered successfully',
        contractSigningDate,
        grossSalary,
        task: payrollTask,
        notificationsSent: true,
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
   * 
   * This method:
   * 1. Validates employee and onboarding data
   * 2. Creates EmployeeSigningBonus record in payroll-execution module
   * 3. Marks the signing bonus task as completed
   * 4. Sends notifications to Payroll team (SIGNING_BONUS_PENDING_REVIEW)
   */
  async processSigningBonus(
    employeeId: string,
    signingBonus: number,
    contractSigningDate: Date,
    providedPositionTitle?: string, // Optional: position title from job template/contract
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

      // Get employee details
      const employee = await this.employeeProfileService.findOne(employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      let signingBonusResult: any = null;
      let integrationNote = '';
      // Use provided position title (from job template/contract) first, then try lookup, then default
      let positionTitle = providedPositionTitle || 'New Hire';

      // Find signing bonus configuration by position title
      // Only try position lookup if no position title was provided
      if (!providedPositionTitle && employee.primaryPositionId) {
        try {
          // Get position details
          const position =
            await this.organizationStructureService.getPositionById(
              employee.primaryPositionId.toString(),
            );

          if (position && position.title) {
            positionTitle = position.title;
            
            // Find matching signing bonus configuration
            const signingBonusesResult =
              await this.payrollConfigurationService.findAllSigningBonuses({
                status: ConfigStatus.APPROVED,
                limit: 1000,
              });
            const approvedSigningBonuses = signingBonusesResult?.data || [];

            const matchingConfig = approvedSigningBonuses.find(
              (config: any) => config.positionName === position.title,
            );

            if (matchingConfig) {
              // Use contract signing bonus amount if available, otherwise use configuration amount
              const finalAmount =
                signingBonus || matchingConfig.amount || 0;

              // Create employee signing bonus using PayrollExecutionService
              signingBonusResult =
                await this.payrollExecutionService.createEmployeeSigningBonus(
                  {
                    employeeId: employeeId,
                    signingBonusId: matchingConfig._id.toString(),
                    givenAmount: finalAmount,
                    status: BonusStatus.PENDING,
                    paymentDate: contractSigningDate.toISOString(),
                  },
                  'system', // System-initiated, no specific user ID needed
                );

              integrationNote = `\n[INTEGRATION] Employee Signing Bonus created: ${signingBonusResult._id.toString()}`;
            } else {
              console.warn(
                `No signing bonus configuration found for position: ${position.title}. Signing bonus from contract will not be processed automatically.`,
              );
              integrationNote =
                '\n[INTEGRATION] Warning: No signing bonus configuration found for employee position. Manual processing may be required.';
            }
          }
        } catch (error) {
          console.warn(
            'Failed to process signing bonus integration:',
            this.getErrorMessage(error),
          );
          integrationNote =
            '\n[INTEGRATION] Warning: Failed to automatically create signing bonus record. Manual processing may be required.';
        }
      }

      // Mark task and log the action
      bonusTask.status = OnboardingTaskStatus.COMPLETED;
      bonusTask.completedAt = new Date();
      bonusTask.notes =
        (bonusTask.notes || '') +
        `\n[${new Date().toISOString()}] Signing bonus processed automatically. ` +
        `Amount: ${signingBonus}, Contract signed: ${contractSigningDate.toISOString()}` +
        integrationNote;

      await onboarding.save();

      console.log(
        `Signing bonus processed for employee ${employeeId} (REQ-PY-27): ${signingBonus}`,
      );

      // ============= NOTIFICATION: Notify Payroll Team (ONB-019) =============
      // Send notifications to Payroll Specialists and Payroll Managers about pending signing bonus
      try {
        // Find all Payroll Specialists and Payroll Managers
        const payrollTeamRoles = await this.employeeSystemRoleModel
          .find({
            roles: { $in: [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER] },
            isActive: true,
          })
          .select('employeeProfileId')
          .lean()
          .exec();

        const payrollTeamIds = payrollTeamRoles.map(
          (role: any) => role.employeeProfileId.toString(),
        );

        if (payrollTeamIds.length > 0) {
          const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Employee';
          
          await this.notificationsService.notifyPayrollTeamSigningBonus(
            payrollTeamIds,
            {
              employeeId,
              employeeName,
              employeeNumber: employee.employeeNumber,
              positionTitle,
              signingBonusAmount: signingBonus,
              signingBonusId: signingBonusResult?._id?.toString(),
              paymentDate: contractSigningDate,
            },
          );
          
          console.log(
            `[ONB-019] Sent SIGNING_BONUS_PENDING_REVIEW notification to ${payrollTeamIds.length} payroll team member(s)`,
          );
        } else {
          console.warn(
            '[ONB-019] No payroll team members found to notify about signing bonus.',
          );
        }
      } catch (notificationError) {
        // Log notification error but don't fail the main operation
        console.error(
          '[ONB-019] Failed to send signing bonus notifications:',
          this.getErrorMessage(notificationError),
        );
      }
      // ============= END NOTIFICATION =============

      // ============= END INTEGRATION =============

      return {
        message: 'Signing bonus processed successfully',
        signingBonus,
        contractSigningDate,
        task: bonusTask,
        signingBonusRecord: signingBonusResult,
        notificationsSent: true,
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
    // changed - user.role to user.roles (array)
    if (!user || !user.roles || user.roles.length === 0) {
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
      // changed - user.role to user.roles.includes()
      if (!user.roles?.includes(SystemRole.DEPARTMENT_EMPLOYEE)) {
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
      // changed - user.role to user.roles.includes()
      if (!user.roles?.includes(SystemRole.HR_MANAGER)) {
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

      // OFF-001: Only allow termination if performance score is low enough
      // Supports both percentage scores (0-100) and 5-point scale scores (0-5)
      // Threshold: < 50% (percentage) OR < 2.5 (5-point scale)
      const isPercentageScale = latestRecord.totalScore > 5; // If score > 5, it's likely a percentage
      const threshold = isPercentageScale ? 50 : 2.5;
      const scaleLabel = isPercentageScale ? '%' : '/5';
      
      if (latestRecord.totalScore >= threshold) {
        throw new ForbiddenException(
          `Cannot terminate: Employee performance score is ${latestRecord.totalScore}${scaleLabel}, which is not low enough for termination. Score must be below ${threshold}${scaleLabel} to proceed with termination.`,
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

  // ============================================================================
  // NEW CHANGES: SUBMIT RESIGNATION - Any employee type can resign themselves
  // Implements OFF-018: Employee can request resignation with reasoning
  // ============================================================================
  /**
   * Allows ANY authenticated employee (HR Manager, Admin, Department Employee, etc.)
   * to submit their own resignation. No role restrictions - only requirement is
   * that the user is a valid employee in the system.
   */
  async submitResignation(dto: SubmitResignationDto, user: any) {
    // Guard: user must be authenticated with a valid token
    if (!user) {
      throw new ForbiddenException('You must be logged in to submit a resignation.');
    }

    // Get employee number from JWT token
    const employeeNumber = user.employeeNumber;
    if (!employeeNumber) {
      throw new BadRequestException(
        'Employee number not found in token. Please log in again.',
      );
    }

    // Find the employee by their own employeeNumber from token
    const employee = await this.employeeModel
      .findOne({ employeeNumber })
      .exec();

    if (!employee) {
      throw new NotFoundException(
        'Your employee profile was not found. Please contact HR.',
      );
    }

    // Check if employee already has a pending resignation
    const existingResignation = await this.terminationModel
      .findOne({
        employeeId: employee._id,
        initiator: TerminationInitiation.EMPLOYEE,
        status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] },
      })
      .exec();

    if (existingResignation) {
      throw new BadRequestException(
        'You already have a pending resignation request. Please wait for HR to process it.',
      );
    }

    // Create the resignation request
    const resignation = await this.terminationModel.create({
      employeeId: employee._id,
      initiator: TerminationInitiation.EMPLOYEE, // Always 'employee' for resignations
      reason: dto.reason,
      employeeComments: dto.comments,
      terminationDate: dto.requestedLastDay
        ? new Date(dto.requestedLastDay)
        : undefined,
      status: TerminationStatus.PENDING,
      contractId: employee._id, // Using employee._id as dummy ObjectId (no separate contract entity)
    });

    // OFF-018: Send notifications to HR Managers about the resignation
    try {
      const hrManagers = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrManagerIds = hrManagers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

      if (hrManagerIds.length > 0) {
        await this.notificationsService.notifyResignationSubmitted(
          hrManagerIds,
          {
            employeeId: employee._id.toString(),
            employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber,
            reason: dto.reason,
            requestedLastDay: dto.requestedLastDay,
            department: (employee as any).department,
          },
        );
        console.log(`[OFF-018] Resignation notification sent to ${hrManagerIds.length} HR Manager(s)`);
      }
    } catch (notifyError) {
      console.warn('[OFF-018] Failed to send resignation notification:', this.getErrorMessage(notifyError));
    }

    return {
      message: 'Resignation submitted successfully. HR will review your request.',
      resignation,
    };
  }

  // ============================================================================
  // NEW CHANGES: TERMINATE EMPLOYEE BY HR - Only HR Manager can terminate based on performance
  // Implements OFF-001: HR Manager initiates termination based on performance
  // ============================================================================
  /**
   * Allows HR Manager to terminate an employee based on poor performance.
   * Checks that the employee has an appraisal record with a low score (< 2.5).
   */
  async terminateEmployeeByHR(dto: TerminateEmployeeDto, user: any) {
    // OFF-001: Only HR Manager can terminate employees based on performance
    if (!user || !user.roles?.includes(SystemRole.HR_MANAGER)) {
      throw new ForbiddenException(
        'Only HR Manager can terminate employees.',
      );
    }

    // Validate employeeId format
    if (
      !dto.employeeId ||
      typeof dto.employeeId !== 'string' ||
      dto.employeeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Employee ID (employeeNumber) is required and must be a non-empty string.',
      );
    }

    // Find employee by employeeNumber
    const employee = await this.employeeModel
      .findOne({ employeeNumber: dto.employeeId })
      .exec();

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID "${dto.employeeId}" not found.`,
      );
    }

    // HR Manager cannot terminate themselves
    if (user.employeeNumber === dto.employeeId) {
      throw new ForbiddenException(
        'You cannot terminate yourself. Please use the resignation endpoint instead.',
      );
    }

    // Check if employee already has a pending termination
    const existingTermination = await this.terminationModel
      .findOne({
        employeeId: employee._id,
        initiator: { $in: [TerminationInitiation.HR, TerminationInitiation.MANAGER] },
        status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] },
      })
      .exec();

    if (existingTermination) {
      throw new BadRequestException(
        'This employee already has a pending termination request.',
      );
    }

    // ============================================================================
    // PERFORMANCE CHECK: Employee must have low performance score to be terminated
    // ============================================================================
    const latestRecord = await this.appraisalRecordModel
      .findOne({ employeeProfileId: employee._id })
      .sort({ createdAt: -1 })
      .exec();

    // OFF-001: Performance-based termination requires appraisal record with low score
    if (!latestRecord) {
      throw new BadRequestException(
        'Cannot terminate: Employee has no appraisal record on file. Please ensure the employee has been appraised before initiating termination.',
      );
    }

    if (latestRecord.totalScore === undefined || latestRecord.totalScore === null) {
      throw new BadRequestException(
        'Cannot terminate: Employee appraisal has no total score. Please complete the appraisal process first.',
      );
    }

    // OFF-001: Only allow termination if performance score is low enough
    // Supports both percentage scores (0-100) and 5-point scale scores (0-5)
    // Threshold: < 50% (percentage) OR < 2.5 (5-point scale)
    const isPercentageScale = latestRecord.totalScore > 5; // If score > 5, it's likely a percentage
    const threshold = isPercentageScale ? 50 : 2.5;
    const scaleLabel = isPercentageScale ? '%' : '/5';
    
    if (latestRecord.totalScore >= threshold) {
      throw new BadRequestException(
        `Cannot terminate: Employee performance score is ${latestRecord.totalScore}${scaleLabel}, which is not low enough for termination. Score must be below ${threshold}${scaleLabel} to proceed with termination.`,
      );
    }

    // Create the termination request
    const termination = await this.terminationModel.create({
      employeeId: employee._id,
      initiator: TerminationInitiation.HR, // Always 'hr' for HR-initiated terminations
      reason: dto.reason || `Termination due to poor performance (score: ${latestRecord.totalScore})`,
      hrComments: dto.hrComments,
      terminationDate: dto.terminationDate
        ? new Date(dto.terminationDate)
        : undefined,
      status: TerminationStatus.PENDING,
      contractId: employee._id,
    });

    // OFF-001: Send notifications about termination initiation
    try {
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber;
      const initiatorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.employeeNumber || 'HR Manager';

      // Notify other HR Managers and Department Head
      const hrManagers = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrManagerIds = hrManagers
        .map((hr: any) => hr.employeeProfileId?.toString())
        .filter((id: string) => id && id !== user.id); // Exclude the initiator

      if (hrManagerIds.length > 0) {
        await this.notificationsService.notifyTerminationInitiated(
          hrManagerIds,
          {
            employeeId: employee._id.toString(),
            employeeName: employeeName,
            reason: termination.reason,
            performanceScore: latestRecord.totalScore,
            initiatedBy: initiatorName,
            terminationDate: dto.terminationDate,
          },
        );
        console.log(`[OFF-001] Termination notification sent to ${hrManagerIds.length} HR Manager(s)`);
      }

      // OFF-001: NOTIFY THE EMPLOYEE about the termination initiation
      await this.notificationsService.notifyEmployeeTerminationInitiated(
        employee._id.toString(),
        {
          reason: termination.reason,
          performanceScore: latestRecord.totalScore,
          initiatedBy: initiatorName,
        },
      );
      console.log(`[OFF-001] Termination notice sent to employee: ${employee.employeeNumber}`);
    } catch (notifyError) {
      console.warn('[OFF-001] Failed to send termination notification:', this.getErrorMessage(notifyError));
    }

    return {
      message: `Termination request created for employee ${dto.employeeId}.`,
      performanceScore: latestRecord.totalScore,
      termination,
    };
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

  // ============================================================================
  // NEW CHANGES - FIXED: GET MY RESIGNATION REQUESTS - Any employee type can track
  // Implements OFF-019: Employee can track resignation request status
  // Removed role check - was only allowing DEPARTMENT_EMPLOYEE before
  // ============================================================================
  /**
   * Allows ANY authenticated employee (HR Manager, Admin, Department Employee, etc.)
   * to view their own resignation/termination requests.
   */
  async getMyResignationRequests(user: any) {
    // Guard: user must be authenticated (no role check - any employee type)
    if (!user) {
      throw new ForbiddenException('You must be logged in to view your requests.');
    }

    const employeeNumber = user.employeeNumber;
    if (!employeeNumber) {
      throw new BadRequestException(
        'Employee number not found in token. Please log in again.',
      );
    }

    const employee = await this.employeeModel
      .findOne({ employeeNumber })
      .exec();
    if (!employee) {
      throw new NotFoundException('Your employee profile was not found.');
    }

    // Return all termination/resignation requests for this employee
    const requests = await this.terminationModel
      .find({ employeeId: employee._id })
      .sort({ createdAt: -1 })
      .exec();
    
    return requests;
  }

  // ============================================================================
  // HR MANAGER: Get ALL termination/resignation requests (OFF-001, OFF-018, OFF-019)
  // ============================================================================
  /**
   * Allows HR Manager to view ALL termination/resignation requests in the system.
   * Used for managing the offboarding workflow.
   */
  async getAllTerminationRequests() {
    try {
      const requests = await this.terminationModel
        .find()
        .populate({
          path: 'employeeId',
          select: 'firstName lastName fullName employeeNumber department position workEmail',
          model: 'EmployeeProfile',
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      // Transform to include employee details
      return requests.map((request: any) => {
        const employee = request.employeeId;
        return {
          ...request,
          employeeId: employee?._id?.toString() || request.employeeId?.toString(),
          employee: employee ? {
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            employeeNumber: employee.employeeNumber,
            department: employee.department,
            position: employee.position,
            workEmail: employee.workEmail,
          } : null,
        };
      });
    } catch (error) {
      console.error('Error fetching all termination requests:', error);
      throw new BadRequestException(
        'Failed to fetch termination requests: ' + this.getErrorMessage(error),
      );
    }
  }

  // 3) HR UPDATES TERMINATION STATUS
  async updateTerminationStatus(
    id: string,
    dto: UpdateTerminationStatusDto,
    user: any,
  ) {
    // Only HR Manager
    // changed - user.role to user.roles.includes()
    if (!user || !user.roles?.includes(SystemRole.HR_MANAGER)) {
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

    // BR: Employee separation needs an effective date (termination date) when approved
    if (dto.status === TerminationStatus.APPROVED) {
      const effectiveDate = dto.terminationDate
        ? new Date(dto.terminationDate)
        : termination.terminationDate;
      if (!effectiveDate || isNaN(effectiveDate.getTime())) {
        throw new BadRequestException(
          'Termination date (effective date) is required when approving termination request',
        );
      }
    }

    termination.status = dto.status;

    if (dto.hrComments !== undefined) {
      termination.hrComments = dto.hrComments;
    }

    if (dto.terminationDate) {
      termination.terminationDate = new Date(dto.terminationDate);
    }

    const saved = await termination.save();

    // =========================================================================
    // UPDATE EMPLOYEE STATUS ON TERMINATION/RESIGNATION APPROVAL
    // =========================================================================
    // BR: When termination/resignation is approved, update employee status:
    // - Resignation (employee-initiated) → RETIRED
    // - Termination (HR/Manager-initiated) → TERMINATED
    // This prevents retired/terminated employees from accessing the system
    // =========================================================================
    if (dto.status === TerminationStatus.APPROVED) {
      try {
        const employee = await this.employeeModel.findById(termination.employeeId).exec();
        if (employee) {
          const isResignation = termination.initiator === TerminationInitiation.EMPLOYEE;
          const newStatus = isResignation ? EmployeeStatus.RETIRED : EmployeeStatus.TERMINATED;
          const statusReason = isResignation ? 'resignation' : 'termination';
          
          // Only update if employee is currently ACTIVE
          if (employee.status === EmployeeStatus.ACTIVE) {
            await this.employeeModel.findByIdAndUpdate(
              termination.employeeId,
              {
                $set: {
                  status: newStatus,
                  statusEffectiveFrom: termination.terminationDate || new Date(),
                },
              },
              { new: true },
            ).exec();
            console.log(
              `✅ Employee ${employee.employeeNumber} (${termination.employeeId.toString()}) status automatically changed from ACTIVE to ${newStatus} after ${statusReason} approval`,
            );
          } else {
            console.log(
              `ℹ️ Employee ${employee.employeeNumber} status is ${employee.status}, not updating to ${newStatus} (only ACTIVE employees are updated)`,
            );
          }
        }
      } catch (statusError) {
        // Non-blocking: log but don't fail if status update fails
        console.warn(
          `⚠️ Failed to auto-update employee status after termination/resignation approval:`,
          this.getErrorMessage(statusError),
        );
      }
    }
    // =========================================================================

    // When approved → create clearance checklist (if it doesn't already exist)
    if (dto.status === TerminationStatus.APPROVED) {
      try {
        // Check if checklist already exists
        const existingChecklist = await this.clearanceModel.findOne({
          terminationId: termination._id,
        });
        if (!existingChecklist) {
          const newChecklist = await this.createClearanceChecklist(
            {
              terminationId: termination._id.toString(),
            } as CreateClearanceChecklistDto,
            user,
          );
          console.log(`✅ [OFF-006] Clearance checklist auto-created for termination ${termination._id}`);
          
          // OFF-006: Notify all departments about the new clearance checklist
          try {
            const employee = await this.employeeModel.findById(termination.employeeId).exec();
            const employeeName = employee 
              ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber
              : 'Employee';
            
            // Get ALL relevant roles for clearance sign-offs (OFF-010)
            const [systemAdmins, hrManagers, hrEmployees, departmentHeads, financeStaff] = await Promise.all([
              this.employeeSystemRoleModel.find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true }).select('employeeProfileId').lean().exec(),
              this.employeeSystemRoleModel.find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true }).select('employeeProfileId').lean().exec(),
              this.employeeSystemRoleModel.find({ roles: { $in: [SystemRole.HR_EMPLOYEE] }, isActive: true }).select('employeeProfileId').lean().exec(),
              this.employeeSystemRoleModel.find({ roles: { $in: [SystemRole.DEPARTMENT_HEAD] }, isActive: true }).select('employeeProfileId').lean().exec(),
              this.employeeSystemRoleModel.find({ roles: { $in: [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST] }, isActive: true }).select('employeeProfileId').lean().exec(),
            ]);
            
            const allRecipients = [
              ...systemAdmins.map((a: any) => a.employeeProfileId?.toString()),
              ...hrManagers.map((hr: any) => hr.employeeProfileId?.toString()),
              ...hrEmployees.map((hr: any) => hr.employeeProfileId?.toString()),
              ...departmentHeads.map((dh: any) => dh.employeeProfileId?.toString()),
              ...financeStaff.map((fs: any) => fs.employeeProfileId?.toString()),
            ].filter(Boolean);
            
            console.log(`📋 [OFF-010] Sending clearance notifications to: ${allRecipients.length} recipients`);
            console.log(`   - System Admins: ${systemAdmins.length}`);
            console.log(`   - HR Managers: ${hrManagers.length}`);
            console.log(`   - HR Employees: ${hrEmployees.length}`);
            console.log(`   - Department Heads: ${departmentHeads.length}`);
            console.log(`   - Finance Staff: ${financeStaff.length}`);
            
            if (allRecipients.length > 0) {
              await this.notificationsService.notifyClearanceChecklistCreated(
                [...new Set(allRecipients)],
                {
                  employeeId: termination.employeeId.toString(),
                  employeeName: employeeName,
                  terminationDate: termination.terminationDate?.toISOString() || new Date().toISOString(),
                  departments: ['LINE_MANAGER', 'HR', 'IT', 'FINANCE', 'HR_EMPLOYEE'],
                },
              );
              console.log(`✅ [OFF-006] Clearance checklist notification sent to ${allRecipients.length} recipient(s)`);
            }
          } catch (notifyError) {
            console.warn('[OFF-006] Failed to send clearance checklist notification:', this.getErrorMessage(notifyError));
          }
        } else {
          console.log(`ℹ️ Clearance checklist already exists for termination ${termination._id}`);
        }
      } catch (e) {
        // Non-critical - log but don't fail status update
        console.warn('❌ Failed to create clearance checklist automatically:', this.getErrorMessage(e));
      }
    }

    // ============= SEND NOTIFICATIONS (OFF-019) =============
    try {
      // Get employee details
      const employee = await this.employeeModel.findById(termination.employeeId).exec();
      const employeeName = employee 
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber
        : 'Employee';
      
      const isResignation = termination.initiator === TerminationInitiation.EMPLOYEE;
      
      // Notify the EMPLOYEE about their status update (OFF-019)
      if (employee) {
        // For HR-initiated terminations, include the reason in the notification
        if (!isResignation && dto.status === TerminationStatus.APPROVED) {
          // OFF-001: Employee notification for APPROVED TERMINATION with reason
          await this.notificationsService.notifyEmployeeTerminationApproved(
            employee._id.toString(),
            {
              reason: termination.reason,
              effectiveDate: termination.terminationDate?.toISOString() || new Date().toISOString(),
              hrComments: dto.hrComments,
            },
          );
          console.log(`[OFF-001] Termination APPROVED notification sent to employee: ${employee.employeeNumber}`);
        } else {
          // For resignations or other status updates, use the existing method
          await this.notificationsService.notifyResignationStatusUpdated(
            employee._id.toString(),
            {
              employeeName: employeeName,
              newStatus: dto.status,
              effectiveDate: termination.terminationDate?.toISOString(),
              hrComments: dto.hrComments,
            },
          );
          console.log(`[OFF-019] ${isResignation ? 'Resignation' : 'Termination'} status update notification sent to ${employeeName}`);
        }
      }

      // If APPROVED, also notify IT for access revocation (OFF-007)
      if (dto.status === TerminationStatus.APPROVED) {
        const systemAdmins = await this.employeeSystemRoleModel
          .find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true })
          .select('employeeProfileId')
          .lean()
          .exec();
        const adminIds = systemAdmins.map((a: any) => a.employeeProfileId?.toString()).filter(Boolean);

        if (adminIds.length > 0) {
          await this.notificationsService.notifyTerminationApproved(
            adminIds,
            {
              employeeId: termination.employeeId.toString(),
              employeeName: employeeName,
              effectiveDate: termination.terminationDate?.toISOString() || new Date().toISOString(),
              reason: termination.reason,
            },
          );
          console.log(`[OFF-007] Termination approved notification sent to ${adminIds.length} System Admin(s)`);
        }
      }
    } catch (notifyError) {
      console.warn('[OFF-019] Failed to send status update notification:', this.getErrorMessage(notifyError));
    }
    // ============= END NOTIFICATIONS =============

    return saved;
  }

  // 4) UPDATE TERMINATION DETAILS (reason/comments/date)
  async updateTerminationDetails(
    id: string,
    dto: UpdateTerminationDetailsDto,
    user: any,
  ) {
    // Reasonable to restrict to HR Manager
    // changed - user.role to user.roles.includes()
    if (!user || !user.roles?.includes(SystemRole.HR_MANAGER)) {
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
    // changed - user.role to user.roles.includes()
    if (!user || !user.roles?.includes(SystemRole.HR_MANAGER)) {
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
      // CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
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
          { department: 'HR_EMPLOYEE', status: ApprovalStatus.PENDING },
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

    // Default checklist order: LINE_MANAGER (assigned), HR, IT, FINANCE, HR_EMPLOYEE
    // CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
    // Each department signs off on their overall clearance
    const items = [
      {
        department: 'LINE_MANAGER',
        assignedTo: departmentManagerId,
        status: ApprovalStatus.PENDING,
      },
      { department: 'HR', status: ApprovalStatus.PENDING },
      { department: 'IT', status: ApprovalStatus.PENDING },
      { department: 'FINANCE', status: ApprovalStatus.PENDING },
      { department: 'HR_EMPLOYEE', status: ApprovalStatus.PENDING },
    ];

    const checklist = new this.clearanceModel({
      terminationId: new Types.ObjectId(dto.terminationId),
      items,
      equipmentList,
      cardReturned: false,
    });

    const savedChecklist = await checklist.save();

    // ============= OFF-010: Send TARGETED notifications to EACH department =============
    try {
      const employeeName = employee 
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber
        : 'Employee';
      const terminationDate = termination.terminationDate?.toISOString() || new Date().toISOString();

      // Get recipients for each department
      // CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
      const departmentRecipients: { [key: string]: string[] } = {
        'LINE_MANAGER': [],
        'IT': [],
        'FINANCE': [],
        'HR_EMPLOYEE': [],
        'HR': [],
      };

      // LINE_MANAGER - Department Heads (specific manager + all department heads as fallback)
      if (departmentManagerId) {
        departmentRecipients['LINE_MANAGER'].push(departmentManagerId.toString());
      }
      // Also notify ALL Department Heads (they can see if it's relevant to their team)
      const allDepartmentHeads = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.DEPARTMENT_HEAD] }, isActive: true })
        .select('employeeProfileId').lean().exec();
      const deptHeadIds = allDepartmentHeads.map((dh: any) => dh.employeeProfileId?.toString()).filter(Boolean);
      departmentRecipients['LINE_MANAGER'].push(...deptHeadIds);
      console.log(`📋 [OFF-010] LINE_MANAGER recipients: ${departmentRecipients['LINE_MANAGER'].length} (specific: ${departmentManagerId ? 1 : 0}, all dept heads: ${deptHeadIds.length})`);

      // IT - System Admins
      const systemAdmins = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true })
        .select('employeeProfileId').lean().exec();
      departmentRecipients['IT'] = systemAdmins.map((a: any) => a.employeeProfileId?.toString()).filter(Boolean);

      // FINANCE - Payroll/Finance Staff
      const financeStaff = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST] }, isActive: true })
        .select('employeeProfileId').lean().exec();
      departmentRecipients['FINANCE'] = financeStaff.map((f: any) => f.employeeProfileId?.toString()).filter(Boolean);

      // HR_EMPLOYEE - Combined FACILITIES and ADMIN clearance items (HR Employees)
      const hrEmployees = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN] }, isActive: true })
        .select('employeeProfileId').lean().exec();
      const hrEmployeeIds = hrEmployees.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);
      departmentRecipients['HR_EMPLOYEE'] = hrEmployeeIds;

      // HR - HR Managers
      const hrManagers = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId').lean().exec();
      departmentRecipients['HR'] = hrManagers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

      // Send targeted notification to each department
      for (const [dept, recipients] of Object.entries(departmentRecipients)) {
        if (recipients.length > 0) {
          await this.notificationsService.notifyClearanceSignOffNeeded(
            [...new Set(recipients)], // Remove duplicates
            {
              employeeId: employee._id.toString(),
              employeeName: employeeName,
              department: dept,
              terminationDate: terminationDate,
              checklistId: savedChecklist._id.toString(),
            },
          );
          console.log(`✅ [OFF-010] ${dept} clearance notification sent to ${recipients.length} recipient(s)`);
        }
      }
    } catch (notifyError) {
      console.warn('[OFF-010] Failed to send department clearance notifications:', this.getErrorMessage(notifyError));
    }
    // ============= END DEPARTMENT NOTIFICATIONS =============

    return savedChecklist;
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
  // ============================================================================
  // NEW CHANGES FOR OFFBOARDING: Now supports both _id and employeeNumber
  // ============================================================================
  async getChecklistByEmployee(employeeId: string) {
    // Validate employeeId format
    if (
      !employeeId ||
      typeof employeeId !== 'string' ||
      employeeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Employee ID (_id or employeeNumber) is required and must be a non-empty string',
      );
    }

    // Try to find employee by _id first (if valid ObjectId), then by employeeNumber
    let employee;
    if (Types.ObjectId.isValid(employeeId)) {
      employee = await this.employeeModel.findById(employeeId).exec();
    }
    
    // If not found by _id, try by employeeNumber
    if (!employee) {
      employee = await this.employeeModel
        .findOne({ employeeNumber: employeeId })
        .exec();
    }

    if (!employee) {
      throw new NotFoundException('Employee not found. Provide valid _id or employeeNumber.');
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

  // OFF-010: GET ALL CLEARANCE CHECKLISTS - For department roles to see their pending items
  // This does NOT expose termination details, only checklist data with employee info
  async getAllClearanceChecklists() {
    try {
      // Get all clearance checklists
      const checklists = await this.clearanceModel.find().lean().exec();
      
      // Enrich each checklist with employee info (from termination -> employee)
      const enrichedChecklists = await Promise.all(
        checklists.map(async (checklist: any) => {
          let employeeInfo = {
            _id: null,
            fullName: 'Unknown Employee',
            employeeNumber: 'N/A',
            workEmail: 'N/A',
            department: 'N/A',
          };
          
          let terminationDate = null;
          let terminationType = 'Unknown';
          
          // Get termination to find employee
          if (checklist.terminationId) {
            const termination = await this.terminationModel
              .findById(checklist.terminationId)
              .lean()
              .exec();
            
            if (termination) {
              terminationDate = (termination as any).terminationDate;
              terminationType = (termination as any).initiator === 'employee' ? 'Resignation' : 'Termination';
              
              if ((termination as any).employeeId) {
                const employee = await this.employeeModel
                  .findById((termination as any).employeeId)
                  .lean()
                  .exec();
                
                if (employee) {
                  employeeInfo = {
                    _id: (employee as any)._id,
                    fullName: `${(employee as any).firstName || ''} ${(employee as any).lastName || ''}`.trim() || 'Unknown',
                    employeeNumber: (employee as any).employeeNumber || 'N/A',
                    workEmail: (employee as any).workEmail || 'N/A',
                    department: (employee as any).departmentId || 'N/A',
                  };
                }
              }
            }
          }
          
          return {
            ...checklist,
            employee: employeeInfo,
            terminationDate,
            terminationType,
          };
        }),
      );
      
      console.log(`✅ [OFF-010] Returning ${enrichedChecklists.length} clearance checklists for department roles`);
      return enrichedChecklists;
    } catch (error) {
      console.error('❌ Error fetching all clearance checklists:', error);
      throw new BadRequestException('Failed to fetch clearance checklists');
    }
  }

  // 7) UPDATE CLEARANCE ITEM STATUS
  async updateClearanceItemStatus(
    checklistId: string,
    dto: UpdateClearanceItemStatusDto,
    user: any,
  ) {
    // Authorization and department-specific rules
    // changed - user.role to user.roles (array)
    if (!user || !user.roles || user.roles.length === 0) {
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
    // changed - user.role to user.roles (array)
    const roles = user.roles || [];

    // changed - use roles.some() to check array of roles
    // OFF-010: Each department can ONLY update their OWN clearance items
    // HR Manager can only update HR items (not IT, FINANCE, etc.)
    const hasPermission = (() => {
      switch (dept) {
        case 'LINE_MANAGER':
          // Only Department Head or the assigned manager can update
          if (
            departmentItem.assignedTo &&
            user.id &&
            departmentItem.assignedTo.toString() === user.id.toString()
          )
            return true;
          return roles.includes(SystemRole.DEPARTMENT_HEAD);
        case 'IT':
          // Only System Admin can update IT clearance
          return roles.includes(SystemRole.SYSTEM_ADMIN);
        case 'FINANCE':
          // Only Finance staff can update FINANCE clearance
          return (
            roles.includes(SystemRole.FINANCE_STAFF) ||
            roles.includes(SystemRole.PAYROLL_MANAGER) ||
            roles.includes(SystemRole.PAYROLL_SPECIALIST)
          );
        case 'HR_EMPLOYEE':
          // HR Admin or HR Employee can update HR_EMPLOYEE clearance items
          // CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
          return (
            roles.includes(SystemRole.HR_ADMIN) ||
            roles.includes(SystemRole.HR_EMPLOYEE)
          );
        case 'HR':
          // ONLY HR Manager can update HR clearance (final sign-off)
          return roles.includes(SystemRole.HR_MANAGER);
        default:
          // System Admin as fallback for unknown departments
          return roles.includes(SystemRole.SYSTEM_ADMIN);
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
    // changed - use roles.includes() instead of role ===
    if (
      dept === 'HR' &&
      dto.status === ApprovalStatus.APPROVED &&
      !roles.includes(SystemRole.HR_MANAGER)
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

        // HR_EMPLOYEE approval → mark equipment items as returned and annotate onboarding
        // CHANGED: FACILITIES merged into HR_EMPLOYEE
        if (
          dept === 'HR_EMPLOYEE' &&
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

    // ============= OFF-010: SEND CLEARANCE UPDATE NOTIFICATIONS =============
    try {
      // Get employee details
      const termination = await this.terminationModel.findById(updatedChecklist.terminationId);
      const employee = termination 
        ? await this.employeeModel.findById(termination.employeeId) 
        : null;
      const employeeName = employee 
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber
        : 'Employee';
      const updaterName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.employeeNumber || 'User';

      // Notify HR Managers about the clearance update
      const hrManagers = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrManagerIds = hrManagers
        .map((hr: any) => hr.employeeProfileId?.toString())
        .filter((id: string) => id && id !== user.id);

      if (hrManagerIds.length > 0) {
        await this.notificationsService.notifyClearanceItemUpdated(
          hrManagerIds,
          {
            employeeName: employeeName,
            department: dto.department,
            newStatus: dto.status,
            updatedBy: updaterName,
            comments: dto.comments,
          },
        );
        console.log(`[OFF-010] Clearance update notification sent to ${hrManagerIds.length} HR Manager(s)`);
      }
    } catch (notifyError) {
      console.warn('[OFF-010] Failed to send clearance update notification:', this.getErrorMessage(notifyError));
    }
    // ============= END CLEARANCE UPDATE NOTIFICATIONS =============

    if (allApproved) {
      updatedChecklist.cardReturned = true;
      await updatedChecklist.save();

      await this.terminationModel.findByIdAndUpdate(
        updatedChecklist.terminationId,
        {
          status: TerminationStatus.APPROVED,
        },
      );

      // ============= OFF-010: NOTIFY ALL CLEARANCES APPROVED =============
      try {
        const termination = await this.terminationModel.findById(updatedChecklist.terminationId);
        const employee = termination 
          ? await this.employeeModel.findById(termination.employeeId) 
          : null;
        const employeeName = employee 
          ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber
          : 'Employee';

        // Get HR Managers
        const hrManagers = await this.employeeSystemRoleModel
          .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
          .select('employeeProfileId')
          .lean()
          .exec();
        const hrManagerIds = hrManagers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

        // Notify employee and HR Managers
        const allRecipients = employee 
          ? [employee._id.toString(), ...hrManagerIds] 
          : hrManagerIds;

        if (allRecipients.length > 0) {
          await this.notificationsService.notifyAllClearancesApproved(
            allRecipients,
            {
              employeeId: employee?._id.toString() || '',
              employeeName: employeeName,
              completionDate: new Date().toISOString(),
            },
          );
          console.log(`[OFF-010] All clearances approved notification sent to ${allRecipients.length} recipient(s)`);
        }
      } catch (notifyError) {
        console.warn('[OFF-010] Failed to send all clearances approved notification:', this.getErrorMessage(notifyError));
      }
      // ============= END ALL CLEARANCES APPROVED NOTIFICATION =============

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
    // changed - user.role to user.roles.includes()
    if (!user || !user.roles?.includes(SystemRole.HR_MANAGER)) {
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
    // OFF-013: Review and settle unused annual leave balance (encashment)
    try {
      // Get all leave balances for the employee
      const leaveBalances = await this.leavesService.getEmployeeLeaveBalance(
        employee._id.toString(),
      );

      if (leaveBalances && Array.isArray(leaveBalances) && leaveBalances.length > 0) {
        // Calculate total unused leave days (remaining balance)
        // Focus on annual leave types for encashment
        let totalUnusedDays = 0;
        const leaveDetails: any[] = [];

        for (const balance of leaveBalances) {
          // remaining is the unused leave balance
          const unusedDays = balance.remaining || 0;
          if (unusedDays > 0) {
            totalUnusedDays += unusedDays;
            leaveDetails.push({
              leaveTypeId: balance.leaveTypeId,
              leaveTypeName: balance.leaveTypeName,
              unusedDays: unusedDays,
              yearlyEntitlement: balance.yearlyEntitlement,
              taken: balance.taken,
              carryForward: balance.carryForward,
            });
          }
        }

        if (totalUnusedDays > 0) {
          // Calculate daily rate from employee's gross salary
          // Assuming 30 days per month for calculation
          const grossSalary = (employee as any).grossSalary || 0;
          const dailyRate = grossSalary > 0 ? grossSalary / 30 : 0;
          const encashmentAmount = totalUnusedDays * dailyRate;

          settlementData.components.leaveEncashment = {
            totalUnusedDays: totalUnusedDays,
            encashmentAmount: encashmentAmount,
            dailyRate: dailyRate,
            leaveDetails: leaveDetails,
            calculatedAt: new Date().toISOString(),
          };
        } else {
          settlementData.components.leaveEncashment = {
            totalUnusedDays: 0,
            encashmentAmount: 0,
            leaveDetails: [],
            calculatedAt: new Date().toISOString(),
            note: 'No unused leave balance to encash',
          };
        }
      } else {
        settlementData.components.leaveEncashment = {
          totalUnusedDays: 0,
          encashmentAmount: 0,
          leaveDetails: [],
          calculatedAt: new Date().toISOString(),
          note: 'No leave entitlements found for employee',
        };
      }
    } catch (err) {
      console.warn(
        'triggerFinalSettlement: Failed to calculate leave balance:',
        this.getErrorMessage(err) || err,
      );
      settlementData.errors.push({
        step: 'leaveBalance',
        error: this.getErrorMessage(err) || String(err),
      });
      settlementData.components.leaveEncashment = {
        error: this.getErrorMessage(err) || String(err),
        calculatedAt: new Date().toISOString(),
      };
    }
    // ============================================================================

    // ============================================================================
    // STEP 2: BENEFITS TERMINATION (PAYROLL EXECUTION SERVICE INTEGRATION)
    // ============================================================================
    // OFF-013: Trigger benefits termination - links employee to benefit in payroll execution module
    // This creates EmployeeTerminationResignation records which link the employee to termination benefits
    try {
      // Process termination/resignation benefits - this automatically creates
      // EmployeeTerminationResignation records for all approved termination benefit configurations
      // The method processes all approved terminations, so we use a system user ID
      // Note: This method creates the link between employee and benefit (fills the collection)
      const systemUserId = 'SYSTEM'; // Use system identifier for automated processes
      const processedBenefits =
        await this.payrollExecutionService.processTerminationResignationBenefits(
          systemUserId,
        );

      // Filter benefits for this specific employee and termination
      const employeeBenefits = processedBenefits.filter(
        (benefit: any) =>
          benefit.employeeId?.toString() === employeeId &&
          benefit.terminationId?.toString() === terminationId,
      );

      if (employeeBenefits.length > 0) {
        settlementData.components.benefitsTermination = {
          benefitsCreated: employeeBenefits.length,
          benefitRecords: employeeBenefits.map((b: any) => ({
            benefitId: b.benefitId?.toString(),
            givenAmount: b.givenAmount,
            status: b.status,
            recordId: b._id?.toString(),
          })),
          processedAt: new Date().toISOString(),
          note: 'Termination benefits created and linked to employee. Benefits will be auto-terminated as of end of notice period.',
        };
      } else {
        // Check if benefits were already created previously by accessing the model via db
        try {
          const EmployeeTerminationResignationModel = this.terminationModel.db.model(
            'EmployeeTerminationResignation',
          );
          const existingBenefitsCheck = await EmployeeTerminationResignationModel.find({
            employeeId: new Types.ObjectId(employeeId),
            terminationId: new Types.ObjectId(terminationId),
          })
            .populate('benefitId', 'name amount')
            .exec();

          if (existingBenefitsCheck && existingBenefitsCheck.length > 0) {
            settlementData.components.benefitsTermination = {
              benefitsCreated: existingBenefitsCheck.length,
              benefitRecords: existingBenefitsCheck.map((b: any) => ({
                benefitId: b.benefitId?._id?.toString() || b.benefitId?.toString(),
                benefitName: (b.benefitId as any)?.name,
                givenAmount: b.givenAmount,
                status: b.status,
                recordId: b._id?.toString(),
              })),
              processedAt: new Date().toISOString(),
              note: 'Termination benefits already exist for this employee and termination.',
            };
          } else {
            settlementData.components.benefitsTermination = {
              benefitsCreated: 0,
              benefitRecords: [],
              processedAt: new Date().toISOString(),
              note: 'No termination benefits configured or available for this employee.',
            };
          }
        } catch (modelErr) {
          // If model access fails, assume no benefits exist
          settlementData.components.benefitsTermination = {
            benefitsCreated: 0,
            benefitRecords: [],
            processedAt: new Date().toISOString(),
            note: 'Could not check for existing benefits. Benefits may need to be processed manually.',
            warning: this.getErrorMessage(modelErr) || String(modelErr),
          };
        }
      }
    } catch (err) {
      console.warn(
        'triggerFinalSettlement: Failed to process termination benefits:',
        this.getErrorMessage(err) || err,
      );
      settlementData.errors.push({
        step: 'benefitsTermination',
        error: this.getErrorMessage(err) || String(err),
      });
      settlementData.components.benefitsTermination = {
        error: this.getErrorMessage(err) || String(err),
        processedAt: new Date().toISOString(),
      };
    }
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

    // CHANGED - OFF-013: Send notification to HR about final settlement initiation
    try {
      const hrManagers = await this.employeeSystemRoleModel.find({
        roles: { $in: [SystemRole.HR_MANAGER] },
        isActive: true
      }).exec();

      for (const hr of hrManagers) {
        const hrEmployee = await this.employeeModel.findById(hr.employeeProfileId).exec();
        if (hrEmployee && (hrEmployee.workEmail || hrEmployee.personalEmail)) {
          await this.sendNotification('final_settlement', hrEmployee.workEmail || hrEmployee.personalEmail, {
            employeeName: employee.fullName || employee.employeeNumber || 'Employee',
            employeeNumber: employee.employeeNumber,
            terminationDate: termination.terminationDate?.toISOString(),
            settlementStatus: settlementData.status,
            leaveEncashment: settlementData.components?.leaveEncashment?.encashmentAmount || 'Pending',
            benefitsTermination: settlementData.components?.benefitsTermination?.benefitsCreated ? 
              `${settlementData.components.benefitsTermination.benefitsCreated} benefits processed` : 'Pending',
            finalPay: 'Pending calculation',
            errors: settlementData.errors,
          }, { nonBlocking: true });
        }
      }
    } catch (err) {
      console.warn('triggerFinalSettlement: Failed to send notifications:', this.getErrorMessage(err) || err);
    }

    // ============= OFF-013: SEND IN-APP NOTIFICATIONS =============
    try {
      const employeeName = employee.fullName || 
        `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
        employee.employeeNumber;
      
      // Get payroll team IDs
      const payrollTeam = await this.employeeSystemRoleModel
        .find({ 
          roles: { $in: [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER] }, 
          isActive: true 
        })
        .select('employeeProfileId')
        .lean()
        .exec();
      const payrollIds = payrollTeam.map((p: any) => p.employeeProfileId?.toString()).filter(Boolean);

      // Get HR Manager IDs
      const hrManagerRoles = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrManagerIds = hrManagerRoles.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);

      // Combine recipients: Payroll + HR + Employee
      const allRecipients = [
        ...new Set([employee._id.toString(), ...payrollIds, ...hrManagerIds]),
      ];

      if (allRecipients.length > 0) {
        await this.notificationsService.notifyFinalSettlementTriggered(
          allRecipients,
          {
            employeeId: employee._id.toString(),
            employeeName: employeeName,
            leaveBalance: settlementData.components?.leaveEncashment?.totalUnusedDays,
            leaveEncashment: settlementData.components?.leaveEncashment?.encashmentAmount,
            deductions: 0, // Placeholder
            estimatedFinalAmount: settlementData.components?.leaveEncashment?.encashmentAmount || 0,
          },
        );
        console.log(`[OFF-013] Final settlement in-app notification sent to ${allRecipients.length} recipient(s)`);
      }
    } catch (notifyError) {
      console.warn('[OFF-013] Failed to send final settlement in-app notification:', this.getErrorMessage(notifyError));
    }
    // ============= END OFF-013 NOTIFICATIONS =============

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
          const employeeName = employee
            ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber || 'Employee'
            : 'Employee';
          const terminationDate = termination?.terminationDate?.toISOString() || new Date().toISOString();

          for (const r of recipients) {
            try {
              // Send EMAIL notification
              await this.sendNotification(
                'clearance_reminder',
                r.email,
                {
                  recipientName: r.name,
                  employeeName: employeeName,
                  checklistId: checklist._id?.toString(),
                  department: dept,
                  itemName: dept,
                  note: `Pending since ${item.updatedAt ? new Date(item.updatedAt).toISOString() : 'unknown'}`,
                },
                { nonBlocking: true },
              );
            } catch (err) {
              console.warn(
                `Failed to send clearance reminder email to ${r.email}:`,
                this.getErrorMessage(err) || err,
              );
            }
          }

          // Also send IN-APP notifications to the responsible department
          try {
            const recipientIds = await this._getRecipientIdsForClearanceDept(dept);
            if (recipientIds.length > 0) {
              await this.notificationsService.notifyClearanceSignOffNeeded(
                recipientIds,
                {
                  employeeId: employee?._id?.toString() || '',
                  employeeName: employeeName,
                  department: dept,
                  terminationDate: terminationDate,
                  checklistId: checklist._id?.toString(),
                },
              );
              console.log(`✅ [OFF-010] Clearance reminder in-app notification sent to ${dept} (${recipientIds.length} recipients)`);
            }
          } catch (notifyErr) {
            console.warn(`Failed to send in-app clearance reminder for ${dept}:`, this.getErrorMessage(notifyErr));
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
    // CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
    const roleMap: Record<string, SystemRole[]> = {
      LINE_MANAGER: [SystemRole.DEPARTMENT_HEAD],
      HR: [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN],
      IT: [SystemRole.SYSTEM_ADMIN],
      FINANCE: [
        SystemRole.FINANCE_STAFF,
        SystemRole.PAYROLL_MANAGER,
        SystemRole.PAYROLL_SPECIALIST,
      ],
      HR_EMPLOYEE: [SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN],
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

  // Helper: Get employee profile IDs for a clearance department (for in-app notifications)
  private async _getRecipientIdsForClearanceDept(department: string): Promise<string[]> {
    const dept = department.toUpperCase();
    let roles: SystemRole[] = [];

    switch (dept) {
      case 'LINE_MANAGER':
        roles = [SystemRole.DEPARTMENT_HEAD];
        break;
      case 'IT':
        roles = [SystemRole.SYSTEM_ADMIN];
        break;
      case 'FINANCE':
        roles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST];
        break;
      case 'HR_EMPLOYEE':
        // CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
        roles = [SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN];
        break;
      case 'HR':
        roles = [SystemRole.HR_MANAGER];
        break;
      default:
        roles = [SystemRole.HR_MANAGER];
    }

    try {
      const roleRecords = await this.employeeSystemRoleModel
        .find({ roles: { $in: roles }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      
      return roleRecords
        .map((r: any) => r.employeeProfileId?.toString())
        .filter(Boolean);
    } catch (err) {
      console.warn(`Failed to get recipient IDs for ${dept}:`, this.getErrorMessage(err));
      return [];
    }
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
    // changed - user.role to user.roles.includes()
    if (!user || !user.roles?.includes(SystemRole.SYSTEM_ADMIN)) {
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

    // ============= OFF-007: SEND IN-APP NOTIFICATIONS =============
    try {
      const employeeName = employee.fullName || 
        `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
        employee.employeeNumber;
      const revokerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
        user.employeeNumber || 'System Admin';
      const revokedSystems = actions
        .filter((a) => a.success)
        .map((a) => a.service)
        .filter(Boolean);

      // Collect recipient IDs: HR Managers + IT Admins + Employee
      const hrManagers = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.HR_MANAGER] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const hrManagerIds = hrManagers.map((hr: any) => hr.employeeProfileId?.toString()).filter(Boolean);
      
      const systemAdmins = await this.employeeSystemRoleModel
        .find({ roles: { $in: [SystemRole.SYSTEM_ADMIN] }, isActive: true })
        .select('employeeProfileId')
        .lean()
        .exec();
      const adminIds = systemAdmins.map((a: any) => a.employeeProfileId?.toString()).filter(Boolean);
      
      const allRecipients = [
        ...new Set([employee._id.toString(), ...hrManagerIds, ...adminIds]),
      ];

      if (allRecipients.length > 0) {
        await this.notificationsService.notifyAccessRevoked(
          allRecipients,
          {
            employeeId: employee._id.toString(),
            employeeName: employeeName,
            revokedSystems: revokedSystems.length > 0 ? revokedSystems : ['Email', 'SSO', 'Internal Apps'],
            effectiveDate: new Date().toISOString(),
            revokedBy: revokerName,
          },
        );
        console.log(`[OFF-007] Access revoked in-app notification sent to ${allRecipients.length} recipient(s)`);
      }
    } catch (notifyError) {
      console.warn('[OFF-007] Failed to send access revoked in-app notification:', this.getErrorMessage(notifyError));
    }
    // ============= END OFF-007 NOTIFICATIONS =============

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

  // ============================================================================
  // RECRUITMENT REPORTS
  // ============================================================================
  // These methods generate comprehensive analytics for recruitment performance
  // without requiring any schema changes - all calculations use existing data
  // ============================================================================

  /**
   * Get comprehensive recruitment reports
   * Combines all report types into a single response
   */
  async getRecruitmentReports(): Promise<any> {
    const [timeToHire, sourceEffectiveness, pipelineConversion, interviewAnalytics] = 
      await Promise.all([
        this.getTimeToHireReport(),
        this.getSourceEffectivenessReport(),
        this.getPipelineConversionReport(),
        this.getInterviewAnalyticsReport(),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      timeToHire,
      sourceEffectiveness,
      pipelineConversion,
      interviewAnalytics,
    };
  }

  /**
   * Time-to-Hire Report
   * Calculates average time from application submission to hiring
   * Breakdown by position and overall
   */
  async getTimeToHireReport(): Promise<any> {
    try {
      // Get all hired applications with timestamps
      const hiredApplications = await this.applicationModel
        .find({ status: ApplicationStatus.HIRED })
        .populate({
          path: 'requisitionId',
          populate: { path: 'templateId' }
        })
        .lean();

      if (hiredApplications.length === 0) {
        return {
          overall: { averageDays: 0, totalHires: 0 },
          byPosition: [],
          byMonth: [],
        };
      }

      // Calculate time-to-hire for each application
      const hireData = hiredApplications.map((app: any) => {
        const createdAt = new Date(app.createdAt);
        const updatedAt = new Date(app.updatedAt);
        const daysToHire = Math.ceil((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          applicationId: app._id,
          daysToHire: Math.max(0, daysToHire), // Ensure non-negative
          position: app.requisitionId?.templateId?.title || 'Unknown',
          department: app.requisitionId?.templateId?.department || 'Unknown',
          hiredMonth: updatedAt.toISOString().slice(0, 7), // YYYY-MM format
        };
      });

      // Overall average
      const totalDays = hireData.reduce((sum, h) => sum + h.daysToHire, 0);
      const averageDays = Math.round(totalDays / hireData.length);

      // Group by position
      const byPosition: Record<string, { total: number; count: number; position: string }> = {};
      hireData.forEach(h => {
        if (!byPosition[h.position]) {
          byPosition[h.position] = { total: 0, count: 0, position: h.position };
        }
        byPosition[h.position].total += h.daysToHire;
        byPosition[h.position].count++;
      });

      const positionReport = Object.values(byPosition).map(p => ({
        position: p.position,
        averageDays: Math.round(p.total / p.count),
        totalHires: p.count,
      })).sort((a, b) => a.averageDays - b.averageDays);

      // Group by month
      const byMonth: Record<string, { total: number; count: number }> = {};
      hireData.forEach(h => {
        if (!byMonth[h.hiredMonth]) {
          byMonth[h.hiredMonth] = { total: 0, count: 0 };
        }
        byMonth[h.hiredMonth].total += h.daysToHire;
        byMonth[h.hiredMonth].count++;
      });

      const monthReport = Object.entries(byMonth)
        .map(([month, data]) => ({
          month,
          averageDays: Math.round(data.total / data.count),
          totalHires: data.count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        overall: {
          averageDays,
          totalHires: hireData.length,
          fastestHire: Math.min(...hireData.map(h => h.daysToHire)),
          slowestHire: Math.max(...hireData.map(h => h.daysToHire)),
        },
        byPosition: positionReport,
        byMonth: monthReport,
      };
    } catch (error) {
      console.error('Error generating time-to-hire report:', error);
      return { overall: { averageDays: 0, totalHires: 0 }, byPosition: [], byMonth: [] };
    }
  }

  /**
   * Source Effectiveness Report
   * Compares referral vs direct application success rates
   */
  async getSourceEffectivenessReport(): Promise<any> {
    try {
      // Get all applications
      const allApplications = await this.applicationModel.find().lean();
      
      // Get all referrals
      const referrals = await this.referralModel.find().lean();
      const referralCandidateIds = new Set(
        referrals.map((ref: any) => ref.candidateId.toString()),
      );

      // Categorize applications by source
      let referralApps = 0;
      let referralHired = 0;
      let referralInProcess = 0;
      let referralRejected = 0;

      let directApps = 0;
      let directHired = 0;
      let directInProcess = 0;
      let directRejected = 0;

      allApplications.forEach((app: any) => {
        const candidateId = app.candidateId?.toString();
        const isReferral = candidateId && referralCandidateIds.has(candidateId);

        if (isReferral) {
          referralApps++;
          if (app.status === ApplicationStatus.HIRED) referralHired++;
          else if (app.status === ApplicationStatus.IN_PROCESS || app.status === ApplicationStatus.OFFER) referralInProcess++;
          else if (app.status === ApplicationStatus.REJECTED) referralRejected++;
        } else {
          directApps++;
          if (app.status === ApplicationStatus.HIRED) directHired++;
          else if (app.status === ApplicationStatus.IN_PROCESS || app.status === ApplicationStatus.OFFER) directInProcess++;
          else if (app.status === ApplicationStatus.REJECTED) directRejected++;
        }
      });

      // Calculate rates
      const referralHireRate = referralApps > 0 ? Math.round((referralHired / referralApps) * 100) : 0;
      const directHireRate = directApps > 0 ? Math.round((directHired / directApps) * 100) : 0;

      // Get referral details by referring employee
      const referralsByEmployee: Record<string, { count: number; hired: number }> = {};
      for (const ref of referrals) {
        const empId = (ref as any).referringEmployeeId?.toString() || 'unknown';
        if (!referralsByEmployee[empId]) {
          referralsByEmployee[empId] = { count: 0, hired: 0 };
        }
        referralsByEmployee[empId].count++;
        
        // Check if this referral was hired
        const candidateId = (ref as any).candidateId?.toString();
        const app = allApplications.find((a: any) => 
          a.candidateId?.toString() === candidateId && a.status === ApplicationStatus.HIRED
        );
        if (app) {
          referralsByEmployee[empId].hired++;
        }
      }

      return {
        summary: {
          totalApplications: allApplications.length,
          referralApplications: referralApps,
          directApplications: directApps,
          referralPercentage: allApplications.length > 0 
            ? Math.round((referralApps / allApplications.length) * 100) 
            : 0,
        },
        referral: {
          total: referralApps,
          hired: referralHired,
          inProcess: referralInProcess,
          rejected: referralRejected,
          hireRate: referralHireRate,
        },
        direct: {
          total: directApps,
          hired: directHired,
          inProcess: directInProcess,
          rejected: directRejected,
          hireRate: directHireRate,
        },
        comparison: {
          referralAdvantage: referralHireRate - directHireRate,
          recommendation: referralHireRate > directHireRate 
            ? 'Referrals show higher hire rate - consider increasing referral program incentives'
            : 'Direct applications show comparable or better results',
        },
        topReferrers: Object.entries(referralsByEmployee)
          .map(([id, data]) => ({ employeeId: id, referrals: data.count, hires: data.hired }))
          .sort((a, b) => b.hires - a.hires)
          .slice(0, 10),
      };
    } catch (error) {
      console.error('Error generating source effectiveness report:', error);
      return { summary: {}, referral: {}, direct: {}, comparison: {}, topReferrers: [] };
    }
  }

  /**
   * Pipeline Conversion Report
   * Calculates conversion rates through each stage of the hiring process
   */
  async getPipelineConversionReport(): Promise<any> {
    try {
      // Get all applications grouped by status
      const applications = await this.applicationModel.find().lean();
      
      const statusCounts = {
        submitted: 0,
        in_process: 0,
        offer: 0,
        hired: 0,
        rejected: 0,
      };

      applications.forEach((app: any) => {
        const status = app.status?.toLowerCase() || 'submitted';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });

      const total = applications.length;
      
      // Calculate conversion rates
      // Total entering pipeline
      const enteredPipeline = total;
      // Moved past initial screening (in_process, offer, hired)
      const passedScreening = statusCounts.in_process + statusCounts.offer + statusCounts.hired;
      // Received offer (offer + hired)
      const receivedOffer = statusCounts.offer + statusCounts.hired;
      // Final hires
      const finalHires = statusCounts.hired;

      return {
        funnel: [
          { stage: 'Applied', count: enteredPipeline, percentage: 100 },
          { 
            stage: 'Screening Passed', 
            count: passedScreening, 
            percentage: enteredPipeline > 0 ? Math.round((passedScreening / enteredPipeline) * 100) : 0 
          },
          { 
            stage: 'Offer Extended', 
            count: receivedOffer, 
            percentage: enteredPipeline > 0 ? Math.round((receivedOffer / enteredPipeline) * 100) : 0 
          },
          { 
            stage: 'Hired', 
            count: finalHires, 
            percentage: enteredPipeline > 0 ? Math.round((finalHires / enteredPipeline) * 100) : 0 
          },
        ],
        conversionRates: {
          applicationToScreening: passedScreening > 0 && enteredPipeline > 0 
            ? Math.round((passedScreening / enteredPipeline) * 100) 
            : 0,
          screeningToOffer: receivedOffer > 0 && passedScreening > 0 
            ? Math.round((receivedOffer / passedScreening) * 100) 
            : 0,
          offerToHire: finalHires > 0 && receivedOffer > 0 
            ? Math.round((finalHires / receivedOffer) * 100) 
            : 0,
          overallConversion: finalHires > 0 && enteredPipeline > 0 
            ? Math.round((finalHires / enteredPipeline) * 100) 
            : 0,
        },
        statusBreakdown: {
          submitted: statusCounts.submitted,
          inProcess: statusCounts.in_process,
          offer: statusCounts.offer,
          hired: statusCounts.hired,
          rejected: statusCounts.rejected,
        },
        dropOffAnalysis: {
          atScreening: statusCounts.rejected,
          atInterview: statusCounts.in_process, // Still in process = hasn't converted yet
          atOffer: statusCounts.offer, // Offer made but not hired yet
          rejectedPercentage: total > 0 ? Math.round((statusCounts.rejected / total) * 100) : 0,
        },
      };
    } catch (error) {
      console.error('Error generating pipeline conversion report:', error);
      return { funnel: [], conversionRates: {}, statusBreakdown: {}, dropOffAnalysis: {} };
    }
  }

  /**
   * Interview Analytics Report
   * Provides insights on interview performance and scoring
   */
  async getInterviewAnalyticsReport(): Promise<any> {
    try {
      // Get all interviews
      const interviews = await this.interviewModel.find().lean();
      
      // Get all assessment results
      const assessments = await this.assessmentResultModel.find().lean();

      // Interview statistics
      const totalInterviews = interviews.length;
      const completedInterviews = interviews.filter((i: any) => i.status === 'completed').length;
      const scheduledInterviews = interviews.filter((i: any) => i.status === 'scheduled').length;
      const cancelledInterviews = interviews.filter((i: any) => i.status === 'cancelled').length;

      // Score statistics
      const scores = assessments.map((a: any) => a.score || 0).filter(s => s > 0);
      const averageScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;
      const highScores = scores.filter(s => s >= 70).length;
      const mediumScores = scores.filter(s => s >= 50 && s < 70).length;
      const lowScores = scores.filter(s => s < 50).length;

      // Interview method breakdown
      const methodCounts: Record<string, number> = {};
      interviews.forEach((i: any) => {
        const method = i.method || 'unknown';
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      // Panel member participation
      const panelParticipation: Record<string, number> = {};
      interviews.forEach((i: any) => {
        (i.panel || []).forEach((panelId: any) => {
          const id = panelId?.toString() || 'unknown';
          panelParticipation[id] = (panelParticipation[id] || 0) + 1;
        });
      });

      // Feedback submission rate
      const interviewsWithFeedback = new Set<string>();
      assessments.forEach((a: any) => {
        interviewsWithFeedback.add(a.interviewId?.toString());
      });

      return {
        summary: {
          totalInterviews,
          completedInterviews,
          scheduledInterviews,
          cancelledInterviews,
          completionRate: totalInterviews > 0 
            ? Math.round((completedInterviews / totalInterviews) * 100) 
            : 0,
        },
        scoring: {
          totalAssessments: assessments.length,
          averageScore,
          highScores: { count: highScores, percentage: scores.length > 0 ? Math.round((highScores / scores.length) * 100) : 0 },
          mediumScores: { count: mediumScores, percentage: scores.length > 0 ? Math.round((mediumScores / scores.length) * 100) : 0 },
          lowScores: { count: lowScores, percentage: scores.length > 0 ? Math.round((lowScores / scores.length) * 100) : 0 },
          highestScore: scores.length > 0 ? Math.max(...scores) : 0,
          lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
        },
        byMethod: Object.entries(methodCounts).map(([method, count]) => ({
          method: method.replace('_', ' ').toUpperCase(),
          count,
          percentage: totalInterviews > 0 ? Math.round((count / totalInterviews) * 100) : 0,
        })),
        feedbackAnalysis: {
          interviewsWithFeedback: interviewsWithFeedback.size,
          interviewsWithoutFeedback: totalInterviews - interviewsWithFeedback.size,
          feedbackRate: totalInterviews > 0 
            ? Math.round((interviewsWithFeedback.size / totalInterviews) * 100) 
            : 0,
        },
        topInterviewers: Object.entries(panelParticipation)
          .map(([id, count]) => ({ interviewerId: id, interviewCount: count }))
          .sort((a, b) => b.interviewCount - a.interviewCount)
          .slice(0, 10),
      };
    } catch (error) {
      console.error('Error generating interview analytics report:', error);
      return { summary: {}, scoring: {}, byMethod: [], feedbackAnalysis: {}, topInterviewers: [] };
    }
  }
}
