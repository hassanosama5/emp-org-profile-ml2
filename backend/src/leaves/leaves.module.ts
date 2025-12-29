import { Module } from '@nestjs/common';
import { LeaveController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { LeaveType, LeaveTypeSchema } from './models/leave-type.schema';
import { LeaveRequest, LeaveRequestSchema } from './models/leave-request.schema';
import { LeavePolicy, LeavePolicySchema } from './models/leave-policy.schema';
import { LeaveEntitlement, LeaveEntitlementSchema } from './models/leave-entitlement.schema';
import { LeaveCategory, LeaveCategorySchema } from './models/leave-category.schema';
import { LeaveAdjustment, LeaveAdjustmentSchema } from './models/leave-adjustment.schema';
import { Calendar, CalendarSchema} from './models/calendar.schema';
import { Attachment,AttachmentSchema } from './models/attachment.schema';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import { forwardRef } from '@nestjs/common';
import { TimeManagementModule } from '../time-management/time-management.module';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleSchema } from '../employee-profile/models/employee-system-role.schema';
import { NotificationLogSchema } from '../time-management/models/notification-log.schema';
import { NotificationsModule } from '../notifications/notifications.module';
// import { PositionAssignment, PositionAssignmentSchema } from '../organization-structure/models/position-assignment.schema';
// import { Position, PositionSchema } from '../organization-structure/models/position.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable scheduled tasks
    MongooseModule.forFeature([
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: LeavePolicy.name, schema: LeavePolicySchema },
      { name: LeaveEntitlement.name, schema: LeaveEntitlementSchema },
      { name: LeaveCategory.name, schema: LeaveCategorySchema },
      { name: LeaveAdjustment.name, schema: LeaveAdjustmentSchema },
      { name: Calendar.name, schema: CalendarSchema },
      { name: Attachment.name, schema: AttachmentSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: 'NotificationLog', schema: NotificationLogSchema },
      // {name:PositionAssignment.name, schema:PositionAssignmentSchema},
      // {name:Position.name, schema:PositionSchema}
    ]),
    EmployeeProfileModule,
    forwardRef(() => TimeManagementModule),
    NotificationsModule,
  ],
  controllers: [LeaveController],
  providers: [LeavesService],
  exports:[LeavesService]
})
export class LeavesModule {}
