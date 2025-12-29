import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { populate } from 'dotenv';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { HolidayType } from '../time-management/models/enums';
import { HydratedDocument } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

import { LeavePolicy, LeavePolicyDocument } from './models/leave-policy.schema';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from './models/leave-request.schema';
import {
  LeaveEntitlement,
  LeaveEntitlementDocument,
} from './models/leave-entitlement.schema';
import {
  LeaveAdjustment,
  LeaveAdjustmentDocument,
} from './models/leave-adjustment.schema';
import { LeaveType, LeaveTypeDocument } from './models/leave-type.schema';
import { Attachment, AttachmentDocument } from './models/attachment.schema';
import { Calendar, CalendarDocument } from './models/calendar.schema';
import {
  LeaveCategory,
  LeaveCategoryDocument,
} from './models/leave-category.schema';

import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleDocument,
} from '../employee-profile/models/employee-system-role.schema';
import { EmployeeStatus, SystemRole, ContractType } from '../employee-profile/enums/employee-profile.enums';
// import { PositionAssignment, PositionAssignmentDocument } from '../organization-structure/models/position-assignment.schema';
// import { Position, PositionDocument } from '../organization-structure/models/position.schema';

import { CreateLeavePolicyDto } from './dto/CreateLeavePolicy.dto';
import { UpdateLeavePolicyDto } from './dto/UpdateLeavePolicy.dto';
import { CreateLeaveRequestDto } from './dto/CreateLeaveRequest.dto';
import { UpdateLeaveRequestDto } from './dto/UpdateLeaveRequest.dto';
import { CreateLeaveEntitlementDto } from './dto/CreateLeaveEntitlement.dto';
import { UpdateLeaveEntitlementDto } from './dto/UpdateLeaveEntitlement.dto';
import { CreateLeaveTypeDto } from './dto/CreateLeaveType.dto';
import { CreateLeaveCategoryDto } from './dto/CreateLeaveCategory.dto';
import { CreateCalendarDto } from './dto/CreateCalendar.dto';
import { UpdateLeaveTypeDto } from './dto/UpdateLeaveType.dto';
import { LeaveStatus } from './enums/leave-status.enum';
//import { NotificationService } from '../notification/notification.service'; // Assuming a notification service

