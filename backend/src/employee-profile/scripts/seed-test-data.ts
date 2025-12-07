/**
 * Seed Test Data for Employee Profile
 *
 * This script creates sample employee data for testing
 * Run with: ts-node src/employee-profile/scripts/seed-test-data.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EmployeeProfileService } from '../employee-profile.service';
import { EmployeeSystemRole } from '../models/employee-system-role.schema';
import { SystemRole, EmployeeStatus } from '../enums/employee-profile.enums';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function seedTestData() {
  console.log('🌱 Seeding test data for Employee Profile...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const employeeService = app.get(EmployeeProfileService);
  const systemRoleModel = app.get<Model<EmployeeSystemRole>>(
    getModelToken(EmployeeSystemRole.name),
  );

  try {
    // Sample employees with passwords
    // Default password for all: "password123"
    const employees = [
      {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Michael',
        nationalId: '12345678901234',
        password: 'password123', // Added password
        dateOfHire: new Date('2023-01-15'),
        personalEmail: 'john.doe@example.com',
        workEmail: 'john.doe@company.com',
        mobilePhone: '1234567890',
        gender: 'MALE' as const,
        maritalStatus: 'SINGLE' as const,
        dateOfBirth: new Date('1990-05-15'),
        status: EmployeeStatus.ACTIVE,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        nationalId: '23456789012345',
        password: 'password123', // Added password
        dateOfHire: new Date('2023-02-20'),
        personalEmail: 'jane.smith@example.com',
        workEmail: 'jane.smith@company.com',
        mobilePhone: '2345678901',
        gender: 'FEMALE' as const,
        maritalStatus: 'MARRIED' as const,
        dateOfBirth: new Date('1988-08-22'),
        status: EmployeeStatus.ACTIVE,
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        nationalId: '34567890123456',
        password: 'password123', // Added password
        dateOfHire: new Date('2022-06-01'),
        personalEmail: 'admin@example.com',
        workEmail: 'admin@company.com',
        mobilePhone: '3456789012',
        gender: 'MALE' as const,
        status: EmployeeStatus.ACTIVE,
      },
    ];

    console.log('Creating employees...');
    const createdEmployees = [];

    for (const empData of employees) {
      try {
        const employee = await employeeService.create(empData as any);
        createdEmployees.push(employee);
        console.log(
          `✅ Created employee: ${employee.fullName} (${employee.employeeNumber})`,
        );

        // Assign roles
        const employeeId = (employee as any)._id;
        if (employee.fullName?.includes('Admin')) {
          await systemRoleModel.findOneAndUpdate(
            { employeeProfileId: employeeId },
            {
              employeeProfileId: employeeId,
              roles: [SystemRole.SYSTEM_ADMIN],
              permissions: ['*'],
              isActive: true,
            },
            { upsert: true, new: true },
          );
          console.log(`   → Assigned SYSTEM_ADMIN role`);
        } else if (employee.fullName?.includes('Jane')) {
          await systemRoleModel.findOneAndUpdate(
            { employeeProfileId: employeeId },
            {
              employeeProfileId: employeeId,
              roles: [SystemRole.HR_MANAGER],
              permissions: ['read:employees', 'write:employees'],
              isActive: true,
            },
            { upsert: true, new: true },
          );
          console.log(`   → Assigned HR_MANAGER role`);
        }
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(
            `⚠️  Employee with nationalId ${empData.nationalId} already exists, skipping...`,
          );
        } else {
          console.error(
            `❌ Error creating employee ${empData.firstName} ${empData.lastName}:`,
            error.message,
          );
        }
      }
    }

    console.log(
      `\n✅ Seeding complete! Created ${createdEmployees.length} employees.`,
    );
    console.log('\n📋 Login Credentials:');
    console.log('   Default password for all employees: password123\n');
    createdEmployees.forEach((emp) => {
      console.log(`   👤 ${emp.fullName}`);
      console.log(`      Employee Number: ${emp.employeeNumber}`);
      console.log(`      Password: password123`);
      console.log(
        `      Role: ${emp.fullName?.includes('Admin') ? 'SYSTEM_ADMIN' : emp.fullName?.includes('Jane') ? 'HR_MANAGER' : 'DEPARTMENT_EMPLOYEE'}`,
      );
      console.log(`      ID: ${emp._id}\n`);
    });
    console.log('\n🔐 To login, use:');
    console.log('   POST /api/v1/auth/login');
    console.log(
      '   Body: { "employeeNumber": "EMP-XXXX-XXXX", "password": "password123" }',
    );
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  seedTestData().catch(console.error);
}

export { seedTestData };
