import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NotificationLogSchema,
  NotificationLog,
} from './models/notification-log.schema';
import {
  AttendanceCorrectionRequestSchema,
  AttendanceCorrectionRequest,
} from './models/attendance-correction-request.schema';
import { ShiftTypeSchema, ShiftType } from './models/shift-type.schema';
import {
  ScheduleRuleSchema,
  ScheduleRule,
} from './models/schedule-rule.schema';
import {
  AttendanceRecordSchema,
  AttendanceRecord,
} from './models/attendance-record.schema';
import {
  TimeExceptionSchema,
  TimeException,
} from './models/time-exception.schema';
import { ShiftSchema, Shift } from './models/shift.schema';
import {
  ShiftAssignmentSchema,
  ShiftAssignment,
} from './models/shift-assignment.schema';
import {
  OvertimeRuleSchema,
  OvertimeRule,
} from './models/overtime-rule.schema';
import {
  latenessRuleSchema,
  LatenessRule,
} from './models/lateness-rule.schema';
import { HolidaySchema, Holiday } from './models/holiday.schema';
import {
  EmployeeProfileSchema,
  EmployeeProfile,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRoleSchema,
  EmployeeSystemRole,
} from '../employee-profile/models/employee-system-role.schema';
import {
  LeaveRequestSchema,
  LeaveRequest,
} from '../leaves/models/leave-request.schema';

// ===== CONSOLIDATED CONTROLLERS =====
import { TimeManagementController } from './controllers/time-management.controller';
import { ShiftAndScheduleController } from './controllers/shift-schedule.controller';
import { NotificationAndSyncController } from './controllers/notification.controller';
import { PolicyConfigController } from './controllers/policy-config.controller';

// ===== SERVICES =====
import { TimeManagementService } from './services/time-management.service';
import { ShiftScheduleService } from './services/shift-schedule.service';
import { NotificationService } from './services/notification.service';
import { PolicyConfigService } from './services/policy-config.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { LeavesModule } from '../leaves/leaves.module';
import { PayrollExecutionModule } from '../payroll-execution/payroll-execution.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayrollConfigurationModule } from '../payroll-configuration/payroll-configuration.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    forwardRef(() => LeavesModule),
    forwardRef(() => PayrollExecutionModule),
    NotificationsModule,
    PayrollConfigurationModule,
    MongooseModule.forFeature([
      { name: NotificationLog.name, schema: NotificationLogSchema },
      {
        name: AttendanceCorrectionRequest.name,
        schema: AttendanceCorrectionRequestSchema,
      },
      { name: ShiftType.name, schema: ShiftTypeSchema },
      { name: ScheduleRule.name, schema: ScheduleRuleSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: TimeException.name, schema: TimeExceptionSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: OvertimeRule.name, schema: OvertimeRuleSchema },
      { name: LatenessRule.name, schema: latenessRuleSchema },
      { name: Holiday.name, schema: HolidaySchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
    ]),
  ],
  controllers: [
    TimeManagementController,
    ShiftAndScheduleController,
    NotificationAndSyncController,
    PolicyConfigController,
  ],
  providers: [
    TimeManagementService,
    ShiftScheduleService,
    NotificationService,
    PolicyConfigService,
    SyncSchedulerService,
  ],
  exports: [TimeManagementService, NotificationService],
})
export class TimeManagementModule {}
