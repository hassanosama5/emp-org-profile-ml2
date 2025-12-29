import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Import schemas
import { OvertimeRule } from '../models/overtime-rule.schema';
import { LatenessRule } from '../models/lateness-rule.schema';
import { Holiday } from '../models/holiday.schema';
// Import DTOs
import {
  CreateOvertimeRuleDto,
  UpdateOvertimeRuleDto,
  CreateLatenessRuleDto,
  UpdateLatenessRuleDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  GetHolidaysDto,
  GetPoliciesDto,
  CheckHolidayDto,
  ValidateAttendanceHolidayDto,
} from '../DTOs/policy-config.dtos';
import { LeavesService } from '../../leaves/leaves.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class PolicyConfigService {
  constructor(
    @InjectModel(OvertimeRule.name)
    private overtimeRuleModel: Model<OvertimeRule>,
    @InjectModel(LatenessRule.name)
    private latenessRuleModel: Model<LatenessRule>,
    @InjectModel(Holiday.name) private holidayModel: Model<Holiday>,
    @Inject(forwardRef(() => LeavesService))
    private leavesService: LeavesService,
  ) {}

  // ===== OVERTIME RULE METHODS =====

  // Create a new overtime rule
  async createOvertimeRule(
    createOvertimeRuleDto: CreateOvertimeRuleDto,
    currentUserId: string,
  ) {
    // OvertimeRule schema doesn't have createdBy/updatedBy fields, so we only set the schema fields
    const newOvertimeRule = new this.overtimeRuleModel({
      name: createOvertimeRuleDto.name,
      description: createOvertimeRuleDto.description,
      active: createOvertimeRuleDto.active !== undefined ? createOvertimeRuleDto.active : true,
      approved: createOvertimeRuleDto.approved !== undefined ? createOvertimeRuleDto.approved : false,
    });
    const saved = await newOvertimeRule.save();
    console.log('[OvertimeRule] Saved rule:', saved._id, 'Name:', saved.name);
    return saved;
  }

  // Get all overtime rules with optional filters
  async getOvertimeRules(
    getPoliciesDto: GetPoliciesDto,
    currentUserId: string,
  ) {
    const query: any = {};

    if (getPoliciesDto.active !== undefined) {
      query.active = getPoliciesDto.active;
    }

    if (getPoliciesDto.approved !== undefined) {
      query.approved = getPoliciesDto.approved;
    }

    return this.overtimeRuleModel.find(query).exec();
  }

  // Get a single overtime rule by ID
  async getOvertimeRuleById(id: string, currentUserId: string) {
    return this.overtimeRuleModel.findById(id).exec();
  }

  // Update an overtime rule
  async updateOvertimeRule(
    id: string,
    updateOvertimeRuleDto: UpdateOvertimeRuleDto,
    currentUserId: string,
  ) {
    return this.overtimeRuleModel
      .findByIdAndUpdate(
        id,
        {
          ...updateOvertimeRuleDto,
          updatedBy: currentUserId,
        },
        { new: true },
      )
      .exec();
  }

  // Delete an overtime rule
  async deleteOvertimeRule(id: string, currentUserId: string) {
    return this.overtimeRuleModel.findByIdAndDelete(id).exec();
  }

  // ===== US10: OVERTIME & SHORT TIME CONFIGURATION =====
  // BR-TM-08: Overtime/Short Time must be calculated according to organizational policies

  /**
   * Get applicable overtime rules for a specific date
   * BR-TM-08: Determines which rules apply based on date type (weekday/weekend/holiday)
   */
  async getApplicableOvertimeRules(
    date: Date,
    currentUserId: string,
  ) {
    // Check if date is a holiday
    const holidayCheck = await this.checkHoliday({ date }, currentUserId);
    
    // Check if date is weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Get all active and approved overtime rules
    const allRules = await this.overtimeRuleModel
      .find({ active: true, approved: true })
      .exec();
    
    return {
      date,
      isHoliday: holidayCheck.isHoliday,
      holidayName: holidayCheck.holiday?.name || null,
      isWeekend,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      applicableRules: allRules,
      recommendation: holidayCheck.isHoliday 
        ? 'Apply HOLIDAY overtime multiplier' 
        : isWeekend 
          ? 'Apply WEEKEND overtime multiplier' 
          : 'Apply REGULAR overtime multiplier',
    };
  }

  /**
   * Calculate overtime for an attendance record
   * BR-TM-08: Calculate based on organizational policies
   */
  async calculateOvertimeForAttendance(
    params: {
      attendanceRecordId: string;
      totalWorkMinutes: number;
      standardWorkMinutes?: number;
      date: Date;
    },
    currentUserId: string,
  ) {
    const { totalWorkMinutes, standardWorkMinutes = 480, date } = params; // Default 8 hours standard
    
    // Get applicable rules for this date
    const applicableRules = await this.getApplicableOvertimeRules(date, currentUserId);
    
    // Calculate overtime minutes
    const overtimeMinutes = Math.max(0, totalWorkMinutes - standardWorkMinutes);
    const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
    
    // Calculate short-time (undertime) minutes
    const shortTimeMinutes = Math.max(0, standardWorkMinutes - totalWorkMinutes);
    const shortTimeHours = Math.round((shortTimeMinutes / 60) * 100) / 100;
    
    // Determine overtime type and multiplier based on date
    let overtimeType = 'REGULAR';
    let multiplier = 1.5; // Default 1.5x for regular overtime
    
    if (applicableRules.isHoliday) {
      overtimeType = 'HOLIDAY';
      multiplier = 2.5; // 2.5x for holiday overtime
    } else if (applicableRules.isWeekend) {
      overtimeType = 'WEEKEND';
      multiplier = 2.0; // 2x for weekend overtime
    }
    
    return {
      attendanceRecordId: params.attendanceRecordId,
      date,
      standardWorkMinutes,
      actualWorkMinutes: totalWorkMinutes,
      overtime: {
        minutes: overtimeMinutes,
        hours: overtimeHours,
        type: overtimeType,
        multiplier,
        compensationMinutes: Math.round(overtimeMinutes * multiplier),
      },
      shortTime: {
        minutes: shortTimeMinutes,
        hours: shortTimeHours,
        hasShortTime: shortTimeMinutes > 0,
      },
      applicableRules: {
        isHoliday: applicableRules.isHoliday,
        isWeekend: applicableRules.isWeekend,
        dayOfWeek: applicableRules.dayOfWeek,
      },
    };
  }

  /**
   * Get short-time (undertime) configuration
   * BR-TM-08: Short time calculation rules
   */
  async getShortTimeConfig(currentUserId: string) {
    // Return standard short-time configuration
    // These could be made configurable via database in future
    return {
      standardWorkMinutes: 480, // 8 hours
      minimumWorkMinutes: 240, // 4 hours (half day)
      shortTimeThresholdMinutes: 30, // Ignore short-time under 30 minutes
      deductionPerMinute: 0, // Or could be salary/480 for per-minute deduction
      policies: {
        allowHalfDay: true,
        allowQuarterDay: false,
        requiresApproval: true,
        deductFromLeave: false,
        deductFromSalary: true,
      },
    };
  }

  /**
   * Calculate short-time (undertime) for an attendance record
   * BR-TM-08: Short time must be calculated according to policies
   */
  async calculateShortTimeForAttendance(
    params: {
      attendanceRecordId: string;
      totalWorkMinutes: number;
      standardWorkMinutes?: number;
      date: Date;
    },
    currentUserId: string,
  ) {
    const config = await this.getShortTimeConfig(currentUserId);
    const { totalWorkMinutes, standardWorkMinutes = config.standardWorkMinutes, date } = params;
    
    const shortTimeMinutes = Math.max(0, standardWorkMinutes - totalWorkMinutes);
    const shortTimeHours = Math.round((shortTimeMinutes / 60) * 100) / 100;
    
    // Determine if short-time should be applied (threshold check)
    const applyShortTime = shortTimeMinutes >= config.shortTimeThresholdMinutes;
    
    // Determine work type
    let workType = 'FULL_DAY';
    if (totalWorkMinutes < config.minimumWorkMinutes) {
      workType = 'LESS_THAN_HALF_DAY';
    } else if (totalWorkMinutes < standardWorkMinutes) {
      workType = 'HALF_DAY';
    }
    
    return {
      attendanceRecordId: params.attendanceRecordId,
      date,
      standardWorkMinutes,
      actualWorkMinutes: totalWorkMinutes,
      shortTime: {
        minutes: shortTimeMinutes,
        hours: shortTimeHours,
        applyShortTime,
        belowThreshold: shortTimeMinutes < config.shortTimeThresholdMinutes,
      },
      workType,
      config,
      recommendation: applyShortTime 
        ? 'Apply short-time deduction or require leave request' 
        : 'Short-time below threshold, no deduction required',
    };
  }

  /**
   * Validate if overtime requires pre-approval
   * BR-TM-08: Pre-approval types enforcement
   */
  async validateOvertimePreApproval(
    params: {
      employeeId: string;
      date: Date;
      expectedOvertimeMinutes: number;
    },
    currentUserId: string,
  ) {
    const { employeeId, date, expectedOvertimeMinutes } = params;
    
    // Get applicable rules to check if pre-approval is required
    const applicableRules = await this.getApplicableOvertimeRules(date, currentUserId);
    
    // Pre-approval thresholds (could be configurable)
    const preApprovalThresholdMinutes = 60; // Require pre-approval for overtime > 1 hour
    const requiresPreApproval = expectedOvertimeMinutes > preApprovalThresholdMinutes;
    
    // Holiday/Weekend work typically requires pre-approval
    const requiresDueToDateType = applicableRules.isHoliday || applicableRules.isWeekend;
    
    return {
      employeeId,
      date,
      expectedOvertimeMinutes,
      expectedOvertimeHours: Math.round((expectedOvertimeMinutes / 60) * 100) / 100,
      preApprovalRequired: requiresPreApproval || requiresDueToDateType,
      reason: requiresDueToDateType 
        ? `Pre-approval required for ${applicableRules.isHoliday ? 'holiday' : 'weekend'} work`
        : requiresPreApproval 
          ? `Pre-approval required for overtime exceeding ${preApprovalThresholdMinutes} minutes`
          : 'Pre-approval not required',
      dateInfo: {
        isHoliday: applicableRules.isHoliday,
        isWeekend: applicableRules.isWeekend,
        dayOfWeek: applicableRules.dayOfWeek,
      },
    };
  }

  /**
   * Get overtime limits/caps configuration
   * BR-TM-08: Overtime caps based on organizational policies
   */
  async getOvertimeLimitsConfig(currentUserId: string) {
    // Return standard overtime limits configuration
    return {
      daily: {
        maxOvertimeMinutes: 180, // 3 hours max per day
        maxOvertimeHours: 3,
        softLimitMinutes: 120, // 2 hours soft limit (warning)
      },
      weekly: {
        maxOvertimeMinutes: 720, // 12 hours max per week
        maxOvertimeHours: 12,
        softLimitMinutes: 600, // 10 hours soft limit
      },
      monthly: {
        maxOvertimeMinutes: 2880, // 48 hours max per month
        maxOvertimeHours: 48,
        softLimitMinutes: 2400, // 40 hours soft limit
      },
      policies: {
        enforceHardLimits: true,
        requireApprovalAboveSoftLimit: true,
        carryOverAllowed: false,
      },
    };
  }

  /**
   * Check if employee is within overtime limits
   * BR-TM-08: Enforce overtime caps
   */
  async checkOvertimeLimits(
    params: {
      employeeId: string;
      currentOvertimeMinutes: number;
      period: 'daily' | 'weekly' | 'monthly';
      additionalOvertimeMinutes?: number;
    },
    currentUserId: string,
  ) {
    const config = await this.getOvertimeLimitsConfig(currentUserId);
    const periodConfig = config[params.period];
    
    const currentMinutes = params.currentOvertimeMinutes;
    const additionalMinutes = params.additionalOvertimeMinutes || 0;
    const projectedMinutes = currentMinutes + additionalMinutes;
    
    const withinSoftLimit = projectedMinutes <= periodConfig.softLimitMinutes;
    const withinHardLimit = projectedMinutes <= periodConfig.maxOvertimeMinutes;
    
    return {
      employeeId: params.employeeId,
      period: params.period,
      limits: periodConfig,
      current: {
        minutes: currentMinutes,
        hours: Math.round((currentMinutes / 60) * 100) / 100,
      },
      projected: {
        minutes: projectedMinutes,
        hours: Math.round((projectedMinutes / 60) * 100) / 100,
      },
      remaining: {
        toSoftLimit: Math.max(0, periodConfig.softLimitMinutes - projectedMinutes),
        toHardLimit: Math.max(0, periodConfig.maxOvertimeMinutes - projectedMinutes),
      },
      status: {
        withinSoftLimit,
        withinHardLimit,
        requiresApproval: !withinSoftLimit && config.policies.requireApprovalAboveSoftLimit,
        blocked: !withinHardLimit && config.policies.enforceHardLimits,
      },
      recommendation: !withinHardLimit 
        ? 'BLOCKED: Overtime exceeds hard limit'
        : !withinSoftLimit 
          ? 'WARNING: Overtime exceeds soft limit, requires approval'
          : 'OK: Within overtime limits',
    };
  }

  /**
   * Get comprehensive overtime/short-time policy summary
   * BR-TM-08: Full policy configuration
   */
  async getOvertimeShortTimePolicySummary(currentUserId: string) {
    const overtimeRules = await this.overtimeRuleModel.find({ active: true }).exec();
    const limits = await this.getOvertimeLimitsConfig(currentUserId);
    const shortTimeConfig = await this.getShortTimeConfig(currentUserId);
    
    return {
      generatedAt: new Date(),
      overtime: {
        rules: overtimeRules,
        limits,
        multipliers: {
          regular: 1.5,
          weekend: 2.0,
          holiday: 2.5,
        },
        preApprovalThresholdMinutes: 60,
      },
      shortTime: shortTimeConfig,
      weekendDays: ['Saturday', 'Sunday'],
      standardWorkMinutes: 480,
      standardWorkHours: 8,
    };
  }

  // ===== LATENESS RULE METHODS =====

  // Create a new lateness rule
  async createLatenessRule(
    createLatenessRuleDto: CreateLatenessRuleDto,
    currentUserId: string,
  ) {
    const newLatenessRule = new this.latenessRuleModel({
      ...createLatenessRuleDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newLatenessRule.save();
  }

  // Get all lateness rules with optional filters
  async getLatenessRules(
    getPoliciesDto: GetPoliciesDto,
    currentUserId: string,
  ) {
    const query: any = {};

    if (getPoliciesDto.active !== undefined) {
      query.active = getPoliciesDto.active;
    }

    return this.latenessRuleModel.find(query).exec();
  }

  // Get a single lateness rule by ID
  async getLatenessRuleById(id: string, currentUserId: string) {
    return this.latenessRuleModel.findById(id).exec();
  }

  // Update a lateness rule
  async updateLatenessRule(
    id: string,
    updateLatenessRuleDto: UpdateLatenessRuleDto,
    currentUserId: string,
  ) {
    return this.latenessRuleModel
      .findByIdAndUpdate(
        id,
        {
          ...updateLatenessRuleDto,
          updatedBy: currentUserId,
        },
        { new: true },
      )
      .exec();
  }

  // Delete a lateness rule
  async deleteLatenessRule(id: string, currentUserId: string) {
    return this.latenessRuleModel.findByIdAndDelete(id).exec();
  }

  // ===== US11: LATENESS & PENALTY RULES (BR-TM-09) =====

  /**
   * Get lateness thresholds configuration
   * BR-TM-09: Early/Lateness per shift must follow HR rules (grace period, penalty thresholds, escalation)
   */
  async getLatenessThresholdsConfig(currentUserId: string) {
    // Return standard lateness thresholds configuration
    // These could be made configurable via database in future
    return {
      gracePeriodMinutes: 15, // Default grace period
      thresholds: {
        minor: {
          minMinutes: 1,
          maxMinutes: 15,
          description: 'Minor lateness (within grace period)',
          action: 'NO_ACTION',
          deductionMultiplier: 0,
        },
        moderate: {
          minMinutes: 16,
          maxMinutes: 30,
          description: 'Moderate lateness',
          action: 'WARNING',
          deductionMultiplier: 1.0,
        },
        significant: {
          minMinutes: 31,
          maxMinutes: 60,
          description: 'Significant lateness',
          action: 'DEDUCTION',
          deductionMultiplier: 1.5,
        },
        severe: {
          minMinutes: 61,
          maxMinutes: null, // No upper limit
          description: 'Severe lateness (requires escalation)',
          action: 'ESCALATION',
          deductionMultiplier: 2.0,
        },
      },
      escalationPolicy: {
        escalateAfterMinutes: 60,
        escalateAfterOccurrences: 3,
        escalationPeriodDays: 30,
        notifyManager: true,
        notifyHR: true,
      },
      deductionPolicy: {
        deductFromSalary: true,
        deductFromLeave: false,
        maxDeductionPerDay: 480, // Max 8 hours deduction equivalent
        currency: 'USD',
      },
    };
  }

  /**
   * Calculate lateness for an attendance record
   * BR-TM-09: Apply grace period and calculate deduction based on thresholds
   */
  async calculateLatenessForAttendance(
    params: {
      attendanceRecordId: string;
      scheduledStartMinutes: number; // e.g., 540 for 9:00 AM
      actualArrivalMinutes: number; // e.g., 555 for 9:15 AM
      gracePeriodMinutes?: number;
    },
    currentUserId: string,
  ) {
    const { scheduledStartMinutes, actualArrivalMinutes } = params;
    
    // Get active lateness rules
    const latenessRules = await this.latenessRuleModel.find({ active: true }).exec();
    const thresholdsConfig = await this.getLatenessThresholdsConfig(currentUserId);
    
    // Use rule-specific grace period or default
    const gracePeriod = params.gracePeriodMinutes ?? 
      (latenessRules.length > 0 ? latenessRules[0].gracePeriodMinutes : thresholdsConfig.gracePeriodMinutes);
    
    // Calculate raw lateness
    const rawLatenessMinutes = Math.max(0, actualArrivalMinutes - scheduledStartMinutes);
    
    // Apply grace period
    const effectiveLatenessMinutes = Math.max(0, rawLatenessMinutes - gracePeriod);
    
    // Determine lateness category
    let category = 'ON_TIME';
    let action = 'NO_ACTION';
    let deductionMultiplier = 0;
    
    if (rawLatenessMinutes <= 0) {
      category = 'EARLY';
      action = 'NO_ACTION';
    } else if (rawLatenessMinutes <= gracePeriod) {
      category = 'WITHIN_GRACE';
      action = 'NO_ACTION';
    } else if (rawLatenessMinutes <= 30) {
      category = 'MODERATE';
      action = 'WARNING';
      deductionMultiplier = 1.0;
    } else if (rawLatenessMinutes <= 60) {
      category = 'SIGNIFICANT';
      action = 'DEDUCTION';
      deductionMultiplier = 1.5;
    } else {
      category = 'SEVERE';
      action = 'ESCALATION';
      deductionMultiplier = 2.0;
    }
    
    // Calculate deduction amount
    const deductionPerMinute = latenessRules.length > 0 ? latenessRules[0].deductionForEachMinute : 0;
    const baseDeduction = effectiveLatenessMinutes * deductionPerMinute;
    const totalDeduction = baseDeduction * deductionMultiplier;
    
    return {
      attendanceRecordId: params.attendanceRecordId,
      scheduledStartMinutes,
      actualArrivalMinutes,
      gracePeriodMinutes: gracePeriod,
      lateness: {
        rawMinutes: rawLatenessMinutes,
        effectiveMinutes: effectiveLatenessMinutes,
        withinGracePeriod: rawLatenessMinutes <= gracePeriod,
      },
      category,
      action,
      deduction: {
        perMinuteRate: deductionPerMinute,
        multiplier: deductionMultiplier,
        baseAmount: Math.round(baseDeduction * 100) / 100,
        totalAmount: Math.round(totalDeduction * 100) / 100,
      },
      requiresEscalation: action === 'ESCALATION',
      recommendation: this.getLatenessRecommendation(category, rawLatenessMinutes),
    };
  }

  /**
   * Helper method to get lateness recommendation
   */
  private getLatenessRecommendation(category: string, minutes: number): string {
    switch (category) {
      case 'EARLY':
        return 'Employee arrived early - no action required';
      case 'ON_TIME':
      case 'WITHIN_GRACE':
        return 'Within acceptable time - no action required';
      case 'MODERATE':
        return 'Issue verbal warning and log incident';
      case 'SIGNIFICANT':
        return 'Apply salary deduction and issue written warning';
      case 'SEVERE':
        return `Escalate to HR/Manager - ${minutes} minutes late requires review`;
      default:
        return 'Review lateness manually';
    }
  }

  /**
   * Check if lateness requires escalation based on thresholds
   * BR-TM-09: Penalty thresholds and escalation
   */
  async checkLatenessEscalation(
    params: {
      employeeId: string;
      currentLatenessMinutes: number;
      periodDays?: number;
    },
    currentUserId: string,
  ) {
    const config = await this.getLatenessThresholdsConfig(currentUserId);
    const { currentLatenessMinutes, periodDays = 30 } = params;
    
    // Check if current lateness exceeds escalation threshold
    const exceedsTimeThreshold = currentLatenessMinutes > config.escalationPolicy.escalateAfterMinutes;
    
    // In a real implementation, we'd query historical lateness data here
    // For now, return the escalation rules and current status
    return {
      employeeId: params.employeeId,
      currentLatenessMinutes,
      thresholds: {
        timeThreshold: config.escalationPolicy.escalateAfterMinutes,
        occurrenceThreshold: config.escalationPolicy.escalateAfterOccurrences,
        periodDays: config.escalationPolicy.escalationPeriodDays,
      },
      status: {
        exceedsTimeThreshold,
        requiresEscalation: exceedsTimeThreshold,
        escalationLevel: exceedsTimeThreshold ? 'HR_REVIEW' : 'NONE',
      },
      notifications: {
        notifyManager: exceedsTimeThreshold && config.escalationPolicy.notifyManager,
        notifyHR: exceedsTimeThreshold && config.escalationPolicy.notifyHR,
      },
      recommendation: exceedsTimeThreshold
        ? 'Escalate to HR for disciplinary review'
        : 'Log incident and monitor',
    };
  }

  /**
   * Apply automatic deduction based on lateness
   * BR-TM-09: Automatic deductions applied fairly and consistently
   */
  async applyLatenessDeduction(
    params: {
      employeeId: string;
      attendanceRecordId: string;
      latenessMinutes: number;
      latenessRuleId?: string;
    },
    currentUserId: string,
  ) {
    const { employeeId, attendanceRecordId, latenessMinutes, latenessRuleId } = params;
    
    // Get applicable lateness rule
    let latenessRule;
    if (latenessRuleId) {
      latenessRule = await this.latenessRuleModel.findById(latenessRuleId).exec();
    } else {
      // Get first active rule
      const rules = await this.latenessRuleModel.find({ active: true }).exec();
      latenessRule = rules[0];
    }
    
    if (!latenessRule) {
      return {
        success: false,
        message: 'No active lateness rule found',
        deductionApplied: false,
      };
    }
    
    // Calculate effective lateness after grace period
    const effectiveLatenessMinutes = Math.max(0, latenessMinutes - latenessRule.gracePeriodMinutes);
    
    if (effectiveLatenessMinutes <= 0) {
      return {
        success: true,
        message: 'Within grace period - no deduction applied',
        deductionApplied: false,
        latenessDetails: {
          rawMinutes: latenessMinutes,
          gracePeriod: latenessRule.gracePeriodMinutes,
          effectiveMinutes: 0,
        },
      };
    }
    
    // Calculate deduction
    const deductionAmount = effectiveLatenessMinutes * latenessRule.deductionForEachMinute;
    
    return {
      success: true,
      message: 'Deduction calculated successfully',
      deductionApplied: true,
      employeeId,
      attendanceRecordId,
      latenessDetails: {
        rawMinutes: latenessMinutes,
        gracePeriod: latenessRule.gracePeriodMinutes,
        effectiveMinutes: effectiveLatenessMinutes,
      },
      deduction: {
        ruleId: (latenessRule as any)._id,
        ruleName: latenessRule.name,
        ratePerMinute: latenessRule.deductionForEachMinute,
        amount: Math.round(deductionAmount * 100) / 100,
      },
      appliedAt: new Date(),
      appliedBy: currentUserId,
    };
  }

  /**
   * Get comprehensive lateness & penalty summary
   * BR-TM-09: Full lateness configuration for HR review
   */
  async getLatenesPenaltySummary(currentUserId: string) {
    const latenessRules = await this.latenessRuleModel.find({ active: true }).exec();
    const thresholdsConfig = await this.getLatenessThresholdsConfig(currentUserId);
    
    return {
      generatedAt: new Date(),
      activeRules: latenessRules.map(rule => ({
        id: (rule as any)._id,
        name: rule.name,
        description: rule.description,
        gracePeriodMinutes: rule.gracePeriodMinutes,
        deductionPerMinute: rule.deductionForEachMinute,
      })),
      thresholds: thresholdsConfig.thresholds,
      escalationPolicy: thresholdsConfig.escalationPolicy,
      deductionPolicy: thresholdsConfig.deductionPolicy,
      summary: {
        totalActiveRules: latenessRules.length,
        defaultGracePeriod: thresholdsConfig.gracePeriodMinutes,
        escalationThresholdMinutes: thresholdsConfig.escalationPolicy.escalateAfterMinutes,
        escalationOccurrences: thresholdsConfig.escalationPolicy.escalateAfterOccurrences,
      },
    };
  }

  /**
   * Calculate early leave penalty
   * BR-TM-09: Early leave penalties follow same rules as lateness
   */
  async calculateEarlyLeavePenalty(
    params: {
      attendanceRecordId: string;
      scheduledEndMinutes: number; // e.g., 1020 for 5:00 PM
      actualDepartureMinutes: number; // e.g., 960 for 4:00 PM
      gracePeriodMinutes?: number;
    },
    currentUserId: string,
  ) {
    const { scheduledEndMinutes, actualDepartureMinutes } = params;
    
    // Get active lateness rules (early leave uses same rules)
    const latenessRules = await this.latenessRuleModel.find({ active: true }).exec();
    const thresholdsConfig = await this.getLatenessThresholdsConfig(currentUserId);
    
    // Use rule-specific grace period or default
    const gracePeriod = params.gracePeriodMinutes ?? 
      (latenessRules.length > 0 ? latenessRules[0].gracePeriodMinutes : thresholdsConfig.gracePeriodMinutes);
    
    // Calculate raw early leave (if left before scheduled end)
    const rawEarlyMinutes = Math.max(0, scheduledEndMinutes - actualDepartureMinutes);
    
    // Apply grace period
    const effectiveEarlyMinutes = Math.max(0, rawEarlyMinutes - gracePeriod);
    
    // Determine early leave category (using same thresholds as lateness)
    let category = 'NORMAL';
    let action = 'NO_ACTION';
    let deductionMultiplier = 0;
    
    if (rawEarlyMinutes <= 0) {
      category = 'OVERTIME';
      action = 'NO_ACTION';
    } else if (rawEarlyMinutes <= gracePeriod) {
      category = 'WITHIN_GRACE';
      action = 'NO_ACTION';
    } else if (rawEarlyMinutes <= 30) {
      category = 'MODERATE';
      action = 'WARNING';
      deductionMultiplier = 1.0;
    } else if (rawEarlyMinutes <= 60) {
      category = 'SIGNIFICANT';
      action = 'DEDUCTION';
      deductionMultiplier = 1.5;
    } else {
      category = 'SEVERE';
      action = 'ESCALATION';
      deductionMultiplier = 2.0;
    }
    
    // Calculate deduction amount
    const deductionPerMinute = latenessRules.length > 0 ? latenessRules[0].deductionForEachMinute : 0;
    const baseDeduction = effectiveEarlyMinutes * deductionPerMinute;
    const totalDeduction = baseDeduction * deductionMultiplier;
    
    return {
      attendanceRecordId: params.attendanceRecordId,
      scheduledEndMinutes,
      actualDepartureMinutes,
      gracePeriodMinutes: gracePeriod,
      earlyLeave: {
        rawMinutes: rawEarlyMinutes,
        effectiveMinutes: effectiveEarlyMinutes,
        withinGracePeriod: rawEarlyMinutes <= gracePeriod,
      },
      category,
      action,
      deduction: {
        perMinuteRate: deductionPerMinute,
        multiplier: deductionMultiplier,
        baseAmount: Math.round(baseDeduction * 100) / 100,
        totalAmount: Math.round(totalDeduction * 100) / 100,
      },
      requiresEscalation: action === 'ESCALATION',
      recommendation: rawEarlyMinutes <= 0 
        ? 'Employee worked overtime' 
        : rawEarlyMinutes <= gracePeriod 
          ? 'Within acceptable range' 
          : `Early departure by ${rawEarlyMinutes} minutes - apply appropriate action`,
    };
  }

  // ===== HOLIDAY METHODS =====

  // Create a new holiday
  async createHoliday(
    createHolidayDto: CreateHolidayDto,
    currentUserId: string,
  ) {
    const newHoliday = new this.holidayModel({
      ...createHolidayDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return newHoliday.save();
  }

  // Get all holidays with optional filters
  async getHolidays(getHolidaysDto: GetHolidaysDto, currentUserId: string) {
    const query: any = {};

    if (getHolidaysDto.type) {
      query.type = getHolidaysDto.type;
    }

    if (getHolidaysDto.active !== undefined) {
      query.active = getHolidaysDto.active;
    }

    // Filter by date range if provided
    if (getHolidaysDto.startDate && getHolidaysDto.endDate) {
      query.$or = [
        {
          startDate: {
            $gte: getHolidaysDto.startDate,
            $lte: getHolidaysDto.endDate,
          },
        },
        {
          endDate: {
            $gte: getHolidaysDto.startDate,
            $lte: getHolidaysDto.endDate,
          },
        },
        {
          $and: [
            { startDate: { $lte: getHolidaysDto.startDate } },
            { endDate: { $gte: getHolidaysDto.endDate } },
          ],
        },
      ];
    }

    return this.holidayModel.find(query).sort({ startDate: 1 }).exec();
  }

  // Get a single holiday by ID
  async getHolidayById(id: string, currentUserId: string) {
    return this.holidayModel.findById(id).exec();
  }

  // Update a holiday
  async updateHoliday(
    id: string,
    updateHolidayDto: UpdateHolidayDto,
    currentUserId: string,
  ) {
    return this.holidayModel
      .findByIdAndUpdate(
        id,
        {
          ...updateHolidayDto,
          updatedBy: currentUserId,
        },
        { new: true },
      )
      .exec();
  }

  // Delete a holiday
  async deleteHoliday(id: string, currentUserId: string) {
    return this.holidayModel.findByIdAndDelete(id).exec();
  }

  // ===== US17: HOLIDAY & REST DAY CONFIGURATION (BR-TM-19) =====

  /**
   * Configure weekly rest days for the organization
   * BR-TM-19: Weekly rest days must be linked to shift schedules
   */
  async configureWeeklyRestDays(
    params: {
      restDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
      effectiveFrom?: Date;
      effectiveTo?: Date;
      departmentId?: string;
    },
    currentUserId: string,
  ) {
    const { restDays, effectiveFrom, effectiveTo, departmentId } = params;
    
    // Validate rest days
    const validDays = restDays.filter(d => d >= 0 && d <= 6);
    if (validDays.length === 0) {
      return {
        success: false,
        message: 'Invalid rest days provided. Use 0-6 (Sunday-Saturday)',
      };
    }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const restDayNames = validDays.map(d => dayNames[d]);
    
    return {
      success: true,
      configuration: {
        restDays: validDays,
        restDayNames,
        effectiveFrom: effectiveFrom || new Date(),
        effectiveTo: effectiveTo || null,
        departmentId: departmentId || 'ALL',
        scope: departmentId ? 'DEPARTMENT' : 'ORGANIZATION',
      },
      penaltySuppression: {
        enabled: true,
        message: `Attendance penalties will be suppressed on ${restDayNames.join(', ')}`,
      },
      configuredAt: new Date(),
      configuredBy: currentUserId,
    };
  }

  /**
   * Check if a date is a rest day
   * BR-TM-19: Weekly rest days must be linked to shift schedules
   */
  async checkRestDay(
    params: {
      date: Date;
      restDays?: number[]; // Custom rest days, default [5, 6] (Fri, Sat) or [0, 6] (Sun, Sat)
    },
    currentUserId: string,
  ) {
    const { date, restDays = [5, 6] } = params; // Default: Friday & Saturday
    
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const isRestDay = restDays.includes(dayOfWeek);
    
    return {
      date,
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      isRestDay,
      configuredRestDays: restDays.map(d => dayNames[d]),
      penaltySuppression: isRestDay,
      message: isRestDay 
        ? `${dayNames[dayOfWeek]} is a configured rest day - penalties suppressed`
        : `${dayNames[dayOfWeek]} is a working day`,
    };
  }

  /**
   * Bulk create holidays (e.g., annual holiday calendar)
   * BR-TM-19: National/organizational holidays must be linked to shift schedules
   */
  async bulkCreateHolidays(
    params: {
      holidays: Array<{
        name: string;
        type: string;
        startDate: Date;
        endDate?: Date;
      }>;
      year?: number;
    },
    currentUserId: string,
  ) {
    const { holidays, year = new Date().getFullYear() } = params;
    
    const createdHolidays: any[] = [];
    const failedHolidays: any[] = [];
    
    for (const holiday of holidays) {
      try {
        const newHoliday = new this.holidayModel({
          name: holiday.name,
          type: holiday.type,
          startDate: new Date(holiday.startDate),
          endDate: holiday.endDate ? new Date(holiday.endDate) : undefined,
          active: true,
          createdBy: currentUserId,
          updatedBy: currentUserId,
        });
        const saved = await newHoliday.save();
        createdHolidays.push({
          id: (saved as any)._id,
          name: saved.name,
          startDate: saved.startDate,
        });
      } catch (error) {
        failedHolidays.push({
          name: holiday.name,
          error: 'Failed to create holiday',
        });
      }
    }
    
    return {
      success: failedHolidays.length === 0,
      year,
      summary: {
        total: holidays.length,
        created: createdHolidays.length,
        failed: failedHolidays.length,
      },
      createdHolidays,
      failedHolidays: failedHolidays.length > 0 ? failedHolidays : undefined,
      createdAt: new Date(),
      createdBy: currentUserId,
    };
  }

  /**
   * Get holiday calendar for a specific period
   * BR-TM-19: View all holidays and rest days for planning
   */
  async getHolidayCalendar(
    params: {
      year?: number;
      month?: number;
      includeRestDays?: boolean;
      restDays?: number[];
    },
    currentUserId: string,
  ) {
    const { year = new Date().getFullYear(), month, includeRestDays = true, restDays = [5, 6] } = params;
    
    // Build date range
    let startDate: Date;
    let endDate: Date;
    
    if (month !== undefined) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // Last day of month
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }
    
    // Get holidays in range
    const holidays = await this.holidayModel
      .find({
        active: true,
        startDate: { $lte: endDate },
        $or: [
          { endDate: { $gte: startDate } },
          { endDate: { $exists: false }, startDate: { $gte: startDate } },
        ],
      })
      .sort({ startDate: 1 })
      .exec();
    
    // Group by type
    const byType: Record<string, any[]> = {
      NATIONAL: [],
      ORGANIZATIONAL: [],
      WEEKLY_REST: [],
    };
    
    holidays.forEach(h => {
      const type = h.type || 'ORGANIZATIONAL';
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        id: (h as any)._id,
        name: h.name,
        startDate: h.startDate,
        endDate: h.endDate,
        type: h.type,
      });
    });
    
    // Calculate rest days in period if requested
    let restDaysInPeriod: any[] = [];
    if (includeRestDays) {
      const current = new Date(startDate);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      while (current <= endDate) {
        if (restDays.includes(current.getDay())) {
          restDaysInPeriod.push({
            date: new Date(current),
            dayName: dayNames[current.getDay()],
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    return {
      period: {
        year,
        month: month || 'ALL',
        startDate,
        endDate,
      },
      summary: {
        totalHolidays: holidays.length,
        nationalHolidays: byType.NATIONAL.length,
        organizationalHolidays: byType.ORGANIZATIONAL.length,
        restDaysCount: restDaysInPeriod.length,
      },
      holidays: byType,
      restDays: includeRestDays ? {
        configuredDays: restDays.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]),
        count: restDaysInPeriod.length,
        // Only include first few and last few to avoid huge response
        sample: restDaysInPeriod.length > 10 
          ? [...restDaysInPeriod.slice(0, 5), { note: `...${restDaysInPeriod.length - 10} more...` }, ...restDaysInPeriod.slice(-5)]
          : restDaysInPeriod,
      } : undefined,
      generatedAt: new Date(),
    };
  }

  /**
   * Check if attendance date requires penalty suppression (holiday OR rest day)
   * BR-TM-19: Comprehensive check for both holidays and rest days
   */
  async checkPenaltySuppression(
    params: {
      employeeId: string;
      date: Date;
      restDays?: number[];
    },
    currentUserId: string,
  ) {
    const { employeeId, date, restDays = [5, 6] } = params;
    
    // Check if it's a holiday
    const holidayCheck = await this.checkHoliday({ date }, currentUserId);
    
    // Check if it's a rest day
    const restDayCheck = await this.checkRestDay({ date, restDays }, currentUserId);
    
    const shouldSuppressPenalty = holidayCheck.isHoliday || restDayCheck.isRestDay;
    
    let suppressionReason = '';
    if (holidayCheck.isHoliday && restDayCheck.isRestDay) {
      suppressionReason = `${holidayCheck.holiday?.name || 'Holiday'} (also a rest day)`;
    } else if (holidayCheck.isHoliday) {
      suppressionReason = holidayCheck.holiday?.name || 'Holiday';
    } else if (restDayCheck.isRestDay) {
      suppressionReason = `Rest day (${restDayCheck.dayName})`;
    }
    
    return {
      employeeId,
      date,
      dayName: restDayCheck.dayName,
      checks: {
        isHoliday: holidayCheck.isHoliday,
        holidayName: holidayCheck.holiday?.name || null,
        holidayType: holidayCheck.holiday?.type || null,
        isRestDay: restDayCheck.isRestDay,
      },
      penaltySuppression: {
        suppress: shouldSuppressPenalty,
        reason: suppressionReason || 'Working day - no suppression',
      },
      recommendation: shouldSuppressPenalty
        ? 'No attendance penalties should be applied'
        : 'Standard attendance rules apply',
      checkedAt: new Date(),
    };
  }

  /**
   * Link holidays to shift schedules
   * BR-TM-19: Holidays must be linked to shift schedules
   */
  async linkHolidaysToShift(
    params: {
      shiftId: string;
      holidayIds: string[];
      action: 'NO_WORK' | 'OPTIONAL' | 'OVERTIME_ELIGIBLE';
    },
    currentUserId: string,
  ) {
    const { shiftId, holidayIds, action } = params;
    
    // Validate holidays exist
    const holidays = await this.holidayModel
      .find({ _id: { $in: holidayIds }, active: true })
      .exec();
    
    if (holidays.length === 0) {
      return {
        success: false,
        message: 'No valid holidays found',
      };
    }
    
    const linkedHolidays = holidays.map(h => ({
      holidayId: (h as any)._id,
      name: h.name,
      startDate: h.startDate,
      type: h.type,
    }));
    
    return {
      success: true,
      shiftId,
      action,
      actionDescription: action === 'NO_WORK' 
        ? 'Employees are not expected to work'
        : action === 'OPTIONAL'
          ? 'Work is optional with no penalty for absence'
          : 'Work is overtime-eligible with premium rates',
      linkedHolidays,
      holidayCount: linkedHolidays.length,
      linkedAt: new Date(),
      linkedBy: currentUserId,
    };
  }

  /**
   * Get holidays affecting a specific employee's schedule
   * BR-TM-19: Employee-specific holiday view
   */
  async getEmployeeHolidaySchedule(
    params: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
      restDays?: number[];
    },
    currentUserId: string,
  ) {
    const { employeeId, startDate, endDate, restDays = [5, 6] } = params;
    
    // Get holidays in range
    const holidays = await this.holidayModel
      .find({
        active: true,
        startDate: { $lte: endDate },
        $or: [
          { endDate: { $gte: startDate } },
          { endDate: { $exists: false }, startDate: { $gte: startDate } },
        ],
      })
      .sort({ startDate: 1 })
      .exec();
    
    // Calculate all non-working days
    const nonWorkingDays: any[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Add holidays
    holidays.forEach(h => {
      const hStart = new Date(h.startDate);
      const hEnd = h.endDate ? new Date(h.endDate) : new Date(h.startDate);
      
      const current = new Date(hStart);
      while (current <= hEnd) {
        if (current >= startDate && current <= endDate) {
          nonWorkingDays.push({
            date: new Date(current),
            type: 'HOLIDAY',
            name: h.name || 'Holiday',
            holidayType: h.type,
          });
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    // Add rest days
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (restDays.includes(currentDate.getDay())) {
        // Check if not already a holiday
        const isHoliday = nonWorkingDays.some(
          d => d.type === 'HOLIDAY' && d.date.toDateString() === currentDate.toDateString()
        );
        if (!isHoliday) {
          nonWorkingDays.push({
            date: new Date(currentDate),
            type: 'REST_DAY',
            name: dayNames[currentDate.getDay()],
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sort by date
    nonWorkingDays.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate working days
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workingDays = totalDays - nonWorkingDays.length;
    
    return {
      employeeId,
      period: { startDate, endDate },
      summary: {
        totalDays,
        workingDays,
        nonWorkingDays: nonWorkingDays.length,
        holidays: nonWorkingDays.filter(d => d.type === 'HOLIDAY').length,
        restDays: nonWorkingDays.filter(d => d.type === 'REST_DAY').length,
      },
      configuredRestDays: restDays.map(d => dayNames[d]),
      nonWorkingDays,
      generatedAt: new Date(),
    };
  }

  // ===== HOLIDAY VALIDATION METHODS =====


  // Check if a specific date is a holiday
  async checkHoliday(checkHolidayDto: CheckHolidayDto, currentUserId: string) {
    const date = new Date(checkHolidayDto.date);
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const holiday = await this.holidayModel
      .findOne({
        active: true,
        $or: [
          // Single day holiday
          {
            startDate: { $gte: date, $lt: nextDay },
            endDate: { $exists: false },
          },
          // Multi-day holiday that covers this date
          {
            startDate: { $lte: date },
            endDate: { $gte: date },
          },
          // Single day holiday with same start and end
          {
            startDate: { $gte: date, $lt: nextDay },
            endDate: { $gte: date, $lt: nextDay },
          },
        ],
      })
      .exec();

    return {
      isHoliday: !!holiday,
      holiday: holiday || null,
    };
  }

  // Validate attendance against holidays (suppress penalty if holiday)
  async validateAttendanceHoliday(
    validateAttendanceHolidayDto: ValidateAttendanceHolidayDto,
    currentUserId: string,
  ) {
    const { employeeId, date, suppressPenalty } = validateAttendanceHolidayDto;

    const holidayCheck = await this.checkHoliday({ date }, currentUserId);

    if (holidayCheck.isHoliday && suppressPenalty) {
      return {
        employeeId,
        date,
        isHoliday: true,
        holidayName: holidayCheck.holiday?.name || 'Holiday',
        holidayType: holidayCheck.holiday?.type,
        penaltySuppressed: true,
        message: 'Attendance penalty suppressed due to holiday',
      };
    }

    return {
      employeeId,
      date,
      isHoliday: holidayCheck.isHoliday,
      holidayName: holidayCheck.holiday?.name || null,
      holidayType: holidayCheck.holiday?.type || null,
      penaltySuppressed: false,
      message: holidayCheck.isHoliday
        ? 'Date is a holiday but penalty suppression not requested'
        : 'Date is not a holiday',
    };
  }

  // Get upcoming holidays (next N days)
  async getUpcomingHolidays(days: number = 30, currentUserId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    return this.holidayModel
      .find({
        active: true,
        startDate: { $gte: today, $lte: futureDate },
      })
      .sort({ startDate: 1 })
      .exec();
  }

  // ===== PERMISSION POLICY METHODS (Using OvertimeRule schema) =====
  // Since we cannot create new schemas, we use OvertimeRule schema to store permission policies
  // We use a naming convention: name starts with "PERMISSION_POLICY:" to identify them
  // Additional data is stored in the description field as JSON
  private readonly PERMISSION_POLICY_PREFIX = 'PERMISSION_POLICY:';

  async createPermissionPolicy(data: any, currentUserId: string) {
    const policyData = {
      name: `${this.PERMISSION_POLICY_PREFIX}${data.name}`,
      description: JSON.stringify({
        permissionType: data.permissionType,
        maxDurationMinutes: data.maxDurationMinutes,
        requiresApproval: data.requiresApproval,
        affectsPayroll: data.affectsPayroll,
        originalDescription: data.description,
      }),
      active: data.active !== undefined ? data.active : true,
      approved: data.requiresApproval || data.affectsPayroll, // Use approved field to indicate if policy requires approval/affects payroll
    };
    
    console.log('[PermissionPolicy] Creating policy with data:', JSON.stringify(policyData, null, 2));
    
    const overtimeRule = await this.createOvertimeRule(policyData, currentUserId);
    
    console.log('[PermissionPolicy] Created overtime rule:', overtimeRule._id, 'Name:', overtimeRule.name);
    
    // Return in the format expected by frontend
    return this.mapOvertimeRuleToPermissionPolicy(overtimeRule);
  }

  async getPermissionPolicies(currentUserId: string) {
    try {
      // Query directly for rules with the prefix
      const query = { name: { $regex: `^${this.PERMISSION_POLICY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } };
      console.log('[PermissionPolicy] Query:', JSON.stringify(query));
      
      const allRules = await this.overtimeRuleModel.find({}).exec();
      console.log('[PermissionPolicy] Total overtime rules found:', allRules.length);
      console.log('[PermissionPolicy] Sample rule names:', allRules.slice(0, 3).map((r: any) => r.name));
      console.log('[PermissionPolicy] Looking for prefix:', this.PERMISSION_POLICY_PREFIX);
      
      const permissionPolicies = allRules
        .filter((rule: any) => {
          const matches = rule.name?.startsWith(this.PERMISSION_POLICY_PREFIX);
          if (matches) {
            console.log('[PermissionPolicy] Found matching rule:', rule._id, rule.name);
          }
          return matches;
        })
        .map((rule: any) => this.mapOvertimeRuleToPermissionPolicy(rule));
      
      console.log('[PermissionPolicy] Returning', permissionPolicies.length, 'permission policies');
      return permissionPolicies;
    } catch (error: any) {
      console.error('[PermissionPolicy] Error in getPermissionPolicies:', error);
      throw error;
    }
  }

  async getPermissionPolicyById(id: string, currentUserId: string) {
    const rule = await this.overtimeRuleModel.findById(id).exec();
    if (!rule) {
      throw new Error('Permission policy not found');
    }
    if (!rule.name?.startsWith(this.PERMISSION_POLICY_PREFIX)) {
      throw new Error('Not a permission policy');
    }
    return this.mapOvertimeRuleToPermissionPolicy(rule);
  }

  async updatePermissionPolicy(id: string, data: any, currentUserId: string) {
    const rule = await this.overtimeRuleModel.findById(id).exec();
    if (!rule) {
      throw new Error('Permission policy not found');
    }
    if (!rule.name?.startsWith(this.PERMISSION_POLICY_PREFIX)) {
      throw new Error('Not a permission policy');
    }
    
    const policyData = {
      name: `${this.PERMISSION_POLICY_PREFIX}${data.name}`,
      description: JSON.stringify({
        permissionType: data.permissionType,
        maxDurationMinutes: data.maxDurationMinutes,
        requiresApproval: data.requiresApproval,
        affectsPayroll: data.affectsPayroll,
        originalDescription: data.description,
      }),
      active: data.active,
      approved: data.requiresApproval || data.affectsPayroll,
    };
    
    const updatedRule = await this.updateOvertimeRule(id, policyData, currentUserId);
    return this.mapOvertimeRuleToPermissionPolicy(updatedRule);
  }

  async deletePermissionPolicy(id: string, currentUserId: string) {
    const rule = await this.overtimeRuleModel.findById(id).exec();
    if (!rule) {
      throw new Error('Permission policy not found');
    }
    if (!rule.name?.startsWith(this.PERMISSION_POLICY_PREFIX)) {
      throw new Error('Not a permission policy');
    }
    await this.deleteOvertimeRule(id, currentUserId);
    return { message: 'Permission policy deleted successfully' };
  }

  // Helper: Map OvertimeRule to PermissionPolicy format
  private mapOvertimeRuleToPermissionPolicy(rule: any) {
    let policyData: any = {};
    try {
      policyData = JSON.parse(rule.description || '{}');
    } catch (e) {
      // If description is not JSON, treat as empty
    }
    
    return {
      _id: rule._id.toString(),
      name: rule.name?.replace(this.PERMISSION_POLICY_PREFIX, '') || '',
      description: policyData.originalDescription || rule.description || '',
      permissionType: policyData.permissionType || 'EARLY_IN',
      maxDurationMinutes: policyData.maxDurationMinutes || 60,
      requiresApproval: policyData.requiresApproval !== undefined ? policyData.requiresApproval : true,
      affectsPayroll: policyData.affectsPayroll !== undefined ? policyData.affectsPayroll : true,
      active: rule.active !== undefined ? rule.active : true,
      createdAt: rule.createdAt?.toISOString(),
      updatedAt: rule.updatedAt?.toISOString(),
    };
  }
}
