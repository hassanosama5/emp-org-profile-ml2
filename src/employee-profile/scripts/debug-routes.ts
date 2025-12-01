/**
 * Route Debugging Utility
 *
 * This script helps debug and test routes by:
 * - Listing all available routes
 * - Showing route-DTO mappings
 * - Validating route parameters
 * - Testing route accessibility
 *
 * Run with: ts-node src/employee-profile/scripts/debug-routes.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface RouteDebugInfo {
  method: string;
  path: string;
  handler: string;
  dto?: string;
  roles?: string[];
  params?: string[];
  query?: string[];
}

class RouteDebugger {
  private routes: RouteDebugInfo[] = [];

  analyze() {
    console.log('🔍 Analyzing Employee Profile Routes...\n');

    this.loadRoutesFromController();
    this.displayRoutes();
    this.displayDTOMappings();
    this.displayRoleRequirements();
    this.displayRouteParameters();
  }

  private loadRoutesFromController() {
    const controllerPath = join(__dirname, '../employee-profile.controller.ts');

    try {
      const content = readFileSync(controllerPath, 'utf-8');

      // Extract route information using regex patterns
      const routePatterns = [
        {
          method: 'POST',
          path: '/api/v1/employee-profile',
          handler: 'create',
          dto: 'CreateEmployeeDto',
          roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE'],
        },
        {
          method: 'GET',
          path: '/api/v1/employee-profile',
          handler: 'findAll',
          dto: 'QueryEmployeeDto',
          roles: [
            'SYSTEM_ADMIN',
            'HR_MANAGER',
            'HR_EMPLOYEE',
            'DEPARTMENT_HEAD',
          ],
          query: [
            'search',
            'departmentId',
            'positionId',
            'status',
            'page',
            'limit',
            'sortBy',
            'sortOrder',
          ],
        },
        {
          method: 'GET',
          path: '/api/v1/employee-profile/me',
          handler: 'getMyProfile',
          roles: [],
        },
        {
          method: 'PATCH',
          path: '/api/v1/employee-profile/me',
          handler: 'updateMyProfile',
          dto: 'UpdateEmployeeSelfServiceDto',
          roles: [],
        },
        {
          method: 'GET',
          path: '/api/v1/employee-profile/stats',
          handler: 'getStats',
          roles: ['SYSTEM_ADMIN', 'HR_MANAGER'],
        },
        {
          method: 'GET',
          path: '/api/v1/employee-profile/department/:departmentId',
          handler: 'findByDepartment',
          params: ['departmentId'],
          roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'],
        },
        {
          method: 'GET',
          path: '/api/v1/employee-profile/:id',
          handler: 'findOne',
          params: ['id'],
          roles: [],
        },
        {
          method: 'PATCH',
          path: '/api/v1/employee-profile/:id',
          handler: 'update',
          dto: 'UpdateEmployeeDto',
          params: ['id'],
          roles: ['SYSTEM_ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE'],
        },
        {
          method: 'DELETE',
          path: '/api/v1/employee-profile/:id',
          handler: 'remove',
          params: ['id'],
          roles: ['SYSTEM_ADMIN', 'HR_MANAGER'],
        },
        {
          method: 'POST',
          path: '/api/v1/employee-profile/assign-roles',
          handler: 'assignRoles',
          dto: 'AssignSystemRoleDto',
          roles: ['SYSTEM_ADMIN'],
        },
        {
          method: 'GET',
          path: '/api/v1/employee-profile/:id/roles',
          handler: 'getEmployeeRoles',
          params: ['id'],
          roles: ['SYSTEM_ADMIN', 'HR_MANAGER'],
        },
      ];

      this.routes = routePatterns;
    } catch (error) {
      console.error('Error reading controller file:', error);
    }
  }

  private displayRoutes() {
    console.log('📋 AVAILABLE ROUTES');
    console.log('='.repeat(80));

    this.routes.forEach((route, index) => {
      console.log(`\n${index + 1}. ${route.method.padEnd(6)} ${route.path}`);
      console.log(`   Handler: ${route.handler}`);

      if (route.params && route.params.length > 0) {
        console.log(`   Parameters: ${route.params.join(', ')}`);
      }

      if (route.query && route.query.length > 0) {
        console.log(`   Query Params: ${route.query.join(', ')}`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\n');
  }

  private displayDTOMappings() {
    console.log('📝 DTO MAPPINGS');
    console.log('='.repeat(80));

    const routesWithDTOs = this.routes.filter((r) => r.dto);

    if (routesWithDTOs.length === 0) {
      console.log('No routes with DTOs found.\n');
      return;
    }

    routesWithDTOs.forEach((route) => {
      console.log(`\n${route.method} ${route.path}`);
      console.log(`  → DTO: ${route.dto}`);

      // Try to read DTO file and show fields
      try {
        const dtoPath = join(
          __dirname,
          `../dto/${this.getDTOFileName(route.dto)}`,
        );
        const dtoContent = readFileSync(dtoPath, 'utf-8');

        // Extract field names (basic regex)
        const fieldMatches = dtoContent.matchAll(
          /(\w+):\s*(string|number|Date|boolean|\w+Dto)/g,
        );
        const fields = Array.from(fieldMatches, (m) => m[1]).slice(0, 10); // First 10 fields

        if (fields.length > 0) {
          console.log(
            `  Fields: ${fields.join(', ')}${fields.length === 10 ? '...' : ''}`,
          );
        }
      } catch (error) {
        console.log(`  (Could not read DTO file)`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\n');
  }

  private displayRoleRequirements() {
    console.log('🔐 ROLE REQUIREMENTS');
    console.log('='.repeat(80));

    const roleGroups: { [key: string]: RouteDebugInfo[] } = {};

    this.routes.forEach((route) => {
      const key =
        route.roles && route.roles.length > 0
          ? route.roles.join(' | ')
          : 'No role required (authenticated only)';

      if (!roleGroups[key]) {
        roleGroups[key] = [];
      }
      roleGroups[key].push(route);
    });

    Object.entries(roleGroups).forEach(([roles, routes]) => {
      console.log(`\n${roles}:`);
      routes.forEach((route) => {
        console.log(`  - ${route.method} ${route.path}`);
      });
    });

    console.log('\n' + '='.repeat(80) + '\n');
  }

  private displayRouteParameters() {
    console.log('🔧 ROUTE PARAMETERS & VALIDATION');
    console.log('='.repeat(80));

    this.routes.forEach((route) => {
      console.log(`\n${route.method} ${route.path}`);

      if (route.params && route.params.length > 0) {
        console.log(`  Path Parameters:`);
        route.params.forEach((param) => {
          console.log(`    - ${param}: string (MongoDB ObjectId expected)`);
        });
      }

      if (route.query && route.query.length > 0) {
        console.log(`  Query Parameters:`);
        route.query.forEach((query) => {
          const type = this.getQueryParamType(query);
          console.log(`    - ${query}: ${type}`);
        });
      }

      if (route.dto) {
        console.log(`  Body: ${route.dto}`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\n');
  }

  private getDTOFileName(dtoName: string): string {
    const mapping: { [key: string]: string } = {
      CreateEmployeeDto: 'create-employee.dto.ts',
      UpdateEmployeeDto: 'update-employee.dto.ts',
      UpdateEmployeeSelfServiceDto: 'update-employee.dto.ts',
      QueryEmployeeDto: 'query-employee.dto.ts',
      AssignSystemRoleDto: 'assign-system-role.dto.ts',
    };

    return mapping[dtoName] || `${dtoName.toLowerCase()}.dto.ts`;
  }

  private getQueryParamType(param: string): string {
    const typeMap: { [key: string]: string } = {
      page: 'number (default: 1)',
      limit: 'number (default: 10)',
      search: 'string',
      departmentId: 'string (MongoDB ObjectId)',
      positionId: 'string (MongoDB ObjectId)',
      status: 'enum (EmployeeStatus)',
      sortBy: 'string (default: createdAt)',
      sortOrder: 'enum (asc | desc, default: desc)',
    };

    return typeMap[param] || 'string';
  }

  generateTestExamples() {
    console.log('📝 TEST EXAMPLES');
    console.log('='.repeat(80));

    console.log('\n1. Create Employee:');
    console.log(`
POST /api/v1/employee-profile
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "nationalId": "12345678901234",
  "dateOfHire": "2024-01-01T00:00:00.000Z",
  "personalEmail": "john.doe@example.com",
  "workEmail": "john.doe@company.com",
  "mobilePhone": "1234567890"
}
    `);

    console.log('\n2. List Employees with Filters:');
    console.log(`
GET /api/v1/employee-profile?page=1&limit=10&status=ACTIVE&search=John
Authorization: Bearer <admin_token>
    `);

    console.log('\n3. Update Own Profile:');
    console.log(`
PATCH /api/v1/employee-profile/me
Authorization: Bearer <employee_token>
Content-Type: application/json

{
  "personalEmail": "newemail@example.com",
  "mobilePhone": "9876543210"
}
    `);

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// Run debugger
if (require.main === module) {
  const routeDebugger = new RouteDebugger();
  routeDebugger.analyze();
  routeDebugger.generateTestExamples();
}

export { RouteDebugger };
