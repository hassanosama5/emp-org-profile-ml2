import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollTrackingController } from './payroll-tracking.controller';
import { PayrollTrackingService } from './payroll-tracking.service';
import { claims, claimsSchema } from './models/claims.schema';
import { disputes, disputesSchema } from './models/disputes.schema';
import { refunds, refundsSchema } from './models/refunds.schema';
import { PayrollConfigurationModule } from '../payroll-configuration/payroll-configuration.module';
import { PayrollExecutionModule } from '../payroll-execution/payroll-execution.module';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import { LeavesModule } from '../leaves/leaves.module';
import { TimeManagementModule } from '../time-management/time-management.module';
import { OrganizationStructureModule } from '../organization-structure/organization-structure.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from '../employee-profile/models/employee-profile.schema';
import { paySlip, paySlipSchema } from '../payroll-execution/models/payslip.schema';
import { payrollRuns, payrollRunsSchema } from '../payroll-execution/models/payrollRuns.schema';
import { LeaveEntitlement, LeaveEntitlementSchema } from '../leaves/models/leave-entitlement.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/models/leave-request.schema';
import { AttendanceRecord, AttendanceRecordSchema } from '../time-management/models/attendance-record.schema';
import { TimeException, TimeExceptionSchema } from '../time-management/models/time-exception.schema';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { Position, PositionSchema } from '../organization-structure/models/position.schema';
import { PositionAssignment, PositionAssignmentSchema } from '../organization-structure/models/position-assignment.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from '../employee-profile/models/employee-system-role.schema';
import { NotificationLogSchema } from '../time-management/models/notification-log.schema';

/**
 * Payroll Tracking Module
 *
 * Handles employee self-service, claims, disputes, and refunds management.
 * Implements multi-level approval workflow:
 * - Payroll Specialist: Approve/Reject claims and disputes (REQ-PY-39, REQ-PY-42)
 * - Payroll Manager: Confirm approvals (REQ-PY-40, REQ-PY-43)
 * - Finance Staff: View approved items and generate refunds (REQ-PY-41, REQ-PY-44, REQ-PY-45, REQ-PY-46)
 */
@Module({
  imports: [
    // External module dependencies
    PayrollConfigurationModule, // For pay grade and payroll configuration data
    EmployeeProfileModule, // Import to access EmployeeProfile model and service for validation
    LeavesModule, // For leave encashment and unpaid leave data (REQ-PY-5, REQ-PY-11)
    forwardRef(() => TimeManagementModule), // For attendance records and time exceptions (REQ-PY-10)
    OrganizationStructureModule, // For department reports (REQ-PY-38)
    NotificationsModule, // For sending notifications to users
    // Circular dependency with PayrollExecutionModule (both reference each other)
    forwardRef(() => PayrollExecutionModule),
    // Mongoose schemas registration
    MongooseModule.forFeature([
      { name: claims.name, schema: claimsSchema },
      { name: disputes.name, schema: disputesSchema },
      { name: refunds.name, schema: refundsSchema },
      // EmployeeProfile model for validation
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      // Payslip and PayrollRuns for employee self-service (REQ-PY-1, REQ-PY-2, REQ-PY-13)
      { name: paySlip.name, schema: paySlipSchema },
      { name: payrollRuns.name, schema: payrollRunsSchema },
      // Leaves models for leave encashment and unpaid leave (REQ-PY-5, REQ-PY-11)
      { name: LeaveEntitlement.name, schema: LeaveEntitlementSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      // Time Management models for absenteeism (REQ-PY-10)
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: TimeException.name, schema: TimeExceptionSchema },
      // Organization Structure for department reports (REQ-PY-38)
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: PositionAssignment.name, schema: PositionAssignmentSchema },
      // EmployeeSystemRole for role-based authorization
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      // NotificationLog for notifications
      { name: 'NotificationLog', schema: NotificationLogSchema },
    ]),
  ],
  controllers: [PayrollTrackingController],
  providers: [PayrollTrackingService],
  exports: [PayrollTrackingService],
})
export class PayrollTrackingModule {}
