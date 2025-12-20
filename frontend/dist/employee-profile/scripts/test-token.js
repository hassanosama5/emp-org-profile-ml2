"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const employee_profile_service_1 = require("../employee-profile.service");
async function testToken() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const jwtService = app.get(jwt_1.JwtService);
    const configService = app.get(config_1.ConfigService);
    const employeeService = app.get(employee_profile_service_1.EmployeeProfileService);
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkVNUC0yMDI1LTAwMTMiLCJzdWIiOiI2OTJhMmNlODEwNGIwMWM0Nzc4YjAwY2QiLCJyb2xlcyI6WyJTeXN0ZW0gQWRtaW4iXSwicGVybWlzc2lvbnMiOlsiKiJdLCJpYXQiOjE3NjQzNzI0MTksImV4cCI6MTc2NDQ1ODgxOX0.hNkfPXsKmb1MDvjYazEpe4oMV26mATXUpZUBicy7ass';
    console.log('🔍 Testing Token Validation...\n');
    try {
        const decoded = jwtService.decode(token);
        console.log('✅ Token decoded successfully:');
        console.log(JSON.stringify(decoded, null, 2));
        console.log('');
        const secret = configService.get('JWT_SECRET') || 'your-secret-key';
        console.log(`🔑 JWT_SECRET: ${secret}`);
        console.log('');
        try {
            const verified = jwtService.verify(token, { secret });
            console.log('✅ Token verified successfully');
            console.log('');
            const userId = decoded.sub;
            console.log(`👤 User ID from token: ${userId}`);
            try {
                const employee = await employeeService.findOne(userId);
                console.log(`✅ User exists: ${employee.fullName} (${employee.employeeNumber})`);
            }
            catch (error) {
                console.log(`❌ User NOT found in database: ${error.message}`);
                console.log("   This is likely the issue! The user ID in the token doesn't exist.");
            }
        }
        catch (error) {
            console.log(`❌ Token verification failed: ${error.message}`);
            if (error.message.includes('secret')) {
                console.log('   ⚠️  JWT_SECRET mismatch! Make sure it matches.');
            }
            if (error.message.includes('expired')) {
                console.log('   ⚠️  Token is expired! Login again to get a new token.');
            }
        }
    }
    catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    finally {
        await app.close();
    }
}
testToken().catch(console.error);
//# sourceMappingURL=test-token.js.map