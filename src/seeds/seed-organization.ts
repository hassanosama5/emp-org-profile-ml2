// src/seeds/seed-organization.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Department } from '../organization-structure/models/department.schema';
import { Position } from '../organization-structure/models/position.schema';
import { PositionAssignment } from '../organization-structure/models/position-assignment.schema';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export async function seedOrganizationStructure() {
  console.log('🏢 Seeding Organization Structure...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const departmentModel = app.get<Model<Department>>(
    getModelToken(Department.name),
  );
  const positionModel = app.get<Model<Position>>(getModelToken(Position.name));
  const assignmentModel = app.get<Model<PositionAssignment>>(
    getModelToken(PositionAssignment.name),
  );
  const connection = app.get<Connection>(getConnectionToken());

  try {
    // Clear problematic indexes first
    console.log('🔧 Checking for problematic indexes...');
    try {
      await connection.collection('positions').dropIndex('positionId_1');
      console.log('✅ Dropped problematic positionId index');
    } catch (e) {
      console.log('ℹ️  positionId index already dropped or does not exist');
    }

    // Clear existing data
    console.log('🗑️  Clearing organization data...');
    await Promise.all([
      departmentModel.deleteMany({}),
      positionModel.deleteMany({}),
      assignmentModel.deleteMany({}),
    ]);
    console.log('✅ Data cleared\n');

    // Create Departments
    console.log('📁 Creating departments...');
    const hrDept = await departmentModel.create({
      code: 'HR',
      name: 'Human Resources',
      description: 'Manages employee relations and HR operations',
      isActive: true,
    });

    const itDept = await departmentModel.create({
      code: 'IT',
      name: 'Information Technology',
      description: 'Manages technology infrastructure and development',
      isActive: true,
    });

    const financeDept = await departmentModel.create({
      code: 'FIN',
      name: 'Finance',
      description: 'Manages financial operations and accounting',
      isActive: true,
    });

    const engineeringDept = await departmentModel.create({
      code: 'ENG',
      name: 'Engineering',
      description: 'Product development and engineering',
      isActive: true,
    });

    console.log(`✅ Created 4 departments\n`);

    // Create Positions
    console.log('💼 Creating positions...');

    // HR Positions
    const hrManager = await positionModel.create({
      code: 'HR-MGR-001',
      title: 'HR Manager',
      description: 'Oversees all HR operations',
      departmentId: hrDept._id,
      isActive: true,
    });

    const hrSpecialist = await positionModel.create({
      code: 'HR-SPE-001',
      title: 'HR Specialist',
      description: 'Handles HR administrative tasks',
      departmentId: hrDept._id,
      reportsToPositionId: hrManager._id,
      isActive: true,
    });

    // IT Positions
    const itManager = await positionModel.create({
      code: 'IT-MGR-001',
      title: 'IT Manager',
      description: 'Manages IT infrastructure and team',
      departmentId: itDept._id,
      isActive: true,
    });

    const seniorDev = await positionModel.create({
      code: 'IT-SDEV-001',
      title: 'Senior Developer',
      description: 'Lead software development',
      departmentId: itDept._id,
      reportsToPositionId: itManager._id,
      isActive: true,
    });

    const juniorDev = await positionModel.create({
      code: 'IT-JDEV-001',
      title: 'Junior Developer',
      description: 'Software development',
      departmentId: itDept._id,
      reportsToPositionId: seniorDev._id,
      isActive: true,
    });

    // Finance Positions
    const financeManager = await positionModel.create({
      code: 'FIN-MGR-001',
      title: 'Finance Manager',
      description: 'Oversees financial operations',
      departmentId: financeDept._id,
      isActive: true,
    });

    const accountant = await positionModel.create({
      code: 'FIN-ACC-001',
      title: 'Accountant',
      description: 'Handles accounting tasks',
      departmentId: financeDept._id,
      reportsToPositionId: financeManager._id,
      isActive: true,
    });

    // Engineering Positions
    const engManager = await positionModel.create({
      code: 'ENG-MGR-001',
      title: 'Engineering Manager',
      description: 'Leads engineering team',
      departmentId: engineeringDept._id,
      isActive: true,
    });

    const seniorEngineer = await positionModel.create({
      code: 'ENG-SENG-001',
      title: 'Senior Engineer',
      description: 'Senior level engineering',
      departmentId: engineeringDept._id,
      reportsToPositionId: engManager._id,
      isActive: true,
    });

    console.log(`✅ Created 9 positions\n`);

    // Update department heads
    console.log('👔 Assigning department heads...');
    await departmentModel.findByIdAndUpdate(hrDept._id, {
      headPositionId: hrManager._id,
    });
    await departmentModel.findByIdAndUpdate(itDept._id, {
      headPositionId: itManager._id,
    });
    await departmentModel.findByIdAndUpdate(financeDept._id, {
      headPositionId: financeManager._id,
    });
    await departmentModel.findByIdAndUpdate(engineeringDept._id, {
      headPositionId: engManager._id,
    });
    console.log('✅ Department heads assigned\n');

    console.log('📊 Organization Structure Summary:');
    console.log(`   Departments: 4`);
    console.log(`   Positions: 9`);
    console.log('');
    console.log('✨ Organization structure seeded successfully!\n');

    return {
      departments: {
        hrDept,
        itDept,
        financeDept,
        engineeringDept,
      },
      positions: {
        hrManager,
        hrSpecialist,
        itManager,
        seniorDev,
        juniorDev,
        financeManager,
        accountant,
        engManager,
        seniorEngineer,
      },
    };
  } catch (error) {
    console.error('❌ Organization seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run if executed directly
if (require.main === module) {
  seedOrganizationStructure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
