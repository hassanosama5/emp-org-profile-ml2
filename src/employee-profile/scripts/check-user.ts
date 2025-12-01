/**
 * Check if user from token exists in database
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EmployeeProfileService } from '../employee-profile.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

async function checkUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const employeeService = app.get(EmployeeProfileService);

  // Your token
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkVNUC0yMDI1LTAwMTMiLCJzdWIiOiI2OTJhMmNlODEwNGIwMWM0Nzc4YjAwY2QiLCJyb2xlcyI6WyJTeXN0ZW0gQWRtaW4iXSwicGVybWlzc2lvbnMiOlsiKiJdLCJpYXQiOjE3NjQzNzI0MTksImV4cCI6MTc2NDQ1ODgxOX0.hNkfPXsKmb1MDvjYazEpe4oMV26mATXUpZUBicy7ass';

  console.log('🔍 Checking token and user...\n');

  try {
    // Decode token
    const decoded = jwtService.decode(token);
    const userId = decoded?.sub;
    const username = decoded?.username;

    console.log(`📋 Token Info:`);
    console.log(`   User ID (sub): ${userId}`);
    console.log(`   Username: ${username}`);
    console.log(`   Roles: ${JSON.stringify(decoded?.roles)}`);
    console.log('');

    if (!userId) {
      console.log('❌ Token does not contain user ID (sub field)');
      await app.close();
      return;
    }

    // Check if user exists
    try {
      const employee = await employeeService.findOne(userId);
      console.log(`✅ User EXISTS in database:`);
      console.log(`   Name: ${employee.fullName}`);
      console.log(`   Employee Number: ${employee.employeeNumber}`);
      console.log(`   ID: ${(employee as any)._id}`);
      console.log('');
      console.log('✅ The /me endpoint should work!');
      console.log(
        "   If it doesn't, the issue is with token validation, not the user.",
      );
    } catch (error: any) {
      console.log(`❌ User NOT FOUND in database!`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      console.log('🔧 Solution:');
      console.log('   1. Login again to get a fresh token');
      console.log('   2. Make sure you use the employee number that exists');
      console.log('   3. Try: EMP-2025-0013 with password: password123');
    }

    // Verify token
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
    try {
      jwtService.verify(token, { secret });
      console.log('');
      console.log('✅ Token signature is valid');
    } catch (error: any) {
      console.log('');
      console.log(`❌ Token signature invalid: ${error.message}`);
      console.log("   This means JWT_SECRET doesn't match!");
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await app.close();
  }
}

checkUser().catch(console.error);
