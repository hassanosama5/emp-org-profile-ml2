import { CreateCalendarDto } from './dto/CreateCalendar.dto';
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LeavesService } from './leaves.service';
import { CreateLeavePolicyDto } from './dto/CreateLeavePolicy.dto';
import { UpdateLeavePolicyDto } from './dto/UpdateLeavePolicy.dto';
import { CreateLeaveRequestDto } from './dto/CreateLeaveRequest.dto';
import { UpdateLeaveRequestDto } from './dto/UpdateLeaveRequest.dto';
import { CreateLeaveEntitlementDto } from './dto/CreateLeaveEntitlement.dto';
import { UpdateLeaveEntitlementDto } from './dto/UpdateLeaveEntitlement.dto';
import { CreateLeaveAdjustmentDto } from './dto/CreateLeaveAdjustment.dto';
import { CreateLeaveTypeDto } from './dto/CreateLeaveType.dto';
import { UpdateLeaveTypeDto } from './dto/UpdateLeaveType.dto';
import { CreateLeaveCategoryDto } from './dto/CreateLeaveCategory.dto';
import { ApproveLeaveRequestDto } from './dto/ApproveLeaveRequest.dto';
import { RejectLeaveRequestDto } from './dto/RejectLeaveRequest.dto';
import { FinalizeLeaveRequestDto } from './dto/FinalizeLeaveRequest.dto';
import { HrOverrideDecisionDto } from './dto/HrOverrideDecision.dto';
import { ProcessMultipleRequestsDto } from './dto/ProcessMultipleRequests.dto';
import { ViewLeaveBalanceDto } from './dto/ViewLeaveBalance.dto';
import { ViewPastLeaveRequestsDto } from './dto/ViewPastLeaveRequests.dto';
import { FilterLeaveHistoryDto } from './dto/FilterLeaveHistory.dto';
import { ViewTeamLeaveBalancesDto } from './dto/ViewTeamLeaveBalances.dto';
import { FilterTeamLeaveDataDto } from './dto/FilterTeamLeaveData.dto';
import {
  FlagIrregularPatternDto,
  IrregularPatternAnalysisDto,
} from './dto/FlagIrregularPattern.dto';
import {
  AutoAccrueLeaveDto,
  AccrueAllEmployeesDto,
} from './dto/AutoAccrueLeave.dto';
import { RunCarryForwardDto } from './dto/CarryForward.dto';
import {
  AccrualAdjustmentDto,
  AccrualSuspensionDto,
} from './dto/AccrualAdjustment.dto';
import { DelegateApprovalDto } from './dto/DelegateApproval.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { AccrualMethod } from './enums/accrual-method.enum';

@Controller('leaves')
export class LeaveController {
  // Calendar Endpoints
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  @Post('calendar')
  async createCalendar(@Body() dto: CreateCalendarDto) {
    return await this.leavesService.createCalendar(dto);
  }

  @Get('calendar/:year')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async getCalendar(@Param('year') year: string) {
    return await this.leavesService.getCalendarByYear(Number(year));
  }

  @Put('calendar/:year')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async updateCalendar(
    @Param('year') year: string,
    @Body() dto: CreateCalendarDto,
  ) {
    return await this.leavesService.updateCalendar(Number(year), dto);
  }
  constructor(private readonly leavesService: LeavesService) {}
  //leave policy Endpoints
  @Post('policy')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async createLeavePolicy(@Body() createLeavePolicyDto: CreateLeavePolicyDto) {
    return await this.leavesService.createLeavePolicy(createLeavePolicyDto);
  }

