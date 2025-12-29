import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { multerConfig } from './multer.config';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentType } from './enums/document-type.enum';

import { RecruitmentService } from './recruitment.service';
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
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateOnboardingTaskDto } from './dto/update-task.dto';
import { CreateJobTemplateDto, UpdateJobTemplateDto } from './dto/job-template.dto';
import { RolesGuard } from '../common/guards/roles.guard';
// changed - added JwtAuthGuard import
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { CreateEmployeeFromContractDto } from './dto/create-employee-from-contract.dto';

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
  TriggerFinalSettlementDto,
} from './dto/clearance-checklist.dto';

import { RevokeSystemAccessDto } from './dto/system-access.dto';

@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('job')
  createJob(@Body() dto: CreateJobRequisitionDto) {
    return this.service.createJobRequisition(dto);
  }

  @UseGuards(RolesGuard)
  @Get('job')
  getJobs() {
    return this.service.getAllJobRequisitions();
  }

  @UseGuards(RolesGuard)
  @Get('job/:id')
  getJobById(@Param('id') id: string) {
    return this.service.getJobRequisitionById(id);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('job/:id/status')
  updateJobStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.service.updateJobRequisitionStatus(id, dto.status);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('job/:id/publish')
  publishJob(@Param('id') id: string) {
    return this.service.publishJobRequisition(id);
  }

  @UseGuards(RolesGuard)
  @Get('job/:id/preview')
  previewJob(@Param('id') id: string) {
    return this.service.previewJobRequisition(id);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('job-template')
  createJobTemplate(@Body() dto: CreateJobTemplateDto) {
    return this.service.createJobTemplate(dto);
  }

  @UseGuards(RolesGuard)
  @Get('job-template')
  getAllJobTemplates() {
    return this.service.getAllJobTemplates();
  }

  @UseGuards(RolesGuard)
  @Get('job-template/:id')
  getJobTemplateById(@Param('id') id: string) {
    return this.service.getJobTemplateById(id);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Put('job-template/:id')
  updateJobTemplate(@Param('id') id: string, @Body() dto: UpdateJobTemplateDto) {
    return this.service.updateJobTemplate(id, dto);
  }
//--------------------------APPLICATION--------------------------------------------------
  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Post('application')
  apply(@Body() dto: CreateApplicationDto & { consentGiven: boolean }) {
    if (!dto.consentGiven) {
      throw new BadRequestException(
        'Consent for data processing is required to submit application',
      );
    }
    return this.service.apply(dto, dto.consentGiven);
  }

  // CHANGED - Added CV upload endpoint for candidates (REC-003)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Post('candidate/:candidateId/upload-cv')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadCandidateCV(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    // Parse body - handles both form-data and manual entry
    const manualEntry = body?.manualEntry === true || body?.manualEntry === 'true';
    const resumeUrl = body?.resumeUrl;

    const manualDocumentData = manualEntry ? {
      resumeUrl,
    } : undefined;

    return this.service.uploadCandidateCV(candidateId, file, manualDocumentData);
  }

  @UseGuards(RolesGuard)
  @Get('application')
  getAllApplications(
    @Query('requisitionId') requisitionId?: string,
    @Query('prioritizeReferrals') prioritizeReferrals?: string,
  ) {
    const prioritize = prioritizeReferrals !== 'false';
    return this.service.getAllApplications(requisitionId, prioritize);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('application/ranked/:requisitionId')
  getRankedApplications(@Param('requisitionId') requisitionId: string) {
    return this.service.getRankedApplications(requisitionId);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('application/:id/status')
  updateAppStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @Req() req: any,
  ) {
    const changedBy = req.user?.id || req.user?._id;
    return this.service.updateApplicationStatus(id, dto, changedBy);
  }

  // =============================================================
  // GET HR EMPLOYEES FOR INTERVIEW PANEL SELECTION
  // =============================================================
  // Returns only HR Employees who can be assigned as panel members
  // for conducting interviews.
  // CHANGED: Added RECRUITER role to allow recruiters to select panel members
  // when scheduling interviews (recruiters need to assign HR employees to panels)
  // =============================================================
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
  @Get('hr-employees')
  getHREmployeesForPanel() {
    return this.service.getHREmployeesForPanel();
  }

  // CHANGED - New endpoint to get eligible panel members based on interview stage
  // Returns HR employees for HR_INTERVIEW, HR + department employees for DEPARTMENT_INTERVIEW
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
  @Get('eligible-panel-members/:applicationId/:stage')
  getEligiblePanelMembers(
    @Param('applicationId') applicationId: string,
    @Param('stage') stage: string,
  ) {
    return this.service.getEligiblePanelMembers(applicationId, stage);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.RECRUITER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Post('interview')
  scheduleInterview(@Body() dto: ScheduleInterviewDto, @Req() req: any) {
    // CHANGED: Automatically add recruiter to panel if they schedule the interview
    // Recruiters who schedule interviews are automatically included as panel members
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;
    const userRoles = req.user?.roles || [];
    const isRecruiter = userRoles.includes(SystemRole.RECRUITER);
    
    // If recruiter schedules interview, automatically add them to panel
    if (isRecruiter && currentUserId) {
      // Ensure panel array exists
      if (!dto.panel) {
        dto.panel = [];
      }
      // Add recruiter to panel if not already included
      const recruiterIdStr = String(currentUserId);
      if (!dto.panel.includes(recruiterIdStr)) {
        dto.panel.push(recruiterIdStr);
      }
    }
    
    return this.service.scheduleInterview(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.RECRUITER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Patch('interview/:id/status')
  updateInterviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewStatusDto,
  ) {
    return this.service.updateInterviewStatus(id, dto);
  }
  // CHANGED: Allow ANY authenticated employee to submit feedback
  // The service validates that the user is actually part of the interview panel
  // This allows department employees, new hires, etc. to submit feedback when selected as panel members
  @UseGuards(JwtAuthGuard)
  @Post('interview/:id/feedback')
  submitInterviewFeedback(
    @Param('id') interviewId: string,
    @Body() dto: { score: number; comments?: string },
    @Req() req: any,
  ) {
    const interviewerId = req.user?.userId || req.user?.id || req.user?._id;
    if (!interviewerId) {
      throw new BadRequestException('Interviewer ID not found in request');
    }
    return this.service.submitInterviewFeedback(
      interviewId,
      interviewerId,
      dto.score,
      dto.comments,
    );
  }

  @UseGuards(RolesGuard)
  @Get('interview/:id/feedback')
  getInterviewFeedback(@Param('id') interviewId: string) {
    return this.service.getInterviewFeedback(interviewId);
  }

  // NEW: Get interviews where current user is a panel member
  // Accessible to ANY authenticated employee - all employees can be panel members
  @UseGuards(JwtAuthGuard)
  @Get('my-panel-interviews')
  getMyPanelInterviews(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    return this.service.getMyPanelInterviews(userId);
  }

  @UseGuards(RolesGuard)
  @Get('interview/:id/score')
  getInterviewAverageScore(@Param('id') interviewId: string) {
    return this.service.getInterviewAverageScore(interviewId);
  }

  // CHANGED: Added HR_EMPLOYEE role to allow HR employees to create offers
  // HR employees can create/send offers but cannot approve/finalize them
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  @Post('offer')
  createOffer(@Body() dto: CreateOfferDto) {
    return this.service.createOffer(dto);
  }

  // More specific route must come before parameterized routes
  // CHANGED: Added HR_EMPLOYEE role to allow viewing offers
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  @Get('offer/application/:applicationId')
  getOfferByApplication(@Param('applicationId') applicationId: string) {
    return this.service.getOfferByApplicationId(applicationId);
  }

  // Endpoint for candidates to get their offers
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Get('offer/candidate/:candidateId')
  getOffersByCandidateId(@Param('candidateId') candidateId: string) {
    return this.service.getOffersByCandidateId(candidateId);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Patch('offer/:id/respond')
  respond(@Param('id') id: string, @Body() dto: RespondToOfferDto) {
    return this.service.respondToOffer(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('offer/:id/finalize')
  finalize(@Param('id') id: string, @Body() dto: FinalizeOfferDto) {
    return this.service.finalizeOffer(id, dto);
  }

  // CHANGED: HR Employee can reject candidates - ONLY HR_EMPLOYEE can reject
  // HR Manager cannot reject candidates, only HR Employee can
  // Cannot reject if candidate is already finalized (hired, employee created, etc.)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE)
  @Patch('offer/:id/reject-candidate')
  rejectCandidate(
    @Param('id') offerId: string,
    @Body() dto: { reason: string },
  ) {
    return this.service.rejectCandidateByHrEmployee(offerId, dto.reason);
  }

  // ONB-002: Get contract status for an offer (so HR can see if candidate uploaded contract)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  @Get('offer/:id/contract-status')
  async getContractStatus(@Param('id') offerId: string) {
    return this.service.getContractStatusForOffer(offerId);
  }

  // changed - modified to accept either file upload OR manual JSON body for testing
  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('offer/:id/upload-contract')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadContractDocument(
    @Param('id') offerId: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    // Parse body - handles both form-data and JSON
    const documentType = body?.documentType || DocumentType.CONTRACT;
    const nationalId = body?.nationalId;
    const documentDescription = body?.documentDescription;
    const manualEntry = body?.manualEntry === true || body?.manualEntry === 'true';

    // If manual entry flag is set and no file, use manual data
    const manualDocumentData = manualEntry && !file ? {
      nationalId,
      documentDescription,
    } : undefined;

    return this.service.uploadContractDocument(
      offerId,
      file,
      documentType,
      manualDocumentData,
    );
  }

  // changed - modified to accept either file upload OR manual entry for testing
  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('offer/:id/upload-form')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadCandidateForm(
    @Param('id') offerId: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    // Parse body - handles both form-data and manual entry
    const documentType = body?.documentType || DocumentType.ID;
    const nationalId = body?.nationalId;
    const documentDescription = body?.documentDescription;
    const manualEntry = body?.manualEntry === true || body?.manualEntry === 'true';

    // If manual entry flag is set and no file, use manual data
    const manualDocumentData = manualEntry && !file ? {
      nationalId,
      documentDescription,
    } : undefined;

    return this.service.uploadCandidateForm(offerId, file, documentType, manualDocumentData);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('offer/:id/create-employee')
  async createEmployeeFromContract(
    @Param('id') offerId: string,
    @Body() dto: CreateEmployeeFromContractDto,
  ) {
    return this.service.createEmployeeFromContract(offerId, dto);
  }

  // changed - pass contractId from DTO to service
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding')
  async createOnboarding(@Body() createOnboardingDto: CreateOnboardingDto) {
    return this.service.createOnboarding(
      createOnboardingDto,
      undefined, // contractSigningDate
      undefined, // startDate
      undefined, // workEmail
      createOnboardingDto.contractId, // contractId from DTO
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('onboarding')
  async getAllOnboardings() {
    return this.service.getAllOnboardings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('onboarding/stats')
  async getOnboardingStats() {
    return this.service.getOnboardingStats();
  }

  // ONB-004: Candidate can view their onboarding after being hired
  // When a candidate is hired (employee profile created), they can access
  // their onboarding tasks by their candidate ID - the system finds the
  // linked employee profile and returns that employee's onboarding
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Get('onboarding/candidate/:candidateId')
  async getOnboardingByCandidateId(@Param('candidateId') candidateId: string) {
    return this.service.getOnboardingByCandidateId(candidateId);
  }

  // ONB-004: New hire can view their own onboarding tracker
  // IMPORTANT: This specific route MUST come BEFORE the generic /:id route
  // DEPARTMENT_EMPLOYEE allows new hires to view their onboarding tasks
  // HR roles also have access for management purposes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Get('onboarding/employee/:employeeId')
  async getOnboardingByEmployeeId(@Param('employeeId') employeeId: string) {
    return this.service.getOnboardingByEmployeeId(employeeId);
  }

  // ONB-004: HR can view any onboarding by ID
  // IMPORTANT: Generic /:id route must come AFTER more specific routes like /employee/:id
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('onboarding/:id')
  async getOnboardingById(@Param('id') id: string) {
    return this.service.getOnboardingById(id);
  }

  // Check if employee already exists for an application
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
  )
  @Get('application/:id/employee-status')
  async checkEmployeeExistsForApplication(@Param('id') applicationId: string) {
    return this.service.checkEmployeeExistsForApplication(applicationId);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Put('onboarding/:id')
  async updateOnboarding(
    @Param('id') id: string,
    @Body() updateOnboardingDto: UpdateOnboardingDto,
  ) {
    return this.service.updateOnboarding(id, updateOnboardingDto);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('onboarding/:id/task/:taskIndex')
  async updateOnboardingTask(
    @Param('id') id: string,
    @Param('taskIndex') taskIndex: string,
    @Body() updateTaskDto: UpdateOnboardingTaskDto,
  ) {
    return this.service.updateOnboardingTask(
      id,
      parseInt(taskIndex),
      updateTaskDto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:id/task')
  async addTaskToOnboarding(@Param('id') id: string, @Body() taskDto: any) {
    return this.service.addTaskToOnboarding(id, taskDto);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Delete('onboarding/:id/task/:taskIndex')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTaskFromOnboarding(
    @Param('id') id: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    return this.service.removeTaskFromOnboarding(id, parseInt(taskIndex, 10));
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Delete('onboarding/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOnboarding(@Param('id') id: string) {
    return this.service.deleteOnboarding(id);
  }

  // changed - modified to accept either file upload OR manual entry for testing
  // ONB-007: New hires (candidates) can upload their own documents for onboarding tasks
  // JOB_CANDIDATE is allowed so candidates can upload ID, certifications, etc.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    SystemRole.JOB_CANDIDATE,
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Post('onboarding/:id/task/:taskIndex/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadTaskDocument(
    @Param('id') onboardingId: string,
    @Param('taskIndex') taskIndex: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    // Parse body - handles both form-data and manual entry
    const documentType = body?.documentType || DocumentType.ID;
    const nationalId = body?.nationalId;
    const documentDescription = body?.documentDescription;
    const manualEntry = body?.manualEntry === true || body?.manualEntry === 'true';

    // If manual entry flag is set and no file, use manual data
    const manualDocumentData = manualEntry && !file ? {
      nationalId,
      documentDescription,
    } : undefined;

    return this.service.uploadTaskDocument(
      onboardingId,
      parseInt(taskIndex, 10),
      file,
      documentType,
      manualDocumentData,
    );
  }

  // ONB-007: Allow candidates and employees to download their uploaded documents
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    SystemRole.JOB_CANDIDATE,
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Get('document/:documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    return this.service.downloadDocument(documentId, res);
  }

  // CHANGED BY RECRUITMENT SUBSYSTEM - Talent Pool Feature
  // Download candidate resume/CV by candidate ID
  // This endpoint allows HR to download resumes from the Talent Pool
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  @Get('candidate/:candidateId/resume/download')
  async downloadCandidateResume(
    @Param('candidateId') candidateId: string,
    @Res() res: Response,
  ) {
    return this.service.downloadCandidateResume(candidateId, res);
  }

  @UseGuards(RolesGuard)
  @Get('onboarding/:id/task/:taskIndex/document')
  async getTaskDocument(
    @Param('id') onboardingId: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    return this.service.getTaskDocument(onboardingId, parseInt(taskIndex, 10));
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Delete('document/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('documentId') documentId: string) {
    return this.service.deleteDocument(documentId);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/send-reminders')
  async sendOnboardingReminders() {
    await this.service.sendOnboardingReminders();
    return { message: 'Reminders sent successfully' };
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/provision-access/:taskIndex')
  async provisionSystemAccess(
    @Param('employeeId') employeeId: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    return this.service.provisionSystemAccess(
      employeeId,
      parseInt(taskIndex, 10),
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/reserve-equipment')
  async reserveEquipment(
    @Param('employeeId') employeeId: string,
    @Body() dto: { equipmentType: string; equipmentDetails: any },
  ) {
    return this.service.reserveEquipment(
      employeeId,
      dto.equipmentType,
      dto.equipmentDetails,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/schedule-access')
  async scheduleAccessProvisioning(
    @Param('employeeId') employeeId: string,
    @Body() dto: { startDate: string; endDate?: string },
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    return this.service.scheduleAccessProvisioning(
      employeeId,
      startDate,
      endDate,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/trigger-payroll')
  async triggerPayrollInitiation(
    @Param('employeeId') employeeId: string,
    @Body() dto: { contractSigningDate: string; grossSalary: number },
  ) {
    const contractSigningDate = new Date(dto.contractSigningDate);
    return this.service.triggerPayrollInitiation(
      employeeId,
      contractSigningDate,
      dto.grossSalary,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/process-bonus')
  async processSigningBonus(
    @Param('employeeId') employeeId: string,
    @Body() dto: { signingBonus: number; contractSigningDate: string },
  ) {
    const contractSigningDate = new Date(dto.contractSigningDate);
    return this.service.processSigningBonus(
      employeeId,
      dto.signingBonus,
      contractSigningDate,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/cancel')
  async cancelOnboarding(
    @Param('employeeId') employeeId: string,
    @Body() dto: { reason: string },
  ) {
    return this.service.cancelOnboarding(employeeId, dto.reason);
  }

  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('candidate/:candidateId/referral')
  tagCandidateAsReferral(
    @Param('candidateId') candidateId: string,
    @Body() dto: { referringEmployeeId: string; role?: string; level?: string },
    @Req() req: any,
  ) {
    const referringEmployeeId =
      dto.referringEmployeeId || req.user?.id || req.user?._id;
    if (!referringEmployeeId) {
      throw new BadRequestException('Referring employee ID is required');
    }
    return this.service.tagCandidateAsReferral(
      candidateId,
      referringEmployeeId,
      dto.role,
      dto.level,
    );
  }

  @UseGuards(RolesGuard)
  @Get('candidate/:candidateId/referrals')
  getCandidateReferrals(@Param('candidateId') candidateId: string) {
    return this.service.getCandidateReferrals(candidateId);
  }

  @UseGuards(RolesGuard)
  @Post('candidate/:candidateId/consent')
  recordCandidateConsent(
    @Param('candidateId') candidateId: string,
    @Body()
    dto: { consentGiven: boolean; consentType?: string; notes?: string },
  ) {
    return this.service.recordCandidateConsent(
      candidateId,
      dto.consentGiven,
      dto.consentType || 'data_processing',
      dto.notes,
    );
  }
//--------------------------OFFBOARDING--------------------------------------------------

  // ============================================================================
  // NEW CHANGES: RESIGNATION ENDPOINT - Any employee type can resign themselves
  // Implements OFF-018: Employee can request resignation with reasoning
  // ============================================================================
  /**
   * POST /recruitment/offboarding/resign
   * Allows ANY authenticated employee (HR Manager, Admin, Department Employee, etc.)
   * to submit their own resignation. No role restrictions.
   */
  @UseGuards(JwtAuthGuard)
  @Post('offboarding/resign')
  submitResignation(
    @Body() dto: SubmitResignationDto,
    @Req() req: any,
  ) {
    return this.service.submitResignation(dto, req.user);
  }

  // ============================================================================
  // NEW CHANGES: TERMINATE ENDPOINT - Only HR Manager can terminate employees
  // Implements OFF-001: HR Manager initiates termination based on performance
  // ============================================================================
  /**
   * POST /recruitment/offboarding/terminate
   * OFF-001: Only HR Manager can terminate an employee based on poor performance.
   * Requires performance score < 2.5 from appraisal records.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.HR_MANAGER)
  @Post('offboarding/terminate')
  terminateEmployee(
    @Body() dto: TerminateEmployeeDto,
    @Req() req: any,
  ) {
    return this.service.terminateEmployeeByHR(dto, req.user);
  }

  // ============================================================================
  // LEGACY: Original termination endpoint (kept for backwards compatibility)
  // ============================================================================
  // changed - added JwtAuthGuard to parse JWT token
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('offboarding/termination')
  createTerminationRequest(
    @Body() dto: CreateTerminationRequestDto,
    @Req() req: any,
  ) {
    return this.service.createTerminationRequest(dto, req.user);
  }

  // ============================================================================
  // NEW CHANGES - FIXED: Any employee type can track their resignation
  // Implements OFF-019: Employee can track resignation request status
  // Removed @Roles(SystemRole.DEPARTMENT_EMPLOYEE) restriction
  // ============================================================================
  @UseGuards(JwtAuthGuard)
  @Get('offboarding/my-resignation')
  getMyResignationRequests(@Req() req: any) {
    return this.service.getMyResignationRequests(req.user);
  }

  // OFF-001: HR Manager gets ALL termination/resignation requests - HR MANAGER ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('offboarding/terminations')
  @Roles(SystemRole.HR_MANAGER)
  getAllTerminationRequests() {
    return this.service.getAllTerminationRequests();
  }

  // OFF-010: Get ALL clearance checklists - All department roles can view to complete their items
  // This endpoint does NOT expose termination details, only checklists with employee info
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('offboarding/clearance-checklists')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.FINANCE_STAFF,
    SystemRole.PAYROLL_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  getAllClearanceChecklists() {
    return this.service.getAllClearanceChecklists();
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('offboarding/termination/:id')
  @Roles(SystemRole.HR_MANAGER)
  getTerminationRequest(@Param('id') id: string) {
    return this.service.getTerminationRequestById(id);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('offboarding/termination/:id/status')
  @Roles(SystemRole.HR_MANAGER)
  updateTerminationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTerminationStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateTerminationStatus(id, dto, req.user);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('offboarding/termination/:id')
  @Roles(SystemRole.HR_MANAGER)
  updateTerminationDetails(
    @Param('id') id: string,
    @Body() dto: UpdateTerminationDetailsDto,
    @Req() req: any,
  ) {
    return this.service.updateTerminationDetails(id, dto, req.user);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('offboarding/clearance')
  @Roles(SystemRole.HR_MANAGER)
  createClearanceChecklist(
    @Body() dto: CreateClearanceChecklistDto,
    @Req() req: any,
  ) {
    return this.service.createClearanceChecklist(dto, req.user);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('offboarding/clearance/send-reminders')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  sendClearanceReminders(@Body() opts: { force?: boolean } = { force: false }) {
    return this.service.sendClearanceReminders(opts);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('offboarding/clearance/employee/:employeeId')
  @Roles(SystemRole.HR_MANAGER)
  getChecklistByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.getChecklistByEmployee(employeeId);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('offboarding/clearance/:id/item')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.FINANCE_STAFF,
    SystemRole.PAYROLL_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  updateClearanceItem(
    @Param('id') checklistId: string,
    @Body() dto: UpdateClearanceItemStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateClearanceItemStatus(checklistId, dto, req.user);
  }

  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('offboarding/clearance/:id/complete')
  @Roles(SystemRole.HR_MANAGER)
  markChecklistCompleted(@Param('id') checklistId: string, @Req() req: any) {
    return this.service.markChecklistCompleted(checklistId, req.user);
  }

  // 3) Appraisal view for offboarding (latest appraisal of employee)
  // OFF-001: HR Manager views employee performance for termination decisions
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('offboarding/appraisal/:employeeId')
  @Roles(SystemRole.HR_MANAGER)
  getLatestAppraisal(@Param('employeeId') employeeId: string) {
    return this.service.getLatestAppraisalForEmployee(employeeId);
  }

  // 4) SYSTEM ACCESS REVOCATION
  // changed - added JwtAuthGuard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('offboarding/system-revoke')
  @Roles(SystemRole.SYSTEM_ADMIN)
  revokeAccess(@Body() dto: RevokeSystemAccessDto, @Req() req: any) {
    return this.service.revokeSystemAccess(dto, req.user);
  }

  // ============================================================================
  // NEW CHANGES FOR OFFBOARDING: Manual Final Settlement Trigger (OFF-013)
  // Triggers benefits termination and final pay calculation
  // ============================================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('offboarding/final-settlement')
  @Roles(SystemRole.HR_MANAGER)
  triggerFinalSettlement(
    @Body() dto: TriggerFinalSettlementDto,
    @Req() req: any,
  ) {
    return this.service.triggerFinalSettlement(dto.employeeId, dto.terminationId);
  }

  // ============================================================================
  // RECRUITMENT REPORTS
  // ============================================================================
  // Generates comprehensive recruitment analytics and reports including:
  // - Time-to-Hire metrics
  // - Source Effectiveness (Referral vs Direct)
  // - Pipeline Conversion Rates
  // - Interview Analytics
  // - Position Performance
  // ============================================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reports')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  getRecruitmentReports() {
    return this.service.getRecruitmentReports();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reports/time-to-hire')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  getTimeToHireReport() {
    return this.service.getTimeToHireReport();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reports/source-effectiveness')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  getSourceEffectivenessReport() {
    return this.service.getSourceEffectivenessReport();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reports/pipeline-conversion')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  getPipelineConversionReport() {
    return this.service.getPipelineConversionReport();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reports/interview-analytics')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  getInterviewAnalyticsReport() {
    return this.service.getInterviewAnalyticsReport();
  }
}
