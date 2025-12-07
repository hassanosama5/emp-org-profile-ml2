// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from '../employee-profile/models/employee-system-role.schema';
import {
  Candidate,
  CandidateSchema,
} from '../employee-profile/models/candidate.schema'; // Add this import

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // ✅ Option 1: Use registerAsync() (async configuration)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '24h') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // OR ✅ Option 2: Use register() (static configuration - simpler)
    // JwtModule.register({
    //   secret: process.env.JWT_SECRET || 'fallback-secret',
    //   signOptions: {
    //     expiresIn: process.env.JWT_EXPIRATION || '24h',
    //   },
    // }),k

    MongooseModule.forFeature([
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: Candidate.name, schema: CandidateSchema }, // Add this line
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
