// src/performance/performance.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';

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

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // ============================================
  //                 TEMPLATES
  // ============================================

  @Post('templates')
  createTemplate(@Body() dto: CreateAppraisalTemplateDto) {
    return this.performanceService.createTemplate(dto);
  }

  @Get('templates')
  findAllTemplates() {
    return this.performanceService.findAllTemplates();
  }

  @Get('templates/:id')
  findTemplateById(@Param('id') id: string) {
    return this.performanceService.findTemplateById(id);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateAppraisalTemplateDto,
  ) {
    return this.performanceService.updateTemplate(id, dto);
  }

  // ============================================
  //             CYCLES & ASSIGNMENTS
  // ============================================

  @Post('cycles')
  createCycle(@Body() dto: CreateAppraisalCycleDto) {
    return this.performanceService.createCycle(dto);
  }

  @Get('cycles')
  findAllCycles() {
    return this.performanceService.findAllCycles();
  }

  @Get('cycles/:id')
  findCycleById(@Param('id') id: string) {
    return this.performanceService.findCycleById(id);
  }

  @Patch('cycles/:id/activate')
  activateCycle(@Param('id') id: string) {
    return this.performanceService.activateCycle(id);
  }

  @Patch('cycles/:id/publish')
  publishCycle(@Param('id') id: string) {
    return this.performanceService.publishCycle(id);
  }

  @Patch('cycles/:id/close')
  closeCycle(@Param('id') id: string) {
    return this.performanceService.closeCycle(id);
  }

  @Patch('cycles/:id/archive')
  archiveCycle(@Param('id') id: string) {
    return this.performanceService.archiveCycle(id);
  }

  @Get('assignments/manager/:managerProfileId')
  getAssignmentsForManager(
    @Param('managerProfileId') managerProfileId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.performanceService.getAssignmentsForManager(
      managerProfileId,
      cycleId,
    );
  }

  @Get('assignments/employee/:employeeProfileId')
  getAssignmentsForEmployee(
    @Param('employeeProfileId') employeeProfileId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.performanceService.getAssignmentsForEmployee(
      employeeProfileId,
      cycleId,
    );
  }

  // ============================================
  //              APPRAISAL RECORDS
  // ============================================

  @Post('assignments/:assignmentId/records')
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

  @Patch('appraisals/:id/submit')
  submitAppraisalRecord(
    @Param('id') id: string,
    @Query('managerProfileId') managerProfileId: string,
  ) {
    return this.performanceService.submitAppraisalRecord(id, managerProfileId);
  }

  @Get('appraisals/employee/:employeeProfileId')
  getEmployeeAppraisals(@Param('employeeProfileId') employeeProfileId: string) {
    return this.performanceService.getEmployeeAppraisals(employeeProfileId);
  }

  // ============================================
  //                   DISPUTES
  // ============================================

  @Post('appraisals/:appraisalId/disputes')
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

  @Patch('disputes/:id/resolve')
  resolveDispute(
    @Param('id') id: string,
    @Query('resolverEmployeeId') resolverEmployeeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.performanceService.resolveDispute(id, resolverEmployeeId, dto);
  }
}