"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOrgStructure = seedOrgStructure;
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const mongoose_1 = require("@nestjs/mongoose");
const department_schema_1 = require("../models/department.schema");
const position_schema_1 = require("../models/position.schema");
async function seedOrgStructure() {
    console.log('🏗️  Seeding Organization Structure...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const departmentModel = app.get((0, mongoose_1.getModelToken)(department_schema_1.Department.name));
    const positionModel = app.get((0, mongoose_1.getModelToken)(position_schema_1.Position.name));
    try {
        console.log('Creating departments...');
        const departments = [
            {
                code: 'IT',
                name: 'IT Department',
                description: 'Information Technology Department',
                isActive: true,
            },
            {
                code: 'HR',
                name: 'Human Resources',
                description: 'Human Resources Department',
                isActive: true,
            },
            {
                code: 'FIN',
                name: 'Finance',
                description: 'Finance Department',
                isActive: true,
            },
            {
                code: 'OPS',
                name: 'Operations',
                description: 'Operations Department',
                isActive: true,
            },
        ];
        const createdDepartments = [];
        for (const deptData of departments) {
            try {
                const dept = await departmentModel.findOneAndUpdate({ code: deptData.code }, deptData, { upsert: true, new: true });
                createdDepartments.push(dept);
                console.log(`✅ Created/Updated department: ${dept.name} (${dept.code})`);
            }
            catch (error) {
                console.error(`❌ Error creating department ${deptData.code}:`, error.message);
            }
        }
        console.log('\nCreating positions...');
        const positions = [
            {
                code: 'SE-001',
                title: 'Software Engineer',
                description: 'Senior Software Engineer',
                departmentId: createdDepartments[0]?._id,
                isActive: true,
            },
            {
                code: 'HRM-001',
                title: 'HR Manager',
                description: 'Human Resources Manager',
                departmentId: createdDepartments[1]?._id,
                isActive: true,
            },
            {
                code: 'HRE-001',
                title: 'HR Employee',
                description: 'HR Generalist',
                departmentId: createdDepartments[1]?._id,
                isActive: true,
            },
            {
                code: 'FA-001',
                title: 'Financial Analyst',
                description: 'Financial Analyst',
                departmentId: createdDepartments[2]?._id,
                isActive: true,
            },
            {
                code: 'OPM-001',
                title: 'Operations Manager',
                description: 'Operations Manager',
                departmentId: createdDepartments[3]?._id,
                isActive: true,
            },
        ];
        const createdPositions = [];
        for (const posData of positions) {
            if (!posData.departmentId) {
                console.log(`⚠️  Skipping position ${posData.code} - department not found`);
                continue;
            }
            try {
                const pos = await positionModel.findOneAndUpdate({ code: posData.code }, posData, { upsert: true, new: true });
                createdPositions.push(pos);
                console.log(`✅ Created/Updated position: ${pos.title} (${pos.code})`);
            }
            catch (error) {
                console.error(`❌ Error creating position ${posData.code}:`, error.message);
            }
        }
        console.log(`\n✅ Seeding complete!`);
        console.log(`   Created ${createdDepartments.length} departments`);
        console.log(`   Created ${createdPositions.length} positions`);
        console.log('\n📋 IDs for Employee Creation:');
        console.log('\n📁 Departments:');
        createdDepartments.forEach((dept) => {
            console.log(`   - ${dept.name} (${dept.code}): ${dept._id}`);
        });
        console.log('\n💼 Positions:');
        createdPositions.forEach((pos) => {
            console.log(`   - ${pos.title} (${pos.code}): ${pos._id}`);
        });
        console.log('\n📝 Example Employee with Position:');
        if (createdPositions.length > 0 && createdDepartments.length > 0) {
            console.log(JSON.stringify({
                firstName: 'Ahmed',
                lastName: 'Mohamed',
                nationalId: '12345678901234',
                dateOfHire: '2024-01-15T00:00:00.000Z',
                primaryPositionId: createdPositions[0]._id.toString(),
                primaryDepartmentId: createdDepartments[0]._id.toString(),
            }, null, 2));
        }
    }
    catch (error) {
        console.error('❌ Error seeding organization structure:', error);
    }
    finally {
        await app.close();
    }
}
if (require.main === module) {
    seedOrgStructure().catch(console.error);
}
//# sourceMappingURL=seed-org-structure.js.map