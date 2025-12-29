import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollConfigurationController } from './payroll-configuration.controller';
import { PayrollConfigurationService } from './payroll-configuration.service';
import { ObjectIdPipe } from './common/pipes/object-id.pipe';
import { OrganizationStructureModule } from '../organization-structure/organization-structure.module';

// Import all schemas - make sure these paths are correct
import { payGrade, payGradeSchema } from './models/payGrades.schema';
import {
  payrollPolicies,
  payrollPoliciesSchema,
} from './models/payrollPolicies.schema';
import { allowance, allowanceSchema } from './models/allowance.schema';
import { payType, payTypeSchema } from './models/payType.schema';
import { taxRules, taxRulesSchema } from './models/taxRules.schema';
import {
  insuranceBrackets,
  insuranceBracketsSchema,
} from './models/insuranceBrackets.schema';
import { signingBonus, signingBonusSchema } from './models/signingBonus.schema';
import {
  terminationAndResignationBenefits,
  terminationAndResignationBenefitsSchema,
} from './models/terminationAndResignationBenefits';
import {
  CompanyWideSettings,
  CompanyWideSettingsSchema,
} from './models/CompanyWideSettings.schema';

@Module({
  imports: [
    OrganizationStructureModule,
    MongooseModule.forFeature([
      // Pay Grade
      { name: payGrade.name, schema: payGradeSchema },

      // Payroll Policies
      { name: payrollPolicies.name, schema: payrollPoliciesSchema },

      // Allowance
      { name: allowance.name, schema: allowanceSchema },

      // Pay Type
      { name: payType.name, schema: payTypeSchema },

      // Tax Rules
      { name: taxRules.name, schema: taxRulesSchema },

      // Insurance Brackets
      { name: insuranceBrackets.name, schema: insuranceBracketsSchema },

      // Signing Bonus
      { name: signingBonus.name, schema: signingBonusSchema },

      // Termination Benefits
      {
        name: terminationAndResignationBenefits.name,
        schema: terminationAndResignationBenefitsSchema,
      },

      // Company Settings
      { name: CompanyWideSettings.name, schema: CompanyWideSettingsSchema },
    ]),
  ],
  controllers: [PayrollConfigurationController],
  providers: [PayrollConfigurationService, ObjectIdPipe, RolesGuard],
  exports: [PayrollConfigurationService],
})
export class PayrollConfigurationModule {}
