import type { Response } from 'express';
import { DocumentType } from './enums/document-type.enum';
import { RecruitmentService } from './recruitment.service';
import { CreateJobRequisitionDto } from './dto/job-requisition.dto';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import { ScheduleInterviewDto, UpdateInterviewStatusDto } from './dto/interview.dto';
import { CreateOfferDto, RespondToOfferDto, FinalizeOfferDto } from './dto/offer.dto';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateOnboardingTaskDto } from './dto/update-task.dto';
import { CreateEmployeeFromContractDto } from './dto/create-employee-from-contract.dto';
import { CreateTerminationRequestDto, UpdateTerminationStatusDto, UpdateTerminationDetailsDto } from './dto/termination-request.dto';
import { CreateClearanceChecklistDto, UpdateClearanceItemStatusDto } from './dto/clearance-checklist.dto';
import { RevokeSystemAccessDto } from './dto/system-access.dto';
export declare class RecruitmentController {
    private readonly service;
    constructor(service: RecruitmentService);
    createJob(dto: CreateJobRequisitionDto): Promise<import("./models/job-requisition.schema").JobRequisition>;
    getJobs(): Promise<(import("mongoose").Document<unknown, {}, import("./models/job-requisition.schema").JobRequisition, {}, {}> & import("./models/job-requisition.schema").JobRequisition & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getJobById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/job-requisition.schema").JobRequisition, {}, {}> & import("./models/job-requisition.schema").JobRequisition & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateJobStatus(id: string, dto: {
        status: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./models/job-requisition.schema").JobRequisition, {}, {}> & import("./models/job-requisition.schema").JobRequisition & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    publishJob(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/job-requisition.schema").JobRequisition, {}, {}> & import("./models/job-requisition.schema").JobRequisition & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    previewJob(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/job-requisition.schema").JobRequisition, {}, {}> & import("./models/job-requisition.schema").JobRequisition & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createJobTemplate(dto: any): Promise<any>;
    getAllJobTemplates(): Promise<any[]>;
    getJobTemplateById(id: string): Promise<any>;
    updateJobTemplate(id: string, dto: any): Promise<any>;
    apply(dto: CreateApplicationDto & {
        consentGiven: boolean;
    }): Promise<import("./models/application.schema").Application>;
    getAllApplications(requisitionId?: string, prioritizeReferrals?: string): Promise<any[]>;
    getRankedApplications(requisitionId: string): Promise<any[]>;
    updateAppStatus(id: string, dto: UpdateApplicationStatusDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/application.schema").Application, {}, {}> & import("./models/application.schema").Application & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    scheduleInterview(dto: ScheduleInterviewDto): Promise<import("mongoose").Document<unknown, {}, import("./models/interview.schema").Interview, {}, {}> & import("./models/interview.schema").Interview & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateInterviewStatus(id: string, dto: UpdateInterviewStatusDto): Promise<import("mongoose").Document<unknown, {}, import("./models/interview.schema").Interview, {}, {}> & import("./models/interview.schema").Interview & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    submitInterviewFeedback(interviewId: string, dto: {
        score: number;
        comments?: string;
    }, req: any): Promise<any>;
    getInterviewFeedback(interviewId: string): Promise<any[]>;
    getInterviewAverageScore(interviewId: string): Promise<number>;
    createOffer(dto: CreateOfferDto): Promise<import("mongoose").Document<unknown, {}, import("./models/offer.schema").Offer, {}, {}> & import("./models/offer.schema").Offer & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    respond(id: string, dto: RespondToOfferDto): Promise<import("mongoose").Document<unknown, {}, import("./models/offer.schema").Offer, {}, {}> & import("./models/offer.schema").Offer & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    finalize(id: string, dto: FinalizeOfferDto): Promise<import("mongoose").Document<unknown, {}, import("./models/offer.schema").Offer, {}, {}> & import("./models/offer.schema").Offer & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createEmployeeFromContract(offerId: string, dto: CreateEmployeeFromContractDto): Promise<any>;
    createOnboarding(createOnboardingDto: CreateOnboardingDto): Promise<any>;
    getAllOnboardings(): Promise<any[]>;
    getOnboardingStats(): Promise<{
        total: number;
        completed: number;
        inProgress: number;
        completionRate: string;
    }>;
    getOnboardingById(id: string): Promise<any>;
    getOnboardingByEmployeeId(employeeId: string): Promise<any>;
    updateOnboarding(id: string, updateOnboardingDto: UpdateOnboardingDto): Promise<any>;
    updateOnboardingTask(id: string, taskIndex: string, updateTaskDto: UpdateOnboardingTaskDto): Promise<any>;
    addTaskToOnboarding(id: string, taskDto: any): Promise<any>;
    removeTaskFromOnboarding(id: string, taskIndex: string): Promise<any>;
    deleteOnboarding(id: string): Promise<void>;
    uploadTaskDocument(onboardingId: string, taskIndex: string, file: any, documentType: DocumentType): Promise<any>;
    downloadDocument(documentId: string, res: Response): Promise<void>;
    getTaskDocument(onboardingId: string, taskIndex: string): Promise<any>;
    deleteDocument(documentId: string): Promise<void>;
    sendOnboardingReminders(): Promise<{
        message: string;
    }>;
    provisionSystemAccess(employeeId: string, taskIndex: string): Promise<any>;
    reserveEquipment(employeeId: string, dto: {
        equipmentType: string;
        equipmentDetails: any;
    }): Promise<any>;
    scheduleAccessProvisioning(employeeId: string, dto: {
        startDate: string;
        endDate?: string;
    }): Promise<any>;
    triggerPayrollInitiation(employeeId: string, dto: {
        contractSigningDate: string;
        grossSalary: number;
    }): Promise<any>;
    processSigningBonus(employeeId: string, dto: {
        signingBonus: number;
        contractSigningDate: string;
    }): Promise<any>;
    cancelOnboarding(employeeId: string, dto: {
        reason: string;
    }): Promise<any>;
    tagCandidateAsReferral(candidateId: string, dto: {
        referringEmployeeId: string;
        role?: string;
        level?: string;
    }, req: any): Promise<any>;
    getCandidateReferrals(candidateId: string): Promise<any[]>;
    recordCandidateConsent(candidateId: string, dto: {
        consentGiven: boolean;
        consentType?: string;
        notes?: string;
    }): Promise<any>;
    createTerminationRequest(dto: CreateTerminationRequestDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/termination-request.schema").TerminationRequest, {}, {}> & import("./models/termination-request.schema").TerminationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getMyResignationRequests(req: any): Promise<(import("mongoose").Document<unknown, {}, import("./models/termination-request.schema").TerminationRequest, {}, {}> & import("./models/termination-request.schema").TerminationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getTerminationRequest(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/termination-request.schema").TerminationRequest, {}, {}> & import("./models/termination-request.schema").TerminationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateTerminationStatus(id: string, dto: UpdateTerminationStatusDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/termination-request.schema").TerminationRequest, {}, {}> & import("./models/termination-request.schema").TerminationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateTerminationDetails(id: string, dto: UpdateTerminationDetailsDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/termination-request.schema").TerminationRequest, {}, {}> & import("./models/termination-request.schema").TerminationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createClearanceChecklist(dto: CreateClearanceChecklistDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/clearance-checklist.schema").ClearanceChecklist, {}, {}> & import("./models/clearance-checklist.schema").ClearanceChecklist & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    sendClearanceReminders(opts?: {
        force?: boolean;
    }): Promise<{
        message: string;
    }>;
    getChecklistByEmployee(employeeId: string): Promise<import("mongoose").Document<unknown, {}, import("./models/clearance-checklist.schema").ClearanceChecklist, {}, {}> & import("./models/clearance-checklist.schema").ClearanceChecklist & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateClearanceItem(checklistId: string, dto: UpdateClearanceItemStatusDto, req: any): Promise<{
        message: string;
    }>;
    markChecklistCompleted(checklistId: string, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/clearance-checklist.schema").ClearanceChecklist, {}, {}> & import("./models/clearance-checklist.schema").ClearanceChecklist & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLatestAppraisal(employeeId: string): Promise<{
        employee: {
            id: import("mongoose").Types.ObjectId;
            employeeNumber: string;
            status: import("../employee-profile/enums/employee-profile.enums").EmployeeStatus;
            lastAppraisalDate: Date;
            lastAppraisalScore: number;
            lastAppraisalRatingLabel: string;
        };
        appraisal: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../performance/models/appraisal-record.schema").AppraisalRecord, {}, {}> & import("../performance/models/appraisal-record.schema").AppraisalRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("../performance/models/appraisal-record.schema").AppraisalRecord, {}, {}> & import("../performance/models/appraisal-record.schema").AppraisalRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    revokeAccess(dto: RevokeSystemAccessDto, req: any): Promise<{
        message: string;
        employeeId: import("mongoose").Types.ObjectId;
        employeeNumber: string;
        previousStatus: import("../employee-profile/enums/employee-profile.enums").EmployeeStatus;
        newStatus: import("../employee-profile/enums/employee-profile.enums").EmployeeStatus;
        revocationLog: any;
        actions?: undefined;
    } | {
        message: string;
        employeeId: import("mongoose").Types.ObjectId;
        employeeNumber: string;
        previousStatus: import("../employee-profile/enums/employee-profile.enums").EmployeeStatus.ACTIVE | import("../employee-profile/enums/employee-profile.enums").EmployeeStatus.ON_LEAVE | import("../employee-profile/enums/employee-profile.enums").EmployeeStatus.SUSPENDED | import("../employee-profile/enums/employee-profile.enums").EmployeeStatus.RETIRED | import("../employee-profile/enums/employee-profile.enums").EmployeeStatus.PROBATION | import("../employee-profile/enums/employee-profile.enums").EmployeeStatus.TERMINATED;
        newStatus: import("../employee-profile/enums/employee-profile.enums").EmployeeStatus;
        actions: any[];
        revocationLog?: undefined;
    }>;
}
