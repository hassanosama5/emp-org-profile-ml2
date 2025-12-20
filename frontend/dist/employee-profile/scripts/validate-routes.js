"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteValidator = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class RouteValidator {
    constructor() {
        this.issues = [];
        this.expectedRoutes = [
            {
                method: 'POST',
                path: '/api/v1/employee-profile',
                dto: 'CreateEmployeeDto',
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE'],
            },
            {
                method: 'GET',
                path: '/api/v1/employee-profile',
                dto: 'QueryEmployeeDto',
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'DEPARTMENT_HEAD'],
            },
            {
                method: 'GET',
                path: '/api/v1/employee-profile/me',
                dto: null,
                roles: [],
            },
            {
                method: 'PATCH',
                path: '/api/v1/employee-profile/me',
                dto: 'UpdateEmployeeSelfServiceDto',
                roles: [],
            },
            {
                method: 'GET',
                path: '/api/v1/employee-profile/stats',
                dto: null,
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER'],
            },
            {
                method: 'GET',
                path: '/api/v1/employee-profile/department/:departmentId',
                dto: null,
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'],
            },
            {
                method: 'GET',
                path: '/api/v1/employee-profile/:id',
                dto: null,
                roles: [],
            },
            {
                method: 'PATCH',
                path: '/api/v1/employee-profile/:id',
                dto: 'UpdateEmployeeDto',
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE'],
            },
            {
                method: 'DELETE',
                path: '/api/v1/employee-profile/:id',
                dto: null,
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER'],
            },
            {
                method: 'POST',
                path: '/api/v1/employee-profile/assign-roles',
                dto: 'AssignSystemRoleDto',
                roles: ['SYSTEM_ADMIN'],
            },
            {
                method: 'GET',
                path: '/api/v1/employee-profile/:id/roles',
                dto: null,
                roles: ['SYSTEM_ADMIN', 'HR_MANAGER'],
            },
        ];
    }
    validate() {
        console.log('🔍 Starting Route Validation...\n');
        this.validateDTOs();
        this.validateSchemas();
        this.validateEnums();
        this.validateServiceMethods();
        this.printReport();
    }
    validateDTOs() {
        console.log('📋 Validating DTOs...');
        const dtoPath = (0, path_1.join)(__dirname, '../dto');
        const dtoFiles = [
            'create-employee.dto.ts',
            'update-employee.dto.ts',
            'query-employee.dto.ts',
            'assign-system-role.dto.ts',
        ];
        for (const file of dtoFiles) {
            try {
                const content = (0, fs_1.readFileSync)((0, path_1.join)(dtoPath, file), 'utf-8');
                if (file === 'create-employee.dto.ts') {
                    if (!content.includes('@IsString()') ||
                        !content.includes('firstName')) {
                        this.addIssue('error', `CreateEmployeeDto missing required validators`, file);
                    }
                    if (!content.includes('nationalId') ||
                        !content.includes('@Matches')) {
                        this.addIssue('error', `CreateEmployeeDto missing nationalId validation`, file);
                    }
                }
                if (file === 'query-employee.dto.ts') {
                    if (!content.includes('@IsOptional()')) {
                        this.addIssue('warning', `QueryEmployeeDto should have optional validators`, file);
                    }
                }
            }
            catch (error) {
                this.addIssue('error', `Cannot read DTO file: ${file}`, file);
            }
        }
    }
    validateSchemas() {
        console.log('📊 Validating Schemas...');
        const schemaPath = (0, path_1.join)(__dirname, '../models');
        try {
            const employeeProfileContent = (0, fs_1.readFileSync)((0, path_1.join)(schemaPath, 'employee-profile.schema.ts'), 'utf-8');
            const userSchemaContent = (0, fs_1.readFileSync)((0, path_1.join)(schemaPath, 'user-schema.ts'), 'utf-8');
            const employeeProfileFields = ['employeeNumber', 'dateOfHire', 'status'];
            for (const field of employeeProfileFields) {
                if (!employeeProfileContent.includes(field)) {
                    this.addIssue('error', `EmployeeProfile schema missing required field: ${field}`, 'employee-profile.schema.ts');
                }
            }
            const baseClassFields = ['firstName', 'lastName', 'nationalId'];
            for (const field of baseClassFields) {
                if (!userSchemaContent.includes(field)) {
                    this.addIssue('error', `UserProfileBase schema missing required field: ${field}`, 'user-schema.ts');
                }
            }
            if (!employeeProfileContent.includes('EmployeeStatus') ||
                !employeeProfileContent.includes('enum:')) {
                this.addIssue('warning', `Schema should use enum for status field`, 'employee-profile.schema.ts');
            }
            if (!employeeProfileContent.includes('extends UserProfileBase')) {
                this.addIssue('error', `EmployeeProfile should extend UserProfileBase`, 'employee-profile.schema.ts');
            }
        }
        catch (error) {
            this.addIssue('error', `Cannot read schema files: ${error}`, 'schema validation');
        }
    }
    validateEnums() {
        console.log('🔢 Validating Enums...');
        const enumPath = (0, path_1.join)(__dirname, '../enums/employee-profile.enums.ts');
        try {
            const content = (0, fs_1.readFileSync)(enumPath, 'utf-8');
            const requiredEnums = [
                'EmployeeStatus',
                'SystemRole',
                'Gender',
                'MaritalStatus',
                'ContractType',
                'WorkType',
            ];
            for (const enumName of requiredEnums) {
                if (!content.includes(`enum ${enumName}`)) {
                    this.addIssue('error', `Missing required enum: ${enumName}`, enumPath);
                }
            }
            const systemRoleValues = [
                'SYSTEM_ADMIN',
                'HR_MANAGER',
                'HR_EMPLOYEE',
                'DEPARTMENT_HEAD',
                'DEPARTMENT_EMPLOYEE',
            ];
            for (const role of systemRoleValues) {
                if (!content.includes(role)) {
                    this.addIssue('warning', `SystemRole enum may be missing: ${role}`, enumPath);
                }
            }
        }
        catch (error) {
            this.addIssue('error', `Cannot read enum file`, enumPath);
        }
    }
    validateServiceMethods() {
        console.log('⚙️  Validating Service Methods...');
        const servicePath = (0, path_1.join)(__dirname, '../employee-profile.service.ts');
        try {
            const content = (0, fs_1.readFileSync)(servicePath, 'utf-8');
            const requiredMethods = [
                'create',
                'findAll',
                'findOne',
                'update',
                'updateSelfService',
                'remove',
                'assignSystemRoles',
                'getSystemRoles',
                'findByDepartment',
                'getEmployeeStats',
            ];
            for (const method of requiredMethods) {
                if (!content.includes(`async ${method}(`)) {
                    this.addIssue('error', `Service missing required method: ${method}`, servicePath);
                }
            }
            if (!content.includes('NotFoundException') ||
                !content.includes('BadRequestException')) {
                this.addIssue('warning', `Service should use proper exception types`, servicePath);
            }
        }
        catch (error) {
            this.addIssue('error', `Cannot read service file`, servicePath);
        }
    }
    validateDTOSchemaConsistency() {
        console.log('🔗 Validating DTO-Schema Consistency...');
        const dtoPath = (0, path_1.join)(__dirname, '../dto/create-employee.dto.ts');
        const schemaPath = (0, path_1.join)(__dirname, '../models/employee-profile.schema.ts');
        try {
            const dtoContent = (0, fs_1.readFileSync)(dtoPath, 'utf-8');
            const schemaContent = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
            const commonFields = [
                'firstName',
                'lastName',
                'nationalId',
                'dateOfHire',
            ];
            for (const field of commonFields) {
                const inDto = dtoContent.includes(field);
                const inSchema = schemaContent.includes(field);
                if (inDto && !inSchema) {
                    this.addIssue('error', `Field ${field} in DTO but not in schema`, 'DTO-Schema');
                }
                if (inSchema && !inDto && field !== 'employeeNumber') {
                    this.addIssue('warning', `Field ${field} in schema but not in DTO`, 'DTO-Schema');
                }
            }
        }
        catch (error) {
            this.addIssue('error', `Cannot validate DTO-Schema consistency`, 'DTO-Schema');
        }
    }
    addIssue(severity, message, location) {
        this.issues.push({ severity, message, location });
    }
    printReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 VALIDATION REPORT');
        console.log('='.repeat(60) + '\n');
        const errors = this.issues.filter((i) => i.severity === 'error');
        const warnings = this.issues.filter((i) => i.severity === 'warning');
        if (errors.length > 0) {
            console.log(`❌ ERRORS (${errors.length}):`);
            errors.forEach((issue, index) => {
                console.log(`  ${index + 1}. [${issue.location}] ${issue.message}`);
            });
            console.log('');
        }
        if (warnings.length > 0) {
            console.log(`⚠️  WARNINGS (${warnings.length}):`);
            warnings.forEach((issue, index) => {
                console.log(`  ${index + 1}. [${issue.location}] ${issue.message}`);
            });
            console.log('');
        }
        if (errors.length === 0 && warnings.length === 0) {
            console.log('✅ All validations passed!\n');
        }
        console.log('='.repeat(60));
        console.log(`Total Issues: ${this.issues.length} (${errors.length} errors, ${warnings.length} warnings)`);
        console.log('='.repeat(60) + '\n');
        if (errors.length > 0) {
            process.exit(1);
        }
    }
}
exports.RouteValidator = RouteValidator;
if (require.main === module) {
    const validator = new RouteValidator();
    validator.validate();
}
//# sourceMappingURL=validate-routes.js.map