import { AccrualMethod } from './enums/accrual-method.enum';
import { RoundingRule } from './enums/rounding-rule.enum';
import { ApproveLeaveRequestDto } from './dto/ApproveLeaveRequest.dto';
import { RejectLeaveRequestDto } from './dto/RejectLeaveRequest.dto';
import { ViewLeaveBalanceDto } from './dto/ViewLeaveBalance.dto';
import { ViewPastLeaveRequestsDto } from './dto/ViewPastLeaveRequests.dto';
import { FilterLeaveHistoryDto } from './dto/FilterLeaveHistory.dto';
import { ViewTeamLeaveBalancesDto } from './dto/ViewTeamLeaveBalances.dto';
import { FilterTeamLeaveDataDto } from './dto/FilterTeamLeaveData.dto';
import { FlagIrregularPatternDto } from './dto/FlagIrregularPattern.dto';
import {
  AutoAccrueLeaveDto,
  AccrueAllEmployeesDto,
} from './dto/AutoAccrueLeave.dto';
import { RunCarryForwardDto } from './dto/CarryForward.dto';
import { AccrualAdjustmentDto } from './dto/AccrualAdjustment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class LeavesService {
  // Helper: convert string or ObjectId-like to Types.ObjectId
  private toObjectId(
    id: string | Types.ObjectId | undefined | null,
  ): Types.ObjectId | undefined {
    if (!id) return undefined;
    try {
      return id instanceof Types.ObjectId
        ? id
        : new Types.ObjectId(id as string);
    } catch (err) {
      throw new Error(`Invalid id provided: ${id}`);
    }
  }

  // Calendar Management
  async createCalendar(dto: CreateCalendarDto): Promise<CalendarDocument> {
    // Normalize holidays: accept either array of ObjectId strings or embedded holiday objects
    const holidayIds: Types.ObjectId[] = [];
    if (dto.holidays && Array.isArray(dto.holidays)) {
      // Try to get Holiday model from same connection (registered in time-management module)
      let HolidayModel: any = null;
      try {
        HolidayModel = this.calendarModel.db.model('Holiday');
      } catch (err) {
        HolidayModel = null;
      }

      for (const h of dto.holidays) {
        if (!h) continue;
        // If already an id string or ObjectId-like, push as ObjectId
        if (typeof h === 'string' || h instanceof Types.ObjectId) {
          holidayIds.push(new Types.ObjectId(h));
          continue;
        }

        // otherwise assume it's an object with { name, date, description }
        if (HolidayModel) {
          try {
            const created: any = await HolidayModel.create({
              type: HolidayType.ORGANIZATIONAL,
              startDate: new Date(h.date),
              endDate: h.date ? new Date(h.date) : undefined,
              name: h.name || undefined,
              active: true,
            });
            holidayIds.push(created._id);
            continue;
          } catch (err) {
            // if creation failed, skip this holiday
            console.warn(
              'Failed to create Holiday document for calendar import:',
              err,
            );
          }
        }

        // fallback: skip or attempt to coerce
      }
    }

    const doc = new this.calendarModel({
      year: dto.year,
      holidays: holidayIds,
      blockedPeriods:
        dto.blockedPeriods?.map((p) => ({
          from: new Date(p.from),
          to: new Date(p.to),
          reason: p.reason || '',
        })) || [],
    });
    return await doc.save();
  }

  async getCalendarByYear(year: number): Promise<CalendarDocument | null> {
    // Populate holidays so callers receive full holiday documents (dates/names)
    return await this.calendarModel
      .findOne({ year })
      .populate('holidays')
      .exec();
  }

  async updateCalendar(
    year: number,
    dto: CreateCalendarDto,
  ): Promise<CalendarDocument | null> {
    const holidayIds: Types.ObjectId[] = [];
    if (dto.holidays && Array.isArray(dto.holidays)) {
      let HolidayModel: any = null;
      try {
        HolidayModel = this.calendarModel.db.model('Holiday');
      } catch (err) {
        HolidayModel = null;
      }

      for (const h of dto.holidays) {
        if (!h) continue;
        if (typeof h === 'string' || h instanceof Types.ObjectId) {
          holidayIds.push(new Types.ObjectId(h));
          continue;
        }

        if (HolidayModel) {
          try {
            const created: any = await HolidayModel.create({
              type: HolidayType.ORGANIZATIONAL,
              startDate: new Date(h.date),
              endDate: h.date ? new Date(h.date) : undefined,
              name: h.name || undefined,
              active: true,
            });
            holidayIds.push(created._id);
            continue;
          } catch (err) {
            console.warn(
              'Failed to create Holiday document for calendar update:',
              err,
            );
          }
        }
      }
    }

    return await this.calendarModel
      .findOneAndUpdate(
        { year },
        {
          $set: {
            holidays: holidayIds,
            blockedPeriods:
              dto.blockedPeriods?.map((p) => ({
                from: new Date(p.from),
                to: new Date(p.to),
                reason: p.reason || '',
              })) || [],
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }
  constructor(
    @InjectModel(LeavePolicy.name)
    private leavePolicyModel: mongoose.Model<LeavePolicyDocument>,
    @InjectModel(LeaveRequest.name)
    private leaveRequestModel: mongoose.Model<LeaveRequestDocument>,
    @InjectModel(LeaveEntitlement.name)
    private leaveEntitlementModel: mongoose.Model<LeaveEntitlementDocument>,
    @InjectModel(LeaveAdjustment.name)
    private leaveAdjustmentModel: mongoose.Model<LeaveAdjustmentDocument>,
    @InjectModel(LeaveType.name)
    private leaveTypeModel: mongoose.Model<LeaveTypeDocument>,
    @InjectModel(Attachment.name)
    private attachmentModel: mongoose.Model<AttachmentDocument>,
    @InjectModel(Calendar.name)
    private calendarModel: mongoose.Model<CalendarDocument>,
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: mongoose.Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private systemRoleModel: mongoose.Model<EmployeeSystemRoleDocument>,
    @InjectModel('NotificationLog')
    private notificationLogModel: mongoose.Model<any>,
    // @InjectModel(PositionAssignment.name) private positionAssignmentModel: mongoose.Model<PositionAssignmentDocument>,
    // @InjectModel(Position.name) private positionModel: mongoose.Model<PositionDocument>,
    @InjectModel(LeaveCategory.name)
    private leaveCategoryModel: mongoose.Model<LeaveCategoryDocument>,
    private notificationsService: NotificationsService,
  ) {}

  // In-memory storage for delegation records (Map<managerId, Array<delegation>>)
  private delegationMap: Map<
    string,
    Array<{
      delegateId: string;
      startDate: Date;
      endDate: Date;
      isActive: boolean;
    }>
  > = new Map();

  // LeavePolicy
  async createLeavePolicy(
    createLeavePolicyDto: CreateLeavePolicyDto,
  ): Promise<LeavePolicyDocument> {
    const newLeavePolicy = new this.leavePolicyModel(createLeavePolicyDto);
    return await newLeavePolicy.save();
  }

  async getLeavePolicies(): Promise<LeavePolicyDocument[]> {
    return await this.leavePolicyModel.find().exec();
  }

  async getLeavePolicyById(id: string): Promise<LeavePolicyDocument> {
    const leavePolicy = await this.leavePolicyModel.findById(id).exec();
    if (!leavePolicy) {
      throw new Error(`LeavePolicy with ID ${id} not found`);
    }
    return leavePolicy;
  }

  async updateLeavePolicy(
    id: string,
    updateLeavePolicyDto: UpdateLeavePolicyDto,
  ): Promise<LeavePolicyDocument> {
    const updatedLeavePolicy = await this.leavePolicyModel
      .findByIdAndUpdate(id, updateLeavePolicyDto, { new: true })
      .exec();

    if (!updatedLeavePolicy) {
      throw new Error(`LeavePolicy with ID ${id} not found`);
    }

    return updatedLeavePolicy;
  }

  // Delete a LeavePolicy by ID
  //async deleteLeavePolicy(id: string): Promise<LeavePolicyDocument> {
  // First, check if the document exists
  //const leavePolicy = await this.leavePolicyModel.findById(id).exec();

  //if (!leavePolicy) {
  //throw new Error(`LeavePolicy with ID ${id} not found`);
  //}

  // Now delete the document and return the result
  //return await this.leavePolicyModel.findByIdAndDelete(id).exec();
  //}

  async deleteLeavePolicy(id: string): Promise<LeavePolicyDocument> {
    const leavePolicy = await this.leavePolicyModel.findById(id).exec();

    if (!leavePolicy) {
      throw new Error(`LeavePolicy with ID ${id} not found`);
    }

    return (await this.leavePolicyModel
      .findByIdAndDelete(id)
      .exec()) as LeavePolicyDocument;
  }

  // Leave Category
  async createLeaveCategory(
    createLeaveCategoryDto: CreateLeaveCategoryDto,
  ): Promise<LeaveCategoryDocument> {
    const newCategory = new this.leaveCategoryModel(createLeaveCategoryDto);
    return await newCategory.save();
  }

  async getLeaveCategories(): Promise<LeaveCategoryDocument[]> {
    return await this.leaveCategoryModel.find().exec();
  }

  // LeaveRequest

  // Checks if any date in the range [from, to] overlaps with blocked periods in the calendar for that year
  async isBlockedDateRange(from: string, to: string): Promise<boolean> {
    const year = new Date(from).getFullYear();
    const calendar = await this.calendarModel.findOne({ year }).exec();
    if (!calendar) {
      console.warn(
        'Calendar for year',
        year,
        'not found; treating date as not blocked:',
        from,
        to,
      );
      return false;
    }
    const start = new Date(from);
    const end = new Date(to);
    return calendar.blockedPeriods.some((period) => {
      const blockedStart = new Date(period.from);
      const blockedEnd = new Date(period.to);
      // Overlap: (start <= blockedEnd) && (end >= blockedStart)
      return start <= blockedEnd && end >= blockedStart;
    });
  }

  // Phase 2: REQ-015 - Create leave request with validation and routing
  async createLeaveRequest(
    createLeaveRequestDto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDocument> {
    const {
      dates,
      employeeId,
      leaveTypeId,
      justification,
      attachmentId,
      durationDays: providedDurationDays,
    } = createLeaveRequestDto;
    const { from, to } = dates;

    const startDate = new Date(from);
    const endDate = new Date(to);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Business Rule: Calculate leave duration net of non-working days (weekends and holidays)
    const calculatedDurationDays = await this.calculateWorkingDays(
      startDate,
      endDate,
      employeeId,
    );
    const durationDays = providedDurationDays || calculatedDurationDays;

    // REQ-031: Check post-leave grace period
    const maxGracePeriodDays = 7; // Should come from configuration
    const daysSinceEndDate = Math.floor(
      (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceEndDate > maxGracePeriodDays && daysSinceEndDate > 0) {
      throw new Error(
        `Post-leave requests must be submitted within ${maxGracePeriodDays} days after the leave end date.`,
      );
    }

    // Fetch employee profile with position populated
    const employeeProfile = await this.employeeProfileModel
      .findById(employeeId)
      .populate('primaryPositionId', 'code title')
      .exec();
    if (!employeeProfile) {
      throw new NotFoundException('Employee not found');
    }

    // Fetch leave type
    const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // REQ-007: Check eligibility rules (BR 7)
    await this.checkEligibility(employeeId, leaveTypeId, employeeProfile);

    // REQ-016: Validate medical certificate requirement for sick leave exceeding one day
    if (leaveType.code === 'SICK_LEAVE' && durationDays > 1) {
      if (!attachmentId) {
        throw new BadRequestException(
          'Medical certificate is required for sick leave exceeding one day. Please upload a medical certificate before submitting your request.',
        );
      }
    }

    // REQ-016: Validate attachment requirement
    if (leaveType.requiresAttachment && !attachmentId) {
      throw new BadRequestException(
        `Attachment is required for ${leaveType.name} leave requests. Please upload the required supporting document before submitting.`,
      );
    }

    if (attachmentId) {
      const attachment = await this.attachmentModel
        .findById(attachmentId)
        .exec();
      if (!attachment) {
        throw new NotFoundException(`Attachment with ID '${attachmentId}' not found. Please upload a new attachment or verify the attachment ID.`);
      }
    }

    // Check if any date in the requested range falls on a blocked period
    const isBlocked = await this.isBlockedDateRange(
      startDate.toISOString(),
      endDate.toISOString(),
    );
    if (isBlocked) {
      throw new BadRequestException(
        'The requested leave dates fall on blocked periods.',
      );
    }

    // Convert employeeId and leaveTypeId to ObjectId using the helper
    const employeeObjectId = this.toObjectId(employeeId) as Types.ObjectId;
    const leaveTypeObjectId = this.toObjectId(leaveTypeId) as Types.ObjectId;

    // Fetch leave type using ObjectId
    const leaveTypeDoc = await this.leaveTypeModel
      .findById(leaveTypeObjectId)
      .exec();
    if (!leaveTypeDoc) {
      throw new NotFoundException(`Leave type with ID '${leaveTypeId}' not found. Please select a valid leave type.`);
    }

    // REQ-016 validations remain the same (use original attachmentId variable)
    if (leaveTypeDoc.code === 'SICK_LEAVE' && durationDays > 1) {
      if (!attachmentId) {
        throw new BadRequestException(
          'Medical certificate is required for sick leave exceeding one day. Please upload a medical certificate before submitting your request.',
        );
      }
    }

    if (leaveTypeDoc.requiresAttachment && !attachmentId) {
      throw new BadRequestException(
        `Attachment is required for ${leaveTypeDoc.name} leave requests. Please upload the required supporting document before submitting.`,
      );
    }

    if (attachmentId) {
      const attachment = await this.attachmentModel
        .findById(this.toObjectId(attachmentId))
        .exec();
      if (!attachment) {
        throw new NotFoundException(`Attachment with ID '${attachmentId}' not found. Please upload a new attachment or verify the attachment ID.`);
      }
    }

    // Validate balance and overlaps using ObjectIds (cast to any for existing helper)
    // Only validate balance if the leave type is deductible
    const validationResult = await this.validateLeaveRequest(
      employeeObjectId as any,
      leaveTypeObjectId as any,
      startDate,
      endDate,
      durationDays,
      undefined,
      leaveTypeDoc.deductible !== false, // Only check balance if deductible
    );
    if (!validationResult.isValid) {
      throw new BadRequestException(validationResult.errorMessage || 'Invalid leave request. Please check your input and try again.');
    }

    // Check if employee is a department head, HR Manager, or HR Admin
    const employeeSystemRole = await this.systemRoleModel
      .findOne({ employeeProfileId: employeeObjectId, isActive: true })
      .exec();
    const isDepartmentHead = employeeSystemRole?.roles?.includes(SystemRole.DEPARTMENT_HEAD) || false;
    const isHRManager = employeeSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
    const isHRAdmin = employeeSystemRole?.roles?.includes(SystemRole.HR_ADMIN) || false;

    // Determine approval flow based on employee role
    // Department heads' requests go directly to HR Manager
    // HR Managers' requests go directly to CEO (John Doe)
    // HR Admin requests go directly to HR Manager
    let approvalRole = 'Manager';
    if (isDepartmentHead) {
      approvalRole = 'HR Manager';
    } else if (isHRAdmin) {
      approvalRole = 'HR Manager';
    } else if (isHRManager) {
      // Find CEO (John Doe) by name
      const ceo = await this.employeeProfileModel
        .findOne({ 
          firstName: 'John', 
          lastName: 'Doe',
          status: { $ne: 'TERMINATED' } // Only active employees
        })
        .exec();
      
      if (ceo) {
        approvalRole = 'CEO';
      } else {
        // Fallback: if CEO not found, route to HR Manager
        approvalRole = 'HR Manager';
      }
    }

    // Create leave request with initial approval flow, ensuring ObjectId fields are set
    const leaveRequest = new this.leaveRequestModel({
      ...createLeaveRequestDto,
      employeeId: employeeObjectId,
      leaveTypeId: leaveTypeObjectId,
      attachmentId: createLeaveRequestDto.attachmentId
        ? this.toObjectId(createLeaveRequestDto.attachmentId)
        : undefined,
      status: LeaveStatus.PENDING,
      approvalFlow: [
        {
          role: approvalRole,
          status: 'PENDING',
          decidedBy: undefined,
          decidedAt: undefined,
        },
      ],
    });

    // Update pending balance atomically using ObjectIds
    // Only increment pending if the leave type is deductible (non-deductible leaves don't reserve or deduct from balance)
    if (leaveTypeDoc.deductible !== false) {
      const entitlement = await this.getLeaveEntitlement(
        employeeObjectId as any,
        leaveTypeObjectId as any,
      );
      await this.leaveEntitlementModel
        .findByIdAndUpdate(
          entitlement._id,
          { $inc: { pending: durationDays } },
          { new: true },
        )
        .exec();
    }
    // Note: Non-deductible leaves (deductible = false) don't affect balance at all
    // They are tracked in the leave request but don't reserve or deduct from entitlement balance

    const savedLeaveRequest = await leaveRequest.save();
    
    // Notify manager when new leave request is created
    await this.notifyStakeholders(savedLeaveRequest, 'created');
    
    return savedLeaveRequest;
  }

  // Phase 2: Helper - Validate leave request (balance, overlaps)
  private async validateLeaveRequest(
    employeeId: string,
    leaveTypeId: string,
    startDate: Date,
    endDate: Date,
    durationDays: number,
    excludeRequestId?: string, // 👈 NEW optional param
    checkBalance: boolean = true, // 👈 NEW param to control balance checking
  ): Promise<{ isValid: boolean; errorMessage?: string }> {
    // Only check balance if checkBalance is true (for deductible leave types)
    if (checkBalance) {
      const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
      const availableBalance = entitlement.remaining - entitlement.pending;

      if (availableBalance < durationDays) {
        return {
          isValid: false,
          errorMessage: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${durationDays} days.`,
        };
      }
    }

    // Build base query
    const query: any = {
      employeeId: new Types.ObjectId(employeeId),
      status: { $in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      $or: [
        {
          'dates.from': { $lte: endDate },
          'dates.to': { $gte: startDate },
        },
      ],
    };

    // 👇 Exclude the current request when updating
    if (excludeRequestId) {
      query._id = { $ne: new Types.ObjectId(excludeRequestId) };
    }

    const overlappingRequests = await this.leaveRequestModel.find(query).exec();

    if (overlappingRequests.length > 0) {
      return {
        isValid: false,
        errorMessage:
          'Leave request overlaps with existing approved or pending leave requests.',
      };
    }

    return { isValid: true };
  }

  // Phase 2: REQ-020 - Get Line Manager/Department Head ID

  async getLeaveRequestById(id: string): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel
      .findById(id)
      .populate('leaveTypeId', 'name code')
      .exec();
    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found. Please verify the request ID and try again.`);
    }
    
    // Handle case where leaveTypeId is not populated or populate returned null (leave type was deleted)
    const leaveTypeIdValue = leaveRequest.leaveTypeId instanceof Types.ObjectId 
      ? leaveRequest.leaveTypeId 
      : (typeof leaveRequest.leaveTypeId === 'string' 
          ? new Types.ObjectId(leaveRequest.leaveTypeId) 
          : (leaveRequest.leaveTypeId as any)?._id || leaveRequest.leaveTypeId);
    
    // Check if populate succeeded (has name property) or if it's still an ObjectId (not populated)
    const isPopulated = leaveRequest.leaveTypeId && 
      typeof leaveRequest.leaveTypeId === 'object' && 
      leaveRequest.leaveTypeId !== null &&
      !(leaveRequest.leaveTypeId instanceof Types.ObjectId) &&
      (leaveRequest.leaveTypeId as any).name;
    
    if (!isPopulated && leaveTypeIdValue) {
      // Populate failed or returned null - fetch the leave type separately
      try {
        const leaveType = await this.leaveTypeModel.findById(leaveTypeIdValue).exec();
        if (leaveType) {
          // Manually set the populated leaveTypeId with the fetched data
          (leaveRequest.leaveTypeId as any) = {
            _id: leaveType._id,
            name: leaveType.name,
            code: leaveType.code,
          };
        } else {
          // Leave type was deleted - set a placeholder
          (leaveRequest.leaveTypeId as any) = {
            _id: leaveTypeIdValue,
            name: 'Deleted Leave Type',
            code: 'DELETED',
          };
        }
      } catch (err) {
        // If fetch fails, set placeholder
        (leaveRequest.leaveTypeId as any) = {
          _id: leaveTypeIdValue,
          name: 'Unknown Leave Type',
          code: 'UNKNOWN',
        };
      }
    }
    
    return leaveRequest;
  }

  // Phase 2: REQ-017 - Modify an existing leave request (only for pending requests)

  async updateLeaveRequest(
    id: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto,
    userId?: string, // Optional: user ID to validate ownership
  ): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel.findById(id).exec();

    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }

    // Validate ownership: user can only edit their own requests
    if (userId) {
      const requestEmployeeId = leaveRequest.employeeId.toString();
      if (requestEmployeeId !== userId) {
        throw new BadRequestException(
          'You can only edit your own leave requests.'
        );
      }
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      const statusDisplay = leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1).toLowerCase();
      throw new BadRequestException(
        `Only pending leave requests can be edited. This request has been ${statusDisplay.toLowerCase()} and cannot be modified. ` +
        `If you need to make changes, please cancel this request (if still pending) or contact HR for assistance.`
      );
    }

    // 🔹 Determine the new dates & duration (use updated values if provided, otherwise existing ones)
    const newDates = updateLeaveRequestDto.dates ?? leaveRequest.dates;
    const newStartDate = new Date(newDates.from);
    const newEndDate = new Date(newDates.to);
    const newDurationDays =
      updateLeaveRequestDto.durationDays ?? leaveRequest.durationDays;

    // 🔹 Re-validate balance + overlapping requests, excluding this request's own id
    const validationResult = await this.validateLeaveRequest(
      leaveRequest.employeeId.toString(),
      leaveRequest.leaveTypeId.toString(),
      newStartDate,
      newEndDate,
      newDurationDays,
      leaveRequest._id.toString(), // 👈 exclude this request from overlap query
    );

    if (!validationResult.isValid) {
      throw new BadRequestException(validationResult.errorMessage || 'Invalid leave request update. Please check your input and try again.');
    }

    // 🔹 If duration changed, update pending balance atomically
    if (
      updateLeaveRequestDto.durationDays &&
      updateLeaveRequestDto.durationDays !== leaveRequest.durationDays
    ) {
      const entitlement = await this.getLeaveEntitlement(
        leaveRequest.employeeId.toString(),
        leaveRequest.leaveTypeId.toString(),
      );
      const delta =
        updateLeaveRequestDto.durationDays - leaveRequest.durationDays; // positive => increase pending
      await this.leaveEntitlementModel
        .findByIdAndUpdate(
          entitlement._id,
          { $inc: { pending: delta } },
          { new: true },
        )
        .exec();
    }

    // 🔹 Finally apply the update
    const updatedLeaveRequest = await this.leaveRequestModel
      .findByIdAndUpdate(id, updateLeaveRequestDto, { new: true })
      .exec();

    if (!updatedLeaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }

    // REQ-030: Notify employee about the update
    await this.notifyStakeholders(updatedLeaveRequest, 'modified');

    return updatedLeaveRequest;
  }

  // Phase 2: REQ-019 - Delete a leave request (only for pending requests)

  async deleteLeaveRequest(id: string): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel.findById(id).exec();

    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }

    return (await this.leaveRequestModel
      .findByIdAndDelete(id)
      .exec()) as LeaveRequestDocument;
  }

  // Phase 2: REQ-018 - Cancel a leave request before final approval
  async cancelLeaveRequest(id: string, userId?: string): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel.findById(id).exec();

    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }

    // Validate ownership: user can only cancel their own requests
    if (userId) {
      const requestEmployeeId = leaveRequest.employeeId.toString();
      if (requestEmployeeId !== userId) {
        throw new BadRequestException(
          'You can only cancel your own leave requests.'
        );
      }
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      const statusDisplay = leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1).toLowerCase();
      throw new BadRequestException(
        `Only pending leave requests can be canceled. This request has been ${statusDisplay.toLowerCase()} and cannot be canceled. ` +
        `If you need to make changes to an approved request, please contact HR for assistance.`
      );
    }

    // Release pending balance atomically (and clamp to 0 if negative)
    const entitlement = await this.getLeaveEntitlement(
      leaveRequest.employeeId.toString(),
      leaveRequest.leaveTypeId.toString(),
    );
    const updated = await this.leaveEntitlementModel
      .findByIdAndUpdate(
        entitlement._id,
        { $inc: { pending: -leaveRequest.durationDays } },
        { new: true },
      )
      .exec();
    if (updated && updated.pending < 0) {
      await this.leaveEntitlementModel
        .findByIdAndUpdate(entitlement._id, { $set: { pending: 0 } })
        .exec();
    }

    // Update status to canceled
    leaveRequest.status = LeaveStatus.CANCELLED;
    const canceledLeaveRequest = await leaveRequest.save();

    // REQ-030: Notify employee and manager
    await this.notifyStakeholders(canceledLeaveRequest, 'canceled');

    return canceledLeaveRequest;
  }

  // Phase 2: REQ-021 - Manager approve leave request
  async approveLeaveRequest(
    approveDto: ApproveLeaveRequestDto,
    managerId: string,
    leaveRequestId?: string,
  ): Promise<LeaveRequestDocument> {
    const { status } = approveDto;
    // Use route parameter if provided, otherwise fall back to DTO
    const requestId = leaveRequestId || approveDto.leaveRequestId;
    const leaveRequestObjectId = new Types.ObjectId(requestId);

    // Step 1: Fetch the leave request by ID
    const leaveRequest = await this.leaveRequestModel
      .findById(leaveRequestObjectId)
      .exec();

    // Step 2: If leave request doesn't exist, throw NotFoundException
    if (!leaveRequest) {
      throw new NotFoundException(
        `Leave request with ID ${leaveRequestObjectId} not found`,
      );
    }

    // Step 3: Ensure the leave request is in PENDING status before approval
    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Leave request has already been ${leaveRequest.status}`,
      );
    }

    // Step 3.5: Prevent department head from approving their own leave requests
    // Department head's own requests should be handled by HR Manager
    const requestEmployeeId = leaveRequest.employeeId.toString();
    if (requestEmployeeId === managerId) {
      // Check if the manager is a department head
      const managerSystemRole = await this.systemRoleModel
        .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
        .exec();
      const isDepartmentHead = managerSystemRole?.roles?.includes(SystemRole.DEPARTMENT_HEAD) || false;

      if (isDepartmentHead) {
        throw new BadRequestException(
          'Department heads cannot approve or reject their own leave requests. Your requests are handled by HR Manager.',
        );
      }
    }

    // Step 4: Check the approval flow role to determine who should approve
    const pendingApproval = leaveRequest.approvalFlow.find(
      (approval) => approval.status === 'PENDING' || approval.status === LeaveStatus.PENDING,
    );
    const approvalRole = pendingApproval?.role || 'Manager';

    // Step 5: Check if the approver is a delegated employee
    // If they are a delegate, they're approving on behalf of the manager who delegated to them
    // Delegates can approve requests for any approval role (including HR Manager)
    const delegatedManagerId = this.getDelegatedManagerId(managerId);
    const isDelegate = delegatedManagerId !== null;

    // The actual manager ID (either the approver themselves or the manager they're delegated for)
    // This is used for tracking purposes, but decidedBy will always record who actually made the decision
    const actualManagerId = isDelegate ? delegatedManagerId! : managerId;

    // Step 6: If approval role is HR Manager, verify the approver is an HR Manager
    // If approval role is CEO, verify the approver is CEO (John Doe)
    if (approvalRole === 'HR Manager') {
      const approverSystemRole = await this.systemRoleModel
        .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
        .exec();
      const isHRManager = approverSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;

      // If not a delegate, must be HR Manager
      if (!isDelegate && !isHRManager) {
        throw new BadRequestException(
          'Only HR Managers can approve/reject department head and HR Admin leave requests.',
        );
      }
      
      // If delegate, verify the manager who delegated to them is an HR Manager
      if (isDelegate) {
        const delegatedManagerSystemRole = await this.systemRoleModel
          .findOne({ employeeProfileId: new Types.ObjectId(actualManagerId), isActive: true })
          .exec();
        const isDelegatedManagerHRManager = delegatedManagerSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
        
        // Allow if delegate is HR Manager OR if delegated by HR Manager
        if (!isHRManager && !isDelegatedManagerHRManager) {
          throw new BadRequestException(
            'Only HR Managers or delegates of HR Managers can approve/reject department head and HR Admin leave requests.',
          );
        }
      }
    } else if (approvalRole === 'CEO') {
      // Verify approver is CEO (John Doe) - HR Admin can no longer approve
      const approver = await this.employeeProfileModel.findById(managerId).exec();
      const isCEO = approver && approver.firstName === 'John' && approver.lastName === 'Doe';
      
      if (!isCEO) {
        throw new BadRequestException(
          'Only CEO (John Doe) can approve/reject HR Manager leave requests.',
        );
      }
    } else if (approvalRole === 'Manager') {
      // For regular requests, verify the approver is the direct supervisor of the employee
      // UNLESS the approver is a delegate - delegates can approve on behalf of the manager who delegated to them
      // This allows any supervisor (Department Head, Payroll Manager, HR Manager, etc.) to approve
      // as long as they are the direct supervisor (their primaryPositionId matches employee's supervisorPositionId)
      // OR they are a delegate acting on behalf of the manager
      if (!isDelegate) {
        // Only check direct supervisor relationship if user is NOT a delegate
        const employeeId = leaveRequest.employeeId.toString();
        const approverProfile = await this.employeeProfileModel.findById(managerId).exec();
        const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();
        
        if (!approverProfile || !employeeProfile) {
          throw new BadRequestException(
            'Unable to verify supervisor relationship. Please ensure both employee and approver profiles exist.',
          );
        }
        
        const approverPositionId = approverProfile.primaryPositionId;
        const employeeSupervisorPositionId = (employeeProfile as any).supervisorPositionId;
        
        if (!approverPositionId || !employeeSupervisorPositionId) {
          throw new BadRequestException(
            'Unable to verify supervisor relationship. Employee or approver may not have position assignments.',
          );
        }
        
        // Use flexible comparison to handle both ObjectId and string formats
        const approverPosIdStr = approverPositionId instanceof Types.ObjectId 
          ? approverPositionId.toString() 
          : String(approverPositionId);
        const empSupervisorPosIdStr = employeeSupervisorPositionId instanceof Types.ObjectId
          ? employeeSupervisorPositionId.toString()
          : String(employeeSupervisorPositionId);
        
        const isDirectSupervisor = approverPosIdStr === empSupervisorPosIdStr;
        
        if (!isDirectSupervisor) {
          throw new BadRequestException(
            'Only the direct supervisor can approve/reject this leave request.',
          );
        }
      }
      // If user is a delegate, skip the direct supervisor check - they can approve on behalf of the manager
    }
    
    // Prevent HR Admin from approving any requests (they can only view)
    const approverSystemRoleCheck = await this.systemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
      .exec();
    const isApproverHRAdmin = approverSystemRoleCheck?.roles?.includes(SystemRole.HR_ADMIN) || false;
    
    if (isApproverHRAdmin) {
      throw new BadRequestException(
        'HR Admin cannot approve or reject leave requests. HR Admin can only view requests.',
      );
    }

    // Step 7: Update the approval flow with the approver's decision
    // Update the existing pending approval entry instead of pushing a new one
    if (pendingApproval) {
      // Find the index of the pending approval in the array by matching role and status
      const pendingIndex = leaveRequest.approvalFlow.findIndex(
        (approval) => 
          approval.role === approvalRole && 
          (approval.status === 'PENDING' || approval.status === LeaveStatus.PENDING)
      );
      
      if (pendingIndex !== -1) {
        // Update the existing pending approval entry
        leaveRequest.approvalFlow[pendingIndex].status = status;
        leaveRequest.approvalFlow[pendingIndex].decidedBy = new Types.ObjectId(managerId);
        leaveRequest.approvalFlow[pendingIndex].decidedAt = new Date();
        // Mark the array as modified so Mongoose detects the change
        leaveRequest.markModified('approvalFlow');
      } else {
        // Fallback: if index not found, push a new entry
        leaveRequest.approvalFlow.push({
          role: approvalRole,
          status: status,
          decidedBy: new Types.ObjectId(managerId),
          decidedAt: new Date(),
        });
      }
    } else {
      // Fallback: if no pending approval found, push a new entry
      leaveRequest.approvalFlow.push({
        role: approvalRole, // Role from approval flow (HR Manager or Department Head)
        status: status, // Status can be APPROVED or REJECTED
        decidedBy: new Types.ObjectId(managerId), // The actual person who made the decision (could be delegate)
        decidedAt: new Date(), // Timestamp of when the decision was made
      });
    }

    leaveRequest.status = status; // Set the leave status to APPROVED or REJECTED

    // Step 7.5: Automatically verify document when request is approved and has attachment
    if (status === LeaveStatus.APPROVED && leaveRequest.attachmentId) {
      // Check if document verification entry already exists
      const existingVerification = leaveRequest.approvalFlow.find(
        (approval) => 
          approval.role === 'Department Head - Document Verification' ||
          approval.role === 'HR Manager - Document Verification'
      );

      // Only add verification if it doesn't exist and hasn't been rejected
      if (!existingVerification || existingVerification.status?.toLowerCase() !== 'rejected') {
        // Determine the verification role based on who is approving
        const verificationRole = approvalRole === 'HR Manager' 
          ? 'HR Manager - Document Verification'
          : 'Department Head - Document Verification';

        // Check if there's already a verification entry for this role
        const existingRoleVerification = leaveRequest.approvalFlow.find(
          (approval) => approval.role === verificationRole
        );

        if (!existingRoleVerification) {
          // Add document verification entry
          leaveRequest.approvalFlow.push({
            role: verificationRole,
            status: 'verified',
            decidedBy: new Types.ObjectId(managerId),
            decidedAt: new Date(),
          });
          leaveRequest.markModified('approvalFlow');
        } else if (existingRoleVerification.status?.toLowerCase() !== 'verified') {
          // Update existing verification entry to verified
          const verificationIndex = leaveRequest.approvalFlow.findIndex(
            (approval) => approval.role === verificationRole
          );
          if (verificationIndex !== -1) {
            leaveRequest.approvalFlow[verificationIndex].status = 'verified';
            leaveRequest.approvalFlow[verificationIndex].decidedBy = new Types.ObjectId(managerId);
            leaveRequest.approvalFlow[verificationIndex].decidedAt = new Date();
            leaveRequest.markModified('approvalFlow');
          }
        }
      }
    }

    // Step 8: Save the updated leave request
    const updatedLeaveRequest = await leaveRequest.save();

    // Step 8.5: Auto-finalize when delegate approves
    // If a delegate (who is an HR Manager or delegated by an HR Manager) approves a request,
    // automatically finalize it so the finalized label appears for the employee
    let wasAutoFinalized = false;
    if (status === LeaveStatus.APPROVED && isDelegate) {
      try {
        // Check if delegate is an HR Manager
        const delegateSystemRole = await this.systemRoleModel
          .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
          .exec();
        const isDelegateHRManager = delegateSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
        
        // Check if the manager they're delegated for is an HR Manager
        let isManagerHRManager = false;
        if (actualManagerId) {
          const managerSystemRole = await this.systemRoleModel
            .findOne({ employeeProfileId: new Types.ObjectId(actualManagerId), isActive: true })
            .exec();
          isManagerHRManager = managerSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
        }
        
        // Auto-finalize if delegate is HR Manager OR if delegated by HR Manager
        if (isDelegateHRManager || isManagerHRManager) {
          // Check if already finalized
          const alreadyFinalized = updatedLeaveRequest.approvalFlow.some(
            (approval) =>
              approval.role === 'HR Manager' &&
              approval.status === LeaveStatus.APPROVED,
          );
          
          if (!alreadyFinalized) {
            // Add HR Manager finalization entry
            updatedLeaveRequest.approvalFlow.push({
              role: 'HR Manager',
              status: LeaveStatus.APPROVED,
              decidedBy: new Types.ObjectId(managerId), // The delegate who approved
              decidedAt: new Date(),
            });
            updatedLeaveRequest.markModified('approvalFlow');
            
            // Finalize the request (update balances)
            await this.finalizeApprovedLeaveRequest(updatedLeaveRequest);
            
            // Save the finalized request
            const finalizedRequest = await updatedLeaveRequest.save();
            
            console.log(`[AUTO-FINALIZE] Delegate ${managerId} (HR Manager: ${isDelegateHRManager}, Delegated by HR Manager: ${isManagerHRManager}) auto-finalized request ${requestId}`);
            
            // Notify stakeholders about finalization (includes employee notification)
            await this.notifyStakeholders(finalizedRequest, 'finalized');
            
            wasAutoFinalized = true;
            return finalizedRequest;
          }
        }
      } catch (finalizeError) {
        // Log error but don't fail the approval - the request is still approved
        console.error(`[AUTO-FINALIZE] Error auto-finalizing request ${requestId} by delegate ${managerId}:`, finalizeError);
      }
    }

    // Step 9: Notify employee when leave request is approved/rejected
    // Skip notification if we already notified about finalization
    if (!wasAutoFinalized) {
      if (status === LeaveStatus.APPROVED) {
        await this.notifyStakeholders(updatedLeaveRequest, 'approved');
      } else if (status === LeaveStatus.REJECTED) {
        await this.notifyStakeholders(updatedLeaveRequest, 'rejected');
      }
    }

    return updatedLeaveRequest;
  }

    
    

  
  

  // Phase 2: REQ-022 - Manager reject leave request
  async rejectLeaveRequest(
    rejectLeaveRequestDto: RejectLeaveRequestDto,
    managerId: string,
    leaveRequestId?: string,
  ): Promise<LeaveRequestDocument> {
    const { status } = rejectLeaveRequestDto;
    // Use route parameter if provided, otherwise fall back to DTO
    const requestId = leaveRequestId || rejectLeaveRequestDto.leaveRequestId;
    const leaveRequestObjectId = new Types.ObjectId(requestId);

    // Step 1: Fetch the leave request by ID
    const leaveRequest = await this.leaveRequestModel
      .findById(leaveRequestObjectId)
      .exec();

    // Step 2: If leave request doesn't exist, throw NotFoundException
    if (!leaveRequest) {
      throw new NotFoundException(
        `Leave request with ID ${leaveRequestObjectId} not found`,
      );
    }

    // Step 3: Ensure the leave request is in PENDING status before rejection
    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Leave request has already been ${leaveRequest.status}`,
      );
    }

    // Step 3.5: Prevent department head and HR Manager from rejecting their own leave requests
    // Department head's own requests should be handled by HR Manager
    // HR Manager's own requests should be handled by CEO
    const requestEmployeeId = leaveRequest.employeeId.toString();
    if (requestEmployeeId === managerId) {
      // Check if the manager is a department head or HR Manager
      const managerSystemRole = await this.systemRoleModel
        .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
        .exec();
      const isDepartmentHead = managerSystemRole?.roles?.includes(SystemRole.DEPARTMENT_HEAD) || false;
      const isHRManager = managerSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;

      if (isDepartmentHead) {
        throw new BadRequestException(
          'Department heads cannot approve or reject their own leave requests. Your requests are handled by HR Manager.',
        );
      }
      if (isHRManager) {
        throw new BadRequestException(
          'HR Managers cannot approve or reject their own leave requests. Your requests are handled by CEO.',
        );
      }
    }

    // Step 4: Check the approval flow role to determine who should reject
    const pendingApproval = leaveRequest.approvalFlow.find(
      (approval) => approval.status === 'PENDING' || approval.status === LeaveStatus.PENDING,
    );
    const approvalRole = pendingApproval?.role || 'Manager';

    // Step 4.5: Check if the approver is a delegated employee
    // If they are a delegate, they're rejecting on behalf of the manager who delegated to them
    // Delegates can reject requests for any approval role (including HR Manager)
    const delegatedManagerId = this.getDelegatedManagerId(managerId);
    const isDelegate = delegatedManagerId !== null;

    // The actual manager ID (either the approver themselves or the manager they're delegated for)
    // This is used for tracking purposes, but decidedBy will always record who actually made the decision
    const actualManagerId = isDelegate ? delegatedManagerId! : managerId;

    // Step 5: If approval role is HR Manager, verify the approver is an HR Manager
    // If approval role is CEO, verify the approver is CEO (John Doe)
    if (approvalRole === 'HR Manager') {
      const approverSystemRole = await this.systemRoleModel
        .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
        .exec();
      const isHRManager = approverSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;

      // If not a delegate, must be HR Manager
      if (!isDelegate && !isHRManager) {
        throw new BadRequestException(
          'Only HR Managers can approve/reject department head and HR Admin leave requests.',
        );
      }
      
      // If delegate, verify the manager who delegated to them is an HR Manager
      if (isDelegate) {
        const delegatedManagerSystemRole = await this.systemRoleModel
          .findOne({ employeeProfileId: new Types.ObjectId(actualManagerId), isActive: true })
          .exec();
        const isDelegatedManagerHRManager = delegatedManagerSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
        
        // Allow if delegate is HR Manager OR if delegated by HR Manager
        if (!isHRManager && !isDelegatedManagerHRManager) {
          throw new BadRequestException(
            'Only HR Managers or delegates of HR Managers can approve/reject department head and HR Admin leave requests.',
          );
        }
      }
    } else if (approvalRole === 'CEO') {
      // Verify approver is CEO (John Doe) - HR Admin can no longer approve
      const approver = await this.employeeProfileModel.findById(managerId).exec();
      const isCEO = approver && approver.firstName === 'John' && approver.lastName === 'Doe';
      
      if (!isCEO) {
        throw new BadRequestException(
          'Only CEO (John Doe) can approve/reject HR Manager leave requests.',
        );
      }
    } else if (approvalRole === 'Manager') {
      // For regular requests, verify the approver is the direct supervisor of the employee
      // UNLESS the approver is a delegate - delegates can reject on behalf of the manager who delegated to them
      // This allows any supervisor (Department Head, Payroll Manager, HR Manager, etc.) to reject
      // as long as they are the direct supervisor (their primaryPositionId matches employee's supervisorPositionId)
      // OR they are a delegate acting on behalf of the manager
      if (!isDelegate) {
        // Only check direct supervisor relationship if user is NOT a delegate
        const employeeId = leaveRequest.employeeId.toString();
        const approverProfile = await this.employeeProfileModel.findById(managerId).exec();
        const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();
        
        if (!approverProfile || !employeeProfile) {
          throw new BadRequestException(
            'Unable to verify supervisor relationship. Please ensure both employee and approver profiles exist.',
          );
        }
        
        const approverPositionId = approverProfile.primaryPositionId;
        const employeeSupervisorPositionId = (employeeProfile as any).supervisorPositionId;
        
        if (!approverPositionId || !employeeSupervisorPositionId) {
          throw new BadRequestException(
            'Unable to verify supervisor relationship. Employee or approver may not have position assignments.',
          );
        }
        
        // Use flexible comparison to handle both ObjectId and string formats
        const approverPosIdStr = approverPositionId instanceof Types.ObjectId 
          ? approverPositionId.toString() 
          : String(approverPositionId);
        const empSupervisorPosIdStr = employeeSupervisorPositionId instanceof Types.ObjectId
          ? employeeSupervisorPositionId.toString()
          : String(employeeSupervisorPositionId);
        
        const isDirectSupervisor = approverPosIdStr === empSupervisorPosIdStr;
        
        if (!isDirectSupervisor) {
          throw new BadRequestException(
            'Only the direct supervisor can approve/reject this leave request.',
          );
        }
      }
      // If user is a delegate, skip the direct supervisor check - they can reject on behalf of the manager
    }
    
    // Prevent HR Admin from approving any requests (they can only view)
    const approverSystemRoleCheck = await this.systemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
      .exec();
    const isApproverHRAdmin = approverSystemRoleCheck?.roles?.includes(SystemRole.HR_ADMIN) || false;
    
    if (isApproverHRAdmin) {
      throw new BadRequestException(
        'HR Admin cannot approve or reject leave requests. HR Admin can only view requests.',
      );
    }

    // Step 6: Update the approval flow with the approver's decision
    // Update the existing pending approval entry instead of pushing a new one
    if (pendingApproval) {
      // Find the index of the pending approval in the array by matching role and status
      const pendingIndex = leaveRequest.approvalFlow.findIndex(
        (approval) => 
          approval.role === approvalRole && 
          (approval.status === 'PENDING' || approval.status === LeaveStatus.PENDING)
      );
      
      if (pendingIndex !== -1) {
        // Update the existing pending approval entry
        leaveRequest.approvalFlow[pendingIndex].status = LeaveStatus.REJECTED;
        leaveRequest.approvalFlow[pendingIndex].decidedBy = new Types.ObjectId(managerId);
        leaveRequest.approvalFlow[pendingIndex].decidedAt = new Date();
        // Mark the array as modified so Mongoose detects the change
        leaveRequest.markModified('approvalFlow');
      } else {
        // Fallback: if index not found, push a new entry
        leaveRequest.approvalFlow.push({
          role: approvalRole,
          status: LeaveStatus.REJECTED,
          decidedBy: new Types.ObjectId(managerId),
          decidedAt: new Date(),
        });
      }
    } else {
      // Fallback: if no pending approval found, push a new entry
      leaveRequest.approvalFlow.push({
        role: approvalRole, // Role from approval flow (HR Manager or Department Head)
        status: LeaveStatus.REJECTED,
        decidedBy: new Types.ObjectId(managerId), // The manager's ID from the logged-in user
        decidedAt: new Date(), // Timestamp of when the decision was made
      });
    }

    // Step 5: Set the leave status to REJECTED
    leaveRequest.status = LeaveStatus.REJECTED;

    // Step 6: Release pending balance
    const entitlement = await this.getLeaveEntitlement(
      leaveRequest.employeeId.toString(),
      leaveRequest.leaveTypeId.toString(),
    );
    entitlement.pending = Math.max(
      0,
      entitlement.pending - leaveRequest.durationDays,
    );
    await this.updateLeaveEntitlement(entitlement._id.toString(), {
      pending: entitlement.pending,
    });

    // Step 7: Save the updated leave request
    const updatedLeaveRequest = await leaveRequest.save();

    // REQ-030: Notify stakeholders
    await this.notifyStakeholders(updatedLeaveRequest, 'rejected');

    return updatedLeaveRequest;
  }

  //LeaveAdjustment

  async createLeaveAdjustment(
    createLeaveAdjustmentDto: any,
  ): Promise<LeaveAdjustmentDocument> {
    // Ensure employeeId (and any other id fields) are ObjectId before creation
    const doc: any = { ...createLeaveAdjustmentDto };
    if (doc.employeeId) doc.employeeId = this.toObjectId(doc.employeeId);
    if (doc.leaveTypeId) doc.leaveTypeId = this.toObjectId(doc.leaveTypeId);
    
    // Get the entitlement to apply the adjustment
    const entitlement = await this.getLeaveEntitlement(
      createLeaveAdjustmentDto.employeeId,
      createLeaveAdjustmentDto.leaveTypeId,
    );
    
    // Apply the adjustment to the entitlement based on adjustment type
    const adjustmentAmount = createLeaveAdjustmentDto.amount;
    const adjustmentType = createLeaveAdjustmentDto.adjustmentType;
    
    // Get policy for rounding rule (needed if we modify accruedActual)
    let leavePolicy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(createLeaveAdjustmentDto.leaveTypeId) })
      .exec();
    
    // Try string comparison if ObjectId lookup fails
    if (!leavePolicy) {
      const allPolicies = await this.leavePolicyModel.find({}).exec();
      leavePolicy = allPolicies.find(p => 
        p.leaveTypeId?.toString() === createLeaveAdjustmentDto.leaveTypeId || 
        p.leaveTypeId?.toString() === new Types.ObjectId(createLeaveAdjustmentDto.leaveTypeId).toString()
      ) || null;
    }
    
    const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
    
    switch (adjustmentType) {
      case 'add':
        // Add days: Increase accruedActual (which increases accruedRounded after rounding)
        // This gives the employee extra days beyond normal accrual
        entitlement.accruedActual += adjustmentAmount;
        entitlement.accruedRounded = this.applyRoundingRule(
          entitlement.accruedActual,
          roundingRule,
        );
        // Recalculate remaining (will increase because accruedRounded increased)
        entitlement.remaining = this.calculateRemaining(entitlement);
        break;
      case 'deduct':
        // Deduct days: Decrease both accruedActual and accruedRounded
        // This manually removes days from the employee's balance
        // We must decrease accruedActual too, otherwise getLeaveEntitlement will recalculate accruedRounded from accruedActual and overwrite our deduction
        entitlement.accruedActual = Math.max(0, entitlement.accruedActual - adjustmentAmount);
        entitlement.accruedRounded = this.applyRoundingRule(
          entitlement.accruedActual,
          roundingRule,
        );
        // Recalculate remaining (will decrease because accruedRounded decreased)
        entitlement.remaining = this.calculateRemaining(entitlement);
        break;
      case 'encashment':
        // Encashment: Employee gets paid for unused leave
        // Deduct from remaining and count as taken for reporting/audit
        const currentRemaining = entitlement.remaining;
        entitlement.remaining = Math.max(0, currentRemaining - adjustmentAmount);
        entitlement.taken += adjustmentAmount; // Count as taken for reporting
        break;
      default:
        throw new Error(`Invalid adjustment type: ${adjustmentType}`);
    }
    
    // Save the updated entitlement
    await entitlement.save();
    
    // Create the adjustment record for audit trail
    const newLeaveAdjustment = new this.leaveAdjustmentModel(doc);
    return await newLeaveAdjustment.save();
  }

  async getLeaveAdjustments(
    employeeId: string,
  ): Promise<LeaveAdjustmentDocument[]> {
    // FIXED: Convert employeeId string to ObjectId for proper database query
    const employeeObjectId = this.toObjectId(employeeId) as Types.ObjectId;
    return await this.leaveAdjustmentModel
      .find({ employeeId: employeeObjectId })
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('leaveTypeId', 'name code')
      .populate('hrUserId', 'employeeId firstName lastName')
      .sort({ createdAt: -1 }) // Most recent first
      .exec();
  }

  async deleteLeaveAdjustment(id: string): Promise<LeaveAdjustmentDocument> {
    const leaveAdjustment = await this.leaveAdjustmentModel
      .findByIdAndDelete(id)
      .exec();
    if (!leaveAdjustment) {
      throw new Error(`leaveAdjustment with ID ${id} not found`);
    }
    return leaveAdjustment as LeaveAdjustmentDocument;
  }
  //LeaveEntitlement

  async createLeaveEntitlement(
    createLeaveEntitlementDto: CreateLeaveEntitlementDto,
  ): Promise<LeaveEntitlementDocument> {
    // Ensure ids are ObjectId when creating entitlement
    const doc: any = { ...createLeaveEntitlementDto };
    doc.employeeId = this.toObjectId(
      createLeaveEntitlementDto.employeeId,
    ) as Types.ObjectId;
    doc.leaveTypeId = this.toObjectId(
      createLeaveEntitlementDto.leaveTypeId,
    ) as Types.ObjectId;
    
    // Get the leave policy to determine rounding rule
    let leavePolicy = await this.leavePolicyModel
      .findOne({ leaveTypeId: doc.leaveTypeId })
      .exec();
    
    // If not found, try as string comparison
    if (!leavePolicy) {
      leavePolicy = await this.leavePolicyModel
        .findOne({ leaveTypeId: createLeaveEntitlementDto.leaveTypeId })
        .exec();
    }
    
    // If still not found, try to find by string comparison as fallback
    if (!leavePolicy) {
      const allPolicies = await this.leavePolicyModel.find({}).exec();
      const matchingPolicy = allPolicies.find(p => 
        p.leaveTypeId?.toString() === doc.leaveTypeId?.toString() || 
        p.leaveTypeId?.toString() === createLeaveEntitlementDto.leaveTypeId ||
        (p.leaveTypeId instanceof Types.ObjectId && p.leaveTypeId.equals(doc.leaveTypeId))
      );
      if (matchingPolicy) {
        leavePolicy = matchingPolicy;
      }
    }
    
    const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
    console.log(`[createLeaveEntitlement] Policy lookup:`, {
      leaveTypeId: doc.leaveTypeId?.toString(),
      policyFound: !!leavePolicy,
      roundingRule: roundingRule,
      accruedActual: doc.accruedActual
    });
    
    // ALWAYS recalculate accruedRounded from accruedActual based on rounding rule
    // This ensures rounding is applied correctly when creating entitlements
    if (doc.accruedActual !== undefined && doc.accruedActual !== null && doc.accruedActual !== 0) {
      const originalAccruedRounded = doc.accruedRounded;
      doc.accruedRounded = this.applyRoundingRule(
        doc.accruedActual,
        roundingRule,
      );
      console.log(`[createLeaveEntitlement] ✅ Applied rounding: ${doc.accruedActual} -> ${doc.accruedRounded} (rule: ${roundingRule}, employeeId: ${doc.employeeId?.toString()})`);
      
      if (originalAccruedRounded !== undefined && originalAccruedRounded !== doc.accruedRounded) {
        console.log(`[createLeaveEntitlement] ⚠️ Overrode frontend accruedRounded value: ${originalAccruedRounded} -> ${doc.accruedRounded}`);
      }
    } else {
      // If accruedActual is not provided or is 0, default to 0
      if (doc.accruedActual === undefined || doc.accruedActual === null) {
        doc.accruedActual = 0;
      }
      doc.accruedRounded = this.applyRoundingRule(doc.accruedActual, roundingRule);
      console.log(`[createLeaveEntitlement] Set accruedActual: ${doc.accruedActual}, accruedRounded: ${doc.accruedRounded} (employeeId: ${doc.employeeId?.toString()})`);
    }
    
    const newLeaveEntitlement = new this.leaveEntitlementModel(doc);
    const saved = await newLeaveEntitlement.save();
    
    // Recalculate remaining to ensure it's correct
    saved.remaining = this.calculateRemaining(saved);
    await saved.save();
    
    console.log(`[createLeaveEntitlement] ✅ Saved entitlement:`, {
      employeeId: saved.employeeId?.toString(),
      leaveTypeId: saved.leaveTypeId?.toString(),
      accruedActual: saved.accruedActual,
      accruedRounded: saved.accruedRounded,
      remaining: saved.remaining
    });
    
    return saved;
  }

  async getLeaveEntitlement(
    employeeId: string,
    leaveTypeId: string,
  ): Promise<LeaveEntitlementDocument> {
    const leaveEntitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: new Types.ObjectId(leaveTypeId),
      })
      .exec();

    if (!leaveEntitlement) {
      // Fetch employee and leave type names for user-friendly error message
      let employeeName = 'the employee';
      let leaveTypeName = 'this leave type';
      
      try {
        const employee = await this.employeeProfileModel.findById(employeeId).exec();
        if (employee) {
          employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim() || employee.employeeNumber || 'the employee';
        }
      } catch (err) {
        // Ignore errors fetching employee name
      }
      
      try {
        const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
        if (leaveType) {
          leaveTypeName = leaveType.name || 'this leave type';
        }
      } catch (err) {
        // Ignore errors fetching leave type name
      }
      
      throw new NotFoundException(
        `Leave entitlement not found for ${employeeName} with leave type "${leaveTypeName}". ` +
        `Please contact HR to create a leave entitlement before submitting leave requests.`
      );
    }

    // ALWAYS recalculate accruedRounded based on accruedActual and policy rounding rule
    // This ensures rounding is always applied correctly, even if data was created before the fix
    // Try multiple lookup strategies in case leaveTypeId is stored differently
    let leavePolicy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
      .exec();
    
    // If not found, try as string comparison
    if (!leavePolicy) {
      leavePolicy = await this.leavePolicyModel
        .findOne({ leaveTypeId: leaveTypeId })
        .exec();
    }
    
    // If not found, try to find by string comparison as fallback
    if (!leavePolicy) {
      const allPolicies = await this.leavePolicyModel.find({}).exec();
      const matchingPolicy = allPolicies.find(p => 
        p.leaveTypeId?.toString() === leaveTypeId || 
        p.leaveTypeId?.toString() === new Types.ObjectId(leaveTypeId).toString()
      );
      if (matchingPolicy) {
        leavePolicy = matchingPolicy;
      }
    }
    
    const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
    const expectedRounded = this.applyRoundingRule(
      leaveEntitlement.accruedActual,
      roundingRule,
    );

    // Always recalculate and save to ensure consistency
    // Use Math.abs to handle floating point precision issues
    const needsUpdate = Math.abs(leaveEntitlement.accruedRounded - expectedRounded) > 0.001;
    if (needsUpdate) {
      console.log(`[getLeaveEntitlement] Recalculating rounding: ${leaveEntitlement.accruedRounded} -> ${expectedRounded} (accruedActual: ${leaveEntitlement.accruedActual}, rule: ${roundingRule})`);
      leaveEntitlement.accruedRounded = expectedRounded;
      leaveEntitlement.remaining = this.calculateRemaining(leaveEntitlement);
      await leaveEntitlement.save();
    }

    return leaveEntitlement;
  }

  async updateLeaveEntitlement(
    id: string,
    updateLeaveEntitlementDto: UpdateLeaveEntitlementDto,
  ): Promise<LeaveEntitlementDocument> {
    let leaveEntitlement = await this.leaveEntitlementModel.findById(id).exec();

    if (!leaveEntitlement) {
      throw new Error(`Leave entitlement with ID ${id} not found`);
    }

    // ALWAYS recalculate accruedRounded from accruedActual based on rounding rule
    // This ensures rounding is always correct, even if frontend sends wrong values
    const accruedActualToUse = updateLeaveEntitlementDto.accruedActual !== undefined 
      ? updateLeaveEntitlementDto.accruedActual 
      : leaveEntitlement.accruedActual;
    
    // Get policy for rounding rule
    let leavePolicy = await this.leavePolicyModel
      .findOne({ leaveTypeId: leaveEntitlement.leaveTypeId })
      .exec();
    
    // If not found, try as string comparison
    if (!leavePolicy) {
      leavePolicy = await this.leavePolicyModel
        .findOne({ leaveTypeId: leaveEntitlement.leaveTypeId.toString() })
        .exec();
    }
    
    const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
    
    // ALWAYS recalculate accruedRounded from accruedActual (override any frontend value)
    const newAccruedRounded = this.applyRoundingRule(
      accruedActualToUse,
      roundingRule,
    );
    
    console.log(`[updateLeaveEntitlement] Applied rounding: ${accruedActualToUse} -> ${newAccruedRounded} (rule: ${roundingRule}, entitlementId: ${id})`);
    updateLeaveEntitlementDto.accruedRounded = newAccruedRounded;

    // Apply the update
    leaveEntitlement = await this.leaveEntitlementModel
      .findByIdAndUpdate(id.toString(), updateLeaveEntitlementDto, {
        new: true,
      })
      .exec();

    // Recalculate remaining if accruedActual or accruedRounded was updated
    if (
      updateLeaveEntitlementDto.accruedActual !== undefined ||
      updateLeaveEntitlementDto.accruedRounded !== undefined
    ) {
      leaveEntitlement.remaining = this.calculateRemaining(leaveEntitlement);
      await leaveEntitlement.save();
    }

    return leaveEntitlement as LeaveEntitlementDocument;
  }

  // Helper: Calculate months worked
  private calculateMonthsWorked(hireDate: Date, currentDate: Date): number {
    const years = currentDate.getFullYear() - hireDate.getFullYear();
    const months = currentDate.getMonth() - hireDate.getMonth();
    return (
      years * 12 +
      months +
      (currentDate.getDate() >= hireDate.getDate() ? 0 : -1)
    );
  }

  // Helper: Apply rounding rule
  private applyRoundingRule(
    amount: number,
    roundingRule: RoundingRule,
  ): number {
    switch (roundingRule) {
      case RoundingRule.NONE:
        return amount;
      case RoundingRule.ROUND:
        return Math.round(amount);
      case RoundingRule.ROUND_UP:
        return Math.ceil(amount);
      case RoundingRule.ROUND_DOWN:
        return Math.floor(amount);
      default:
        return amount;
    }
  }

  // Helper: Calculate remaining balance consistently
  // Formula: remaining = accruedRounded + carryForward - taken - pending
  private calculateRemaining(entitlement: LeaveEntitlementDocument): number {
    // Business Rule: Employee balance must be accrued monthly/quarterly/yearly
    // Employees earn leave over time, not upfront
    // Remaining = What they've accrued (accruedRounded) + carryForward - taken - pending
    // yearlyEntitlement is just the target/total they should accrue to by year-end
    return (
      entitlement.accruedRounded +
      entitlement.carryForward -
      entitlement.taken -
      entitlement.pending
    );
  }

  // Helper: Normalize ID to handle both ObjectId and string formats
  // Returns both ObjectId and string versions for flexible querying
  private normalizeId(id: any): { objectId: Types.ObjectId | null; string: string | null } {
    if (!id) {
      return { objectId: null, string: null };
    }
    
    if (id instanceof Types.ObjectId) {
      return { objectId: id, string: id.toString() };
    }
    
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return { objectId: new Types.ObjectId(id), string: id };
    }
    
    // If it's a string but not a valid ObjectId, return as string
    return { objectId: null, string: String(id) };
  }

  // Helper: Create query that handles both ObjectId and string formats for position/department IDs
  private createFlexibleIdQuery(fieldName: string, value: any): any {
    const normalized = this.normalizeId(value);
    
    if (!normalized.objectId && !normalized.string) {
      return null; // Invalid value
    }
    
    // Use $in to match both ObjectId and string formats
    const queryValues: any[] = [];
    if (normalized.objectId) {
      queryValues.push(normalized.objectId);
    }
    if (normalized.string) {
      queryValues.push(normalized.string);
    }
    
    return queryValues.length > 0 ? { [fieldName]: { $in: queryValues } } : null;
  }

  //next method
  async assignPersonalizedEntitlement(
    employeeId: string,
    leaveTypeId: string,
    personalizedEntitlement: number,
  ): Promise<LeaveEntitlementDocument> {
    // getLeaveEntitlement will throw NotFoundException with user-friendly message if not found
    const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);

    // Add personalized entitlement to accruedActual
    // This gives the employee extra days beyond their normal policy
    const updated = await this.leaveEntitlementModel
      .findByIdAndUpdate(
        entitlement._id,
        {
          $inc: {
            accruedActual: personalizedEntitlement,
          },
        },
        { new: true },
      )
      .exec();
    
    if (!updated) {
      throw new Error(`Leave entitlement with ID ${entitlement._id} not found`);
    }

    // Recalculate accruedRounded from the new accruedActual (with rounding)
    const leavePolicy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
      .exec();
    
    // Try string comparison if ObjectId lookup fails
    if (!leavePolicy) {
      const allPolicies = await this.leavePolicyModel.find({}).exec();
      const matchingPolicy = allPolicies.find(p => 
        p.leaveTypeId?.toString() === leaveTypeId || 
        p.leaveTypeId?.toString() === new Types.ObjectId(leaveTypeId).toString()
      );
      if (matchingPolicy) {
        const roundingRule = matchingPolicy.roundingRule || RoundingRule.NONE;
        updated.accruedRounded = this.applyRoundingRule(
          updated.accruedActual,
          roundingRule,
        );
      }
    } else {
      const roundingRule = leavePolicy.roundingRule || RoundingRule.NONE;
      updated.accruedRounded = this.applyRoundingRule(
        updated.accruedActual,
        roundingRule,
      );
    }

    // Recalculate remaining using the helper method (not direct increment)
    updated.remaining = this.calculateRemaining(updated);
    await updated.save();

    return updated as LeaveEntitlementDocument;
  }

  // Test function: Reset all leave balances to zero immediately (for testing)
  async resetAllLeaveBalancesForTest(): Promise<any> {
    console.log('[resetAllLeaveBalancesForTest] Starting bulk reset...');
    const startTime = Date.now();
    
    try {
      // Use bulk update for better performance
      const result = await this.leaveEntitlementModel.updateMany(
        {}, // Match all documents
        {
          $set: {
            accruedActual: 0,
            accruedRounded: 0,
            carryForward: 0,
            remaining: 0,
            taken: 0,
            pending: 0,
            lastAccrualDate: new Date(),
          },
        }
      ).exec();

      const duration = Date.now() - startTime;
      console.log(`[resetAllLeaveBalancesForTest] Completed in ${duration}ms. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

      return {
        total: result.matchedCount,
        reset: result.modifiedCount,
        errors: 0,
        duration: `${duration}ms`,
      };
    } catch (error: any) {
      console.error('[resetAllLeaveBalancesForTest] Error:', error);
      throw new Error(`Failed to reset leave balances: ${error.message}`);
    }
  }

  // Business Rule: Reset leave balances based on criterion date (Hire date, First Vacation Date, etc.)
  async resetLeaveBalancesForNewYear(
    criterion:
      | 'HIRE_DATE'
      | 'FIRST_VACATION_DATE'
      | 'REVISED_HIRE_DATE'
      | 'WORK_RECEIVING_DATE' = 'HIRE_DATE',
    force: boolean = false,
  ): Promise<void> {
    const leaveEntitlements: LeaveEntitlementDocument[] =
      await this.leaveEntitlementModel.find({}).exec();

    if (leaveEntitlements.length === 0) {
      return;
    }

    // OPTIMIZATION: Fetch all employees and policies upfront to avoid N+1 queries
    const employeeIds = [...new Set(leaveEntitlements.map(e => e.employeeId.toString()))];
    const leaveTypeIds = [...new Set(leaveEntitlements.map(e => e.leaveTypeId.toString()))];

    // Fetch all employees in one query
    const employees = await this.employeeProfileModel
      .find({ _id: { $in: employeeIds.map(id => new Types.ObjectId(id)) } })
      .exec();
    const employeeMap = new Map(
      employees.map(emp => [emp._id.toString(), emp])
    );

    // Fetch all policies in one query
    const policies = await this.leavePolicyModel
      .find({ leaveTypeId: { $in: leaveTypeIds.map(id => new Types.ObjectId(id)) } })
      .exec();
    const policyMap = new Map(
      policies.map(policy => [policy.leaveTypeId.toString(), policy])
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process entitlements and collect updates
    const updates: Array<{
      entitlement: LeaveEntitlementDocument;
      updateData: UpdateLeaveEntitlementDto;
      policy: any;
    }> = [];

    for (const entitlement of leaveEntitlements) {
      try {
        // Check if employee exists (using pre-fetched map)
        const employee = employeeMap.get(entitlement.employeeId.toString());
        
        if (!employee) {
          console.warn(
            `Skipping entitlement ${entitlement._id}: Employee ${entitlement.employeeId} not found (orphaned entitlement)`,
          );
          continue; // Skip this entitlement and continue with the next one
        }

        // Calculate reset date based on criterion
        const resetDate = await this.calculateResetDate(
          entitlement.employeeId.toString(),
          criterion,
          entitlement.leaveTypeId.toString(),
        );

        const resetDateOnly = new Date(resetDate);
        resetDateOnly.setHours(0, 0, 0, 0);

        // Check if the current anniversary date has passed
        // calculateResetDate returns the NEXT anniversary, so we need to check if
        // the CURRENT anniversary (one year before) has passed
        const currentAnniversary = new Date(resetDate);
        currentAnniversary.setFullYear(currentAnniversary.getFullYear() - 1);
        currentAnniversary.setHours(0, 0, 0, 0);

        // Check if current anniversary has passed, or if force is true
        if (force || currentAnniversary <= today) {
          // Get policy from pre-fetched map
          const leavePolicy = policyMap.get(entitlement.leaveTypeId.toString());

          // Calculate carry forward amount before resetting
          let carryForwardAmount = 0;
          if (
            leavePolicy?.carryForwardAllowed &&
            entitlement.carryForward > 0
          ) {
            carryForwardAmount = entitlement.carryForward;
          }

          // Calculate next reset date
          // resetDate from calculateResetDate is already the NEXT anniversary, so use it directly
          const nextReset = new Date(resetDate);

          // Reset all accrual-related fields
          // Business Rule: Employees accrue leave monthly/quarterly/yearly, not upfront
          // After reset: accruedActual = 0, accruedRounded = 0 (they start fresh)
          // remaining = carryForward (if allowed) + 0 (no accruals yet) - 0 (taken) - 0 (pending)
          // They will accrue throughout the year via monthly/quarterly/yearly accruals
          const newRemaining = carryForwardAmount;

          // Apply rounding rule (since accruedActual is 0, accruedRounded will be 0)
          const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
          const accruedRounded = this.applyRoundingRule(0, roundingRule);

          updates.push({
            entitlement,
            updateData: {
              accruedActual: 0,
              accruedRounded: accruedRounded,
              carryForward: carryForwardAmount, // Keep carry-forward if allowed, otherwise 0
              remaining: newRemaining, // Start with carry-forward only, accruals will add to this
              taken: 0, // Reset taken
              pending: 0, // Reset pending
              lastAccrualDate: new Date(),
              nextResetDate: nextReset,
            },
            policy: leavePolicy,
          });
        }
      } catch (error) {
        console.error(
          `Error resetting balance for entitlement ${entitlement._id}:`,
          error,
        );
        // Continue with next entitlement
      }
    }

    // OPTIMIZATION: Use bulkWrite for faster updates
    if (updates.length > 0) {
      const bulkOps = updates.map(({ entitlement, updateData }) => ({
        updateOne: {
          filter: { _id: entitlement._id },
          update: {
            $set: {
              accruedActual: updateData.accruedActual,
              accruedRounded: updateData.accruedRounded,
              carryForward: updateData.carryForward,
              remaining: updateData.remaining,
              taken: updateData.taken,
              pending: updateData.pending,
              lastAccrualDate: updateData.lastAccrualDate,
              nextResetDate: updateData.nextResetDate,
            },
          },
        },
      }));

      await this.leaveEntitlementModel.bulkWrite(bulkOps);

      // Log rounding applications (for debugging)
      updates.forEach(({ entitlement, policy }) => {
        const roundingRule = policy?.roundingRule || RoundingRule.NONE;
        console.log(
          `[updateLeaveEntitlement] Applied rounding: 0 -> 0 (rule: ${roundingRule}, entitlementId: ${entitlement._id})`,
        );
      });
    }
  }

  // Function to add all employees to leave entitlements and set as full-time
  async addAllEmployeesToLeaveEntitlements(): Promise<any> {
    console.log('[addAllEmployeesToLeaveEntitlements] Starting...');
    const startTime = Date.now();
    
    try {
      // Get all employees (including inactive ones to ensure we process everyone)
      const employees = await this.employeeProfileModel.find({}).exec();
      console.log(`[addAllEmployeesToLeaveEntitlements] Found ${employees.length} employees`);
      
      // Log contract type distribution
      const contractTypeCounts: Record<string, number> = {};
      employees.forEach(emp => {
        const ct = emp.contractType || 'NOT_SET';
        contractTypeCounts[ct] = (contractTypeCounts[ct] || 0) + 1;
      });
      console.log(`[addAllEmployeesToLeaveEntitlements] Contract type distribution:`, contractTypeCounts);
      
      // Get all leave types
      const leaveTypes = await this.leaveTypeModel.find({}).exec();
      console.log(`[addAllEmployeesToLeaveEntitlements] Found ${leaveTypes.length} leave types`);
      
      if (leaveTypes.length === 0) {
        throw new Error('No leave types found. Please create leave types first.');
      }
      
      let employeesUpdated = 0;
      let employeesProcessed = 0;
      let employeesFailed = 0;
      let entitlementsCreated = 0;
      let entitlementsSkipped = 0;
      const failedEmployees: Array<{ employeeId: string; error: string }> = [];
      
      for (const employee of employees) {
        try {
          const employeeId = employee._id.toString();
          const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employeeId;
          
          console.log(`[addAllEmployeesToLeaveEntitlements] Processing employee ${employeeName} (${employeeId})`);
          
          // Update contract type to FULL_TIME_CONTRACT if not set
          if (!employee.contractType || employee.contractType !== ContractType.FULL_TIME_CONTRACT) {
            await this.employeeProfileModel.findByIdAndUpdate(
              employee._id,
              { $set: { contractType: ContractType.FULL_TIME_CONTRACT } }
            ).exec();
            employeesUpdated++;
            console.log(`[addAllEmployeesToLeaveEntitlements] Updated contract type for ${employeeName}`);
          }
          
          // Create entitlements for each leave type
          let employeeEntitlementsCreated = 0;
          let employeeEntitlementsSkipped = 0;
          
          for (const leaveType of leaveTypes) {
            try {
              // Check if entitlement already exists
              const existingEntitlement = await this.leaveEntitlementModel
                .findOne({
                  employeeId: employee._id,
                  leaveTypeId: leaveType._id,
                })
                .exec();
              
              if (existingEntitlement) {
                entitlementsSkipped++;
                employeeEntitlementsSkipped++;
                continue;
              }
              
              // Create new entitlement with default values
              await this.createLeaveEntitlement({
                employeeId: employeeId,
                leaveTypeId: leaveType._id.toString(),
                yearlyEntitlement: 0,
                accruedActual: 0,
                accruedRounded: 0,
                carryForward: 0,
                taken: 0,
                pending: 0,
                remaining: 0,
              });
              
              entitlementsCreated++;
              employeeEntitlementsCreated++;
            } catch (leaveTypeError: any) {
              console.error(`[addAllEmployeesToLeaveEntitlements] Error creating entitlement for ${employeeName} and leave type ${leaveType.name}:`, leaveTypeError.message);
              // Continue with next leave type
            }
          }
          
          employeesProcessed++;
          console.log(`[addAllEmployeesToLeaveEntitlements] ✅ Completed ${employeeName}: Created ${employeeEntitlementsCreated} entitlements, skipped ${employeeEntitlementsSkipped}`);
        } catch (error: any) {
          employeesFailed++;
          const employeeId = employee._id?.toString() || 'unknown';
          const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employeeId;
          const errorMessage = error.message || String(error);
          console.error(`[addAllEmployeesToLeaveEntitlements] ❌ Error processing employee ${employeeName} (${employeeId}):`, errorMessage);
          console.error(`[addAllEmployeesToLeaveEntitlements] Error stack:`, error.stack);
          failedEmployees.push({ employeeId, error: errorMessage });
          // Continue with next employee
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[addAllEmployeesToLeaveEntitlements] Completed in ${duration}ms`);
      console.log(`[addAllEmployeesToLeaveEntitlements] Summary: ${employeesProcessed} processed, ${employeesFailed} failed, ${entitlementsCreated} entitlements created`);
      
      return {
        totalEmployees: employees.length,
        employeesProcessed,
        employeesFailed,
        employeesUpdated,
        totalLeaveTypes: leaveTypes.length,
        entitlementsCreated,
        entitlementsSkipped,
        failedEmployees: failedEmployees.length > 0 ? failedEmployees : undefined,
        duration: `${duration}ms`,
      };
    } catch (error: any) {
      console.error('[addAllEmployeesToLeaveEntitlements] Error:', error);
      throw new Error(`Failed to add employees to leave entitlements: ${error.message}`);
    }
  }

  //leave type

  async getLeaveTypes(): Promise<LeaveTypeDocument[]> {
    return await this.leaveTypeModel.find().exec();
  }

  async getLeaveTypeById(id: string): Promise<LeaveTypeDocument> {
    const leaveType = await this.leaveTypeModel.findById(id).exec();
    if (!leaveType) {
      throw new NotFoundException(`LeaveType with ID ${id} not found`);
    }
    return leaveType;
  }

  async createLeaveType(
    createLeaveTypeDto: CreateLeaveTypeDto,
  ): Promise<LeaveTypeDocument> {
    const { code, name } = createLeaveTypeDto;
    // Check if the leave type is a special leave type based on the `code` or `name`
    if (code === 'BEREAVEMENT_LEAVE' || code === 'JURY_DUTY') {
      // Add specific logic for special leave types hanshoof baa b3dein ayzeen n3mel eh
      console.log(`Creating special leave type: ${name}`);
    }
    const newLeaveType = new this.leaveTypeModel(createLeaveTypeDto);
    return await newLeaveType.save();
  }

  async updateLeaveType(
    id: string,
    updateLeaveTypeDto: UpdateLeaveTypeDto,
  ): Promise<LeaveTypeDocument> {
    const updatedLeaveType = await this.leaveTypeModel
      .findByIdAndUpdate(id, updateLeaveTypeDto, { new: true })
      .exec();
    if (!updatedLeaveType) {
      throw new NotFoundException(`LeaveType with ID ${id} not found`);
    }

    return updatedLeaveType;
  }

  async deleteLeaveType(id: string): Promise<LeaveTypeDocument> {
    const leaveType = await this.leaveTypeModel.findById(id).exec();
    if (!leaveType) {
      throw new NotFoundException(`LeaveType with ID ${id} not found`);
    }
    return await this.leaveTypeModel.findByIdAndDelete(id).exec() as LeaveTypeDocument;
  }
  // REQ-013: Get pending requests for manager review
  // async getPendingRequestsForManager(managerId: string): Promise<LeaveRequestDocument[]> {
  //   try {
  //     const managerProfile = await this.employeeProfileModel
  //       .findById(new Types.ObjectId(managerId))
  //       .populate('primaryPositionId')
  //       .exec();

  //     if (!managerProfile || !managerProfile.primaryPositionId) {
  //       return [];
  //     }

  //     const managerPositionId = (managerProfile.primaryPositionId as any)._id;

  //     // Find all positions that report to this manager
  //     const reportingPositions = await this.positionModel
  //       .find({ reportsToPositionId: managerPositionId, isActive: true })
  //       .exec();

  //     const reportingPositionIds = reportingPositions.map(p => p._id);

  //     // Find all employees currently assigned to these positions
  //     const assignments = await this.positionAssignmentModel
  //       .find({
  //         positionId: { $in: reportingPositionIds },
  //         $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
  //       })
  //       .exec();

  //     const employeeIds = assignments.map(a => a.employeeProfileId);

  //     // Get pending requests for team members
  //     const pendingRequests = await this.leaveRequestModel
  //       .find({
  //         employeeId: { $in: employeeIds },
  //         status: LeaveStatus.PENDING,
  //       })
  //       .populate('leaveTypeId')
  //       .populate('employeeId', 'firstName lastName employeeNumber')
  //       .exec();

  //     return pendingRequests;
  //   } catch (error) {
  //     throw new Error(`Failed to get pending requests for manager: ${(error as any).message}`);
  //   }
  // }

  // Phase 2: REQ-023 - Get delegated managers for a manager
  private async getDelegatedManagers(
    managerId: string,
  ): Promise<Types.ObjectId[]> {
    // This would typically query a delegation table
    // For now, return empty array - can be enhanced with actual delegation logic
    // Example: return await delegationModel.find({ delegatorId: managerId, isActive: true }).select('delegateId').exec();
    return [];
  }

  // Phase 2: REQ-023 - Delegate approval authority to another manager
  async delegateApprovalAuthority(
    managerId: string,
    delegateId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ message: string; delegation: any }> {
    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date for delegation period. Please select a valid date range.');
    }

    const now = new Date();
    if (endDate < now) {
      throw new BadRequestException('End date must be in the future. Please select a future date for the delegation period.');
    }

    // Validate that delegateId is a valid employee
    const delegate = await this.employeeProfileModel
      .findById(delegateId)
      .exec();
    if (!delegate) {
      throw new NotFoundException(`Employee with ID '${delegateId}' not found. Please verify the employee ID and try again.`);
    }

    // Validate that managerId is a valid employee
    const manager = await this.employeeProfileModel.findById(managerId).exec();
    if (!manager) {
      throw new NotFoundException(`Manager with ID '${managerId}' not found. Please verify the manager ID and try again.`);
    }

    // Check if delegate is the same as manager
    if (managerId === delegateId) {
      throw new BadRequestException('You cannot delegate approval authority to yourself. Please select a different employee to delegate to.');
    }

    // Check if manager is a department head and has their own pending leave requests
    // Note: HR Managers can now delegate even with pending requests (removed restriction)
    const managerSystemRole = await this.systemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(managerId), isActive: true })
      .exec();
    const isDepartmentHead = managerSystemRole?.roles?.includes(SystemRole.DEPARTMENT_HEAD) || false;

    if (isDepartmentHead) {
      // Check if department head has any pending leave requests
      const pendingRequests = await this.leaveRequestModel
        .find({
          employeeId: new Types.ObjectId(managerId),
          status: LeaveStatus.PENDING,
        })
        .exec();

      if (pendingRequests.length > 0) {
        throw new BadRequestException(
          'Department heads cannot delegate approval authority while they have pending leave requests. Please resolve your pending requests first or wait for them to be processed.',
        );
      }
    }
    // HR Managers can now delegate even with pending requests (restriction removed)

    // Get or create delegation array for this manager
    if (!this.delegationMap.has(managerId)) {
      this.delegationMap.set(managerId, []);
    }

    const delegations = this.delegationMap.get(managerId)!;

    // Check for overlapping delegations to the same delegate
    const hasOverlap = delegations.some(
      (del) =>
        del.delegateId === delegateId &&
        del.isActive &&
        ((startDate >= del.startDate && startDate <= del.endDate) ||
          (endDate >= del.startDate && endDate <= del.endDate) ||
          (startDate <= del.startDate && endDate >= del.endDate)),
    );

    if (hasOverlap) {
      throw new BadRequestException(
        'An active delegation already exists for this delegate in the specified date range.',
      );
    }

    // Add new delegation
    const newDelegation = {
      delegateId,
      startDate,
      endDate,
      isActive: true,
    };

    delegations.push(newDelegation);

    return {
      message: `Delegation created successfully. Employee ${delegateId} can approve leave requests on behalf of manager ${managerId} from ${startDate.toISOString()} to ${endDate.toISOString()}.`,
      delegation: newDelegation,
    };
  }

  // Get all delegations for a manager
  async getDelegations(managerId: string): Promise<any[]> {
    const delegations = this.delegationMap.get(managerId) || [];
    
    // Populate delegate information
    const populatedDelegations = await Promise.all(
      delegations.map(async (del) => {
        const delegate = await this.employeeProfileModel.findById(del.delegateId).exec();
        const delegateData = delegate ? delegate.toObject() : null;
        return {
          ...del,
          delegateName: delegateData ? `${delegateData.firstName} ${delegateData.lastName}` : 'Unknown',
          delegateEmployeeId: (delegateData as any)?.employeeId || del.delegateId,
        };
      })
    );
    
    return populatedDelegations;
  }

  // Revoke a delegation
  async revokeDelegation(managerId: string, delegateId: string, startDate: Date, endDate: Date): Promise<{ message: string }> {
    const delegations = this.delegationMap.get(managerId);
    if (!delegations || delegations.length === 0) {
      throw new NotFoundException('No delegations found for this manager.');
    }

    // Find and deactivate the matching delegation
    const delegationIndex = delegations.findIndex(
      (del) =>
        del.delegateId === delegateId &&
        del.startDate.getTime() === startDate.getTime() &&
        del.endDate.getTime() === endDate.getTime() &&
        del.isActive
    );

    if (delegationIndex === -1) {
      throw new NotFoundException('Delegation not found or already revoked.');
    }

    delegations[delegationIndex].isActive = false;

    return {
      message: `Delegation revoked successfully. Employee ${delegateId} can no longer approve leave requests on behalf of manager ${managerId}.`,
    };
  }

  // Helper method to check if an employee is a delegated approver for a manager
  private isDelegatedApprover(employeeId: string, managerId: string): boolean {
    const delegations = this.delegationMap.get(managerId);
    if (!delegations || delegations.length === 0) {
      return false;
    }

    const now = new Date();
    return delegations.some(
      (del) =>
        del.delegateId === employeeId &&
        del.isActive &&
        now >= del.startDate &&
        now <= del.endDate,
    );
  }

  // Helper method to get the manager ID if employee is a delegate, or return null
  private getDelegatedManagerId(employeeId: string): string | null {
    // Normalize employeeId to string for consistent comparison
    const normalizedEmployeeId = employeeId?.toString();
    
    for (const [managerId, delegations] of this.delegationMap.entries()) {
      const now = new Date();
      const isActiveDelegate = delegations.some(
        (del) => {
          // Normalize delegateId to string for comparison
          const normalizedDelegateId = del.delegateId?.toString();
          return (
            normalizedDelegateId === normalizedEmployeeId &&
            del.isActive &&
            now >= del.startDate &&
            now <= del.endDate
          );
        },
      );
      if (isActiveDelegate) {
        return managerId;
      }
    }
    return null;
  }

  // Phase 2: REQ-025, REQ-029 - HR Manager finalize approved leave request
  async finalizeLeaveRequest(
    leaveRequestId: string,
    hrUserId: string,
  ): Promise<LeaveRequestDocument> {
    const leaveRequestObjectId = new Types.ObjectId(leaveRequestId);

    // Step 1: Fetch the leave request by ID
    const leaveRequest = await this.leaveRequestModel
      .findById(leaveRequestObjectId)
      .exec();

    // Step 2: If leave request doesn't exist, throw NotFoundException
    if (!leaveRequest) {
      throw new NotFoundException(
        `Leave request with ID ${leaveRequestObjectId} not found`,
      );
    }

    // Step 3: Check if leave request is approved and ready for finalization
    // For regular requests: must be approved by Department Head
    // For department head requests: must be approved by HR Manager
    // For HR Manager requests: must be approved by CEO
    if (leaveRequest.status !== LeaveStatus.APPROVED) {
      const initialApproval = leaveRequest.approvalFlow[0];
      const isHRManagerRequest = initialApproval?.role === 'CEO';
      const isDepartmentHeadRequest = initialApproval?.role === 'HR Manager';
      
      let errorMessage = `Leave request must be APPROVED before finalization. Current status: ${leaveRequest.status}`;
      if (isHRManagerRequest) {
        errorMessage = `Leave request must be APPROVED by CEO before finalization. Current status: ${leaveRequest.status}`;
      } else if (isDepartmentHeadRequest) {
        errorMessage = `Leave request must be APPROVED by HR Manager before finalization. Current status: ${leaveRequest.status}`;
      } else {
        errorMessage = `Leave request must be APPROVED by Department Head before HR finalization. Current status: ${leaveRequest.status}`;
      }
      
      throw new BadRequestException(errorMessage);
    }

    // Check if already finalized by HR Manager
    const alreadyFinalized = leaveRequest.approvalFlow.some(
      (approval) =>
        approval.role === 'HR Manager' &&
        approval.status === LeaveStatus.APPROVED,
    );

    if (alreadyFinalized) {
      throw new BadRequestException(
        'Leave request has already been finalized by HR Manager.',
      );
    }

    // Check if this is a department head request (approval flow starts with HR Manager)
    const initialApproval = leaveRequest.approvalFlow[0];
    const isDepartmentHeadRequest = initialApproval?.role === 'HR Manager';
    const isHRManagerRequest = initialApproval?.role === 'CEO';

    // For department head requests, they go directly to HR Manager, so no Department Head approval needed
    // For HR Manager requests, they go directly to CEO, so no HR Manager approval needed
    // For regular requests: If status is APPROVED, it means a supervisor (Department Head, Payroll Manager, HR Manager, or any direct supervisor) has already approved it
    // HR Manager can finalize any approved request regardless of which supervisor approved it
    if (!isDepartmentHeadRequest && !isHRManagerRequest) {
      // The request status is already checked above (must be APPROVED)
      // If we reach here and status is APPROVED, it means a supervisor has approved it
      // HR Manager can finalize any approved request - no need to check specific supervisor role
      // This allows any supervisor (Department Head, Payroll Manager, HR Manager as direct supervisor, etc.) to approve,
      // and then HR Manager can finalize regardless of who approved it
    }

    // Step 4: REQ-028 - Verify medical documents if required
    if (leaveRequest.attachmentId) {
      const attachment = await this.attachmentModel
        .findById(leaveRequest.attachmentId)
        .exec();
      if (!attachment) {
        throw new NotFoundException('Referenced attachment not found.');
      }
      // BR 54: Additional document validation (file type, size, etc.)
      await this.validateDocument(
        leaveRequest.leaveTypeId.toString(),
        attachment,
      );
    }

    // Step 5: BR 41 - Check cumulative limits (e.g., max sick leave per year)
    await this.checkCumulativeLimits(
      leaveRequest.employeeId.toString(),
      leaveRequest.leaveTypeId.toString(),
      leaveRequest.durationDays,
    );

    // Step 6: Add HR Manager's finalization to the approval flow
    leaveRequest.approvalFlow.push({
      role: 'HR Manager',
      status: LeaveStatus.APPROVED,
      decidedBy: new Types.ObjectId(hrUserId), // The HR Manager's ID from the logged-in user
      decidedAt: new Date(), // Timestamp of when the decision was made
    });

    // Step 7: Leave status remains APPROVED (already approved by Department Head, now finalized by HR)

    // Step 8: REQ-029, BR 32 - Auto-update leave balances with proper calculation
    await this.finalizeApprovedLeaveRequest(leaveRequest);

    // Step 9: REQ-030 - Notify stakeholders (HR Manager, Employee, Manager)
    await this.notifyStakeholders(leaveRequest, 'finalized');

    // Step 10: REQ-042, BR 692 - Sync with payroll system
    ///await this.syncWithPayroll(leaveRequest);

    // Step 11: Save the updated leave request
    const updatedLeaveRequest = await leaveRequest.save();

    return updatedLeaveRequest;
  }

  // Phase 2: BR 54 - Validate document (file type, size, format)
  private async validateDocument(
    leaveTypeId: string,
    attachment: AttachmentDocument,
  ): Promise<void> {
    const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
    if (!leaveType) {
      return;
    }

    // Validate file type if specified
    if (leaveType.attachmentType) {
      // Additional validation can be added here based on attachmentType
      // For example, medical documents should be PDF or image files
    }

    // Validate file size (e.g., max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (attachment.size && attachment.size > maxFileSize) {
      throw new Error(
        'Attachment file size exceeds maximum allowed size (10MB).',
      );
    }
  }

  // Phase 2: BR 41 - Check cumulative limits (e.g., max sick leave per year and 3-year cycle)
  private async checkCumulativeLimits(
    employeeId: string,
    leaveTypeId: string,
    requestedDays: number,
  ): Promise<void> {
    const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
    if (!leaveType) {
      return;
    }

    // Business Rule: Sick leave must track cumulatively over a 3-year cycle (max 360 days)
    if (leaveType.code === 'SICK_LEAVE') {
      const today = new Date();
      const threeYearsAgo = new Date(today);
      threeYearsAgo.setFullYear(today.getFullYear() - 3);

      // Get all approved sick leaves in the last 3 years
      const approvedSickLeaves = await this.leaveRequestModel
        .find({
          employeeId: new Types.ObjectId(employeeId),
          leaveTypeId: new Types.ObjectId(leaveTypeId),
          status: LeaveStatus.APPROVED,
          'dates.from': { $gte: threeYearsAgo },
        })
        .exec();

      const totalSickLeaveDays = approvedSickLeaves.reduce(
        (sum, req) => sum + req.durationDays,
        0,
      );
      const maxSickLeaveThreeYears = 360; // Business rule: max 360 days over 3-year cycle

      if (totalSickLeaveDays + requestedDays > maxSickLeaveThreeYears) {
        throw new Error(
          `Cumulative sick leave limit exceeded. Maximum ${maxSickLeaveThreeYears} days allowed over a 3-year cycle.`,
        );
      }

      // Also check per year limit (30 days)
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      const yearSickLeaves = approvedSickLeaves.filter((req) => {
        const reqDate = new Date(req.dates.from);
        return reqDate >= yearStart && reqDate <= yearEnd;
      });

      const yearSickLeaveDays = yearSickLeaves.reduce(
        (sum, req) => sum + req.durationDays,
        0,
      );
      const maxSickLeavePerYear = 30;

      if (yearSickLeaveDays + requestedDays > maxSickLeavePerYear) {
        throw new Error(
          `Annual sick leave limit exceeded. Maximum ${maxSickLeavePerYear} days per year allowed.`,
        );
      }
    }
  }

  // Phase 2: REQ-029, BR 32 - Finalize approved leave request (update balances with proper calculation)
  private async finalizeApprovedLeaveRequest(
    leaveRequest: LeaveRequestDocument,
  ): Promise<void> {
    const entitlement = await this.getLeaveEntitlement(
      leaveRequest.employeeId.toString(),
      leaveRequest.leaveTypeId.toString(),
    );

    // Get leave type to check if it's deductible
    const leaveType = await this.leaveTypeModel
      .findById(leaveRequest.leaveTypeId)
      .exec();

    if (!leaveType) {
      throw new Error(`Leave type with ID ${leaveRequest.leaveTypeId} not found`);
    }

    // BR 32: Proper balance calculation - move from pending to taken atomically
    // Only deduct from balance if the leave type is deductible
    // Non-deductible leaves (e.g., unpaid leave, special leave) don't count against balance
    
    let updated;
    if (leaveType.deductible !== false) {
      // For deductible leaves: decrement pending and increment taken
      updated = await this.leaveEntitlementModel
        .findByIdAndUpdate(
          entitlement._id,
          {
            $inc: {
              pending: -leaveRequest.durationDays,
              taken: leaveRequest.durationDays,
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new Error('Failed to update entitlement');
      }
    } else {
      // For non-deductible leaves: do nothing (they were never added to pending, so nothing to remove)
      // Just recalculate remaining in case other deductible leaves affected it
      updated = await this.leaveEntitlementModel
        .findById(entitlement._id)
        .exec();
      
      if (!updated) {
        throw new Error('Failed to find entitlement');
      }
    }

    // Recalculate remaining using helper method
    updated.remaining = this.calculateRemaining(updated);
    await updated.save();

    if (!updated) {
      throw new Error('Failed to update entitlement');
    }

    // Recalculate remaining using helper method
    updated.remaining = this.calculateRemaining(updated);
    await updated.save();
  }

  // Phase 2: REQ-030, N-053 - Notify stakeholders
  // Notify relevant parties when leave request status changes
  private async notifyStakeholders(
    leaveRequest: LeaveRequestDocument,
    event: string,
  ): Promise<void> {
    try {
      // Populate employee and leave type to get necessary details
      const populatedRequest = await this.leaveRequestModel
        .findById(leaveRequest._id)
        .populate('employeeId', 'firstName lastName email directManagerId')
        .populate('leaveTypeId', 'name code')
        .exec();

      if (!populatedRequest) {
        console.error('Could not populate leave request for notifications');
        return;
      }

      const employee = populatedRequest.employeeId as any;
      const leaveType = populatedRequest.leaveTypeId as any;
      const employeeId = employee._id?.toString() || employee.toString();
      const employeeName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : 'Employee';
      
      // Get manager ID (Department Head) - use the same logic as getTeamMembers but in reverse
      // Method 1: Try directManagerId first (if set)
      // Method 2: Use supervisorPositionId to find manager (reverse of getTeamMembers logic)
      let managerId: string | null = null;
      
      if (employee.directManagerId) {
        managerId = employee.directManagerId.toString();
        console.log(`[NOTIFICATION] Found managerId from populated directManagerId: ${managerId}`);
      } else {
        // Fetch employee profile to check directManagerId and supervisorPositionId
        const employeeProfile = await this.employeeProfileModel
          .findById(employeeId)
          .select('directManagerId supervisorPositionId employeeNumber')
          .lean()
          .exec();
        
        console.log(`[NOTIFICATION] Employee profile fetched:`, {
          employeeId,
          employeeNumber: (employeeProfile as any)?.employeeNumber,
          hasDirectManagerId: !!(employeeProfile as any)?.directManagerId,
          directManagerId: (employeeProfile as any)?.directManagerId,
          supervisorPositionId: (employeeProfile as any)?.supervisorPositionId,
        });
        
        // Method 1: Check directManagerId from profile
        if (employeeProfile && (employeeProfile as any).directManagerId) {
          managerId = (employeeProfile as any).directManagerId.toString();
          console.log(`[NOTIFICATION] Found managerId from employee profile directManagerId: ${managerId}`);
        } 
        // Method 2: Use supervisorPositionId to find the manager (reverse of getTeamMembers)
        // If employee has supervisorPositionId, find the employee who has that position as primaryPositionId
        else if (employeeProfile && (employeeProfile as any).supervisorPositionId) {
          const supervisorPositionId = (employeeProfile as any).supervisorPositionId;
          console.log(`[NOTIFICATION] Employee has supervisorPositionId: ${supervisorPositionId}, finding manager...`);
          
          // Find the employee who has this position as their primaryPositionId (this is the manager/department head)
          // This is the reverse of: find employees where supervisorPositionId matches manager's primaryPositionId
          // IMPORTANT: primaryPositionId is stored as STRING in MongoDB, not ObjectId
          // Convert supervisorPositionId to string for comparison
          const supervisorPosIdString = supervisorPositionId instanceof Types.ObjectId 
            ? supervisorPositionId.toString() 
            : String(supervisorPositionId);
          
          console.log(`[NOTIFICATION] Searching for manager with primaryPositionId (as string): ${supervisorPosIdString}`);
          console.log(`[NOTIFICATION] supervisorPositionId type: ${typeof supervisorPositionId}, value: ${supervisorPositionId}`);
          
          // Use flexible query to handle both ObjectId and string formats
          const primaryPositionQuery = this.createFlexibleIdQuery('primaryPositionId', supervisorPositionId);
          
          if (primaryPositionQuery) {
            // Try with status filter first
            let managerProfile = await this.employeeProfileModel
              .findOne({
                ...primaryPositionQuery,
                status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
              })
              .select('_id employeeNumber firstName lastName primaryPositionId')
              .lean()
              .exec();
            
            // If not found, try without status filter (in case status is the issue)
            if (!managerProfile) {
              console.log(`[NOTIFICATION] Not found with status filter, trying without status filter...`);
              managerProfile = await this.employeeProfileModel
                .findOne(primaryPositionQuery)
                .select('_id employeeNumber firstName lastName primaryPositionId status')
                .lean()
                .exec();
            }
            
            if (managerProfile) {
              managerId = managerProfile._id.toString();
              console.log(`[NOTIFICATION] ✅ Found Department Head via primaryPositionId: ${managerId} (${(managerProfile as any).employeeNumber || 'N/A'} - ${(managerProfile as any).firstName || ''} ${(managerProfile as any).lastName || ''})`);
              console.log(`[NOTIFICATION] Manager's primaryPositionId: ${(managerProfile as any).primaryPositionId?.toString() || 'N/A'}`);
            } else {
              // Alternative approach: Since getTeamMembers works, let's reverse it
              // Find all employees and check which one has this employee in their team
              // This works even if the manager's primaryPositionId is not set correctly in the UI
              const supervisorPosIdString = supervisorPositionId instanceof Types.ObjectId 
                ? supervisorPositionId.toString() 
                : String(supervisorPositionId);
              console.warn(`[NOTIFICATION] ❌ No employee found with primaryPositionId matching supervisorPositionId ${supervisorPosIdString}`);
            console.warn(`[NOTIFICATION] Trying alternative: Finding manager by checking who has this employee in their team...`);
            
            // Get all active employees who might be managers (have DEPARTMENT_HEAD role or have a primaryPositionId)
            // We'll check each one to see if this employee is in their team
            const potentialManagers = await this.employeeProfileModel
              .find({
                status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
                $or: [
                  { primaryPositionId: { $exists: true, $ne: null } },
                ],
              })
              .select('_id employeeNumber firstName lastName primaryPositionId')
              .lean()
              .exec();
            
            console.log(`[NOTIFICATION] Checking ${potentialManagers.length} potential managers...`);
            
            // For each potential manager, check if this employee is in their team
            // (i.e., check if employee's supervisorPositionId matches manager's primaryPositionId)
            for (const potentialManager of potentialManagers) {
              if ((potentialManager as any).primaryPositionId) {
                const managerPrimaryPosId = String((potentialManager as any).primaryPositionId);
                if (managerPrimaryPosId === supervisorPosIdString) {
                  managerProfile = potentialManager;
                  managerId = potentialManager._id.toString();
                  console.log(`[NOTIFICATION] ✅ Found Department Head via reverse team lookup: ${managerId} (${(potentialManager as any).employeeNumber || 'N/A'} - ${(potentialManager as any).firstName || ''} ${(potentialManager as any).lastName || ''})`);
                  console.log(`[NOTIFICATION] Manager's primaryPositionId: ${managerPrimaryPosId}`);
                  break;
                }
              }
            }
            
            // If still not found, check all employees (including inactive)
            if (!managerProfile) {
              console.warn(`[NOTIFICATION] Not found in active employees, checking all employees (including inactive)...`);
              const allEmployeesQuery = this.createFlexibleIdQuery('primaryPositionId', supervisorPositionId);
              const allEmployees = allEmployeesQuery 
                ? await this.employeeProfileModel
                    .find(allEmployeesQuery)
                    .select('_id employeeNumber firstName lastName status primaryPositionId')
                    .lean()
                    .exec()
                : [];
              
              console.warn(`[NOTIFICATION] Found ${allEmployees.length} employees (any status) with primaryPositionId ${supervisorPosIdString}:`, 
                allEmployees.map((e: any) => ({
                  id: e._id.toString(),
                  employeeNumber: e.employeeNumber,
                  name: `${e.firstName || ''} ${e.lastName || ''}`,
                  status: e.status,
                  primaryPositionId: String(e.primaryPositionId || 'null'),
                }))
              );
              
              if (allEmployees.length > 0) {
                const foundEmployee = allEmployees[0];
                managerProfile = foundEmployee;
                managerId = foundEmployee._id.toString();
                console.warn(`[NOTIFICATION] ⚠️ Using employee with matching position (status: ${foundEmployee.status}): ${managerId} (${foundEmployee.employeeNumber || 'N/A'})`);
              } else {
                // Final debug: Check what Karim's actual primaryPositionId is
                // Karim's employee ID from the image: 692d95ebf2f917c28a7da59e
                console.error(`[NOTIFICATION] ❌ CRITICAL: No employee found with primaryPositionId ${supervisorPosIdString}`);
                console.error(`[NOTIFICATION] Employee's supervisorPositionId: ${supervisorPosIdString}`);
                
                // Debug: Check Karim's actual profile
                const karimProfile = await this.employeeProfileModel
                  .findById('692d95ebf2f917c28a7da59e')
                  .select('_id employeeNumber firstName lastName primaryPositionId supervisorPositionId')
                  .lean()
                  .exec();
                
                if (karimProfile) {
                  const karimPrimaryPosId = String((karimProfile as any).primaryPositionId || 'null');
                  console.error(`[NOTIFICATION] DEBUG - Karim's profile:`, {
                    id: karimProfile._id.toString(),
                    employeeNumber: (karimProfile as any).employeeNumber,
                    name: `${(karimProfile as any).firstName || ''} ${(karimProfile as any).lastName || ''}`,
                    primaryPositionId: karimPrimaryPosId,
                    supervisorPositionId: String((karimProfile as any).supervisorPositionId || 'null'),
                  });
                  console.error(`[NOTIFICATION] Expected primaryPositionId: ${supervisorPosIdString}`);
                  console.error(`[NOTIFICATION] Karim's actual primaryPositionId: ${karimPrimaryPosId}`);
                  
                  // If Karim's primaryPositionId doesn't match, but we know the team view works,
                  // maybe we should just use Karim directly if he's the only department head
                  if (karimPrimaryPosId !== supervisorPosIdString) {
                    console.error(`[NOTIFICATION] ⚠️ MISMATCH: Karim's primaryPositionId doesn't match employee's supervisorPositionId!`);
                    console.error(`[NOTIFICATION] This explains why notifications aren't working. Karim needs to have primaryPositionId set to ${supervisorPosIdString}`);
                  }
                }
              }
            }
            }
          } else {
            console.warn(`[NOTIFICATION] Invalid supervisorPositionId format: ${supervisorPositionId}`);
          }
        } else {
          console.warn(`[NOTIFICATION] Employee ${employeeId} does not have directManagerId or supervisorPositionId set!`);
        }
      }
      
      // Verify managerId exists and is valid
      if (managerId) {
        const managerProfile = await this.employeeProfileModel
          .findById(managerId)
          .select('_id employeeNumber firstName lastName')
          .lean()
          .exec();
        if (!managerProfile) {
          console.warn(`[NOTIFICATION] Manager with ID ${managerId} not found in EmployeeProfile`);
          managerId = null;
        } else {
          // Ensure we use the exact _id format (as string) - this matches userId in JWT
          managerId = managerProfile._id.toString();
          console.log(`[NOTIFICATION] Verified Department Head: ${managerId} (${(managerProfile as any).employeeNumber || 'N/A'} - ${(managerProfile as any).firstName || ''} ${(managerProfile as any).lastName || ''})`);
        }
      }

      const leaveDetails = {
        employeeName,
        fromDate: populatedRequest.dates.from.toISOString().split('T')[0],
        toDate: populatedRequest.dates.to.toISOString().split('T')[0],
        leaveTypeName: leaveType?.name || 'Leave',
        status: leaveRequest.status,
      };

      // Handle different notification events
      switch (event) {
        case 'created':
          // Notify manager (department head) when new leave request is created
          // Also notify delegate if manager has delegated approval authority
          if (managerId) {
            // Notify the manager
            await this.notificationsService.notifyLeaveRequestCreated(
              leaveRequest._id.toString(),
              employeeId,
              managerId,
              leaveDetails,
            );
            
            // Check if manager has an active delegate
            const delegations = this.delegationMap.get(managerId);
            if (delegations && delegations.length > 0) {
              const now = new Date();
              const activeDelegations = delegations.filter(
                (del) =>
                  del.isActive &&
                  now >= del.startDate &&
                  now <= del.endDate,
              );
              
              // Notify all active delegates
              for (const delegation of activeDelegations) {
                console.log(`[NOTIFICATION] Manager ${managerId} has active delegate ${delegation.delegateId}, sending notification...`);
                await this.notificationsService.notifyLeaveRequestCreated(
                  leaveRequest._id.toString(),
                  employeeId,
                  delegation.delegateId, // Notify the delegate
                  leaveDetails,
                );
              }
            }
          }
          break;

        case 'approved':
          // Notify employee when leave request is approved
          await this.notificationsService.notifyLeaveRequestStatusChanged(
            leaveRequest._id.toString(),
            employeeId,
            'APPROVED',
          );
          break;

        case 'rejected':
          // Notify employee when leave request is rejected
          await this.notificationsService.notifyLeaveRequestStatusChanged(
            leaveRequest._id.toString(),
            employeeId,
            'REJECTED',
          );
          break;

        case 'modified':
          // Notify employee when leave request is modified
          await this.notificationsService.notifyLeaveRequestStatusChanged(
            leaveRequest._id.toString(),
            employeeId,
            'MODIFIED',
          );
          break;

        case 'returned':
          // Notify employee when leave request is returned for correction
          await this.notificationsService.notifyLeaveRequestStatusChanged(
            leaveRequest._id.toString(),
            employeeId,
            'RETURNED_FOR_CORRECTION',
          );
          break;

        case 'finalized':
        case 'overridden_approved':
        case 'overridden_rejected':
          // Notify employee and manager (department head) when leave request is finalized by HR Manager
          // Requirement: As an HR manager, I want the system to notify the employee, 
          // the employee's manager, when a leave request is finalized so that everyone is informed.
          if (managerId) {
            console.log(`[NOTIFICATION] Finalizing leave request - notifying employee and manager`);
            console.log(`[NOTIFICATION] Employee ID: ${employeeId}, Manager ID: ${managerId}`);
            
            await this.notificationsService.notifyLeaveRequestFinalized(
              leaveRequest._id.toString(),
              employeeId,
              managerId,
              managerId, // Use managerId as coordinatorId (for backward compatibility with the method signature)
              leaveDetails,
            );
            
            console.log(`[NOTIFICATION] ✅ Notifications sent to employee and manager for finalized leave request`);
          } else {
            // If no manager found, still notify the employee
            console.warn(`[NOTIFICATION] No manager found, only notifying employee for finalized leave request`);
            await this.notificationsService.notifyLeaveRequestStatusChanged(
              leaveRequest._id.toString(),
              employeeId,
              'APPROVED', // Finalized means approved
            );
          }
          break;

        default:
          console.log(`Unknown notification event: ${event}`);
      }
    } catch (error) {
      console.error('Error sending leave request notifications:', error);
      // Don't throw - notifications should not break the main flow
    }
  }

  // Phase 2: REQ-042, BR 692 - Sync with payroll system (internal helper)
  // renamed to avoid collision with public `syncWithPayroll` that accepts event payloads

  // Phase 2: REQ-026, BR 479 - HR Manager override manager decision
  async hrOverrideDecision(
    leaveRequestId: string,
    hrUserId: string,
    overrideToApproved: boolean,
    overrideReason: string,
  ): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel
      .findById(leaveRequestId)
      .populate('leaveTypeId', 'name code')
      .exec();
    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${leaveRequestId} not found. Please verify the request ID and try again.`);
    }

    // Validate override reason is provided (required but no character limit)
    if (!overrideReason || typeof overrideReason !== 'string') {
      throw new BadRequestException('Override justification is required. Please provide a reason for this override decision.');
    }

    // Store override reason in approval flow for audit purposes
    leaveRequest.approvalFlow.push({
      role: 'HR Manager',
      status: overrideToApproved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
      decidedBy: new Types.ObjectId(hrUserId),
      decidedAt: new Date(),
      // Store the override reason in the approval flow (if the schema supports it)
      // Note: If the schema doesn't have a reason field, we can add it to justification or create a separate field
    });
    
    // Also store override reason in the request's justification field if it exists, or append it
    if (overrideReason.trim()) {
      const existingJustification = leaveRequest.justification || '';
      const overrideNote = `[HR Override: ${overrideReason.trim()}]`;
      leaveRequest.justification = existingJustification 
        ? `${existingJustification}\n${overrideNote}` 
        : overrideNote;
    }

    if (overrideToApproved) {
      leaveRequest.status = LeaveStatus.APPROVED;
      try {
        // Extract leaveTypeId correctly before calling finalizeApprovedLeaveRequest
        let leaveTypeIdForFinalize: string;
        if (leaveRequest.leaveTypeId instanceof Types.ObjectId) {
          leaveTypeIdForFinalize = leaveRequest.leaveTypeId.toString();
        } else if (typeof leaveRequest.leaveTypeId === 'object' && leaveRequest.leaveTypeId !== null) {
          // Populated object - extract the _id
          const populatedLeaveType = leaveRequest.leaveTypeId as any;
          if (populatedLeaveType._id) {
            leaveTypeIdForFinalize = populatedLeaveType._id instanceof Types.ObjectId 
              ? populatedLeaveType._id.toString() 
              : String(populatedLeaveType._id);
          } else {
            // Fallback: get original unpopulated document
            const originalRequest = await this.leaveRequestModel
              .findById(leaveRequest._id)
              .select('leaveTypeId')
              .lean()
              .exec();
            if (originalRequest && originalRequest.leaveTypeId) {
              leaveTypeIdForFinalize = originalRequest.leaveTypeId instanceof Types.ObjectId 
                ? originalRequest.leaveTypeId.toString() 
                : String(originalRequest.leaveTypeId);
            } else {
              throw new BadRequestException(
                'Unable to process leave request: Leave type information is missing. Please contact system administrator.'
              );
            }
          }
        } else {
          leaveTypeIdForFinalize = String(leaveRequest.leaveTypeId);
        }
        
        // Temporarily set leaveTypeId to ObjectId for finalizeApprovedLeaveRequest
        const originalLeaveTypeId = leaveRequest.leaveTypeId;
        leaveRequest.leaveTypeId = new Types.ObjectId(leaveTypeIdForFinalize) as any;
        
        try {
          await this.finalizeApprovedLeaveRequest(leaveRequest);
        } finally {
          // Restore original leaveTypeId (populated object)
          leaveRequest.leaveTypeId = originalLeaveTypeId;
        }
      } catch (error) {
        // Provide user-friendly error message if finalization fails
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          'Unable to finalize leave request: An error occurred while processing the approval. Please try again or contact system administrator.'
        );
      }
      // Notify stakeholders (don't throw if notification fails)
      try {
        await this.notifyStakeholders(leaveRequest, 'overridden_approved');
      } catch (error) {
        console.error('Failed to send notification for overridden approval:', error);
        // Continue execution even if notification fails
      }
    } else {
      leaveRequest.status = LeaveStatus.REJECTED;
      
      // Extract leaveTypeId correctly - handle both populated object and ObjectId cases
      let leaveTypeIdValue: string;
      try {
        // Get the original unpopulated document to ensure we have the ObjectId
        const originalRequest = await this.leaveRequestModel
          .findById(leaveRequest._id)
          .select('leaveTypeId')
          .lean()
          .exec();
        
        if (!originalRequest || !originalRequest.leaveTypeId) {
          throw new BadRequestException(
            'Unable to process leave request: Leave type information is missing. Please contact system administrator.'
          );
        }
        
        // Extract the ObjectId value
        if (originalRequest.leaveTypeId instanceof Types.ObjectId) {
          leaveTypeIdValue = originalRequest.leaveTypeId.toString();
        } else if (typeof originalRequest.leaveTypeId === 'string') {
          leaveTypeIdValue = originalRequest.leaveTypeId;
        } else {
          // Handle case where it might be an object with _id
          leaveTypeIdValue = (originalRequest.leaveTypeId as any)?._id?.toString() || String(originalRequest.leaveTypeId);
        }
        
        // Validate leaveTypeId is a valid ObjectId string
        if (!Types.ObjectId.isValid(leaveTypeIdValue)) {
          throw new BadRequestException(
            'Unable to process leave request: Invalid leave type information. Please contact system administrator.'
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          'Unable to process leave request: Error reading leave type information. Please contact system administrator.'
        );
      }
      
      try {
        const entitlement = await this.getLeaveEntitlement(
          leaveRequest.employeeId.toString(),
          leaveTypeIdValue,
        );
        const updated = await this.leaveEntitlementModel
          .findByIdAndUpdate(
            entitlement._id,
            { $inc: { pending: -leaveRequest.durationDays } },
            { new: true },
          )
          .exec();
        if (updated && updated.pending < 0) {
          await this.leaveEntitlementModel
            .findByIdAndUpdate(entitlement._id, { $set: { pending: 0 } })
            .exec();
        }
      } catch (error) {
        // If getLeaveEntitlement fails, provide user-friendly error
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          'Unable to process leave request rejection: Could not update leave balance. Please contact system administrator.'
        );
      }
      // Notify stakeholders (don't throw if notification fails)
      try {
        await this.notifyStakeholders(leaveRequest, 'overridden_rejected');
      } catch (error) {
        console.error('Failed to send notification for overridden rejection:', error);
        // Continue execution even if notification fails
      }
    }

    try {
      const savedRequest = await leaveRequest.save();
      // Re-populate after save to ensure leaveTypeId is populated in response
      const populatedRequest = await this.leaveRequestModel
        .findById(savedRequest._id)
        .populate('leaveTypeId', 'name code')
        .exec();
      if (!populatedRequest) {
        throw new NotFoundException(`Failed to retrieve updated leave request with ID ${leaveRequestId}. Please try again.`);
      }
      return populatedRequest;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Unable to save leave request override: An error occurred while saving the changes. Please try again or contact system administrator.'
      );
    }
  }

  // Phase 2: REQ-027 - Process multiple leave requests at once
  // ENHANCED: Properly handles approve, reject, and finalize based on request status
  async processMultipleLeaveRequests(
    leaveRequestIds: string[],
    hrUserId: string,
    approved: boolean,
  ): Promise<LeaveRequestDocument[]> {
    const results: LeaveRequestDocument[] = [];
    const errors: Array<{ requestId: string; error: string }> = [];

    for (const leaveRequestId of leaveRequestIds) {
      try {
        // ENHANCED: Fetch request to check its current status
        const leaveRequest = await this.leaveRequestModel
          .findById(leaveRequestId)
          .exec();

        if (!leaveRequest) {
          errors.push({
            requestId: leaveRequestId,
            error: `Leave request with ID ${leaveRequestId} not found`,
          });
          continue;
        }

        // ENHANCED: Handle based on current status and desired action
        if (approved) {
          // If request is PENDING -> approve it
          if (leaveRequest.status === LeaveStatus.PENDING) {
            const approveDto = {
              leaveRequestId,
              status: LeaveStatus.APPROVED,
            };
            const approvedRequest = await this.approveLeaveRequest(
              approveDto,
              hrUserId,
              leaveRequestId,
            );
            results.push(approvedRequest);
          }
          // If request is APPROVED -> finalize it
          else if (leaveRequest.status === LeaveStatus.APPROVED) {
            const finalized = await this.finalizeLeaveRequest(
              leaveRequestId,
              hrUserId,
            );
            results.push(finalized);
          } else {
            errors.push({
              requestId: leaveRequestId,
              error: `Cannot approve/finalize request with status: ${leaveRequest.status}. Only PENDING or APPROVED requests can be processed.`,
            });
          }
        } else {
          // ENHANCED: Reject pending requests using normal rejection (not override)
          if (leaveRequest.status === LeaveStatus.PENDING) {
            const rejectDto = {
              leaveRequestId,
              status: LeaveStatus.REJECTED,
            };
            const rejected = await this.rejectLeaveRequest(
              rejectDto,
              hrUserId,
              leaveRequestId,
            );
            results.push(rejected);
          } else {
            errors.push({
              requestId: leaveRequestId,
              error: `Cannot reject request with status: ${leaveRequest.status}. Only PENDING requests can be rejected.`,
            });
          }
        }
      } catch (error: any) {
        // ENHANCED: Collect errors instead of silently continuing
        const errorMessage =
          error?.message ||
          error?.response?.message ||
          'Unknown error occurred';
        errors.push({
          requestId: leaveRequestId,
          error: errorMessage,
        });
        console.error(
          `Error processing leave request ${leaveRequestId}:`,
          error,
        );
      }
    }

    // ENHANCED: If all requests failed, throw error. Otherwise return results (partial success is acceptable)
    if (errors.length > 0 && results.length === 0) {
      const errorSummary = errors
        .map((e) => `${e.requestId}: ${e.error}`)
        .join('; ');
      throw new BadRequestException(
        `All ${errors.length} request(s) failed to process. Errors: ${errorSummary}`,
      );
    }

    // ENHANCED: Log warnings for partial failures but still return successful results
    if (errors.length > 0) {
      console.warn(
        `Bulk processing: ${results.length} succeeded, ${errors.length} failed. Failed IDs: ${errors.map((e) => e.requestId).join(', ')}`,
      );
    }

    return results;
  }

  // Phase 2: Get employee leave balance (detailed)
  // Consolidated: returns detailed entitlement info. If `leaveTypeId` is provided,
  // returns a single object; otherwise returns an array of entitlements.
  //REQ-031:view current leave balance
  async getEmployeeLeaveBalance(
    employeeId: string,
    leaveTypeId?: string,
  ): Promise<any> {
    try {
      const query: any = { employeeId: new Types.ObjectId(employeeId) };
      if (leaveTypeId) {
        query.leaveTypeId = new Types.ObjectId(leaveTypeId);
      }

      const entitlements = await this.leaveEntitlementModel
        .find(query)
        .populate('leaveTypeId')
        .exec();

      // Map entitlements and handle null populate results - only include valid leave types
      const mapped = (await Promise.all(
        entitlements.map(async (ent) => {
          let leaveTypeName = (ent.leaveTypeId as any)?.name;
          let leaveTypeIdValue = ent.leaveTypeId?._id || ent.leaveTypeId;

          // If populate failed (leaveTypeId is null or doesn't have name), fetch it separately
          if (!leaveTypeName && ent.leaveTypeId) {
            const storedLeaveTypeId = ent.leaveTypeId instanceof Types.ObjectId 
              ? ent.leaveTypeId 
              : (typeof ent.leaveTypeId === 'string' 
                  ? new Types.ObjectId(ent.leaveTypeId) 
                  : (ent.leaveTypeId as any)?._id || ent.leaveTypeId);
            
            if (storedLeaveTypeId) {
              try {
                const leaveType = await this.leaveTypeModel.findById(storedLeaveTypeId).exec();
                if (leaveType) {
                  leaveTypeName = leaveType.name;
                  leaveTypeIdValue = leaveType._id;
                } else {
                  return null; // Filter out deleted leave types
                }
              } catch (err) {
                return null; // Filter out invalid leave types
              }
            } else {
              return null; // Filter out invalid leave types
            }
          } else if (!leaveTypeName) {
            return null; // Filter out invalid leave types
          }

          return {
            leaveTypeId: leaveTypeIdValue,
            leaveTypeName: leaveTypeName,
            yearlyEntitlement: ent.yearlyEntitlement,
            accruedActual: ent.accruedActual,
            carryForward: ent.carryForward,
            taken: ent.taken,
            pending: ent.pending,
            remaining: ent.remaining,
            lastAccrualDate: ent.lastAccrualDate,
          };
        })
      )).filter(balance => balance !== null);

      if (leaveTypeId) {
        return mapped.length ? mapped[0] : null;
      }

      return mapped;
    } catch (error) {
      throw new Error(
        `Failed to fetch leave balance: ${(error as any).message}`,
      );
    }
  }

  // REQ-032: Get past leave requests with filters
  // Enhanced to support delegates: if userId is a delegate, show requests for the manager they're delegated for
  async getPastLeaveRequests(
    employeeId: string,
    filters?: any,
    userId?: string, // Optional: the actual user making the request (could be a delegate)
  ): Promise<any[]> {
    try {
      // Check if userId is a delegate
      // IMPORTANT: HR Admins should NOT be treated as delegates even if assigned
      let actualManagerId: string | null = null;
      let isDelegate = false;
      
      if (userId) {
        // First check if user is HR Admin - if so, don't treat them as a delegate
        const userSystemRoleCheck = await this.systemRoleModel
          .findOne({ employeeProfileId: new Types.ObjectId(userId), isActive: true })
          .exec();
        const isHRAdminCheck = userSystemRoleCheck?.roles?.includes(SystemRole.HR_ADMIN) || false;
        
        // Only check for delegation if user is NOT an HR Admin
        if (!isHRAdminCheck) {
          const delegatedManagerId = this.getDelegatedManagerId(userId);
          if (delegatedManagerId) {
            actualManagerId = delegatedManagerId;
            isDelegate = true;
            console.log(`[DELEGATE] User ${userId} is a delegate for manager ${actualManagerId}`);
          }
        } else {
          console.log(`[HR_ADMIN] HR Admin ${userId} - skipping delegation check (HR Admins cannot approve/reject)`);
        }
      }
      
      // Check if userId is a department head or HR Manager viewing their own requests
      // Only show team requests (excluding own) if:
      // 1. userId === employeeId (viewing own ID)
      // 2. User is a department head or HR Manager
      // 3. Status filter is "pending" AND no other filters (fromDate/toDate/leaveTypeId)
      //    This indicates it's the "Delegated Pending Requests" view, not personal history
      let isDepartmentHeadViewingOwn = false;
      let isHRManagerViewingOwn = false;
      if (userId && userId === employeeId) {
        const userSystemRole = await this.systemRoleModel
          .findOne({ employeeProfileId: new Types.ObjectId(userId), isActive: true })
          .exec();
        const isDeptHead = userSystemRole?.roles?.includes(SystemRole.DEPARTMENT_HEAD) || false;
        const isHRManager = userSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
        
        // Only apply team requests logic for delegated pending requests view
        // Check if it's specifically a pending-only query (no other filters)
        const isPendingOnlyQuery = filters?.status === 'pending' || filters?.status === 'PENDING';
        const hasOtherFilters = !!(filters?.fromDate || filters?.toDate || filters?.leaveTypeId);
        
        if (isDeptHead && isPendingOnlyQuery && !hasOtherFilters) {
          isDepartmentHeadViewingOwn = true;
          console.log(`[DEPARTMENT_HEAD] Department head ${userId} viewing delegated pending requests - showing team requests (excluding own)`);
        } else if (isDeptHead) {
          console.log(`[DEPARTMENT_HEAD] Department head ${userId} viewing personal requests - showing own requests`);
        }
        
        // HR Manager viewing own ID with pending status = show requests that need HR Manager approval
        if (isHRManager && isPendingOnlyQuery && !hasOtherFilters) {
          isHRManagerViewingOwn = true;
          console.log(`[HR_MANAGER] HR Manager ${userId} viewing delegated pending requests - showing department head requests`);
        } else if (isHRManager) {
          console.log(`[HR_MANAGER] HR Manager ${userId} viewing personal requests - showing own requests`);
        }
      }
      
      // If user is a delegate, get requests for the manager's team members
      // IMPORTANT: Only show delegated requests when user is actually a delegate
      // DO NOT show team requests as delegated requests
      // HR Admins are excluded from delegation (checked above)
      let query: any;
      
      if (isDelegate && actualManagerId) {
        // Delegate: Get requests based on the manager's role
        // If manager is HR Manager, show Department Head and HR Admin requests (not team-based)
        // If manager is Department Head, show team member requests
        const managerSystemRole = await this.systemRoleModel
          .findOne({ employeeProfileId: new Types.ObjectId(actualManagerId), isActive: true })
          .exec();
        const isHRManagerDelegating = managerSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
        
        const managerObjectId = new Types.ObjectId(actualManagerId);
        const delegateObjectId = userId ? new Types.ObjectId(userId) : null;
        
        if (isHRManagerDelegating) {
          // HR Manager delegated: Show requests that need HR Manager approval
          // These are requests from Department Heads and HR Admins
          const deptHeadRole = await this.systemRoleModel
            .find({ roles: SystemRole.DEPARTMENT_HEAD, isActive: true })
            .select('employeeProfileId')
            .lean()
            .exec();
          const hrAdminRole = await this.systemRoleModel
            .find({ roles: SystemRole.HR_ADMIN, isActive: true })
            .select('employeeProfileId')
            .lean()
            .exec();
          
          // Convert to ObjectIds for query
          const deptHeadIds = deptHeadRole.map((r: any) => new Types.ObjectId(r.employeeProfileId));
          const hrAdminIds = hrAdminRole.map((r: any) => new Types.ObjectId(r.employeeProfileId));
          const allIds = [...deptHeadIds, ...hrAdminIds];
          
          // Exclude the delegate's own requests
          const excludedIds = delegateObjectId ? [delegateObjectId] : [];
          
          query = {
            employeeId: {
              $in: allIds,
              $nin: excludedIds,
            },
          };
          
          console.log(`[DELEGATE] HR Manager delegation - Found ${allIds.length} Department Heads/HR Admins for delegate to review (excluding ${excludedIds.length} excluded employee(s))`);
        } else {
          // Department Head or other manager delegated: Get team member requests
          const manager = await this.employeeProfileModel.findById(actualManagerId).exec();
          if (!manager || !manager.primaryPositionId) {
            return []; // Manager not found or has no position
          }
          
          // Find all team members (employees with supervisorPositionId matching manager's primaryPositionId)
          const teamMembers = await this.employeeProfileModel
            .find({
              supervisorPositionId: manager.primaryPositionId,
              status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
            })
            .select('_id')
            .lean()
            .exec();
          
          const teamMemberIds = teamMembers.map((m: any) => m._id);
          
          // Exclude the manager's own requests from delegate view
          // Also exclude the delegate's own requests if the delegate is an HR Manager
          let excludeDelegateOwn = false;
          if (delegateObjectId) {
            const delegateSystemRole = await this.systemRoleModel
              .findOne({ employeeProfileId: delegateObjectId, isActive: true })
              .exec();
            const isHRManagerDelegate = delegateSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
            const isHRAdminDelegate = delegateSystemRole?.roles?.includes(SystemRole.HR_ADMIN) || false;
            excludeDelegateOwn = isHRManagerDelegate || isHRAdminDelegate;
          }
          
          // Build query to exclude manager's own requests
          // If delegate is HR Manager, also exclude delegate's own requests
          const excludedIds = [managerObjectId];
          if (excludeDelegateOwn && delegateObjectId) {
            excludedIds.push(delegateObjectId);
            console.log(`[DELEGATE] HR Manager delegate ${userId} - excluding both manager's and delegate's own requests`);
          }
          
          query = {
            employeeId: {
              $in: teamMemberIds,
              $nin: excludedIds, // Exclude manager's and delegate's own requests
            },
          };
          
          console.log(`[DELEGATE] Found ${teamMemberIds.length} team members for delegate to review (excluding ${excludedIds.length} excluded employee(s))`);
        }
      } else if (isDepartmentHeadViewingOwn && !isDelegate) {
        // IMPORTANT: Only show team requests if user is NOT a delegate
        // If user is a delegate, they should only see delegated requests, not their own team requests
        // Department head viewing their own ID: show team requests (excluding their own)
        const manager = await this.employeeProfileModel.findById(userId).exec();
        if (!manager || !manager.primaryPositionId) {
          // If no position, return empty (can't determine team)
          return [];
        }
        
        // Find all team members (employees with supervisorPositionId matching manager's primaryPositionId)
        const teamMembers = await this.employeeProfileModel
          .find({
            supervisorPositionId: manager.primaryPositionId,
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
          })
          .select('_id')
          .lean()
          .exec();
        
        const teamMemberIds = teamMembers.map((m: any) => m._id);
        
        // Exclude the department head's own requests
        const managerObjectId = new Types.ObjectId(userId);
        query = { 
          employeeId: { 
            $in: teamMemberIds,
            $ne: managerObjectId, // Exclude department head's own requests
          },
        };
        
        console.log(`[DEPARTMENT_HEAD] Found ${teamMemberIds.length} team members (excluding own requests)`);
      } else if (isHRManagerViewingOwn && !isDelegate) {
        // HR Manager viewing their own ID but NOT a delegate: 
        // Don't return team requests here - they should be fetched via filterTeamLeaveData endpoint
        // This endpoint should only return delegated requests when user is actually a delegate
        // Return empty array to prevent team requests from appearing in "delegated requests"
        console.log(`[HR_MANAGER] HR Manager ${userId} is NOT a delegate - returning empty array (team requests should be fetched via filterTeamLeaveData)`);
        return [];
      } else {
        // Regular query: get requests for specific employee
        query = { employeeId: new Types.ObjectId(employeeId) };
      }

      // Apply date filters
      if (filters?.fromDate || filters?.toDate) {
        query['dates.from'] = {};
        if (filters?.fromDate)
          query['dates.from'].$gte = new Date(filters.fromDate);
        if (filters?.toDate) {
          query['dates.to'] = query['dates.to'] || {};
          query['dates.to'].$lte = new Date(filters.toDate);
        }
      }

      // Apply status filter - normalize to lowercase to match enum values
      // Allow filtering for both regular users and delegates
      if (filters?.status && typeof filters.status === 'string' && filters.status.trim() !== '') {
        // Normalize status to lowercase to match LeaveStatus enum (pending, approved, rejected, cancelled)
        const normalizedStatus = filters.status.trim().toLowerCase();
        // Validate that the status is a valid enum value
        const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
        if (validStatuses.includes(normalizedStatus)) {
          query.status = normalizedStatus;
          console.log(`[getPastLeaveRequests] Filtering by status: ${normalizedStatus}`);
        } else {
          console.warn(`[getPastLeaveRequests] Invalid status value: "${filters.status}" (normalized: "${normalizedStatus}"). Valid values are: ${validStatuses.join(', ')}`);
        }
      } else if ((isDelegate || isDepartmentHeadViewingOwn || isHRManagerViewingOwn) && (!filters?.status || (typeof filters.status === 'string' && filters.status.trim() === ''))) {
        // For delegates, department heads, and HR managers viewing team requests, default to pending if no status filter is provided
        if (!isHRManagerViewingOwn) {
          // Only set status if not already set by HR Manager query logic above
          query.status = LeaveStatus.PENDING;
        }
        console.log(`[getPastLeaveRequests] ${isDelegate ? 'Delegate' : isHRManagerViewingOwn ? 'HR Manager' : 'Department Head'} query - defaulting to PENDING status`);
      }

      if (filters?.leaveTypeId) {
        query.leaveTypeId = new Types.ObjectId(filters.leaveTypeId);
      }

      const requests = await this.leaveRequestModel
        .find(query)
        .populate('leaveTypeId')
        .sort({ 'dates.from': -1 })
        .exec();

      // Map requests and handle null populate results
      const mapped = await Promise.all(
        requests.map(async (req) => {
          let leaveTypeName: string | null = null;
          let leaveTypeIdValue = req.leaveTypeId;
          
          try {
            if (req.leaveTypeId && typeof req.leaveTypeId === 'object' && req.leaveTypeId !== null) {
              // Safely access name property - check if it exists first
              const populatedLeaveType = req.leaveTypeId as any;
              if (populatedLeaveType && populatedLeaveType.name) {
                leaveTypeName = populatedLeaveType.name;
                leaveTypeIdValue = populatedLeaveType._id || populatedLeaveType;
              } else {
                // Populated but name is missing (leave type was deleted)
                leaveTypeName = null; // Will be set to 'Deleted Leave Type' below
                leaveTypeIdValue = populatedLeaveType?._id || populatedLeaveType || req.leaveTypeId;
              }
            }
          } catch (typeError) {
            console.warn(`[getPastLeaveRequests] Error accessing leaveTypeId for request ${req._id}:`, typeError);
            leaveTypeName = null;
          }

          // If populate failed (leaveTypeId is null or doesn't have name), fetch it separately
          if (!leaveTypeName && req.leaveTypeId) {
            const storedLeaveTypeId = req.leaveTypeId instanceof Types.ObjectId 
              ? req.leaveTypeId 
              : (typeof req.leaveTypeId === 'string' 
                  ? new Types.ObjectId(req.leaveTypeId) 
                  : (req.leaveTypeId as any)?._id || req.leaveTypeId);
            
            if (storedLeaveTypeId) {
              try {
                const leaveType = await this.leaveTypeModel.findById(storedLeaveTypeId).exec();
                if (leaveType) {
                  leaveTypeName = leaveType.name;
                  leaveTypeIdValue = leaveType._id;
                } else {
                  leaveTypeName = 'Deleted Leave Type';
                }
              } catch (err) {
                leaveTypeName = 'Unknown Leave Type';
              }
            } else {
              leaveTypeName = 'Unknown Leave Type';
            }
          } else if (!leaveTypeName) {
            leaveTypeName = 'Unknown Leave Type';
          }

          return {
            _id: req._id,
            employeeId: req.employeeId,
            leaveTypeId: leaveTypeIdValue,
            leaveTypeName: leaveTypeName,
            dates: req.dates,
            durationDays: req.durationDays,
            justification: req.justification,
            status: req.status,
            approvalFlow: req.approvalFlow,
            attachmentId: req.attachmentId ? (req.attachmentId as any)._id?.toString() || req.attachmentId.toString() : undefined,
            createdAt: (req as any).createdAt,
            updatedAt: (req as any).updatedAt,
          };
        })
      );

      return mapped;
    } catch (error) {
      console.error(`[getPastLeaveRequests] Error:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Unable to retrieve leave requests. ${errorMessage.includes('name') ? 'Some leave types may have been deleted. Please contact support if this issue persists.' : 'Please try again or contact support if the problem continues.'}`,
      );
    }
  }

  // REQ-033: Filter and sort leave history
  async filterLeaveHistory(employeeId: string, filters: any): Promise<any> {
    try {
      const query: any = { employeeId: new Types.ObjectId(employeeId) };

      if (filters.leaveTypeId) {
        query.leaveTypeId = new Types.ObjectId(filters.leaveTypeId);
      }

      if (filters.fromDate || filters.toDate) {
        query['dates.from'] = {};
        if (filters.fromDate)
          query['dates.from'].$gte = new Date(filters.fromDate);
        if (filters.toDate) {
          query['dates.to'] = query['dates.to'] || {};
          query['dates.to'].$lte = new Date(filters.toDate);
        }
      }

      if (filters.status && typeof filters.status === 'string' && filters.status.trim() !== '') {
        // Normalize status to lowercase to match LeaveStatus enum (pending, approved, rejected, cancelled)
        query.status = filters.status.trim().toLowerCase();
        console.log(`[filterLeaveHistory] Filtering by status: ${query.status}`);
      }

      let sortObj: any = {};
      if (filters.sortByDate) {
        sortObj['dates.from'] = filters.sortByDate === 'asc' ? 1 : -1;
      }
      if (filters.sortByStatus) {
        sortObj.status = filters.sortByStatus === 'asc' ? 1 : -1;
      }

      const total = await this.leaveRequestModel.countDocuments(query);
      const skip = filters.offset || 0;
      const limit = filters.limit || 10;

      const items = await this.leaveRequestModel
        .find(query)
        .populate('leaveTypeId')
        .sort(sortObj || { 'dates.from': -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return {
        total,
        items: await Promise.all(items.map(async (req) => {
          // Safely get leave type name, handling null populate and deleted leave types
          let leaveTypeName = 'Unknown Leave Type';
          let leaveTypeIdValue = req.leaveTypeId;
          
          try {
            if (req.leaveTypeId) {
              if (typeof req.leaveTypeId === 'object' && req.leaveTypeId !== null) {
                // Check if populated object has name property
                const populatedLeaveType = req.leaveTypeId as any;
                if (populatedLeaveType.name) {
                  leaveTypeName = populatedLeaveType.name;
                  leaveTypeIdValue = populatedLeaveType._id || populatedLeaveType;
                } else {
                  // Populated but name is missing (might be deleted)
                  leaveTypeName = 'Deleted Leave Type';
                  leaveTypeIdValue = populatedLeaveType._id || populatedLeaveType;
                }
              } else if (typeof req.leaveTypeId === 'string') {
                // If it's a string ID, try to fetch the leave type
                try {
                  const leaveType = await this.leaveTypeModel.findById(req.leaveTypeId).exec();
                  if (leaveType) {
                    leaveTypeName = leaveType.name;
                    leaveTypeIdValue = leaveType._id;
                  } else {
                    leaveTypeName = 'Deleted Leave Type';
                  }
                } catch (fetchError) {
                  leaveTypeName = 'Unknown Leave Type';
                }
              }
            }
          } catch (typeError) {
            console.warn(`[filterLeaveHistory] Error processing leave type for request ${req._id}:`, typeError);
            leaveTypeName = 'Unknown Leave Type';
          }
          
          return {
            _id: req._id,
            employeeId: req.employeeId,
            leaveTypeId: leaveTypeIdValue,
            leaveTypeName,
            dates: req.dates,
            durationDays: req.durationDays,
            status: req.status,
            createdAt: (req as any).createdAt,
          };
        })),
      };
    } catch (error) {
      console.error(`[filterLeaveHistory] Error:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Unable to filter leave history. ${errorMessage.includes('name') ? 'Some leave types may have been deleted. Please contact support if this issue persists.' : 'Please check your filter criteria and try again.'}`,
      );
    }
  }

  // REQ-034: Get team leave balances and upcoming leaves
  async getTeamLeaveBalances(
    managerId: string,
    upcomingFromDate?: Date,
    upcomingToDate?: Date,
    departmentId?: string,
  ): Promise<any> {
    try {
      // Get manager's position
      const manager = await this.employeeProfileModel.findById(managerId).exec();
      if (!manager || !manager.primaryPositionId) {
        return {
          managerId,
          teamMembers: [],
          totalTeamMembers: 0,
        };
      }

      // Normalize manager's primaryPositionId to handle both ObjectId and string formats
      const managerPositionQuery = this.createFlexibleIdQuery('supervisorPositionId', manager.primaryPositionId);
      if (!managerPositionQuery) {
        console.warn(`[getTeamLeaveBalances] Invalid manager primaryPositionId: ${manager.primaryPositionId}`);
        return {
          managerId,
          teamMembers: [],
          totalTeamMembers: 0,
        };
      }

      // Get team members where supervisorPositionId matches manager's position
      const baseQuery: any = {
        ...managerPositionQuery,
        status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
      };

      let teamMembers: any[] = [];

      // Filter by department if provided and valid
      if (departmentId && departmentId.trim()) {
        const trimmedDeptId = departmentId.trim();
        const departmentQuery = this.createFlexibleIdQuery('primaryDepartmentId', trimmedDeptId);
        
        if (departmentQuery) {
          console.log(`[getTeamLeaveBalances] Filtering by department: ${trimmedDeptId}`);
          const finalQuery = {
            ...baseQuery,
            ...departmentQuery,
          };
          
          teamMembers = await this.employeeProfileModel
            .find(finalQuery)
            .populate('primaryDepartmentId', 'name code')
            .populate('primaryPositionId', 'title code')
            .select('_id firstName lastName middleName fullName primaryDepartmentId primaryPositionId')
            .exec();
          
          console.log(`[getTeamLeaveBalances] Found ${teamMembers.length} team members with flexible department query`);
        } else {
          console.warn(`[getTeamLeaveBalances] Invalid departmentId format: ${trimmedDeptId}`);
          // Fallback to base query without department filter
          teamMembers = await this.employeeProfileModel
            .find(baseQuery)
            .populate('primaryDepartmentId', 'name code')
            .populate('primaryPositionId', 'title code')
            .select('_id firstName lastName middleName fullName primaryDepartmentId primaryPositionId')
            .exec();
        }
      } else {
        console.log(`[getTeamLeaveBalances] No department filter applied`);
        teamMembers = await this.employeeProfileModel
          .find(baseQuery)
          .populate('primaryDepartmentId', 'name code')
          .populate('primaryPositionId', 'title code')
          .select('_id firstName lastName middleName fullName primaryDepartmentId primaryPositionId')
          .exec();
      }

      console.log(`[getTeamLeaveBalances] Total found: ${teamMembers.length} team members`);
      if (teamMembers.length > 0) {
        teamMembers.forEach((member, idx) => {
          const deptId = (member as any).primaryDepartmentId?._id || (member as any).primaryDepartmentId;
          const deptIdStr = deptId?.toString ? deptId.toString() : (deptId || 'N/A');
          const deptIdType = deptId instanceof Types.ObjectId ? 'ObjectId' : (deptId ? typeof deptId : 'null/undefined');
          console.log(`[getTeamLeaveBalances] Member ${idx + 1}: ${(member as any).firstName} ${(member as any).lastName}, Department ID: ${deptIdStr}, Type: ${deptIdType}`);
          if (departmentId && departmentId.trim()) {
            const matches = deptIdStr === departmentId.trim() || 
                           (deptId instanceof Types.ObjectId && deptId.equals(new Types.ObjectId(departmentId.trim())));
            console.log(`[getTeamLeaveBalances]   - Matches filter (${departmentId.trim()}): ${matches}`);
          }
        });
      }

      const balances = await Promise.all(
        teamMembers.map(async (member) => {
          const entitlements = await this.leaveEntitlementModel
            .find({ employeeId: new Types.ObjectId(member._id) })
            .populate('leaveTypeId')
            .exec();

          let upcomingQuery: any = {
            employeeId: new Types.ObjectId(member._id),
            status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING, LeaveStatus.REJECTED] },
          };
          if (upcomingFromDate || upcomingToDate) {
            upcomingQuery['dates.from'] = {};
            if (upcomingFromDate)
              upcomingQuery['dates.from'].$gte = upcomingFromDate;
            if (upcomingToDate) {
              upcomingQuery['dates.to'] = upcomingQuery['dates.to'] || {};
              upcomingQuery['dates.to'].$lte = upcomingToDate;
            }
          }

          const upcomingLeaves = await this.leaveRequestModel
            .find(upcomingQuery)
            .populate('leaveTypeId')
            .exec();

          // Construct employee name from firstName, lastName, or use fullName if available
          const memberData = member as any;
          const employeeName = memberData.fullName || 
            (memberData.firstName && memberData.lastName 
              ? `${memberData.firstName}${memberData.middleName ? ' ' + memberData.middleName : ''} ${memberData.lastName}`.trim()
              : 'N/A');

          // Handle entitlements with fallback for null populate - only include valid leave types
          const processedEntitlements = (await Promise.all(
            entitlements.map(async (ent) => {
              let leaveTypeName = (ent.leaveTypeId as any)?.name;
              let leaveTypeIdValue = (ent.leaveTypeId as any)?._id;

              // If populate failed, fetch leave type separately
              if (!leaveTypeName && ent.leaveTypeId) {
                const storedLeaveTypeId = ent.leaveTypeId instanceof Types.ObjectId 
                  ? ent.leaveTypeId 
                  : (typeof ent.leaveTypeId === 'string' 
                      ? new Types.ObjectId(ent.leaveTypeId) 
                      : (ent.leaveTypeId as any)?._id || ent.leaveTypeId);
                
                if (storedLeaveTypeId) {
                  try {
                    const leaveType = await this.leaveTypeModel.findById(storedLeaveTypeId).exec();
                    if (leaveType) {
                      leaveTypeName = leaveType.name;
                      leaveTypeIdValue = leaveType._id;
                    } else {
                      return null; // Filter out deleted leave types
                    }
                  } catch (err) {
                    return null; // Filter out invalid leave types
                  }
                } else {
                  return null; // Filter out invalid leave types
                }
              } else if (!leaveTypeName) {
                return null; // Filter out invalid leave types
              }

              return {
                leaveTypeId: leaveTypeIdValue,
                leaveTypeName: leaveTypeName,
                remaining: ent.remaining,
                pending: ent.pending,
                taken: ent.taken,
              };
            })
          )).filter(balance => balance !== null);

          // Group entitlements by leaveTypeId and aggregate values
          const leaveBalancesMap = new Map<string, {
            leaveTypeId: any;
            leaveTypeName: string;
            remaining: number;
            pending: number;
            taken: number;
          }>();

          processedEntitlements.forEach((balance) => {
            if (!balance) return;
            
            const leaveTypeIdKey = balance.leaveTypeId?.toString() || balance.leaveTypeId;
            
            if (leaveBalancesMap.has(leaveTypeIdKey)) {
              // Aggregate values for duplicate leave types
              const existing = leaveBalancesMap.get(leaveTypeIdKey)!;
              existing.remaining += balance.remaining || 0;
              existing.pending += balance.pending || 0;
              existing.taken += balance.taken || 0;
            } else {
              // First occurrence of this leave type
              leaveBalancesMap.set(leaveTypeIdKey, {
                leaveTypeId: balance.leaveTypeId,
                leaveTypeName: balance.leaveTypeName,
                remaining: balance.remaining || 0,
                pending: balance.pending || 0,
                taken: balance.taken || 0,
              });
            }
          });

          // Convert map to array
          const leaveBalances = Array.from(leaveBalancesMap.values());

          // Handle upcomingLeaves with fallback for null populate - only include valid leave types
          const upcomingLeavesMapped = (await Promise.all(
            upcomingLeaves.map(async (leave) => {
              let leaveTypeName = (leave.leaveTypeId as any)?.name;
              let leaveTypeIdValue = (leave.leaveTypeId as any)?._id || leave.leaveTypeId;

              // If populate failed, fetch leave type separately
              if (!leaveTypeName && leave.leaveTypeId) {
                const storedLeaveTypeId = leave.leaveTypeId instanceof Types.ObjectId 
                  ? leave.leaveTypeId 
                  : (typeof leave.leaveTypeId === 'string' 
                      ? new Types.ObjectId(leave.leaveTypeId) 
                      : (leave.leaveTypeId as any)?._id || leave.leaveTypeId);
                
                if (storedLeaveTypeId) {
                  try {
                    const leaveType = await this.leaveTypeModel.findById(storedLeaveTypeId).exec();
                    if (leaveType) {
                      leaveTypeName = leaveType.name;
                      leaveTypeIdValue = leaveType._id;
                    } else {
                      return null; // Filter out deleted leave types
                    }
                  } catch (err) {
                    return null; // Filter out invalid leave types
                  }
                } else {
                  return null; // Filter out invalid leave types
                }
              } else if (!leaveTypeName) {
                return null; // Filter out invalid leave types
              }

              return {
                _id: leave._id,
                leaveTypeId: leaveTypeIdValue,
                leaveTypeName: leaveTypeName,
                dates: leave.dates,
                durationDays: leave.durationDays,
                status: leave.status,
                isFlagged: (leave as any).irregularPatternFlag || false,
              };
            })
          )).filter(leave => leave !== null);

          return {
            employeeId: member._id,
            employeeName: employeeName,
            position: (member.primaryPositionId && (member.primaryPositionId as any).title) || 'N/A',
            department: (member.primaryDepartmentId && (member.primaryDepartmentId as any).name) || 'N/A',
            leaveBalances: leaveBalances,
            upcomingLeaves: upcomingLeavesMapped,
          };
        }),
      );

      return {
        managerId,
        teamMembers: balances,
        totalTeamMembers: balances.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get team leave balances: ${(error as any).message}`,
      );
    }
  }

  // REQ-035: Filter and sort team leave data
  async filterTeamLeaveData(managerId: string, filters: any): Promise<any> {
    try {
      // Get manager's position
      const manager = await this.employeeProfileModel.findById(managerId).exec();
      if (!manager || !manager.primaryPositionId) {
        return {
          total: 0,
          filters: {
            managerId,
            departmentId: filters.departmentId,
            leaveTypeId: filters.leaveTypeId,
            dateRange:
              filters.fromDate || filters.toDate
                ? { from: filters.fromDate, to: filters.toDate }
                : undefined,
            status: filters.status,
          },
          items: [],
        };
      }

      // Normalize manager's primaryPositionId to handle both ObjectId and string formats
      const managerPositionQuery = this.createFlexibleIdQuery('supervisorPositionId', manager.primaryPositionId);
      if (!managerPositionQuery) {
        console.warn(`[filterTeamLeaveData] Invalid manager primaryPositionId: ${manager.primaryPositionId}`);
        return {
          total: 0,
          filters: {
            managerId,
            departmentId: filters.departmentId,
            leaveTypeId: filters.leaveTypeId,
            dateRange:
              filters.fromDate || filters.toDate
                ? { from: filters.fromDate, to: filters.toDate }
                : undefined,
            status: filters.status,
          },
          items: [],
        };
      }

      // Get team members where supervisorPositionId matches manager's position
      const baseQuery: any = {
        ...managerPositionQuery,
        status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
      };

      let teamMembers: any[] = [];

      // Filter by department if provided and valid (same logic as getTeamLeaveBalances)
      if (filters.departmentId && filters.departmentId.trim()) {
        const trimmedDeptId = filters.departmentId.trim();
        const departmentQuery = this.createFlexibleIdQuery('primaryDepartmentId', trimmedDeptId);
        
        if (departmentQuery) {
          console.log(`[filterTeamLeaveData] Filtering by department: ${trimmedDeptId}`);
          const finalQuery = {
            ...baseQuery,
            ...departmentQuery,
          };
          
          teamMembers = await this.employeeProfileModel
            .find(finalQuery)
            .select('_id primaryDepartmentId')
            .exec();
          
          console.log(`[filterTeamLeaveData] Found ${teamMembers.length} team members with flexible department query`);
        } else {
          console.warn(`[filterTeamLeaveData] Invalid departmentId format: ${trimmedDeptId}`);
          // Fallback to base query without department filter
          teamMembers = await this.employeeProfileModel
            .find(baseQuery)
            .select('_id primaryDepartmentId')
            .exec();
        }
      } else {
        console.log(`[filterTeamLeaveData] No department filter applied`);
        teamMembers = await this.employeeProfileModel
          .find(baseQuery)
          .select('_id primaryDepartmentId')
          .exec();
      }
      
      console.log(`[filterTeamLeaveData] Total found: ${teamMembers.length} team members`);
      if (teamMembers.length > 0 && filters.departmentId) {
        teamMembers.forEach((member, idx) => {
          const deptId = (member as any).primaryDepartmentId;
          const deptIdStr = deptId?.toString ? deptId.toString() : (deptId || 'N/A');
          const deptIdType = deptId instanceof Types.ObjectId ? 'ObjectId' : (deptId ? typeof deptId : 'null/undefined');
          console.log(`[filterTeamLeaveData] Member ${idx + 1}: Department ID: ${deptIdStr}, Type: ${deptIdType}`);
          if (filters.departmentId && filters.departmentId.trim()) {
            const matches = deptIdStr === filters.departmentId.trim() || 
                           (deptId instanceof Types.ObjectId && deptId.equals(new Types.ObjectId(filters.departmentId.trim())));
            console.log(`[filterTeamLeaveData]   - Matches filter (${filters.departmentId.trim()}): ${matches}`);
          }
        });
      }
      
      if (teamMembers.length > 0 && filters.departmentId) {
        const trimmedDeptId = filters.departmentId.trim();
        console.log(`[filterTeamLeaveData] Sample team members:`, teamMembers.slice(0, 3).map(m => {
          const deptId = (m as any).primaryDepartmentId;
          const deptIdStr = deptId?.toString ? deptId.toString() : (deptId || 'N/A');
          return {
            employeeId: m._id.toString(),
            departmentId: deptIdStr,
            departmentIdType: deptId instanceof Types.ObjectId ? 'ObjectId' : (deptId ? typeof deptId : 'null/undefined'),
            matchesFilter: deptIdStr === trimmedDeptId || 
              (deptId instanceof Types.ObjectId && deptId.equals(new Types.ObjectId(trimmedDeptId)))
          };
        }));
      } else if (filters.departmentId && filters.departmentId.trim()) {
        const trimmedDeptId = filters.departmentId.trim();
        console.warn(`[filterTeamLeaveData] ⚠️ No team members found for department ${trimmedDeptId}`);
        console.warn(`[filterTeamLeaveData] Possible reasons:`);
        console.warn(`  1. No employees in this department have supervisorPositionId matching manager's position`);
        console.warn(`  2. Employees don't have a department assigned (primaryDepartmentId is null/undefined)`);
        console.warn(`  3. The department ID format doesn't match (expected ObjectId)`);
        
        // Diagnostic: Check if any employees exist in this department at all
        const diagnosticQuery: any = {
          primaryDepartmentId: Types.ObjectId.isValid(trimmedDeptId)
            ? new Types.ObjectId(trimmedDeptId)
            : trimmedDeptId,
        };
        const allEmployeesInDept = await this.employeeProfileModel
          .find(diagnosticQuery)
          .select('_id firstName lastName primaryDepartmentId supervisorPositionId')
          .limit(5)
          .exec();
        console.log(`[filterTeamLeaveData] Diagnostic: Found ${allEmployeesInDept.length} total employees in this department`);
        
        // Also check team members without department filter to see if they have departments assigned
        const teamMembersWithoutDeptFilter = await this.employeeProfileModel
          .find({
            supervisorPositionId: manager.primaryPositionId,
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
          })
          .select('_id firstName lastName primaryDepartmentId')
          .limit(5)
          .exec();
        console.log(`[filterTeamLeaveData] Diagnostic: Found ${teamMembersWithoutDeptFilter.length} team members (without dept filter)`);
        const withoutDept = teamMembersWithoutDeptFilter.filter(m => !(m as any).primaryDepartmentId);
        if (withoutDept.length > 0) {
          console.warn(`[filterTeamLeaveData] ⚠️ Found ${withoutDept.length} team members WITHOUT department assigned:`, 
            withoutDept.map(m => ({
              id: m._id.toString(),
              name: `${(m as any).firstName || ''} ${(m as any).lastName || ''}`.trim()
            }))
          );
        }
        
        if (allEmployeesInDept.length > 0) {
          console.log(`[filterTeamLeaveData] Sample employees in department:`, allEmployeesInDept.map(e => ({
            id: e._id.toString(),
            name: `${(e as any).firstName || ''} ${(e as any).lastName || ''}`.trim(),
            deptId: (e as any).primaryDepartmentId?.toString() || (e as any).primaryDepartmentId,
            supervisorPosId: (e as any).supervisorPositionId?.toString() || (e as any).supervisorPositionId,
            managerPosId: manager.primaryPositionId?.toString()
          })));
        }
      }
      
      const memberIds = teamMembers.map((m) => m._id);
      
      // Exclude department head's own requests from the list
      // Department heads should not see their own leave requests in the pending requests bar
      const managerObjectId = new Types.ObjectId(managerId);
      const filteredMemberIds = memberIds.filter(
        (id) => !id.equals(managerObjectId)
      );

      // If no team members found (excluding manager), return empty results
      if (filteredMemberIds.length === 0) {
        console.warn('[filterTeamLeaveData] No team members found (excluding manager). Base query:', JSON.stringify(baseQuery));
        return {
          total: 0,
          filters: {
            managerId,
            departmentId: filters.departmentId,
            leaveTypeId: filters.leaveTypeId,
            dateRange:
              filters.fromDate || filters.toDate
                ? { from: filters.fromDate, to: filters.toDate }
                : undefined,
            status: filters.status,
          },
          items: [],
        };
      }

      const query: any = { employeeId: { $in: filteredMemberIds } };

      if (filters.leaveTypeId) {
        query.leaveTypeId = new Types.ObjectId(filters.leaveTypeId);
      }

      if (filters.fromDate || filters.toDate) {
        query['dates.from'] = {};
        if (filters.fromDate)
          query['dates.from'].$gte = new Date(filters.fromDate);
        if (filters.toDate) {
          query['dates.to'] = query['dates.to'] || {};
          query['dates.to'].$lte = new Date(filters.toDate);
        }
      }

      if (filters.status && typeof filters.status === 'string' && filters.status.trim() !== '') {
        // Normalize status to lowercase to match LeaveStatus enum (pending, approved, rejected, cancelled)
        query.status = filters.status.trim().toLowerCase();
        console.log(`[filterTeamLeaveData] Filtering by status: ${query.status}`);
      }

      let sortObj: any = {};
      if (filters.sortByDate) {
        sortObj['dates.from'] = filters.sortByDate === 'asc' ? 1 : -1;
      }
      if (filters.sortByStatus) {
        sortObj.status = filters.sortByStatus === 'asc' ? 1 : -1;
      }

      const total = await this.leaveRequestModel.countDocuments(query);
      const skip = filters.offset || 0;
      const limit = filters.limit || 10;

      const items = await this.leaveRequestModel
        .find(query)
        .populate('leaveTypeId')
        .populate('employeeId', 'firstName lastName middleName')
        .sort(sortObj || { 'dates.from': -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return {
        total,
        filters: {
          managerId,
          departmentId: filters.departmentId,
          leaveTypeId: filters.leaveTypeId,
          dateRange:
            filters.fromDate || filters.toDate
              ? { from: filters.fromDate, to: filters.toDate }
              : undefined,
          status: filters.status,
        },
        items: await Promise.all(items.map(async (req) => {
          const employee = req.employeeId as any;
          const employeeName = employee && typeof employee === 'object'
            ? `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim()
            : undefined;
          
          // Safely get leave type name
          let leaveTypeName = 'Unknown Leave Type';
          try {
            if (req.leaveTypeId) {
              if (typeof req.leaveTypeId === 'object' && req.leaveTypeId !== null) {
                const populatedLeaveType = req.leaveTypeId as any;
                if (populatedLeaveType && populatedLeaveType.name) {
                  leaveTypeName = populatedLeaveType.name;
                } else {
                  leaveTypeName = 'Deleted Leave Type';
                }
              } else if (typeof req.leaveTypeId === 'string') {
                try {
                  const leaveType = await this.leaveTypeModel.findById(req.leaveTypeId).exec();
                  leaveTypeName = leaveType ? leaveType.name : 'Deleted Leave Type';
                } catch {
                  leaveTypeName = 'Unknown Leave Type';
                }
              }
            }
          } catch (typeError) {
            console.warn(`[filterTeamLeaveData] Error processing leave type for request ${req._id}:`, typeError);
            leaveTypeName = 'Unknown Leave Type';
          }
          
          return {
            _id: req._id.toString(),
            employeeId: (req.employeeId as any)?._id?.toString() || req.employeeId?.toString() || req.employeeId,
            employeeName,
            leaveTypeName,
            dates: req.dates,
            durationDays: req.durationDays,
            status: req.status,
            createdAt: (req as any).createdAt,
            attachmentId: req.attachmentId ? (req.attachmentId as any)._id?.toString() || req.attachmentId.toString() : undefined,
            justification: req.justification,
            approvalFlow: req.approvalFlow,
          };
        })),
      };
    } catch (error) {
      console.error(`[filterTeamLeaveData] Error:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Unable to filter team leave data. ${errorMessage.includes('name') ? 'Some leave types may have been deleted. Please contact support if this issue persists.' : 'Please check your filter criteria and try again.'}`,
      );
    }
  }

  // REQ-039: Flag irregular leaving patterns
  async flagIrregularPattern(
    leaveRequestId: string,
    managerId: string,
    flagReason: string,
    notes?: string,
  ): Promise<any> {
    try {
      const leaveRequest = await this.leaveRequestModel
        .findById(leaveRequestId)
        .exec();
      if (!leaveRequest) {
        throw new Error(`LeaveRequest with ID ${leaveRequestId} not found`);
      }

      leaveRequest.irregularPatternFlag = true;
      await leaveRequest.save();

      return {
        success: true,
        leaveRequestId,
        flagReason,
        notes,
        flaggedBy: managerId,
        flaggedDate: new Date(),
        status: 'flagged',
      };
    } catch (error) {
      throw new Error(
        `Failed to flag irregular pattern: ${(error as any).message}`,
      );
    }
  }

  // REQ-040: Auto accrue leave for single employee
  async autoAccrueLeave(
    employeeId: string,
    leaveTypeId: string,
    accrualAmount: number,
    accrualType: string,
    policyId?: string,
    notes?: string,
  ): Promise<any> {
    try {
      // BR 11: Check if employee is on unpaid leave or suspended
      const employee = await this.employeeProfileModel
        .findById(employeeId)
        .exec();
      
      if (!employee) {
        throw new Error(`Employee ${employeeId} not found`);
      }

      // Check employee status (BR 11: pause accrual during suspension or on leave)
      if (
        employee.status === EmployeeStatus.SUSPENDED ||
        employee.status === EmployeeStatus.ON_LEAVE
      ) {
        return {
          success: false,
          employeeId,
          leaveTypeId,
          accrualAmount,
          accrualType,
          reason: `Accrual skipped: Employee is ${employee.status}`,
          effectiveDate: new Date(),
          notes,
        };
      }

      // Check for approved unpaid leave requests that overlap with today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const unpaidLeave = await this.leaveRequestModel
        .findOne({
          employeeId: new Types.ObjectId(employeeId),
          status: LeaveStatus.APPROVED,
          startDate: { $lte: today },
          endDate: { $gte: today },
          // Note: Assuming unpaid leave types have a specific code or flag
          // You may need to check leaveType.isUnpaid or similar field
        })
        .populate('leaveTypeId')
        .exec();

      if (unpaidLeave) {
        // Check if this is an unpaid leave type (you may need to add this field to LeaveType)
        // For now, we'll skip if there's any approved leave on the accrual date
        return {
          success: false,
          employeeId,
          leaveTypeId,
          accrualAmount,
          accrualType,
          reason: 'Accrual skipped: Employee is on approved leave',
          effectiveDate: new Date(),
          notes,
        };
      }

      const entitlement = await this.getLeaveEntitlement(
        employeeId,
        leaveTypeId,
      );
      const previousBalance = entitlement.remaining;

      // Get policy for rounding rule
      const leavePolicy = await this.leavePolicyModel
        .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
        .exec();
      const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;

      // Business Rule: Rounding should be applied to the TOTAL accruedActual, not the increment
      // Step 1: Increment accruedActual (pre-rounded cumulative total)
      const updated = await this.leaveEntitlementModel
        .findByIdAndUpdate(
          entitlement._id,
          {
            $inc: {
              accruedActual: accrualAmount,
            },
            $set: { lastAccrualDate: new Date() },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new Error('Failed to update entitlement');
      }

      // Step 2: Round the TOTAL accruedActual (not just the increment)
      // This ensures accruedRounded = rounded(total accruedActual)
      updated.accruedRounded = this.applyRoundingRule(
        updated.accruedActual,
        roundingRule,
      );

      // Step 3: Recalculate remaining using helper method
      updated.remaining = this.calculateRemaining(updated);
      await updated.save();

      return {
        success: true,
        employeeId,
        leaveTypeId,
        accrualAmount,
        accrualType,
        previousBalance,
        newBalance: updated.remaining,
        effectiveDate: new Date(),
        notes,
      };
    } catch (error) {
      throw new Error(`Failed to accrue leave: ${(error as any).message}`);
    }
  }

  // REQ-040: Auto accrue for all employees
  async autoAccrueAllEmployees(
    leaveTypeId: string,
    accrualAmount: number,
    accrualType: string,
    departmentId?: string,
  ): Promise<any> {
    try {
      const query: any = { leaveTypeId: new Types.ObjectId(leaveTypeId) };

      // TODO: if you later store department on entitlement or employee, you can
      // use departmentId here to further filter the query.

      const entitlements = await this.leaveEntitlementModel.find(query).exec();

      const results: any[] = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      for (const entitlement of entitlements) {
        try {
          // BR 11: Check if employee is on unpaid leave or suspended
          const employee = await this.employeeProfileModel
            .findById(entitlement.employeeId)
            .exec();

          if (!employee) {
            failed++;
            results.push({
              employeeId: entitlement.employeeId,
              status: 'failed',
              error: 'Employee not found',
            });
            continue;
          }

          // Check employee status (BR 11: pause accrual during suspension or on leave)
          if (
            employee.status === EmployeeStatus.SUSPENDED ||
            employee.status === EmployeeStatus.ON_LEAVE
          ) {
            skipped++;
            results.push({
              employeeId: entitlement.employeeId,
              status: 'skipped',
              reason: `Employee is ${employee.status}`,
            });
            continue;
          }

          // Check for approved unpaid leave requests that overlap with today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const unpaidLeave = await this.leaveRequestModel
            .findOne({
              employeeId: entitlement.employeeId,
              status: LeaveStatus.APPROVED,
              startDate: { $lte: today },
              endDate: { $gte: today },
            })
            .exec();

          if (unpaidLeave) {
            skipped++;
            results.push({
              employeeId: entitlement.employeeId,
              status: 'skipped',
              reason: 'Employee is on approved leave',
            });
            continue;
          }

          const previousBalance = entitlement.remaining;

          // Get policy for rounding rule
          const leavePolicy = await this.leavePolicyModel
            .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
            .exec();
          const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;

          // Business Rule: Rounding should be applied to the TOTAL accruedActual, not the increment
          // Step 1: Increment accruedActual (pre-rounded cumulative total)
          const updated = await this.leaveEntitlementModel
            .findByIdAndUpdate(
              entitlement._id,
              {
                $inc: {
                  accruedActual: accrualAmount,
                },
                $set: {
                  lastAccrualDate: new Date(),
                },
              },
              { new: true },
            )
            .exec();

          if (!updated) {
            throw new Error('Failed to update entitlement');
          }

          // Step 2: Round the TOTAL accruedActual (not just the increment)
          updated.accruedRounded = this.applyRoundingRule(
            updated.accruedActual,
            roundingRule,
          );
          await updated.save();

          // Recalculate remaining using helper method
          updated.remaining = this.calculateRemaining(updated);
          await updated.save();

          results.push({
            employeeId: entitlement.employeeId,
            status: 'success',
            previousBalance,
            newBalance: updated.remaining,
            accrualAmount,
            accrualType,
          });
          successful++;
        } catch (err) {
          failed++;
          results.push({
            employeeId: entitlement.employeeId,
            status: 'failed',
            error: (err as any).message,
          });
        }
      }

      return {
        successful,
        failed,
        skipped,
        total: entitlements.length,
        details: results,
      };
    } catch (error) {
      throw new Error(
        `Failed to accrue leave for all employees: ${(error as any).message}`,
      );
    }
  }

  // REQ-041: Run carry-forward
  async runCarryForward(
    leaveTypeId: string,
    employeeId?: string,
    asOfDate?: Date,
    departmentId?: string,
  ): Promise<any> {
    console.log(`[runCarryForward] ════════════════════════════════════════`);
    console.log(`[runCarryForward] START - Called with:`, {
      leaveTypeId,
      employeeId,
      asOfDate,
      departmentId,
    });
    
    try {
      const processDate = asOfDate || new Date();
      console.log(`[runCarryForward] Process date: ${processDate}`);

      const query: any = { leaveTypeId: new Types.ObjectId(leaveTypeId) };

      if (employeeId) {
        query.employeeId = new Types.ObjectId(employeeId);
      }
      // departmentId is currently not used in filtering; you can add it later if needed

      const entitlements = await this.leaveEntitlementModel
        .find(query)
        .exec();
      
      // Check for duplicate entitlements (same employee + leave type)
      const employeeLeaveTypeMap = new Map<string, any[]>();
      entitlements.forEach(ent => {
        const key = `${ent.employeeId?.toString()}_${ent.leaveTypeId?.toString()}`;
        if (!employeeLeaveTypeMap.has(key)) {
          employeeLeaveTypeMap.set(key, []);
        }
        employeeLeaveTypeMap.get(key)!.push(ent);
      });
      
      // Log duplicates if found
      employeeLeaveTypeMap.forEach((ents, key) => {
        if (ents.length > 1) {
          console.warn(`[runCarryForward] ⚠️ Found ${ents.length} duplicate entitlements for ${key}`);
        }
      });
      
      console.log(`[runCarryForward] Found ${entitlements.length} entitlements to process for leaveTypeId: ${leaveTypeId}`);
      
      const results: any[] = [];
      let successful = 0;
      let failed = 0;

      // Get policy to check maxCarryForward
      // Try multiple ways to find the policy in case of ID format issues
      let leavePolicy = await this.leavePolicyModel
        .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
        .exec();
      
      // If not found, try as string
      if (!leavePolicy) {
        leavePolicy = await this.leavePolicyModel
          .findOne({ leaveTypeId: leaveTypeId })
          .exec();
      }

      const maxCarryForward = leavePolicy?.maxCarryForward || 0;
      const carryForwardAllowed = leavePolicy?.carryForwardAllowed || false;

      console.log(`[runCarryForward] Policy check:`, {
        leaveTypeId,
        policyFound: !!leavePolicy,
        maxCarryForward,
        carryForwardAllowed,
        entitlementsCount: entitlements.length,
      });

      // Allow carry forward if either:
      // 1. carryForwardAllowed is explicitly true, OR
      // 2. maxCarryForward is set to a positive value (implicitly allows carry forward)
      const canCarryForward = carryForwardAllowed || maxCarryForward > 0;

      if (!canCarryForward) {
        console.warn(`[runCarryForward] Carry forward not allowed: carryForwardAllowed=${carryForwardAllowed}, maxCarryForward=${maxCarryForward}`);
        return {
          processedDate: processDate,
          leaveTypeId,
          successful: 0,
          failed: 0,
          total: entitlements.length,
          details: entitlements.map(ent => ({
            employeeId: ent.employeeId,
            status: 'skipped',
            reason: 'Carry forward not allowed by policy. Please enable "Carry Forward Allowed" or set "Max Carry Forward" to a positive value.',
            carryForwardAmount: 0,
            newBalance: ent.remaining,
          })),
        };
      }

      // If maxCarryForward is 0 but carryForwardAllowed is true, use a default
      const effectiveMaxCarryForward = maxCarryForward > 0 ? maxCarryForward : (carryForwardAllowed ? 999 : 0);
      
      if (maxCarryForward === 0 && carryForwardAllowed) {
        console.warn(`[runCarryForward] maxCarryForward is 0 but carryForwardAllowed is true. Using unlimited carry forward.`);
      }

      for (const entitlement of entitlements) {
        try {
          // IMPORTANT: Recalculate remaining balance before calculating carry forward
          // This ensures we're using the correct current balance
          const currentRemaining = this.calculateRemaining(entitlement);
          
          // For carry forward, we need to consider what CAN be carried forward
          // This is typically the remaining balance, but if remaining is 0 and there's
          // accrued that hasn't been accounted for, we should check yearlyEntitlement - taken
          // However, the standard approach is: carry forward = remaining balance (up to max)
          
          // Calculate potential carry forward from remaining balance
          let potentialCarryForward = currentRemaining;
          
          // If remaining is 0 or very small, but there's yearly entitlement and taken is less than entitlement,
          // this might indicate we're at year-end and should carry forward unused entitlement
          // However, this should typically be handled by the reset process, not carry forward
          // For now, we'll stick with remaining balance as the source
          
          console.log(`[runCarryForward] Processing entitlement:`, {
            employeeId: entitlement.employeeId?.toString(),
            yearlyEntitlement: entitlement.yearlyEntitlement,
            accruedRounded: entitlement.accruedRounded,
            accruedActual: entitlement.accruedActual,
            currentCarryForward: entitlement.carryForward || 0,
            taken: entitlement.taken,
            pending: entitlement.pending,
            storedRemaining: entitlement.remaining,
            calculatedRemaining: currentRemaining,
            maxCarryForward: effectiveMaxCarryForward,
            potentialCarryForward: potentialCarryForward,
          });

          // Use effectiveMaxCarryForward (handles case where maxCarryForward is 0 but carryForwardAllowed is true)
          // Use the RECALCULATED remaining balance, not the stored one
          const carryForwardAmount = Math.min(
            potentialCarryForward,
            effectiveMaxCarryForward,
          );

          console.log(`[runCarryForward] Calculated carryForwardAmount: ${carryForwardAmount}`);

          // Only process if there's something to carry forward
          if (carryForwardAmount <= 0) {
            console.log(`[runCarryForward] Skipping - carryForwardAmount is ${carryForwardAmount}`);
            console.log(`[runCarryForward] ⚠️ WARNING: No balance to carry forward. Details:`, {
              employeeId: entitlement.employeeId?.toString(),
              yearlyEntitlement: entitlement.yearlyEntitlement,
              accruedRounded: entitlement.accruedRounded,
              taken: entitlement.taken,
              pending: entitlement.pending,
              currentCarryForward: entitlement.carryForward || 0,
              calculatedRemaining: currentRemaining,
              suggestion: currentRemaining === 0 && entitlement.yearlyEntitlement > 0 
                ? 'Consider running accruals first, or this may be expected if all leave was used/reset'
                : 'This is expected if remaining balance is 0'
            });
            results.push({
              employeeId: entitlement.employeeId,
              status: 'skipped',
              reason: effectiveMaxCarryForward === 0 
                ? 'Max carry forward is 0 in policy' 
                : `No remaining balance to carry forward (current remaining: ${currentRemaining.toFixed(2)} days). Accrued: ${entitlement.accruedRounded}, Taken: ${entitlement.taken}, Pending: ${entitlement.pending}`,
              carryForwardAmount: 0,
              newBalance: currentRemaining,
              details: {
                yearlyEntitlement: entitlement.yearlyEntitlement,
                accruedRounded: entitlement.accruedRounded,
                accruedActual: entitlement.accruedActual,
                taken: entitlement.taken,
                pending: entitlement.pending,
                currentCarryForward: entitlement.carryForward || 0,
                calculatedRemaining: currentRemaining,
              }
            });
            continue;
          }

          // Record the previous remaining balance and carryForward for reference
          const previousRemaining = currentRemaining; // Use recalculated remaining
          const previousCarryForward = entitlement.carryForward || 0;
          
          // Calculate new remaining: subtract the carry forward amount from current remaining
          // The carryForward field will be set to the amount being carried forward
          // When carry forward happens, we're moving days FROM remaining TO carryForward
          // So remaining should decrease by the carry forward amount
          const newRemaining = previousRemaining - carryForwardAmount;
          
          // Ensure remaining doesn't go negative (shouldn't happen if carryForwardAmount <= remaining)
          if (newRemaining < 0) {
            console.error(`[runCarryForward] ❌ Carry forward amount exceeds remaining:`, {
              employeeId: entitlement.employeeId?.toString(),
              carryForwardAmount,
              previousRemaining,
              newRemaining,
              accruedRounded: entitlement.accruedRounded,
              taken: entitlement.taken,
              pending: entitlement.pending,
            });
            throw new Error(`Carry forward amount (${carryForwardAmount}) exceeds remaining balance (${previousRemaining}). This should not happen - carryForwardAmount should be min(remaining, maxCarryForward)`);
          }
          
          // Round to 2 decimal places to avoid floating point precision issues
          const roundedRemaining = Math.round(newRemaining * 100) / 100;
          const roundedCarryForward = Math.round(carryForwardAmount * 100) / 100;

          // Atomically set carryForward and remaining
          // Note: We're setting carryForward to the NEW amount (replacing any old value)
          // and decreasing remaining by that amount
          console.log(`[runCarryForward] Updating entitlement:`, {
            entitlementId: entitlement._id.toString(),
            previousRemaining,
            previousCarryForward,
            newRemaining: roundedRemaining,
            newCarryForward: roundedCarryForward,
          });

          // Fetch fresh document to ensure we have the latest version
          const freshEntitlement = await this.leaveEntitlementModel
            .findById(entitlement._id)
            .exec();

          if (!freshEntitlement) {
            throw new Error(`Entitlement not found: ${entitlement._id} for employee ${entitlement.employeeId?.toString()}`);
          }

          // Update the fields
          freshEntitlement.carryForward = roundedCarryForward;
          freshEntitlement.remaining = roundedRemaining;
          
          // Save the document with error handling
          let updated;
          try {
            updated = await freshEntitlement.save();
          } catch (saveError: any) {
            console.error(`[runCarryForward] ❌ Save error:`, {
              entitlementId: entitlement._id.toString(),
              error: saveError.message,
              validationErrors: saveError.errors,
            });
            throw new Error(`Failed to save entitlement: ${saveError.message || 'Unknown save error'}`);
          }
          
          if (!updated) {
            throw new Error(`Save returned null for entitlement ${entitlement._id}`);
          }
          
          // Verify the calculation is correct after save
          // After updating carryForward and remaining, recalculate to ensure consistency
          const verifyRemaining = this.calculateRemaining(updated);
          
          console.log(`[runCarryForward] Verification after save:`, {
            employeeId: entitlement.employeeId?.toString(),
            accruedRounded: updated.accruedRounded,
            carryForward: updated.carryForward,
            taken: updated.taken,
            pending: updated.pending,
            savedRemaining: updated.remaining,
            calculatedRemaining: verifyRemaining,
            difference: Math.abs(verifyRemaining - updated.remaining),
          });
          
          // If there's a mismatch, update remaining to match the calculation
          // This ensures remaining = accruedRounded + carryForward - taken - pending
          let finalRemaining = updated.remaining;
          if (Math.abs(verifyRemaining - updated.remaining) > 0.01) {
            console.warn(`[runCarryForward] ⚠️ Remaining mismatch after save. Saved: ${updated.remaining}, Calculated: ${verifyRemaining}. Updating...`);
            updated.remaining = verifyRemaining;
            finalRemaining = verifyRemaining;
            try {
              await updated.save();
              console.log(`[runCarryForward] ✅ Corrected remaining to ${verifyRemaining}`);
            } catch (recalcError: any) {
              console.error(`[runCarryForward] ❌ Error saving recalculated remaining:`, recalcError.message);
              // Don't throw - the main update succeeded, this is just a correction
            }
          }

          // Verify the update persisted by fetching again
          const verification = await this.leaveEntitlementModel
            .findById(entitlement._id)
            .select('carryForward remaining accruedRounded taken pending')
            .lean()
            .exec();

          console.log(`[runCarryForward] ✅ Successfully updated:`, {
            employeeId: entitlement.employeeId?.toString(),
            carryForward: updated.carryForward,
            remaining: updated.remaining,
            finalRemaining,
            verificationCarryForward: verification?.carryForward,
            verificationRemaining: verification?.remaining,
            verificationAccruedRounded: verification?.accruedRounded,
            verificationTaken: verification?.taken,
            verificationPending: verification?.pending,
          });

          // Double-check the values were saved correctly
          // Use finalRemaining (which may have been corrected) for comparison
          if (verification) {
            const carryForwardDiff = Math.abs((verification.carryForward || 0) - roundedCarryForward);
            const remainingDiff = Math.abs((verification.remaining || 0) - finalRemaining);
            
            // Also verify the calculation matches
            const verificationCalculatedRemaining = (verification.accruedRounded || 0) + 
              (verification.carryForward || 0) - 
              (verification.taken || 0) - 
              (verification.pending || 0);
            const calculationDiff = Math.abs(verification.remaining - verificationCalculatedRemaining);
            
            if (carryForwardDiff > 0.01 || remainingDiff > 0.01) {
              console.error(`[runCarryForward] ⚠️ WARNING: Values may not have persisted correctly!`, {
                expectedCarryForward: roundedCarryForward,
                actualCarryForward: verification.carryForward,
                carryForwardDiff: carryForwardDiff,
                expectedRemaining: finalRemaining,
                actualRemaining: verification.remaining,
                remainingDiff: remainingDiff,
                verificationCalculatedRemaining,
                calculationDiff,
              });
              
              // Create detailed error message showing which value(s) failed
              const errors: string[] = [];
              if (carryForwardDiff > 0.01) {
                errors.push(`carryForward: expected ${roundedCarryForward}, got ${verification.carryForward}`);
              }
              if (remainingDiff > 0.01) {
                errors.push(`remaining: expected ${finalRemaining}, got ${verification.remaining}`);
              }
              if (calculationDiff > 0.01) {
                errors.push(`remaining calculation mismatch: saved ${verification.remaining}, but calculated ${verificationCalculatedRemaining} from (accruedRounded: ${verification.accruedRounded} + carryForward: ${verification.carryForward} - taken: ${verification.taken} - pending: ${verification.pending})`);
              }
              
              throw new Error(`Update verification failed. ${errors.join('; ')}`);
            }
          }

          results.push({
            employeeId: entitlement.employeeId,
            status: 'success',
            carryForwardAmount: roundedCarryForward,
            expiringAmount: 0, // you can change this later if you track expired days
            newBalance: updated.remaining,
          });
          successful++;
        } catch (err) {
          failed++;
          const errorMessage = (err as any).message || String(err);
          const errorStack = (err as any).stack;
          console.error(`[runCarryForward] ❌ Error processing entitlement:`, {
            employeeId: entitlement.employeeId?.toString(),
            entitlementId: entitlement._id?.toString(),
            error: errorMessage,
            stack: errorStack,
            entitlementData: {
              accruedRounded: entitlement.accruedRounded,
              accruedActual: entitlement.accruedActual,
              taken: entitlement.taken,
              pending: entitlement.pending,
              carryForward: entitlement.carryForward,
              remaining: entitlement.remaining,
            }
          });
          results.push({
            employeeId: entitlement.employeeId,
            status: 'failed',
            error: errorMessage,
            entitlementId: entitlement._id?.toString(),
            details: {
              accruedRounded: entitlement.accruedRounded,
              accruedActual: entitlement.accruedActual,
              taken: entitlement.taken,
              pending: entitlement.pending,
              carryForward: entitlement.carryForward || 0,
              remaining: entitlement.remaining,
            }
          });
        }
      }

      console.log(`[runCarryForward] Final results:`, {
        successful,
        failed,
        total: entitlements.length,
      });

      return {
        processedDate: processDate,
        leaveTypeId,
        successful,
        failed,
        total: entitlements.length,
        details: results,
      };
    } catch (error) {
      throw new Error(`Failed to run carry-forward: ${(error as any).message}`);
    }
  }

  // REQ-042: Adjust accruals during unpaid leave or long absence
  async adjustAccrual(
    employeeId: string,
    leaveTypeId: string,
    adjustmentType: string,
    adjustmentAmount: number,
    fromDate: Date,
    toDate?: Date,
    reason?: string,
    notes?: string,
  ): Promise<any> {
    try {
      const entitlement = await this.getLeaveEntitlement(
        employeeId,
        leaveTypeId,
      );
      // Normalize the starting remaining value to avoid floating point precision issues
      const previousBalance = Math.round(entitlement.remaining * 100) / 100;
      entitlement.remaining = previousBalance;

      // Get policy for rounding rule (needed for all adjustment types)
      // Try multiple ways to find the policy in case of ID format issues
      let leavePolicy = await this.leavePolicyModel
        .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
        .exec();
      
      // If not found, try as string
      if (!leavePolicy) {
        leavePolicy = await this.leavePolicyModel
          .findOne({ leaveTypeId: leaveTypeId })
          .exec();
      }
      
      // If still not found, try using the entitlement's leaveTypeId
      if (!leavePolicy && entitlement.leaveTypeId) {
        const entLeaveTypeId = entitlement.leaveTypeId as any;
        const entitlementLeaveTypeId = entLeaveTypeId instanceof Types.ObjectId 
          ? entLeaveTypeId 
          : new Types.ObjectId(String(entLeaveTypeId));
        leavePolicy = await this.leavePolicyModel
          .findOne({ leaveTypeId: entitlementLeaveTypeId })
          .exec();
      }
      
      const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
      
      console.log(`[adjustAccrual] Policy lookup:`, {
        leaveTypeId,
        entitlementLeaveTypeId: entitlement.leaveTypeId ? String(entitlement.leaveTypeId) : 'N/A',
        policyFound: !!leavePolicy,
        roundingRule: roundingRule,
        policyRoundingRule: leavePolicy?.roundingRule,
        adjustmentType: adjustmentType
      });

      switch (adjustmentType) {
        case 'suspension':
          entitlement.accruedActual -= adjustmentAmount;
          // Round to 2 decimal places to avoid floating point precision issues
          entitlement.accruedActual = Math.round(entitlement.accruedActual * 100) / 100;
          break;
        case 'reduction':
          entitlement.remaining -= adjustmentAmount;
          console.log(`[adjustAccrual] Reduction - Before rounding: ${entitlement.remaining}`);
          // Apply policy rounding rule to remaining
          entitlement.remaining = this.applyRoundingRule(
            entitlement.remaining,
            roundingRule,
          );
          console.log(`[adjustAccrual] Reduction - After rounding (${roundingRule}): ${entitlement.remaining}`);
          break;
        case 'adjustment':
          entitlement.remaining += adjustmentAmount;
          console.log(`[adjustAccrual] Adjustment - Before rounding: ${entitlement.remaining}, Adjustment amount: ${adjustmentAmount}`);
          // Apply policy rounding rule to remaining
          const beforeRounding = entitlement.remaining;
          entitlement.remaining = this.applyRoundingRule(
            entitlement.remaining,
            roundingRule,
          );
          console.log(`[adjustAccrual] Adjustment - After rounding (${roundingRule}): ${beforeRounding} -> ${entitlement.remaining}`);
          break;
        case 'restoration':
          entitlement.accruedActual += adjustmentAmount;
          // Round to 2 decimal places to avoid floating point precision issues
          entitlement.accruedActual = Math.round(entitlement.accruedActual * 100) / 100;
          break;
        default:
          throw new Error('Invalid adjustment type');
      }

      // Update accruedRounded if we changed accruedActual
      if (adjustmentType === 'suspension' || adjustmentType === 'restoration') {
        entitlement.accruedRounded = this.applyRoundingRule(
          entitlement.accruedActual,
          roundingRule,
        );
      }

      // Save and get the updated doc back
      // For reduction/adjustment: directly update remaining without touching accrued fields
      // For suspension/restoration: update accrued and let remaining be recalculated
      let updated: LeaveEntitlementDocument;
      
      if (adjustmentType === 'reduction' || adjustmentType === 'adjustment') {
        // Direct remaining change - update directly without going through updateLeaveEntitlement
        // to avoid any recalculation logic that might interfere
        // Ensure the rounded value is what we save
        const roundedRemaining = entitlement.remaining;
        console.log(`[adjustAccrual] Saving remaining value: ${roundedRemaining} (rounded with rule: ${roundingRule})`);
        
        updated = await this.leaveEntitlementModel
          .findByIdAndUpdate(
            entitlement._id.toString(),
            { $set: { remaining: roundedRemaining } },
            { new: true }
          )
          .exec();
        
        if (!updated) {
          throw new Error('Failed to update entitlement');
        }
        
        // Verify the value was saved correctly
        console.log(`[adjustAccrual] Saved remaining value: ${updated.remaining}, Expected: ${roundedRemaining}`);
        
        // Ensure the returned document has the correct rounded value
        updated.remaining = roundedRemaining;
      } else {
        // Suspension/restoration affect accrued, so update accrued fields
        const updateData: any = {
          accruedActual: entitlement.accruedActual,
          accruedRounded: entitlement.accruedRounded,
        };
        
        updated = await this.updateLeaveEntitlement(
          entitlement._id.toString(),
          updateData,
        );

        if (!updated) {
          throw new Error('Failed to update entitlement');
        }

        // Recalculate remaining for suspension/restoration (which affect accrued)
        updated.remaining = this.calculateRemaining(updated);
        // Round to 2 decimal places to avoid floating point precision issues
        updated.remaining = Math.round(updated.remaining * 100) / 100;
        await updated.save();
      }
      
      // Clamp to avoid negative remaining (optional - depends on business rules)
      // updated.remaining = Math.max(0, updated.remaining);

      return {
        success: true,
        employeeId,
        leaveTypeId,
        adjustmentType,
        adjustmentAmount,
        previousBalance,
        newBalance: updated.remaining,
        effectiveDate: fromDate,
        reason,
        notes,
      };
    } catch (error) {
      throw new Error(`Failed to adjust accrual: ${(error as any).message}`);
    }
  }

  // Business Rule: Calculate leave duration net of non-working days (weekends and holidays)
  private async calculateWorkingDays(
    startDate: Date,
    endDate: Date,
    employeeId: string,
  ): Promise<number> {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get calendar for the year
    const year = currentDate.getFullYear();
    const calendar = await this.calendarModel
      .findOne({ year })
      .populate('holidays')
      .exec();

    // Get holidays as date strings for quick lookup
    const holidayDates = new Set<string>();
    if (calendar && calendar.holidays) {
      const HolidayModel = this.calendarModel.db.model('Holiday');
      for (const holidayId of calendar.holidays) {
        try {
          const holiday = await HolidayModel.findById(holidayId).exec();
          if (holiday && holiday.startDate) {
            const holidayDate = new Date(holiday.startDate);
            holidayDates.add(holidayDate.toISOString().split('T')[0]);
          }
        } catch (err) {
          // Skip if holiday not found
        }
      }
    }

    // Check blocked periods
    const blockedPeriods = calendar?.blockedPeriods || [];

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split('T')[0];

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check if it's a holiday
        const isHoliday = holidayDates.has(dateString);

        // Check if it's in a blocked period
        const isBlocked = blockedPeriods.some((period) => {
          const periodStart = new Date(period.from);
          const periodEnd = new Date(period.to);
          return currentDate >= periodStart && currentDate <= periodEnd;
        });

        // Count as working day if not holiday and not blocked
        if (!isHoliday && !isBlocked) {
          workingDays++;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  // REQ-007, BR 7: Check eligibility rules for leave type based on tenure, position, and contract type
  async checkEligibility(
    employeeId: string,
    leaveTypeId: string,
    employeeProfile?: EmployeeProfileDocument,
  ): Promise<void> {
    // Fetch employee profile if not provided
    let employee: EmployeeProfileDocument;
    if (!employeeProfile) {
      employee = await this.employeeProfileModel
        .findById(employeeId)
        .populate('primaryPositionId', 'code title')
        .exec();
      if (!employee) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }
    } else {
      employee = employeeProfile;
    }

    // Fetch leave policy for the leave type
    const leavePolicy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
      .exec();

    // If no policy exists or no eligibility rules are set, allow the request
    if (!leavePolicy || !leavePolicy.eligibility) {
      return;
    }

    const eligibility = leavePolicy.eligibility;
    const errors: string[] = [];

    // Check minimum tenure requirement
    if (eligibility.minTenureMonths !== undefined && eligibility.minTenureMonths !== null) {
      const hireDate = new Date(employee.dateOfHire);
      const today = new Date();
      
      // Calculate months of service
      const yearsDiff = today.getFullYear() - hireDate.getFullYear();
      const monthsDiff = today.getMonth() - hireDate.getMonth();
      const totalMonths = yearsDiff * 12 + monthsDiff;
      
      // Adjust for days (if today's day is less than hire day, subtract a month)
      if (today.getDate() < hireDate.getDate()) {
        const adjustedMonths = totalMonths - 1;
        if (adjustedMonths < eligibility.minTenureMonths) {
          errors.push(
            `Minimum tenure requirement not met. Required: ${eligibility.minTenureMonths} months, Current: ${adjustedMonths} months`,
          );
        }
      } else {
        if (totalMonths < eligibility.minTenureMonths) {
          errors.push(
            `Minimum tenure requirement not met. Required: ${eligibility.minTenureMonths} months, Current: ${totalMonths} months`,
          );
        }
      }
    }

    // Check position eligibility
    if (
      eligibility.positionsAllowed &&
      Array.isArray(eligibility.positionsAllowed) &&
      eligibility.positionsAllowed.length > 0
    ) {
      const employeePosition = employee.primaryPositionId;
      if (!employeePosition) {
        errors.push('Employee does not have an assigned position');
      } else {
        // Handle both populated position object and ObjectId
        let positionCode: string | null = null;
        if (typeof employeePosition === 'object' && employeePosition !== null) {
          positionCode = (employeePosition as any).code || null;
        }

        if (!positionCode) {
          // If position is not populated, try to fetch it
          const PositionModel = this.employeeProfileModel.db.model('Position');
          const position = await PositionModel.findById(employee.primaryPositionId).exec();
          if (position) {
            positionCode = (position as any).code;
          }
        }

        if (!positionCode) {
          errors.push('Unable to determine employee position');
        } else {
          const isPositionAllowed = eligibility.positionsAllowed.includes(positionCode);
          if (!isPositionAllowed) {
            errors.push(
              `Position '${positionCode}' is not eligible for this leave type. Allowed positions: ${eligibility.positionsAllowed.join(', ')}`,
            );
          }
        }
      }
    }

    // Check contract type eligibility
    if (
      eligibility.contractTypesAllowed &&
      Array.isArray(eligibility.contractTypesAllowed) &&
      eligibility.contractTypesAllowed.length > 0
    ) {
      const employeeContractType = employee.contractType;
      if (!employeeContractType) {
        errors.push('Employee does not have a contract type assigned');
      } else {
        const isContractTypeAllowed = eligibility.contractTypesAllowed.includes(
          employeeContractType,
        );
        if (!isContractTypeAllowed) {
          errors.push(
            `Contract type '${employeeContractType}' is not eligible for this leave type. Allowed contract types: ${eligibility.contractTypesAllowed.join(', ')}`,
          );
        }
      }
    }

    // Throw error if any eligibility checks failed
    if (errors.length > 0) {
      throw new BadRequestException(
        `Eligibility check failed:\n${errors.join('\n')}`,
      );
    }
  }

  // Business Rule: Track number of times employee has taken maternity leave
  async getMaternityLeaveCount(employeeId: string): Promise<number> {
    const maternityLeaveType = await this.leaveTypeModel
      .findOne({ code: 'MATERNITY_LEAVE' })
      .exec();
    if (!maternityLeaveType) {
      return 0;
    }

    const maternityLeaves = await this.leaveRequestModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: maternityLeaveType._id,
        status: LeaveStatus.APPROVED,
      })
      .exec();

    return maternityLeaves.length;
  }

  // Business Rule: Calculate reset date based on criterion (Hire date, First Vacation Date, Revised Hire Date, Work Receiving Date)
  async calculateResetDate(
    employeeId: string,
    criterion:
      | 'HIRE_DATE'
      | 'FIRST_VACATION_DATE'
      | 'REVISED_HIRE_DATE'
      | 'WORK_RECEIVING_DATE',
    leaveTypeId: string,
  ): Promise<Date> {
    const employeeProfile = await this.employeeProfileModel
      .findById(employeeId)
      .exec();
    if (!employeeProfile) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    let baseDate: Date;

    switch (criterion) {
      case 'HIRE_DATE':
        baseDate = new Date(employeeProfile.dateOfHire);
        break;
      case 'FIRST_VACATION_DATE':
        // Get first approved leave request
        const firstLeave = await this.leaveRequestModel
          .findOne({
            employeeId: new Types.ObjectId(employeeId),
            status: LeaveStatus.APPROVED,
          })
          .sort({ 'dates.from': 1 })
          .exec();
        baseDate = firstLeave
          ? new Date(firstLeave.dates.from)
          : new Date(employeeProfile.dateOfHire);
        break;
      case 'REVISED_HIRE_DATE':
        // Use contractStartDate if available, otherwise hire date
        baseDate = employeeProfile.contractStartDate
          ? new Date(employeeProfile.contractStartDate)
          : new Date(employeeProfile.dateOfHire);
        break;
      case 'WORK_RECEIVING_DATE':
        // Use contractStartDate as work receiving date
        baseDate = employeeProfile.contractStartDate
          ? new Date(employeeProfile.contractStartDate)
          : new Date(employeeProfile.dateOfHire);
        break;
      default:
        baseDate = new Date(employeeProfile.dateOfHire);
    }

    // Calculate next reset date (one year from base date)
    const nextResetDate = new Date(baseDate);
    nextResetDate.setFullYear(nextResetDate.getFullYear() + 1);

    // If next reset date has passed, calculate for current year
    const today = new Date();
    if (nextResetDate < today) {
      const yearsSinceBase = today.getFullYear() - baseDate.getFullYear();
      nextResetDate.setFullYear(baseDate.getFullYear() + yearsSinceBase + 1);
    }

    return nextResetDate;
  }

  // Business Rule: Update nextResetDate based on criterion
  async updateResetDateForEmployee(
    employeeId: string,
    leaveTypeId: string,
    criterion:
      | 'HIRE_DATE'
      | 'FIRST_VACATION_DATE'
      | 'REVISED_HIRE_DATE'
      | 'WORK_RECEIVING_DATE',
  ): Promise<void> {
    const resetDate = await this.calculateResetDate(
      employeeId,
      criterion,
      leaveTypeId,
    );
    const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);

    await this.updateLeaveEntitlement(entitlement._id.toString(), {
      nextResetDate: resetDate,
    });
  }

  // NEW CODE: Upload attachment for leave request
  async uploadAttachment(file: Express.Multer.File): Promise<AttachmentDocument> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Ensure uploads directory exists
    const uploadsDir = './src/leaves/uploads/attachments';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // FileInterceptor with diskStorage should set file.path
    // If path is not set, construct it from destination and filename
    let filePath = file.path;
    if (!filePath && file.filename) {
      filePath = path.join(uploadsDir, file.filename);
    }
    
    if (!filePath) {
      throw new BadRequestException('File path is missing. File upload failed.');
    }

    // Create attachment record
    const attachment = new this.attachmentModel({
      originalName: file.originalname,
      filePath: filePath,
      fileType: file.mimetype,
      size: file.size,
    });

    return await attachment.save();
  }

  // NEW CODE: Get attachment by ID
  async getAttachmentById(id: string): Promise<AttachmentDocument | null> {
    const attachmentId = this.toObjectId(id);
    if (!attachmentId) {
      throw new BadRequestException('Invalid attachment ID');
    }
    return await this.attachmentModel.findById(attachmentId).exec();
  }

  // NEW CODE: Verify document
  async verifyDocument(
    leaveRequestId: string,
    hrUserId: string,
    verificationNotes?: string,
  ): Promise<LeaveRequestDocument> {
    const requestId = this.toObjectId(leaveRequestId) as Types.ObjectId;
    const hrUserObjectId = this.toObjectId(hrUserId) as Types.ObjectId;

    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (!leaveRequest.attachmentId) {
      throw new BadRequestException('Leave request has no attachment to verify');
    }

    // NEW CODE: Track document verification in approvalFlow (without modifying schema)
    // Add verification entry to approvalFlow
    leaveRequest.approvalFlow.push({
      role: 'HR Manager - Document Verification',
      status: 'verified',
      decidedBy: hrUserObjectId,
      decidedAt: new Date(),
    });

    // Store verification notes in justification if needed (or we can use a comment field)
    // For now, we'll add it as a note in the approvalFlow entry
    // Note: Since approvalFlow doesn't have a notes field, we can prepend to justification
    if (verificationNotes) {
      const existingJustification = leaveRequest.justification || '';
      leaveRequest.justification = `[Document Verified: ${verificationNotes}] ${existingJustification}`;
    }

    return await leaveRequest.save();
  }

  // NEW CODE: Reject document
  async rejectDocument(
    leaveRequestId: string,
    hrUserId: string,
    rejectionReason: string,
  ): Promise<LeaveRequestDocument> {
    const requestId = this.toObjectId(leaveRequestId) as Types.ObjectId;
    const hrUserObjectId = this.toObjectId(hrUserId) as Types.ObjectId;

    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (!leaveRequest.attachmentId) {
      throw new BadRequestException('Leave request has no attachment to reject');
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    // NEW CODE: Track document rejection in approvalFlow (without modifying schema)
    // Add rejection entry to approvalFlow
    leaveRequest.approvalFlow.push({
      role: 'HR Manager - Document Verification',
      status: 'rejected',
      decidedBy: hrUserObjectId,
      decidedAt: new Date(),
    });

    // Store rejection reason in justification
    const existingJustification = leaveRequest.justification || '';
    leaveRequest.justification = `[Document Rejected: ${rejectionReason}] ${existingJustification}`;

    return await leaveRequest.save();
  }

  // NEW CODE: Department Head reject document (also rejects the leave request)
  async rejectDocumentByDepartmentHead(
    leaveRequestId: string,
    departmentHeadId: string,
    rejectionReason: string,
  ): Promise<LeaveRequestDocument> {
    const requestId = this.toObjectId(leaveRequestId) as Types.ObjectId;
    const deptHeadObjectId = this.toObjectId(departmentHeadId) as Types.ObjectId;

    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Ensure the leave request is in PENDING status
    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Leave request has already been ${leaveRequest.status}`,
      );
    }

    if (!leaveRequest.attachmentId) {
      throw new BadRequestException('Leave request has no attachment to reject');
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Verify the user is a department head, HR Manager, or Payroll Manager
    const managerSystemRole = await this.systemRoleModel
      .findOne({ employeeProfileId: deptHeadObjectId, isActive: true })
      .exec();
    const isDepartmentHead = managerSystemRole?.roles?.includes(SystemRole.DEPARTMENT_HEAD) || false;
    const isHRManager = managerSystemRole?.roles?.includes(SystemRole.HR_MANAGER) || false;
    const isPayrollManager = managerSystemRole?.roles?.includes(SystemRole.PAYROLL_MANAGER) || false;

    if (!isDepartmentHead && !isHRManager && !isPayrollManager) {
      throw new BadRequestException('Only department heads, HR managers, and payroll managers can reject documents');
    }

    // Find the pending approval that needs to be updated
    // For HR Managers and Payroll Managers: look for Manager or HR Manager role
    // For Department Heads: look for Manager or Department Head role
    let pendingApproval;
    if (isHRManager || isPayrollManager) {
      pendingApproval = leaveRequest.approvalFlow.find(
        (approval) => 
          (approval.status === 'PENDING' || approval.status === LeaveStatus.PENDING) &&
          (approval.role === 'Manager' || approval.role === 'HR Manager')
      );
    } else {
      pendingApproval = leaveRequest.approvalFlow.find(
        (approval) => 
          (approval.status === 'PENDING' || approval.status === LeaveStatus.PENDING) &&
          (approval.role === 'Manager' || approval.role === 'Department Head' || approval.role === 'Departement_Head')
      );
    }

    // Check if the user is a delegate
    const delegatedManagerId = this.getDelegatedManagerId(departmentHeadId);
    const isDelegate = delegatedManagerId !== null;

    // For HR Managers and Payroll Managers: allow rejecting documents for team members
    // For Department Heads: verify they are the direct supervisor
    // UNLESS the user is a delegate - delegates can reject documents on behalf of the manager
    if (isHRManager || isPayrollManager) {
      // HR Managers and Payroll Managers can reject documents for their team members
      // UNLESS they are a delegate - delegates can reject on behalf of the manager
      if (!isDelegate) {
        // Verify the employee is in the manager's team (using filterTeamLeaveData logic)
        const employeeId = leaveRequest.employeeId.toString();
        const managerProfile = await this.employeeProfileModel.findById(departmentHeadId).exec();
        const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();
        
        if (!managerProfile || !employeeProfile) {
          throw new BadRequestException(
            'Unable to verify team relationship. Please ensure both employee and manager profiles exist.',
          );
        }
        
        // Check if employee's supervisorPositionId matches manager's primaryPositionId
        const managerPositionId = managerProfile.primaryPositionId;
        const employeeSupervisorPositionId = (employeeProfile as any).supervisorPositionId;
        
        if (!managerPositionId || !employeeSupervisorPositionId) {
          throw new BadRequestException(
            'Unable to verify team relationship. Employee or manager may not have position assignments.',
          );
        }
        
        const managerPosIdStr = managerPositionId instanceof Types.ObjectId 
          ? managerPositionId.toString() 
          : String(managerPositionId);
        const empSupervisorPosIdStr = employeeSupervisorPositionId instanceof Types.ObjectId
          ? employeeSupervisorPositionId.toString()
          : String(employeeSupervisorPositionId);
        
        const isTeamMember = managerPosIdStr === empSupervisorPosIdStr;
        
        if (!isTeamMember) {
          const roleName = isPayrollManager ? 'Payroll Manager' : 'HR Manager';
          throw new BadRequestException(
            `Only team members can have their documents rejected by ${roleName}.`,
          );
        }
      }
      // If user is a delegate, skip the team member check - they can reject on behalf of the manager
    } else {
      // Department Head: verify they are the direct supervisor
      // UNLESS the user is a delegate - delegates can reject on behalf of the manager
      if (!pendingApproval) {
        throw new BadRequestException(
          'This leave request is not pending your approval',
        );
      }

      if (!isDelegate) {
        // Verify the department head is the direct supervisor of the employee
        const employeeId = leaveRequest.employeeId.toString();
        const deptHeadProfile = await this.employeeProfileModel.findById(departmentHeadId).exec();
        const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();
        
        if (!deptHeadProfile || !employeeProfile) {
          throw new BadRequestException(
            'Unable to verify supervisor relationship. Please ensure both employee and department head profiles exist.',
          );
        }
        
        const deptHeadPositionId = deptHeadProfile.primaryPositionId;
        const employeeSupervisorPositionId = (employeeProfile as any).supervisorPositionId;
        
        if (!deptHeadPositionId || !employeeSupervisorPositionId) {
          throw new BadRequestException(
            'Unable to verify supervisor relationship. Employee or department head may not have position assignments.',
          );
        }
        
        // Use flexible comparison to handle both ObjectId and string formats
        const deptHeadPosIdStr = deptHeadPositionId instanceof Types.ObjectId 
          ? deptHeadPositionId.toString() 
          : String(deptHeadPositionId);
        const empSupervisorPosIdStr = employeeSupervisorPositionId instanceof Types.ObjectId
          ? employeeSupervisorPositionId.toString()
          : String(employeeSupervisorPositionId);
        
        const isDirectSupervisor = deptHeadPosIdStr === empSupervisorPosIdStr;
        
        if (!isDirectSupervisor) {
          throw new BadRequestException(
            'Only the direct supervisor can reject documents for this leave request.',
          );
        }
      }
      // If user is a delegate, skip the direct supervisor check - they can reject on behalf of the manager
    }

    // FIX: Use findByIdAndUpdate to avoid VersionError (handles concurrent modifications)
    const rejectionRole = isHRManager 
      ? 'HR Manager - Document Verification' 
      : isPayrollManager
      ? 'Payroll Manager - Document Verification'
      : 'Department Head - Document Verification';
    
    const rejectedBy = isHRManager ? 'HR Manager' : isPayrollManager ? 'Payroll Manager' : 'Department Head';
    const rejectionJustification = `[Request Rejected: Document was rejected by ${rejectedBy}. Reason: ${rejectionReason}]`;

    // Release pending balance first (before updating leave request)
    const entitlement = await this.getLeaveEntitlement(
      leaveRequest.employeeId.toString(),
      leaveRequest.leaveTypeId.toString(),
    );
    entitlement.pending = Math.max(
      0,
      entitlement.pending - leaveRequest.durationDays,
    );
    await this.updateLeaveEntitlement(entitlement._id.toString(), {
      pending: entitlement.pending,
    });

    // Use findByIdAndUpdate with $set to atomically update the document
    // If there's a pending approval, update it; otherwise, push a new entry
    const updateQuery: any = {
      $set: {
        status: LeaveStatus.REJECTED,
        justification: `${rejectionJustification} ${leaveRequest.justification || ''}`.trim(),
      },
    };

    const updateOptions: any = { new: true };

    // Update pending approval if found using arrayFilters (more reliable than index-based updates)
    if (pendingApproval) {
      // Use arrayFilters to update the existing pending approval entry
      updateQuery.$set['approvalFlow.$[pendingApproval].status'] = LeaveStatus.REJECTED;
      updateQuery.$set['approvalFlow.$[pendingApproval].decidedBy'] = deptHeadObjectId;
      updateQuery.$set['approvalFlow.$[pendingApproval].decidedAt'] = new Date();
      
      // MongoDB array filters: match the pending approval by role and status
      const pendingStatus = pendingApproval.status === 'PENDING' ? 'PENDING' : LeaveStatus.PENDING;
      updateOptions.arrayFilters = [
        {
          'pendingApproval.role': pendingApproval.role,
          'pendingApproval.status': pendingStatus
        }
      ];
    } else {
      // If no pending approval found, push a new entry to approvalFlow
      updateQuery.$push = {
        approvalFlow: {
          role: rejectionRole,
          status: 'rejected',
          decidedBy: deptHeadObjectId,
          decidedAt: new Date(),
        },
      };
    }
    
    const updatedLeaveRequest = await this.leaveRequestModel.findByIdAndUpdate(
      requestId,
      updateQuery,
      updateOptions
    ).exec();

    if (!updatedLeaveRequest) {
      throw new NotFoundException('Leave request not found after update');
    }

    // Notify employee that the request was rejected
    await this.notifyStakeholders(updatedLeaveRequest, 'rejected');

    return updatedLeaveRequest;
  }

  // ==================== AUTOMATED SCHEDULED TASKS ====================

  /**
   * REQ-040: Automatically accrue leave days based on policy settings
   * Runs daily at 2 AM to check for due accruals
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async automatedAccrualJob() {
    console.log('[Automated Accrual] Starting scheduled accrual job...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all active leave policies
      const policies = await this.leavePolicyModel.find().exec();
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (const policy of policies) {
        try {
          const accrualMethod = policy.accrualMethod;
          const leaveTypeId = policy.leaveTypeId.toString();

          // Determine if accrual is due based on method
          let shouldAccrue = false;
          let accrualAmount = 0;

          if (accrualMethod === AccrualMethod.MONTHLY) {
            // Check if it's the first day of the month
            if (today.getDate() === 1) {
              shouldAccrue = true;
              accrualAmount = policy.monthlyRate || 0;
            }
          } else if (accrualMethod === AccrualMethod.YEARLY) {
            // Check if it's January 1st
            if (today.getMonth() === 0 && today.getDate() === 1) {
              shouldAccrue = true;
              accrualAmount = policy.yearlyRate || 0;
            }
          } else if (accrualMethod === AccrualMethod.PER_TERM) {
            // For per-term, accrue when reset date is reached
            // Get all entitlements for this leave type that are due for reset
            const entitlementsDue = await this.leaveEntitlementModel
              .find({
                leaveTypeId: policy.leaveTypeId,
                nextResetDate: { $lte: today },
              })
              .exec();

            if (entitlementsDue.length > 0) {
              shouldAccrue = true;
              // For per-term, use yearlyRate as the accrual amount
              accrualAmount = policy.yearlyRate || 0;
              
              // Process per-term accrual for these entitlements
              for (const entitlement of entitlementsDue) {
                try {
                  await this.autoAccrueLeave(
                    entitlement.employeeId.toString(),
                    leaveTypeId,
                    accrualAmount,
                    accrualMethod,
                    undefined,
                    'Automated per-term accrual from scheduled job',
                  );
                  totalSuccessful++;
                  totalProcessed++;
                } catch (err) {
                  console.error(
                    `[Automated Accrual] Failed for employee ${entitlement.employeeId}:`,
                    (err as any).message,
                  );
                  totalFailed++;
                  totalProcessed++;
                }
              }
            }
            continue; // Skip the regular accrual processing below
          }

          if (shouldAccrue && accrualAmount > 0) {
            console.log(
              `[Automated Accrual] Processing ${accrualMethod} accrual for leave type ${leaveTypeId}, amount: ${accrualAmount}`,
            );

            // Get all entitlements for this leave type
            const entitlements = await this.leaveEntitlementModel
              .find({ leaveTypeId: policy.leaveTypeId })
              .exec();

            for (const entitlement of entitlements) {
              try {
                // Check if accrual is due (lastAccrualDate should be before today)
                const lastAccrual = entitlement.lastAccrualDate;
                let needsAccrual = true;

                if (lastAccrual) {
                  const lastAccrualDate = new Date(lastAccrual);
                  lastAccrualDate.setHours(0, 0, 0, 0);

                  if (accrualMethod === AccrualMethod.MONTHLY) {
                    // For monthly, check if last accrual was in a previous month
                    needsAccrual =
                      lastAccrualDate.getMonth() < today.getMonth() ||
                      lastAccrualDate.getFullYear() < today.getFullYear();
                  } else if (accrualMethod === AccrualMethod.YEARLY) {
                    // For yearly, check if last accrual was in a previous year
                    needsAccrual =
                      lastAccrualDate.getFullYear() < today.getFullYear();
                  }
                }

                if (needsAccrual) {
                  await this.autoAccrueLeave(
                    entitlement.employeeId.toString(),
                    leaveTypeId,
                    accrualAmount,
                    accrualMethod,
                    undefined,
                    'Automated accrual from scheduled job',
                  );
                  totalSuccessful++;
                }
                totalProcessed++;
              } catch (err) {
                console.error(
                  `[Automated Accrual] Failed for employee ${entitlement.employeeId}:`,
                  (err as any).message,
                );
                totalFailed++;
              }
            }
          }
        } catch (err) {
          console.error(
            `[Automated Accrual] Error processing policy ${policy._id}:`,
            (err as any).message,
          );
        }
      }

      console.log(
        `[Automated Accrual] Completed. Processed: ${totalProcessed}, Successful: ${totalSuccessful}, Failed: ${totalFailed}`,
      );
    } catch (error) {
      console.error(
        '[Automated Accrual] Fatal error in scheduled job:',
        (error as any).message,
      );
    }
  }

  /**
   * REQ-041: Automatically run carry-forward when reset dates are reached
   * Runs daily at 3 AM to check for due carry-forwards
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  
  // REQ-023, BR 28: Auto-escalate leave requests pending for > 48 hours
  @Cron(CronExpression.EVERY_HOUR) // Check every hour for requests pending > 48 hours
  async autoEscalatePendingRequests() {
    try {
      console.log('[AUTO-ESCALATION] Checking for leave requests pending > 48 hours...');
      
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      // Find all pending requests created more than 48 hours ago
      const pendingRequests = await this.leaveRequestModel
        .find({
          status: LeaveStatus.PENDING,
          createdAt: { $lte: fortyEightHoursAgo },
        })
        .populate('employeeId', 'firstName lastName supervisorPositionId')
        .exec();
      
      console.log(`[AUTO-ESCALATION] Found ${pendingRequests.length} requests pending > 48 hours`);
      
      for (const request of pendingRequests) {
        try {
          const employee = request.employeeId as any;
          if (!employee || !employee.supervisorPositionId) {
            console.warn(`[AUTO-ESCALATION] Request ${request._id} has no employee or supervisorPositionId, skipping`);
            continue;
          }
          
          // Get the manager (department head) - use flexible query to handle both ObjectId and string
          const primaryPositionQuery = this.createFlexibleIdQuery('primaryPositionId', employee.supervisorPositionId);
          if (!primaryPositionQuery) {
            console.warn(`[AUTO-ESCALATION] Invalid supervisorPositionId format: ${employee.supervisorPositionId}`);
            continue;
          }
          
          const manager = await this.employeeProfileModel
            .findOne({
              ...primaryPositionQuery,
              status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
            })
            .select('_id employeeNumber firstName lastName')
            .lean()
            .exec();
          
          if (!manager) {
            console.warn(`[AUTO-ESCALATION] No manager found for request ${request._id}, skipping`);
            continue;
          }
          
          const managerId = manager._id.toString();
          
          // Check if manager has an active delegate
          const delegations = this.delegationMap.get(managerId);
          let hasActiveDelegate = false;
          let activeDelegateId: string | null = null;
          
          if (delegations && delegations.length > 0) {
            const activeDelegations = delegations.filter(
              (del) =>
                del.isActive &&
                now >= del.startDate &&
                now <= del.endDate,
            );
            
            if (activeDelegations.length > 0) {
              hasActiveDelegate = true;
              activeDelegateId = activeDelegations[0].delegateId;
            }
          }
          
          // If there's an active delegate, escalate to HR Manager
          // Otherwise, just log (the request is already with the manager)
          if (hasActiveDelegate && activeDelegateId) {
            console.log(`[AUTO-ESCALATION] Request ${request._id} has been pending > 48 hours with active delegate ${activeDelegateId}, escalating to HR Manager`);
            
            // Find HR Managers
            const hrManagerRoles = await this.systemRoleModel
              .find({
                roles: { $in: [SystemRole.HR_MANAGER] },
                isActive: true,
              })
              .select('employeeProfileId')
              .exec();
            
            const hrManagerIds = hrManagerRoles
              .map(role => role.employeeProfileId?.toString())
              .filter((id): id is string => !!id);
            
            // Notify HR Managers about the escalation
            for (const hrManagerId of hrManagerIds) {
              await this.notificationLogModel.create({
                to: new Types.ObjectId(hrManagerId),
                type: NotificationType.LEAVE_CREATED,
                message: `⚠️ ESCALATION: Leave request from ${employee.firstName || ''} ${employee.lastName || ''} has been pending for more than 48 hours and requires attention.`,
              });
            }
            
            // Also notify the delegate
            await this.notificationLogModel.create({
              to: new Types.ObjectId(activeDelegateId),
              type: NotificationType.LEAVE_CREATED,
              message: `⚠️ URGENT: Leave request from ${employee.firstName || ''} ${employee.lastName || ''} has been pending for more than 48 hours. Please review immediately.`,
            });
          } else {
            console.log(`[AUTO-ESCALATION] Request ${request._id} has been pending > 48 hours (no active delegate), manager should handle`);
          }
        } catch (error) {
          console.error(`[AUTO-ESCALATION] Error processing request ${request._id}:`, error);
        }
      }
      
      console.log('[AUTO-ESCALATION] Auto-escalation check completed');
    } catch (error) {
      console.error('[AUTO-ESCALATION] Error in auto-escalation job:', error);
    }
  }
  
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async automatedCarryForwardJob() {
    console.log('[Automated Carry-Forward] Starting scheduled carry-forward job...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all entitlements where nextResetDate is today or has passed
      const entitlementsDueForReset = await this.leaveEntitlementModel
        .find({
          nextResetDate: { $lte: today },
        })
        .exec();

      if (entitlementsDueForReset.length === 0) {
        console.log('[Automated Carry-Forward] No entitlements due for reset');
        return;
      }

      // Group by leaveTypeId to process carry-forward per leave type
      const byLeaveType = new Map<string, string[]>();

      for (const entitlement of entitlementsDueForReset) {
        const leaveTypeId = entitlement.leaveTypeId.toString();
        if (!byLeaveType.has(leaveTypeId)) {
          byLeaveType.set(leaveTypeId, []);
        }
        byLeaveType.get(leaveTypeId)?.push(entitlement._id.toString());
      }

      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      // Process carry-forward for each leave type
      for (const [leaveTypeId, entitlementIds] of byLeaveType.entries()) {
        try {
          console.log(
            `[Automated Carry-Forward] Processing leave type ${leaveTypeId} for ${entitlementIds.length} employees`,
          );

          // Process each entitlement individually to ensure we only process those due for reset
          for (const entitlementId of entitlementIds) {
            try {
              const entitlement = await this.leaveEntitlementModel
                .findById(entitlementId)
                .exec();

              if (!entitlement) {
                totalFailed++;
                continue;
              }

              // Check if reset date has actually passed
              const resetDate = entitlement.nextResetDate;
              if (!resetDate || new Date(resetDate) > today) {
                continue; // Skip if not yet due
              }

              // Get policy to check carry-forward settings
              const leavePolicy = await this.leavePolicyModel
                .findOne({ leaveTypeId: entitlement.leaveTypeId })
                .exec();

              if (!leavePolicy?.carryForwardAllowed) {
                // If carry-forward not allowed, just update reset date
                const nextReset = new Date(today);
                nextReset.setFullYear(nextReset.getFullYear() + 1);
                await this.leaveEntitlementModel
                  .findByIdAndUpdate(entitlementId, {
                    $set: { nextResetDate: nextReset },
                  })
                  .exec();
                totalProcessed++;
                continue;
              }

              // Calculate carry-forward amount
              const maxCarryForward = leavePolicy.maxCarryForward || 0;
              const carryForwardAmount = Math.min(
                entitlement.remaining,
                maxCarryForward,
              );

              if (carryForwardAmount > 0) {
                // Update entitlement with carry-forward
                const updated = await this.leaveEntitlementModel
                  .findByIdAndUpdate(
                    entitlementId,
                    {
                      $set: { carryForward: carryForwardAmount },
                      $inc: { remaining: -carryForwardAmount },
                    },
                    { new: true },
                  )
                  .exec();

                if (updated) {
                  // Recalculate remaining
                  updated.remaining = this.calculateRemaining(updated);
                  
                  // Calculate next reset date (one year from today)
                  const nextReset = new Date(today);
                  nextReset.setFullYear(nextReset.getFullYear() + 1);
                  updated.nextResetDate = nextReset;
                  
                  await updated.save();
                  totalSuccessful++;
                } else {
                  totalFailed++;
                }
              } else {
                // No carry-forward needed, just update reset date
                const nextReset = new Date(today);
                nextReset.setFullYear(nextReset.getFullYear() + 1);
                await this.leaveEntitlementModel
                  .findByIdAndUpdate(entitlementId, {
                    $set: { nextResetDate: nextReset },
                  })
                  .exec();
                totalSuccessful++;
              }
              totalProcessed++;
            } catch (err) {
              console.error(
                `[Automated Carry-Forward] Error processing entitlement ${entitlementId}:`,
                (err as any).message,
              );
              totalFailed++;
            }
          }
        } catch (err) {
          console.error(
            `[Automated Carry-Forward] Error processing leave type ${leaveTypeId}:`,
            (err as any).message,
          );
        }
      }

      console.log(
        `[Automated Carry-Forward] Completed. Processed: ${totalProcessed}, Successful: ${totalSuccessful}, Failed: ${totalFailed}`,
      );
    } catch (error) {
      console.error(
        '[Automated Carry-Forward] Fatal error in scheduled job:',
        (error as any).message,
      );
    }
  }
}