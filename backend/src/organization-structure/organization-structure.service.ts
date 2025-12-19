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
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmployeeSystemRole } from '../employee-profile/models/employee-system-role.schema';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';

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
    @InjectModel(EmployeeSystemRole.name)
    private employeeSystemRoleModel: Model<any>,
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: Model<EmployeeProfileDocument>,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => EmployeeProfileService))
    private employeeProfileService: EmployeeProfileService,
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

      // REQ-OSM-11: Notify stakeholders on structure changes
      try {
        // Notify department head if assigned
        if (department.headPositionId) {
          // Find employees in the head position
          const headEmployees = await this.employeeSystemRoleModel
            .find({ positionId: department.headPositionId })
            .populate('employeeProfileId')
            .exec();
          
          for (const role of headEmployees) {
            const employeeId = (role.employeeProfileId as any)?._id?.toString();
            if (employeeId) {
              await this.notificationsService.createNotification(
                employeeId,
                NotificationType.STRUCTURE_CHANGE_REQUEST_SUBMITTED,
                `New department "${department.name}" has been created. You have been assigned as department head.`,
                {
                  departmentId: department._id.toString(),
                  departmentName: department.name,
                  action: 'CREATED',
                },
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to send department creation notification:', error);
      }

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

      // REQ-OSM-05: Vacant position flagging for recruitment
      // Position created without assignment is automatically flagged as vacant
      // Check if position has active assignments
      const activeAssignments = await this.assignmentModel.countDocuments({
        positionId: position._id,
        $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
      });
      
      if (activeAssignments === 0) {
        // Position is vacant - flag for recruitment
        console.log(`[createPosition] Position ${position._id} (${position.code}) is vacant and flagged for recruitment`);
        // TODO: Integration with RecruitmentService to automatically create job requisition
        // await this.recruitmentService.flagPositionAsVacant(position._id.toString());
      }

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
    search?: string,
  ): Promise<PositionDocument[]> {
    const filter: any = {};
    if (departmentId) filter.departmentId = departmentId;
    if (isActive !== undefined) filter.isActive = isActive;

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { code: searchRegex },
        { description: searchRegex },
      ];
    }

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
      
      // System Integration: Notify Recruitment/Offboarding modules on position deactivation
      console.log(
        `[System Integration] Position "${position.title}" has been deactivated. ` +
        `Recruitment module should update vacancy status. ` +
        `Offboarding module should be notified if employees are affected.`,
      );
      // Note: Actual API calls to Recruitment/Offboarding modules would go here
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

    // Validate employee exists
    const employee = await this.employeeProfileModel.findById(
      dto.employeeProfileId,
    );
    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${dto.employeeProfileId} not found`,
      );
    }

    // CRITICAL: Check for overlapping active assignments
    // An assignment overlaps if the date ranges intersect AND it's still active
    const now = new Date();
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const newEndDate = endDate || now; // Use provided endDate or current date as max

    // Find all assignments for this employee that might overlap
    // We'll filter them in JavaScript to check if they're actually active and overlapping
    const potentiallyOverlapping = await this.assignmentModel
      .find({
        employeeProfileId: new Types.ObjectId(dto.employeeProfileId),
        startDate: { $lte: newEndDate }, // Existing assignment starts before new one ends
        $or: [
          { endDate: null }, // Ongoing assignment
          { endDate: { $gte: startDate } }, // Ends on or after new assignment starts
        ],
      })
      .populate('positionId')
      .populate('departmentId')
      .exec();

    console.log(`[createPositionAssignment] Checking for overlapping assignments:`, {
      newStartDate: startDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
      foundAssignments: potentiallyOverlapping.length,
    });

    // Filter to find truly active and overlapping assignments
    const overlapping = potentiallyOverlapping.find((assignment) => {
      const existingStart = new Date(assignment.startDate);
      const existingEnd = assignment.endDate ? new Date(assignment.endDate) : null;

      // Check if assignment is still active (not ended in the past)
      // An assignment is active if:
      // - It has no endDate (ongoing), OR
      // - Its endDate is today or in the future
      // Note: For same-day assignments (startDate === endDate), we need to check if the end date is today or future
      const isActive = !existingEnd || existingEnd >= now;

      if (!isActive) {
        console.log(`[createPositionAssignment] Assignment ${assignment._id} is not active (ended ${existingEnd?.toISOString()}, today is ${now.toISOString()})`);
        return false;
      }

      // Additional check: If assignment ends on the same day it starts, and that day is in the past,
      // it's not active (it's a historical single-day assignment)
      if (existingEnd && existingStart.toDateString() === existingEnd.toDateString()) {
        // Same-day assignment - check if the end date is today or in the future
        const endDateOnly = new Date(existingEnd);
        endDateOnly.setHours(23, 59, 59, 999); // End of the day
        if (endDateOnly < now) {
          console.log(`[createPositionAssignment] Assignment ${assignment._id} is a same-day assignment that already ended (${existingEnd.toISOString()})`);
          return false;
        }
      }

      // Check if date ranges actually overlap
      // Two date ranges overlap if:
      // - Existing starts before or on new end date AND
      // - Existing ends after or on new start date (or has no end)
      // For same-day assignments: they only overlap if the new assignment starts on or before that day
      let rangesOverlap: boolean;
      
      if (existingEnd && existingStart.toDateString() === existingEnd.toDateString()) {
        // Same-day assignment: only overlaps if new assignment starts on or before that day
        // AND new assignment has no end date OR new assignment ends on or after that day
        rangesOverlap = startDate <= existingEnd && (!endDate || endDate >= existingStart);
      } else {
        // Normal date range overlap check
        rangesOverlap =
          existingStart <= newEndDate &&
          (!existingEnd || existingEnd >= startDate);
      }

      if (rangesOverlap) {
        console.log(`[createPositionAssignment] Found overlapping active assignment:`, {
          _id: assignment._id,
          startDate: existingStart.toISOString(),
          endDate: existingEnd?.toISOString() || 'ongoing',
          positionId: assignment.positionId,
        });
      }

      return rangesOverlap;
    });

    if (overlapping) {
      const overlappingStart = new Date(overlapping.startDate);
      const overlappingEnd = overlapping.endDate ? new Date(overlapping.endDate) : null;
      
      throw new ConflictException(
        `Employee already has an active assignment from ${overlappingStart.toLocaleDateString()} to ${overlappingEnd ? overlappingEnd.toLocaleDateString() : 'ongoing'}. Please end the existing assignment first or adjust dates.`,
      );
    }

    // Note: Overlap check and error throwing is now handled above in the overlap detection logic

    // Create the assignment
    const assignment = await this.assignmentModel.create({
      ...dto,
      employeeProfileId: new Types.ObjectId(dto.employeeProfileId),
      positionId: new Types.ObjectId(dto.positionId),
      departmentId: new Types.ObjectId(dto.departmentId),
    });

    await this.logChange(
      ChangeLogAction.CREATED,
      'PositionAssignment',
      assignment._id,
      null,
      assignment.toObject(),
    );

    // CRITICAL BUSINESS RULE: If this is an active assignment (no endDate or endDate in future),
    // update EmployeeProfile's current fields
    const isActiveAssignment = !endDate || endDate > now;
    if (isActiveAssignment) {
      try {
        // Get position's supervisorPositionId if it exists
        const positionDoc = await this.positionModel
          .findById(dto.positionId)
          .exec();
        const supervisorPositionId = positionDoc?.reportsToPositionId
          ? new Types.ObjectId(positionDoc.reportsToPositionId.toString())
          : null;

        // Update EmployeeProfile with current assignment details
        const updateData: any = {
          $set: {
            primaryPositionId: new Types.ObjectId(dto.positionId),
            primaryDepartmentId: new Types.ObjectId(dto.departmentId),
          },
        };

        // Only set supervisorPositionId if it exists (don't set null explicitly)
        if (supervisorPositionId) {
          updateData.$set.supervisorPositionId = supervisorPositionId;
        }

        await this.employeeProfileModel.findByIdAndUpdate(
          new Types.ObjectId(dto.employeeProfileId),
          updateData,
          { new: true },
        );

        console.log(
          `[createPositionAssignment] Updated EmployeeProfile ${dto.employeeProfileId} with current position ${dto.positionId} and department ${dto.departmentId}`,
        );
      } catch (profileUpdateError) {
        console.error(
          `[createPositionAssignment] Error updating EmployeeProfile for ${dto.employeeProfileId}:`,
          profileUpdateError,
        );
        // Continue - the assignment is still created, just the profile update failed
        // This prevents the entire operation from failing if there's an issue with the profile update
      }
    }

    // REQ-OSM-05: Position is no longer vacant when assignment is created
    // The position now has an active assignment, so it's filled
    console.log(
      `[createPositionAssignment] Position ${dto.positionId} is now filled (no longer vacant)`,
    );

    return assignment;
  }

  async getEmployeeAssignments(
    employeeProfileId: string,
    activeOnly = false,
  ): Promise<PositionAssignmentDocument[]> {
    // CRITICAL: Convert string ID to ObjectId for proper query matching
    const employeeObjectId = new Types.ObjectId(employeeProfileId);
    
    const filter: any = { 
      employeeProfileId: employeeObjectId 
    };
    
    if (activeOnly) {
      // Active assignments: no endDate OR endDate in the future
      filter.$or = [
        { endDate: null }, 
        { endDate: { $gte: new Date() } }
      ];
    }

    console.log(`[getEmployeeAssignments] Query filter:`, JSON.stringify(filter, null, 2));

    const assignments = await this.assignmentModel
      .find(filter)
      .populate('positionId')
      .populate('departmentId')
      .sort({ startDate: -1 })
      .exec();

    console.log(`[getEmployeeAssignments] Found ${assignments.length} assignments for employee ${employeeProfileId}`);

    return assignments;
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

    // Get a plain object snapshot before update (ensure it's a plain object, not a Mongoose document)
    const beforeSnapshot = JSON.parse(JSON.stringify(assignment.toObject()));
    
    // Convert endDate string to Date if provided
    const updateData: any = { ...dto };
    if (dto.endDate && typeof dto.endDate === 'string') {
      updateData.endDate = new Date(dto.endDate);
    }
    
    // Use findByIdAndUpdate instead of Object.assign + save to avoid _id issues
    const updatedAssignment = await this.assignmentModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!updatedAssignment) {
      throw new NotFoundException(
        `Position assignment with ID ${id} not found after update`,
      );
    }

    // Ensure afterSnapshot is also a plain object
    const afterSnapshot = JSON.parse(JSON.stringify(updatedAssignment.toObject()));

    await this.logChange(
      ChangeLogAction.UPDATED,
      'PositionAssignment',
      updatedAssignment._id,
      beforeSnapshot,
      afterSnapshot,
    );

    return updatedAssignment;
  }

  async endPositionAssignment(
    id: string,
    endDate: Date,
  ): Promise<PositionAssignmentDocument> {
    console.log(`[endPositionAssignment] Ending assignment ${id} with endDate: ${endDate.toISOString()}`);

    const assignment = await this.assignmentModel.findById(id);
    if (!assignment) {
      throw new NotFoundException(`Position assignment with ID ${id} not found`);
    }

    const employeeProfileId = assignment.employeeProfileId;
    const positionId = assignment.positionId;

    console.log(`[endPositionAssignment] Assignment details:`, {
      assignmentId: assignment._id,
      employeeProfileId: employeeProfileId?.toString(),
      positionId: positionId?.toString(),
      currentEndDate: assignment.endDate,
    });

    // Check if this is the current active assignment (before ending it)
    // Convert employeeProfileId to ObjectId for proper query
    const employeeObjectId = new Types.ObjectId(employeeProfileId.toString());
    const employee = await this.employeeProfileModel.findById(
      employeeObjectId,
    );
    
    if (!employee) {
      console.warn(`[endPositionAssignment] Employee ${employeeProfileId} not found, but continuing to end assignment`);
    }

    const isCurrentAssignment =
      employee &&
      employee.primaryPositionId &&
      employee.primaryPositionId.toString() === positionId.toString();

    console.log(`[endPositionAssignment] Is current assignment: ${isCurrentAssignment}`);

    // End the assignment
    const result = await this.updatePositionAssignment(id, {
      endDate: endDate.toISOString(),
    });

    // CRITICAL BUSINESS RULE: If this was the current assignment, update EmployeeProfile
    if (isCurrentAssignment) {
      console.log(`[endPositionAssignment] This was the current assignment, updating EmployeeProfile...`);
      
      try {
        // Find another active assignment for this employee
        // Note: We need to check for assignments that are still active AFTER we end this one
        // So we look for assignments that start before or on the endDate and have no endDate or endDate >= endDate
        const otherActiveAssignment = await this.assignmentModel
          .findOne({
            employeeProfileId: new Types.ObjectId(employeeProfileId.toString()),
            _id: { $ne: assignment._id }, // Exclude the one we just ended
            startDate: { $lte: endDate }, // Started before or on the end date
            $or: [
              { endDate: null }, // Ongoing
              { endDate: { $gte: endDate } }, // Ends on or after the end date
            ],
          })
          .sort({ startDate: -1 }) // Get the most recent active assignment
          .exec();

        if (otherActiveAssignment) {
          console.log(`[endPositionAssignment] Found other active assignment:`, {
            assignmentId: otherActiveAssignment._id,
            positionId: otherActiveAssignment.positionId,
            departmentId: otherActiveAssignment.departmentId,
          });

          // Update EmployeeProfile to point to the other active assignment
          const otherPosition = await this.positionModel
            .findById(otherActiveAssignment.positionId)
            .exec();
          const supervisorPositionId = otherPosition?.reportsToPositionId
            ? new Types.ObjectId(otherPosition.reportsToPositionId.toString())
            : null;

          const updateData: any = {
            $set: {
              primaryPositionId: new Types.ObjectId(
                otherActiveAssignment.positionId.toString(),
              ),
              primaryDepartmentId: new Types.ObjectId(
                otherActiveAssignment.departmentId.toString(),
              ),
            },
          };

          // Only set supervisorPositionId if it exists
          if (supervisorPositionId) {
            updateData.$set.supervisorPositionId = supervisorPositionId;
          }

          await this.employeeProfileModel.findByIdAndUpdate(
            new Types.ObjectId(employeeProfileId.toString()),
            updateData,
            { new: true },
          );

          console.log(
            `[endPositionAssignment] Updated EmployeeProfile ${employeeProfileId} to point to another active assignment (position ${otherActiveAssignment.positionId})`,
          );
        } else {
          console.log(`[endPositionAssignment] No other active assignment found, clearing EmployeeProfile fields`);
          
          // No other active assignment - clear current fields using $unset
          await this.employeeProfileModel.findByIdAndUpdate(
            new Types.ObjectId(employeeProfileId.toString()),
            {
              $unset: {
                primaryPositionId: "",
                primaryDepartmentId: "",
                supervisorPositionId: "",
              },
            },
            { new: true },
          );

          console.log(
            `[endPositionAssignment] Cleared EmployeeProfile ${employeeProfileId} current position/department (no other active assignments)`,
          );
        }
      } catch (profileUpdateError) {
        // Log the error but don't fail the assignment ending
        console.error(
          `[endPositionAssignment] Error updating EmployeeProfile for ${employeeProfileId}:`,
          profileUpdateError,
        );
        // Continue - the assignment is still ended, just the profile update failed
        // This allows the operation to complete even if profile update has issues
      }
    } else {
      console.log(`[endPositionAssignment] This was not the current assignment, no EmployeeProfile update needed`);
    }

    // REQ-OSM-05: Vacant position flagging for recruitment
    // When assignment ends, check if position becomes vacant
    const activeAssignments = await this.assignmentModel.countDocuments({
      positionId: positionId,
      $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
    });

    if (activeAssignments === 0) {
      // Position is now vacant - flag for recruitment
      const position = await this.positionModel.findById(positionId);
      if (position && position.isActive) {
        console.log(
          `[endPositionAssignment] Position ${positionId} (${position.code}) is now vacant and flagged for recruitment`,
        );
        // TODO: Integration with RecruitmentService to automatically create job requisition
        // await this.recruitmentService.flagPositionAsVacant(positionId.toString());
      }
    }

    return result;
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

  /**
   * Get change requests created by a specific employee
   * REQ-OSM-03: Managers/HR see only their own requests
   */
  async getChangeRequestsByRequester(
    employeeId: string,
    status?: StructureRequestStatus,
  ): Promise<StructureChangeRequestDocument[]> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException(`Invalid employee ID: ${employeeId}`);
    }

    const filter: any = {
      requestedByEmployeeId: new Types.ObjectId(employeeId),
    };
    
    if (status) {
      filter.status = status;
    }

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

    // REQ-OSM-04: Auto-create SINGLE approval for System Admin when request is submitted
    // Only one approval per request - the System Admin who will review it
    // Status changes to UNDER_REVIEW when approval is created
    try {
      const systemAdminRoles = await this.employeeSystemRoleModel
        .find({
          roles: { $in: [SystemRole.SYSTEM_ADMIN] },
          isActive: true,
        })
        .select('employeeProfileId')
        .limit(1)
        .exec();

      if (systemAdminRoles && systemAdminRoles.length > 0) {
        const systemAdminId = systemAdminRoles[0].employeeProfileId;
        
        // Check if approval already exists (shouldn't happen, but safety check)
        const existingApproval = await this.approvalModel.findOne({
          changeRequestId: request._id,
        });
        
        if (!existingApproval) {
          const newApproval = new this.approvalModel({
            _id: new Types.ObjectId(),
            changeRequestId: request._id,
            approverEmployeeId: systemAdminId,
            decision: ApprovalDecision.PENDING,
          });
          await newApproval.save();
          
          // Update status to UNDER_REVIEW when approval is created
          request.status = StructureRequestStatus.UNDER_REVIEW;
          await request.save();
          
          console.log(`[submitChangeRequest] ✅ Auto-created single approval for System Admin ${systemAdminId}, status set to UNDER_REVIEW`);
        } else {
          console.log(`[submitChangeRequest] ⚠️ Approval already exists for this request`);
        }
      } else {
        console.warn(`[submitChangeRequest] ⚠️ No System Admin found to auto-assign approval.`);
      }
    } catch (approvalError: any) {
      // Log but don't fail - System Admin can manually create approval
      console.error('[submitChangeRequest] Failed to auto-create approval:', approvalError?.message || approvalError);
    }

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
    if (!dto.approverEmployeeId) {
      throw new BadRequestException('Approver employee ID is required');
    }

    const request = await this.changeRequestModel.findById(dto.changeRequestId);
    if (!request) {
      throw new NotFoundException(`Change request not found`);
    }

    // Check if approval already exists for this approver and request
    const existingApproval = await this.approvalModel.findOne({
      changeRequestId: dto.changeRequestId,
      approverEmployeeId: dto.approverEmployeeId,
    });

    if (existingApproval) {
      throw new ConflictException(
        `Approval already exists for this approver and change request`,
      );
    }

    const approval = new this.approvalModel({
      _id: new Types.ObjectId(),
      changeRequestId: dto.changeRequestId,
      approverEmployeeId: dto.approverEmployeeId,
      decision: ApprovalDecision.PENDING,
      comments: dto.comments,
    });
    await approval.save();

    // Update request status
    if (request.status === StructureRequestStatus.SUBMITTED) {
      request.status = StructureRequestStatus.UNDER_REVIEW;
      await request.save();
    }

    return approval;
  }

  /**
   * System Admin approves or rejects a change request directly
   * Updates the approval record and request status accordingly
   * Note: Only one approval per request, so we find it by changeRequestId only
   */
  async approveChangeRequest(
    changeRequestId: string,
    approverEmployeeId: string,
    comments?: string,
  ): Promise<StructureChangeRequestDocument> {
    console.log(`[approveChangeRequest] Starting approval for request ${changeRequestId} by approver ${approverEmployeeId}`);
    
    if (!changeRequestId || !approverEmployeeId) {
      throw new BadRequestException('Change request ID and approver employee ID are required');
    }

    const request = await this.getChangeRequestById(changeRequestId);
    
    if (!request) {
      console.error(`[approveChangeRequest] Request ${changeRequestId} not found`);
      throw new NotFoundException(`Change request with ID ${changeRequestId} not found`);
    }

    console.log(`[approveChangeRequest] Request found: ${request.requestNumber}, status: ${request.status}`);

    if (request.status !== StructureRequestStatus.SUBMITTED && 
        request.status !== StructureRequestStatus.UNDER_REVIEW) {
      console.error(`[approveChangeRequest] Invalid status: ${request.status}, expected SUBMITTED or UNDER_REVIEW`);
      throw new BadRequestException(
        `Can only approve requests with status SUBMITTED or UNDER_REVIEW. Current status: ${request.status}`
      );
    }

    // Find the approval record for this request (only one approval per request)
    let approval = await this.approvalModel.findOne({
      changeRequestId: request._id,
    });

    // If no approval exists, create one for the current approver
    if (!approval) {
      console.log(`[approveChangeRequest] No approval found, creating one for approver ${approverEmployeeId}`);
      approval = new this.approvalModel({
        _id: new Types.ObjectId(),
        changeRequestId: request._id,
        approverEmployeeId: new Types.ObjectId(approverEmployeeId),
        decision: ApprovalDecision.PENDING,
      });
      await approval.save();
    } else {
      // Update the approver if it's different (shouldn't happen, but handle it)
      if (approval.approverEmployeeId.toString() !== approverEmployeeId) {
        console.log(`[approveChangeRequest] Updating approver from ${approval.approverEmployeeId} to ${approverEmployeeId}`);
        approval.approverEmployeeId = new Types.ObjectId(approverEmployeeId);
      }
    }

    if (approval.decision !== ApprovalDecision.PENDING) {
      throw new BadRequestException('Approval decision already made');
    }

    // Update approval
    approval.decision = ApprovalDecision.APPROVED;
    approval.decidedAt = new Date();
    if (comments) approval.comments = comments;
    await approval.save();

    // Update request status to APPROVED
    request.status = StructureRequestStatus.APPROVED;
    await request.save();

    console.log(`[approveChangeRequest] ✅ Request ${request.requestNumber} approved by ${approverEmployeeId}`);

    return request;
  }

  /**
   * System Admin rejects a change request directly
   * Note: Only one approval per request, so we find it by changeRequestId only
   */
  async rejectChangeRequest(
    changeRequestId: string,
    approverEmployeeId: string,
    comments?: string,
  ): Promise<StructureChangeRequestDocument> {
    const request = await this.getChangeRequestById(changeRequestId);
    
    if (!request) {
      throw new NotFoundException(`Change request with ID ${changeRequestId} not found`);
    }

    if (request.status !== StructureRequestStatus.SUBMITTED && 
        request.status !== StructureRequestStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Can only reject requests with status SUBMITTED or UNDER_REVIEW. Current status: ${request.status}`
      );
    }

    // Find the approval record for this request (only one approval per request)
    let approval = await this.approvalModel.findOne({
      changeRequestId: request._id,
    });

    // If no approval exists, create one for the current approver
    if (!approval) {
      console.log(`[rejectChangeRequest] No approval found, creating one for approver ${approverEmployeeId}`);
      approval = new this.approvalModel({
        _id: new Types.ObjectId(),
        changeRequestId: request._id,
        approverEmployeeId: new Types.ObjectId(approverEmployeeId),
        decision: ApprovalDecision.PENDING,
      });
      await approval.save();
    } else {
      // Update the approver if it's different (shouldn't happen, but handle it)
      if (approval.approverEmployeeId.toString() !== approverEmployeeId) {
        console.log(`[rejectChangeRequest] Updating approver from ${approval.approverEmployeeId} to ${approverEmployeeId}`);
        approval.approverEmployeeId = new Types.ObjectId(approverEmployeeId);
      }
    }

    if (approval.decision !== ApprovalDecision.PENDING) {
      throw new BadRequestException('Approval decision already made');
    }

    // Update approval
    approval.decision = ApprovalDecision.REJECTED;
    approval.decidedAt = new Date();
    if (comments) approval.comments = comments;
    await approval.save();

    // Update request status to REJECTED
    request.status = StructureRequestStatus.REJECTED;
    await request.save();

    console.log(`[rejectChangeRequest] ❌ Request ${request.requestNumber} rejected by ${approverEmployeeId}`);

    return request;
  }

  /**
   * Mark change request as IMPLEMENTED after System Admin uses form to create/update entity
   */
  async markRequestAsImplemented(
    changeRequestId: string,
  ): Promise<StructureChangeRequestDocument> {
    const request = await this.getChangeRequestById(changeRequestId);
    
    if (!request) {
      throw new NotFoundException(`Change request with ID ${changeRequestId} not found`);
    }

    if (request.status !== StructureRequestStatus.APPROVED) {
      throw new BadRequestException(
        `Can only mark APPROVED requests as IMPLEMENTED. Current status: ${request.status}`
      );
    }

    request.status = StructureRequestStatus.IMPLEMENTED;
    await request.save();

    console.log(`[markRequestAsImplemented] ✅ Request ${request.requestNumber} marked as IMPLEMENTED`);

    return request;
  }

  /**
   * Legacy method - kept for backward compatibility but redirects to new methods
   */
  async updateApprovalDecision(
    id: string,
    dto: UpdateApprovalDecisionDto,
  ): Promise<StructureApprovalDocument> {
    console.log(`[updateApprovalDecision] Updating approval ${id} with decision: ${dto.decision}`);
    
    const approval = await this.approvalModel.findById(id);
    if (!approval) {
      throw new NotFoundException(`Approval with ID ${id} not found`);
    }

    if (approval.decision !== ApprovalDecision.PENDING) {
      throw new BadRequestException('Approval decision already made');
    }

    // Use the new direct methods
    if (dto.decision === ApprovalDecision.APPROVED) {
      await this.approveChangeRequest(
        approval.changeRequestId.toString(),
        approval.approverEmployeeId.toString(),
        dto.comments,
      );
    } else if (dto.decision === ApprovalDecision.REJECTED) {
      await this.rejectChangeRequest(
        approval.changeRequestId.toString(),
        approval.approverEmployeeId.toString(),
        dto.comments,
      );
    }

    // Return updated approval
    return this.approvalModel.findById(id).exec() as Promise<StructureApprovalDocument>;
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
    if (entityId) {
      // Validate and convert entityId to ObjectId
      if (!Types.ObjectId.isValid(entityId)) {
        throw new BadRequestException(`Invalid entityId: ${entityId}`);
      }
      filter.entityId = new Types.ObjectId(entityId);
    }

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
    try {
      // Ensure snapshots are plain objects (not Mongoose documents)
      const cleanBeforeSnapshot = beforeSnapshot 
        ? JSON.parse(JSON.stringify(beforeSnapshot))
        : null;
      const cleanAfterSnapshot = afterSnapshot
        ? JSON.parse(JSON.stringify(afterSnapshot))
        : null;

      await this.changeLogModel.create({
        action,
        entityType,
        entityId,
        beforeSnapshot: cleanBeforeSnapshot,
        afterSnapshot: cleanAfterSnapshot,
        performedByEmployeeId: performedBy
          ? new Types.ObjectId(performedBy)
          : undefined,
      });
    } catch (error) {
      // Log the error but don't fail the operation
      console.error(`[logChange] Error logging change for ${entityType} ${entityId}:`, error);
    }
  }

  private async checkAndUpdateRequestStatus(
    changeRequestId: Types.ObjectId,
  ): Promise<void> {
    console.log(`[checkAndUpdateRequestStatus] Checking status for change request ${changeRequestId}`);
    
    const approvals = await this.approvalModel.find({ changeRequestId });
    console.log(`[checkAndUpdateRequestStatus] Found ${approvals.length} approval(s)`);
    
    if (approvals.length === 0) {
      console.log(`[checkAndUpdateRequestStatus] No approvals found - skipping status update`);
      return;
    }

    const allDecided = approvals.every(
      (a) => a.decision !== ApprovalDecision.PENDING,
    );

    if (!allDecided) {
      console.log(`[checkAndUpdateRequestStatus] Not all approvals decided yet - waiting`);
      return;
    }

    const hasRejection = approvals.some(
      (a) => a.decision === ApprovalDecision.REJECTED,
    );
    
    const hasApproval = approvals.some(
      (a) => a.decision === ApprovalDecision.APPROVED,
    );
    
    console.log(`[checkAndUpdateRequestStatus] Has rejection: ${hasRejection}, Has approval: ${hasApproval}`);
    
    const request = await this.changeRequestModel.findById(changeRequestId);

    if (!request) {
      console.error(`[checkAndUpdateRequestStatus] Change request ${changeRequestId} not found`);
      return;
    }

    if (hasRejection) {
      console.log(`[checkAndUpdateRequestStatus] Request rejected - setting status to REJECTED`);
      request.status = StructureRequestStatus.REJECTED;
      await request.save();
      return;
    }

    if (!hasApproval) {
      console.log(`[checkAndUpdateRequestStatus] No approvals found - cannot implement`);
      return;
    }

    // At least one approval is APPROVED and no rejections - mark as APPROVED
    // System Admin will use the existing create/update forms to finalize the changes
    console.log(`[checkAndUpdateRequestStatus] Request approved - setting status to APPROVED`);
    console.log(`[checkAndUpdateRequestStatus] System Admin should now use the create/update forms to finalize this change`);
    request.status = StructureRequestStatus.APPROVED;
    await request.save();
    
    // Store the request data in a way that can be used to populate forms
    // The request is now APPROVED and ready for System Admin to implement using existing forms
    console.log(`[checkAndUpdateRequestStatus] Request ${request.requestNumber} is now APPROVED and ready for implementation`);
  }

  /**
   * Get approved change request data formatted for form population
   * REQ-OSM-04: System Admin uses this to populate create/update forms
   */
  async getApprovedRequestFormData(
    changeRequestId: string,
  ): Promise<{
    requestType: StructureRequestType;
    formData: any;
    redirectUrl: string;
  }> {
    const request = await this.getChangeRequestById(changeRequestId);
    
    if (request.status !== StructureRequestStatus.APPROVED) {
      throw new BadRequestException(
        `Change request must be APPROVED to get form data. Current status: ${request.status}`,
      );
    }

    const details = this.parseDetails(request.details);

    switch (request.requestType) {
      case StructureRequestType.NEW_DEPARTMENT:
        return {
          requestType: request.requestType,
          formData: {
            code: details.code || '',
            name: details.name || '',
            description: details.description || '',
            headPositionId: details.headPositionId || '',
          },
          redirectUrl: `/dashboard/organization-structure/departments/new?fromRequest=${changeRequestId}&code=${encodeURIComponent(details.code || '')}&name=${encodeURIComponent(details.name || '')}&description=${encodeURIComponent(details.description || '')}`,
        };

      case StructureRequestType.UPDATE_DEPARTMENT:
        return {
          requestType: request.requestType,
          formData: details,
          redirectUrl: `/dashboard/organization-structure/departments/${request.targetDepartmentId}/edit?fromRequest=${changeRequestId}`,
        };

      case StructureRequestType.NEW_POSITION:
        return {
          requestType: request.requestType,
          formData: {
            code: details.code || '',
            title: details.title || '',
            description: details.description || '',
            departmentId: request.targetDepartmentId?.toString() || '',
            reportsToPositionId: details.reportsToPositionId || '',
          },
          redirectUrl: `/dashboard/organization-structure/positions/new?fromRequest=${changeRequestId}&departmentId=${request.targetDepartmentId}&code=${encodeURIComponent(details.code || '')}&title=${encodeURIComponent(details.title || '')}&description=${encodeURIComponent(details.description || '')}`,
        };

      case StructureRequestType.UPDATE_POSITION:
        return {
          requestType: request.requestType,
          formData: details,
          redirectUrl: `/dashboard/organization-structure/positions/${request.targetPositionId}/edit?fromRequest=${changeRequestId}`,
        };

      case StructureRequestType.CLOSE_POSITION:
        return {
          requestType: request.requestType,
          formData: {},
          redirectUrl: `/dashboard/organization-structure/positions/${request.targetPositionId}?fromRequest=${changeRequestId}&action=deactivate`,
        };

      default:
        throw new BadRequestException(`Unknown request type: ${request.requestType}`);
    }
  }

  /**
   * Parse details field to extract structured data
   * Expected format: JSON string or key-value pairs
   */
  private parseDetails(details?: string): Record<string, any> {
    if (!details) return {};

    try {
      // Try parsing as JSON first
      return JSON.parse(details);
    } catch {
      // If not JSON, try parsing as key-value pairs
      const parsed: Record<string, any> = {};
      const lines = details.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          parsed[key.trim()] = valueParts.join(':').trim();
        }
      }
      return parsed;
    }
  }

  // NOTE: Implementation methods removed - System Admin now uses existing forms
  // When a request is approved, System Admin is redirected to the appropriate form
  // with pre-filled data from the request. The form handles the actual creation/update.

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
