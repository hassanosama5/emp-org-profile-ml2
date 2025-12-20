import { Model, Types } from 'mongoose';
import { JobRequisition } from './models/job-requisition.schema';
import { Application } from './models/application.schema';
import { Interview } from './models/interview.schema';
import { Offer } from './models/offer.schema';
import { CreateJobRequisitionDto } from './dto/job-requisition.dto';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import { ScheduleInterviewDto, UpdateInterviewStatusDto } from './dto/interview.dto';
import { CreateOfferDto, RespondToOfferDto, FinalizeOfferDto } from './dto/offer.dto';
import { OnboardingDocument } from './models/onboarding.schema';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateOnboardingTaskDto } from './dto/update-task.dto';
import { DocumentDocument } from './models/document.schema';
import { DocumentType } from './enums/document-type.enum';
import { Response } from 'express';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { OrganizationStructureService } from '../organization-structure/organization-structure.service';
import { ContractDocument } from './models/contract.schema';
import { CreateEmployeeFromContractDto } from './dto/create-employee-from-contract.dto';
import { EmployeeStatus } from '../employee-profile/enums/employee-profile.enums';
import { CandidateDocument } from '../employee-profile/models/candidate.schema';
import { ReferralDocument } from './models/referral.schema';
import { AssessmentResultDocument } from './models/assessment-result.schema';
import { ApplicationStatusHistoryDocument } from './models/application-history.schema';
import { TerminationRequest } from './models/termination-request.schema';
import { ClearanceChecklist } from './models/clearance-checklist.schema';
import { CreateTerminationRequestDto, UpdateTerminationStatusDto, UpdateTerminationDetailsDto } from './dto/termination-request.dto';
import { CreateClearanceChecklistDto, UpdateClearanceItemStatusDto } from './dto/clearance-checklist.dto';
import { EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRoleDocument } from '../employee-profile/models/employee-system-role.schema';
import { AppraisalRecord, AppraisalRecordDocument } from '../performance/models/appraisal-record.schema';
import { RevokeSystemAccessDto } from './dto/system-access.dto';
export declare class RecruitmentService {
    private jobModel;
    private applicationModel;
    private interviewModel;
    private offerModel;
    private jobTemplateModel;
    private readonly onboardingModel;
    private readonly documentModel;
    private readonly contractModel;
    private readonly candidateModel;
    private readonly referralModel;
    private readonly assessmentResultModel;
    private readonly applicationStatusHistoryModel;
    private readonly employeeProfileService;
    private readonly organizationStructureService;
    private terminationModel;
    private clearanceModel;
    private employeeModel;
    private appraisalRecordModel;
    private readonly employeeSystemRoleModel;
    constructor(jobModel: Model<JobRequisition>, applicationModel: Model<Application>, interviewModel: Model<Interview>, offerModel: Model<Offer>, jobTemplateModel: Model<any>, onboardingModel: Model<OnboardingDocument>, documentModel: Model<DocumentDocument>, contractModel: Model<ContractDocument>, candidateModel: Model<CandidateDocument>, referralModel: Model<ReferralDocument>, assessmentResultModel: Model<AssessmentResultDocument>, applicationStatusHistoryModel: Model<ApplicationStatusHistoryDocument>, employeeProfileService: EmployeeProfileService, organizationStructureService: OrganizationStructureService, terminationModel: Model<TerminationRequest>, clearanceModel: Model<ClearanceChecklist>, employeeModel: Model<EmployeeProfileDocument>, appraisalRecordModel: Model<AppraisalRecordDocument>, employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>);
    private getErrorMessage;
    calculateProgress(status: string): number;
    createJobRequisition(dto: CreateJobRequisitionDto): Promise<JobRequisition>;
    createJobTemplate(dto: any): Promise<any>;
    getAllJobTemplates(): Promise<any[]>;
    getJobTemplateById(id: string): Promise<any>;
    updateJobTemplate(id: string, dto: any): Promise<any>;
    publishJobRequisition(id: string): Promise<import("mongoose").Document<unknown, {}, JobRequisition, {}, {}> & JobRequisition & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    previewJobRequisition(id: string): Promise<import("mongoose").Document<unknown, {}, JobRequisition, {}, {}> & JobRequisition & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAllJobRequisitions(): Promise<(import("mongoose").Document<unknown, {}, JobRequisition, {}, {}> & JobRequisition & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getJobRequisitionById(id: string): Promise<import("mongoose").Document<unknown, {}, JobRequisition, {}, {}> & JobRequisition & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateJobRequisitionStatus(id: string, newStatus: string): Promise<import("mongoose").Document<unknown, {}, JobRequisition, {}, {}> & JobRequisition & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    apply(dto: CreateApplicationDto, consentGiven?: boolean): Promise<Application>;
    getAllApplications(requisitionId?: string, prioritizeReferrals?: boolean): Promise<any[]>;
    updateApplicationStatus(id: string, dto: UpdateApplicationStatusDto, changedBy?: string): Promise<import("mongoose").Document<unknown, {}, Application, {}, {}> & Application & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    scheduleInterview(dto: ScheduleInterviewDto): Promise<import("mongoose").Document<unknown, {}, Interview, {}, {}> & Interview & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateInterviewStatus(id: string, dto: UpdateInterviewStatusDto): Promise<import("mongoose").Document<unknown, {}, Interview, {}, {}> & Interview & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    createOffer(dto: CreateOfferDto): Promise<import("mongoose").Document<unknown, {}, Offer, {}, {}> & Offer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    respondToOffer(id: string, dto: RespondToOfferDto): Promise<import("mongoose").Document<unknown, {}, Offer, {}, {}> & Offer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    finalizeOffer(id: string, dto: FinalizeOfferDto): Promise<import("mongoose").Document<unknown, {}, Offer, {}, {}> & Offer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    sendNotification(notificationType: 'application_status' | 'interview_scheduled' | 'offer_letter' | 'onboarding_welcome' | 'onboarding_reminder' | 'panel_invitation' | 'clearance_reminder' | 'access_revoked', recipientEmail: string, context: any, options?: {
        nonBlocking?: boolean;
    }): Promise<void>;
    private sendEmailInternal;
    sendEmail(recipient: string, subject: string, text: string): Promise<void>;
    createOnboarding(createOnboardingDto: CreateOnboardingDto, contractSigningDate?: Date, startDate?: Date, workEmail?: string): Promise<any>;
    getAllOnboardings(): Promise<any[]>;
    getOnboardingByEmployeeId(employeeId: string): Promise<any>;
    getOnboardingById(id: string): Promise<any>;
    updateOnboarding(id: string, updateOnboardingDto: UpdateOnboardingDto): Promise<any>;
    updateOnboardingTask(onboardingId: string, taskIndex: number, updateTaskDto: UpdateOnboardingTaskDto): Promise<any>;
    addTaskToOnboarding(onboardingId: string, taskDto: any): Promise<any>;
    removeTaskFromOnboarding(onboardingId: string, taskIndex: number): Promise<any>;
    deleteOnboarding(id: string): Promise<void>;
    getOnboardingStats(): Promise<{
        total: number;
        completed: number;
        inProgress: number;
        completionRate: string;
    }>;
    uploadTaskDocument(onboardingId: string, taskIndex: number, file: any, documentType: DocumentType): Promise<any>;
    downloadDocument(documentId: string, res: Response): Promise<void>;
    getTaskDocument(onboardingId: string, taskIndex: number): Promise<any>;
    deleteDocument(documentId: string): Promise<void>;
    createEmployeeFromContract(offerId: string, dto: CreateEmployeeFromContractDto): Promise<any>;
    tagCandidateAsReferral(candidateId: string, referringEmployeeId: string, role?: string, level?: string): Promise<any>;
    getCandidateReferrals(candidateId: string): Promise<any[]>;
    recordCandidateConsent(candidateId: string, consentGiven: boolean, consentType?: string, notes?: string): Promise<any>;
    submitInterviewFeedback(interviewId: string, interviewerId: string, score: number, comments?: string): Promise<any>;
    getInterviewFeedback(interviewId: string): Promise<any[]>;
    getInterviewAverageScore(interviewId: string): Promise<number>;
    getRankedApplications(requisitionId: string): Promise<any[]>;
    sendOnboardingReminders(): Promise<void>;
    provisionSystemAccess(employeeId: string, taskIndex: number): Promise<any>;
    reserveEquipment(employeeId: string, equipmentType: string, equipmentDetails: any): Promise<any>;
    scheduleAccessProvisioning(employeeId: string, startDate: Date, endDate?: Date): Promise<any>;
    triggerPayrollInitiation(employeeId: string, contractSigningDate: Date, grossSalary: number): Promise<any>;
    processSigningBonus(employeeId: string, signingBonus: number, contractSigningDate: Date): Promise<any>;
    cancelOnboarding(employeeId: string, reason: string): Promise<any>;
    createTerminationRequest(dto: CreateTerminationRequestDto, user: any): Promise<import("mongoose").Document<unknown, {}, TerminationRequest, {}, {}> & TerminationRequest & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getTerminationRequestById(id: string): Promise<import("mongoose").Document<unknown, {}, TerminationRequest, {}, {}> & TerminationRequest & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    getMyResignationRequests(user: any): Promise<(import("mongoose").Document<unknown, {}, TerminationRequest, {}, {}> & TerminationRequest & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    updateTerminationStatus(id: string, dto: UpdateTerminationStatusDto, user: any): Promise<import("mongoose").Document<unknown, {}, TerminationRequest, {}, {}> & TerminationRequest & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateTerminationDetails(id: string, dto: UpdateTerminationDetailsDto, user: any): Promise<import("mongoose").Document<unknown, {}, TerminationRequest, {}, {}> & TerminationRequest & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    createClearanceChecklist(dto: CreateClearanceChecklistDto, user: any): Promise<import("mongoose").Document<unknown, {}, ClearanceChecklist, {}, {}> & ClearanceChecklist & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    private _findDepartmentManagerForEmployee;
    private _extractEquipmentFromOnboarding;
    private _internalRevokeSystemAccess;
    getChecklistByEmployee(employeeId: string): Promise<import("mongoose").Document<unknown, {}, ClearanceChecklist, {}, {}> & ClearanceChecklist & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateClearanceItemStatus(checklistId: string, dto: UpdateClearanceItemStatusDto, user: any): Promise<{
        message: string;
    }>;
    markChecklistCompleted(checklistId: string, user: any): Promise<import("mongoose").Document<unknown, {}, ClearanceChecklist, {}, {}> & ClearanceChecklist & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    triggerFinalSettlement(employeeId: string, terminationId: string): Promise<{
        message: string;
        settlementData: any;
    }>;
    sendClearanceReminders(options?: {
        force?: boolean;
    }): Promise<{
        message: string;
    }>;
    private _resolveRecipientsForClearanceDept;
    getLatestAppraisalForEmployee(employeeId: string): Promise<{
        employee: {
            id: Types.ObjectId;
            employeeNumber: string;
            status: EmployeeStatus;
            lastAppraisalDate: Date;
            lastAppraisalScore: number;
            lastAppraisalRatingLabel: string;
        };
        appraisal: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AppraisalRecord, {}, {}> & AppraisalRecord & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AppraisalRecord, {}, {}> & AppraisalRecord & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
    }>;
    revokeSystemAccess(dto: RevokeSystemAccessDto, user: any): Promise<{
        message: string;
        employeeId: Types.ObjectId;
        employeeNumber: string;
        previousStatus: EmployeeStatus;
        newStatus: EmployeeStatus;
        revocationLog: any;
        actions?: undefined;
    } | {
        message: string;
        employeeId: Types.ObjectId;
        employeeNumber: string;
        previousStatus: EmployeeStatus.ACTIVE | EmployeeStatus.ON_LEAVE | EmployeeStatus.SUSPENDED | EmployeeStatus.RETIRED | EmployeeStatus.PROBATION | EmployeeStatus.TERMINATED;
        newStatus: EmployeeStatus;
        actions: any[];
        revocationLog?: undefined;
    }>;
    private _appendRevocationAction;
    private _revokeIdentityProvider;
    private _deactivateMailbox;
    private _deprovisionApplications;
}
