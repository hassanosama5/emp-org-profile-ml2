import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
// Import schemas
import { ShiftType } from '../models/shift-type.schema';
import { NotificationService } from './notification.service';
import { Shift } from '../models/shift.schema';
import { ShiftAssignment } from '../models/shift-assignment.schema';
import { ScheduleRule } from '../models/schedule-rule.schema';
import { ShiftAssignmentStatus } from '../models/enums';
// Import DTOs
import {
  AssignShiftToEmployeeDto,
  AssignShiftToDepartmentDto,
  AssignShiftToPositionDto,
  UpdateShiftAssignmentDto,
  RenewShiftAssignmentDto,
  CancelShiftAssignmentDto,
  PostponeShiftAssignmentDto,
} from '../DTOs/shift.dtos';

@Injectable()
export class ShiftScheduleService {
  constructor(
    @InjectModel(ShiftType.name) private shiftTypeModel: Model<ShiftType>,
    @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    @InjectModel(ShiftAssignment.name)
    private shiftAssignmentModel: Model<ShiftAssignment>,
    @InjectModel(ScheduleRule.name)
    private scheduleRuleModel: Model<ScheduleRule>,
    private readonly notificationService: NotificationService,
  ) {}

  // ===== SHIFT TYPE SERVICE METHODS =====

