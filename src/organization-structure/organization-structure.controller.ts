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

@Controller('organization-structure')
export class OrganizationStructureController {
  constructor(
    private readonly structureService: OrganizationStructureService,
  ) {}

  // ============ DEPARTMENT ENDPOINTS ============

  @Post('departments')
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.structureService.createDepartment(dto);
  }

  @Get('departments')
  async getAllDepartments(@Query('isActive') isActive?: boolean) {
    return this.structureService.getAllDepartments(
      isActive !== undefined ? isActive === true : undefined,
    );
  }

  @Get('departments/:id')
  async getDepartmentById(@Param('id') id: string) {
    return this.structureService.getDepartmentById(id);
  }

  @Put('departments/:id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.structureService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  async deactivateDepartment(@Param('id') id: string) {
    return this.structureService.deactivateDepartment(id);
  }

  @Get('departments/hierarchy/all')
  async getDepartmentHierarchy() {
    return this.structureService.getDepartmentHierarchy();
  }

  // ============ POSITION ENDPOINTS ============

  @Post('positions')
  async createPosition(@Body() dto: CreatePositionDto) {
    return this.structureService.createPosition(dto);
  }

  @Get('positions')
  async getAllPositions(
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.structureService.getAllPositions(
      departmentId,
      isActive !== undefined ? isActive === true : undefined,
    );
  }

  @Get('positions/:id')
  async getPositionById(@Param('id') id: string) {
    return this.structureService.getPositionById(id);
  }

  @Put('positions/:id')
  async updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.structureService.updatePosition(id, dto);
  }

  @Delete('positions/:id')
  async deactivatePosition(@Param('id') id: string) {
    return this.structureService.deactivatePosition(id);
  }

  @Get('positions/:id/hierarchy')
  async getPositionHierarchy(@Param('id') id: string) {
    return this.structureService.getPositionHierarchy(id);
  }

  // ============ POSITION ASSIGNMENT ENDPOINTS ============

  @Post('assignments')
  async createPositionAssignment(@Body() dto: CreatePositionAssignmentDto) {
    return this.structureService.createPositionAssignment(dto);
  }

  @Get('assignments/employee/:employeeProfileId')
  async getEmployeeAssignments(
    @Param('employeeProfileId') employeeProfileId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.structureService.getEmployeeAssignments(
      employeeProfileId,
      activeOnly === true,
    );
  }

  @Get('assignments/position/:positionId')
  async getPositionAssignments(@Param('positionId') positionId: string) {
    return this.structureService.getPositionAssignments(positionId);
  }

  @Patch('assignments/:id')
  async updatePositionAssignment(
    @Param('id') id: string,
    @Body() dto: UpdatePositionAssignmentDto,
  ) {
    return this.structureService.updatePositionAssignment(id, dto);
  }

  @Patch('assignments/:id/end')
  async endPositionAssignment(
    @Param('id') id: string,
    @Body('endDate') endDate: string,
  ) {
    return this.structureService.endPositionAssignment(id, new Date(endDate));
  }

  // ============ CHANGE REQUEST ENDPOINTS ============

  @Post('change-requests')
  async createChangeRequest(@Body() dto: CreateStructureChangeRequestDto) {
    return this.structureService.createChangeRequest(dto);
  }

  @Get('change-requests')
  async getAllChangeRequests(@Query('status') status?: StructureRequestStatus) {
    return this.structureService.getAllChangeRequests(status);
  }

  @Get('change-requests/:id')
  async getChangeRequestById(@Param('id') id: string) {
    return this.structureService.getChangeRequestById(id);
  }

  @Put('change-requests/:id')
  async updateChangeRequest(
    @Param('id') id: string,
    @Body() dto: UpdateStructureChangeRequestDto,
  ) {
    return this.structureService.updateChangeRequest(id, dto);
  }

  @Post('change-requests/:id/submit')
  async submitChangeRequest(
    @Param('id') id: string,
    @Body() dto: SubmitChangeRequestDto,
  ) {
    return this.structureService.submitChangeRequest(id, dto);
  }

  @Post('change-requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelChangeRequest(@Param('id') id: string) {
    return this.structureService.cancelChangeRequest(id);
  }

  // ============ APPROVAL ENDPOINTS ============

  @Post('approvals')
  async createApproval(@Body() dto: CreateStructureApprovalDto) {
    return this.structureService.createApproval(dto);
  }

  @Patch('approvals/:id/decision')
  async updateApprovalDecision(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalDecisionDto,
  ) {
    return this.structureService.updateApprovalDecision(id, dto);
  }

  @Get('approvals/change-request/:changeRequestId')
  async getRequestApprovals(@Param('changeRequestId') changeRequestId: string) {
    return this.structureService.getRequestApprovals(changeRequestId);
  }

  // ============ CHANGE LOG ENDPOINTS ============

  @Get('change-logs')
  async getChangeLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.structureService.getChangeLogs(entityType, entityId);
  }
}
