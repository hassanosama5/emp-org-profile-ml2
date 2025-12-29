// File: scripts/fix-team-relationships-service.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { Types } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const employeeService = app.get(EmployeeProfileService);

  console.log('Updating employee positions and supervisors...');

  try {
    // Update Amira K Hassan - HR Manager
    await employeeService.update('692b63778b731e72cccc10cd', {
      primaryPositionId: '692ca4d6360e24c860cc54f2',
      primaryDepartmentId: '692ca4d5360e24c860cc54ee',
      supervisorPositionId: null,
    });

    // Update Fatima HRAdministrator - HR Employee
    await employeeService.update('692d9596f2f917c28a7da591', {
      primaryPositionId: '692ca4d6360e24c860cc54f3',
      primaryDepartmentId: '692ca4d5360e24c860cc54ee',
      supervisorPositionId: '692ca4d6360e24c860cc54f2',
    });

    // Update Samir TalentAcquisition - HR Employee
    await employeeService.update('692d9810f2f917c28a7da5c1', {
      primaryPositionId: '692ca4d6360e24c860cc54f3',
      primaryDepartmentId: '692ca4d5360e24c860cc54ee',
      supervisorPositionId: '692ca4d6360e24c860cc54f2',
    });

    // Update Karim EngineeringLead - Engineering Lead
    await employeeService.update('692d95ebf2f917c28a7da59e', {
      primaryPositionId: '693c78578a00ba12753f8852',
      primaryDepartmentId: '693c78498a00ba12753f884d',
      supervisorPositionId: null,
    });

    // Update Omar M Farouk - Software Engineer
    await employeeService.update('692b6759af00a04b192f9547', {
      primaryPositionId: '692ca4d6360e24c860cc54f1',
      primaryDepartmentId: '693c78498a00ba12753f884d',
      supervisorPositionId: '693c78578a00ba12753f8852',
    });

    console.log('✅ Employee positions updated successfully!');

    // Verify updates
    const amira = await employeeService.findOne('692b63778b731e72cccc10cd');
    console.log('\nAmira (HR Manager) updated:');
    console.log('Position:', amira.primaryPositionId);
    console.log('Department:', amira.primaryDepartmentId);
    console.log('Supervisor:', amira.supervisorPositionId);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await app.close();
  }
}

bootstrap();
