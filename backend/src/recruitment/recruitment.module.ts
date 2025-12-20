import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { JobTemplate, JobTemplateSchema } from './models/job-template.schema';
import {
  JobRequisition,
  JobRequisitionSchema,
} from './models/job-requisition.schema';
import { Application, ApplicationSchema } from './models/application.schema';
import {
  ApplicationStatusHistory,
  ApplicationStatusHistorySchema,
} from './models/application-history.schema';
import { Interview, InterviewSchema } from './models/interview.schema';
import {
  AssessmentResult,
  AssessmentResultSchema,
} from './models/assessment-result.schema';
import { Referral, ReferralSchema } from './models/referral.schema';
import { Offer, OfferSchema } from './models/offer.schema';
import { Contract, ContractSchema } from './models/contract.schema';
import { Document, DocumentSchema } from './models/document.schema';
import {
  TerminationRequest,
  TerminationRequestSchema,
} from './models/termination-request.schema';
import {
  ClearanceChecklist,
  ClearanceChecklistSchema,
} from './models/clearance-checklist.schema';
import { Onboarding, OnboardingSchema } from './models/onboarding.schema';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from '../employee-profile/models/employee-system-role.schema';
import {
  AppraisalRecord,
  AppraisalRecordSchema,
} from '../performance/models/appraisal-record.schema';
import {
  Candidate,
  CandidateSchema,
} from '../employee-profile/models/candidate.schema';
import {
  Department,
  DepartmentSchema,
} from '../organization-structure/models/department.schema';
import { PayrollExecutionModule } from '../payroll-execution/payroll-execution.module';
import { TimeManagementModule } from '../time-management/time-management.module';
import { PayrollConfigurationModule } from '../payroll-configuration/payroll-configuration.module';
import { OrganizationStructureModule } from '../organization-structure/organization-structure.module';
import { LeavesModule } from '../leaves/leaves.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobTemplate.name, schema: JobTemplateSchema },
      { name: JobRequisition.name, schema: JobRequisitionSchema },
      { name: Application.name, schema: ApplicationSchema },
      {
        name: ApplicationStatusHistory.name,
        schema: ApplicationStatusHistorySchema,
      },
      { name: Interview.name, schema: InterviewSchema },
      { name: AssessmentResult.name, schema: AssessmentResultSchema },
      { name: Referral.name, schema: ReferralSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: TerminationRequest.name, schema: TerminationRequestSchema },
      { name: ClearanceChecklist.name, schema: ClearanceChecklistSchema },
      { name: Onboarding.name, schema: OnboardingSchema },
      { name: Candidate.name, schema: CandidateSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
      { name: Department.name, schema: DepartmentSchema }, // CHANGED - Added for panel member filtering
    ]),
    EmployeeProfileModule,
    OrganizationStructureModule,
    forwardRef(() => PayrollExecutionModule),
    forwardRef(() => TimeManagementModule),
    PayrollConfigurationModule,
    LeavesModule,
    NotificationsModule,
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
