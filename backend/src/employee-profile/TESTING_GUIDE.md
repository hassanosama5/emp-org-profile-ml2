# Employee Profile Testing & Debugging Guide

This guide explains how to test and debug all employee-profile routes and ensure consistency with schemas.

## 📋 Table of Contents

1. [Running Tests](#running-tests)
2. [Route Validation](#route-validation)
3. [Debugging Routes](#debugging-routes)
4. [E2E Testing](#e2e-testing)
5. [Common Issues & Solutions](#common-issues--solutions)

## 🧪 Running Tests

### Unit Tests

Run unit tests for the controller:

```bash
npm test -- employee-profile.controller.spec
```

### E2E Tests

Run end-to-end tests for employee-profile routes:

```bash
npm run test:e2e:employee
```

Or run all E2E tests:

```bash
npm run test:e2e
```

### Test Coverage

Generate coverage report:

```bash
npm run test:cov
```

## ✅ Route Validation

The route validation script checks consistency between:

- Controller routes and their DTOs
- DTOs and Mongoose schemas
- Route wrameters and service methods
- Enum values and their usage

### Run Validation

```bash
npm run validate:routes
```

### What It Checks

1. **DTO Validation**
   - Required validators are present
   - Field types match expected patterns
   - Optional fields are properly marked

2. **Schema Validation**
   - Required fields exist in schemas
   - Enum types are used correctly
   - Field types match DTOs

3. **Enum Validation**
   - All required enums are defined
   - SystemRole values match controller usage

4. **Service Method Validation**
   - All required service methods exist
   - Proper error handling is in place

## 🔍 Debugging Routes

The debug script provides detailed information about all routes:

```bash
npm run debug:routes
```

### Output Includes

1. **Available Routes**
   - HTTP method and path
   - Handler function name
   - Route parameters
   - Query parameters

2. **DTO Mappings**
   - Which DTO is used for each route
   - DTO field information

3. **Role Requirements**
   - Which roles can access each route
   - Grouped by role requirements

4. **Route Parameters**
   - Path parameters and their types
   - Query parameters and their types
   - Request body structure

5. **Test Examples**
   - Sample requests for testing

## 🎯 E2E Testing

The E2E test suite (`test/employee-profile.e2e-spec.ts`) covers:

### Test Coverage

1. **POST /api/v1/employee-profile** - Create Employee
   - ✅ Valid data creation
   - ✅ Authentication required
   - ✅ Role-based access control
   - ✅ Validation errors
   - ✅ Duplicate national ID handling

2. **GET /api/v1/employee-profile** - List Employees
   - ✅ Pagination
   - ✅ Search functionality
   - ✅ Filtering by department, position, status
   - ✅ Sorting

3. **GET /api/v1/employee-profile/me** - Get My Profile
   - ✅ Returns current user profile
   - ✅ Authentication required

4. **PATCH /api/v1/employee-profile/me** - Update My Profile
   - ✅ Self-service updates
   - ✅ Field validation
   - ✅ Restricted fields

5. **GET /api/v1/employee-profile/stats** - Get Statistics
   - ✅ Returns employee statistics
   - ✅ Admin/HR Manager only

6. **GET /api/v1/employee-profile/department/:departmentId** - Get by Department
   - ✅ Department filtering
   - ✅ Invalid ID handling

7. **GET /api/v1/employee-profile/:id** - Get Employee by ID
   - ✅ Single employee retrieval
   - ✅ Invalid ID handling
   - ✅ Not found handling

8. **PATCH /api/v1/employee-profile/:id** - Update Employee
   - ✅ Employee updates
   - ✅ Role-based access
   - ✅ Validation

9. **DELETE /api/v1/employee-profile/:id** - Delete Employee
   - ✅ Soft delete (status change)
   - ✅ Admin/HR Manager only

10. **POST /api/v1/employee-profile/assign-roles** - Assign Roles
    - ✅ Role assignment
    - ✅ System Admin only
    - ✅ Validation

11. **GET /api/v1/employee-profile/:id/roles** - Get Employee Roles
    - ✅ Role retrieval
    - ✅ Admin/HR Manager only

### Running E2E Tests

Before running E2E tests, ensure:

1. MongoDB is running and accessible
2. Environment variables are set (`.env` file)
3. Test database is configured

```bash
# Set environment variables
export MONGODB_URI="mongodb://localhost:27017"
export JWT_SECRET="your-secret-key"

# Run tests
npm run test:e2e:employee
```

## 🔧 Common Issues & Solutions

### Issue: Validation Errors Not Caught

**Problem**: DTO validation not working as expected.

**Solution**:

- Ensure `ValidationPipe` is configured globally in `main.ts`
- Check that DTOs have proper decorators (`@IsString()`, `@IsEmail()`, etc.)
- Verify `whitelist: true` and `forbidNonWhitelisted: true` are set

### Issue: Route Not Found (404)

**Problem**: Route returns 404 even though it's defined.

**Solution**:

- Check route path matches exactly (case-sensitive)
- Verify global prefix is set correctly (`/api/v1`)
- Ensure controller is registered in module
- Check route order (specific routes before parameterized routes)

### Issue: Authentication Errors (401)

**Problem**: Routes return 401 Unauthorized.

**Solution**:

- Verify JWT token is valid and not expired
- Check token format: `Bearer <token>`
- Ensure `JWT_SECRET` matches between token creation and validation
- Verify guards are properly configured

### Issue: Role-Based Access Errors (403)

**Problem**: Routes return 403 Forbidden even with valid token.

**Solution**:

- Check user roles in JWT token payload
- Verify `RolesGuard` is working correctly
- Ensure role enum values match exactly (case-sensitive)
- Check route decorators have correct roles

### Issue: DTO-Schema Mismatch

**Problem**: Fields in DTO don't match schema.

**Solution**:

- Run validation script: `npm run validate:routes`
- Check that DTO fields match schema fields
- Verify field types are consistent
- Ensure required fields are marked in both DTO and schema

### Issue: Enum Validation Fails

**Problem**: Enum values not accepted.

**Solution**:

- Verify enum values match exactly (case-sensitive)
- Check enum is properly exported and imported
- Ensure `@IsEnum()` decorator is used in DTO
- Run validation script to check enum consistency

## 📊 Route Summary

| Method | Path                                                | DTO                          | Required Roles                                         | Description         |
| ------ | --------------------------------------------------- | ---------------------------- | ------------------------------------------------------ | ------------------- |
| POST   | `/api/v1/employee-profile`                          | CreateEmployeeDto            | SYSTEM_ADMIN, HR_MANAGER, HR_EMPLOYEE                  | Create new employee |
| GET    | `/api/v1/employee-profile`                          | QueryEmployeeDto             | SYSTEM_ADMIN, HR_MANAGER, HR_EMPLOYEE, DEPARTMENT_HEAD | List employees      |
| GET    | `/api/v1/employee-profile/me`                       | -                            | Authenticated                                          | Get own profile     |
| PATCH  | `/api/v1/employee-profile/me`                       | UpdateEmployeeSelfServiceDto | Authenticated                                          | Update own profile  |
| GET    | `/api/v1/employee-profile/stats`                    | -                            | SYSTEM_ADMIN, HR_MANAGER                               | Get statistics      |
| GET    | `/api/v1/employee-profile/department/:departmentId` | -                            | SYSTEM_ADMIN, HR_MANAGER, DEPARTMENT_HEAD              | Get by department   |
| GET    | `/api/v1/employee-profile/:id`                      | -                            | Authenticated                                          | Get employee by ID  |
| PATCH  | `/api/v1/employee-profile/:id`                      | UpdateEmployeeDto            | SYSTEM_ADMIN, HR_MANAGER, HR_EMPLOYEE                  | Update employee     |
| DELETE | `/api/v1/employee-profile/:id`                      | -                            | SYSTEM_ADMIN, HR_MANAGER                               | Delete employee     |
| POST   | `/api/v1/employee-profile/assign-roles`             | AssignSystemRoleDto          | SYSTEM_ADMIN                                           | Assign roles        |
| GET    | `/api/v1/employee-profile/:id/roles`                | -                            | SYSTEM_ADMIN, HR_MANAGER                               | Get employee roles  |

## 🚀 Quick Start

1. **Validate routes and schemas:**

   ```bash
   npm run validate:routes
   ```

2. **Debug route information:**

   ```bash
   npm run debug:routes
   ```

3. **Run unit tests:**

   ```bash
   npm test -- employee-profile.controller.spec
   ```

4. **Run E2E tests:**
   ```bash
   npm run test:e2e:employee
   ```

## 📝 Notes

- All routes require JWT authentication unless marked as public
- Route order matters: specific routes (like `/me`) must come before parameterized routes (like `/:id`)
- DTOs use class-validator decorators for validation
- Schemas use Mongoose decorators for database structure
- Enums should be used consistently across DTOs, schemas, and controllers
