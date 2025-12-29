import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RecruitmentNotificationsService } from './services/recruitment-notifications.service';
import { ExtendedNotificationSchema } from './models/extended-notification.schema';
import { ShiftAssignmentSchema } from '../time-management/models/shift-assignment.schema';
import { EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRoleSchema } from '../employee-profile/models/employee-system-role.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      // Use ExtendedNotification schema for rich notifications with isRead, data, etc.
      { name: 'ExtendedNotification', schema: ExtendedNotificationSchema },
      { name: 'ShiftAssignment', schema: ShiftAssignmentSchema },
      { name: 'EmployeeProfile', schema: EmployeeProfileSchema },
      { name: 'EmployeeSystemRole', schema: EmployeeSystemRoleSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, RecruitmentNotificationsService],
  exports: [NotificationsService, RecruitmentNotificationsService],
})
export class NotificationsModule {}
