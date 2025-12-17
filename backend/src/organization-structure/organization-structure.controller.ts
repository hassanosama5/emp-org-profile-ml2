import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OrganizationStructureService } from './organization-structure.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dto/department.dto';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionResponseDto,
} from './dto/position.dto';
import {
  CreatePositionAssignmentDto,
  UpdatePositionAssignmentDto,
  PositionAssignmentResponseDto,
} from './dto/position-assignment.dto';
import {
  CreateStructureChangeRequestDto,
  UpdateStructureChangeRequestDto,
  SubmitChangeRequestDto,
  StructureChangeRequestResponseDto,
} from './dto/structure-change-request.dto';
import {
  CreateStructureApprovalDto,
  UpdateApprovalDecisionDto,
  StructureApprovalResponseDto,
} from './dto/structure-approval.dto';
import { StructureRequestStatus } from './enums/organization-structure.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

@Controller('organization-structure')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationStructureController {
  constructor(
    private readonly structureService: OrganizationStructureService,
  ) {}

  // ============ DEPARTMENT ENDPOINTS ============

  /**
   * REQ-OSM-01: Create new department (System Admin only)
   * Action 1: Define and Create Department
   */
  @Post('departments')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.createDepartment(dto);
  }

  /**
   * REQ-SANV-01, REQ-SANV-02: View departments (All authenticated users)
   * Employees can view organizational hierarchy
   */
  @Get('departments')
  @Roles(
    SystemRole.SYSTEM_ADMIN,
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
  )
  async getAllDepartments(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.structureService.getAllDepartments(
      isActive !== undefined ? isActive === true : undefined,
    );
  }

  /**
   * REQ-SANV-01: View specific department details
   */
  @Get('departments/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getDepartmentById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getDepartmentById(id);
  }

  /**
   * REQ-OSM-02: Update existing department (System Admin only)
   * Action 2: Edit a Department
   */
  @Put('departments/:id')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.updateDepartment(id, dto);
  }

  /**
   * REQ-OSM-05: Deactivate department (System Admin only)
   * Action 3: Deactivate a Department - BR 12, BR 37
   */
  @Delete('departments/:id')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async deactivateDepartment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.deactivateDepartment(id);
  }

  /**
   * REQ-SANV-01: View department hierarchy (All users)
   * BR 24: Organizational structure viewable as graphical chart
   */
  @Get('departments/hierarchy/all')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getDepartmentHierarchy(@CurrentUser() user: any) {
    return this.structureService.getDepartmentHierarchy();
  }

  // ============ POSITION ENDPOINTS ============

  /**
   * REQ-OSM-01: Create new position (System Admin only)
   * Action 1: Define and Create Position - BR 10, BR 30
   */
  @Post('positions')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async createPosition(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.createPosition(dto);
  }

  /**
   * REQ-SANV-01: View positions (All authenticated users)
   */
  @Get('positions')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getAllPositions(
    @CurrentUser() user: any,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.structureService.getAllPositions(
      departmentId,
      isActive !== undefined ? isActive === true : undefined,
    );
  }

  /**
   * REQ-SANV-01: View specific position details
   */
  @Get('positions/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getPositionById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getPositionById(id);
  }

  /**
   * REQ-OSM-02: Update existing position (System Admin only)
   * Action 2: Edit a Position
   */
  @Put('positions/:id')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.updatePosition(id, dto);
  }

  /**
   * REQ-OSM-05: Deactivate position (System Admin only)
   * Action 3: Deactivate A Position - BR 12, BR 16, BR 37
   */
  @Delete('positions/:id')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async deactivatePosition(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.deactivatePosition(id);
  }

  /**
   * REQ-SANV-01: View position hierarchy
   * BR 24: View as graphical chart
   */
  @Get('positions/:id/hierarchy')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getPositionHierarchy(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getPositionHierarchy(id);
  }

  // ============ POSITION ASSIGNMENT ENDPOINTS ============

  /**
   * Create position assignment (HR Admin and System Admin)
   */
  @Post('assignments')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async createPositionAssignment(
    @Body() dto: CreatePositionAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.createPositionAssignment(dto);
  }

  /**
   * View employee assignments
   * Employees can view their own, Managers can view team, Admins can view all
   * BR 41: Role-based access
   */
  @Get('assignments/employee/:employeeProfileId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getEmployeeAssignments(
    @Param('employeeProfileId') employeeProfileId: string,
    @CurrentUser() user: any,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    // Add service-level check to ensure employees can only see their own
    return this.structureService.getEmployeeAssignments(
      employeeProfileId,
      activeOnly === true,
    );
  }

  /**
   * View position assignments (Admin and Managers)
   */
  @Get('assignments/position/:positionId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getPositionAssignments(
    @Param('positionId') positionId: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getPositionAssignments(positionId);
  }

  /**
   * Update position assignment (HR Admin and System Admin only)
   */
  @Patch('assignments/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async updatePositionAssignment(
    @Param('id') id: string,
    @Body() dto: UpdatePositionAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.updatePositionAssignment(id, dto);
  }

  /**
   * End position assignment (HR Admin and System Admin only)
   */
  @Patch('assignments/:id/end')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async endPositionAssignment(
    @Param('id') id: string,
    @Body('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.endPositionAssignment(id, new Date(endDate));
  }

  // ============ CHANGE REQUEST ENDPOINTS ============

  /**
   * REQ-OSM-03: Manager submits change request
   * Action: Receive a Request for a new Position in the Department
   * BR 36: All changes via workflow approval
   */
  @Post('change-requests')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async createChangeRequest(
    @Body() dto: CreateStructureChangeRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.createChangeRequest(dto);
  }

  /**
   * REQ-OSM-04: View change requests
   * System Admin reviews all, Managers see their own
   */
  @Get('change-requests')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getAllChangeRequests(
    @CurrentUser() user: any,
    @Query('status') status?: StructureRequestStatus,
  ) {
    return this.structureService.getAllChangeRequests(status);
  }

  /**
   * View specific change request
   */
  @Get('change-requests/:id')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getChangeRequestById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getChangeRequestById(id);
  }

  /**
   * Update change request (Only requester can update draft)
   * REQ-OSM-03: Manager modifies draft request
   */
  @Put('change-requests/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async updateChangeRequest(
    @Param('id') id: string,
    @Body() dto: UpdateStructureChangeRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.updateChangeRequest(id, dto);
  }

  /**
   * Submit change request for approval
   * REQ-OSM-03: Manager submits request for approval
   * BR 36: Changes require workflow approval
   */
  @Post('change-requests/:id/submit')
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async submitChangeRequest(
    @Param('id') id: string,
    @Body() dto: SubmitChangeRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.submitChangeRequest(id, dto);
  }

  /**
   * Cancel change request
   */
  @Post('change-requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async cancelChangeRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.cancelChangeRequest(id);
  }

  // ============ APPROVAL ENDPOINTS ============

  /**
   * Create approval (System creates on submission)
   * System Admin assigns approvers
   */
  @Post('approvals')
  @Roles(SystemRole.SYSTEM_ADMIN)
  async createApproval(
    @Body() dto: CreateStructureApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.createApproval(dto);
  }

  /**
   * REQ-OSM-04: System Admin makes approval decision
   * BR 36: Approval workflow enforcement
   * REQ-OSM-09: Validation rules applied
   */
  @Patch('approvals/:id/decision')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async updateApprovalDecision(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.structureService.updateApprovalDecision(id, dto);
  }

  /**
   * Get approvals for a change request
   */
  @Get('approvals/change-request/:changeRequestId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
  async getRequestApprovals(
    @Param('changeRequestId') changeRequestId: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getRequestApprovals(changeRequestId);
  }

  // ============ CHANGE LOG ENDPOINTS ============

  /**
   * View change logs (Admin only)
   * REQ-OSM-11: Audit trail for structural changes
   * BR 22: Version history and audit logs
   */
  @Get('change-logs')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async getChangeLogs(
    @CurrentUser() user: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.structureService.getChangeLogs(entityType, entityId);
  }

  /**
   * NEW: Get change logs for specific entity
   * BR 22: Detailed audit trail
   */
  @Get('change-logs/:entityType/:entityId')
  @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
  async getEntityChangeLogs(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: any,
  ) {
    return this.structureService.getChangeLogs(entityType, entityId);
  }
}