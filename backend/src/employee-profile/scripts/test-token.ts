/**
 * Test Token Validation
 *
 * This script helps debug token issues
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmployeeProfileService } from '../employee-profile.service';

async function testToken() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const employeeService = app.get(EmployeeProfileService);

  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkVNUC0yMDI1LTAwMTMiLCJzdWIiOiI2OTJhMmNlODEwNGIwMWM0Nzc4YjAwY2QiLCJyb2xlcyI6WyJTeXN0ZW0gQWRtaW4iXSwicGVybWlzc2lvbnMiOlsiKiJdLCJpYXQiOjE3NjQzNzI0MTksImV4cCI6MTc2NDQ1ODgxOX0.hNkfPXsKmb1MDvjYazEpe4oMV26mATXUpZUBicy7ass';

  console.log('🔍 Testing Token Validation...\n');

  try {
    // Decode token
    const decoded = jwtService.decode(token);
    console.log('✅ Token decoded successfully:');
    console.log(JSON.stringify(decoded, null, 2));
    console.log('');

    // Check JWT_SECRET
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
    console.log(`🔑 JWT_SECRET: ${secret}`);
    console.log('');

    // Verify token
    try {
      const verified = jwtService.verify(token, { secret });
      console.log('✅ Token verified successfully');
      console.log('');

      // Check if user exists
      const userId = decoded.sub;
      console.log(`👤 User ID from token: ${userId}`);

      try {
        const employee = await employeeService.findOne(userId);
        console.log(
          `✅ User exists: ${employee.fullName} (${employee.employeeNumber})`,
        );
      } catch (error: any) {
        console.log(`❌ User NOT found in database: ${error.message}`);
        console.log(
          "   This is likely the issue! The user ID in the token doesn't exist.",
        );
      }
    } catch (error: any) {
      console.log(`❌ Token verification failed: ${error.message}`);
      if (error.message.includes('secret')) {
        console.log('   ⚠️  JWT_SECRET mismatch! Make sure it matches.');
      }
      if (error.message.includes('expired')) {
        console.log('   ⚠️  Token is expired! Login again to get a new token.');
      }
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await app.close();
  }
}

testToken().catch(console.error);
