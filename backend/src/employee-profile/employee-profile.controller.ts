// src/employee-profile/employee-profile.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeeProfileService } from './employee-profile.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeSelfServiceDto,
  QueryEmployeeDto,
  AssignSystemRoleDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  CreateProfileChangeRequestDto,
  ProcessProfileChangeRequestDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole, CandidateStatus } from './enums/employee-profile.enums';
import { RegisterCandidateDto } from './dto/register-candidate.dto';
import { GetChangeRequestsDto } from './dto/get-change-requests.dto';

@Controller('employee-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeProfileController {
  constructor(
    private readonly employeeProfileService: EmployeeProfileService,
  ) {}

  // ==================== EMPLOYEE ROUTES ====================

  @Post()
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const employee =
      await this.employeeProfileService.create(createEmployeeDto);
    return {
      message: 'Employee created successfully',
      data: employee,
    };
  }

  @Get()
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async findAll(@Query() query: QueryEmployeeDto, @CurrentUser() user: any) {
    const result = await this.employeeProfileService.findAll(
      query,
      user.userId,
    );
    return {
      message: 'Employees retrieved successfully',
      ...result,
    };
  }

  @Get('me/profile')
  async getMyProfile(@CurrentUser() user: any) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('User information not found in token');
    }
    const employee = await this.employeeProfileService.findOne(user.userId);
    return {
      message: 'Profile retrieved successfully',
      data: employee,
    };
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateEmployeeSelfServiceDto,
  ) {
    const employee = await this.employeeProfileService.updateSelfService(
      user.userId,
      updateDto,
    );
    return {
      message: 'Profile updated successfully',
      data: employee,
    };
  }

  @Patch('me/contact')
  async updateMyContact(
    @CurrentUser() user: any,
    @Body()
    contactData: {
      personalEmail?: string;
      mobilePhone?: string;
      homePhone?: string;
      address?: {
        city?: string;
        streetAddress?: string;
        country?: string;
      };
    },
  ) {
    const employee = await this.employeeProfileService.updateSelfService(
      user.userId,
      contactData,
    );
    return {
      message: 'Contact information updated successfully',
      data: employee,
    };
  }

  @Patch('me/banking')
  async updateMyBanking(
    @CurrentUser() user: any,
    @Body()
    bankingData: {
      bankName?: string;
      bankAccountNumber?: string;
    },
  ) {
    const employee = await this.employeeProfileService.updateBankingInfo(
      user.userId,
      bankingData,
    );
    return {
      message: 'Banking information updated successfully',
      data: employee,
    };
  }

  @Patch('me/biography')
  async updateMyBiography(
    @CurrentUser() user: any,
    @Body() biographyData: { biography?: string },
  ) {
    const employee = await this.employeeProfileService.updateBiography(
      user.userId,
      biographyData.biography,
    );
    return {
      message: 'Biography updated successfully',
      data: employee,
    };
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadProfilePhoto(
    @CurrentUser() user: any,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    const profilePictureUrl =
      await this.employeeProfileService.uploadProfilePhoto(user.userId, photo);
    return {
      message: 'Profile photo uploaded successfully',
      data: { profilePictureUrl },
    };
  }

  @Get('stats')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  async getStats() {
    const stats = await this.employeeProfileService.getEmployeeStats();
    return {
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('department/:departmentId')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async findByDepartment(@Param('departmentId') departmentId: string) {
    const employees =
      await this.employeeProfileService.findByDepartment(departmentId);
    return {
      message: 'Department employees retrieved successfully',
      data: employees,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const employee = await this.employeeProfileService.findOne(id);
    return {
      message: 'Employee retrieved successfully',
      data: employee,
    };
  }

  @Patch(':id')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeProfileService.update(
      id,
      updateEmployeeDto,
    );
    return {
      message: 'Employee updated successfully',
      data: employee,
    };
  }

  @Delete(':id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.employeeProfileService.remove(id);
    return {
      message: 'Employee deactivated successfully',
    };
  }

  @Get(':id/pdf')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
  )
  async exportToPdf(@Param('id') id: string) {
    const pdfBuffer = await this.employeeProfileService.exportToPdf(id);
    return {
      message: 'PDF export completed successfully',
      data: pdfBuffer.toString('base64'),
    };
  }

  @Get('export/excel')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
  )
  async exportToExcel(@Query() query: QueryEmployeeDto) {
    const excelBuffer = await this.employeeProfileService.exportToExcel(query);
    return {
      message: 'Excel export completed successfully',
      data: excelBuffer.toString('base64'),
    };
  }

  // ==================== SYSTEM ROLE ROUTES ====================

  @Post('assign-roles')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignRoles(@Body() assignRoleDto: AssignSystemRoleDto) {
    const systemRole = await this.employeeProfileService.assignSystemRoles(
      assignRoleDto.employeeProfileId,
      assignRoleDto.roles,
      assignRoleDto.permissions,
    );
    return {
      message: 'Roles assigned successfully',
      data: systemRole,
    };
  }

  @Post(':employeeId/roles')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async assignRolesToEmployee(
    @Param('employeeId') employeeId: string,
    @Body() assignRoleDto: Omit<AssignSystemRoleDto, 'employeeProfileId'>,
  ) {
    const systemRole = await this.employeeProfileService.assignSystemRoles(
      employeeId,
      assignRoleDto.roles,
      assignRoleDto.permissions,
    );
    return {
      message: 'Roles assigned successfully',
      data: systemRole,
    };
  }

  @Get(':employeeId/roles')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN)
  async getEmployeeRoles(@Param('employeeId') employeeId: string) {
    const roles = await this.employeeProfileService.getSystemRoles(employeeId);
    return {
      message: 'Employee roles retrieved successfully',
      data: roles,
    };
  }

  @Patch(':employeeId/roles')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async updateEmployeeRoles(
    @Param('employeeId') employeeId: string,
    @Body()
    updateRoleDto: {
      roles?: SystemRole[];
      permissions?: string[];
    },
  ) {
    const systemRole = await this.employeeProfileService.updateSystemRoles(
      employeeId,
      updateRoleDto.roles,
      updateRoleDto.permissions,
    );
    return {
      message: 'Roles updated successfully',
      data: systemRole,
    };
  }

  @Patch(':employeeId/roles/deactivate')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async deactivateEmployeeRoles(@Param('employeeId') employeeId: string) {
    await this.employeeProfileService.deactivateSystemRoles(employeeId);
    return {
      message: 'Employee roles deactivated successfully',
    };
  }

  // ==================== CANDIDATE ROUTES ====================

  @Post('candidate')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  @HttpCode(HttpStatus.CREATED)
  async createCandidate(@Body() createCandidateDto: CreateCandidateDto) {
    const candidate =
      await this.employeeProfileService.createCandidate(createCandidateDto);
    return {
      message: 'Candidate created successfully',
      data: candidate,
    };
  }

  @Get('candidate')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  async findAllCandidates(@Query() query: any) {
    const candidates =
      await this.employeeProfileService.findAllCandidatesWithFilters(query);
    return {
      message: 'Candidates retrieved successfully',
      data: candidates,
    };
  }

  @Get('candidate/:id')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  async findCandidateById(@Param('id') id: string) {
    const candidate = await this.employeeProfileService.findCandidateById(id);
    return {
      message: 'Candidate retrieved successfully',
      data: candidate,
    };
  }

  @Patch('candidate/:id')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  async updateCandidate(
    @Param('id') id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
  ) {
    const candidate = await this.employeeProfileService.updateCandidate(
      id,
      updateCandidateDto,
    );
    return {
      message: 'Candidate updated successfully',
      data: candidate,
    };
  }

  @Delete('candidate/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCandidate(@Param('id') id: string) {
    await this.employeeProfileService.removeCandidate(id);
    return {
      message: 'Candidate removed successfully',
    };
  }

  @Post('candidate/:id/convert-to-employee')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async convertCandidateToEmployee(
    @Param('id') candidateId: string,
    @Body()
    employeeData: {
      workEmail: string;
      dateOfHire: Date;
      contractType: string;
      workType: string;
      password?: string;
      primaryDepartmentId?: string;
      primaryPositionId?: string;
    },
  ) {
    const employee =
      await this.employeeProfileService.convertCandidateToEmployee(
        candidateId,
        employeeData,
      );
    return {
      message: 'Candidate converted to employee successfully',
      data: employee,
    };
  }

  @Patch('candidate/:id/status')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  async updateCandidateStatus(
    @Param('id') id: string,
    @Body() statusData: { status: CandidateStatus },
  ) {
    const candidate = await this.employeeProfileService.updateCandidateStatus(
      id,
      statusData.status,
    );
    return {
      message: 'Candidate status updated successfully',
      data: candidate,
    };
  }

  @Get('candidate/status/:status')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.RECRUITER,
  )
  async findCandidatesByStatus(@Param('status') status: string) {
    const candidates =
      await this.employeeProfileService.findCandidatesByStatus(status);
    return {
      message: 'Candidates retrieved successfully',
      data: candidates,
    };
  }

  // ==================== PROFILE CHANGE REQUEST ROUTES ====================

  @Post('change-request')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async createProfileChangeRequest(
    @CurrentUser() user: any,
    @Body() createRequestDto: CreateProfileChangeRequestDto,
  ) {
    const changeRequest =
      await this.employeeProfileService.createProfileChangeRequest(
        user.userId,
        createRequestDto,
      );
    return {
      message: 'Profile change request submitted successfully',
      data: changeRequest,
    };
  }

  @Get('change-request/my-requests')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  async getMyChangeRequests(@CurrentUser() user: any) {
    const requests =
      await this.employeeProfileService.getProfileChangeRequestsByEmployee(
        user.userId,
      );
    return {
      message: 'Your change requests retrieved successfully',
      data: requests,
    };
  }

  // 1. Comment out the original endpoint
  // @Get('change-request')
  // async getAllChangeRequests(@Query() query: GetChangeRequestsDto) { ... }

  // 2. Create new identical endpoint with same route
  @Get('approval-requests')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async getAllChangeRequestsHR(@Query() query: GetChangeRequestsDto) {
    console.log('=== NEW ENDPOINT WITH SAME ROUTE ===');

    const requests =
      await this.employeeProfileService.getAllProfileChangeRequestsWithFilters(
        query,
      );

    return {
      message: 'Change requests retrieved successfully',
      data: requests,
    };
  }

  @Get('change-request/copy')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async copyOfOriginal(@Query() query: GetChangeRequestsDto) {
    console.log('=== COPY OF ORIGINAL ENDPOINT ===');
    console.log('DTO received:', query);

    try {
      // Call the EXACT SAME service method
      const requests =
        await this.employeeProfileService.getAllProfileChangeRequestsWithFilters(
          query,
        );

      console.log('Copy successful! Found', requests.length, 'requests');
      return {
        message: 'Copy endpoint successful',
        data: requests,
      };
    } catch (error) {
      console.error('COPY ENDPOINT ERROR:', error);
      throw error;
    }
  }

  @Get('change-request/test-with-dto')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async testWithDto(@Query() query: GetChangeRequestsDto) {
    console.log('=== TEST WITH DTO ===');
    console.log('DTO received:', query);
    console.log('Type of query:', typeof query);
    console.log('Is DTO instance?', query instanceof GetChangeRequestsDto);

    // Immediately return what we received
    return {
      message: 'DTO test successful',
      queryReceived: query,
      hasEmployeeId: 'employeeId' in query,
      employeeIdValue: query.employeeId,
      employeeIdType: typeof query.employeeId,
    };
  }

  @Get('change-request/test-simple')
  async testSimple() {
    console.log('=== SIMPLE TEST ===');

    try {
      // Call service with hardcoded valid parameters
      const requests =
        await this.employeeProfileService.getAllProfileChangeRequestsWithFilters(
          { status: 'PENDING', employeeId: '000000000000000000000001' }, // Valid ObjectId
        );

      return {
        message: 'Simple test successful',
        count: requests.length,
      };
    } catch (error) {
      console.error('SIMPLE TEST ERROR:', error);
      return {
        message: 'Simple test failed',
        error: (error as Error).message,
        stack: (error as Error).stack,
      };
    }
  }

  @Get('change-request/debug-minimal')
  async debugMinimal(@Query() query: any) {
    console.log('=== DEBUG MINIMAL ===');
    console.log('Query received:', query);

    // Manually clean the query
    const cleanedQuery: any = {};

    if (query.status) cleanedQuery.status = query.status;

    // Only add employeeId if it's a valid ObjectId
    if (query.employeeId && query.employeeId.trim() !== '') {
      const trimmed = query.employeeId.trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        cleanedQuery.employeeId = trimmed;
      }
    }

    console.log('Cleaned query:', cleanedQuery);

    try {
      const requests =
        await this.employeeProfileService.getAllProfileChangeRequestsWithFilters(
          cleanedQuery,
        );

      return {
        message: 'Debug successful',
        count: requests.length,
        queryReceived: query,
        queryUsed: cleanedQuery,
      };
    } catch (error) {
      console.error('DEBUG ERROR:', error);
      return {
        message: 'Debug failed',
        error: (error as Error).message,
        queryReceived: query,
      };
    }
  }

  @Get('change-request/diagnostic')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async diagnostic(@Query() query: any) {
    console.log('=== DIAGNOSTIC ENDPOINT ===');
    console.log('1. Query received in controller:', query);
    console.log('2. Type of employeeId:', typeof query?.employeeId);
    console.log('3. employeeId value:', query?.employeeId);
    console.log(
      '4. employeeId === undefined:',
      query?.employeeId === undefined,
    );
    console.log('5. employeeId === "":', query?.employeeId === '');

    // Try calling the original endpoint's logic
    try {
      const requests =
        await this.employeeProfileService.getAllProfileChangeRequestsWithFilters(
          query,
        );

      return {
        message: 'Diagnostic successful',
        data: {
          queryReceived: query,
          requestCount: requests.length,
          hasEmployeeId: 'employeeId' in query,
          employeeIdValue: query?.employeeId,
          employeeIdType: typeof query?.employeeId,
        },
      };
    } catch (error) {
      return {
        message: 'Diagnostic failed',
        error: (error as Error).message,
        queryReceived: query,
      };
    }
  }

  @Get('change-request/:id')
  @Roles(
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async getChangeRequestById(@Param('id') id: string) {
    const request =
      await this.employeeProfileService.getProfileChangeRequestById(id);
    return {
      message: 'Change request retrieved successfully',
      data: request,
    };
  }

  @Patch('change-request/:id/process')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async processChangeRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessProfileChangeRequestDto,
  ) {
    const updatedRequest =
      await this.employeeProfileService.processProfileChangeRequest(
        id,
        processDto,
      );
    return {
      message: 'Change request processed successfully',
      data: updatedRequest,
    };
  }

  @Patch('change-request/:id/approve')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async approveChangeRequest(
    @Param('id') id: string,
    @Body() approveDto: { reason?: string },
  ) {
    const updatedRequest =
      await this.employeeProfileService.processProfileChangeRequest(id, {
        status: 'APPROVED',
        reason: approveDto.reason,
      });
    return {
      message: 'Change request approved successfully',
      data: updatedRequest,
    };
  }

  @Patch('change-request/:id/reject')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async rejectChangeRequest(
    @Param('id') id: string,
    @Body() rejectDto: { reason?: string },
  ) {
    const updatedRequest =
      await this.employeeProfileService.processProfileChangeRequest(id, {
        status: 'REJECTED',
        reason: rejectDto.reason,
      });
    return {
      message: 'Change request rejected successfully',
      data: updatedRequest,
    };
  }

  @Patch('change-request/:id/cancel')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  async cancelChangeRequest(@Param('id') id: string, @CurrentUser() user: any) {
    const updatedRequest =
      await this.employeeProfileService.cancelProfileChangeRequest(
        id,
        user.userId,
      );
    return {
      message: 'Change request cancelled successfully',
      data: updatedRequest,
    };
  }

  // ==================== QUALIFICATION ROUTES ====================

  @Post('qualification')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  async addQualification(
    @CurrentUser() user: any,
    @Body()
    qualificationData: {
      establishmentName: string;
      graduationType: string;
    },
  ) {
    const qualification = await this.employeeProfileService.addQualification(
      user.userId,
      qualificationData,
    );
    return {
      message: 'Qualification added successfully',
      data: qualification,
    };
  }

  @Post(':employeeId/qualifications')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async addQualificationForEmployee(
    @Param('employeeId') employeeId: string,
    @Body()
    qualificationData: {
      establishmentName: string;
      graduationType: string;
    },
  ) {
    const qualification = await this.employeeProfileService.addQualification(
      employeeId,
      qualificationData,
    );
    return {
      message: 'Qualification added successfully',
      data: qualification,
    };
  }

  @Get('qualification/my-qualifications')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  async getMyQualifications(@CurrentUser() user: any) {
    const qualifications =
      await this.employeeProfileService.getQualificationsByEmployee(
        user.userId,
      );
    return {
      message: 'Your qualifications retrieved successfully',
      data: qualifications,
    };
  }

  @Get(':employeeId/qualifications')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getEmployeeQualifications(@Param('employeeId') employeeId: string) {
    const qualifications =
      await this.employeeProfileService.getQualificationsByEmployee(employeeId);
    return {
      message: 'Employee qualifications retrieved successfully',
      data: qualifications,
    };
  }

  @Patch('qualifications/:qualId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  async updateQualification(
    @Param('qualId') qualificationId: string,
    @CurrentUser() user: any,
    @Body()
    qualificationData: {
      establishmentName?: string;
      graduationType?: string;
    },
  ) {
    const qualification = await this.employeeProfileService.updateQualification(
      qualificationId,
      user.userId,
      qualificationData,
    );
    return {
      message: 'Qualification updated successfully',
      data: qualification,
    };
  }

  @Delete('qualifications/:qualId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeQualification(
    @Param('qualId') qualificationId: string,
    @CurrentUser() user: any,
  ) {
    await this.employeeProfileService.removeQualification(
      qualificationId,
      user.userId,
    );
    return {
      message: 'Qualification removed successfully',
    };
  }

  // ==================== SEARCH ROUTES ====================

  @Post('search')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async advancedSearch(@Body() searchCriteria: any) {
    const results =
      await this.employeeProfileService.advancedSearch(searchCriteria);
    return {
      message: 'Search completed successfully',
      data: results,
    };
  }

  @Get('search/by-number/:employeeNumber')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_ADMIN,
  )
  async findByEmployeeNumber(@Param('employeeNumber') employeeNumber: string) {
    const employee =
      await this.employeeProfileService.findByEmployeeNumber(employeeNumber);
    return {
      message: 'Employee retrieved successfully',
      data: employee,
    };
  }

  @Get('search/by-national-id/:nationalId')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async findByNationalId(@Param('nationalId') nationalId: string) {
    const employee =
      await this.employeeProfileService.findByNationalId(nationalId);
    return {
      message: 'Employee retrieved successfully',
      data: employee,
    };
  }

  // ==================== TEAM MANAGEMENT ROUTES ====================

  @Get('team/members')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
  )
  async getTeamMembers(@CurrentUser() user: any) {
    const members = await this.employeeProfileService.getTeamMembers(
      user.userId,
    );
    return {
      message: 'Team members retrieved successfully',
      data: members,
    };
  }

  @Get('team/statistics')
  @Roles(
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
  )
  async getTeamStatistics(@CurrentUser() user: any) {
    const stats = await this.employeeProfileService.getTeamStatistics(
      user.userId,
    );
    return {
      message: 'Team statistics retrieved successfully',
      data: stats,
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerCandidate(@Body() registerDto: RegisterCandidateDto) {
    const candidate =
      await this.employeeProfileService.registerCandidate(registerDto);

    const { password, ...candidateWithoutPassword } = candidate;

    return {
      message: 'Candidate registered successfully',
      data: candidateWithoutPassword,
    };
  }
}
