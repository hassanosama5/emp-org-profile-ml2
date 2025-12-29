// src/employee-profile/scripts/safe-fix-profiles.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

// Interface matching your schema
interface EmployeeProfile {
  _id: any;
  employeeNumber: string;
  fullName: string;
  contractType?: string;
  workType?: string;
  password?: string;
  status: string;
}

async function bootstrap() {
  console.log('🚀 Starting Employee Profile Fix Script');
  console.log('========================================');

  // Create app context to get dependency injection
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the EmployeeProfile model from DI
    const employeeModel = app.get<Model<EmployeeProfile>>(
      'EmployeeProfileModel',
    );

    console.log('📊 Database connected successfully');

    // 1. FIRST: Fix contract types (safe - only add if missing)
    await fixContractTypes(employeeModel);

    // 2. THEN: Fix passwords (safe - only add if missing/invalid)
    await fixMissingPasswords(employeeModel);

    // 3. VERIFY: Show summary
    await verifyFixes(employeeModel);

    console.log('\n✅ All fixes completed successfully and verified!');
  } catch (error) {
    console.error('\n❌ Error during profile fixes:', error);
    process.exit(1);
  } finally {
    await app.close();
    console.log('\n🔌 Database connection closed');
  }
}

async function fixContractTypes(employeeModel: Model<EmployeeProfile>) {
  console.log('\n🔧 Step 1: Fixing missing contract types...');

  // Find only ACTIVE employees without contractType
  const employees = await employeeModel
    .find({
      status: 'ACTIVE', // Only fix active employees
      $or: [
        { contractType: { $exists: false } },
        { contractType: null },
        { contractType: '' },
      ],
    })
    .lean()
    .exec();

  console.log(
    `   Found ${employees.length} active employees needing contract type`,
  );

  if (employees.length === 0) {
    console.log('   ✓ No fixes needed');
    return;
  }

  const updates = [];
  for (const emp of employees) {
    // Determine contract type based on workType
    let contractType = 'FULL_TIME_CONTRACT'; // Default
    if (emp.workType === 'PART_TIME') {
      contractType = 'PART_TIME_CONTRACT';
    }

    updates.push({
      updateOne: {
        filter: { _id: emp._id },
        update: { $set: { contractType } },
      },
    });

    console.log(
      `   • ${emp.employeeNumber} (${emp.fullName}): ${contractType}`,
    );
  }

  // Use bulkWrite for atomic updates
  if (updates.length > 0) {
    const result = await employeeModel.bulkWrite(updates);
    console.log(`   ✓ Updated ${result.modifiedCount} contract types`);
  }
}

async function fixMissingPasswords(employeeModel: Model<EmployeeProfile>) {
  console.log('\n🔧 Step 2: Fixing missing passwords...');

  // Find employees without valid passwords (only ACTIVE employees)
  const employees = await employeeModel
    .find({
      status: 'ACTIVE', // Only fix active employees
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: '' },
        { password: { $regex: /^\s*$/ } }, // Only whitespace
      ],
    })
    .lean()
    .exec();

  console.log(
    `   Found ${employees.length} active employees needing password fix`,
  );

  if (employees.length === 0) {
    console.log('   ✓ No fixes needed');
    return;
  }

  const updates = [];
  for (const emp of employees) {
    // Check if it's already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (emp.password && /^\$2[aby]\$/.test(emp.password)) {
      console.log(
        `   ⚠️ ${emp.employeeNumber}: Already has hashed password, skipping`,
      );
      continue;
    }

    // Generate secure hash for 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);

    updates.push({
      updateOne: {
        filter: { _id: emp._id },
        update: { $set: { password: hashedPassword } },
      },
    });

    console.log(
      `   • ${emp.employeeNumber} (${emp.fullName}): Password set to 'password123' (hashed)`,
    );
  }

  // Use bulkWrite for atomic updates
  if (updates.length > 0) {
    const result = await employeeModel.bulkWrite(updates);
    console.log(`   ✓ Updated ${result.modifiedCount} passwords`);
  }
}

async function verifyFixes(employeeModel: Model<EmployeeProfile>) {
  console.log('\n🔍 Step 3: Verification...');

  // Check for any remaining issues
  const stillNoContract = await employeeModel.countDocuments({
    status: 'ACTIVE',
    $or: [
      { contractType: { $exists: false } },
      { contractType: null },
      { contractType: '' },
    ],
  });

  const stillNoPassword = await employeeModel.countDocuments({
    status: 'ACTIVE',
    $or: [
      { password: { $exists: false } },
      { password: null },
      { password: '' },
      { password: { $not: /^\$2[aby]\$/ } }, // Not a bcrypt hash
    ],
  });

  console.log(`   Employees still without contract type: ${stillNoContract}`);
  console.log(`   Employees still without valid password: ${stillNoPassword}`);

  if (stillNoContract === 0 && stillNoPassword === 0) {
    console.log('   ✅ All verifications passed!');
  } else {
    console.log('   ⚠️  Some issues remain');
  }
}

// Add dry-run mode support
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('\n⚠️  DRY RUN MODE - No changes will be written to database');
  console.log('========================================\n');

  // Modify functions to only log, not update
  const originalBulkWrite = Model.prototype.bulkWrite;
  Model.prototype.bulkWrite = async function (operations: any[]) {
    console.log(`   [DRY RUN] Would execute ${operations.length} operations:`);
    operations.forEach((op, i) => {
      console.log(
        `     ${i + 1}. Update ${op.updateOne.filter._id || 'record'}`,
      );
    });
    return { modifiedCount: operations.length }; // Mock result
  };
}

// Run the script
bootstrap().catch(console.error);
