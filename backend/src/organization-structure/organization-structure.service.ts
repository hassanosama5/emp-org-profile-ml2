import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Inject,
  forwardRef,
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
  StructureRequestType,
} from './enums/organization-structure.enums';
import { NotificationsService } from '../notifications/notifications.service';

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
    private notificationsService: NotificationsService,
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

    // BR 5: Unique ID for entities - code must be unique
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

    // BR 22: Changes must retain version history and audit logs
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

      // BR 5: Unique ID for entities - MongoDB _id ensures uniqueness
      // BR 10: Job Key = position.code (validated as unique in schema)
      // BR 10: Dept ID validation
      if (!payload.departmentId || !Types.ObjectId.isValid(payload.departmentId)) {
        throw new BadRequestException('Valid departmentId is required (BR 10)');
      }
      const departmentId = new Types.ObjectId(payload.departmentId);

      // BR 10: Validate position code (Job Key) is provided
      if (!payload.code || !payload.code.trim()) {
        throw new BadRequestException('Position code (Job Key) is required (BR 10)');
      }

      // REQ-OSM-09: Check for duplicate positions
      await this.checkDuplicatePosition(payload.title, departmentId);

      if (payload.reportsToPositionId !== undefined && payload.reportsToPositionId) {
        if (!Types.ObjectId.isValid(payload.reportsToPositionId)) {
          throw new BadRequestException('Invalid reportsToPositionId');
        }
        const reportsToId = new Types.ObjectId(payload.reportsToPositionId);
        payload.reportsToPositionId = reportsToId;
      }

      payload.departmentId = departmentId;
      payload._id = new Types.ObjectId();

      // BR 10, BR 30, REQ-OSM-09: Comprehensive business rule validation
      await this.validatePositionBusinessRules(
        departmentId,
        payload.reportsToPositionId,
        payload._id,
      );

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

    const beforeSnapshot = position.toObject();

    // BR 10, BR 30, REQ-OSM-09: Validate business rules before update
    let departmentId = position.departmentId;
    let reportsToPositionId = position.reportsToPositionId;

    if (dto.departmentId) {
      if (!Types.ObjectId.isValid(dto.departmentId)) {
        throw new BadRequestException('Invalid departmentId');
      }
      departmentId = new Types.ObjectId(dto.departmentId);
      const department = await this.departmentModel.findById(departmentId);
      if (!department) {
        throw new NotFoundException(`Department with ID ${dto.departmentId} not found`);
      }
    }

    if (dto.reportsToPositionId !== undefined) {
      if (dto.reportsToPositionId) {
        if (!Types.ObjectId.isValid(dto.reportsToPositionId)) {
          throw new BadRequestException('Invalid reportsToPositionId');
        }
        reportsToPositionId = new Types.ObjectId(dto.reportsToPositionId);
      } else {
        reportsToPositionId = undefined;
      }
    }

    // REQ-OSM-09: Check for duplicate positions if title or department changed
    if (dto.title || dto.departmentId) {
      await this.checkDuplicatePosition(
        dto.title || position.title,
        departmentId,
        position._id,
      );
    }

    // BR 10, BR 30, REQ-OSM-09: Comprehensive business rule validation
    await this.validatePositionBusinessRules(
      departmentId,
      reportsToPositionId,
      position._id,
    );

    // DON'T use Object.assign - it can overwrite _id
    // Object.assign(position, dto);

    // USE set() instead which is safer
    position.set(dto);

    // OR update specific fields manually
    // if (dto.title) position.title = dto.title;
    // if (dto.code) position.code = dto.code;
    // if (dto.description !== undefined) position.description = dto.description;
    // if (dto.departmentId) position.departmentId = dto.departmentId;
    // if (dto.reportsToPositionId !== undefined) position.reportsToPositionId = dto.reportsToPositionId;
    // if (dto.isActive !== undefined) position.isActive = dto.isActive;

    try {
      await position.save();

      // BR 22: Changes must retain version history and audit logs
      await this.logChange(
        ChangeLogAction.UPDATED,
        'Position',
        position._id,
        beforeSnapshot,
        position.toObject(),
      ).catch(() => undefined);

      return position;
    } catch (error: any) {
      console.error('Save error:', error);
      throw new Error(`Failed to update position: ${error.message}`);
    }
  }

  async deactivatePosition(id: string): Promise<PositionDocument> {
    const position = await this.positionModel.findById(id);
    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    // BR 12 & BR 37: Check for historical employee assignments before deactivating
    // Positions with historical assignments cannot be deleted, only delimited (deactivated)
    const hasAssignments = await this.assignmentModel.exists({ positionId: id });
    if (hasAssignments) {
      // Position has historical assignments - can only be delimited (deactivated), not deleted
      // This is allowed, but we log it for audit purposes
      console.log(`[deactivatePosition] Position ${id} has historical assignments - delimiting (deactivating) instead of deleting`);
    }

    const beforeSnapshot = position.toObject();
    position.isActive = false; // BR 16: Position status includes Frozen/Inactive (isActive: false)
    await position.save();

    // BR 22: Changes must retain version history and audit logs
    await this.logChange(
      ChangeLogAction.DEACTIVATED,
      'Position',
      position._id,
      beforeSnapshot,
      position.toObject(),
    ).catch(() => undefined);

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
    try {
      console.log('[createChangeRequest] Creating change request with DTO:', JSON.stringify(dto, null, 2));
      
      // Validate requestedByEmployeeId
      if (!dto.requestedByEmployeeId || !Types.ObjectId.isValid(dto.requestedByEmployeeId)) {
        console.error('[createChangeRequest] Invalid requestedByEmployeeId:', dto.requestedByEmployeeId);
        throw new BadRequestException('Invalid requestedByEmployeeId');
      }

      // Validate requestType
      if (!dto.requestType) {
        console.error('[createChangeRequest] Missing requestType');
        throw new BadRequestException('Request type is required');
      }

      // Validate reason (required field)
      if (!dto.reason || !dto.reason.trim()) {
        console.error('[createChangeRequest] Missing reason');
        throw new BadRequestException('Reason is required');
      }

      // Validate details for NEW_DEPARTMENT and NEW_POSITION (they need detailed information)
      if ((dto.requestType === StructureRequestType.NEW_DEPARTMENT || 
           dto.requestType === StructureRequestType.NEW_POSITION) && 
          (!dto.details || !dto.details.trim())) {
        throw new BadRequestException('Details are required for creating new entities');
      }

      // Convert string IDs to ObjectId if needed
      const requestedByEmployeeId = new Types.ObjectId(dto.requestedByEmployeeId);
      
      // BR 5: Unique ID for entities - manually create _id (Mongoose auto: true doesn't work as expected)
      const payload: any = {
        _id: new Types.ObjectId(),
        requestedByEmployeeId,
        requestType: dto.requestType,
        reason: dto.reason.trim(),
      };

      // Handle targetDepartmentId based on request type
      if (dto.requestType === StructureRequestType.NEW_POSITION || 
          dto.requestType === StructureRequestType.UPDATE_DEPARTMENT) {
        // NEW_POSITION needs a department to create the position in
        // UPDATE_DEPARTMENT needs the target department
        if (!dto.targetDepartmentId) {
          throw new BadRequestException(
            dto.requestType === StructureRequestType.NEW_POSITION 
              ? 'Department is required for new position'
              : 'Target department is required'
          );
        }
        if (!Types.ObjectId.isValid(dto.targetDepartmentId)) {
          throw new BadRequestException('Invalid targetDepartmentId');
        }
        // Validate department exists
        const department = await this.departmentModel.findById(dto.targetDepartmentId).exec();
        if (!department) {
          throw new NotFoundException(`Department with ID ${dto.targetDepartmentId} not found`);
        }
        payload.targetDepartmentId = new Types.ObjectId(dto.targetDepartmentId);
      } else if (dto.requestType === StructureRequestType.NEW_DEPARTMENT) {
        // NEW_DEPARTMENT doesn't need targetDepartmentId (it's creating a new one)
        // But we can optionally store it if provided for reference
        if (dto.targetDepartmentId) {
          if (!Types.ObjectId.isValid(dto.targetDepartmentId)) {
            throw new BadRequestException('Invalid targetDepartmentId');
          }
          payload.targetDepartmentId = new Types.ObjectId(dto.targetDepartmentId);
        }
      }

      // Handle targetPositionId based on request type
      if (dto.requestType === StructureRequestType.UPDATE_POSITION || 
          dto.requestType === StructureRequestType.CLOSE_POSITION) {
        // UPDATE_POSITION and CLOSE_POSITION need the target position
        if (!dto.targetPositionId) {
          throw new BadRequestException('Target position is required');
        }
        if (!Types.ObjectId.isValid(dto.targetPositionId)) {
          throw new BadRequestException('Invalid targetPositionId');
        }
        // Validate position exists
        const position = await this.positionModel.findById(dto.targetPositionId).exec();
        if (!position) {
          throw new NotFoundException(`Position with ID ${dto.targetPositionId} not found`);
        }
        payload.targetPositionId = new Types.ObjectId(dto.targetPositionId);
      } else if (dto.targetPositionId) {
        // For other request types, targetPositionId shouldn't be provided
        throw new BadRequestException(`targetPositionId is not applicable for ${dto.requestType} requests`);
      }

      if (dto.details) {
        payload.details = dto.details.trim();
      }
      // Note: Details are required for NEW_DEPARTMENT and NEW_POSITION, but validation already checked above
      // If details is not provided for other types, it will be undefined (optional)

      const requestNumber = await this.generateRequestNumber();
      payload.requestNumber = requestNumber;

      console.log('[createChangeRequest] Payload prepared:', JSON.stringify(payload, null, 2));

      const changeRequest = await this.changeRequestModel.create(payload);

      console.log('[createChangeRequest] Change request created successfully:', changeRequest._id);
      return changeRequest;
    } catch (error) {
      console.error('[createChangeRequest] Error creating change request:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('E11000')) {
        throw new ConflictException('Change request with this request number already exists');
      }
      if (error instanceof Error && error.message.includes('validation failed')) {
        throw new BadRequestException(`Validation error: ${error.message}`);
      }
      throw new InternalServerErrorException(
        `Failed to create change request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getChangeRequestById(
    id: string,
  ): Promise<StructureChangeRequestDocument> {
    // Trim whitespace from ID
    id = id?.trim();
    
    console.log(`[getChangeRequestById] Looking for change request with ID: "${id}" (length: ${id?.length})`);
    
    if (!id || id.length === 0) {
      console.error(`[getChangeRequestById] Empty ID provided`);
      throw new BadRequestException(`Change request ID cannot be empty`);
    }

    try {
      let objectId: Types.ObjectId;
      let request: StructureChangeRequestDocument | null = null;

      // First, try to find by ObjectId if valid
      if (Types.ObjectId.isValid(id)) {
        objectId = new Types.ObjectId(id);
        console.log(`[getChangeRequestById] ID is valid ObjectId: ${objectId.toString()}`);
        
        // First check if document exists without populate
        const existsCheck = await this.changeRequestModel
          .findById(objectId)
          .lean()
          .exec();
        
        if (!existsCheck) {
          console.log(`[getChangeRequestById] Document does not exist with _id: ${objectId.toString()}`);
        } else {
          console.log(`[getChangeRequestById] Document exists (lean check), attempting populate...`);
          
          // Try direct findById with populate
          try {
            request = await this.changeRequestModel
              .findById(objectId)
              .populate({
                path: 'requestedByEmployeeId',
                select: 'firstName lastName employeeNumber',
                strictPopulate: false,
              })
              .populate({
                path: 'submittedByEmployeeId',
                select: 'firstName lastName employeeNumber',
                strictPopulate: false,
              })
              .populate({
                path: 'targetDepartmentId',
                select: 'name code',
                strictPopulate: false,
              })
              .populate({
                path: 'targetPositionId',
                select: 'title code',
                strictPopulate: false,
              })
              .exec();

            if (request) {
              console.log(`[getChangeRequestById] Found by _id with populate: ${request._id}, requestNumber: ${request.requestNumber}`);
              return request;
            } else {
              console.warn(`[getChangeRequestById] Populate query returned null, but document exists. Trying without populate...`);
              // If populate returns null but document exists, get it without populate
              request = await this.changeRequestModel.findById(objectId).exec();
              if (request) {
                console.log(`[getChangeRequestById] Found by _id without populate: ${request._id}, requestNumber: ${request.requestNumber}`);
                return request;
              }
            }
          } catch (populateError) {
            console.error(`[getChangeRequestById] Populate failed with error, trying without populate:`, populateError);
            // If populate fails, try without populate as fallback
            request = await this.changeRequestModel.findById(objectId).exec();
            if (request) {
              console.log(`[getChangeRequestById] Found by _id without populate (after error): ${request._id}, requestNumber: ${request.requestNumber}`);
              return request;
            }
          }
        }
      }

      // If not found by _id or ID is not valid ObjectId, try by requestNumber
      console.log(`[getChangeRequestById] Attempting to find by requestNumber: "${id}"`);
      const byRequestNumber = await this.changeRequestModel
        .findOne({ requestNumber: id })
        .populate({
          path: 'requestedByEmployeeId',
          select: 'firstName lastName employeeNumber',
          strictPopulate: false,
        })
        .populate({
          path: 'submittedByEmployeeId',
          select: 'firstName lastName employeeNumber',
          strictPopulate: false,
        })
        .populate({
          path: 'targetDepartmentId',
          select: 'name code',
          strictPopulate: false,
        })
        .populate({
          path: 'targetPositionId',
          select: 'title code',
          strictPopulate: false,
        })
        .exec();

      if (byRequestNumber) {
        console.log(`[getChangeRequestById] Found by requestNumber: _id=${byRequestNumber._id}, requestNumber=${byRequestNumber.requestNumber}`);
        return byRequestNumber;
      }

      // Last resort: try findOne with _id as string (in case ObjectId conversion is the issue)
      if (Types.ObjectId.isValid(id) && !request) {
        console.log(`[getChangeRequestById] Trying findOne with _id as string...`);
        const byIdString = await this.changeRequestModel
          .findOne({ _id: id })
          .populate({
            path: 'requestedByEmployeeId',
            select: 'firstName lastName employeeNumber',
            strictPopulate: false,
          })
          .populate({
            path: 'submittedByEmployeeId',
            select: 'firstName lastName employeeNumber',
            strictPopulate: false,
          })
          .populate({
            path: 'targetDepartmentId',
            select: 'name code',
            strictPopulate: false,
          })
          .populate({
            path: 'targetPositionId',
            select: 'title code',
            strictPopulate: false,
          })
          .exec();
        
        if (byIdString) {
          console.log(`[getChangeRequestById] Found by findOne with _id string: ${byIdString._id}, requestNumber: ${byIdString.requestNumber}`);
          return byIdString;
        }
        
        // Try without populate
        const byIdStringNoPopulate = await this.changeRequestModel.findOne({ _id: id }).exec();
        if (byIdStringNoPopulate) {
          console.log(`[getChangeRequestById] Found by findOne with _id string (no populate): ${byIdStringNoPopulate._id}, requestNumber: ${byIdStringNoPopulate.requestNumber}`);
          return byIdStringNoPopulate;
        }
      }

      // If still not found, log diagnostic information
      const totalCount = await this.changeRequestModel.countDocuments().exec();
      const sampleRequests = await this.changeRequestModel
        .find({})
        .select('_id requestNumber')
        .limit(10)
        .lean()
        .exec();
      
      console.error(`[getChangeRequestById] Change request not found. Total in DB: ${totalCount}`);
      console.error(`[getChangeRequestById] Sample requests:`, 
        sampleRequests.map(r => ({ id: r._id.toString(), requestNumber: r.requestNumber }))
      );

      // Also try a direct query without populate to see if document exists
      if (Types.ObjectId.isValid(id)) {
        const directCheck = await this.changeRequestModel
          .findById(new Types.ObjectId(id))
          .lean()
          .exec();
        console.error(`[getChangeRequestById] Direct query (lean) result:`, directCheck ? 'Found' : 'Not found');
        if (directCheck) {
          console.error(`[getChangeRequestById] Document exists but all queries failed! Document:`, JSON.stringify(directCheck, null, 2));
          // If document exists but queries failed, return it anyway
          return await this.changeRequestModel.findById(new Types.ObjectId(id)).exec() as StructureChangeRequestDocument;
        }
      }

      throw new NotFoundException(
        `Change request with ID "${id}" not found. Total requests in database: ${totalCount}.`
      );
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        console.error(`[getChangeRequestById] Known exception:`, error.message);
        throw error;
      }
      // Handle other errors
      console.error(`[getChangeRequestById] Unexpected error fetching change request "${id}":`, error);
      console.error(`[getChangeRequestById] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      throw new InternalServerErrorException(
        `Failed to fetch change request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
    // Use the same robust query logic as getChangeRequestById
    const request = await this.getChangeRequestById(id);
    
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
    // Use the same robust query logic as getChangeRequestById
    const request = await this.getChangeRequestById(id);
    
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

    // Send notification to System Admin (or relevant approver) that change request was submitted
    // Use case: "Organizational Structure (OS): The request is saved in the pending approval queue, triggering.
    // Notifications (N): An alert is sent to the System Admin (or relevant approver) that a 'Change request submitted'"
    try {
      await this.notificationsService.notifyStructureChangeRequestSubmitted(
        dto.submittedByEmployeeId,
        request._id.toString(),
        request.requestType,
        request.details || request.reason,
      );
    } catch (notificationError) {
      // Log but don't fail the submission if notification fails
      console.error(
        'Failed to send notification for change request submission:',
        notificationError,
      );
    }

    return request;
  }

  async cancelChangeRequest(
    id: string,
  ): Promise<StructureChangeRequestDocument> {
    // Use the same robust query logic as getChangeRequestById
    const request = await this.getChangeRequestById(id);
    
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

  /**
   * REQ-OSM-09: Check for circular reporting lines
   * Prevents positions from reporting to each other in a loop
   */
  private async checkCircularReportingLine(
    positionId: Types.ObjectId,
    reportsToPositionId: Types.ObjectId,
  ): Promise<void> {
    const visited = new Set<string>();
    let current: Types.ObjectId | null = reportsToPositionId;

    // Traverse up the reporting chain to detect cycles
    while (current) {
      const currentStr = current.toString();
      
      // If we encounter the original position, we have a cycle
      if (current.equals(positionId)) {
        throw new BadRequestException(
          'Circular reporting line detected: This would create a loop in the reporting hierarchy'
        );
      }

      // If we've seen this position before, we have a cycle
      if (visited.has(currentStr)) {
        throw new BadRequestException(
          'Circular reporting line detected: Loop found in reporting chain'
        );
      }

      visited.add(currentStr);

      // Get the next position in the chain
      const position = await this.positionModel
        .findById(current)
        .select('reportsToPositionId')
        .lean()
        .exec();

      if (!position || !position.reportsToPositionId) {
        break; // Reached the top of the chain
      }

      current = position.reportsToPositionId as Types.ObjectId;
    }
  }

  /**
   * BR 10: Validate Position has Job Key (code), Pay Grade (via employees), Dept ID
   * BR 30: Validate Cost Center (via department) and Reporting Manager (via reportsToPositionId)
   */
  private async validatePositionBusinessRules(
    departmentId: Types.ObjectId,
    reportsToPositionId?: Types.ObjectId,
    positionId?: Types.ObjectId,
  ): Promise<void> {
    // BR 10: Validate department exists (Dept ID requirement)
    const department = await this.departmentModel.findById(departmentId).exec();
    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    // BR 30: Cost Center validation - can be derived from department
    // Cost center information would typically be in department or employee assignments
    // For now, we validate that department exists (which implies cost center linkage)

    // BR 30: Reporting Manager validation
    if (reportsToPositionId) {
      const reportingPosition = await this.positionModel
        .findById(reportsToPositionId)
        .populate('departmentId')
        .exec();

      if (!reportingPosition) {
        throw new NotFoundException(`Reporting position with ID ${reportsToPositionId} not found`);
      }

      // REQ-OSM-09: Validate department assignment - reporting position should be in same or parent department
      const reportingDeptId = (reportingPosition.departmentId as any)?._id || reportingPosition.departmentId;
      if (!reportingDeptId.equals(departmentId)) {
        // Allow cross-department reporting but log it
        console.log(
          `[validatePositionBusinessRules] Cross-department reporting: Position in department ${departmentId} reports to position in department ${reportingDeptId}`
        );
      }

      // REQ-OSM-09: Check for circular reporting lines
      if (positionId) {
        await this.checkCircularReportingLine(positionId, reportsToPositionId);
      }
    }

    // BR 10: Pay Grade validation - positions get pay grades when employees are assigned
    // This is validated at assignment time, not position creation time
    // Job Key (code) is validated as unique in the schema
  }

  /**
   * REQ-OSM-09: Check for duplicate positions
   * Position code is already unique in schema, but we validate title+department uniqueness
   */
  private async checkDuplicatePosition(
    title: string,
    departmentId: Types.ObjectId,
    excludePositionId?: Types.ObjectId,
  ): Promise<void> {
    const query: any = {
      title: title.trim(),
      departmentId: departmentId,
      isActive: true, // Only check active positions
    };

    if (excludePositionId) {
      query._id = { $ne: excludePositionId };
    }

    const existing = await this.positionModel.findOne(query).exec();
    if (existing) {
      throw new ConflictException(
        `A position with title "${title}" already exists in this department`
      );
    }
  }

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

  /**
   * Debug method to check if change request exists
   */
  async debugChangeRequest(id: string): Promise<any> {
    const trimmedId = id?.trim();
    const isValid = Types.ObjectId.isValid(trimmedId);
    
    const debugInfo: any = {
      receivedId: id,
      trimmedId: trimmedId,
      idLength: trimmedId?.length,
      isValidObjectId: isValid,
    };

    if (isValid) {
      const objectId = new Types.ObjectId(trimmedId);
      debugInfo.objectIdString = objectId.toString();
      
      // Try to find by _id
      const byId = await this.changeRequestModel
        .findById(objectId)
        .select('_id requestNumber status')
        .lean()
        .exec();
      debugInfo.foundById = !!byId;
      if (byId) {
        debugInfo.documentById = byId;
      }

      // Try to find by requestNumber
      const byRequestNumber = await this.changeRequestModel
        .findOne({ requestNumber: trimmedId })
        .select('_id requestNumber status')
        .lean()
        .exec();
      debugInfo.foundByRequestNumber = !!byRequestNumber;
      if (byRequestNumber) {
        debugInfo.documentByRequestNumber = byRequestNumber;
      }
    }

    // Get total count and sample IDs
    const totalCount = await this.changeRequestModel.countDocuments().exec();
    const sampleRequests = await this.changeRequestModel
      .find({})
      .select('_id requestNumber')
      .limit(5)
      .lean()
      .exec();
    
    debugInfo.totalChangeRequests = totalCount;
    debugInfo.sampleRequests = sampleRequests.map(r => ({
      id: r._id.toString(),
      requestNumber: r.requestNumber,
    }));

    return debugInfo;
  }
}
