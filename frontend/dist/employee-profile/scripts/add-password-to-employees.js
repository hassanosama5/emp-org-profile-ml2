"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPasswordsToEmployees = addPasswordsToEmployees;
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const employee_profile_service_1 = require("../employee-profile.service");
const bcrypt = __importStar(require("bcrypt"));
async function addPasswordsToEmployees() {
    console.log('🔐 Adding passwords to existing employees...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const employeeService = app.get(employee_profile_service_1.EmployeeProfileService);
    const defaultPassword = 'password123';
    try {
        const result = await employeeService.findAll({ limit: 1000, page: 1 }, undefined);
        const employees = result.data;
        if (!employees || employees.length === 0) {
            console.log('⚠️  No employees found in database.');
            await app.close();
            return;
        }
        console.log(`Found ${employees.length} employees.\n`);
        let updatedCount = 0;
        const employeeServiceInternal = employeeService;
        const employeeModel = employeeServiceInternal.employeeModel;
        for (const emp of employees) {
            const employeeId = emp._id || emp.id;
            const fullEmployee = await employeeModel.findById(employeeId).exec();
            if (!fullEmployee || fullEmployee.password) {
                console.log(`⏭️  ${emp.fullName || emp.firstName} ${emp.lastName} - Already has password, skipping...`);
                continue;
            }
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            await employeeModel
                .findByIdAndUpdate(employeeId, {
                $set: { password: hashedPassword },
            })
                .exec();
            console.log(`✅ Added password to: ${emp.fullName || emp.firstName} ${emp.lastName} (${emp.employeeNumber})`);
            updatedCount++;
        }
        console.log(`\n✅ Complete! Updated ${updatedCount} employees with password.`);
        console.log(`\n📋 Login Credentials:`);
        console.log(`   Default password: ${defaultPassword}`);
        console.log(`\n🔐 To login, use:`);
        console.log(`   POST /api/v1/auth/login`);
        console.log(`   Body: { "employeeNumber": "EMP-XXXX-XXXX", "password": "${defaultPassword}" }`);
    }
    catch (error) {
        console.error('❌ Error adding passwords:', error);
    }
    finally {
        await app.close();
    }
}
if (require.main === module) {
    addPasswordsToEmployees().catch(console.error);
}
//# sourceMappingURL=add-password-to-employees.js.map