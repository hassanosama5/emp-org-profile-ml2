import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TimeManagementModule } from './time-management/time-management.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { LeavesModule } from './leaves/leaves.module';

import { PayrollTrackingModule } from './payroll-tracking/payroll-tracking.module';
import { EmployeeProfileModule } from './employee-profile/employee-profile.module';
import { OrganizationStructureModule } from './organization-structure/organization-structure.module';
import { PerformanceModule } from './performance/performance.module';
import { PayrollConfigurationModule } from './payroll-configuration/payroll-configuration.module';
import { PayrollExecutionModule } from './payroll-execution/payroll-execution.module';
//zawedt dol
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';




@Module({
  imports: [ 
     ConfigModule.forRoot({
      isGlobal: true,   // makes env available everywhere
    }),
     MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://TeamUser:TeamUser@cluster0.mfclf62.mongodb.net/'),

    TimeManagementModule, RecruitmentModule, LeavesModule, PayrollExecutionModule, PayrollConfigurationModule, PayrollTrackingModule, EmployeeProfileModule, OrganizationStructureModule, PerformanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
