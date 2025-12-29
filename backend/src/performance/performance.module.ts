// src/performance/performance.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import { TimeManagementModule } from '../time-management/time-management.module';
import { NotificationLogSchema } from '../time-management/models/notification-log.schema';

// Controllers & Services
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

// Mongoose Schemas
import {
  AppraisalTemplate,
  AppraisalTemplateSchema,
} from './models/appraisal-template.schema';

import {
  AppraisalCycle,
  AppraisalCycleSchema,
} from './models/appraisal-cycle.schema';

import {
  AppraisalAssignment,
  AppraisalAssignmentSchema,
} from './models/appraisal-assignment.schema';

import {
  AppraisalRecord,
  AppraisalRecordSchema,
} from './models/appraisal-record.schema';

import {
  AppraisalDispute,
  AppraisalDisputeSchema,
} from './models/appraisal-dispute.schema';

@Module({
  imports: [
    // Register Mongoose models for this module
    MongooseModule.forFeature([
      { name: AppraisalTemplate.name, schema: AppraisalTemplateSchema },
      { name: AppraisalCycle.name, schema: AppraisalCycleSchema },
      { name: AppraisalAssignment.name, schema: AppraisalAssignmentSchema },
      { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
      { name: AppraisalDispute.name, schema: AppraisalDisputeSchema },
      { name: 'NotificationLog', schema: NotificationLogSchema },
    ]),
    // Import NotificationsModule to use NotificationsService
    NotificationsModule,
    // Import EmployeeProfileModule to update employee profiles after publishing
    EmployeeProfileModule,
    // Import TimeManagementModule to fetch attendance data for appraisals (REQ-AE-03)
    TimeManagementModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],

  // Export service if other modules need access to performance logic
  exports: [PerformanceService],
})
export class PerformanceModule {}
