import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { populate } from 'dotenv';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
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
    // @InjectModel(PositionAssignment.name) private positionAssignmentModel: mongoose.Model<PositionAssignmentDocument>,
    // @InjectModel(Position.name) private positionModel: mongoose.Model<PositionDocument>,
    @InjectModel(LeaveCategory.name)
    private leaveCategoryModel: mongoose.Model<LeaveCategoryDocument>,
    //private notificationService: NotificationService, // Assuming a Notification service is available
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

    //Fetch employee profile
    // const employeeProfile = await this.EmployeeProfileModel.findById(employeeId).exec();
    // if (!employeeProfile) {
    //     throw new Error('Employee not found');
    // }

    // Fetch leave type
    const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
    if (!leaveType) {
      throw new Error('Leave type not found');
    }

    // REQ-016: Validate medical certificate requirement for sick leave exceeding one day
    if (leaveType.code === 'SICK_LEAVE' && durationDays > 1) {
      if (!attachmentId) {
        throw new Error(
          'Medical certificate is required for sick leave exceeding one day.',
        );
      }
    }

    // REQ-016: Validate attachment requirement
    if (leaveType.requiresAttachment && !attachmentId) {
      throw new Error(
        `Attachment is required for ${leaveType.name} leave requests.`,
      );
    }

    if (attachmentId) {
      const attachment = await this.attachmentModel
        .findById(attachmentId)
        .exec();
      if (!attachment) {
        throw new Error('Attachment not found');
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
      throw new Error('Leave type not found');
    }

    // REQ-016 validations remain the same (use original attachmentId variable)
    if (leaveTypeDoc.code === 'SICK_LEAVE' && durationDays > 1) {
      if (!attachmentId) {
        throw new Error(
          'Medical certificate is required for sick leave exceeding one day.',
        );
      }
    }

    if (leaveTypeDoc.requiresAttachment && !attachmentId) {
      throw new Error(
        `Attachment is required for ${leaveTypeDoc.name} leave requests.`,
      );
    }

    if (attachmentId) {
      const attachment = await this.attachmentModel
        .findById(this.toObjectId(attachmentId))
        .exec();
      if (!attachment) {
        throw new Error('Attachment not found');
      }
    }

    // Validate balance and overlaps using ObjectIds (cast to any for existing helper)
    const validationResult = await this.validateLeaveRequest(
      employeeObjectId as any,
      leaveTypeObjectId as any,
      startDate,
      endDate,
      durationDays,
    );
    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
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
          role: 'Manager',
          status: 'PENDING',
          decidedBy: undefined,
          decidedAt: undefined,
        },
      ],
    });

    // Update pending balance atomically using ObjectIds
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

    const savedLeaveRequest = await leaveRequest.save();
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
  ): Promise<{ isValid: boolean; errorMessage?: string }> {
    const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
    const availableBalance = entitlement.remaining - entitlement.pending;

    if (availableBalance < durationDays) {
      return {
        isValid: false,
        errorMessage: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${durationDays} days.`,
      };
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
    const leaveRequest = await this.leaveRequestModel.findById(id).exec();
    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }
    return leaveRequest;
  }

  // Phase 2: REQ-017 - Modify an existing leave request (only for pending requests)

  async updateLeaveRequest(
    id: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto,
  ): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel.findById(id).exec();

    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending requests can be modified');
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
      throw new Error(validationResult.errorMessage);
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
  async cancelLeaveRequest(id: string): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel.findById(id).exec();

    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending requests can be canceled');
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

    // Step 4: Check if the approver is a delegated employee
    // If they are a delegate, they're approving on behalf of the manager who delegated to them
    const delegatedManagerId = this.getDelegatedManagerId(managerId);
    const isDelegate = delegatedManagerId !== null;

    // The actual manager ID (either the approver themselves or the manager they're delegated for)
    // This is used for tracking purposes, but decidedBy will always record who actually made the decision
    const actualManagerId = isDelegate ? delegatedManagerId! : managerId;

    // Step 5: Update the approval flow with the manager's decision
    // Note: decidedBy records who actually made the decision (could be delegate), role is always Department_Head
    leaveRequest.approvalFlow.push({
      role: 'Departement_Head', // Role of the person approving/rejecting (always Department Head)
      status: status, // Status can be APPROVED or REJECTED
      decidedBy: new Types.ObjectId(managerId), // The actual person who made the decision (could be delegate)
      decidedAt: new Date(), // Timestamp of when the decision was made
    });

    leaveRequest.status = status; // Set the leave status to APPROVED or REJECTED

    // Step 6: Save the updated leave request
    const updatedLeaveRequest = await leaveRequest.save();

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

    // Step 4: Update the approval flow with the manager's decision
    leaveRequest.approvalFlow.push({
      role: 'Departement_Head', // Role of the person approving/rejecting
      status: LeaveStatus.REJECTED,
      decidedBy: new Types.ObjectId(managerId), // The manager's ID from the logged-in user
      decidedAt: new Date(), // Timestamp of when the decision was made
    });

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
    const newLeaveAdjustment = new this.leaveAdjustmentModel(doc);
    return await newLeaveAdjustment.save();
  }

  async getLeaveAdjustments(
    employeeId: string,
  ): Promise<LeaveAdjustmentDocument[]> {
    return await this.leaveAdjustmentModel.find({ employeeId }).exec();
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
    const newLeaveEntitlement = new this.leaveEntitlementModel(doc);
    return await newLeaveEntitlement.save();
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
      throw new NotFoundException(
        'Entitlement for employee ${employeeId} with leave type ${leaveTypeId} not found',
      );
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

    // Here, you can modify `leaveEntitlement` based on the business logic (e.g., accruals)
    // If needed, modify `leaveEntitlement` before saving the update
    leaveEntitlement = await this.leaveEntitlementModel
      .findByIdAndUpdate(id.toString(), updateLeaveEntitlementDto, {
        new: true,
      })
      .exec();
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

  //next method
  async assignPersonalizedEntitlement(
    employeeId: string,
    leaveTypeId: string,
    personalizedEntitlement: number,
  ): Promise<LeaveEntitlementDocument> {
    const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);

    if (!entitlement) {
      throw new Error(
        `Leave entitlement for employee ${employeeId} with leave type ${leaveTypeId} not found`,
      );
    }

    // Atomically add personalized entitlement: increase accruedActual and decrease remaining
    const updated = await this.leaveEntitlementModel
      .findByIdAndUpdate(
        entitlement._id,
        {
          $inc: {
            accruedActual: personalizedEntitlement,
            remaining: -personalizedEntitlement,
          },
        },
        { new: true },
      )
      .exec();
    if (!updated)
      throw new Error(`Leave entitlement with ID ${entitlement._id} not found`);
    return updated as LeaveEntitlementDocument;
  }

  // Business Rule: Reset leave balances based on criterion date (Hire date, First Vacation Date, etc.)
  async resetLeaveBalancesForNewYear(
    criterion:
      | 'HIRE_DATE'
      | 'FIRST_VACATION_DATE'
      | 'REVISED_HIRE_DATE'
      | 'WORK_RECEIVING_DATE' = 'HIRE_DATE',
  ): Promise<void> {
    const leaveEntitlements: LeaveEntitlementDocument[] =
      await this.leaveEntitlementModel.find({}).exec();

    for (const entitlement of leaveEntitlements) {
      try {
        // Calculate reset date based on criterion
        const resetDate = await this.calculateResetDate(
          entitlement.employeeId.toString(),
          criterion,
          entitlement.leaveTypeId.toString(),
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resetDateOnly = new Date(resetDate);
        resetDateOnly.setHours(0, 0, 0, 0);

        // Check if reset date has passed
        if (resetDateOnly <= today) {
          // Reset remaining balance
          let newRemaining = entitlement.yearlyEntitlement - entitlement.taken;

          // Add carry forward if allowed
          const leavePolicy = await this.leavePolicyModel
            .findOne({ leaveTypeId: entitlement.leaveTypeId })
            .exec();
          if (
            leavePolicy?.carryForwardAllowed &&
            entitlement.carryForward > 0
          ) {
            newRemaining += entitlement.carryForward;
          }

          // Calculate next reset date (one year from current reset date)
          const nextReset = new Date(resetDate);
          nextReset.setFullYear(nextReset.getFullYear() + 1);

          await this.updateLeaveEntitlement(entitlement._id.toString(), {
            remaining: newRemaining,
            lastAccrualDate: new Date(),
            nextResetDate: nextReset,
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
  }

  //leave type

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
      throw new Error(`LeaveType with ID ${id} not found`);
    }

    return updatedLeaveType;
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
      throw new BadRequestException('Start date must be before end date.');
    }

    const now = new Date();
    if (endDate < now) {
      throw new BadRequestException('End date must be in the future.');
    }

    // Validate that delegateId is a valid employee
    const delegate = await this.employeeProfileModel
      .findById(delegateId)
      .exec();
    if (!delegate) {
      throw new NotFoundException(`Employee with ID ${delegateId} not found.`);
    }

    // Validate that managerId is a valid employee
    const manager = await this.employeeProfileModel.findById(managerId).exec();
    if (!manager) {
      throw new NotFoundException(`Manager with ID ${managerId} not found.`);
    }

    // Check if delegate is the same as manager
    if (managerId === delegateId) {
      throw new BadRequestException('Manager cannot delegate to themselves.');
    }

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
    for (const [managerId, delegations] of this.delegationMap.entries()) {
      const now = new Date();
      const isActiveDelegate = delegations.some(
        (del) =>
          del.delegateId === employeeId &&
          del.isActive &&
          now >= del.startDate &&
          now <= del.endDate,
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

    // Step 3: Check if leave request is approved by Department Head and ready for HR finalization
    if (leaveRequest.status !== LeaveStatus.APPROVED) {
      throw new BadRequestException(
        `Leave request must be APPROVED by Department Head before HR finalization. Current status: ${leaveRequest.status}`,
      );
    }

    const lastApproval =
      leaveRequest.approvalFlow[leaveRequest.approvalFlow.length - 1];

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

    // Check if the last approval is from Department Head (not HR Manager)
    if (
      !lastApproval ||
      lastApproval.role !== 'Departement_Head' ||
      lastApproval.status !== LeaveStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Leave request must be approved by Department Head before HR finalization.',
      );
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

    // Step 9: REQ-030 - Notify stakeholders
    //await this.notifyStakeholders(leaveRequest, 'finalized');

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

    // BR 32: Proper balance calculation - move from pending to taken atomically
    await this.leaveEntitlementModel
      .findByIdAndUpdate(
        entitlement._id,
        {
          $inc: {
            pending: -leaveRequest.durationDays,
            taken: leaveRequest.durationDays,
            remaining: -leaveRequest.durationDays,
          },
        },
        { new: true },
      )
      .exec();
  }

  // Phase 2: REQ-030, N-053 - Notify stakeholders
  // Notifications are disabled per requirements (no-op)
  private async notifyStakeholders(
    _: LeaveRequestDocument,
    __: string,
  ): Promise<void> {
    return; // intentionally no-op
  }

  // Phase 2: REQ-042, BR 692 - Sync with payroll system (internal helper)
  // renamed to avoid collision with public `syncWithPayroll` that accepts event payloads

  // Phase 2: REQ-026, BR 479 - HR Manager override manager decision
  async hrOverrideDecision(
    leaveRequestId: string,
    hrUserId: string,
    overrideToApproved: boolean,
    overrideReason?: string,
  ): Promise<LeaveRequestDocument> {
    const leaveRequest = await this.leaveRequestModel
      .findById(leaveRequestId)
      .exec();
    if (!leaveRequest) {
      throw new Error(`LeaveRequest with ID ${leaveRequestId} not found`);
    }

    // BR 479: Validate override conditions (e.g., only for special circumstances)
    if (!overrideReason || overrideReason.trim().length === 0) {
      throw new Error('Override reason is required for HR override decisions.');
    }

    leaveRequest.approvalFlow.push({
      role: 'HR Manager',
      status: overrideToApproved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
      decidedBy: new Types.ObjectId(hrUserId),
      decidedAt: new Date(),
    });

    if (overrideToApproved) {
      leaveRequest.status = LeaveStatus.APPROVED;
      await this.finalizeApprovedLeaveRequest(leaveRequest);
      await this.notifyStakeholders(leaveRequest, 'overridden_approved');
    } else {
      leaveRequest.status = LeaveStatus.REJECTED;
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
      await this.notifyStakeholders(leaveRequest, 'overridden_rejected');
    }

    return await leaveRequest.save();
  }

  // Phase 2: REQ-027 - Process multiple leave requests at once
  async processMultipleLeaveRequests(
    leaveRequestIds: string[],
    hrUserId: string,
    approved: boolean,
  ): Promise<LeaveRequestDocument[]> {
    const results: LeaveRequestDocument[] = [];

    for (const leaveRequestId of leaveRequestIds) {
      try {
        if (approved) {
          const finalized = await this.finalizeLeaveRequest(
            leaveRequestId,
            hrUserId,
          );
          results.push(finalized);
        } else {
          const rejected = await this.hrOverrideDecision(
            leaveRequestId,
            hrUserId,
            false,
            'Bulk rejection',
          );
          results.push(rejected);
        }
      } catch (error) {
        console.error(
          `Error processing leave request ${leaveRequestId}:`,
          error,
        );
      }
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

      const mapped = entitlements.map((ent) => ({
        leaveTypeId: ent.leaveTypeId?._id || ent.leaveTypeId,
        leaveTypeName: (ent.leaveTypeId as any)?.name || undefined,
        yearlyEntitlement: ent.yearlyEntitlement,
        accruedActual: ent.accruedActual,
        carryForward: ent.carryForward,
        taken: ent.taken,
        pending: ent.pending,
        remaining: ent.remaining,
        lastAccrualDate: ent.lastAccrualDate,
      }));

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
  async getPastLeaveRequests(
    employeeId: string,
    filters?: any,
  ): Promise<any[]> {
    try {
      const query: any = { employeeId: new Types.ObjectId(employeeId) };

      if (filters?.fromDate || filters?.toDate) {
        query['dates.from'] = {};
        if (filters?.fromDate)
          query['dates.from'].$gte = new Date(filters.fromDate);
        if (filters?.toDate) {
          query['dates.to'] = query['dates.to'] || {};
          query['dates.to'].$lte = new Date(filters.toDate);
        }
      }

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.leaveTypeId) {
        query.leaveTypeId = new Types.ObjectId(filters.leaveTypeId);
      }

      const requests = await this.leaveRequestModel
        .find(query)
        .populate('leaveTypeId')
        .sort({ 'dates.from': -1 })
        .exec();

      return requests.map((req) => ({
        _id: req._id,
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId._id,
        leaveTypeName: (req.leaveTypeId as any).name,
        dates: req.dates,
        durationDays: req.durationDays,
        justification: req.justification,
        status: req.status,
        approvalFlow: req.approvalFlow,
        createdAt: (req as any).createdAt,
        updatedAt: (req as any).updatedAt,
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch past leave requests: ${(error as any).message}`,
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

      if (filters.status) {
        query.status = filters.status;
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
        items: items.map((req) => ({
          _id: req._id,
          employeeId: req.employeeId,
          leaveTypeName: (req.leaveTypeId as any).name,
          dates: req.dates,
          durationDays: req.durationDays,
          status: req.status,
          createdAt: (req as any).createdAt,
        })),
      };
    } catch (error) {
      throw new Error(
        `Failed to filter leave history: ${(error as any).message}`,
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
      // Get team members under manager - placeholder implementation
      const teamMembers: any[] = [];

      const balances = await Promise.all(
        teamMembers.map(async (member) => {
          const entitlements = await this.leaveEntitlementModel
            .find({ employeeId: new Types.ObjectId(member._id) })
            .populate('leaveTypeId')
            .exec();

          let upcomingQuery: any = {
            employeeId: new Types.ObjectId(member._id),
            status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
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

          return {
            employeeId: member._id,
            employeeName: member.name,
            position: member.position,
            department: member.department,
            leaveBalances: entitlements.map((ent) => ({
              leaveTypeId: ent.leaveTypeId._id,
              leaveTypeName: (ent.leaveTypeId as any).name,
              remaining: ent.remaining,
              pending: ent.pending,
              taken: ent.taken,
            })),
            upcomingLeaves: upcomingLeaves.map((leave) => ({
              _id: leave._id,
              leaveTypeName: (leave.leaveTypeId as any).name,
              dates: leave.dates,
              durationDays: leave.durationDays,
              status: leave.status,
            })),
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
      // Get team members - placeholder
      const teamMembers: any[] = [];
      const memberIds = teamMembers.map((m) => new Types.ObjectId(m._id));

      const query: any = { employeeId: { $in: memberIds } };

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

      if (filters.status) {
        query.status = filters.status;
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
        items: items.map((req) => ({
          _id: req._id,
          employeeId: req.employeeId,
          leaveTypeName: (req.leaveTypeId as any).name,
          dates: req.dates,
          durationDays: req.durationDays,
          status: req.status,
          createdAt: (req as any).createdAt,
        })),
      };
    } catch (error) {
      throw new Error(
        `Failed to filter team leave data: ${(error as any).message}`,
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
      const roundedAmount = this.applyRoundingRule(accrualAmount, roundingRule);

      // Atomically increment both accruedActual (pre-rounded) and accruedRounded (rounded)
      const updated = await this.leaveEntitlementModel
        .findByIdAndUpdate(
          entitlement._id,
          {
            $inc: {
              accruedActual: accrualAmount,
              accruedRounded: roundedAmount,
              remaining: roundedAmount,
            },
            $set: { lastAccrualDate: new Date() },
          },
          { new: true },
        )
        .exec();
      if (updated) entitlement.remaining = updated.remaining;

      return {
        success: true,
        employeeId,
        leaveTypeId,
        accrualAmount,
        accrualType,
        previousBalance,
        newBalance: entitlement.remaining,
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

      for (const entitlement of entitlements) {
        try {
          const previousBalance = entitlement.remaining;

          // Get policy for rounding rule
          const leavePolicy = await this.leavePolicyModel
            .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
            .exec();
          const roundingRule = leavePolicy?.roundingRule || RoundingRule.NONE;
          const roundedAmount = this.applyRoundingRule(
            accrualAmount,
            roundingRule,
          );

          // Atomically increment both accruedActual (pre-rounded) and accruedRounded (rounded)
          const updated = await this.leaveEntitlementModel
            .findByIdAndUpdate(
              entitlement._id,
              {
                $inc: {
                  accruedActual: accrualAmount,
                  accruedRounded: roundedAmount,
                  remaining: roundedAmount,
                },
                $set: {
                  lastAccrualDate: new Date(),
                },
              },
              { new: true },
            )
            .exec();

          results.push({
            employeeId: entitlement.employeeId,
            status: 'success',
            previousBalance,
            newBalance: updated?.remaining, // ✅ actual stored value after update
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
    try {
      const processDate = asOfDate || new Date();

      const query: any = { leaveTypeId: new Types.ObjectId(leaveTypeId) };

      if (employeeId) {
        query.employeeId = new Types.ObjectId(employeeId);
      }
      // departmentId is currently not used in filtering; you can add it later if needed

      const entitlements = await this.leaveEntitlementModel.find(query).exec();
      const results: any[] = [];
      let successful = 0;
      let failed = 0;

      for (const entitlement of entitlements) {
        try {
          const carryForwardAmount = Math.min(entitlement.remaining, 10); // Max 10 days carry forward

          // Atomically set carryForward and decrement remaining, and get updated doc back
          const updated = await this.leaveEntitlementModel
            .findByIdAndUpdate(
              entitlement._id,
              {
                $set: { carryForward: carryForwardAmount },
                $inc: { remaining: -carryForwardAmount },
              },
              { new: true },
            )
            .exec();

          results.push({
            employeeId: entitlement.employeeId,
            status: 'success',
            carryForwardAmount,
            expiringAmount: 0, // you can change this later if you track expired days
            newBalance: updated?.remaining, // ✅ actual updated remaining from DB
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
      const previousBalance = entitlement.remaining;

      switch (adjustmentType) {
        case 'suspension':
          entitlement.accruedActual -= adjustmentAmount;
          break;
        case 'reduction':
          entitlement.remaining -= adjustmentAmount;
          break;
        case 'adjustment':
          entitlement.remaining += adjustmentAmount;
          break;
        case 'restoration':
          entitlement.accruedActual += adjustmentAmount;
          break;
        default:
          throw new Error('Invalid adjustment type');
      }

      // Recalculate remaining when we changed accruedActual
      if (adjustmentType === 'suspension' || adjustmentType === 'restoration') {
        entitlement.remaining =
          entitlement.yearlyEntitlement -
          entitlement.taken +
          entitlement.accruedActual;
      }

      // Clamp to avoid negative remaining
      entitlement.remaining = Math.max(0, entitlement.remaining);

      // Save and get the updated doc back
      const updated = await this.updateLeaveEntitlement(
        entitlement._id.toString(),
        {
          accruedActual: entitlement.accruedActual,
          remaining: entitlement.remaining,
        },
      );

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
      throw new Error('Failed to adjust accrual: ${(error as any).message}');
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
}
