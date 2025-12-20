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
import { PolicyConfigService } from '../services/policy-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';
// Import DTOs
import {
  CreateOvertimeRuleDto,
  UpdateOvertimeRuleDto,
  CreateLatenessRuleDto,
  UpdateLatenessRuleDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  GetHolidaysDto,
  GetPoliciesDto,
  CheckHolidayDto,
  ValidateAttendanceHolidayDto,
} from '../DTOs/policy-config.dtos';

@Controller('policy-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PolicyConfigController {
  constructor(private readonly policyConfigService: PolicyConfigService) {}

  // ===== OVERTIME RULES (BR-TM-10: HR Manager only) =====
  @Post('overtime')
  @Roles(SystemRole.HR_MANAGER)
  async createOvertimeRule(
    @Body() createOvertimeRuleDto: CreateOvertimeRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.createOvertimeRule(
      createOvertimeRuleDto,
      user.userId,
    );
  }

  @Get('overtime')
  @Roles(SystemRole.HR_MANAGER)
  async getOvertimeRules(
    @Query() getPoliciesDto: GetPoliciesDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.getOvertimeRules(
      getPoliciesDto,
      user.userId,
    );
  }

  @Get('overtime/:id')
  @Roles(SystemRole.HR_MANAGER)
  async getOvertimeRuleById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.policyConfigService.getOvertimeRuleById(id, user.userId);
  }

  @Put('overtime/:id')
  @Roles(SystemRole.HR_MANAGER)
  async updateOvertimeRule(
    @Param('id') id: string,
    @Body() updateOvertimeRuleDto: UpdateOvertimeRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.updateOvertimeRule(
      id,
      updateOvertimeRuleDto,
      user.userId,
    );
  }

  @Delete('overtime/:id')
  @Roles(SystemRole.HR_MANAGER)
  async deleteOvertimeRule(@Param('id') id: string, @CurrentUser() user: any) {
    return this.policyConfigService.deleteOvertimeRule(id, user.userId);
  }

  // ===== US10: OVERTIME & SHORT TIME CONFIGURATION (BR-TM-08) =====

  /**
   * US10: Get applicable overtime rules for a specific date
   * BR-TM-08: Return different rules based on weekday/weekend/holiday
   */
  @Get('overtime/applicable/:date')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getApplicableOvertimeRules(
    @Param('date') date: string,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.getApplicableOvertimeRules(
      new Date(date),
      user.userId,
    );
  }

  /**
   * US10: Calculate overtime for attendance record
   * BR-TM-08: Apply multipliers (1.5x regular, 2x weekend, 2.5x holiday)
   */
  @Post('overtime/calculate')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async calculateOvertimeForAttendance(
    @Body()
    body: {
      attendanceRecordId: string;
      totalWorkMinutes: number;
      standardWorkMinutes?: number;
      date: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.calculateOvertimeForAttendance(
      {
        attendanceRecordId: body.attendanceRecordId,
        totalWorkMinutes: body.totalWorkMinutes,
        standardWorkMinutes: body.standardWorkMinutes,
        date: new Date(body.date),
      },
      user.userId,
    );
  }

  /**
   * US10: Get short-time (undertime) configuration
   * BR-TM-08: Returns minimum hours threshold and deduction policies
   */
  @Get('shorttime/config')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getShortTimeConfig(@CurrentUser() user: any) {
    return this.policyConfigService.getShortTimeConfig(user.userId);
  }

  /**
   * US10: Calculate short-time (undertime) for attendance
   * BR-TM-08: Calculate undertime hours and deduction amounts
   */
  @Post('shorttime/calculate')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async calculateShortTimeForAttendance(
    @Body()
    body: {
      attendanceRecordId: string;
      totalWorkMinutes: number;
      standardWorkMinutes?: number;
      date: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.calculateShortTimeForAttendance(
      {
        attendanceRecordId: body.attendanceRecordId,
        totalWorkMinutes: body.totalWorkMinutes,
        standardWorkMinutes: body.standardWorkMinutes,
        date: new Date(body.date),
      },
      user.userId,
    );
  }

  /**
   * US10: Validate overtime pre-approval requirement
   * BR-TM-08: Check if overtime requires pre-approval and validate existing approvals
   */
  @Post('overtime/validate-preapproval')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.DEPARTMENT_HEAD,
  )
  async validateOvertimePreApproval(
    @Body()
    body: {
      employeeId: string;
      date: string;
      expectedOvertimeMinutes: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.validateOvertimePreApproval(
      {
        employeeId: body.employeeId,
        date: new Date(body.date),
        expectedOvertimeMinutes: body.expectedOvertimeMinutes,
      },
      user.userId,
    );
  }

  /**
   * US10: Get overtime limits configuration
   * BR-TM-08: Returns daily, weekly, and monthly overtime caps
   */
  @Get('overtime/limits/config')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getOvertimeLimitsConfig(@CurrentUser() user: any) {
    return this.policyConfigService.getOvertimeLimitsConfig(user.userId);
  }

  /**
   * US10: Check overtime against limits
   * BR-TM-08: Enforce daily, weekly, monthly overtime caps with soft/hard thresholds
   */
  @Post('overtime/limits/check')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.DEPARTMENT_HEAD,
  )
  async checkOvertimeLimits(
    @Body()
    body: {
      employeeId: string;
      currentOvertimeMinutes: number;
      period: 'daily' | 'weekly' | 'monthly';
      additionalOvertimeMinutes?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.checkOvertimeLimits(
      {
        employeeId: body.employeeId,
        currentOvertimeMinutes: body.currentOvertimeMinutes,
        period: body.period,
        additionalOvertimeMinutes: body.additionalOvertimeMinutes,
      },
      user.userId,
    );
  }

  /**
   * US10: Get comprehensive overtime & short-time policy summary
   * BR-TM-08: Full policy details including rules, limits, and configurations
   */
  @Get('overtime-shorttime/summary')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getOvertimeShortTimePolicySummary(@CurrentUser() user: any) {
    return this.policyConfigService.getOvertimeShortTimePolicySummary(
      user.userId,
    );
  }

  // ===== LATENESS RULES (BR-TM-11: HR Manager only) =====
  @Post('lateness')
  @Roles(SystemRole.HR_MANAGER)
  async createLatenessRule(
    @Body() createLatenessRuleDto: CreateLatenessRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.createLatenessRule(
      createLatenessRuleDto,
      user.userId,
    );
  }

  @Get('lateness')
  @Roles(SystemRole.HR_MANAGER)
  async getLatenessRules(
    @Query() getPoliciesDto: GetPoliciesDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.getLatenessRules(
      getPoliciesDto,
      user.userId,
    );
  }

  @Get('lateness/:id')
  @Roles(SystemRole.HR_MANAGER)
  async getLatenessRuleById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.policyConfigService.getLatenessRuleById(id, user.userId);
  }

  @Put('lateness/:id')
  @Roles(SystemRole.HR_MANAGER)
  async updateLatenessRule(
    @Param('id') id: string,
    @Body() updateLatenessRuleDto: UpdateLatenessRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.updateLatenessRule(
      id,
      updateLatenessRuleDto,
      user.userId,
    );
  }

  @Delete('lateness/:id')
  @Roles(SystemRole.HR_MANAGER)
  async deleteLatenessRule(@Param('id') id: string, @CurrentUser() user: any) {
    return this.policyConfigService.deleteLatenessRule(id, user.userId);
  }

  // ===== US11: LATENESS & PENALTY RULES (BR-TM-09) =====

  /**
   * US11: Get lateness thresholds configuration
   * BR-TM-09: Return grace periods, penalty thresholds, and escalation rules
   */
  @Get('lateness/thresholds/config')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getLatenessThresholdsConfig(@CurrentUser() user: any) {
    return this.policyConfigService.getLatenessThresholdsConfig(user.userId);
  }

  /**
   * US11: Calculate lateness for attendance record
   * BR-TM-09: Apply grace period and determine category/deduction
   */
  @Post('lateness/calculate')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async calculateLatenessForAttendance(
    @Body()
    body: {
      attendanceRecordId: string;
      scheduledStartMinutes: number;
      actualArrivalMinutes: number;
      gracePeriodMinutes?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.calculateLatenessForAttendance(
      {
        attendanceRecordId: body.attendanceRecordId,
        scheduledStartMinutes: body.scheduledStartMinutes,
        actualArrivalMinutes: body.actualArrivalMinutes,
        gracePeriodMinutes: body.gracePeriodMinutes,
      },
      user.userId,
    );
  }

  /**
   * US11: Check if lateness requires escalation
   * BR-TM-09: Penalty thresholds and escalation rules
   */
  @Post('lateness/check-escalation')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async checkLatenessEscalation(
    @Body()
    body: {
      employeeId: string;
      currentLatenessMinutes: number;
      periodDays?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.checkLatenessEscalation(
      {
        employeeId: body.employeeId,
        currentLatenessMinutes: body.currentLatenessMinutes,
        periodDays: body.periodDays,
      },
      user.userId,
    );
  }

  /**
   * US11: Apply automatic lateness deduction
   * BR-TM-09: Apply penalties fairly and consistently
   */
  @Post('lateness/apply-deduction')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async applyLatenessDeduction(
    @Body()
    body: {
      employeeId: string;
      attendanceRecordId: string;
      latenessMinutes: number;
      latenessRuleId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.applyLatenessDeduction(
      {
        employeeId: body.employeeId,
        attendanceRecordId: body.attendanceRecordId,
        latenessMinutes: body.latenessMinutes,
        latenessRuleId: body.latenessRuleId,
      },
      user.userId,
    );
  }

  /**
   * US11: Get comprehensive lateness & penalty summary
   * BR-TM-09: Full penalty configuration for HR review
   */
  @Get('lateness/penalty-summary')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getLatenesPenaltySummary(@CurrentUser() user: any) {
    return this.policyConfigService.getLatenesPenaltySummary(user.userId);
  }

  /**
   * US11: Calculate early leave penalty
   * BR-TM-09: Early leave follows same penalty rules as lateness
   */
  @Post('lateness/early-leave/calculate')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async calculateEarlyLeavePenalty(
    @Body()
    body: {
      attendanceRecordId: string;
      scheduledEndMinutes: number;
      actualDepartureMinutes: number;
      gracePeriodMinutes?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.calculateEarlyLeavePenalty(
      {
        attendanceRecordId: body.attendanceRecordId,
        scheduledEndMinutes: body.scheduledEndMinutes,
        actualDepartureMinutes: body.actualDepartureMinutes,
        gracePeriodMinutes: body.gracePeriodMinutes,
      },
      user.userId,
    );
  }

  // ===== HOLIDAYS =====
  @Post('holiday')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createHoliday(
    @Body() createHolidayDto: CreateHolidayDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.createHoliday(
      createHolidayDto,
      user.userId,
    );
  }

  @Get('holiday')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getHolidays(
    @Query() getHolidaysDto: GetHolidaysDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.getHolidays(getHolidaysDto, user.userId);
  }

  @Get('holiday/upcoming')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getUpcomingHolidays(
    @Query('days') days?: number,
    @CurrentUser() user?: any,
  ) {
    return this.policyConfigService.getUpcomingHolidays(
      days || 30,
      user?.userId,
    );
  }

  @Get('holiday/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getHolidayById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.policyConfigService.getHolidayById(id, user.userId);
  }

  @Put('holiday/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updateHoliday(
    @Param('id') id: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.updateHoliday(
      id,
      updateHolidayDto,
      user.userId,
    );
  }

  @Delete('holiday/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async deleteHoliday(@Param('id') id: string, @CurrentUser() user: any) {
    return this.policyConfigService.deleteHoliday(id, user.userId);
  }

  // ===== US17: HOLIDAY & REST DAY CONFIGURATION (BR-TM-19) =====

  /**
   * US17: Configure weekly rest days
   * BR-TM-19: Weekly rest days must be linked to shift schedules
   */
  @Post('rest-days/configure')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async configureWeeklyRestDays(
    @Body() body: {
      restDays: number[];
      effectiveFrom?: Date;
      effectiveTo?: Date;
      departmentId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.configureWeeklyRestDays(
      {
        restDays: body.restDays,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
        departmentId: body.departmentId,
      },
      user.userId,
    );
  }

  /**
   * US17: Check if a date is a rest day
   * BR-TM-19: Rest day checking for penalty suppression
   */
  @Post('rest-days/check')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async checkRestDay(
    @Body() body: {
      date: Date;
      restDays?: number[];
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.checkRestDay(
      {
        date: new Date(body.date),
        restDays: body.restDays,
      },
      user.userId,
    );
  }

  /**
   * US17: Bulk create holidays
   * BR-TM-19: Annual holiday calendar setup
   */
  @Post('holiday/bulk')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async bulkCreateHolidays(
    @Body() body: {
      holidays: Array<{
        name: string;
        type: string;
        startDate: Date;
        endDate?: Date;
      }>;
      year?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.bulkCreateHolidays(
      {
        holidays: body.holidays.map(h => ({
          ...h,
          startDate: new Date(h.startDate),
          endDate: h.endDate ? new Date(h.endDate) : undefined,
        })),
        year: body.year,
      },
      user.userId,
    );
  }

  /**
   * US17: Get holiday calendar
   * BR-TM-19: View all holidays and rest days for planning
   */
  @Get('holiday/calendar')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async getHolidayCalendar(
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('includeRestDays') includeRestDays?: string,
    @CurrentUser() user?: any,
  ) {
    return this.policyConfigService.getHolidayCalendar(
      {
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        includeRestDays: includeRestDays !== 'false',
      },
      user?.userId,
    );
  }

  /**
   * US17: Check penalty suppression for a date
   * BR-TM-19: Comprehensive holiday/rest day check
   */
  @Post('penalty-suppression/check')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async checkPenaltySuppression(
    @Body() body: {
      employeeId: string;
      date: Date;
      restDays?: number[];
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.checkPenaltySuppression(
      {
        employeeId: body.employeeId,
        date: new Date(body.date),
        restDays: body.restDays,
      },
      user.userId,
    );
  }

  /**
   * US17: Link holidays to shift
   * BR-TM-19: Holidays must be linked to shift schedules
   */
  @Post('holiday/link-to-shift')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async linkHolidaysToShift(
    @Body() body: {
      shiftId: string;
      holidayIds: string[];
      action: 'NO_WORK' | 'OPTIONAL' | 'OVERTIME_ELIGIBLE';
    },
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.linkHolidaysToShift(
      {
        shiftId: body.shiftId,
        holidayIds: body.holidayIds,
        action: body.action,
      },
      user.userId,
    );
  }

  /**
   * US17: Get employee holiday schedule
   * BR-TM-19: Employee-specific holiday view
   */
  @Get('holiday/employee-schedule/:employeeId')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getEmployeeHolidaySchedule(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.getEmployeeHolidaySchedule(
      {
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      user.userId,
    );
  }

  // ===== HOLIDAY VALIDATION =====
  @Post('holiday/check')
  @Roles(
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async checkHoliday(
    @Body() checkHolidayDto: CheckHolidayDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.checkHoliday(checkHolidayDto, user.userId);
  }

  @Post('holiday/validate-attendance')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.PAYROLL_SPECIALIST,
  )
  async validateAttendanceHoliday(
    @Body() validateAttendanceHolidayDto: ValidateAttendanceHolidayDto,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.validateAttendanceHoliday(
      validateAttendanceHolidayDto,
      user.userId,
    );
  }

  // ===== PERMISSION POLICIES (HR_ADMIN only) =====
  @Post('permission-policy')
  @Roles(SystemRole.HR_ADMIN)
  async createPermissionPolicy(
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    try {
      const policy = await this.policyConfigService.createPermissionPolicy(body, user.userId);
      return {
        message: 'Permission policy created successfully',
        data: policy,
      };
    } catch (error: any) {
      console.error('[PermissionPolicy Controller] Create error:', error);
      throw error;
    }
  }

  @Get('permission-policy')
  @Roles(SystemRole.HR_ADMIN)
  async getPermissionPolicies(@CurrentUser() user: any) {
    try {
      const policies = await this.policyConfigService.getPermissionPolicies(user.userId);
      return policies;
    } catch (error: any) {
      console.error('[PermissionPolicy Controller] Get all error:', error);
      throw error;
    }
  }

  @Get('permission-policy/:id')
  @Roles(SystemRole.HR_ADMIN)
  async getPermissionPolicyById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.getPermissionPolicyById(id, user.userId);
  }

  @Put('permission-policy/:id')
  @Roles(SystemRole.HR_ADMIN)
  async updatePermissionPolicy(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.updatePermissionPolicy(id, body, user.userId);
  }

  @Delete('permission-policy/:id')
  @Roles(SystemRole.HR_ADMIN)
  async deletePermissionPolicy(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.policyConfigService.deletePermissionPolicy(id, user.userId);
  }
}
