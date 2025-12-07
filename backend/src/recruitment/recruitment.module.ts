import { Module } from '@nestjs/common';
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
import { Onboarding, OnboardingSchema } from './models/onboarding.schema'; // Make sure this import exists
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from '../employee-profile/models/employee-system-role.schema';
//NEW FOR OFFBOARDING
import {
  AppraisalRecord,
  AppraisalRecordSchema,
} from '../performance/models/appraisal-record.schema';
import {
  Candidate,
  CandidateSchema,
} from '../employee-profile/models/candidate.schema';

// ============= INTEGRATION MODULES (Uncomment when ready) =============
// Payroll Execution Module - For ONB-018 (REQ-PY-23) and ONB-019 (REQ-PY-27)
// import { PayrollExecutionModule } from '../payroll-execution/payroll-execution.module';

// Time Management Module - For ONB-009 (clock access provisioning)
// import { TimeManagementModule } from '../time-management/time-management.module';

// Organization Structure Module - For validating departments/positions
import { OrganizationStructureModule } from '../organization-structure/organization-structure.module';

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
      { name: Onboarding.name, schema: OnboardingSchema }, // Make sure this line exists
      { name: Candidate.name, schema: CandidateSchema }, // For creating employees from candidates
      //new for offboarding
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
    ]),
    // ============= INTEGRATED MODULES =============
    EmployeeProfileModule, // ACTIVE - For creating employees from candidates
    OrganizationStructureModule, // ACTIVE - For validating departments/positions when creating employees

    // ============= PENDING INTEGRATIONS (Uncomment when modules are ready) =============
    // PayrollExecutionModule, // For payroll initiation and signing bonus processing
    // TimeManagementModule, // For clock access provisioning
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
