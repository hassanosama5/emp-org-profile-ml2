/**
 * Add Password to Existing Employees
 *
 * This script adds a default password to existing employees who don't have one
 * Run with: ts-node src/employee-profile/scripts/add-password-to-employees.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EmployeeProfileService } from '../employee-profile.service';
import * as bcrypt from 'bcrypt';

async function addPasswordsToEmployees() {
  console.log('🔐 Adding passwords to existing employees...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const employeeService = app.get(EmployeeProfileService);
  const defaultPassword = 'password123';

  try {
    // Get all employees
    const result = await employeeService.findAll(
      { limit: 1000, page: 1 },
      undefined,
    );
    const employees = result.data as any[];

    if (!employees || employees.length === 0) {
      console.log('⚠️  No employees found in database.');
      await app.close();
      return;
    }

    console.log(`Found ${employees.length} employees.\n`);

    let updatedCount = 0;
    const employeeServiceInternal = employeeService as any;
    const employeeModel = employeeServiceInternal.employeeModel;

    for (const emp of employees) {
      const employeeId = emp._id || emp.id;

      // Check if employee already has a password
      const fullEmployee = await employeeModel.findById(employeeId).exec();

      if (!fullEmployee || fullEmployee.password) {
        console.log(
          `⏭️  ${emp.fullName || emp.firstName} ${emp.lastName} - Already has password, skipping...`,
        );
        continue;
      }

      // Hash and set password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await employeeModel
        .findByIdAndUpdate(employeeId, {
          $set: { password: hashedPassword },
        })
        .exec();

      console.log(
        `✅ Added password to: ${emp.fullName || emp.firstName} ${emp.lastName} (${emp.employeeNumber})`,
      );
      updatedCount++;
    }

    console.log(
      `\n✅ Complete! Updated ${updatedCount} employees with password.`,
    );
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Default password: ${defaultPassword}`);
    console.log(`\n🔐 To login, use:`);
    console.log(`   POST /api/v1/auth/login`);
    console.log(
      `   Body: { "employeeNumber": "EMP-XXXX-XXXX", "password": "${defaultPassword}" }`,
    );
  } catch (error) {
    console.error('❌ Error adding passwords:', error);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  addPasswordsToEmployees().catch(console.error);
}

export { addPasswordsToEmployees };
