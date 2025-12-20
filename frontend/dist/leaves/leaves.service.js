"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const mongoose_3 = __importDefault(require("mongoose"));
const enums_1 = require("../time-management/models/enums");
const leave_policy_schema_1 = require("./models/leave-policy.schema");
const leave_request_schema_1 = require("./models/leave-request.schema");
const leave_entitlement_schema_1 = require("./models/leave-entitlement.schema");
const leave_adjustment_schema_1 = require("./models/leave-adjustment.schema");
const leave_type_schema_1 = require("./models/leave-type.schema");
const attachment_schema_1 = require("./models/attachment.schema");
const calendar_schema_1 = require("./models/calendar.schema");
const leave_category_schema_1 = require("./models/leave-category.schema");
const employee_profile_schema_1 = require("../employee-profile/models/employee-profile.schema");
const leave_status_enum_1 = require("./enums/leave-status.enum");
const accrual_method_enum_1 = require("./enums/accrual-method.enum");
const rounding_rule_enum_1 = require("./enums/rounding-rule.enum");
let LeavesService = class LeavesService {
    toObjectId(id) {
        if (!id)
            return undefined;
        try {
            return id instanceof mongoose_2.Types.ObjectId
                ? id
                : new mongoose_2.Types.ObjectId(id);
        }
        catch (err) {
            throw new Error(`Invalid id provided: ${id}`);
        }
    }
    async createCalendar(dto) {
        const holidayIds = [];
        if (dto.holidays && Array.isArray(dto.holidays)) {
            let HolidayModel = null;
            try {
                HolidayModel = this.calendarModel.db.model('Holiday');
            }
            catch (err) {
                HolidayModel = null;
            }
            for (const h of dto.holidays) {
                if (!h)
                    continue;
                if (typeof h === 'string' || h instanceof mongoose_2.Types.ObjectId) {
                    holidayIds.push(new mongoose_2.Types.ObjectId(h));
                    continue;
                }
                if (HolidayModel) {
                    try {
                        const created = await HolidayModel.create({
                            type: enums_1.HolidayType.ORGANIZATIONAL,
                            startDate: new Date(h.date),
                            endDate: h.date ? new Date(h.date) : undefined,
                            name: h.name || undefined,
                            active: true,
                        });
                        holidayIds.push(created._id);
                        continue;
                    }
                    catch (err) {
                        console.warn('Failed to create Holiday document for calendar import:', err);
                    }
                }
            }
        }
        const doc = new this.calendarModel({
            year: dto.year,
            holidays: holidayIds,
            blockedPeriods: dto.blockedPeriods?.map((p) => ({
                from: new Date(p.from),
                to: new Date(p.to),
                reason: p.reason || '',
            })) || [],
        });
        return await doc.save();
    }
    async getCalendarByYear(year) {
        return await this.calendarModel
            .findOne({ year })
            .populate('holidays')
            .exec();
    }
    async updateCalendar(year, dto) {
        const holidayIds = [];
        if (dto.holidays && Array.isArray(dto.holidays)) {
            let HolidayModel = null;
            try {
                HolidayModel = this.calendarModel.db.model('Holiday');
            }
            catch (err) {
                HolidayModel = null;
            }
            for (const h of dto.holidays) {
                if (!h)
                    continue;
                if (typeof h === 'string' || h instanceof mongoose_2.Types.ObjectId) {
                    holidayIds.push(new mongoose_2.Types.ObjectId(h));
                    continue;
                }
                if (HolidayModel) {
                    try {
                        const created = await HolidayModel.create({
                            type: enums_1.HolidayType.ORGANIZATIONAL,
                            startDate: new Date(h.date),
                            endDate: h.date ? new Date(h.date) : undefined,
                            name: h.name || undefined,
                            active: true,
                        });
                        holidayIds.push(created._id);
                        continue;
                    }
                    catch (err) {
                        console.warn('Failed to create Holiday document for calendar update:', err);
                    }
                }
            }
        }
        return await this.calendarModel
            .findOneAndUpdate({ year }, {
            $set: {
                holidays: holidayIds,
                blockedPeriods: dto.blockedPeriods?.map((p) => ({
                    from: new Date(p.from),
                    to: new Date(p.to),
                    reason: p.reason || '',
                })) || [],
            },
        }, { upsert: true, new: true })
            .exec();
    }
    constructor(leavePolicyModel, leaveRequestModel, leaveEntitlementModel, leaveAdjustmentModel, leaveTypeModel, attachmentModel, calendarModel, employeeProfileModel, leaveCategoryModel) {
        this.leavePolicyModel = leavePolicyModel;
        this.leaveRequestModel = leaveRequestModel;
        this.leaveEntitlementModel = leaveEntitlementModel;
        this.leaveAdjustmentModel = leaveAdjustmentModel;
        this.leaveTypeModel = leaveTypeModel;
        this.attachmentModel = attachmentModel;
        this.calendarModel = calendarModel;
        this.employeeProfileModel = employeeProfileModel;
        this.leaveCategoryModel = leaveCategoryModel;
    }
    async createLeavePolicy(createLeavePolicyDto) {
        const newLeavePolicy = new this.leavePolicyModel(createLeavePolicyDto);
        return await newLeavePolicy.save();
    }
    async getLeavePolicies() {
        return await this.leavePolicyModel.find().exec();
    }
    async getLeavePolicyById(id) {
        const leavePolicy = await this.leavePolicyModel.findById(id).exec();
        if (!leavePolicy) {
            throw new Error(`LeavePolicy with ID ${id} not found`);
        }
        return leavePolicy;
    }
    async updateLeavePolicy(id, updateLeavePolicyDto) {
        const updatedLeavePolicy = await this.leavePolicyModel
            .findByIdAndUpdate(id, updateLeavePolicyDto, { new: true })
            .exec();
        if (!updatedLeavePolicy) {
            throw new Error(`LeavePolicy with ID ${id} not found`);
        }
        return updatedLeavePolicy;
    }
    async deleteLeavePolicy(id) {
        const leavePolicy = await this.leavePolicyModel.findById(id).exec();
        if (!leavePolicy) {
            throw new Error(`LeavePolicy with ID ${id} not found`);
        }
        return (await this.leavePolicyModel
            .findByIdAndDelete(id)
            .exec());
    }
    async createLeaveCategory(createLeaveCategoryDto) {
        const newCategory = new this.leaveCategoryModel(createLeaveCategoryDto);
        return await newCategory.save();
    }
    async isBlockedDateRange(from, to) {
        const year = new Date(from).getFullYear();
        const calendar = await this.calendarModel.findOne({ year }).exec();
        if (!calendar) {
            console.warn('Calendar for year', year, 'not found; treating date as not blocked:', from, to);
            return false;
        }
        const start = new Date(from);
        const end = new Date(to);
        return calendar.blockedPeriods.some((period) => {
            const blockedStart = new Date(period.from);
            const blockedEnd = new Date(period.to);
            return start <= blockedEnd && end >= blockedStart;
        });
    }
    async createLeaveRequest(createLeaveRequestDto) {
        const { dates, employeeId, leaveTypeId, justification, attachmentId, durationDays: providedDurationDays, } = createLeaveRequestDto;
        const { from, to } = dates;
        const startDate = new Date(from);
        const endDate = new Date(to);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const calculatedDurationDays = await this.calculateWorkingDays(startDate, endDate, employeeId);
        const durationDays = providedDurationDays || calculatedDurationDays;
        const maxGracePeriodDays = 7;
        const daysSinceEndDate = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceEndDate > maxGracePeriodDays && daysSinceEndDate > 0) {
            throw new Error(`Post-leave requests must be submitted within ${maxGracePeriodDays} days after the leave end date.`);
        }
        const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
        if (!leaveType) {
            throw new Error('Leave type not found');
        }
        if (leaveType.code === 'SICK_LEAVE' && durationDays > 1) {
            if (!attachmentId) {
                throw new Error('Medical certificate is required for sick leave exceeding one day.');
            }
        }
        if (leaveType.requiresAttachment && !attachmentId) {
            throw new Error(`Attachment is required for ${leaveType.name} leave requests.`);
        }
        if (attachmentId) {
            const attachment = await this.attachmentModel
                .findById(attachmentId)
                .exec();
            if (!attachment) {
                throw new Error('Attachment not found');
            }
        }
        const isBlocked = await this.isBlockedDateRange(startDate.toISOString(), endDate.toISOString());
        if (isBlocked) {
            throw new common_1.BadRequestException('The requested leave dates fall on blocked periods.');
        }
        const employeeObjectId = this.toObjectId(employeeId);
        const leaveTypeObjectId = this.toObjectId(leaveTypeId);
        const leaveTypeDoc = await this.leaveTypeModel
            .findById(leaveTypeObjectId)
            .exec();
        if (!leaveTypeDoc) {
            throw new Error('Leave type not found');
        }
        if (leaveTypeDoc.code === 'SICK_LEAVE' && durationDays > 1) {
            if (!attachmentId) {
                throw new Error('Medical certificate is required for sick leave exceeding one day.');
            }
        }
        if (leaveTypeDoc.requiresAttachment && !attachmentId) {
            throw new Error(`Attachment is required for ${leaveTypeDoc.name} leave requests.`);
        }
        if (attachmentId) {
            const attachment = await this.attachmentModel
                .findById(this.toObjectId(attachmentId))
                .exec();
            if (!attachment) {
                throw new Error('Attachment not found');
            }
        }
        const validationResult = await this.validateLeaveRequest(employeeObjectId, leaveTypeObjectId, startDate, endDate, durationDays);
        if (!validationResult.isValid) {
            throw new Error(validationResult.errorMessage);
        }
        const leaveRequest = new this.leaveRequestModel({
            ...createLeaveRequestDto,
            employeeId: employeeObjectId,
            leaveTypeId: leaveTypeObjectId,
            attachmentId: createLeaveRequestDto.attachmentId
                ? this.toObjectId(createLeaveRequestDto.attachmentId)
                : undefined,
            status: leave_status_enum_1.LeaveStatus.PENDING,
            approvalFlow: [
                {
                    role: 'Manager',
                    status: 'PENDING',
                    decidedBy: undefined,
                    decidedAt: undefined,
                },
            ],
        });
        const entitlement = await this.getLeaveEntitlement(employeeObjectId, leaveTypeObjectId);
        await this.leaveEntitlementModel
            .findByIdAndUpdate(entitlement._id, { $inc: { pending: durationDays } }, { new: true })
            .exec();
        const savedLeaveRequest = await leaveRequest.save();
        return savedLeaveRequest;
    }
    async validateLeaveRequest(employeeId, leaveTypeId, startDate, endDate, durationDays, excludeRequestId) {
        const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
        const availableBalance = entitlement.remaining - entitlement.pending;
        if (availableBalance < durationDays) {
            return {
                isValid: false,
                errorMessage: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${durationDays} days.`,
            };
        }
        const query = {
            employeeId: new mongoose_2.Types.ObjectId(employeeId),
            status: { $in: [leave_status_enum_1.LeaveStatus.PENDING, leave_status_enum_1.LeaveStatus.APPROVED] },
            $or: [
                {
                    'dates.from': { $lte: endDate },
                    'dates.to': { $gte: startDate },
                },
            ],
        };
        if (excludeRequestId) {
            query._id = { $ne: new mongoose_2.Types.ObjectId(excludeRequestId) };
        }
        const overlappingRequests = await this.leaveRequestModel.find(query).exec();
        if (overlappingRequests.length > 0) {
            return {
                isValid: false,
                errorMessage: 'Leave request overlaps with existing approved or pending leave requests.',
            };
        }
        return { isValid: true };
    }
    async getLeaveRequestById(id) {
        const leaveRequest = await this.leaveRequestModel.findById(id).exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${id} not found`);
        }
        return leaveRequest;
    }
    async updateLeaveRequest(id, updateLeaveRequestDto) {
        const leaveRequest = await this.leaveRequestModel.findById(id).exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${id} not found`);
        }
        if (leaveRequest.status !== leave_status_enum_1.LeaveStatus.PENDING) {
            throw new Error('Only pending requests can be modified');
        }
        const newDates = updateLeaveRequestDto.dates ?? leaveRequest.dates;
        const newStartDate = new Date(newDates.from);
        const newEndDate = new Date(newDates.to);
        const newDurationDays = updateLeaveRequestDto.durationDays ?? leaveRequest.durationDays;
        const validationResult = await this.validateLeaveRequest(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString(), newStartDate, newEndDate, newDurationDays, leaveRequest._id.toString());
        if (!validationResult.isValid) {
            throw new Error(validationResult.errorMessage);
        }
        if (updateLeaveRequestDto.durationDays &&
            updateLeaveRequestDto.durationDays !== leaveRequest.durationDays) {
            const entitlement = await this.getLeaveEntitlement(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString());
            const delta = updateLeaveRequestDto.durationDays - leaveRequest.durationDays;
            await this.leaveEntitlementModel
                .findByIdAndUpdate(entitlement._id, { $inc: { pending: delta } }, { new: true })
                .exec();
        }
        const updatedLeaveRequest = await this.leaveRequestModel
            .findByIdAndUpdate(id, updateLeaveRequestDto, { new: true })
            .exec();
        if (!updatedLeaveRequest) {
            throw new Error(`LeaveRequest with ID ${id} not found`);
        }
        await this.notifyStakeholders(updatedLeaveRequest, 'modified');
        return updatedLeaveRequest;
    }
    async deleteLeaveRequest(id) {
        const leaveRequest = await this.leaveRequestModel.findById(id).exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${id} not found`);
        }
        return (await this.leaveRequestModel
            .findByIdAndDelete(id)
            .exec());
    }
    async cancelLeaveRequest(id) {
        const leaveRequest = await this.leaveRequestModel.findById(id).exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${id} not found`);
        }
        if (leaveRequest.status !== leave_status_enum_1.LeaveStatus.PENDING) {
            throw new Error('Only pending requests can be canceled');
        }
        const entitlement = await this.getLeaveEntitlement(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString());
        const updated = await this.leaveEntitlementModel
            .findByIdAndUpdate(entitlement._id, { $inc: { pending: -leaveRequest.durationDays } }, { new: true })
            .exec();
        if (updated && updated.pending < 0) {
            await this.leaveEntitlementModel
                .findByIdAndUpdate(entitlement._id, { $set: { pending: 0 } })
                .exec();
        }
        leaveRequest.status = leave_status_enum_1.LeaveStatus.CANCELLED;
        const canceledLeaveRequest = await leaveRequest.save();
        await this.notifyStakeholders(canceledLeaveRequest, 'canceled');
        return canceledLeaveRequest;
    }
    async approveLeaveRequest(approveLeaveRequestDto, user) {
        const { leaveRequestId, status } = approveLeaveRequestDto;
        const leaveRequest = await this.leaveRequestModel
            .findById(leaveRequestId)
            .exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${leaveRequestId} not found`);
        }
        if (leaveRequest.status !== leave_status_enum_1.LeaveStatus.PENDING) {
            throw new Error('Leave request can only be approved if it is in pending status.');
        }
        const isManager = user.role === 'Manager' || user.role === 'Department Head';
        if (!isManager) {
            throw new Error('Only managers can approve leave requests at this stage.');
        }
        leaveRequest.approvalFlow.push({
            role: user.role,
            status: leave_status_enum_1.LeaveStatus.APPROVED,
            decidedBy: new mongoose_2.Types.ObjectId(user._id || user.id),
            decidedAt: new Date(),
        });
        leaveRequest.status = leave_status_enum_1.LeaveStatus.PENDING;
        leaveRequest.approvalFlow.push({
            role: 'HR Manager',
            status: 'PENDING',
            decidedBy: undefined,
            decidedAt: undefined,
        });
        const savedRequest = await leaveRequest.save();
        await this.notifyStakeholders(savedRequest, 'manager_approved');
        return savedRequest;
    }
    async rejectLeaveRequest(rejectLeaveRequestDto, user) {
        const { leaveRequestId, status } = rejectLeaveRequestDto;
        const leaveRequest = await this.leaveRequestModel
            .findById(leaveRequestId)
            .exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${leaveRequestId} not found`);
        }
        if (leaveRequest.status !== leave_status_enum_1.LeaveStatus.PENDING) {
            throw new Error('Leave request can only be rejected if it is in pending status.');
        }
        const isManager = user.role === 'Manager' || user.role === 'Department Head';
        if (!isManager) {
            throw new Error('Only managers can reject leave requests at this stage.');
        }
        leaveRequest.approvalFlow.push({
            role: user.role,
            status: leave_status_enum_1.LeaveStatus.REJECTED,
            decidedBy: new mongoose_2.Types.ObjectId(user._id || user.id),
            decidedAt: new Date(),
        });
        leaveRequest.status = leave_status_enum_1.LeaveStatus.REJECTED;
        const entitlement = await this.getLeaveEntitlement(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString());
        entitlement.pending = Math.max(0, entitlement.pending - leaveRequest.durationDays);
        await this.updateLeaveEntitlement(entitlement._id.toString(), {
            pending: entitlement.pending,
        });
        const savedRequest = await leaveRequest.save();
        await this.notifyStakeholders(savedRequest, 'rejected');
        return savedRequest;
    }
    async createLeaveAdjustment(createLeaveAdjustmentDto) {
        const doc = { ...createLeaveAdjustmentDto };
        if (doc.employeeId)
            doc.employeeId = this.toObjectId(doc.employeeId);
        if (doc.leaveTypeId)
            doc.leaveTypeId = this.toObjectId(doc.leaveTypeId);
        const newLeaveAdjustment = new this.leaveAdjustmentModel(doc);
        return await newLeaveAdjustment.save();
    }
    async getLeaveAdjustments(employeeId) {
        return await this.leaveAdjustmentModel.find({ employeeId }).exec();
    }
    async deleteLeaveAdjustment(id) {
        const leaveAdjustment = await this.leaveAdjustmentModel
            .findByIdAndDelete(id)
            .exec();
        if (!leaveAdjustment) {
            throw new Error(`leaveAdjustment with ID ${id} not found`);
        }
        return leaveAdjustment;
    }
    async createLeaveEntitlement(createLeaveEntitlementDto) {
        const doc = { ...createLeaveEntitlementDto };
        doc.employeeId = this.toObjectId(createLeaveEntitlementDto.employeeId);
        doc.leaveTypeId = this.toObjectId(createLeaveEntitlementDto.leaveTypeId);
        const newLeaveEntitlement = new this.leaveEntitlementModel(doc);
        return await newLeaveEntitlement.save();
    }
    async getLeaveEntitlement(employeeId, leaveTypeId) {
        const leaveEntitlement = await this.leaveEntitlementModel.findOne({
            employeeId: new mongoose_2.Types.ObjectId(employeeId),
            leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId),
        }).exec();
        if (!leaveEntitlement) {
            throw new common_1.NotFoundException(`Entitlement for employee ${employeeId} with leave type ${leaveTypeId} not found`);
        }
        return leaveEntitlement;
    }
    async updateLeaveEntitlement(id, updateLeaveEntitlementDto) {
        let leaveEntitlement = await this.leaveEntitlementModel.findById(id).exec();
        if (!leaveEntitlement) {
            throw new Error(`Leave entitlement with ID ${id} not found`);
        }
        leaveEntitlement = await this.leaveEntitlementModel
            .findByIdAndUpdate(id.toString(), updateLeaveEntitlementDto, {
            new: true,
        })
            .exec();
        return leaveEntitlement;
    }
    async calculateAccrual(employeeId, leaveTypeId, accrualMethod) {
        const leaveEntitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
        if (!leaveEntitlement) {
            throw new Error(`Leave entitlement for employee ${employeeId} with leave type ${leaveTypeId} not found`);
        }
        const leavePolicy = await this.leavePolicyModel
            .findOne({ leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId) })
            .exec();
        if (!leavePolicy) {
            throw new Error(`Leave policy for leave type ${leaveTypeId} not found`);
        }
        const employeeProfile = await this.employeeProfileModel
            .findById(employeeId)
            .exec();
        if (!employeeProfile) {
            throw new Error(`Employee ${employeeId} not found`);
        }
        let accrualAmount = 0;
        switch (accrualMethod) {
            case accrual_method_enum_1.AccrualMethod.MONTHLY:
                const hireDate = new Date(employeeProfile.dateOfHire);
                const today = new Date();
                const monthsWorked = this.calculateMonthsWorked(hireDate, today);
                accrualAmount = monthsWorked * leavePolicy.monthlyRate;
                break;
            case accrual_method_enum_1.AccrualMethod.YEARLY:
                accrualAmount =
                    leavePolicy.yearlyRate || leaveEntitlement.yearlyEntitlement;
                break;
            case accrual_method_enum_1.AccrualMethod.PER_TERM:
                accrualAmount =
                    (leavePolicy.yearlyRate || leaveEntitlement.yearlyEntitlement) / 4;
                break;
            default:
                throw new Error('Invalid accrual method');
        }
        const roundedAmount = this.applyRoundingRule(accrualAmount, leavePolicy.roundingRule);
        const currentRounded = leaveEntitlement.accruedRounded || 0;
        const newRounded = currentRounded + roundedAmount;
        const roundedIncrement = roundedAmount;
        await this.leaveEntitlementModel
            .findByIdAndUpdate(leaveEntitlement._id, {
            $inc: {
                accruedActual: accrualAmount,
                accruedRounded: roundedIncrement,
                remaining: roundedIncrement,
            },
            $set: { lastAccrualDate: new Date() },
        }, { new: true })
            .exec();
        console.log(`Leave entitlement for employee ${employeeId} updated. Actual: ${accrualAmount}, Rounded: ${roundedAmount}`);
    }
    calculateMonthsWorked(hireDate, currentDate) {
        const years = currentDate.getFullYear() - hireDate.getFullYear();
        const months = currentDate.getMonth() - hireDate.getMonth();
        return (years * 12 +
            months +
            (currentDate.getDate() >= hireDate.getDate() ? 0 : -1));
    }
    applyRoundingRule(amount, roundingRule) {
        switch (roundingRule) {
            case rounding_rule_enum_1.RoundingRule.NONE:
                return amount;
            case rounding_rule_enum_1.RoundingRule.ROUND:
                return Math.round(amount);
            case rounding_rule_enum_1.RoundingRule.ROUND_UP:
                return Math.ceil(amount);
            case rounding_rule_enum_1.RoundingRule.ROUND_DOWN:
                return Math.floor(amount);
            default:
                return amount;
        }
    }
    async assignPersonalizedEntitlement(employeeId, leaveTypeId, personalizedEntitlement) {
        const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
        if (!entitlement) {
            throw new Error(`Leave entitlement for employee ${employeeId} with leave type ${leaveTypeId} not found`);
        }
        const updated = await this.leaveEntitlementModel
            .findByIdAndUpdate(entitlement._id, {
            $inc: {
                accruedActual: personalizedEntitlement,
                remaining: -personalizedEntitlement,
            },
        }, { new: true })
            .exec();
        if (!updated)
            throw new Error(`Leave entitlement with ID ${entitlement._id} not found`);
        return updated;
    }
    async resetLeaveBalancesForNewYear(criterion = 'HIRE_DATE') {
        const leaveEntitlements = await this.leaveEntitlementModel.find({}).exec();
        for (const entitlement of leaveEntitlements) {
            try {
                const resetDate = await this.calculateResetDate(entitlement.employeeId.toString(), criterion, entitlement.leaveTypeId.toString());
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const resetDateOnly = new Date(resetDate);
                resetDateOnly.setHours(0, 0, 0, 0);
                if (resetDateOnly <= today) {
                    let newRemaining = entitlement.yearlyEntitlement - entitlement.taken;
                    const leavePolicy = await this.leavePolicyModel
                        .findOne({ leaveTypeId: entitlement.leaveTypeId })
                        .exec();
                    if (leavePolicy?.carryForwardAllowed &&
                        entitlement.carryForward > 0) {
                        newRemaining += entitlement.carryForward;
                    }
                    const nextReset = new Date(resetDate);
                    nextReset.setFullYear(nextReset.getFullYear() + 1);
                    await this.updateLeaveEntitlement(entitlement._id.toString(), {
                        remaining: newRemaining,
                        lastAccrualDate: new Date(),
                        nextResetDate: nextReset,
                    });
                }
            }
            catch (error) {
                console.error(`Error resetting balance for entitlement ${entitlement._id}:`, error);
            }
        }
    }
    async createLeaveType(createLeaveTypeDto) {
        const { code, name } = createLeaveTypeDto;
        if (code === 'BEREAVEMENT_LEAVE' || code === 'JURY_DUTY') {
            console.log(`Creating special leave type: ${name}`);
        }
        const newLeaveType = new this.leaveTypeModel(createLeaveTypeDto);
        return await newLeaveType.save();
    }
    async updateLeaveType(id, updateLeaveTypeDto) {
        const updatedLeaveType = await this.leaveTypeModel
            .findByIdAndUpdate(id, updateLeaveTypeDto, { new: true })
            .exec();
        if (!updatedLeaveType) {
            throw new Error(`LeaveType with ID ${id} not found`);
        }
        return updatedLeaveType;
    }
    async getDelegatedManagers(managerId) {
        return [];
    }
    async delegateApprovalAuthority(managerId, delegateId, startDate, endDate) {
        console.log(`Delegating approval authority from ${managerId} to ${delegateId} from ${startDate} to ${endDate}`);
    }
    async finalizeLeaveRequest(leaveRequestId, hrUserId) {
        const leaveRequest = await this.leaveRequestModel
            .findById(leaveRequestId)
            .exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${leaveRequestId} not found`);
        }
        const lastApproval = leaveRequest.approvalFlow[leaveRequest.approvalFlow.length - 1];
        if (lastApproval.role !== 'HR Manager' ||
            lastApproval.status !== 'PENDING') {
            throw new Error('Leave request is not pending HR finalization.');
        }
        if (leaveRequest.attachmentId) {
            const attachment = await this.attachmentModel
                .findById(leaveRequest.attachmentId)
                .exec();
            if (!attachment) {
                throw new Error('Referenced attachment not found.');
            }
            await this.validateDocument(leaveRequest.leaveTypeId.toString(), attachment);
        }
        await this.checkCumulativeLimits(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString(), leaveRequest.durationDays);
        const hrIndex = leaveRequest.approvalFlow.length - 1;
        leaveRequest.approvalFlow[hrIndex] = {
            role: 'HR Manager',
            status: leave_status_enum_1.LeaveStatus.APPROVED,
            decidedBy: new mongoose_2.Types.ObjectId(hrUserId),
            decidedAt: new Date(),
        };
        leaveRequest.status = leave_status_enum_1.LeaveStatus.APPROVED;
        await this.finalizeApprovedLeaveRequest(leaveRequest);
        return await leaveRequest.save();
    }
    async validateDocument(leaveTypeId, attachment) {
        const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
        if (!leaveType) {
            return;
        }
        if (leaveType.attachmentType) {
        }
        const maxFileSize = 10 * 1024 * 1024;
        if (attachment.size && attachment.size > maxFileSize) {
            throw new Error('Attachment file size exceeds maximum allowed size (10MB).');
        }
    }
    async checkCumulativeLimits(employeeId, leaveTypeId, requestedDays) {
        const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
        if (!leaveType) {
            return;
        }
        if (leaveType.code === 'SICK_LEAVE') {
            const today = new Date();
            const threeYearsAgo = new Date(today);
            threeYearsAgo.setFullYear(today.getFullYear() - 3);
            const approvedSickLeaves = await this.leaveRequestModel
                .find({
                employeeId: new mongoose_2.Types.ObjectId(employeeId),
                leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId),
                status: leave_status_enum_1.LeaveStatus.APPROVED,
                'dates.from': { $gte: threeYearsAgo },
            })
                .exec();
            const totalSickLeaveDays = approvedSickLeaves.reduce((sum, req) => sum + req.durationDays, 0);
            const maxSickLeaveThreeYears = 360;
            if (totalSickLeaveDays + requestedDays > maxSickLeaveThreeYears) {
                throw new Error(`Cumulative sick leave limit exceeded. Maximum ${maxSickLeaveThreeYears} days allowed over a 3-year cycle.`);
            }
            const currentYear = new Date().getFullYear();
            const yearStart = new Date(currentYear, 0, 1);
            const yearEnd = new Date(currentYear, 11, 31);
            const yearSickLeaves = approvedSickLeaves.filter((req) => {
                const reqDate = new Date(req.dates.from);
                return reqDate >= yearStart && reqDate <= yearEnd;
            });
            const yearSickLeaveDays = yearSickLeaves.reduce((sum, req) => sum + req.durationDays, 0);
            const maxSickLeavePerYear = 30;
            if (yearSickLeaveDays + requestedDays > maxSickLeavePerYear) {
                throw new Error(`Annual sick leave limit exceeded. Maximum ${maxSickLeavePerYear} days per year allowed.`);
            }
        }
    }
    async finalizeApprovedLeaveRequest(leaveRequest) {
        const entitlement = await this.getLeaveEntitlement(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString());
        await this.leaveEntitlementModel
            .findByIdAndUpdate(entitlement._id, {
            $inc: {
                pending: -leaveRequest.durationDays,
                taken: leaveRequest.durationDays,
                remaining: -leaveRequest.durationDays,
            },
        }, { new: true })
            .exec();
    }
    async notifyStakeholders(_, __) {
        return;
    }
    async syncWithPayrollForRequest(leaveRequest) {
        return;
    }
    async hrOverrideDecision(leaveRequestId, hrUserId, overrideToApproved, overrideReason) {
        const leaveRequest = await this.leaveRequestModel
            .findById(leaveRequestId)
            .exec();
        if (!leaveRequest) {
            throw new Error(`LeaveRequest with ID ${leaveRequestId} not found`);
        }
        if (!overrideReason || overrideReason.trim().length === 0) {
            throw new Error('Override reason is required for HR override decisions.');
        }
        leaveRequest.approvalFlow.push({
            role: 'HR Manager',
            status: overrideToApproved ? leave_status_enum_1.LeaveStatus.APPROVED : leave_status_enum_1.LeaveStatus.REJECTED,
            decidedBy: new mongoose_2.Types.ObjectId(hrUserId),
            decidedAt: new Date(),
        });
        if (overrideToApproved) {
            leaveRequest.status = leave_status_enum_1.LeaveStatus.APPROVED;
            await this.finalizeApprovedLeaveRequest(leaveRequest);
            await this.notifyStakeholders(leaveRequest, 'overridden_approved');
            await this.syncWithPayrollForRequest(leaveRequest);
        }
        else {
            leaveRequest.status = leave_status_enum_1.LeaveStatus.REJECTED;
            const entitlement = await this.getLeaveEntitlement(leaveRequest.employeeId.toString(), leaveRequest.leaveTypeId.toString());
            const updated = await this.leaveEntitlementModel
                .findByIdAndUpdate(entitlement._id, { $inc: { pending: -leaveRequest.durationDays } }, { new: true })
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
    async processMultipleLeaveRequests(leaveRequestIds, hrUserId, approved) {
        const results = [];
        for (const leaveRequestId of leaveRequestIds) {
            try {
                if (approved) {
                    const finalized = await this.finalizeLeaveRequest(leaveRequestId, hrUserId);
                    results.push(finalized);
                }
                else {
                    const rejected = await this.hrOverrideDecision(leaveRequestId, hrUserId, false, 'Bulk rejection');
                    results.push(rejected);
                }
            }
            catch (error) {
                console.error(`Error processing leave request ${leaveRequestId}:`, error);
            }
        }
        return results;
    }
    async getEmployeeLeaveBalance(employeeId, leaveTypeId) {
        try {
            const query = { employeeId: new mongoose_2.Types.ObjectId(employeeId) };
            if (leaveTypeId) {
                query.leaveTypeId = new mongoose_2.Types.ObjectId(leaveTypeId);
            }
            const entitlements = await this.leaveEntitlementModel
                .find(query)
                .populate('leaveTypeId')
                .exec();
            const mapped = entitlements.map((ent) => ({
                leaveTypeId: ent.leaveTypeId?._id || ent.leaveTypeId,
                leaveTypeName: ent.leaveTypeId?.name || undefined,
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
        }
        catch (error) {
            throw new Error(`Failed to fetch leave balance: ${error.message}`);
        }
    }
    async getPastLeaveRequests(employeeId, filters) {
        try {
            const query = { employeeId: new mongoose_2.Types.ObjectId(employeeId) };
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
                query.leaveTypeId = new mongoose_2.Types.ObjectId(filters.leaveTypeId);
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
                leaveTypeName: req.leaveTypeId.name,
                dates: req.dates,
                durationDays: req.durationDays,
                justification: req.justification,
                status: req.status,
                approvalFlow: req.approvalFlow,
                createdAt: req.createdAt,
                updatedAt: req.updatedAt,
            }));
        }
        catch (error) {
            throw new Error(`Failed to fetch past leave requests: ${error.message}`);
        }
    }
    async filterLeaveHistory(employeeId, filters) {
        try {
            const query = { employeeId: new mongoose_2.Types.ObjectId(employeeId) };
            if (filters.leaveTypeId) {
                query.leaveTypeId = new mongoose_2.Types.ObjectId(filters.leaveTypeId);
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
            let sortObj = {};
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
                    leaveTypeName: req.leaveTypeId.name,
                    dates: req.dates,
                    durationDays: req.durationDays,
                    status: req.status,
                    createdAt: req.createdAt,
                })),
            };
        }
        catch (error) {
            throw new Error(`Failed to filter leave history: ${error.message}`);
        }
    }
    async getTeamLeaveBalances(managerId, upcomingFromDate, upcomingToDate, departmentId) {
        try {
            const teamMembers = [];
            const balances = await Promise.all(teamMembers.map(async (member) => {
                const entitlements = await this.leaveEntitlementModel
                    .find({ employeeId: new mongoose_2.Types.ObjectId(member._id) })
                    .populate('leaveTypeId')
                    .exec();
                let upcomingQuery = {
                    employeeId: new mongoose_2.Types.ObjectId(member._id),
                    status: { $in: [leave_status_enum_1.LeaveStatus.APPROVED, leave_status_enum_1.LeaveStatus.PENDING] },
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
                        leaveTypeName: ent.leaveTypeId.name,
                        remaining: ent.remaining,
                        pending: ent.pending,
                        taken: ent.taken,
                    })),
                    upcomingLeaves: upcomingLeaves.map((leave) => ({
                        _id: leave._id,
                        leaveTypeName: leave.leaveTypeId.name,
                        dates: leave.dates,
                        durationDays: leave.durationDays,
                        status: leave.status,
                    })),
                };
            }));
            return {
                managerId,
                teamMembers: balances,
                totalTeamMembers: balances.length,
            };
        }
        catch (error) {
            throw new Error(`Failed to get team leave balances: ${error.message}`);
        }
    }
    async filterTeamLeaveData(managerId, filters) {
        try {
            const teamMembers = [];
            const memberIds = teamMembers.map((m) => new mongoose_2.Types.ObjectId(m._id));
            const query = { employeeId: { $in: memberIds } };
            if (filters.leaveTypeId) {
                query.leaveTypeId = new mongoose_2.Types.ObjectId(filters.leaveTypeId);
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
            let sortObj = {};
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
                    dateRange: filters.fromDate || filters.toDate
                        ? { from: filters.fromDate, to: filters.toDate }
                        : undefined,
                    status: filters.status,
                },
                items: items.map((req) => ({
                    _id: req._id,
                    employeeId: req.employeeId,
                    leaveTypeName: req.leaveTypeId.name,
                    dates: req.dates,
                    durationDays: req.durationDays,
                    status: req.status,
                    createdAt: req.createdAt,
                })),
            };
        }
        catch (error) {
            throw new Error(`Failed to filter team leave data: ${error.message}`);
        }
    }
    async flagIrregularPattern(leaveRequestId, managerId, flagReason, notes) {
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
        }
        catch (error) {
            throw new Error(`Failed to flag irregular pattern: ${error.message}`);
        }
    }
    async autoAccrueLeave(employeeId, leaveTypeId, accrualAmount, accrualType, policyId, notes) {
        try {
            const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
            const previousBalance = entitlement.remaining;
            const leavePolicy = await this.leavePolicyModel
                .findOne({ leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId) })
                .exec();
            const roundingRule = leavePolicy?.roundingRule || rounding_rule_enum_1.RoundingRule.NONE;
            const roundedAmount = this.applyRoundingRule(accrualAmount, roundingRule);
            const updated = await this.leaveEntitlementModel
                .findByIdAndUpdate(entitlement._id, {
                $inc: {
                    accruedActual: accrualAmount,
                    accruedRounded: roundedAmount,
                    remaining: roundedAmount,
                },
                $set: { lastAccrualDate: new Date() },
            }, { new: true })
                .exec();
            if (updated)
                entitlement.remaining = updated.remaining;
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
        }
        catch (error) {
            throw new Error(`Failed to accrue leave: ${error.message}`);
        }
    }
    async autoAccrueAllEmployees(leaveTypeId, accrualAmount, accrualType, departmentId) {
        try {
            const query = { leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId) };
            const entitlements = await this.leaveEntitlementModel.find(query).exec();
            const results = [];
            let successful = 0;
            let failed = 0;
            for (const entitlement of entitlements) {
                try {
                    const previousBalance = entitlement.remaining;
                    const leavePolicy = await this.leavePolicyModel
                        .findOne({ leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId) })
                        .exec();
                    const roundingRule = leavePolicy?.roundingRule || rounding_rule_enum_1.RoundingRule.NONE;
                    const roundedAmount = this.applyRoundingRule(accrualAmount, roundingRule);
                    const updated = await this.leaveEntitlementModel
                        .findByIdAndUpdate(entitlement._id, {
                        $inc: {
                            accruedActual: accrualAmount,
                            accruedRounded: roundedAmount,
                            remaining: roundedAmount,
                        },
                        $set: {
                            lastAccrualDate: new Date(),
                        },
                    }, { new: true })
                        .exec();
                    results.push({
                        employeeId: entitlement.employeeId,
                        status: 'success',
                        previousBalance,
                        newBalance: updated?.remaining,
                        accrualAmount,
                        accrualType,
                    });
                    successful++;
                }
                catch (err) {
                    failed++;
                    results.push({
                        employeeId: entitlement.employeeId,
                        status: 'failed',
                        error: err.message,
                    });
                }
            }
            return {
                successful,
                failed,
                total: entitlements.length,
                details: results,
            };
        }
        catch (error) {
            throw new Error(`Failed to accrue leave for all employees: ${error.message}`);
        }
    }
    async runCarryForward(leaveTypeId, employeeId, asOfDate, departmentId) {
        try {
            const processDate = asOfDate || new Date();
            const query = { leaveTypeId: new mongoose_2.Types.ObjectId(leaveTypeId) };
            if (employeeId) {
                query.employeeId = new mongoose_2.Types.ObjectId(employeeId);
            }
            const entitlements = await this.leaveEntitlementModel.find(query).exec();
            const results = [];
            let successful = 0;
            let failed = 0;
            for (const entitlement of entitlements) {
                try {
                    const carryForwardAmount = Math.min(entitlement.remaining, 10);
                    const updated = await this.leaveEntitlementModel
                        .findByIdAndUpdate(entitlement._id, {
                        $set: { carryForward: carryForwardAmount },
                        $inc: { remaining: -carryForwardAmount },
                    }, { new: true })
                        .exec();
                    results.push({
                        employeeId: entitlement.employeeId,
                        status: 'success',
                        carryForwardAmount,
                        expiringAmount: 0,
                        newBalance: updated?.remaining,
                    });
                    successful++;
                }
                catch (err) {
                    failed++;
                    results.push({
                        employeeId: entitlement.employeeId,
                        status: 'failed',
                        error: err.message,
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
        }
        catch (error) {
            throw new Error(`Failed to run carry-forward: ${error.message}`);
        }
    }
    async adjustAccrual(employeeId, leaveTypeId, adjustmentType, adjustmentAmount, fromDate, toDate, reason, notes) {
        try {
            const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
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
            if (adjustmentType === 'suspension' || adjustmentType === 'restoration') {
                entitlement.remaining =
                    entitlement.yearlyEntitlement -
                        entitlement.taken +
                        entitlement.accruedActual;
            }
            entitlement.remaining = Math.max(0, entitlement.remaining);
            const updated = await this.updateLeaveEntitlement(entitlement._id.toString(), {
                accruedActual: entitlement.accruedActual,
                remaining: entitlement.remaining,
            });
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
        }
        catch (error) {
            throw new Error('Failed to adjust accrual: ${(error as any).message}');
        }
    }
    async calculateWorkingDays(startDate, endDate, employeeId) {
        let workingDays = 0;
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const year = currentDate.getFullYear();
        const calendar = await this.calendarModel
            .findOne({ year })
            .populate('holidays')
            .exec();
        const holidayDates = new Set();
        if (calendar && calendar.holidays) {
            const HolidayModel = this.calendarModel.db.model('Holiday');
            for (const holidayId of calendar.holidays) {
                try {
                    const holiday = await HolidayModel.findById(holidayId).exec();
                    if (holiday && holiday.startDate) {
                        const holidayDate = new Date(holiday.startDate);
                        holidayDates.add(holidayDate.toISOString().split('T')[0]);
                    }
                }
                catch (err) {
                }
            }
        }
        const blockedPeriods = calendar?.blockedPeriods || [];
        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            const dateString = currentDate.toISOString().split('T')[0];
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const isHoliday = holidayDates.has(dateString);
                const isBlocked = blockedPeriods.some((period) => {
                    const periodStart = new Date(period.from);
                    const periodEnd = new Date(period.to);
                    return currentDate >= periodStart && currentDate <= periodEnd;
                });
                if (!isHoliday && !isBlocked) {
                    workingDays++;
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return workingDays;
    }
    async getMaternityLeaveCount(employeeId) {
        const maternityLeaveType = await this.leaveTypeModel
            .findOne({ code: 'MATERNITY_LEAVE' })
            .exec();
        if (!maternityLeaveType) {
            return 0;
        }
        const maternityLeaves = await this.leaveRequestModel
            .find({
            employeeId: new mongoose_2.Types.ObjectId(employeeId),
            leaveTypeId: maternityLeaveType._id,
            status: leave_status_enum_1.LeaveStatus.APPROVED,
        })
            .exec();
        return maternityLeaves.length;
    }
    async calculateResetDate(employeeId, criterion, leaveTypeId) {
        const employeeProfile = await this.employeeProfileModel
            .findById(employeeId)
            .exec();
        if (!employeeProfile) {
            throw new Error(`Employee ${employeeId} not found`);
        }
        let baseDate;
        switch (criterion) {
            case 'HIRE_DATE':
                baseDate = new Date(employeeProfile.dateOfHire);
                break;
            case 'FIRST_VACATION_DATE':
                const firstLeave = await this.leaveRequestModel
                    .findOne({
                    employeeId: new mongoose_2.Types.ObjectId(employeeId),
                    status: leave_status_enum_1.LeaveStatus.APPROVED,
                })
                    .sort({ 'dates.from': 1 })
                    .exec();
                baseDate = firstLeave
                    ? new Date(firstLeave.dates.from)
                    : new Date(employeeProfile.dateOfHire);
                break;
            case 'REVISED_HIRE_DATE':
                baseDate = employeeProfile.contractStartDate
                    ? new Date(employeeProfile.contractStartDate)
                    : new Date(employeeProfile.dateOfHire);
                break;
            case 'WORK_RECEIVING_DATE':
                baseDate = employeeProfile.contractStartDate
                    ? new Date(employeeProfile.contractStartDate)
                    : new Date(employeeProfile.dateOfHire);
                break;
            default:
                baseDate = new Date(employeeProfile.dateOfHire);
        }
        const nextResetDate = new Date(baseDate);
        nextResetDate.setFullYear(nextResetDate.getFullYear() + 1);
        const today = new Date();
        if (nextResetDate < today) {
            const yearsSinceBase = today.getFullYear() - baseDate.getFullYear();
            nextResetDate.setFullYear(baseDate.getFullYear() + yearsSinceBase + 1);
        }
        return nextResetDate;
    }
    async updateResetDateForEmployee(employeeId, leaveTypeId, criterion) {
        const resetDate = await this.calculateResetDate(employeeId, criterion, leaveTypeId);
        const entitlement = await this.getLeaveEntitlement(employeeId, leaveTypeId);
        await this.updateLeaveEntitlement(entitlement._id.toString(), {
            nextResetDate: resetDate,
        });
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(leave_policy_schema_1.LeavePolicy.name)),
    __param(1, (0, mongoose_1.InjectModel)(leave_request_schema_1.LeaveRequest.name)),
    __param(2, (0, mongoose_1.InjectModel)(leave_entitlement_schema_1.LeaveEntitlement.name)),
    __param(3, (0, mongoose_1.InjectModel)(leave_adjustment_schema_1.LeaveAdjustment.name)),
    __param(4, (0, mongoose_1.InjectModel)(leave_type_schema_1.LeaveType.name)),
    __param(5, (0, mongoose_1.InjectModel)(attachment_schema_1.Attachment.name)),
    __param(6, (0, mongoose_1.InjectModel)(calendar_schema_1.Calendar.name)),
    __param(7, (0, mongoose_1.InjectModel)(employee_profile_schema_1.EmployeeProfile.name)),
    __param(8, (0, mongoose_1.InjectModel)(leave_category_schema_1.LeaveCategory.name)),
    __metadata("design:paramtypes", [mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model, mongoose_3.default.Model])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map