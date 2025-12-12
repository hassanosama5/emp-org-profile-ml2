import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationLogSchema } from '../time-management/models/notification-log.schema';
import { ShiftAssignmentSchema } from '../time-management/models/shift-assignment.schema';
import { EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'NotificationLog', schema: NotificationLogSchema },
      { name: 'ShiftAssignment', schema: ShiftAssignmentSchema },
      { name: 'EmployeeProfile', schema: EmployeeProfileSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}