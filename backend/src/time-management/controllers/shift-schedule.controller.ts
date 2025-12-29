import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShiftScheduleService } from '../services/shift-schedule.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';
import { ShiftAssignmentStatus } from '../models/enums';
// Import DTOs from DTOs folder
import {
  CreateShiftTypeDto,
  CreateShiftDto,
  AssignShiftToEmployeeDto,
  AssignShiftToDepartmentDto,
  AssignShiftToPositionDto,
  UpdateShiftDto,
  UpdateShiftAssignmentDto,
  RenewShiftAssignmentDto,
  CancelShiftAssignmentDto,
  PostponeShiftAssignmentDto,
  ReassignShiftAssignmentDto,
  CreateScheduleRuleDto,
  DefineFlexibleSchedulingRulesDto,
} from '../DTOs/shift.dtos';

@Controller('shift-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftAndScheduleController {
  constructor(private readonly shiftScheduleService: ShiftScheduleService) {}

  // ===== Shift Type Management =====
  @Post('shift/type')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async createShiftType(
    @Body() createShiftTypeDto: CreateShiftTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.createShiftType(
      createShiftTypeDto,
      user.userId,
    );
  }

  @Get('shift/types')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getShiftTypes(@Query('active') active?: string) {
    const filters = active !== undefined ? { active: active === 'true' } : undefined;
    return this.shiftScheduleService.getShiftTypes(filters);
  }

  @Get('shift/type/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getShiftTypeById(@Param('id') id: string) {
    return this.shiftScheduleService.getShiftTypeById(id);
  }

  @Put('shift/type/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async updateShiftType(
    @Param('id') id: string,
    @Body() updateShiftTypeDto: CreateShiftTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.updateShiftType(id, updateShiftTypeDto, user.userId);
  }

  @Delete('shift/type/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async deleteShiftType(@Param('id') id: string) {
    return this.shiftScheduleService.deleteShiftType(id);
  }

  // ===== Shift Management =====
  @Post('shift')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async createShift(
    @Body() createShiftDto: CreateShiftDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.createShift(createShiftDto, user.userId);
  }

  @Get('shifts')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getShifts(
    @Query('active') active?: string,
    @Query('shiftType') shiftType?: string,
  ) {
    const filters: any = {};
    if (active !== undefined) {
      filters.active = active === 'true';
    }
    if (shiftType) {
      filters.shiftType = shiftType;
    }
    return this.shiftScheduleService.getShifts(filters);
  }

  @Get('shifts/type/:shiftTypeId')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getShiftsByType(@Param('shiftTypeId') shiftTypeId: string) {
    return this.shiftScheduleService.getShiftsByType(shiftTypeId);
  }

  // ===== Shift Assignment Management =====
  // IMPORTANT: These specific routes MUST come before the generic shift/:id route
  // to prevent route conflicts (e.g., "assignments" being matched as an ID)

  // ===== NEW: Get All Shift Assignments with Filters =====
  @Get('shift/assignments')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD)
  async getAllShiftAssignments(
    @Query('status') status?: ShiftAssignmentStatus,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('positionId') positionId?: string,
    @Query('shiftId') shiftId?: string,
  ) {
    return this.shiftScheduleService.getAllShiftAssignments({
      status,
      employeeId,
      departmentId,
      positionId,
      shiftId,
    });
  }

  // ===== NEW: Get Shift Assignment by ID =====
  @Get('shift/assignment/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
  async getShiftAssignmentById(@Param('id') id: string) {
    return this.shiftScheduleService.getShiftAssignmentById(id);
  }

  // ===== NEW: Get Employee Shift Assignments =====
  @Get('shift/assignments/employee/:employeeId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
  async getEmployeeShiftAssignments(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.getEmployeeShiftAssignments(employeeId, user.userId);
  }

  // ===== NEW: Get Department Shift Assignments =====
  @Get('shift/assignments/department/:departmentId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD)
  async getDepartmentShiftAssignments(@Param('departmentId') departmentId: string) {
    return this.shiftScheduleService.getDepartmentShiftAssignments(departmentId);
  }

  // ===== NEW: Get Position Shift Assignments =====
  @Get('shift/assignments/position/:positionId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD)
  async getPositionShiftAssignments(@Param('positionId') positionId: string) {
    return this.shiftScheduleService.getPositionShiftAssignments(positionId);
  }

  // ===== NEW: Get Shift Assignment Status =====
  @Get('shift/assignment/:id/status')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
  async getShiftAssignmentStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.getShiftAssignmentStatus(id, user.userId);
  }

  @Post('shift/assign')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async assignShiftToEmployee(
    @Body() assignShiftToEmployeeDto: AssignShiftToEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.assignShiftToEmployee(
      assignShiftToEmployeeDto,
      user.userId,
    );
  }

  // ===== NEW: Assign Shift to Department =====
  @Post('shift/assign/department')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async assignShiftToDepartment(
    @Body() dto: AssignShiftToDepartmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.assignShiftToDepartment(dto, user.userId);
  }

  // ===== NEW: Assign Shift to Position =====
  @Post('shift/assign/position')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async assignShiftToPosition(
    @Body() dto: AssignShiftToPositionDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.assignShiftToPosition(dto, user.userId);
  }

  // ===== NEW: Update Shift Assignment =====
  @Put('shift/assignment/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async updateShiftAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateShiftAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.updateShiftAssignment(id, dto, user.userId);
  }

  // ===== Generic Shift Routes (must come AFTER specific routes) =====
  @Get('shift/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
  async getShiftById(@Param('id') id: string) {
    return this.shiftScheduleService.getShiftById(id);
  }

  @Put('shift/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async updateShift(
    @Param('id') id: string,
    @Body() updateShiftDto: UpdateShiftDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.updateShift(
      id,
      updateShiftDto,
      user.userId,
    );
  }

  @Delete('shift/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async deleteShift(@Param('id') id: string) {
    return this.shiftScheduleService.deleteShift(id);
  }

  // ===== NEW: Renew Shift Assignment =====
  @Post('shift/assignment/renew')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async renewShiftAssignment(
    @Body() dto: RenewShiftAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.renewShiftAssignment(dto, user.userId);
  }

  // ===== NEW: Cancel Shift Assignment =====
  @Post('shift/assignment/cancel')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async cancelShiftAssignment(
    @Body() dto: CancelShiftAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.cancelShiftAssignment(dto, user.userId);
  }

  // ===== NEW: Postpone Shift Assignment =====
  @Post('shift/assignment/postpone')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async postponeShiftAssignment(
    @Body() dto: PostponeShiftAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.postponeShiftAssignment(dto, user.userId);
  }

  // ===== NEW: Reassign Shift Assignment =====
  @Post('shift/assignment/reassign')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async reassignShiftAssignment(
    @Body() dto: ReassignShiftAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.reassignShiftAssignment(
      dto.assignmentId,
      dto.newEmployeeId,
      user.userId,
    );
  }

  // ===== NEW: Check and Update Expired Assignments =====
  @Post('shift/assignments/check-expired')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async checkExpiredAssignments() {
    return this.shiftScheduleService.checkExpiredAssignments();
  }

  // ===== US3: Custom Scheduling Rules =====
  // BR-TM-04: Support multiple shift types with start/end dates
  // BR-TM-10: Support multiple punches per day, or first in/last out
  // BR-TM-03: Shift types support with dates
  // BR-TM-05: Assignable by Department, Position, or Individual

  @Post('schedule')
  @Roles(SystemRole.HR_MANAGER)
  async createScheduleRule(
    @Body() createScheduleRuleDto: CreateScheduleRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.createScheduleRule(
      createScheduleRuleDto,
      user.userId,
    );
  }

  @Get('schedules')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getScheduleRules(@Query('active') active?: string) {
    const filters = active !== undefined ? { active: active === 'true' } : undefined;
    return this.shiftScheduleService.getScheduleRules(filters);
  }

  @Get('schedule/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getScheduleRuleById(@Param('id') id: string) {
    return this.shiftScheduleService.getScheduleRuleById(id);
  }

  @Put('schedule/:id')
  @Roles(SystemRole.HR_MANAGER)
  async updateScheduleRule(
    @Param('id') id: string,
    @Body() updateScheduleRuleDto: CreateScheduleRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.updateScheduleRule(id, updateScheduleRuleDto, user.userId);
  }

  @Delete('schedule/:id')
  @Roles(SystemRole.HR_MANAGER)
  async deleteScheduleRule(@Param('id') id: string) {
    return this.shiftScheduleService.deleteScheduleRule(id);
  }

  @Post('schedule/flexible')
  @Roles(SystemRole.HR_MANAGER)
  async defineFlexibleSchedulingRules(
    @Body() defineFlexibleSchedulingRulesDto: DefineFlexibleSchedulingRulesDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.defineFlexibleSchedulingRules(
      defineFlexibleSchedulingRulesDto,
      user.userId,
    );
  }

  @Post('schedule/validate')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async validateScheduleRule(
    @Body() body: { scheduleRuleId: string; assignmentDate?: Date },
  ) {
    return this.shiftScheduleService.validateScheduleRule(
      body.scheduleRuleId,
      body.assignmentDate ? new Date(body.assignmentDate) : undefined,
    );
  }

  @Post('schedule/apply-to-assignment')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  async applyScheduleRuleToShiftAssignment(
    @Body() body: { shiftAssignmentId: string; scheduleRuleId: string },
    @CurrentUser() user: any,
  ) {
    return this.shiftScheduleService.applyScheduleRuleToShiftAssignment(
      body.shiftAssignmentId,
      body.scheduleRuleId,
      user.userId,
    );
  }

  @Get('schedule/:id/assignments')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD)
  async getShiftAssignmentsByScheduleRule(@Param('id') id: string) {
    return this.shiftScheduleService.getShiftAssignmentsByScheduleRule(id);
  }

  @Post('schedule/check-working-day')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
  async isWorkingDayPerScheduleRule(
    @Body() body: { scheduleRuleId: string; checkDate: Date; cycleStartDate?: Date },
  ) {
    return this.shiftScheduleService.isWorkingDayPerScheduleRule(
      body.scheduleRuleId,
      new Date(body.checkDate),
      body.cycleStartDate ? new Date(body.cycleStartDate) : undefined,
    );
  }
}
