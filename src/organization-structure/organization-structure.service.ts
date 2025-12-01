import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './models/department.schema';
import { Position, PositionDocument } from './models/position.schema';
import {
  PositionAssignment,
  PositionAssignmentDocument,
} from './models/position-assignment.schema';
import {
  StructureChangeRequest,
  StructureChangeRequestDocument,
} from './models/structure-change-request.schema';
import {
  StructureApproval,
  StructureApprovalDocument,
} from './models/structure-approval.schema';
import {
  StructureChangeLog,
  StructureChangeLogDocument,
} from './models/structure-change-log.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';
import {
  CreatePositionAssignmentDto,
  UpdatePositionAssignmentDto,
} from './dto/position-assignment.dto';
import {
  CreateStructureChangeRequestDto,
  UpdateStructureChangeRequestDto,
  SubmitChangeRequestDto,
} from './dto/structure-change-request.dto';
import {
  CreateStructureApprovalDto,
  UpdateApprovalDecisionDto,
} from './dto/structure-approval.dto';
import {
  ApprovalDecision,
  ChangeLogAction,
  StructureRequestStatus,
} from './enums/organization-structure.enums';

@Injectable()
export class OrganizationStructureService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Position.name)
    private positionModel: Model<PositionDocument>,
    @InjectModel(PositionAssignment.name)
    private assignmentModel: Model<PositionAssignmentDocument>,
    @InjectModel(StructureChangeRequest.name)
    private changeRequestModel: Model<StructureChangeRequestDocument>,
    @InjectModel(StructureApproval.name)
    private approvalModel: Model<StructureApprovalDocument>,
    @InjectModel(StructureChangeLog.name)
    private changeLogModel: Model<StructureChangeLogDocument>,
  ) {}

  // ============ DEPARTMENT METHODS ============

  async createDepartment(
    dto: CreateDepartmentDto,
  ): Promise<DepartmentDocument> {
    const existing = await this.departmentModel.findOne({ code: dto.code });
    if (existing) {
      throw new ConflictException(
        `Department with code ${dto.code} already exists`,
      );
    }

    try {
      const payload: any = { ...dto } as any;

      if (payload.headPositionId !== undefined) {
        if (!Types.ObjectId.isValid(payload.headPositionId)) {
          throw new BadRequestException('Invalid headPositionId');
        }
        payload.headPositionId = new Types.ObjectId(payload.headPositionId);
      }

      if (payload._id !== undefined) {
        delete payload._id;
      }
      payload._id = new Types.ObjectId();

      const department = await this.departmentModel.create(payload);

      await this.logChange(
        ChangeLogAction.CREATED,
        'Department',
        department._id,
        null,
        department.toObject(),
      ).catch(() => undefined);

      return department;
    } catch (error: any) {
      if (error?.message && error.message.includes('must have an _id')) {
        throw new BadRequestException(
          'Invalid `_id` in payload. Remove `_id`; a new one is assigned automatically.',
        );
      }
      throw error;
    }
  }

  async getAllDepartments(isActive?: boolean): Promise<DepartmentDocument[]> {
    const filter = isActive !== undefined ? { isActive } : {};
    return this.departmentModel.find(filter).populate('headPositionId').exec();
  }

  async getDepartmentById(id: string): Promise<DepartmentDocument> {
    const department = await this.departmentModel
      .findById(id)
      .populate('headPositionId')
      .exec();
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentDocument> {
    const department = await this.departmentModel.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (dto.code && dto.code !== department.code) {
      const existing = await this.departmentModel.findOne({ code: dto.code });
      if (existing) {
        throw new ConflictException(
          `Department with code ${dto.code} already exists`,
        );
      }
    }

    const beforeSnapshot = department.toObject();
    Object.assign(department, dto);
    await department.save();

    await this.logChange(
      ChangeLogAction.UPDATED,
      'Department',
      department._id,
      beforeSnapshot,
      department.toObject(),
    );

    return department;
  }

  async deactivateDepartment(id: string): Promise<DepartmentDocument> {
    const department = await this.departmentModel.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    const beforeSnapshot = department.toObject();
    department.isActive = false;
    await department.save();

    await this.logChange(
      ChangeLogAction.DEACTIVATED,
      'Department',
      department._id,
      beforeSnapshot,
      department.toObject(),
    );

    return department;
  }

  // ============ POSITION METHODS ============

  async createPosition(dto: CreatePositionDto): Promise<PositionDocument> {
    const existing = await this.positionModel.findOne({ code: dto.code });
    if (existing) {
      throw new ConflictException(
        `Position with code ${dto.code} already exists`,
      );
    }

    const department = await this.departmentModel.findById(dto.departmentId);
    if (!department) {
      throw new NotFoundException(
        `Department with ID ${dto.departmentId} not found`,
      );
    }

    try {
      const payload: any = { ...dto } as any;

      if (payload._id !== undefined) {
        delete payload._id;
      }

      if (payload.departmentId) {
        if (!Types.ObjectId.isValid(payload.departmentId)) {
          throw new BadRequestException('Invalid departmentId');
        }
        payload.departmentId = new Types.ObjectId(payload.departmentId);
      }

      if (payload.reportsToPositionId !== undefined) {
        if (!Types.ObjectId.isValid(payload.reportsToPositionId)) {
          throw new BadRequestException('Invalid reportsToPositionId');
        }
        payload.reportsToPositionId = new Types.ObjectId(
          payload.reportsToPositionId,
        );
      }

      payload._id = new Types.ObjectId();

      const position = await this.positionModel.create(payload);

      await this.logChange(
        ChangeLogAction.CREATED,
        'Position',
        position._id,
        null,
        position.toObject(),
      ).catch(() => undefined);

      return position;
    } catch (error: any) {
      if (error?.message && error.message.includes('must have an _id')) {
        throw new BadRequestException(
          'Invalid `_id` in payload. Remove `_id`; a new one is assigned automatically.',
        );
      }
      throw error;
    }
  }

  async getAllPositions(
    departmentId?: string,
    isActive?: boolean,
  ): Promise<PositionDocument[]> {
    const filter: any = {};
    if (departmentId) filter.departmentId = departmentId;
    if (isActive !== undefined) filter.isActive = isActive;

    return this.positionModel
      .find(filter)
      .populate('departmentId')
      .populate('reportsToPositionId')
      .exec();
  }

  async getPositionById(id: string): Promise<PositionDocument> {
    const position = await this.positionModel
      .findById(id)
      .populate('departmentId')
      .populate('reportsToPositionId')
      .exec();
    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }
    return position;
  }

  async updatePosition(
    id: string,
    dto: UpdatePositionDto,
  ): Promise<PositionDocument> {
    const position = await this.positionModel.findById(id);
    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    if (dto.code && dto.code !== position.code) {
      const existing = await this.positionModel.findOne({ code: dto.code });
      if (existing) {
        throw new ConflictException(
          `Position with code ${dto.code} already exists`,
        );
      }
    }

    if (dto.departmentId) {
      const department = await this.departmentModel.findById(dto.departmentId);
      if (!department) {
        throw new NotFoundException(
          `Department with ID ${dto.departmentId} not found`,
        );
      }
    }

    const beforeSnapshot = position.toObject();
    Object.assign(position, dto);
    await position.save();

    await this.logChange(
      ChangeLogAction.UPDATED,
      'Position',
      position._id,
      beforeSnapshot,
      position.toObject(),
    );

    return position;
  }

  async deactivatePosition(id: string): Promise<PositionDocument> {
    const position = await this.positionModel.findById(id);
    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    const beforeSnapshot = position.toObject();
    position.isActive = false;
    await position.save();

    await this.logChange(
      ChangeLogAction.DEACTIVATED,
      'Position',
      position._id,
      beforeSnapshot,
      position.toObject(),
    );

    return position;
  }

  async getPositionHierarchy(positionId: string): Promise<any> {
    const position = await this.getPositionById(positionId);
    const subordinates = await this.positionModel
      .find({ reportsToPositionId: positionId })
      .populate('departmentId')
      .exec();

    return {
      position,
      subordinates: await Promise.all(
        subordinates.map((sub) =>
          this.getPositionHierarchy(sub._id.toString()),
        ),
      ),
    };
  }

  // ============ POSITION ASSIGNMENT METHODS ============

  async createPositionAssignment(
    dto: CreatePositionAssignmentDto,
  ): Promise<PositionAssignmentDocument> {
    const position = await this.positionModel.findById(dto.positionId);
    if (!position) {
      throw new NotFoundException(
        `Position with ID ${dto.positionId} not found`,
      );
    }

    const department = await this.departmentModel.findById(dto.departmentId);
    if (!department) {
      throw new NotFoundException(
        `Department with ID ${dto.departmentId} not found`,
      );
    }

    // Check for overlapping assignments
    const overlapping = await this.assignmentModel.findOne({
      employeeProfileId: dto.employeeProfileId,
      startDate: { $lte: new Date(dto.endDate || new Date()) },
      $or: [{ endDate: null }, { endDate: { $gte: new Date(dto.startDate) } }],
    });

    if (overlapping) {
      throw new ConflictException(
        'Employee already has an active assignment in this period',
      );
    }

    const assignment = await this.assignmentModel.create(dto);

    await this.logChange(
      ChangeLogAction.CREATED,
      'PositionAssignment',
      assignment._id,
      null,
      assignment.toObject(),
    );

    return assignment;
  }

  async getEmployeeAssignments(
    employeeProfileId: string,
    activeOnly = false,
  ): Promise<PositionAssignmentDocument[]> {
    const filter: any = { employeeProfileId };
    if (activeOnly) {
      filter.$or = [{ endDate: null }, { endDate: { $gte: new Date() } }];
    }

    return this.assignmentModel
      .find(filter)
      .populate('positionId')
      .populate('departmentId')
      .sort({ startDate: -1 })
      .exec();
  }

  async getPositionAssignments(
    positionId: string,
  ): Promise<PositionAssignmentDocument[]> {
    return this.assignmentModel
      .find({ positionId })
      .populate('employeeProfileId')
      .sort({ startDate: -1 })
      .exec();
  }

  async updatePositionAssignment(
    id: string,
    dto: UpdatePositionAssignmentDto,
  ): Promise<PositionAssignmentDocument> {
    const assignment = await this.assignmentModel.findById(id);
    if (!assignment) {
      throw new NotFoundException(
        `Position assignment with ID ${id} not found`,
      );
    }

    const beforeSnapshot = assignment.toObject();
    Object.assign(assignment, dto);
    await assignment.save();

    await this.logChange(
      ChangeLogAction.UPDATED,
      'PositionAssignment',
      assignment._id,
      beforeSnapshot,
      assignment.toObject(),
    );

    return assignment;
  }

  async endPositionAssignment(
    id: string,
    endDate: Date,
  ): Promise<PositionAssignmentDocument> {
    return this.updatePositionAssignment(id, {
      endDate: endDate.toISOString(),
    });
  }

  // ============ CHANGE REQUEST METHODS ============

  async createChangeRequest(
    dto: CreateStructureChangeRequestDto,
  ): Promise<StructureChangeRequestDocument> {
    const requestNumber = await this.generateRequestNumber();

    const changeRequest = await this.changeRequestModel.create({
      ...dto,
      requestNumber,
    });

    return changeRequest;
  }

  async getChangeRequestById(
    id: string,
  ): Promise<StructureChangeRequestDocument> {
    const request = await this.changeRequestModel
      .findById(id)
      .populate('requestedByEmployeeId')
      .populate('submittedByEmployeeId')
      .populate('targetDepartmentId')
      .populate('targetPositionId')
      .exec();

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }
    return request;
  }

  async getAllChangeRequests(
    status?: StructureRequestStatus,
  ): Promise<StructureChangeRequestDocument[]> {
    const filter = status ? { status } : {};
    return this.changeRequestModel
      .find(filter)
      .populate('requestedByEmployeeId')
      .populate('submittedByEmployeeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateChangeRequest(
    id: string,
    dto: UpdateStructureChangeRequestDto,
  ): Promise<StructureChangeRequestDocument> {
    const request = await this.changeRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (request.status !== StructureRequestStatus.DRAFT) {
      throw new BadRequestException('Can only update draft requests');
    }

    Object.assign(request, dto);
    await request.save();
    return request;
  }

  async submitChangeRequest(
    id: string,
    dto: SubmitChangeRequestDto,
  ): Promise<StructureChangeRequestDocument> {
    const request = await this.changeRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (request.status !== StructureRequestStatus.DRAFT) {
      throw new BadRequestException('Can only submit draft requests');
    }

    request.status = StructureRequestStatus.SUBMITTED;
    request.submittedByEmployeeId = new Types.ObjectId(
      dto.submittedByEmployeeId,
    );
    request.submittedAt = new Date();
    await request.save();

    return request;
  }

  async cancelChangeRequest(
    id: string,
  ): Promise<StructureChangeRequestDocument> {
    const request = await this.changeRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (
      ![
        StructureRequestStatus.DRAFT,
        StructureRequestStatus.SUBMITTED,
        StructureRequestStatus.UNDER_REVIEW,
      ].includes(request.status)
    ) {
      throw new BadRequestException('Cannot cancel request in current status');
    }

    request.status = StructureRequestStatus.CANCELED;
    await request.save();
    return request;
  }

  // ============ APPROVAL METHODS ============

  async createApproval(
    dto: CreateStructureApprovalDto,
  ): Promise<StructureApprovalDocument> {
    const request = await this.changeRequestModel.findById(dto.changeRequestId);
    if (!request) {
      throw new NotFoundException(`Change request not found`);
    }

    const approval = await this.approvalModel.create(dto);

    // Update request status
    if (request.status === StructureRequestStatus.SUBMITTED) {
      request.status = StructureRequestStatus.UNDER_REVIEW;
      await request.save();
    }

    return approval;
  }

  async updateApprovalDecision(
    id: string,
    dto: UpdateApprovalDecisionDto,
  ): Promise<StructureApprovalDocument> {
    const approval = await this.approvalModel.findById(id);
    if (!approval) {
      throw new NotFoundException(`Approval with ID ${id} not found`);
    }

    if (approval.decision !== ApprovalDecision.PENDING) {
      throw new BadRequestException('Approval decision already made');
    }

    approval.decision = dto.decision;
    approval.decidedAt = new Date();
    if (dto.comments) approval.comments = dto.comments;
    await approval.save();

    // Check if all approvals are complete
    await this.checkAndUpdateRequestStatus(approval.changeRequestId);

    return approval;
  }

  async getRequestApprovals(
    changeRequestId: string,
  ): Promise<StructureApprovalDocument[]> {
    return this.approvalModel
      .find({ changeRequestId })
      .populate('approverEmployeeId')
      .exec();
  }

  // ============ CHANGE LOG METHODS ============

  async getChangeLogs(
    entityType?: string,
    entityId?: string,
  ): Promise<StructureChangeLogDocument[]> {
    const filter: any = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    return this.changeLogModel
      .find(filter)
      .populate('performedByEmployeeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ============ HELPER METHODS ============

  private async generateRequestNumber(): Promise<string> {
    const count = await this.changeRequestModel.countDocuments();
    const year = new Date().getFullYear();
    return `SCR-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async logChange(
    action: ChangeLogAction,
    entityType: string,
    entityId: Types.ObjectId,
    beforeSnapshot: any,
    afterSnapshot: any,
    performedBy?: string,
  ): Promise<void> {
    await this.changeLogModel.create({
      action,
      entityType,
      entityId,
      beforeSnapshot,
      afterSnapshot,
      performedByEmployeeId: performedBy
        ? new Types.ObjectId(performedBy)
        : undefined,
    });
  }

  private async checkAndUpdateRequestStatus(
    changeRequestId: Types.ObjectId,
  ): Promise<void> {
    const approvals = await this.approvalModel.find({ changeRequestId });
    const allDecided = approvals.every(
      (a) => a.decision !== ApprovalDecision.PENDING,
    );

    if (!allDecided) return;

    const hasRejection = approvals.some(
      (a) => a.decision === ApprovalDecision.REJECTED,
    );
    const request = await this.changeRequestModel.findById(changeRequestId);

    if (request) {
      request.status = hasRejection
        ? StructureRequestStatus.REJECTED
        : StructureRequestStatus.APPROVED;
      await request.save();
    }
  }

  async getDepartmentHierarchy(): Promise<any[]> {
    const departments = await this.departmentModel
      .find({ isActive: true })
      .populate('headPositionId')
      .exec();

    return Promise.all(
      departments.map(async (dept) => {
        const positions = await this.positionModel
          .find({ departmentId: dept._id, isActive: true })
          .exec();
        return {
          department: dept,
          positions,
        };
      }),
    );
  }
}
