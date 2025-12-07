import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { EmployeeProfileService } from '../src/employee-profile/employee-profile.service';
import { JwtService } from '@nestjs/jwt';
import { SystemRole } from '../src/employee-profile/enums/employee-profile.enums';

describe('EmployeeProfileController (e2e)', () => {
  let app: INestApplication;
  let employeeProfileService: EmployeeProfileService;
  let jwtService: JwtService;
  let authToken: string;
  let adminToken: string;
  let hrManagerToken: string;
  let employeeToken: string;
  let testEmployeeId: string;
  let testDepartmentId: string;

  // Helper function to create JWT token
  const createToken = (
    jwtService: JwtService,
    userId: string,
    roles: SystemRole[] = [SystemRole.DEPARTMENT_EMPLOYEE],
  ) => {
    return jwtService.sign({
      sub: userId,
      username: 'testuser',
      roles: roles,
      permissions: [],
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api/v1');
    await app.init();

    employeeProfileService = moduleFixture.get<EmployeeProfileService>(
      EmployeeProfileService,
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Use test IDs for tokens - individual tests will create employees as needed
    const testUserId = '507f1f77bcf86cd799439011';
    adminToken = createToken(jwtService, testUserId, [SystemRole.SYSTEM_ADMIN]);
    hrManagerToken = createToken(jwtService, testUserId, [
      SystemRole.HR_MANAGER,
    ]);
    employeeToken = createToken(jwtService, testUserId, [
      SystemRole.DEPARTMENT_EMPLOYEE,
    ]);
    authToken = adminToken; // Default token
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);

  describe('POST /api/v1/employee-profile - Create Employee', () => {
    // Generate unique national ID for each test run
    const getValidEmployeeData = () => ({
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Middle',
      nationalId: `1234567890${Date.now().toString().slice(-4)}`,
      dateOfHire: new Date().toISOString(),
      personalEmail: 'john.doe@example.com',
      workEmail: 'john.doe@company.com',
      mobilePhone: '1234567890',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      dateOfBirth: '1990-01-01T00:00:00.000Z',
    });

    it('should create an employee with valid data (201)', async () => {
      const validEmployeeData = getValidEmployeeData();
      const response = await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEmployeeData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('employeeNumber');
      expect(response.body.data.firstName).toBe(validEmployeeData.firstName);
      testEmployeeId = response.body.data._id || response.body.data.id;
    });

    it('should fail without authentication (401)', async () => {
      const validEmployeeData = getValidEmployeeData();
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .send(validEmployeeData)
        .expect(401);
    });

    it('should fail with insufficient role (403)', async () => {
      const validEmployeeData = getValidEmployeeData();
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(validEmployeeData)
        .expect(403);
    });

    it('should fail with invalid national ID format (400)', async () => {
      const validEmployeeData = getValidEmployeeData();
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validEmployeeData,
          nationalId: '123', // Invalid: must be 14 digits
        })
        .expect(400);
    });

    it('should fail with missing required fields (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'John',
          // Missing lastName and nationalId
        })
        .expect(400);
    });

    it('should fail with duplicate national ID (409)', async () => {
      const validEmployeeData = getValidEmployeeData();
      // First create an employee
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEmployeeData)
        .expect(201);

      // Then try to create another with the same national ID
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validEmployeeData,
          firstName: 'Different',
        })
        .expect(409);
    });

    it('should reject non-whitelisted properties (400)', async () => {
      const validEmployeeData = getValidEmployeeData();
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validEmployeeData,
          invalidField: 'should be rejected',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/employee-profile - List Employees', () => {
    it('should return paginated employees (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employee-profile?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });

    it('should support search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employee-profile?search=John')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should support filtering by department', async () => {
      if (testDepartmentId) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/employee-profile?departmentId=${testDepartmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
      }
    });

    it('should support filtering by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employee-profile?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should fail without authentication (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employee-profile')
        .expect(401);
    });
  });

  describe('GET /api/v1/employee-profile/me - Get My Profile', () => {
    it('should return current user profile (200)', async () => {
      // First create an employee for the test
      const uniqueNationalId = `1111111111${Date.now().toString().slice(-4)}`;
      const testEmployee = await employeeProfileService.create({
        firstName: 'Test',
        lastName: 'User',
        nationalId: uniqueNationalId,
        dateOfHire: new Date(),
      });
      const testEmployeeId = (testEmployee as any)._id?.toString();
      const testToken = createToken(jwtService, testEmployeeId, [
        SystemRole.DEPARTMENT_EMPLOYEE,
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/employee-profile/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should fail without authentication (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employee-profile/me')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/employee-profile/me - Update My Profile', () => {
    it('should update own profile with valid data (200)', async () => {
      // First create an employee for the test
      const uniqueNationalId = `2222222222${Date.now().toString().slice(-4)}`;
      const testEmployee = await employeeProfileService.create({
        firstName: 'Update',
        lastName: 'Test',
        nationalId: uniqueNationalId,
        dateOfHire: new Date(),
      });
      const testEmployeeId = (testEmployee as any)._id?.toString();
      const testToken = createToken(jwtService, testEmployeeId, [
        SystemRole.DEPARTMENT_EMPLOYEE,
      ]);

      const updateData = {
        personalEmail: 'updated@example.com',
        mobilePhone: '9876543210',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/v1/employee-profile/me')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should reject invalid email format (400)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/employee-profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          personalEmail: 'invalid-email',
        })
        .expect(400);
    });

    it('should reject invalid phone format (400)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/employee-profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          mobilePhone: '123', // Too short
        })
        .expect(400);
    });

    it('should reject restricted fields (400)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/employee-profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          firstName: 'Hacked', // Should not be allowed in self-service
          nationalId: '99999999999999', // Should not be allowed
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/employee-profile/stats - Get Statistics', () => {
    it('should return employee statistics (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employee-profile/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byStatus');
    });

    it('should fail without admin role (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employee-profile/stats')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/employee-profile/department/:departmentId - Get by Department', () => {
    it('should return employees by department (200)', async () => {
      if (testDepartmentId) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/employee-profile/department/${testDepartmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should fail with invalid department ID (400)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employee-profile/department/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/employee-profile/:id - Get Employee by ID', () => {
    it('should return employee by ID (200)', async () => {
      if (testEmployeeId) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/employee-profile/${testEmployeeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).not.toHaveProperty('password');
      }
    });

    it('should fail with invalid ID format (400)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employee-profile/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should fail with non-existent ID (404)', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app.getHttpServer())
        .get(`/api/v1/employee-profile/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/employee-profile/:id - Update Employee', () => {
    it('should update employee with valid data (200)', async () => {
      if (testEmployeeId) {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          workEmail: 'updated@company.com',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/employee-profile/${testEmployeeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.firstName).toBe(updateData.firstName);
      }
    });

    it('should fail without proper role (403)', async () => {
      if (testEmployeeId) {
        await request(app.getHttpServer())
          .patch(`/api/v1/employee-profile/${testEmployeeId}`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({ firstName: 'Updated' })
          .expect(403);
      }
    });

    it('should reject invalid email format (400)', async () => {
      if (testEmployeeId) {
        await request(app.getHttpServer())
          .patch(`/api/v1/employee-profile/${testEmployeeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            workEmail: 'invalid-email',
          })
          .expect(400);
      }
    });
  });

  describe('DELETE /api/v1/employee-profile/:id - Delete Employee', () => {
    it('should soft delete employee (204)', async () => {
      // Create a new employee for deletion with unique national ID
      const uniqueNationalId = `8888888888${Date.now().toString().slice(-4)}`;
      const employeeData = {
        firstName: 'ToDelete',
        lastName: 'Employee',
        nationalId: uniqueNationalId,
        dateOfHire: new Date().toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/employee-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      const deleteId =
        createResponse.body.data._id || createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/employee-profile/${deleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should fail without admin role (403)', async () => {
      if (testEmployeeId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/employee-profile/${testEmployeeId}`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(403);
      }
    });
  });

  describe('POST /api/v1/employee-profile/assign-roles - Assign Roles', () => {
    it('should assign roles to employee (200)', async () => {
      if (testEmployeeId) {
        const roleData = {
          employeeProfileId: testEmployeeId,
          roles: [SystemRole.HR_EMPLOYEE],
          permissions: ['read:employees', 'write:employees'],
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/employee-profile/assign-roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(roleData)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should fail without admin role (403)', async () => {
      if (testEmployeeId) {
        await request(app.getHttpServer())
          .post('/api/v1/employee-profile/assign-roles')
          .set('Authorization', `Bearer ${hrManagerToken}`)
          .send({
            employeeProfileId: testEmployeeId,
            roles: [SystemRole.HR_EMPLOYEE],
          })
          .expect(403);
      }
    });

    it('should fail with invalid employee ID (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/employee-profile/assign-roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeProfileId: 'invalid-id',
          roles: [SystemRole.HR_EMPLOYEE],
        })
        .expect(400);
    });

    it('should fail with invalid role enum (400)', async () => {
      if (testEmployeeId) {
        await request(app.getHttpServer())
          .post('/api/v1/employee-profile/assign-roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            employeeProfileId: testEmployeeId,
            roles: ['INVALID_ROLE'],
          })
          .expect(400);
      }
    });
  });

  describe('GET /api/v1/employee-profile/:id/roles - Get Employee Roles', () => {
    it('should return employee roles (200)', async () => {
      if (testEmployeeId) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/employee-profile/${testEmployeeId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should fail without proper role (403)', async () => {
      if (testEmployeeId) {
        await request(app.getHttpServer())
          .get(`/api/v1/employee-profile/${testEmployeeId}/roles`)
          .set('Authorization', `Bearer ${employeeToken}`)
          .expect(403);
      }
    });
  });

  describe('Route Consistency Checks', () => {
    it('should have consistent response structure across all GET routes', async () => {
      const routes = [
        '/api/v1/employee-profile',
        '/api/v1/employee-profile/me',
        '/api/v1/employee-profile/stats',
      ];

      for (const route of routes) {
        const response = await request(app.getHttpServer())
          .get(route)
          .set('Authorization', `Bearer ${adminToken}`);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('data');
        }
      }
    });

    it('should validate all enum values', async () => {
      const invalidStatus = 'INVALID_STATUS';
      await request(app.getHttpServer())
        .get(`/api/v1/employee-profile?status=${invalidStatus}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
