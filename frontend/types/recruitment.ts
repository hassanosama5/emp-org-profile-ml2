// Enums
export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  IN_PROCESS = 'in_process',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum ApplicationStage {
  SCREENING = 'screening',
  DEPARTMENT_INTERVIEW = 'department_interview',
  HR_INTERVIEW = 'hr_interview',
  OFFER = 'offer',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum InterviewMethod {
  ONSITE = 'onsite',
  VIDEO = 'video',
  PHONE = 'phone',
}

export enum OfferResponseStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

export enum OfferFinalStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

export enum OnboardingTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum DocumentType {
  CONTRACT = 'contract',
  ID = 'id',
  RESUME = 'resume',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

// Main Types
export interface JobTemplate {
  _id: string;
  title: string;
  department: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  skills?: string[];
  experienceLevel?: string;
  employmentType?: string;
  createdAt?: string;
  updatedAt?: string;
}

// CHANGED - Updated interface to match backend schema (was using 'published: boolean', now using 'publishStatus')
export interface JobRequisition {
  _id: string;
  // CHANGED - Added requisitionId field
  requisitionId?: string;
  // CHANGED - templateId can now be string or populated JobTemplate
  templateId: string | JobTemplate;
  // CHANGED - Added template alias for populated templateId
  template?: JobTemplate;
  openings: number;
  location?: string;
  hiringManagerId?: string;
  // CHANGED - Changed from 'published: boolean' to 'publishStatus' to match backend
  publishStatus: 'draft' | 'published' | 'closed';
  // CHANGED - Added postingDate field
  postingDate?: string;
  // CHANGED - Added expiryDate field
  expiryDate?: string;
  // CHANGED - Added statistics object from backend
  statistics?: {
    totalApplications: number;
    hired: number;
    inProcess: number;
    offer: number;
    filledPositions: number;
    availablePositions: number;
    progress: number;
    isFilled: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Application {
  _id: string;
  // CHANGED - candidateId can be string or populated object after .populate('candidateId')
  candidateId: string | { _id: string; [key: string]: any };
  candidate?: any; // Candidate profile
  requisitionId: string;
  requisition?: JobRequisition;
  assignedHr?: string;
  status: ApplicationStatus;
  // CHANGED - Added currentStage field to match backend schema
  currentStage?: ApplicationStage;
  stage?: ApplicationStage;
  // CHANGED - Added interviews array to support interview data attached to applications
  interviews?: Interview[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Interview {
  _id: string;
  applicationId: string;
  application?: Application;
  stage: ApplicationStage;
  scheduledDate: string;
  method?: InterviewMethod;
  panel?: string[];
  videoLink?: string;
  status: InterviewStatus;
  feedback?: InterviewFeedback[];
  averageScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewFeedback {
  interviewerId: string;
  interviewer?: any;
  score: number;
  comments?: string;
  submittedAt: string;
}

export interface Offer {
  _id: string;
  applicationId: string;
  application?: Application;
  candidateId: string;
  candidate?: any;
  grossSalary: number;
  signingBonus?: number;
  benefits?: string[];
  conditions?: string;
  insurances?: string;
  content?: string;
  role?: string;
  deadline: string;
  applicantResponse?: OfferResponseStatus;
  finalStatus?: OfferFinalStatus;
  contractDocumentId?: string;
  candidateFormDocumentId?: string;
  // CHANGED - Added signature date fields for electronic signature tracking
  candidateSignedAt?: string;
  hrSignedAt?: string;
  managerSignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnboardingTask {
  name: string;
  department: string;
  status: OnboardingTaskStatus;
  deadline?: string;
  completedAt?: string;
  documentId?: string;
  notes?: string;
}

export interface Onboarding {
  _id: string;
  employeeId: string;
  employee?: any;
  contractId?: string;
  tasks: OnboardingTask[];
  startDate?: string;
  completionDate?: string;
  completed?: boolean;
  completedAt?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  _id: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  uploadedBy: string;
  uploadedAt: string;
  nationalId?: string;
  documentDescription?: string;
}

// DTOs
export interface CreateJobRequisitionDto {
  templateId: string;
  openings: number;
  location?: string;
  hiringManagerId?: string;
}

export interface CreateApplicationDto {
  candidateId: string;
  requisitionId: string;
  assignedHr?: string;
  consentGiven: boolean;
}

export interface UpdateApplicationStatusDto {
  status: ApplicationStatus;
  // CHANGED - REC-022: Added rejection reason for automated rejection notifications
  rejectionReason?: string;
}

export interface ScheduleInterviewDto {
  applicationId: string;
  stage: ApplicationStage;
  scheduledDate: string;
  method?: InterviewMethod;
  panel?: string[];
  videoLink?: string;
}

export interface UpdateInterviewStatusDto {
  status: InterviewStatus;
}

export interface SubmitInterviewFeedbackDto {
  score: number;
  comments?: string;
}

export interface CreateOfferDto {
  applicationId: string;
  candidateId: string;
  grossSalary: number;
  signingBonus?: number;
  benefits?: string[];
  conditions?: string;
  insurances?: string;
  content?: string;
  role?: string;
  deadline: string;
}

export interface RespondToOfferDto {
  applicantResponse: OfferResponseStatus;
}

export interface FinalizeOfferDto {
  finalStatus: OfferFinalStatus;
}

export interface CreateOnboardingDto {
  employeeId: string;
  contractId?: string;
  tasks: OnboardingTask[];
}

export interface UpdateOnboardingDto {
  tasks?: OnboardingTask[];
  startDate?: string;
  completionDate?: string;
}

export interface UpdateOnboardingTaskDto {
  status?: OnboardingTaskStatus;
  notes?: string;
}

// Resignation types
export interface SubmitResignationDto {
  reason: string;
  comments?: string;
  requestedLastDay?: string; // When the employee wants their last day to be
}

// CHANGED - Added TerminateEmployeeDto for HR Manager termination
export interface TerminateEmployeeDto {
  employeeId: string; // employeeNumber e.g. "EMP-001"
  reason: string;
  hrComments?: string;
  terminationDate?: string;
}

// CHANGED - TerminationStatus enum (consolidated from both branches)
export enum TerminationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

// CHANGED - Added TerminationInitiation enum
export enum TerminationInitiation {
  EMPLOYEE = 'employee',
  HR = 'hr',
  MANAGER = 'manager',
}

export interface TerminationRequest {
  _id: string;
  employeeId: string;
  employee?: any;
  effectiveDate?: string;
  terminationDate?: string; // This is the requested last day for resignations
  reason: string;
  initiator?: TerminationInitiation | string;
  status: TerminationStatus | string;
  hrComments?: string;
  employeeComments?: string;
  performanceScore?: number;
  contractId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Clearance types
export interface ClearanceChecklist {
  _id: string;
  terminationRequestId: string;
  employeeId: string;
  items: ClearanceItem[];
  status: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// CHANGED - Added Hiring Process Template types
export interface StageDefinition {
  stage: ApplicationStage;
  name: string;
  order: number;
  progressPercentage: number;
}

export interface HiringProcessTemplate {
  _id: string;
  name: string;
  description?: string;
  stages: StageDefinition[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHiringProcessTemplateDto {
  name: string;
  description?: string;
  stages: StageDefinition[];
  isActive?: boolean;
}

export interface UpdateHiringProcessTemplateDto {
  name?: string;
  description?: string;
  stages?: StageDefinition[];
  isActive?: boolean;
}

export interface ClearanceItem {
  department: string;
  item: string;
  status: string;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

export interface UpdateClearanceItemStatusDto {
  department: string;   // Department name (e.g., 'IT', 'HR', 'FINANCE')
  status: string;       // 'pending', 'approved', 'rejected'
  comments?: string;    // Optional comments
}

export interface CreateEmployeeFromContractDto {
  startDate: string;
  workEmail?: string;
  employeeNumber?: string;
  // CHANGED - Added missing fields to integrate with employee-profile subsystem
  contractType?: 'FULL_TIME_CONTRACT' | 'PART_TIME_CONTRACT';
  workType?: 'FULL_TIME' | 'PART_TIME';
  primaryDepartmentId?: string;
  supervisorPositionId?: string;
  payGradeId?: string;
  // CHANGED - Added systemRole to allow HR to specify what role the new employee should have
  // This is crucial for hiring HR staff, payroll staff, etc. who need specific dashboard access
  // If not provided, the backend will auto-determine based on job title/department
  systemRole?: 'department employee' | 'department head' | 'HR Manager' | 'HR Employee' | 
               'Payroll Specialist' | 'Payroll Manager' | 'System Admin' | 
               'Legal & Policy Admin' | 'Recruiter' | 'Finance Staff' | 'HR Admin';
}

