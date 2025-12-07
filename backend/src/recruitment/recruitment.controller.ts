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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { CreateEmployeeFromContractDto } from './dto/create-employee-from-contract.dto';

import {
  CreateTerminationRequestDto,
  UpdateTerminationStatusDto,
  UpdateTerminationDetailsDto,
} from './dto/termination-request.dto';

import {
  CreateClearanceChecklistDto,
  UpdateClearanceItemStatusDto,
} from './dto/clearance-checklist.dto';

import { RevokeSystemAccessDto } from './dto/system-access.dto';

@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  // ------------------------------------------
  // JOB REQUISITION (REC-003, REC-004, REC-023, REC-009)
  // ------------------------------------------

  /**
   * REC-003: HR Manager defines standardized job templates
   * Only HR Manager and Admin can create job requisitions
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('job')
  createJob(@Body() dto: CreateJobRequisitionDto) {
    return this.service.createJobRequisition(dto);
  }

  /**
   * REC-009: HR Manager monitors recruitment progress across all positions
   * All authenticated users can view job requisitions
   */
  @UseGuards(RolesGuard)
  @Get('job')
  getJobs() {
    return this.service.getAllJobRequisitions();
  }

  /**
   * Get specific job requisition by ID
   */
  @UseGuards(RolesGuard)
  @Get('job/:id')
  getJobById(@Param('id') id: string) {
    return this.service.getJobRequisitionById(id);
  }

  /**
   * Update job requisition status
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('job/:id/status')
  updateJobStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.service.updateJobRequisitionStatus(id, dto.status);
  }

  /**
   * REC-023: Publish jobs on company careers page
   * Only HR Employee and Admin can publish
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('job/:id/publish')
  publishJob(@Param('id') id: string) {
    return this.service.publishJobRequisition(id);
  }

  /**
   * Preview job requisition (with template details)
   */
  @UseGuards(RolesGuard)
  @Get('job/:id/preview')
  previewJob(@Param('id') id: string) {
    return this.service.previewJobRequisition(id);
  }

  // ------------------------------------------
  // JOB TEMPLATES (REC-003)
  // ------------------------------------------

  /**
   * REC-003: HR Manager defines standardized job templates
   * Create a new job template with qualifications and skills
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('job-template')
  createJobTemplate(@Body() dto: any) {
    return this.service.createJobTemplate(dto);
  }

  /**
   * Get all job templates
   */
  @UseGuards(RolesGuard)
  @Get('job-template')
  getAllJobTemplates() {
    return this.service.getAllJobTemplates();
  }

  /**
   * Get job template by ID
   */
  @UseGuards(RolesGuard)
  @Get('job-template/:id')
  getJobTemplateById(@Param('id') id: string) {
    return this.service.getJobTemplateById(id);
  }

  /**
   * Update job template
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Put('job-template/:id')
  updateJobTemplate(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateJobTemplate(id, dto);
  }

  // ------------------------------------------
  // APPLICATIONS (REC-007, REC-008, REC-017, REC-022)
  // ------------------------------------------

  /**
   * REC-007: Candidate uploads CV and applies for positions
   * REC-028: Consent required before storing application
   * Only candidates can apply; system auto-sets candidateId
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Post('application')
  apply(@Body() dto: CreateApplicationDto & { consentGiven: boolean }) {
    // BR: Storing applications requires applicant authorization
    if (!dto.consentGiven) {
      throw new BadRequestException(
        'Consent for data processing is required to submit application',
      );
    }
    return this.service.apply(dto, dto.consentGiven);
  }

  /**
   * REC-008, REC-017: HR Employee tracks candidates through hiring stages
   * REC-017: Candidates receive updates about application status
   * REC-030: Referrals get preferential filtering
   * HR staff and managers can view all; candidates see their own
   */
  @UseGuards(RolesGuard)
  @Get('application')
  getAllApplications(
    @Query('requisitionId') requisitionId?: string,
    @Query('prioritizeReferrals') prioritizeReferrals?: string,
  ) {
    const prioritize = prioritizeReferrals !== 'false';
    return this.service.getAllApplications(requisitionId, prioritize);
  }

  /**
   * Get ranked applications based on assessment scores and referral status
   * BR: Ranking rules enforced
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('application/ranked/:requisitionId')
  getRankedApplications(@Param('requisitionId') requisitionId: string) {
    return this.service.getRankedApplications(requisitionId);
  }

  /**
   * REC-008: Track candidates through hiring stages
   * REC-022: Automated rejection notifications
   * Only HR staff and managers can update status
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('application/:id/status')
  updateAppStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @Req() req: any,
  ) {
    // Get user ID from request (set by auth guard)
    const changedBy = req.user?.id || req.user?._id;
    return this.service.updateApplicationStatus(id, dto, changedBy);
  }

  // ------------------------------------------
  // INTERVIEWS (REC-010, REC-011, REC-020, REC-021)
  // ------------------------------------------

  /**
   * REC-010: Schedule and manage interview invitations
   * REC-011: Recruiters schedule interviews with time slots, panel members, and modes
   * REC-020: Structured assessment and scoring forms per role
   * REC-021: Coordinate interview panels
   * Only HR staff, managers, and department leads can schedule
   */
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.RECRUITER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Post('interview')
  scheduleInterview(@Body() dto: ScheduleInterviewDto) {
    return this.service.scheduleInterview(dto);
  }

  /**
   * REC-011: Interviewers receive automatic calendar invites
   * Only HR staff, managers, and department leads can update interview status
   */
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

  /**
   * REC-011, REC-020: Submit interview feedback and assessment score
   * Interviewers provide structured feedback and scoring
   */
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.RECRUITER,
    SystemRole.SYSTEM_ADMIN,
  )
  @Post('interview/:id/feedback')
  submitInterviewFeedback(
    @Param('id') interviewId: string,
    @Body() dto: { score: number; comments?: string },
    @Req() req: any,
  ) {
    const interviewerId = req.user?.id || req.user?._id;
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

  /**
   * Get all feedback for an interview
   */
  @UseGuards(RolesGuard)
  @Get('interview/:id/feedback')
  getInterviewFeedback(@Param('id') interviewId: string) {
    return this.service.getInterviewFeedback(interviewId);
  }

  /**
   * Get average score for an interview
   */
  @UseGuards(RolesGuard)
  @Get('interview/:id/score')
  getInterviewAverageScore(@Param('id') interviewId: string) {
    return this.service.getInterviewAverageScore(interviewId);
  }

  // ------------------------------------------
  // OFFERS (REC-014, REC-018)
  // ------------------------------------------

  /**
   * REC-014: HR Manager manages job offers and approvals
   * REC-018: HR Employee generates and sends electronically signed offer letters
   * Only HR managers can create offers
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('offer')
  createOffer(@Body() dto: CreateOfferDto) {
    return this.service.createOffer(dto);
  }

  /**
   * REC-018: Candidates accept/reject offers
   * Only candidates can respond to their offers
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.JOB_CANDIDATE)
  @Patch('offer/:id/respond')
  respond(@Param('id') id: string, @Body() dto: RespondToOfferDto) {
    return this.service.respondToOffer(id, dto);
  }

  /**
   * REC-014: HR Manager finalizes offers
   * Only HR managers and admins can finalize
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Patch('offer/:id/finalize')
  finalize(@Param('id') id: string, @Body() dto: FinalizeOfferDto) {
    return this.service.finalizeOffer(id, dto);
  }

  // ============= EMPLOYEE CREATION FROM CONTRACT =============
  /**
   * POST /recruitment/offer/:id/create-employee
   * Create employee profile from accepted offer and signed contract
   * HR Manager access signed contract details to create employee profile
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('offer/:id/create-employee')
  async createEmployeeFromContract(
    @Param('id') offerId: string,
    @Body() dto: CreateEmployeeFromContractDto,
  ) {
    return this.service.createEmployeeFromContract(offerId, dto);
  }

  // ============= ONBOARDING ENDPOINTS =============

  /**
   * REC-029: Trigger pre-boarding tasks after offer acceptance
   * ONB-001: Create onboarding checklist
   * Only HR staff can create onboarding
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding')
  async createOnboarding(@Body() createOnboardingDto: CreateOnboardingDto) {
    return this.service.createOnboarding(createOnboardingDto);
  }

  /**
   * Get all onboarding records (HR Manager view)
   * Only HR staff and managers can view all onboarding
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('onboarding')
  async getAllOnboardings() {
    return this.service.getAllOnboardings();
  }

  /**
   * Get onboarding statistics
   * Only HR staff and managers can view stats
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Get('onboarding/stats')
  async getOnboardingStats() {
    return this.service.getOnboardingStats();
  }

  /**
   * Get onboarding by ID
   * HR staff can view any; employees can view their own
   */
  @UseGuards(RolesGuard)
  @Get('onboarding/:id')
  async getOnboardingById(@Param('id') id: string) {
    return this.service.getOnboardingById(id);
  }

  /**
   * Get onboarding by employee ID (ONB-004)
   * Employees can view their own; HR staff can view any
   */
  @UseGuards(RolesGuard)
  @Get('onboarding/employee/:employeeId')
  async getOnboardingByEmployeeId(@Param('employeeId') employeeId: string) {
    return this.service.getOnboardingByEmployeeId(employeeId);
  }

  /**
   * Update entire onboarding checklist
   * Only HR staff can update
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Put('onboarding/:id')
  async updateOnboarding(
    @Param('id') id: string,
    @Body() updateOnboardingDto: UpdateOnboardingDto,
  ) {
    return this.service.updateOnboarding(id, updateOnboardingDto);
  }

  /**
   * Update a specific task in onboarding
   * Only HR staff can update tasks
   */
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

  /**
   * Add a new task to onboarding
   * Only HR staff can add tasks
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:id/task')
  async addTaskToOnboarding(@Param('id') id: string, @Body() taskDto: any) {
    return this.service.addTaskToOnboarding(id, taskDto);
  }

  /**
   * Remove a task from onboarding
   * Only HR staff can remove tasks
   */
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

  /**
   * Delete onboarding checklist
   * Only HR managers and admins can delete
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Delete('onboarding/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOnboarding(@Param('id') id: string) {
    return this.service.deleteOnboarding(id);
  }
  // ============= DOCUMENT UPLOAD ENDPOINTS (ONB-007) =============

  /**
   * POST /recruitment/onboarding/:id/task/:taskIndex/upload
   * Upload document for specific onboarding task
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:id/task/:taskIndex/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadTaskDocument(
    @Param('id') onboardingId: string,
    @Param('taskIndex') taskIndex: string,
    @UploadedFile() file: any,
    @Body('documentType') documentType: DocumentType,
  ) {
    return this.service.uploadTaskDocument(
      onboardingId,
      parseInt(taskIndex, 10),
      file,
      documentType,
    );
  }

  /**
   * GET /recruitment/document/:documentId/download
   * Download document by ID
   */
  @UseGuards(RolesGuard)
  @Get('document/:documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    return this.service.downloadDocument(documentId, res);
  }

  /**
   * GET /recruitment/onboarding/:id/task/:taskIndex/document
   * Get document metadata for specific task
   */
  @UseGuards(RolesGuard)
  @Get('onboarding/:id/task/:taskIndex/document')
  async getTaskDocument(
    @Param('id') onboardingId: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    return this.service.getTaskDocument(onboardingId, parseInt(taskIndex, 10));
  }

  /**
   * DELETE /recruitment/document/:documentId
   * Delete document (cleanup)
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Delete('document/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('documentId') documentId: string) {
    return this.service.deleteDocument(documentId);
  }

  // ------------------------------------------
  // ONBOARDING ENHANCEMENTS
  // ------------------------------------------

  /**
   * ONB-005: Send reminders for overdue or upcoming tasks
   * BR: Reminders required
   * This endpoint can be called by a scheduled job/cron
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/send-reminders')
  async sendOnboardingReminders() {
    await this.service.sendOnboardingReminders();
    return { message: 'Reminders sent successfully' };
  }

  /**
   * ONB-009: Provision system access (SSO/email/tools)
   * BR: IT access automated
   */
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

  /**
   * ONB-012: Reserve and track equipment, desk, and access cards
   * BR: All resources tracked
   */
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

  /**
   * ONB-013: Schedule automatic account provisioning and revocation
   * BR: Provisioning and security must be consistent
   */
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

  /**
   * ONB-018: Automatically handle payroll initiation
   * BR: Payroll trigger automatic (REQ-PY-23)
   */
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

  /**
   * ONB-019: Automatically process signing bonuses
   * BR: Bonuses treated as distinct payroll components (REQ-PY-27)
   */
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

  /**
   * Cancel/terminate onboarding in case of no-show
   * BR: Allow onboarding cancellation/termination
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('onboarding/:employeeId/cancel')
  async cancelOnboarding(
    @Param('employeeId') employeeId: string,
    @Body() dto: { reason: string },
  ) {
    return this.service.cancelOnboarding(employeeId, dto.reason);
  }

  // ------------------------------------------
  // REFERRALS (REC-030)
  // ------------------------------------------

  /**
   * REC-030: Tag candidate as referral
   * HR Employee can tag candidates as referrals to give them higher priority
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @Post('candidate/:candidateId/referral')
  tagCandidateAsReferral(
    @Param('candidateId') candidateId: string,
    @Body() dto: { referringEmployeeId: string; role?: string; level?: string },
    @Req() req: any,
  ) {
    // Use referringEmployeeId from body, or fallback to current user
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

  /**
   * Get all referrals for a candidate
   */
  @UseGuards(RolesGuard)
  @Get('candidate/:candidateId/referrals')
  getCandidateReferrals(@Param('candidateId') candidateId: string) {
    return this.service.getCandidateReferrals(candidateId);
  }

  // ------------------------------------------
  // CANDIDATE CONSENT (REC-028)
  // ------------------------------------------

  /**
   * REC-028: Record candidate consent for data processing
   * Candidates give consent for personal-data processing and background checks
   */
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

  @UseGuards(
    // JwtAuthGuard,   // uncomment when you plug the real auth guard
    RolesGuard,
  )

  // ============================= OFFBOARDING =============================

  // 1) Termination / Resignation
  //    - Employee can send their own resignation.
  //    - HR Manager can initiate termination.
  // No @Roles here -> any authenticated user can call,
  // then the service will branch based on user.role + initiator
  @Post('offboarding/termination')
  createTerminationRequest(
    @Body() dto: CreateTerminationRequestDto,
    @Req() req: any,
  ) {
    return this.service.createTerminationRequest(dto, req.user);
  }

  // Employee-facing: get my resignation/termination requests
  @UseGuards(RolesGuard)
  @Get('offboarding/my-resignation')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  getMyResignationRequests(@Req() req: any) {
    return this.service.getMyResignationRequests(req.user);
  }

  @Get('offboarding/termination/:id')
  @Roles(SystemRole.HR_MANAGER) // only HR can view details
  getTerminationRequest(@Param('id') id: string) {
    return this.service.getTerminationRequestById(id);
  }

  @Patch('offboarding/termination/:id/status')
  @Roles(SystemRole.HR_MANAGER)
  updateTerminationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTerminationStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateTerminationStatus(id, dto, req.user);
  }

  @Patch('offboarding/termination/:id')
  @Roles(SystemRole.HR_MANAGER)
  updateTerminationDetails(
    @Param('id') id: string,
    @Body() dto: UpdateTerminationDetailsDto,
    @Req() req: any,
  ) {
    return this.service.updateTerminationDetails(id, dto, req.user);
  }

  // 2) Clearance checklist

  @Post('offboarding/clearance')
  @Roles(SystemRole.HR_MANAGER)
  createClearanceChecklist(
    @Body() dto: CreateClearanceChecklistDto,
    @Req() req: any,
  ) {
    return this.service.createClearanceChecklist(dto, req.user);
  }

  // Manual trigger for clearance reminders (HR Manager / System Admin)
  @UseGuards(RolesGuard)
  @Post('offboarding/clearance/send-reminders')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  sendClearanceReminders(@Body() opts: { force?: boolean } = { force: false }) {
    return this.service.sendClearanceReminders(opts);
  }

  @Get('offboarding/clearance/employee/:employeeId')
  @Roles(SystemRole.HR_MANAGER)
  getChecklistByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.getChecklistByEmployee(employeeId);
  }

  @Patch('offboarding/clearance/:id/item')
  // Allow department-specific roles to call endpoint (service enforces detailed permission checks)
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

  @Patch('offboarding/clearance/:id/complete')
  @Roles(SystemRole.HR_MANAGER)
  markChecklistCompleted(@Param('id') checklistId: string, @Req() req: any) {
    return this.service.markChecklistCompleted(checklistId, req.user);
  }

  // 3) Appraisal view for offboarding (latest appraisal of employee)
  @Get('offboarding/appraisal/:employeeId')
  @Roles(SystemRole.HR_MANAGER)
  getLatestAppraisal(@Param('employeeId') employeeId: string) {
    return this.service.getLatestAppraisalForEmployee(employeeId);
  }

  // 4) SYSTEM ACCESS REVOCATION
  @Patch('offboarding/system-revoke')
  @Roles(SystemRole.SYSTEM_ADMIN)
  revokeAccess(@Body() dto: RevokeSystemAccessDto, @Req() req: any) {
    return this.service.revokeSystemAccess(dto, req.user);
  }
}
