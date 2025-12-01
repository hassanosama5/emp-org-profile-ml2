// src/performance/performance.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

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
    ]),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],

  // Export service if other modules need access to performance logic
  exports: [PerformanceService],
})
export class PerformanceModule {}
