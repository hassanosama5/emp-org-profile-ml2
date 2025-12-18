import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Add ConfigService
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmployeeProfileModule } from './employee-profile/employee-profile.module';
import { OrganizationStructureModule } from './organization-structure/organization-structure.module';
import { PerformanceModule } from './performance/performance.module';
import { TimeManagementModule } from './time-management/time-management.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { LeavesModule } from './leaves/leaves.module';
import { PayrollConfigurationModule } from './payroll-configuration/payroll-configuration.module';
import { PayrollExecutionModule } from './payroll-execution/payroll-execution.module';
import { PayrollTrackingModule } from './payroll-tracking/payroll-tracking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    // ✅ FIXED: Use forRootAsync to access ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('DATABASE_NAME', 'hr_system'),
        // Connection options to handle timeouts and improve reliability
        serverSelectionTimeoutMS: 10000, // How long to try selecting a server (default: 30000)
        socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timing out (default: 0)
        connectTimeoutMS: 10000, // How long to wait for initial connection (default: 30000)
        retryWrites: true,
        retryReads: true,
        maxPoolSize: 10, // Maximum number of connections in the connection pool
        minPoolSize: 2, // Minimum number of connections in the connection pool
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    EmployeeProfileModule,
    OrganizationStructureModule,
    PerformanceModule,
    TimeManagementModule,
    RecruitmentModule,
    LeavesModule,
    PayrollConfigurationModule,
    PayrollExecutionModule,
    PayrollTrackingModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
