// src/seeds/test-organization.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrganizationStructureService } from '../organization-structure/organization-structure.service';
import { StructureRequestType } from '../organization-structure/enums/organization-structure.enums';

export async function testOrganizationStructure() {
  console.log('🧪 Testing Organization Structure Module...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const orgService = app.get(OrganizationStructureService);

  try {
    // Test 1: Get all departments
    console.log('Test 1: Get all departments');
    const departments = await orgService.getAllDepartments();
    console.log(`✅ Found ${departments.length} departments`);
    console.log(`   - ${departments.map((d) => d.name).join(', ')}\n`);

    // Test 2: Get all positions
    console.log('Test 2: Get all positions');
    const positions = await orgService.getAllPositions();
    console.log(`✅ Found ${positions.length} positions`);
    console.log(
      `   - ${positions
        .slice(0, 3)
        .map((p) => p.title)
        .join(', ')}, ...\n`,
    );

    // Test 3: Get positions by department
    const hrDept = departments.find((d) => d.code === 'HR');
    if (hrDept) {
      console.log('Test 3: Get positions by department (HR)');
      const hrPositions = await orgService.getAllPositions(
        hrDept._id.toString(),
      );
      console.log(`✅ Found ${hrPositions.length} HR positions`);
      console.log(`   - ${hrPositions.map((p) => p.title).join(', ')}\n`);
    }

    // Test 4: Get department hierarchy
    console.log('Test 4: Get department hierarchy');
    const hierarchy = await orgService.getDepartmentHierarchy();
    console.log(`✅ Built hierarchy for ${hierarchy.length} departments\n`);

    // Test 5: Get position hierarchy
    const itManager = positions.find((p) => p.code === 'IT-MGR-001');
    if (itManager) {
      console.log('Test 5: Get position hierarchy (IT Manager)');
      const posHierarchy = await orgService.getPositionHierarchy(
        itManager._id.toString(),
      );
      console.log(
        `✅ Found ${posHierarchy.subordinates?.length || 0} direct reports\n`,
      );
    }

    // Test 6: Create a change request
    const hrManagerPos = positions.find((p) => p.code === 'HR-MGR-001');
    if (hrManagerPos) {
      console.log('Test 6: Create structure change request');
      const changeRequest = await orgService.createChangeRequest({
        requestedByEmployeeId: '507f1f77bcf86cd799439011', // Dummy ID
        requestType: StructureRequestType.UPDATE_POSITION,
        targetPositionId: hrManagerPos._id.toString(),
        details: 'Update position title',
        reason: 'Better reflect responsibilities',
      });
      console.log(
        `✅ Created change request: ${changeRequest.requestNumber}\n`,
      );
    }

    // Test 7: Get all change requests
    console.log('Test 7: Get all change requests');
    const requests = await orgService.getAllChangeRequests();
    console.log(`✅ Found ${requests.length} change requests\n`);

    // Test 8: Get change logs
    console.log('Test 8: Get change logs');
    const logs = await orgService.getChangeLogs();
    console.log(`✅ Found ${logs.length} change log entries\n`);

    console.log('✨ All tests passed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await app.close();
  }
}

// Run if executed directly
if (require.main === module) {
  testOrganizationStructure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
