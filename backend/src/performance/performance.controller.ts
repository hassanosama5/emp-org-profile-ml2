// src/performance/performance.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';

// --------- AUTH / ROLES ---------
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
// 👇 Adjust path to where you actually keep these enums
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

// --------- DTO IMPORTS ---------
// TEMPLATES
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';

// CYCLES
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';

// RECORDS
import { UpsertAppraisalRecordDto } from './dto/upsert-appraisal-record.dto';

// DISPUTES
import { SubmitDisputeDto } from './dto/submit-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // ============================================================
  //                         TEMPLATES
  // ============================================================
  // Step 1 – Template Definition (REQ-PP-01)

  @Post('templates')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  createTemplate(@Body() dto: CreateAppraisalTemplateDto) {
    return this.performanceService.createTemplate(dto);
  }

  @Get('templates')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  findAllTemplates() {
    return this.performanceService.findAllTemplates();
  }

  @Get('templates/:id')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  findTemplateById(@Param('id') id: string) {
    return this.performanceService.findTemplateById(id);
  }

  @Patch('templates/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateAppraisalTemplateDto,
  ) {
    return this.performanceService.updateTemplate(id, dto);
  }

  // ============================================================
  //                    CYCLES & ASSIGNMENTS
  // ============================================================
  // Step 2 – Cycle Creation & Setup (REQ-PP-02, REQ-PP-05)

  @Post('cycles')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  createCycle(@Body() dto: CreateAppraisalCycleDto) {
    return this.performanceService.createCycle(dto);
  }

  @Get('cycles')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  findAllCycles() {
    return this.performanceService.findAllCycles();
  }

  @Get('cycles/:id')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  findCycleById(@Param('id') id: string) {
    return this.performanceService.findCycleById(id);
  }

  // --- lifecycle transitions: mainly HR Manager ---

  @Patch('cycles/:id/activate')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  activateCycle(@Param('id') id: string) {
    return this.performanceService.activateCycle(id);
  }

  @Patch('cycles/:id/publish')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  publishCycle(@Param('id') id: string) {
    return this.performanceService.publishCycle(id);
  }

  @Patch('cycles/:id/close')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  closeCycle(@Param('id') id: string) {
    return this.performanceService.closeCycle(id);
  }

  @Patch('cycles/:id/archive')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  archiveCycle(@Param('id') id: string) {
    return this.performanceService.archiveCycle(id);
  }

  // --- HR monitoring & reminders (Step 4, REQ-AE-06, REQ-AE-10) ---

  @Get('cycles/:id/progress')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getCycleProgress(@Param('id') id: string) {
    // Should return completion stats by department/team
    return this.performanceService.getCycleProgress(id);
  }

  @Post('cycles/:id/reminders')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  sendCycleReminders(@Param('id') id: string) {
    // Should trigger reminder notifications for pending assignments
    return this.performanceService.sendCycleReminders(id);
  }

  // ============================================================
  //                      ASSIGNMENTS (Step 3A)
  // ============================================================
  // REQ-PP-05, REQ-PP-13

  // Convenience endpoint for “current” manager (must be before :managerProfileId)
  @Get('assignments/manager/me')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getAssignmentsForCurrentManager(
    @Req() req: any,
    @Query('cycleId') cycleId?: string,
  ) {
    const managerProfileId = req.user?.employeeProfileId;
    return this.performanceService.getAssignmentsForManager(
      managerProfileId,
      cycleId,
    );
  }

  // For HR/manager to query assignments for a specific manager
  @Get('assignments/manager/:managerProfileId')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getAssignmentsForManager(
    @Param('managerProfileId') managerProfileId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.performanceService.getAssignmentsForManager(
      managerProfileId,
      cycleId,
    );
  }

  // Convenience endpoint: current logged-in employee (must be before :employeeProfileId)
  @Get('assignments/employee/me')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getAssignmentsForCurrentEmployee(
    @Req() req: any,
    @Query('cycleId') cycleId?: string,
  ) {
    const employeeProfileId = req.user?.employeeProfileId;
    return this.performanceService.getAssignmentsForEmployee(
      employeeProfileId,
      cycleId,
    );
  }

  // For HR / employee to query assignments of a specific employee
  @Get('assignments/employee/:employeeProfileId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getAssignmentsForEmployee(
    @Param('employeeProfileId') employeeProfileId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.performanceService.getAssignmentsForEmployee(
      employeeProfileId,
      cycleId,
    );
  }

  // ============================================================
  //                      APPRAISAL RECORDS
  // ============================================================
  // Step 3B – Manager fills form (REQ-AE-03, REQ-AE-04)
  // Step 5 – Employee receives rating (REQ-OD-01)

  // Manager saves or updates appraisal draft for a given assignment
  @Post('assignments/:assignmentId/records')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  upsertAppraisalRecord(
    @Param('assignmentId') assignmentId: string,
    @Query('managerProfileId') managerProfileId: string,
    @Body() dto: UpsertAppraisalRecordDto,
  ) {
    return this.performanceService.upsertAppraisalRecord(
      assignmentId,
      managerProfileId,
      dto,
    );
  }

  // Manager submits completed appraisal record
  @Patch('appraisals/:id/submit')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  submitAppraisalRecord(
    @Param('id') id: string,
    @Query('managerProfileId') managerProfileId: string,
  ) {
    return this.performanceService.submitAppraisalRecord(
      id,
      managerProfileId,
    );
  }

  // HR / Manager / Employee view a single appraisal record
  @Get('appraisals/:id')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getAppraisalById(@Param('id') id: string) {
    return this.performanceService.getAppraisalById(id);
  }

  // Convenience endpoint: current logged-in employee’s history (must be before :employeeProfileId)
  @Get('appraisals/employee/me')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getCurrentEmployeeAppraisals(@Req() req: any) {
    const employeeProfileId = req.user?.employeeProfileId;
    return this.performanceService.getEmployeeAppraisals(
      employeeProfileId,
    );
  }

  // Employee view of their whole history (REQ-OD-01, REQ-OD-08)
  @Get('appraisals/employee/:employeeProfileId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  getEmployeeAppraisals(
    @Param('employeeProfileId') employeeProfileId: string,
  ) {
    return this.performanceService.getEmployeeAppraisals(
      employeeProfileId,
    );
  }

  // HR analytics / reports entry point (REQ-OD-06, REQ-OD-08)
  @Get('appraisals')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN)
  getAppraisalsForReporting(
    @Query('cycleId') cycleId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.performanceService.getAppraisalsForReporting({
      cycleId,
      departmentId,
      status,
    });
  }

  // ============================================================
  //                           DISPUTES
  // ============================================================
  // Step 6 – Employee Objects (REQ-AE-07)
  // Step 7 – HR Resolves Objection (REQ-OD-07)

  // Employee (or HR on behalf of employee) submits dispute for an appraisal
  @Post('appraisals/:appraisalId/disputes')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  submitDispute(
    @Param('appraisalId') appraisalId: string,
    @Query('employeeProfileId') employeeProfileId: string,
    @Body() dto: SubmitDisputeDto,
  ) {
    return this.performanceService.submitDispute(
      appraisalId,
      employeeProfileId,
      dto,
    );
  }

  // View disputes for a given appraisal (HR / Manager view)
  @Get('appraisals/:appraisalId/disputes')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  getDisputesForAppraisal(@Param('appraisalId') appraisalId: string) {
    return this.performanceService.getDisputesForAppraisal(appraisalId);
  }

  // List all disputes (for HR dashboard / filters by cycle, status)
  @Get('disputes')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  getDisputes(
    @Query('cycleId') cycleId?: string,
    @Query('status') status?: string,
  ) {
    return this.performanceService.getDisputes({ cycleId, status });
  }

  @Get('disputes/:id')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  getDisputeById(@Param('id') id: string) {
    return this.performanceService.getDisputeById(id);
  }

  // HR Manager resolves a dispute
  @Patch('disputes/:id/resolve')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  resolveDispute(
    @Param('id') id: string,
    @Query('resolverEmployeeId') resolverEmployeeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.performanceService.resolveDispute(
      id,
      resolverEmployeeId,
      dto,
    );
  }
}