  // 1. Create a new shift type
  async createShiftType(createShiftTypeDto: any, currentUserId: string) {
    const newShiftType = new this.shiftTypeModel({
      ...createShiftTypeDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newShiftType.save();
  }

  // 2. Update an existing shift type
  async updateShiftType(id: string, updateShiftTypeDto: any, currentUserId: string) {
    const shiftType = await this.shiftTypeModel.findById(id);
    if (!shiftType) {
      throw new NotFoundException('Shift type not found');
    }
    return this.shiftTypeModel.findByIdAndUpdate(id, {
      ...updateShiftTypeDto,
      updatedBy: currentUserId,
    }, { new: true });
  }

  // 3. Get all shift types
  async getShiftTypes(filters?: { active?: boolean }) {
    const query: any = {};
    if (filters?.active !== undefined) {
      query.active = filters.active;
    }
    return this.shiftTypeModel.find(query).exec();
  }

  // 4. Get shift type by ID
  async getShiftTypeById(id: string) {
    const shiftType = await this.shiftTypeModel.findById(id).exec();
    if (!shiftType) {
      throw new NotFoundException('Shift type not found');
    }
    return shiftType;
  }

  // 5. Delete shift type
  async deleteShiftType(id: string) {
    const shiftType = await this.shiftTypeModel.findById(id);
    if (!shiftType) {
      throw new NotFoundException('Shift type not found');
    }
    // Check if any shifts are using this type
    const shiftsUsingType = await this.shiftModel.countDocuments({ shiftType: new Types.ObjectId(id) });
    if (shiftsUsingType > 0) {
      throw new BadRequestException(`Cannot delete shift type. ${shiftsUsingType} shift(s) are using this type.`);
    }
    await this.shiftTypeModel.findByIdAndDelete(id);
    return { message: 'Shift type deleted successfully' };
  }

  // ===== SHIFT SERVICE METHODS =====

  // 6. Create a new shift
  async createShift(createShiftDto: any, currentUserId: string) {
    // Validate shift type exists
    const shiftType = await this.shiftTypeModel.findById(createShiftDto.shiftType);
    if (!shiftType) {
      throw new NotFoundException('Shift type not found');
    }
    const newShift = new this.shiftModel({
      ...createShiftDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newShift.save();
  }

  // 7. Update an existing shift
  async updateShift(id: string, updateShiftDto: any, currentUserId: string) {
    const shift = await this.shiftModel.findById(id);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return this.shiftModel.findByIdAndUpdate(
      id,
      {
        ...updateShiftDto,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 8. Get all shifts with optional filters
  async getShifts(filters?: { active?: boolean; shiftType?: string }) {
    const query: any = {};
    if (filters?.active !== undefined) {
      query.active = filters.active;
    }
    if (filters?.shiftType) {
      // Validate shiftType ID before using it
      if (!Types.ObjectId.isValid(filters.shiftType)) {
        throw new BadRequestException('Invalid shiftType ID format');
      }
      query.shiftType = new Types.ObjectId(filters.shiftType);
    }
    
    try {
      return await this.shiftModel.find(query).populate('shiftType').exec();
    } catch (error: any) {
      // If populate fails due to invalid references, return shifts without populate
      // This can happen if shiftType references are invalid
      console.warn('Failed to populate shiftType, returning shifts without populate:', error.message);
      return this.shiftModel.find(query).exec();
    }
  }

  // 9. Get shift by ID
  async getShiftById(id: string) {
    const shift = await this.shiftModel.findById(id).populate('shiftType').exec();
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  // 10. Get shifts by type
  async getShiftsByType(shiftTypeId: string) {
    return this.shiftModel.find({ shiftType: new Types.ObjectId(shiftTypeId) }).exec();
  }

  // 11. Delete shift
  async deleteShift(id: string) {
    const shift = await this.shiftModel.findById(id);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    // Check if any assignments are using this shift
    const assignmentsUsingShift = await this.shiftAssignmentModel.countDocuments({ 
      shiftId: new Types.ObjectId(id),
      status: { $nin: [ShiftAssignmentStatus.CANCELLED, ShiftAssignmentStatus.EXPIRED] }
    });
    if (assignmentsUsingShift > 0) {
      throw new BadRequestException(`Cannot delete shift. ${assignmentsUsingShift} active assignment(s) are using this shift.`);
    }
    await this.shiftModel.findByIdAndDelete(id);
    return { message: 'Shift deleted successfully' };
  }

  // ===== SHIFT ASSIGNMENT SERVICE METHODS =====

  // 12. Assign a shift to an employee
  async assignShiftToEmployee(
    assignShiftToEmployeeDto: AssignShiftToEmployeeDto,
    currentUserId: string,
  ) {
    // Validate shift exists
    const shift = await this.shiftModel.findById(assignShiftToEmployeeDto.shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const newShiftAssignment = new this.shiftAssignmentModel({
      employeeId: new Types.ObjectId(assignShiftToEmployeeDto.employeeId),
      shiftId: new Types.ObjectId(assignShiftToEmployeeDto.shiftId),
      departmentId: assignShiftToEmployeeDto.departmentId 
        ? new Types.ObjectId(assignShiftToEmployeeDto.departmentId) 
        : undefined,
      positionId: assignShiftToEmployeeDto.positionId 
        ? new Types.ObjectId(assignShiftToEmployeeDto.positionId) 
        : undefined,
      scheduleRuleId: assignShiftToEmployeeDto.scheduleRuleId 
        ? new Types.ObjectId(assignShiftToEmployeeDto.scheduleRuleId) 
        : undefined,
      startDate: assignShiftToEmployeeDto.startDate,
      endDate: assignShiftToEmployeeDto.endDate,
      status: assignShiftToEmployeeDto.status || ShiftAssignmentStatus.PENDING,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newShiftAssignment.save();
  }

  // 8. Assign shift to all employees in a department
  async assignShiftToDepartment(
    dto: AssignShiftToDepartmentDto,
    currentUserId: string,
  ) {
    // Validate shift exists
    const shift = await this.shiftModel.findById(dto.shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const assignment = new this.shiftAssignmentModel({
      departmentId: new Types.ObjectId(dto.departmentId),
      shiftId: new Types.ObjectId(dto.shiftId),
      startDate: dto.startDate || new Date(),
      endDate: dto.endDate,
      status: dto.status || ShiftAssignmentStatus.PENDING,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    return assignment.save();
  }

  // 9. Assign shift to all employees in a position
  async assignShiftToPosition(
    dto: AssignShiftToPositionDto,
    currentUserId: string,
  ) {
    // Validate shift exists
    const shift = await this.shiftModel.findById(dto.shiftId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const assignment = new this.shiftAssignmentModel({
      positionId: new Types.ObjectId(dto.positionId),
      shiftId: new Types.ObjectId(dto.shiftId),
      startDate: dto.startDate || new Date(),
      endDate: dto.endDate,
      status: dto.status || ShiftAssignmentStatus.PENDING,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    return assignment.save();
  }

  // 10. Update a shift assignment
  async updateShiftAssignment(
    id: string,
    updateShiftAssignmentDto: UpdateShiftAssignmentDto,
    currentUserId: string,
  ) {
    const assignment = await this.shiftAssignmentModel.findById(id);
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    return this.shiftAssignmentModel.findByIdAndUpdate(
      id,
      {
        ...updateShiftAssignmentDto,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 11. Get all shift assignments for an employee
  async getEmployeeShiftAssignments(employeeId: string, currentUserId: string) {
    return this.shiftAssignmentModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .populate('shiftId')
      .populate('scheduleRuleId')
      .exec();
  }

  // 12. Get shift assignments by department
  async getDepartmentShiftAssignments(departmentId: string) {
    return this.shiftAssignmentModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .populate('shiftId')
      .exec();
  }

  // 13. Get shift assignments by position
  async getPositionShiftAssignments(positionId: string) {
    return this.shiftAssignmentModel
      .find({ positionId: new Types.ObjectId(positionId) })
      .populate('shiftId')
      .exec();
  }

  // 14. Get the status of a shift assignment
  async getShiftAssignmentStatus(shiftAssignmentId: string, currentUserId: string) {
    const assignment = await this.shiftAssignmentModel.findById(shiftAssignmentId).exec();

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    return { 
      assignmentId: shiftAssignmentId,
      status: assignment.status,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
    };
  }

  // 15. Renew a shift assignment (extend end date)
  async renewShiftAssignment(
    dto: RenewShiftAssignmentDto,
    currentUserId: string,
  ) {
    const assignment = await this.shiftAssignmentModel.findById(dto.assignmentId);
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    // If no new end date provided, extend by 1 month from current end date
    const newEndDate = dto.newEndDate || new Date(
      (assignment.endDate || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const updatedAssignment = await this.shiftAssignmentModel.findByIdAndUpdate(
      dto.assignmentId,
      {
        endDate: newEndDate,
        status: ShiftAssignmentStatus.APPROVED,
        updatedBy: currentUserId,
      },
      { new: true },
    );

    // Send renewal confirmation notification (only if employeeId exists)
    if (assignment.employeeId) {
      try {
        await this.notificationService.sendShiftRenewalConfirmation(
          assignment.employeeId.toString(),
          dto.assignmentId,
          newEndDate,
          currentUserId,
        );
      } catch (notifError) {
        console.error('Failed to send renewal notification:', notifError);
        // Don't fail the renewal if notification fails
      }
    }

    return updatedAssignment;
  }

  // 16. Cancel a shift assignment
  async cancelShiftAssignment(
    dto: CancelShiftAssignmentDto,
    currentUserId: string,
  ) {
    const assignment = await this.shiftAssignmentModel.findById(dto.assignmentId);
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    return this.shiftAssignmentModel.findByIdAndUpdate(
      dto.assignmentId,
      {
        status: ShiftAssignmentStatus.CANCELLED,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 17. Reassign a shift assignment to a different employee
  async reassignShiftAssignment(
    assignmentId: string,
    newEmployeeId: string,
    currentUserId: string,
  ) {
    // Validate newEmployeeId is a valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(newEmployeeId)) {
      throw new BadRequestException('Invalid employee ID format. Please provide a valid employee ID.');
    }

    const assignment = await this.shiftAssignmentModel
      .findById(assignmentId)
      .populate('shiftId', 'name');
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    // Update the assignment with new employee (correct field is employeeId)
    const updatedAssignment = await this.shiftAssignmentModel.findByIdAndUpdate(
      assignmentId,
      {
        employeeId: new Types.ObjectId(newEmployeeId),
        updatedBy: currentUserId,
      },
      { new: true },
    );

    // Send reassignment notification to new employee
    try {
      const shiftName = (assignment.shiftId as any)?.name || 'Unknown Shift';
      await this.notificationService.sendShiftReassignmentConfirmation(
        newEmployeeId,
        assignmentId,
        shiftName,
        updatedAssignment.endDate || new Date(),
        currentUserId,
      );
    } catch (notifError) {
      console.error('Failed to send reassignment notification:', notifError);
      // Don't fail the reassignment if notification fails
    }

    return updatedAssignment;
  }

  // 18. Postpone a shift assignment
  async postponeShiftAssignment(
    dto: PostponeShiftAssignmentDto,
    currentUserId: string,
  ) {
    const assignment = await this.shiftAssignmentModel.findById(dto.assignmentId);
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    return this.shiftAssignmentModel.findByIdAndUpdate(
      dto.assignmentId,
      {
        startDate: dto.postponeUntil,
        status: ShiftAssignmentStatus.PENDING,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 18. Check and mark expired shift assignments
  async checkExpiredAssignments() {
    const now = new Date();
    const result = await this.shiftAssignmentModel.updateMany(
      {
        endDate: { $lt: now },
        status: { $nin: [ShiftAssignmentStatus.CANCELLED, ShiftAssignmentStatus.EXPIRED] },
      },
      {
        $set: { status: ShiftAssignmentStatus.EXPIRED },
      },
    );
    return {
      message: 'Expired assignments updated',
      modifiedCount: result.modifiedCount,
    };
  }

  // 19. Get all shift assignments with filters
  async getAllShiftAssignments(filters: {
    status?: ShiftAssignmentStatus;
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    shiftId?: string;
  }) {
    const query: any = {};

    // Helper function to validate ObjectId
    const isValidObjectId = (id: any): boolean => {
      if (!id) return false;
      if (Types.ObjectId.isValid(id)) {
        try {
          new Types.ObjectId(id);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.employeeId) {
      if (!isValidObjectId(filters.employeeId)) {
        throw new BadRequestException('Invalid employeeId format');
      }
      query.employeeId = new Types.ObjectId(filters.employeeId);
    }
    if (filters.departmentId) {
      if (!isValidObjectId(filters.departmentId)) {
        throw new BadRequestException('Invalid departmentId format');
      }
      query.departmentId = new Types.ObjectId(filters.departmentId);
    }
    if (filters.positionId) {
      if (!isValidObjectId(filters.positionId)) {
        throw new BadRequestException('Invalid positionId format');
      }
      query.positionId = new Types.ObjectId(filters.positionId);
    }
    if (filters.shiftId) {
      if (!isValidObjectId(filters.shiftId)) {
        throw new BadRequestException('Invalid shiftId format');
      }
      query.shiftId = new Types.ObjectId(filters.shiftId);
    }

    // Filter out assignments with invalid ObjectIds before populating
    // This prevents errors when trying to populate with invalid reference IDs
    const assignments = await this.shiftAssignmentModel.find(query).lean().exec();
    
    // Filter out assignments with invalid ObjectIds
    const validAssignments = assignments.filter(assignment => {
      return (
        (!assignment.shiftId || isValidObjectId(assignment.shiftId)) &&
        (!assignment.employeeId || isValidObjectId(assignment.employeeId)) &&
        (!assignment.departmentId || isValidObjectId(assignment.departmentId)) &&
        (!assignment.positionId || isValidObjectId(assignment.positionId))
      );
    });

    // Convert back to Mongoose documents and populate
    const assignmentIds = validAssignments.map(a => {
      // Handle both string and ObjectId _id formats
      return typeof a._id === 'string' ? new Types.ObjectId(a._id) : a._id;
    });

    if (assignmentIds.length === 0) {
      return [];
    }

    return this.shiftAssignmentModel
      .find({ _id: { $in: assignmentIds } })
      .populate('shiftId')
      .populate('employeeId')
      .populate('departmentId')
      .populate('positionId')
      .exec();
  }

  // 20. Get shift assignment by ID
  async getShiftAssignmentById(id: string) {
    const assignment = await this.shiftAssignmentModel
      .findById(id)
      .populate('shiftId')
      .populate('employeeId')
      .populate('departmentId')
      .populate('positionId')
      .exec();

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    return assignment;
  }

  // ===== SCHEDULE RULE SERVICE METHODS (US3: Custom Scheduling Rules) =====
  // BR-TM-04: Support multiple shift types (Normal, Split, Overnight, Mission, Rotational) with start/end dates
  // BR-TM-10: Support multiple punches per day, or first in/last out
  // BR-TM-03: Shift types support with dates
  // BR-TM-05: Assignable by Department, Position, or Individual

  // 21. Create a new schedule rule (supports flexible patterns like 4-on/3-off, flex-in/flex-out)
  async createScheduleRule(createScheduleRuleDto: any, currentUserId: string) {
    // BR-TM-04: Validate pattern format for scheduling rules
    const validPatterns = [
      // Standard patterns
      'STANDARD',           // Standard 5-day work week
      'FLEXIBLE',           // Flex-in/flex-out hours
      'ROTATIONAL',         // Rotating shifts
      'COMPRESSED',         // Compressed work week (4x10)
      'SPLIT',              // Split shifts
      // Custom patterns (regex-like format for days)
      /^(\d+)-ON\/(\d+)-OFF$/, // e.g., "4-ON/3-OFF"
      /^FLEX:([\d:]+)-([\d:]+)$/, // e.g., "FLEX:07:00-10:00" for flex start window
    ];

    const pattern = createScheduleRuleDto.pattern?.toUpperCase();
    const isValidPattern = validPatterns.some(p => 
      typeof p === 'string' ? p === pattern : p.test(pattern)
    );

    if (!isValidPattern && pattern) {
      // If pattern doesn't match predefined, allow custom but log warning
      console.warn(`Custom pattern used: ${pattern}. Ensure it's properly validated in attendance.`);
    }

    const newScheduleRule = new this.scheduleRuleModel({
      ...createScheduleRuleDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newScheduleRule.save();
  }

  // 22. Get all schedule rules with optional filters
  async getScheduleRules(filters?: { active?: boolean }) {
    const query: any = {};

    if (filters?.active !== undefined) {
      query.active = filters.active;
    }

    return this.scheduleRuleModel.find(query).exec();
  }

  // 23. Get schedule rule by ID
  async getScheduleRuleById(id: string) {
    const scheduleRule = await this.scheduleRuleModel.findById(id).exec();
    if (!scheduleRule) {
      throw new NotFoundException('Schedule rule not found');
    }
    return scheduleRule;
  }

  // 24. Update a schedule rule
  async updateScheduleRule(id: string, updateScheduleRuleDto: any, currentUserId: string) {
    const scheduleRule = await this.scheduleRuleModel.findById(id);
    if (!scheduleRule) {
      throw new NotFoundException('Schedule rule not found');
    }

    return this.scheduleRuleModel.findByIdAndUpdate(
      id,
      {
        ...updateScheduleRuleDto,
        updatedBy: currentUserId,
      },
      { new: true },
    );
  }

  // 25. Delete a schedule rule (only if not in use)
  async deleteScheduleRule(id: string) {
    const scheduleRule = await this.scheduleRuleModel.findById(id);
    if (!scheduleRule) {
      throw new NotFoundException('Schedule rule not found');
    }

    // BR: Cannot delete schedule rule if it's being used by shift assignments
    const assignmentsUsingRule = await this.shiftAssignmentModel.countDocuments({
      scheduleRuleId: new Types.ObjectId(id),
      status: { $nin: [ShiftAssignmentStatus.CANCELLED, ShiftAssignmentStatus.EXPIRED] },
    });

    if (assignmentsUsingRule > 0) {
      throw new BadRequestException(
        `Cannot delete schedule rule. ${assignmentsUsingRule} active shift assignment(s) are using this rule.`,
      );
    }

    await this.scheduleRuleModel.findByIdAndDelete(id);
    return { message: 'Schedule rule deleted successfully' };
  }

  // 26. Define flexible scheduling rules (flex-in/flex-out, custom weekly patterns)
  // This is an alias for createScheduleRule but specifically for flexible patterns
  async defineFlexibleSchedulingRules(
    defineFlexibleSchedulingRulesDto: any,
    currentUserId: string,
  ) {
    // Ensure pattern indicates flexibility
    const pattern = defineFlexibleSchedulingRulesDto.pattern?.toUpperCase();
    
    // BR-TM-04: Validate flexible pattern types
    const flexiblePatterns = ['FLEXIBLE', 'COMPRESSED', 'ROTATIONAL'];
    const isFlexPattern = flexiblePatterns.some(p => pattern?.includes(p)) ||
      /^(\d+)-ON\/(\d+)-OFF$/.test(pattern) ||
      /^FLEX:/.test(pattern);

    if (!isFlexPattern) {
      console.warn(`Pattern "${pattern}" may not be a flexible scheduling pattern.`);
    }

    const newFlexibleSchedule = new this.scheduleRuleModel({
      ...defineFlexibleSchedulingRulesDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newFlexibleSchedule.save();
  }

  // 27. Validate schedule rule pattern
  // BR-TM-04: Validates that the schedule rule pattern is valid and can be applied
  async validateScheduleRule(scheduleRuleId: string, assignmentDate?: Date) {
    const scheduleRule = await this.scheduleRuleModel.findById(scheduleRuleId);
    if (!scheduleRule) {
      throw new NotFoundException('Schedule rule not found');
    }

    const pattern = scheduleRule.pattern?.toUpperCase();
    const checkDate = assignmentDate || new Date();
    
    // Parse and validate pattern
    const validationResult = {
      scheduleRuleId,
      ruleName: scheduleRule.name,
      pattern: scheduleRule.pattern,
      isActive: scheduleRule.active,
      isValid: true,
      checkDate,
      patternType: 'UNKNOWN',
      message: '',
    };

    // Determine pattern type and validate
    if (pattern === 'STANDARD') {
      validationResult.patternType = 'STANDARD';
      validationResult.message = 'Standard 5-day work week (Mon-Fri)';
    } else if (pattern === 'FLEXIBLE') {
      validationResult.patternType = 'FLEXIBLE';
      validationResult.message = 'Flexible hours with core hours compliance';
    } else if (pattern === 'ROTATIONAL') {
      validationResult.patternType = 'ROTATIONAL';
      validationResult.message = 'Rotating shift pattern';
    } else if (pattern === 'COMPRESSED') {
      validationResult.patternType = 'COMPRESSED';
      validationResult.message = 'Compressed work week (e.g., 4x10 hours)';
    } else if (pattern === 'SPLIT') {
      validationResult.patternType = 'SPLIT';
      validationResult.message = 'Split shift pattern';
    } else if (/^(\d+)-ON\/(\d+)-OFF$/.test(pattern)) {
      const match = pattern.match(/^(\d+)-ON\/(\d+)-OFF$/);
      validationResult.patternType = 'CUSTOM_ROTATION';
      validationResult.message = `Custom rotation: ${match[1]} days on, ${match[2]} days off`;
    } else if (/^FLEX:/.test(pattern)) {
      validationResult.patternType = 'FLEX_WINDOW';
      validationResult.message = 'Flexible start/end time window';
    } else {
      validationResult.patternType = 'CUSTOM';
      validationResult.message = 'Custom pattern - manual validation required';
    }

    if (!scheduleRule.active) {
      validationResult.isValid = false;
      validationResult.message = 'Schedule rule is inactive';
    }

    return validationResult;
  }

  // 28. Apply schedule rule to shift assignment
  // BR-TM-05: Schedule rules can be applied to Employee, Department, or Position
  async applyScheduleRuleToShiftAssignment(
    shiftAssignmentId: string,
    scheduleRuleId: string,
    currentUserId: string,
  ) {
    // Validate shift assignment exists
    const assignment = await this.shiftAssignmentModel.findById(shiftAssignmentId);
    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    // Validate schedule rule exists and is active
    const scheduleRule = await this.scheduleRuleModel.findById(scheduleRuleId);
    if (!scheduleRule) {
      throw new NotFoundException('Schedule rule not found');
    }

    if (!scheduleRule.active) {
      throw new BadRequestException('Cannot apply inactive schedule rule');
    }

    // Update the shift assignment with the schedule rule
    return this.shiftAssignmentModel.findByIdAndUpdate(
      shiftAssignmentId,
      {
        scheduleRuleId: new Types.ObjectId(scheduleRuleId),
        updatedBy: currentUserId,
      },
      { new: true },
    ).populate('scheduleRuleId');
  }

  // 29. Get shift assignments by schedule rule
  async getShiftAssignmentsByScheduleRule(scheduleRuleId: string) {
    return this.shiftAssignmentModel
      .find({ 
        scheduleRuleId: new Types.ObjectId(scheduleRuleId),
        status: { $nin: [ShiftAssignmentStatus.CANCELLED, ShiftAssignmentStatus.EXPIRED] },
      })
      .populate('shiftId')
      .populate('employeeId')
      .populate('departmentId')
      .populate('positionId')
      .exec();
  }

  // 30. Check if date matches schedule rule pattern
  // BR-TM-04: Helper to determine if a specific date is a working day per schedule rule
  async isWorkingDayPerScheduleRule(
    scheduleRuleId: string,
    checkDate: Date,
    cycleStartDate?: Date,
  ): Promise<{ isWorkingDay: boolean; reason: string }> {
    const scheduleRule = await this.scheduleRuleModel.findById(scheduleRuleId);
    if (!scheduleRule) {
      throw new NotFoundException('Schedule rule not found');
    }

    const pattern = scheduleRule.pattern?.toUpperCase();
    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Standard pattern: Mon-Fri (1-5)
    if (pattern === 'STANDARD') {
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      return {
        isWorkingDay,
        reason: isWorkingDay ? 'Weekday (Mon-Fri)' : 'Weekend',
      };
    }

    // Rotational pattern with X-ON/Y-OFF
    if (/^(\d+)-ON\/(\d+)-OFF$/.test(pattern)) {
      const match = pattern.match(/^(\d+)-ON\/(\d+)-OFF$/);
      const daysOn = parseInt(match[1], 10);
      const daysOff = parseInt(match[2], 10);
      const cycleLength = daysOn + daysOff;

      // Calculate day in cycle
      const startDate = cycleStartDate || new Date(checkDate.getFullYear(), 0, 1); // Default to Jan 1
      const daysSinceStart = Math.floor(
        (checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const dayInCycle = daysSinceStart % cycleLength;

      const isWorkingDay = dayInCycle < daysOn;
      return {
        isWorkingDay,
        reason: isWorkingDay 
          ? `Day ${dayInCycle + 1} of ${daysOn} working days` 
          : `Day ${dayInCycle - daysOn + 1} of ${daysOff} off days`,
      };
    }

    // Compressed (4x10) - typically Mon-Thu
    if (pattern === 'COMPRESSED') {
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 4;
      return {
        isWorkingDay,
        reason: isWorkingDay ? 'Compressed week day (Mon-Thu)' : 'Off day (Fri-Sun)',
      };
    }

    // Default: Assume all days are working days for custom patterns
    return {
      isWorkingDay: true,
      reason: 'Custom pattern - assumed working day',
    };
  }
}
