"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const employee_profile_service_1 = require("../employee-profile.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
async function checkUser() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const jwtService = app.get(jwt_1.JwtService);
    const configService = app.get(config_1.ConfigService);
    const employeeService = app.get(employee_profile_service_1.EmployeeProfileService);
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkVNUC0yMDI1LTAwMTMiLCJzdWIiOiI2OTJhMmNlODEwNGIwMWM0Nzc4YjAwY2QiLCJyb2xlcyI6WyJTeXN0ZW0gQWRtaW4iXSwicGVybWlzc2lvbnMiOlsiKiJdLCJpYXQiOjE3NjQzNzI0MTksImV4cCI6MTc2NDQ1ODgxOX0.hNkfPXsKmb1MDvjYazEpe4oMV26mATXUpZUBicy7ass';
    console.log('🔍 Checking token and user...\n');
    try {
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
        try {
            const employee = await employeeService.findOne(userId);
            console.log(`✅ User EXISTS in database:`);
            console.log(`   Name: ${employee.fullName}`);
            console.log(`   Employee Number: ${employee.employeeNumber}`);
            console.log(`   ID: ${employee._id}`);
            console.log('');
            console.log('✅ The /me endpoint should work!');
            console.log("   If it doesn't, the issue is with token validation, not the user.");
        }
        catch (error) {
            console.log(`❌ User NOT FOUND in database!`);
            console.log(`   Error: ${error.message}`);
            console.log('');
            console.log('🔧 Solution:');
            console.log('   1. Login again to get a fresh token');
            console.log('   2. Make sure you use the employee number that exists');
            console.log('   3. Try: EMP-2025-0013 with password: password123');
        }
        const secret = configService.get('JWT_SECRET') || 'your-secret-key';
        try {
            jwtService.verify(token, { secret });
            console.log('');
            console.log('✅ Token signature is valid');
        }
        catch (error) {
            console.log('');
            console.log(`❌ Token signature invalid: ${error.message}`);
            console.log("   This means JWT_SECRET doesn't match!");
        }
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    finally {
        await app.close();
    }
}
checkUser().catch(console.error);
//# sourceMappingURL=check-user.js.map