  @Get('policies')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE)
  async getLeavePolicies() {
    return await this.leavesService.getLeavePolicies();
  }

  @Get('policy/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE)
  async getLeavePolicyById(@Param('id') id: string) {
    return await this.leavesService.getLeavePolicyById(id);
  }

  @Put('policy/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async updateLeavePolicy(
    @Param('id') id: string,
    @Body() updateLeavePolicyDto: UpdateLeavePolicyDto,
  ) {
    return await this.leavesService.updateLeavePolicy(id, updateLeavePolicyDto);
  }

  @Delete('policy/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async deleteLeavePolicy(@Param('id') id: string) {
    return await this.leavesService.deleteLeavePolicy(id);
  }

  // Leave Request Endpoints

  @Post('request')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD)
  async createLeaveRequest(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return await this.leavesService.createLeaveRequest(createLeaveRequestDto);
  }

  @Get('request/:id')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
  )
  async getLeaveRequestById(@Param('id') id: string) {
    return await this.leavesService.getLeaveRequestById(id);
  }

  @Put('request/:id')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async updateLeaveRequest(
    @Param('id') id: string,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    return await this.leavesService.updateLeaveRequest(
      id,
      updateLeaveRequestDto,
    );
  }

  @Delete('request/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_ADMIN)
  async deleteLeaveRequest(@Param('id') id: string) {
    return await this.leavesService.deleteLeaveRequest(id);
  }

  // Leave Entitlement Endpoints
  @Post('entitlement')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async createLeaveEntitlement(
    @Body() createLeaveEntitlementDto: CreateLeaveEntitlementDto,
  ) {
    return await this.leavesService.createLeaveEntitlement(
      createLeaveEntitlementDto,
    );
  }

  @Get('entitlement/:employeeId/:leaveTypeId')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD)
  async getLeaveEntitlement(
    @Param('employeeId') employeeId: string,
    @Param('leaveTypeId') leaveTypeId: string,
  ) {
    return await this.leavesService.getLeaveEntitlement(
      employeeId,
      leaveTypeId,
    );
  }

  @Put('entitlement/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async updateLeaveEntitlement(
    @Param('id') id: string,
    @Body() updateLeaveEntitlementDto: UpdateLeaveEntitlementDto,
  ) {
    return await this.leavesService.updateLeaveEntitlement(
      id,
      updateLeaveEntitlementDto,
    );
  }

  // Leave Adjustment Endpoints
  @Post('adjustment')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async createLeaveAdjustment(
    @Body() createLeaveAdjustmentDto: CreateLeaveAdjustmentDto,
  ) {
    return await this.leavesService.createLeaveAdjustment(
      createLeaveAdjustmentDto,
    );
  }

  @Get('adjustment/:employeeId')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD)
  async getLeaveAdjustments(@Param('employeeId') employeeId: string) {
    return await this.leavesService.getLeaveAdjustments(employeeId);
  }

  @Delete('adjustment/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async deleteLeaveAdjustment(@Param('id') id: string) {
    return await this.leavesService.deleteLeaveAdjustment(id);
  }

  // Leave Category Endpoints
  @Post('category')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async createLeaveCategory(
    @Body() createLeaveCategoryDto: CreateLeaveCategoryDto,
  ) {
    return await this.leavesService.createLeaveCategory(createLeaveCategoryDto);
  }

  @Get('categories')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE)
  async getLeaveCategories() {
    return await this.leavesService.getLeaveCategories();
  }

  // Leave Type Endpoints
  @Get('types')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD
  )
  async getLeaveTypes() {
    return await this.leavesService.getLeaveTypes();
  }

  @Get('type/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE)
  async getLeaveTypeById(@Param('id') id: string) {
    return await this.leavesService.getLeaveTypeById(id);
  }

  @Post('type')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async createLeaveType(@Body() createLeaveTypeDto: CreateLeaveTypeDto) {
    return await this.leavesService.createLeaveType(createLeaveTypeDto);
  }

  @Put('type/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async updateLeaveType(
    @Param('id') id: string,
    @Body() updateLeaveTypeDto: UpdateLeaveTypeDto,
  ) {
    return await this.leavesService.updateLeaveType(id, updateLeaveTypeDto);
  }

  @Delete('type/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN, SystemRole.LEGAL_POLICY_ADMIN)
  async deleteLeaveType(@Param('id') id: string) {
    return await this.leavesService.deleteLeaveType(id);
  }

  // Phase 2: Leave Request Approval Endpoints
  @UseGuards(RolesGuard) // Apply authentication guard (delegation and role validation checked in service)
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  @Post('request/:id/approve')
  async approveLeaveRequest(
    @Param('id') id: string,
    @Body() approveLeaveRequestDto: ApproveLeaveRequestDto,
    @Req() req: any,
  ) {
    return this.leavesService.approveLeaveRequest(
      approveLeaveRequestDto,
      req.user.userId || req.user._id || req.user.id,
      id,
    );
  }

  @Post('request/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async rejectLeaveRequest(
    @Param('id') id: string,
    @Body() rejectLeaveRequestDto: RejectLeaveRequestDto,
    @Req() req: any,
  ) {
    return await this.leavesService.rejectLeaveRequest(
      rejectLeaveRequestDto,
      req.user.userId || req.user._id || req.user.id,
      id,
    );
  }

  // @Get('pending/:managerId')
  // @UseGuards(RolesGuard)
  // @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  // async getPendingRequestsForManager(@Param('managerId') managerId: string) {
  //   return await this.leavesService.getPendingRequestsForManager(managerId);
  // }

  // Phase 2: HR Manager Endpoints

  @Post('request/finalize')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async finalizeLeaveRequest(
    @Body() finalizeDto: FinalizeLeaveRequestDto,
    @Req() req: any,
  ) {
    return await this.leavesService.finalizeLeaveRequest(
      finalizeDto.leaveRequestId,
      req.user.userId || req.user._id || req.user.id,
    );
  }

  @Post('request/override')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async hrOverrideDecision(@Body() overrideDto: HrOverrideDecisionDto) {
    return await this.leavesService.hrOverrideDecision(
      overrideDto.leaveRequestId,
      overrideDto.hrUserId,
      overrideDto.overrideToApproved,
      overrideDto.overrideReason,
    );
  }

  @Post('request/process-multiple')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async processMultipleLeaveRequests(
    @Body() processDto: ProcessMultipleRequestsDto,
  ) {
    return await this.leavesService.processMultipleLeaveRequests(
      processDto.leaveRequestIds,
      processDto.hrUserId,
      processDto.approved,
    );
  }

  // Phase 2: Employee Endpoints

  @Get('balance/:employeeId')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  async getEmployeeLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return await this.leavesService.getEmployeeLeaveBalance(
      employeeId,
      leaveTypeId,
    );
  }

  @Post('request/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.HR_ADMIN)
  async cancelLeaveRequest(@Param('id') id: string) {
    return await this.leavesService.cancelLeaveRequest(id);
  }

  // REQ-031: Get detailed leave balance
  @Get('balance-details/:employeeId')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  async getLeaveBalanceDetails(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return await this.leavesService.getEmployeeLeaveBalance(
      employeeId,
      leaveTypeId,
    );
  }

  // REQ-032: Get past leave requests
  @Get('past-requests/:employeeId')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  async getPastLeaveRequests(
    @Param('employeeId') employeeId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('status') status?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return await this.leavesService.getPastLeaveRequests(employeeId, {
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      status,
      leaveTypeId,
    });
  }

  // REQ-033: Filter leave history
  @Post('filter-history')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  async filterLeaveHistory(@Body() filterDto: FilterLeaveHistoryDto) {
    return await this.leavesService.filterLeaveHistory(
      filterDto.employeeId,
      filterDto,
    );
  }

  // REQ-034: View team leave balances and upcoming leaves
  @Get('team-balances/:managerId')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async getTeamLeaveBalances(
    @Param('managerId') managerId: string,
    @Query('upcomingFromDate') upcomingFromDate?: string,
    @Query('upcomingToDate') upcomingToDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return await this.leavesService.getTeamLeaveBalances(
      managerId,
      upcomingFromDate ? new Date(upcomingFromDate) : undefined,
      upcomingToDate ? new Date(upcomingToDate) : undefined,
      departmentId,
    );
  }

  // REQ-035: Filter team leave data
  @Post('filter-team-data')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async filterTeamLeaveData(@Body() filterDto: FilterTeamLeaveDataDto) {
    return await this.leavesService.filterTeamLeaveData(
      filterDto.managerId,
      filterDto,
    );
  }

  // REQ-039: Flag irregular pattern
  @Post('flag-irregular-pattern')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async flagIrregularPattern(@Body() flagDto: FlagIrregularPatternDto) {
    return await this.leavesService.flagIrregularPattern(
      flagDto.leaveRequestId,
      flagDto.managerId,
      flagDto.flagReason,
      flagDto.notes,
    );
  }

  // REQ-040: Auto accrue leave for single employee
  @Post('auto-accrue')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async autoAccrueLeave(@Body() accrueDto: AutoAccrueLeaveDto) {
    return await this.leavesService.autoAccrueLeave(
      accrueDto.employeeId,
      accrueDto.leaveTypeId,
      accrueDto.accrualAmount,
      accrueDto.accrualType,
      accrueDto.policyId,
      accrueDto.notes,
    );
  }

  // REQ-040: Auto accrue leave for all employees
  @Post('auto-accrue-all')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async autoAccrueAllEmployees(@Body() accrueAllDto: AccrueAllEmployeesDto) {
    return await this.leavesService.autoAccrueAllEmployees(
      accrueAllDto.leaveTypeId,
      accrueAllDto.accrualAmount,
      accrueAllDto.accrualType,
      accrueAllDto.departmentId,
    );
  }

  // REQ-041: Run carry-forward
  @Post('carry-forward')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async runCarryForward(@Body() carryForwardDto: RunCarryForwardDto) {
    return await this.leavesService.runCarryForward(
      carryForwardDto.leaveTypeId,
      carryForwardDto.employeeId,
      carryForwardDto.asOfDate,
      carryForwardDto.departmentId,
    );
  }

  // REQ-042: Adjust accruals
  @Post('adjust-accrual')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async adjustAccrual(@Body() adjustmentDto: AccrualAdjustmentDto) {
    return await this.leavesService.adjustAccrual(
      adjustmentDto.employeeId,
      adjustmentDto.leaveTypeId,
      adjustmentDto.adjustmentType,
      adjustmentDto.adjustmentAmount,
      adjustmentDto.fromDate,
      adjustmentDto.toDate,
      adjustmentDto.reason,
      adjustmentDto.notes,
    );
  }

  @Post('entitlement/:employeeId/:leaveTypeId/personalized')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_ADMIN)
  async assignPersonalizedEntitlement(
    @Param('employeeId') employeeId: string,
    @Param('leaveTypeId') leaveTypeId: string,
    @Body('personalizedEntitlement') personalizedEntitlement: number,
  ) {
    return await this.leavesService.assignPersonalizedEntitlement(
      employeeId,
      leaveTypeId,
      personalizedEntitlement,
    );
  }
  // Endpoint to reset leave balances for the new year
  @Post('reset-leave-balances')
  @UseGuards(RolesGuard) // Ensure the user has the required roles
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN) // Only HR Managers and HR Admins can access
  async resetLeaveBalancesForNewYear(
    @Body()
    body: {
      criterion?:
        | 'HIRE_DATE'
        | 'FIRST_VACATION_DATE'
        | 'REVISED_HIRE_DATE'
        | 'WORK_RECEIVING_DATE';
    },
  ) {
    const { criterion = 'HIRE_DATE' } = body;

    try {
      await this.leavesService.resetLeaveBalancesForNewYear(criterion);
      return { message: 'Leave balances reset successfully for the new year.' };
    } catch (error) {
      return { message: 'Error resetting leave balances.' };
    }
  }

  // Phase 2: REQ-023 - Delegate approval authority
  @Post('delegate')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async delegateApprovalAuthority(
    @Body() delegateDto: DelegateApprovalDto,
    @Req() req: any,
  ) {
    return await this.leavesService.delegateApprovalAuthority(
      req.user.userId || req.user._id || req.user.id,
      delegateDto.delegateId,
      delegateDto.startDate,
      delegateDto.endDate,
    );
  }

  // NEW CODE: Upload attachment for leave request
  @Post('attachment/upload')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './src/leaves/uploads/attachments',
        filename: (req, file, cb) => {
          const fileExtension = file.originalname.split('.').pop();
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const filename = `${uniqueSuffix}.${fileExtension}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req: any, file: any, cb: any) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.leavesService.uploadAttachment(file);
  }

  // NEW CODE: Download attachment
  @Get('attachments/:id/download')
  @UseGuards(RolesGuard)
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
  )
  async downloadAttachment(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const attachment = await this.leavesService.getAttachmentById(id);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const filePath = attachment.filePath;
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    res.setHeader('Content-Type', attachment.fileType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.originalName}"`,
    );
    return res.sendFile(path.resolve(filePath));
  }

  // NEW CODE: Verify document
  @Post('request/:id/verify-document')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER)
  async verifyDocument(
    @Param('id') id: string,
    @Body() body: { verified: boolean; verificationNotes?: string },
    @Req() req: any,
  ) {
    const hrUserId = req.user.userId || req.user._id || req.user.id;
    return await this.leavesService.verifyDocument(
      id,
      hrUserId,
      body.verificationNotes,
    );
  }

  // NEW CODE: Reject document
  @Post('request/:id/reject-document')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.HR_MANAGER)
  async rejectDocument(
    @Param('id') id: string,
    @Body() body: { verified: boolean; rejectionReason: string },
    @Req() req: any,
  ) {
    const hrUserId = req.user.userId || req.user._id || req.user.id;
    return await this.leavesService.rejectDocument(
      id,
      hrUserId,
      body.rejectionReason,
    );
  }
}
