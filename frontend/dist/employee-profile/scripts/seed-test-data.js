"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTestData = seedTestData;
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const employee_profile_service_1 = require("../employee-profile.service");
const employee_system_role_schema_1 = require("../models/employee-system-role.schema");
const employee_profile_enums_1 = require("../enums/employee-profile.enums");
const mongoose_1 = require("@nestjs/mongoose");
async function seedTestData() {
    console.log('🌱 Seeding test data for Employee Profile...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const employeeService = app.get(employee_profile_service_1.EmployeeProfileService);
    const systemRoleModel = app.get((0, mongoose_1.getModelToken)(employee_system_role_schema_1.EmployeeSystemRole.name));
    try {
        const employees = [
            {
                firstName: 'John',
                lastName: 'Doe',
                middleName: 'Michael',
                nationalId: '12345678901234',
                password: 'password123',
                dateOfHire: new Date('2023-01-15'),
                personalEmail: 'john.doe@example.com',
                workEmail: 'john.doe@company.com',
                mobilePhone: '1234567890',
                gender: 'MALE',
                maritalStatus: 'SINGLE',
                dateOfBirth: new Date('1990-05-15'),
                status: employee_profile_enums_1.EmployeeStatus.ACTIVE,
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                nationalId: '23456789012345',
                password: 'password123',
                dateOfHire: new Date('2023-02-20'),
                personalEmail: 'jane.smith@example.com',
                workEmail: 'jane.smith@company.com',
                mobilePhone: '2345678901',
                gender: 'FEMALE',
                maritalStatus: 'MARRIED',
                dateOfBirth: new Date('1988-08-22'),
                status: employee_profile_enums_1.EmployeeStatus.ACTIVE,
            },
            {
                firstName: 'Admin',
                lastName: 'User',
                nationalId: '34567890123456',
                password: 'password123',
                dateOfHire: new Date('2022-06-01'),
                personalEmail: 'admin@example.com',
                workEmail: 'admin@company.com',
                mobilePhone: '3456789012',
                gender: 'MALE',
                status: employee_profile_enums_1.EmployeeStatus.ACTIVE,
            },
        ];
        console.log('Creating employees...');
        const createdEmployees = [];
        for (const empData of employees) {
            try {
                const employee = await employeeService.create(empData);
                createdEmployees.push(employee);
                console.log(`✅ Created employee: ${employee.fullName} (${employee.employeeNumber})`);
                const employeeId = employee._id;
                if (employee.fullName?.includes('Admin')) {
                    await systemRoleModel.findOneAndUpdate({ employeeProfileId: employeeId }, {
                        employeeProfileId: employeeId,
                        roles: [employee_profile_enums_1.SystemRole.SYSTEM_ADMIN],
                        permissions: ['*'],
                        isActive: true,
                    }, { upsert: true, new: true });
                    console.log(`   → Assigned SYSTEM_ADMIN role`);
                }
                else if (employee.fullName?.includes('Jane')) {
                    await systemRoleModel.findOneAndUpdate({ employeeProfileId: employeeId }, {
                        employeeProfileId: employeeId,
                        roles: [employee_profile_enums_1.SystemRole.HR_MANAGER],
                        permissions: ['read:employees', 'write:employees'],
                        isActive: true,
                    }, { upsert: true, new: true });
                    console.log(`   → Assigned HR_MANAGER role`);
                }
            }
            catch (error) {
                if (error.message?.includes('already exists')) {
                    console.log(`⚠️  Employee with nationalId ${empData.nationalId} already exists, skipping...`);
                }
                else {
                    console.error(`❌ Error creating employee ${empData.firstName} ${empData.lastName}:`, error.message);
                }
            }
        }
        console.log(`\n✅ Seeding complete! Created ${createdEmployees.length} employees.`);
        console.log('\n📋 Login Credentials:');
        console.log('   Default password for all employees: password123\n');
        createdEmployees.forEach((emp) => {
            console.log(`   👤 ${emp.fullName}`);
            console.log(`      Employee Number: ${emp.employeeNumber}`);
            console.log(`      Password: password123`);
            console.log(`      Role: ${emp.fullName?.includes('Admin') ? 'SYSTEM_ADMIN' : emp.fullName?.includes('Jane') ? 'HR_MANAGER' : 'DEPARTMENT_EMPLOYEE'}`);
            console.log(`      ID: ${emp._id}\n`);
        });
        console.log('\n🔐 To login, use:');
        console.log('   POST /api/v1/auth/login');
        console.log('   Body: { "employeeNumber": "EMP-XXXX-XXXX", "password": "password123" }');
    }
    catch (error) {
        console.error('❌ Error seeding data:', error);
    }
    finally {
        await app.close();
    }
}
if (require.main === module) {
    seedTestData().catch(console.error);
}
//# sourceMappingURL=seed-test-data.js.map