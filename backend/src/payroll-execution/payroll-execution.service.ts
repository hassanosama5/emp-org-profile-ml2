import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { CreatePayrollRunDto } from './dto/CreatePayrollRunDto.dto';
import { EmployeePayrollDetailsUpsertDto } from './dto/EmployeePayrollDetailsUpsertDto.dto';
import { PublishRunForApprovalDto } from './dto/PublishRunForApprovalDto.dto';
import { payrollRuns, payrollRunsDocument } from './models/payrollRuns.schema'; // ensure correct import path
import {
  employeePayrollDetails,
  employeePayrollDetailsDocument,
} from './models/employeePayrollDetails.schema';
import {
  employeeSigningBonus,
  employeeSigningBonusDocument,
} from './models/EmployeeSigningBonus.schema';
import {
  EmployeeTerminationResignation,
  EmployeeTerminationResignationDocument,
} from './models/EmployeeTerminationResignation.schema';
import { paySlip, PayslipDocument } from './models/payslip.schema';
import { PayrollConfigurationService } from '../payroll-configuration/payroll-configuration.service';
import { PayrollTrackingService } from '../payroll-tracking/payroll-tracking.service';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { LeavesService } from '../leaves/leaves.service';
import {
  PayRollStatus,
  BonusStatus,
  BenefitStatus,
  PayRollPaymentStatus,
  PaySlipPaymentStatus,
} from './enums/payroll-execution-enum';
import { LeaveStatus } from '../leaves/enums/leave-status.enum';
import {
  TimeExceptionType,
  TimeExceptionStatus,
} from '../time-management/models/enums/index';
import { RefundStatus } from '../payroll-tracking/enums/payroll-tracking-enum';
import { SigningBonusReviewDto } from './dto/SigningBonusReviewDto.dto';
import { SigningBonusEditDto } from './dto/SigningBonusEditDto.dto';
import { CreateEmployeeSigningBonusDto } from './dto/CreateEmployeeSigningBonusDto.dto';
import { CreateEmployeeTerminationBenefitDto } from './dto/CreateEmployeeTerminationBenefitDto.dto';
import { TerminationBenefitReviewDto } from './dto/TerminationBenefitReviewDto.dto';
import { TerminationBenefitEditDto } from './dto/TerminationBenefitEditDto.dto';
import { FinanceDecisionDto } from './dto/FinanceDecisionDto.dto';
import { ManagerApprovalReviewDto } from './dto/ManagerApprovalReviewDto.dto';
import { ReviewPayrollPeriodDto } from './dto/ReviewPayrollPeriodDto.dto';
import { EditPayrollPeriodDto } from './dto/EditPayrollPeriodDto.dto';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsDocument } from '../payroll-configuration/models/terminationAndResignationBenefits';
import { allowance, allowanceDocument } from '../payroll-configuration/models/allowance.schema';
import { taxRules, taxRulesDocument } from '../payroll-configuration/models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsDocument } from '../payroll-configuration/models/insuranceBrackets.schema';
import { payGrade, payGradeDocument } from '../payroll-configuration/models/payGrades.schema';
import { TerminationRequest } from '../recruitment/models/termination-request.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { Position } from '../organization-structure/models/position.schema';
import {
  employeePenalties,
  employeePenaltiesDocument,
} from './models/employeePenalties.schema';
import { ConfigStatus } from '../payroll-configuration/enums/payroll-configuration-enums';
import { EmployeeStatus, SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { TerminationStatus } from '../recruitment/enums/termination-status.enum';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../employee-profile/models/employee-system-role.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { ExtendedNotification } from '../notifications/models/extended-notification.schema';

/**
 * ====================================================================================
 * PAYROLL EXECUTION SERVICE - COMPLETE PAYROLL PROCESSING WORKFLOW
 * ====================================================================================
 * 
 * This service implements the complete payroll processing workflow organized by phases:
 * 
 * PHASE 0 - Pre-Run Reviews & Approvals:
 *   - Review, edit, approve/reject signing bonuses
 *   - Review, edit, approve/reject termination/resignation benefits
 *   - Ensures all pending items are reviewed before payroll initiation
 * 
 * PHASE 1 - Payroll Initiation:
 *   - Process payroll initiation (create payroll run)
 *   - Review payroll period (approve/reject)
 *   - Edit payroll initiation if rejected
 * 
 * PHASE 1.1 - Payroll Draft Generation:
 *   - Phase 1.1.A: Fetch employees & check HR events (new hire, termination, resignation)
 *     * Auto-process signing bonuses for new hires
 *     * Auto-process termination/resignation benefits
 *   - Phase 1.1.B: Salary calculations
 *     * Calculate base salary from PayGrade
 *     * Calculate allowances
 *     * Calculate deductions (Taxes = % of Base Salary, Insurance)
 *     * Calculate Net Salary = Gross - Taxes - Insurance
 *     * Calculate penalties (missing hours/days, unpaid leave)
 *     * Calculate refunds
 *     * Calculate Net Pay = Net Salary - Penalties + Refunds
 *     * Prorated salary for mid-month hires/terminations
 *   - Phase 1.1.C: Draft generation with full breakdowns
 * 
 * PHASE 2 - Payroll Draft Review:
 *   - Flag irregularities (salary spikes, missing bank accounts, negative net pay)
 *   - Status changes to UNDER_REVIEW
 * 
 * PHASE 3 - Review & Approval:
 *   - Payroll Specialist: Review in preview dashboard, publish for approval
 *   - Payroll Manager: Review, resolve exceptions, approve/reject
 *   - Finance Staff: Review, approve/reject (sets paymentStatus to PAID if approved)
 *   - Payroll Manager: Lock/freeze payroll after Finance approval
 *   - Payroll Manager: Unfreeze with reason if needed
 * 
 * PHASE 5 - Execution:
 *   - Auto-generate and distribute payslips (PDF, Email, Portal)
 *   - Only after Finance approval and Lock status
 * 
 * All calculations follow business rules:
 * - Net Salary = Gross Salary (Base + Allowances) - Taxes (% of Base) - Insurance
 * - Net Pay = Net Salary - Penalties + Refunds
 * - All deductions applied after gross salary calculation
 * - Contract validation before processing
 * - Multi-currency support
 * - Prorated salaries for partial periods
 * ====================================================================================
 */
@Injectable()
export class PayrollExecutionService {
  constructor(
    @InjectModel(payrollRuns.name)
    private payrollRunModel: Model<payrollRunsDocument>,
    @InjectModel(employeePayrollDetails.name)
    private employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
    @InjectModel(employeeSigningBonus.name)
    private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
    @InjectModel(EmployeeTerminationResignation.name)
    private employeeTerminationResignationModel: Model<EmployeeTerminationResignationDocument>,
    @InjectModel(paySlip.name) private paySlipModel: Model<PayslipDocument>,
    @InjectModel(employeePenalties.name) private employeePenaltiesModel: Model<employeePenaltiesDocument>,
    @InjectModel(EmployeeSystemRole.name) private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
    @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfile>,
    @InjectModel('ExtendedNotification') private notificationLogModel: Model<any>,
    // PayrollConfigurationService is exported from PayrollConfigurationModule - inject directly
    private readonly payrollConfigurationService: PayrollConfigurationService,
    // PayrollTrackingService uses forwardRef due to potential circular dependency
    @Inject(forwardRef(() => PayrollTrackingService))
    private payrollTrackingService: PayrollTrackingService,
    // EmployeeProfileService is exported from EmployeeProfileModule - inject directly
    private readonly employeeProfileService: EmployeeProfileService,
    // LeavesService is exported from LeavesModule - inject directly
    private readonly leavesService: LeavesService,
    // NotificationsService is exported from NotificationsModule - inject directly
    private readonly notificationsService: NotificationsService,
  ) {}

  // ====================================================================================
  // NOTIFICATION HELPER METHODS
  // ====================================================================================
  /**
   * Helper method to send payroll notifications
   * @param type - Notification type
   * @param recipientId - Employee ID to notify
   * @param message - Notification message
   * @param data - Additional data for notification
   * @param title - Optional title for notification
   */
  /**
   * Helper method to send payroll notifications
   * @param type - Notification type
   * @param recipientId - Employee ID to notify
   * @param message - Notification message
   * @param data - Additional data for notification
   * @param title - Optional title for notification
   */
  private async sendPayrollNotification(
    type: NotificationType,
    recipientId: string,
    message: string,
    data?: any,
    title?: string,
  ): Promise<void> {
    try {
      await this.notificationLogModel.create({
        to: new mongoose.Types.ObjectId(recipientId),
        type: type,
        message: message,
        data: data || {},
        title: title,
        isRead: false,
      });
    } catch (error) {
      // Log error but don't fail the operation
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to send notification to ${recipientId}:`, errorMessage);
    }
  }

  // ====================================================================================
  // PHASE 0: PRE-RUN REVIEWS & APPROVALS
  // ====================================================================================
  // Phase 0 ensures all signing bonuses and termination benefits are reviewed/approved
  // before payroll initiation can begin.
  // ====================================================================================

  async createPayrollRun(createPayrollRunDto: CreatePayrollRunDto, currentUserId: string): Promise<payrollRuns> {
    // Ensure payrollManagerId is set - use provided one or find default
    let payrollManagerId = createPayrollRunDto.payrollManagerId;
    if (!payrollManagerId) {
      const defaultManager = await this.findDefaultPayrollManager();
      if (!defaultManager) {
        throw new Error('No payroll manager found. Please provide payrollManagerId or ensure a payroll manager exists in the system.');
      }
      payrollManagerId = defaultManager;
    }

    // Validate that payrollManagerId is different from payrollSpecialistId
    if (payrollManagerId === createPayrollRunDto.payrollSpecialistId) {
      throw new Error('Payroll manager must be different from payroll specialist.');
    }

    const payrollRun = new this.payrollRunModel({
      ...createPayrollRunDto,
      exceptions: createPayrollRunDto.exceptions ?? 0, // Default to 0 if not provided
      payrollManagerId: new mongoose.Types.ObjectId(payrollManagerId) as any,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return await payrollRun.save();
  }

  async reviewPayroll(
    runId: string,
    reviewDto: PublishRunForApprovalDto,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(runId);
    if (!payrollRun) throw new Error('Payroll run not found');
    payrollRun.status = PayRollStatus.UNDER_REVIEW;
    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
  }

  async generateEmployeePayrollDetails(
    employeePayrollDetailsDto: EmployeePayrollDetailsUpsertDto,
    currentUserId: string,
  ): Promise<employeePayrollDetails> {
    const employeePayrollDetails = new this.employeePayrollDetailsModel({
      ...employeePayrollDetailsDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    return await employeePayrollDetails.save();
  }

  // REQ-PY-5: Flag irregularities (e.g., sudden salary spikes, missing bank accounts, negative net pay)
  // BR 9: Irregularity flagging with detailed tracking per employee
  async flagPayrollException(
    runId: string,
    exceptionCode: string,
    exceptionMessage: string,
    currentUserId: string,
    employeeId?: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(runId);

    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Increment the exceptions count by 1
    payrollRun.exceptions += 1;

    // If employeeId is provided, store exception in employee's payroll details
    if (employeeId) {
      await this.addExceptionToEmployee(
        employeeId,
        runId,
        exceptionCode,
        exceptionMessage,
      );
    }

    // Log the exception details
    const exceptionDetails = {
      code: exceptionCode,
      message: exceptionMessage,
      payrollRunId: runId,
      employeeId: employeeId || 'N/A',
      timestamp: new Date(),
    };

    console.log('Logged exception:', exceptionDetails);

    // Save the updated payrollRun document
    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
  }

  // Helper: Add exception to employee's payroll details with history tracking
  // BR 9: Detailed exception tracking per employee
  private async addExceptionToEmployee(
    employeeId: string,
    payrollRunId: string,
    exceptionCode: string,
    exceptionMessage: string,
  ): Promise<void> {
    try {
      const payrollDetails = await this.employeePayrollDetailsModel.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId) as any,
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      });

      if (!payrollDetails) {
        // If payroll details don't exist yet, create a placeholder entry
        // This can happen if exception is flagged before payroll calculation
        console.warn(
          `Payroll details not found for employee ${employeeId} in run ${payrollRunId}. Exception logged but not stored per employee.`,
        );
        return;
      }

      // Parse existing exceptions JSON or create new structure
      let exceptionsData: any = {};
      if (payrollDetails.exceptions) {
        try {
          exceptionsData = JSON.parse(payrollDetails.exceptions);
        } catch (error) {
          // If parsing fails, start fresh but preserve deductions breakdown if it exists
          if (
            typeof payrollDetails.exceptions === 'string' &&
            payrollDetails.exceptions.includes('deductionsBreakdown')
          ) {
            try {
              exceptionsData = JSON.parse(payrollDetails.exceptions);
            } catch (e) {
              exceptionsData = {};
            }
          } else {
            exceptionsData = {};
          }
        }
      }

      // Initialize arrays if they don't exist
      if (!exceptionsData.exceptionMessages) {
        exceptionsData.exceptionMessages = [];
      }
      if (!exceptionsData.exceptionHistory) {
        exceptionsData.exceptionHistory = [];
      }

      // Create exception entry
      const exceptionEntry = {
        code: exceptionCode,
        message: exceptionMessage,
        timestamp: new Date().toISOString(),
        status: 'active', // active or resolved
        resolvedBy: null as string | null,
        resolvedAt: null as string | null,
        resolution: null as string | null,
      };

      // Add to active exceptions
      exceptionsData.exceptionMessages.push(exceptionEntry);

      // Also add to history for tracking
      exceptionsData.exceptionHistory.push({
        ...exceptionEntry,
        action: 'flagged',
      });

      // Update the exceptions field with the new structure
      payrollDetails.exceptions = JSON.stringify(exceptionsData);
      await payrollDetails.save();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error adding exception to employee ${employeeId}: ${errorMessage}`,
      );
      // Don't throw - allow payroll run exception count to be updated even if per-employee storage fails
    }
  }

  // ====================================================================================
  // PHASE 2: PAYROLL DRAFT REVIEW & IRREGULARITY FLAGGING
  // ====================================================================================
  // REQ-PY-5: Auto-detect and flag irregularities
  // BR 9: Irregularity flagging with detailed tracking per employee
  async detectIrregularities(
    payrollRunId: string,
    currentUserId: string,
  ): Promise<string[]> {
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    const irregularities: string[] = [];
    const payrollDetails = await this.employeePayrollDetailsModel
      .find({
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      })
      .populate('employeeId')
      .exec();

    for (const detail of payrollDetails) {
      const employeeId =
        (detail.employeeId as any)._id?.toString() ||
        (detail.employeeId as any).toString();

      // Check for negative net pay
      if (detail.netPay < 0) {
        const message = `Employee has negative net pay: ${detail.netPay}`;
        irregularities.push(
          `Employee ${employeeId} has negative net pay: ${detail.netPay}`,
        );
        await this.flagPayrollException(
          payrollRunId,
          'NEGATIVE_NET_PAY',
          message,
          currentUserId,
          employeeId,
        );
      }

      // Check for missing bank accounts
      if (detail.bankStatus === 'missing') {
        const message = 'Employee has missing bank account';
        irregularities.push(`Employee ${employeeId} has missing bank account`);
        await this.flagPayrollException(
          payrollRunId,
          'MISSING_BANK_ACCOUNT',
          message,
          currentUserId,
          employeeId,
        );
      }

      // Check for sudden salary spikes (compare with previous payroll runs)
      // BR 9: Historical payroll data comparison for accurate spike detection
      try {
        const employee = await this.employeeProfileService.findOne(employeeId);
        if (employee && detail.baseSalary > 0) {
          // Get historical payroll data for this employee
          const historicalData = await this.getEmployeeHistoricalPayrollData(
            employeeId,
            payrollRun.payrollPeriod,
          );

          if (historicalData && historicalData.averageBaseSalary > 0) {
            // Calculate percentage increase from historical average
            const percentageIncrease =
              ((detail.baseSalary - historicalData.averageBaseSalary) /
                historicalData.averageBaseSalary) *
              100;

            // Flag if salary is more than 200% of average OR more than 50% increase
            const isSpike =
              detail.baseSalary > historicalData.averageBaseSalary * 2 ||
              percentageIncrease > 50;

            if (isSpike) {
              const message = `Sudden salary spike detected: Current ${detail.baseSalary} vs Historical Average ${historicalData.averageBaseSalary.toFixed(2)} (${percentageIncrease.toFixed(1)}% increase). Previous runs: ${historicalData.previousRunsCount}`;
              irregularities.push(
                `Employee ${employeeId} has sudden salary spike: ${detail.baseSalary} (${percentageIncrease.toFixed(1)}% increase from average)`,
              );
              await this.flagPayrollException(
                payrollRunId,
                'SALARY_SPIKE',
                message,
                currentUserId,
                employeeId,
              );
            }
          } else if (historicalData && historicalData.previousRunsCount === 0) {
            // First payroll for this employee - no historical data to compare
            // Could optionally flag if salary seems unusually high, but we'll skip for now
            // as there's no baseline to compare against
          }
        }
      } catch (error) {
        // Skip if employee not found or error in historical data retrieval
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Error checking salary spike for employee ${employeeId}: ${errorMessage}`,
        );
      }
    }

    return irregularities;
  }

  // Helper: Validate pre-initiation requirements
  // Requirement 0: Reviews/approvals before start of payroll initiation
  // Ensures all signing bonuses and termination benefits are reviewed/approved before payroll initiation
  private async validatePreInitiationRequirements(): Promise<{
    isValid: boolean;
    errorMessage?: string;
    pendingSigningBonuses?: any[];
    pendingTerminationBenefits?: any[];
  }> {
    // Check for pending signing bonuses that need review
    const pendingSigningBonuses = await this.employeeSigningBonusModel
      .find({
        status: BonusStatus.PENDING,
      })
      .populate('employeeId', 'employeeNumber firstName lastName')
      .populate('signingBonusId', 'name amount')
      .select('_id employeeId signingBonusId givenAmount status createdAt')
      .exec();

    // Check for pending termination benefits that need review
    const pendingTerminationBenefits =
      await this.employeeTerminationResignationModel
        .find({
          status: BenefitStatus.PENDING,
        })
        .populate('employeeId', 'employeeNumber firstName lastName')
        .populate('benefitId', 'name amount')
        .select(
          '_id employeeId benefitId givenAmount status terminationId createdAt',
        )
        .exec();

    if (
      pendingSigningBonuses.length > 0 ||
      pendingTerminationBenefits.length > 0
    ) {
      // Build detailed error message with specific items
      const errorDetails: string[] = [];

      if (pendingSigningBonuses.length > 0) {
        const bonusDetails = pendingSigningBonuses
          .map((bonus: any) => {
            const employee = bonus.employeeId as any;
            const employeeInfo =
              employee?.employeeNumber ||
              employee?._id?.toString() ||
              'Unknown';
            const bonusConfig = bonus.signingBonusId as any;
            const bonusName = bonusConfig?.name || 'Unknown Bonus';
            const amount = bonus.givenAmount || bonusConfig?.amount || 0;
            return `  - Signing Bonus ID: ${bonus._id}, Employee: ${employeeInfo}, Bonus: ${bonusName}, Amount: ${amount}`;
          })
          .join('\n');

        errorDetails.push(
          `Pending Signing Bonuses (${pendingSigningBonuses.length}):\n${bonusDetails}`,
        );
      }

      if (pendingTerminationBenefits.length > 0) {
        const benefitDetails = pendingTerminationBenefits
          .map((benefit: any) => {
            const employee = benefit.employeeId as any;
            const employeeInfo =
              employee?.employeeNumber ||
              employee?._id?.toString() ||
              'Unknown';
            const benefitConfig = benefit.benefitId as any;
            const benefitName = benefitConfig?.name || 'Unknown Benefit';
            const amount = benefit.givenAmount || benefitConfig?.amount || 0;
            return `  - Termination Benefit ID: ${benefit._id}, Employee: ${employeeInfo}, Benefit: ${benefitName}, Amount: ${amount}`;
          })
          .join('\n');

        errorDetails.push(
          `Pending Termination Benefits (${pendingTerminationBenefits.length}):\n${benefitDetails}`,
        );
      }

      const errorMessage =
        `Cannot initiate payroll. There are pending items that require review before payroll initiation:\n\n` +
        `${errorDetails.join('\n\n')}\n\n` +
        `Please review and approve/reject these items before initiating payroll. ` +
        `You can use the review endpoints to process these items.`;

      return {
        isValid: false,
        errorMessage,
        pendingSigningBonuses: pendingSigningBonuses.map((b: any) => ({
          id: b._id.toString(),
          employeeId:
            (b.employeeId as any)?._id?.toString() ||
            (b.employeeId as any)?.toString(),
          employeeNumber: (b.employeeId as any)?.employeeNumber,
          signingBonusId: (b.signingBonusId as any)?._id?.toString(),
          bonusName: (b.signingBonusId as any)?.name,
          givenAmount: b.givenAmount,
          createdAt: b.createdAt,
        })),
        pendingTerminationBenefits: pendingTerminationBenefits.map(
          (b: any) => ({
            id: b._id.toString(),
            employeeId:
              (b.employeeId as any)?._id?.toString() ||
              (b.employeeId as any)?.toString(),
            employeeNumber: (b.employeeId as any)?.employeeNumber,
            benefitId: (b.benefitId as any)?._id?.toString(),
            benefitName: (b.benefitId as any)?.name,
            givenAmount: b.givenAmount,
            terminationId: (b.terminationId as any)?.toString(),
            createdAt: b.createdAt,
          }),
        ),
      };
    }

    return {
      isValid: true,
    };
  }

  // Helper: Get pre-initiation validation status (for reporting/UI)
  // Requirement 0: Reviews/approvals before start of payroll initiation
  async getPreInitiationValidationStatus(currentUserId: string): Promise<{
    signingBonuses: {
      pending: number;
      approved: number;
      rejected: number;
      total: number;
    };
    terminationBenefits: {
      pending: number;
      approved: number;
      rejected: number;
      total: number;
    };
    payrollPeriod: {
      status: 'pending' | 'approved' | 'rejected';
      payrollRunId?: string;
      period?: string;
    };
    allReviewsComplete: boolean;
  }> {
    // Count signing bonuses by status
    const [signingBonusesPending, signingBonusesApproved, signingBonusesRejected, signingBonusesTotal] = await Promise.all([
      this.employeeSigningBonusModel.countDocuments({ status: BonusStatus.PENDING }).exec(),
      this.employeeSigningBonusModel.countDocuments({ status: BonusStatus.APPROVED }).exec(),
      this.employeeSigningBonusModel.countDocuments({ status: BonusStatus.REJECTED }).exec(),
      this.employeeSigningBonusModel.countDocuments().exec(),
    ]);

    // Count termination benefits by status
    const [terminationBenefitsPending, terminationBenefitsApproved, terminationBenefitsRejected, terminationBenefitsTotal] = await Promise.all([
      this.employeeTerminationResignationModel.countDocuments({ status: BenefitStatus.PENDING }).exec(),
      this.employeeTerminationResignationModel.countDocuments({ status: BenefitStatus.APPROVED }).exec(),
      this.employeeTerminationResignationModel.countDocuments({ status: BenefitStatus.REJECTED }).exec(),
      this.employeeTerminationResignationModel.countDocuments().exec(),
    ]);

    // Get the most recent payroll run to check period status
    const latestPayrollRun = await this.payrollRunModel
      .findOne()
      .sort({ createdAt: -1 })
      .exec();

    let payrollPeriodStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    let payrollRunId: string | undefined;
    let period: string | undefined;

    if (latestPayrollRun) {
      payrollRunId = latestPayrollRun._id.toString();
      
      // Convert payrollPeriod Date to string format (YYYY-MM-DD)
      if (latestPayrollRun.payrollPeriod) {
        const date = new Date(latestPayrollRun.payrollPeriod);
        period = date.toISOString().split('T')[0];
      }

      // Determine status based on payroll run status
      if (latestPayrollRun.status === PayRollStatus.APPROVED || latestPayrollRun.status === PayRollStatus.LOCKED) {
        payrollPeriodStatus = 'approved';
      } else if (latestPayrollRun.status === PayRollStatus.REJECTED) {
        payrollPeriodStatus = 'rejected';
      } else {
        payrollPeriodStatus = 'pending';
      }
    }

    // Check if all reviews are complete
    const allReviewsComplete = 
      signingBonusesPending === 0 && 
      terminationBenefitsPending === 0 && 
      payrollPeriodStatus === 'approved';

    return {
      signingBonuses: {
        pending: signingBonusesPending,
        approved: signingBonusesApproved,
        rejected: signingBonusesRejected,
        total: signingBonusesTotal,
      },
      terminationBenefits: {
        pending: terminationBenefitsPending,
        approved: terminationBenefitsApproved,
        rejected: terminationBenefitsRejected,
        total: terminationBenefitsTotal,
      },
      payrollPeriod: {
        status: payrollPeriodStatus,
        payrollRunId,
        period,
      },
      allReviewsComplete,
    };
  }

  // Helper: Validate payroll run status transition
  // BR: Enforce proper workflow sequence (DRAFT → UNDER_REVIEW → PENDING_FINANCE → APPROVED → LOCKED)
  private validateStatusTransition(
    currentStatus: PayRollStatus,
    newStatus: PayRollStatus,
  ): void {
    // Define valid status transitions
    const validTransitions: Record<PayRollStatus, PayRollStatus[]> = {
      [PayRollStatus.DRAFT]: [
        PayRollStatus.UNDER_REVIEW, // Send for approval
        PayRollStatus.REJECTED, // Reject during initiation review
      ],
      [PayRollStatus.UNDER_REVIEW]: [
        PayRollStatus.PENDING_FINANCE_APPROVAL, // Manager approves
        PayRollStatus.REJECTED, // Manager rejects
      ],
      [PayRollStatus.PENDING_FINANCE_APPROVAL]: [
        PayRollStatus.APPROVED, // Finance approves
        PayRollStatus.REJECTED, // Finance rejects
      ],
      [PayRollStatus.APPROVED]: [
        PayRollStatus.LOCKED, // Lock after approval
      ],
      [PayRollStatus.LOCKED]: [
        PayRollStatus.UNLOCKED, // Unlock for corrections
      ],
      [PayRollStatus.UNLOCKED]: [
        PayRollStatus.LOCKED, // Re-lock after corrections
      ],
      [PayRollStatus.REJECTED]: [
        // Rejected payrolls can be recreated (new DRAFT), but cannot transition directly
        // They must be recreated as new payroll runs
      ],
    };

    // Check if transition is valid
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      const allowedStatuses =
        allowedTransitions.length > 0
          ? allowedTransitions.join(', ')
          : 'none (must be recreated)';

      throw new Error(
        `Invalid status transition: Cannot change from '${currentStatus}' to '${newStatus}'. ` +
          `Valid transitions from '${currentStatus}' are: ${allowedStatuses}. ` +
          `Expected workflow: DRAFT → UNDER_REVIEW → PENDING_FINANCE_APPROVAL → APPROVED → LOCKED`,
      );
    }
  }

  async lockPayroll(
    runId: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(runId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Validate status transition
    this.validateStatusTransition(payrollRun.status, PayRollStatus.LOCKED);

    payrollRun.status = PayRollStatus.LOCKED;
    (payrollRun as any).updatedBy = currentUserId;
    const savedPayrollRun = await payrollRun.save();

    // REQ-PY-8: Automatically generate and distribute payslips after locking (REQ-PY-7)
    // Check if payment status is PAID (Finance approved) - if yes, auto-generate payslips
    if (savedPayrollRun.paymentStatus === PayRollPaymentStatus.PAID) {
      console.log(`[Auto-Generate Payslips] Payroll run ${savedPayrollRun._id} is locked and payment status is PAID. Auto-generating payslips...`);
      try {
        // Auto-generate payslips via Portal (default distribution method)
        await this.generateAndDistributePayslips(
          savedPayrollRun._id.toString(),
          'PORTAL',
          currentUserId,
        );
        console.log(`[Auto-Generate Payslips] Successfully auto-generated payslips for payroll run ${savedPayrollRun._id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Auto-Generate Payslips] Failed to auto-generate payslips for payroll run ${savedPayrollRun._id}: ${errorMessage}`);
        // Don't fail the lock if payslip generation fails - log and continue
      }
    } else {
      console.log(`[Auto-Generate Payslips] Payroll run ${savedPayrollRun._id} is locked but payment status is not PAID yet. Payslips will be auto-generated when Finance approves.`);
    }

    // Notify Payroll Specialist
    if (payrollRun.payrollSpecialistId) {
      await this.sendPayrollNotification(
        NotificationType.PAYROLL_LOCKED,
        payrollRun.payrollSpecialistId.toString(),
        `Payroll run ${payrollRun.runId} has been locked`,
        { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
        'Payroll Locked',
      );
    }

    return savedPayrollRun;
  }

  // REQ-PY-19: Payroll Manager unlock payrolls with reason under exceptional circumstances
  // BR: Allow legitimate corrections even after payroll has been locked
  // BR: Require reason to document exceptional circumstances
  async unlockPayroll(
    runId: string,
    unlockReason: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(runId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Validate status transition (LOCKED → UNLOCKED)
    this.validateStatusTransition(payrollRun.status, PayRollStatus.UNLOCKED);

    // Validate that unlock reason is provided and not empty
    // This ensures exceptional circumstances are documented
    if (!unlockReason || unlockReason.trim().length === 0) {
      throw new Error(
        'Unlock reason is required when unlocking a payroll run. Please provide a reason documenting the exceptional circumstances that require this action.',
      );
    }

    // Minimum length validation to ensure meaningful reason
    if (unlockReason.trim().length < 10) {
      throw new Error(
        'Unlock reason must be at least 10 characters long. Please provide a detailed explanation of the exceptional circumstances.',
      );
    }

    // Update payroll run status to UNLOCKED and store the reason
    // This allows legitimate corrections to be made
    payrollRun.status = PayRollStatus.UNLOCKED;
    payrollRun.unlockReason = unlockReason.trim();
    (payrollRun as any).updatedBy = currentUserId;
    const savedPayrollRun = await payrollRun.save();

    // Notify Payroll Specialist
    if (payrollRun.payrollSpecialistId) {
      await this.sendPayrollNotification(
        NotificationType.PAYROLL_UNLOCKED,
        payrollRun.payrollSpecialistId.toString(),
        `Payroll run ${payrollRun.runId} has been unlocked. Reason: ${unlockReason}`,
        { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId, reason: unlockReason },
        'Payroll Unlocked',
      );
    }

    return savedPayrollRun;
  }

  // REQ-PY-7: Freeze finalized payroll (alias for lockPayroll to match requirement terminology)
  // Note: Freeze and Lock are functionally the same - both set status to LOCKED
  // This method provides the "freeze" terminology as mentioned in requirements
  async freezePayroll(
    runId: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    // Freeze is functionally the same as lock - both prevent modifications
    return this.lockPayroll(runId, currentUserId);
  }

  // REQ-PY-19: Payroll Manager unfreeze payrolls with reason under exceptional circumstances
  // BR: Allow legitimate corrections even after payroll has been frozen/locked
  // BR: Require reason to document exceptional circumstances
  // Note: Unfreeze and Unlock are functionally the same - both set status to UNLOCKED
  // This method provides the "unfreeze" terminology as mentioned in requirements
  async unfreezePayroll(
    runId: string,
    unfreezeReason: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    // Unfreeze is functionally the same as unlock - both allow modifications with reason
    // Used for exceptional circumstances where legitimate corrections are needed
    return this.unlockPayroll(runId, unfreezeReason, currentUserId);
  }

  // Helper: Extract currency from entity field
  // BR 20: Location-based pay scales (multi-currency support)
  // Stores currency in entity field format: "Entity Name|CURRENCY_CODE" or just "Entity Name" (defaults to USD)
  private extractEntityAndCurrency(entityField: string): {
    entityName: string;
    currency: string;
  } {
    if (!entityField) {
      return { entityName: 'Unknown', currency: 'USD' }; // Default currency
    }

    // Check if entity field contains currency delimiter (|)
    const parts = entityField.split('|');
    if (parts.length === 2) {
      return {
        entityName: parts[0].trim(),
        currency: parts[1].trim().toUpperCase() || 'USD',
      };
    }

    // No currency specified, default to USD
    return {
      entityName: entityField.trim(),
      currency: 'USD',
    };
  }

  // Helper: Format entity field with currency
  private formatEntityWithCurrency(
    entityName: string,
    currency: string = 'USD',
  ): string {
    return `${entityName}|${currency.toUpperCase()}`;
  }

  // Helper: Get currency for a payroll run
  private getPayrollRunCurrency(payrollRun: any): string {
    if (!payrollRun || !payrollRun.entity) {
      return 'USD'; // Default currency
    }
    const { currency } = this.extractEntityAndCurrency(payrollRun.entity);
    return currency;
  }

  // Helper: Currency conversion rates (in production, this would come from an external service or database)
  // BR 20: Location-based pay scales with currency conversion
  private getCurrencyConversionRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date,
  ): number {
    // If same currency, return 1
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return 1;
    }

    // Default conversion rates (in production, fetch from external API or database)
    // These are example rates - should be updated regularly
    const conversionRates: Record<string, Record<string, number>> = {
      USD: {
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.0,
        AED: 3.67,
        SAR: 3.75,
        EGP: 30.0,
      },
      EUR: {
        USD: 1.18,
        GBP: 0.86,
        JPY: 129.0,
        AED: 4.32,
        SAR: 4.41,
        EGP: 35.3,
      },
      GBP: {
        USD: 1.37,
        EUR: 1.16,
        JPY: 150.0,
        AED: 5.03,
        SAR: 5.14,
        EGP: 41.1,
      },
      JPY: {
        USD: 0.0091,
        EUR: 0.0078,
        GBP: 0.0067,
        AED: 0.033,
        SAR: 0.034,
        EGP: 0.27,
      },
      AED: {
        USD: 0.27,
        EUR: 0.23,
        GBP: 0.2,
        JPY: 30.0,
        SAR: 1.02,
        EGP: 8.17,
      },
      SAR: {
        USD: 0.27,
        EUR: 0.23,
        GBP: 0.19,
        JPY: 29.3,
        AED: 0.98,
        EGP: 8.0,
      },
      EGP: {
        USD: 0.033,
        EUR: 0.028,
        GBP: 0.024,
        JPY: 3.67,
        AED: 0.12,
        SAR: 0.125,
      },
    };

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Try direct conversion
    if (conversionRates[from] && conversionRates[from][to]) {
      return conversionRates[from][to];
    }

    // Try reverse conversion (1 / rate)
    if (conversionRates[to] && conversionRates[to][from]) {
      return 1 / conversionRates[to][from];
    }

    // If no conversion rate found, log warning and return 1 (no conversion)
    console.warn(
      `Currency conversion rate not found: ${from} to ${to}. Using 1.0 (no conversion).`,
    );
    return 1;
  }

  // Helper: Convert amount from one currency to another
  private convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date,
  ): number {
    if (amount === 0) return 0;

    const rate = this.getCurrencyConversionRate(fromCurrency, toCurrency, date);
    const converted = amount * rate;

    // Round to 2 decimal places
    return Math.round(converted * 100) / 100;
  }

  // ====================================================================================
  // PHASE 1: PAYROLL INITIATION
  // ====================================================================================
  // REQ-PY-23: Automatically process payroll initiation
  // Creates a payroll run that requires review before draft generation
  // BR 1: Employment contract requirements
  // BR 2: Contract terms validation
  // BR 20: Multi-currency support (currency stored in entity field)
  async processPayrollInitiation(payrollPeriod: Date, entity: string, payrollSpecialistId: string, currency: string | undefined, currentUserId: string, payrollManagerId?: string): Promise<payrollRuns> {
    // Validate payroll period input
    if (
      !payrollPeriod ||
      !(payrollPeriod instanceof Date) ||
      isNaN(payrollPeriod.getTime())
    ) {
      throw new Error('Invalid payroll period. Must be a valid date.');
    }

    // BR 3: Validate payroll cycle compliance (monthly cycles per contract/region following local laws)
    await this.validatePayrollCycleCompliance(payrollPeriod, entity);

    // Validate payroll period is not in the future (can be adjusted based on business rules)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodDate = new Date(payrollPeriod);
    periodDate.setHours(0, 0, 0, 0);

    // Allow current month and past months, but warn if too far in the future
    const maxFutureMonths = 3; // Allow up to 3 months in the future
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + maxFutureMonths);

    if (periodDate > maxFutureDate) {
      throw new Error(
        `Payroll period cannot be more than ${maxFutureMonths} months in the future.`,
      );
    }

    // BR 1, BR 2: Validate payroll period against employee contract dates
    await this.validatePayrollPeriodAgainstContracts(payrollPeriod);

    // Check for duplicate payroll runs for the same period (overlapping check)
    const year = payrollPeriod.getFullYear();
    const month = payrollPeriod.getMonth();
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const existingRun = await this.payrollRunModel.findOne({
      payrollPeriod: {
        $gte: periodStart,
        $lte: periodEnd,
      },
      status: { $ne: PayRollStatus.REJECTED }, // Allow rejected runs to be recreated
    });

    if (existingRun) {
      throw new Error(
        `Payroll run already exists for period ${year}-${String(month + 1).padStart(2, '0')}. Existing runId: ${existingRun.runId}`,
      );
    }

    // Note: Overlapping check is handled by the duplicate check above
    // We allow payroll runs in different months (non-overlapping periods)
    // The duplicate check ensures no two runs exist for the same month

    // Pre-initiation validation: Check if there are pending signing bonuses or termination benefits that need review
    // Requirement 0: Reviews/approvals before start of payroll initiation
    const validationResult = await this.validatePreInitiationRequirements();
    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
    }

    // Generate runId (e.g., PR-2025-0001)
    // Count ALL payroll runs for the year to ensure unique runId across all months
    const count = await this.payrollRunModel.countDocuments({
      payrollPeriod: {
        $gte: new Date(year, 0, 1), // Start of year
        $lt: new Date(year + 1, 0, 1), // Start of next year
      },
    });
    const runId = `PR-${year}-${String(count + 1).padStart(4, '0')}`;

    // Get active employees count using EmployeeProfileService
    const employeesResult = await this.employeeProfileService.findAll({
      status: EmployeeStatus.ACTIVE,
    } as any);
    const activeEmployees = Array.isArray(employeesResult)
      ? employeesResult
      : (employeesResult as any).data || [];
    const employeesCount = activeEmployees.length;

    // BR 20: Store currency in entity field format: "Entity Name|CURRENCY_CODE"
    const { entityName } = this.extractEntityAndCurrency(entity);
    const entityWithCurrency = currency
      ? this.formatEntityWithCurrency(entityName, currency)
      : entity; // If entity already contains currency or no currency provided, use as-is

    // Get payroll manager ID - use provided one or find a default
    let finalPayrollManagerId: mongoose.Types.ObjectId;
    if (payrollManagerId) {
      try {
        finalPayrollManagerId = new mongoose.Types.ObjectId(payrollManagerId) as any;
      } catch (error) {
        throw new Error(`Invalid payrollManagerId format: ${payrollManagerId}`);
      }
    } else {
      // Find a default payroll manager
      const defaultManager = await this.findDefaultPayrollManager();
      if (!defaultManager) {
        throw new Error('No payroll manager found. Please provide payrollManagerId or ensure a payroll manager exists in the system.');
      }
      try {
        finalPayrollManagerId = new mongoose.Types.ObjectId(defaultManager) as any;
      } catch (error) {
        throw new Error(`Invalid default payroll manager ID format: ${defaultManager}`);
      }
    }

    // Ensure finalPayrollManagerId is set
    if (!finalPayrollManagerId) {
      throw new Error('Payroll manager ID is required but was not set.');
    }

    // Validate that payrollManagerId is different from payrollSpecialistId
    if (finalPayrollManagerId.toString() === payrollSpecialistId) {
      throw new Error('Payroll manager must be different from payroll specialist.');
    }

    // Create payroll run with DRAFT status - it will be reviewed before draft generation
    // Note: Status is DRAFT but draft details are not generated until after review approval
    const payrollRun = new this.payrollRunModel({
      runId,
      payrollPeriod,
      entity: entityWithCurrency, // Store entity with currency
      employees: employeesCount,
      exceptions: 0,
      totalnetpay: 0,
      payrollSpecialistId: new mongoose.Types.ObjectId(payrollSpecialistId) as any,
      payrollManagerId: finalPayrollManagerId,
      status: PayRollStatus.DRAFT, // Initial status - requires review before draft generation
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    const savedPayrollRun = await payrollRun.save();

    // Notify Payroll Manager
    if (finalPayrollManagerId) {
      await this.sendPayrollNotification(
        NotificationType.PAYROLL_INITIATION_CREATED,
        finalPayrollManagerId.toString(),
        `New payroll initiation created: ${savedPayrollRun.runId} for period ${payrollPeriod.toISOString().split('T')[0]}`,
        { 
          payrollRunId: savedPayrollRun._id.toString(), 
          runId: savedPayrollRun.runId, 
          payrollPeriod: payrollPeriod.toISOString(),
          entity: entityWithCurrency,
        },
        'New Payroll Initiation Created',
      );
    }

    return savedPayrollRun;
  }

  // Helper: Find a default payroll manager from the system
  private async findDefaultPayrollManager(): Promise<string | null> {
    try {
      // Find an active employee with PAYROLL_MANAGER role
      const managerRole = await this.employeeSystemRoleModel
        .findOne({
          roles: { $in: [SystemRole.PAYROLL_MANAGER] },
          isActive: true
        })
        .exec();

      if (managerRole && managerRole.employeeProfileId) {
        const managerId = managerRole.employeeProfileId.toString();
        console.log(`Found default payroll manager: ${managerId}`);
        return managerId;
      }

      console.warn('No payroll manager found in the system. Please create a payroll manager or provide payrollManagerId in the request.');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error finding default payroll manager:', errorMessage);
      return null;
    }
  }

  // Helper: Comprehensive validation of active employment contracts
  // BR 1: Employment contract requirements - Active contract with defined role, type, dates, and salary basis
  // BR 2: Contract terms validation
  // Egyptian Labor Law 2025 compliance
  // Modified to only validate employees eligible for the payroll period
  // and allow payroll to proceed with warnings for employees with incomplete contracts
  private async validatePayrollPeriodAgainstContracts(
    payrollPeriod: Date,
  ): Promise<void> {
    const year = payrollPeriod.getFullYear();
    const month = payrollPeriod.getMonth();
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Get all active employees to validate their contracts
    const employeesResult = await this.employeeProfileService.findAll({
      status: EmployeeStatus.ACTIVE,
    } as any);
    const activeEmployees = Array.isArray(employeesResult)
      ? employeesResult
      : (employeesResult as any).data || [];

    const contractViolations: string[] = [];
    const missingFields: string[] = [];
    const eligibleEmployees: any[] = [];
    const employeesWithIssues = new Set<string>(); // Track unique employees with issues

    for (const employee of activeEmployees) {
      const employeeData = employee as any;
      
      // Check if employee is eligible for this payroll period
      // Employee is eligible if:
      // 1. Contract start date is before or during the period, AND
      // 2. Contract end date is after or during the period (or null for indefinite)
      const contractStartDate = employeeData.contractStartDate;
      const contractEndDate = employeeData.contractEndDate;
      const dateOfHire = employeeData.dateOfHire;
      
      // Determine effective start date (contract start or hire date)
      const effectiveStartDate = contractStartDate 
        ? new Date(contractStartDate)
        : dateOfHire 
          ? new Date(dateOfHire)
          : null;
      
      // Determine effective end date (contract end or null for indefinite)
      const effectiveEndDate = contractEndDate ? new Date(contractEndDate) : null;
      
      // Check eligibility: employee should be active during the payroll period
      let isEligible = false;
      if (effectiveStartDate) {
        effectiveStartDate.setHours(0, 0, 0, 0);
        if (effectiveEndDate) {
          effectiveEndDate.setHours(23, 59, 59, 999);
          // Employee is eligible if period overlaps with contract period
          isEligible = periodStart <= effectiveEndDate && periodEnd >= effectiveStartDate;
        } else {
          // Indefinite contract - eligible if start date is before or during period
          isEligible = effectiveStartDate <= periodEnd;
        }
      } else {
        // No start date - not eligible but we'll still validate to show the issue
        isEligible = false;
      }
      
      // Only validate employees that are eligible for this payroll period
      // or employees with missing critical data that would prevent payroll processing
      if (!isEligible && contractStartDate && contractEndDate) {
        // Employee not eligible for this period - skip validation
        continue;
      }
      
      // Track eligible employees for validation
      if (isEligible) {
        eligibleEmployees.push(employeeData);
      }
      
      const employeeNumber =
        employeeData.employeeNumber ||
        employeeData._id?.toString() ||
        'Unknown';
      const employeeName = employeeData.fullName || 
        `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() ||
        employeeNumber;
      
      // Only validate employees eligible for this payroll period
      if (!isEligible) {
        continue;
      }

      // BR 1: Check for active employment contract with all required fields
      // Track if this employee has any issues
      let hasIssues = false;
      
      // 1. Check for defined role (primaryPositionId)
      if (!employeeData.primaryPositionId) {
        hasIssues = true;
        missingFields.push(
          `Employee ${employeeNumber} (${employeeName}): Missing defined role (primaryPositionId). Egyptian Labor Law 2025 requires a defined role in the employment contract.`,
        );
      }

      // 2. Check for contract type (full-time, part-time, hourly, commission-based, etc.)
      if (!employeeData.contractType) {
        hasIssues = true;
        missingFields.push(
          `Employee ${employeeNumber} (${employeeName}): Missing contract type. Egyptian Labor Law 2025 requires contract type (full-time, part-time, hourly, commission-based, etc.) to be defined.`,
        );
      }

      // 3. Check for contract start date (already declared above, just check if missing)
      if (!contractStartDate) {
        hasIssues = true;
        missingFields.push(
          `Employee ${employeeNumber} (${employeeName}): Missing contract start date. Egyptian Labor Law 2025 requires employment contracts to have a defined start date.`,
        );
      }

      // 4. Check for contract end date (can be null for indefinite contracts, but must be explicitly set)
      // Note: For indefinite contracts, contractEndDate can be null, but we validate that it's a conscious decision
      // contractEndDate is already declared above and is optional for indefinite contracts, so we don't require it

      // 5. Check for salary basis (payGradeId)
      if (!employeeData.payGradeId) {
        hasIssues = true;
        missingFields.push(
          `Employee ${employeeNumber} (${employeeName}): Missing salary basis (payGradeId). Egyptian Labor Law 2025 requires employment contracts to specify the salary basis.`,
        );
      }
      
      // Track this employee if they have issues
      if (hasIssues) {
        employeesWithIssues.add(employeeNumber);
      }

      // BR 2: Validate contract dates against payroll period
      if (contractStartDate) {
        const contractStart = new Date(contractStartDate);
        contractStart.setHours(0, 0, 0, 0);

        // Check if payroll period is before contract start date
        if (periodEnd < contractStart) {
          hasIssues = true;
          employeesWithIssues.add(employeeNumber);
          contractViolations.push(
            `Employee ${employeeNumber} (${employeeName}): Payroll period (${year}-${String(month + 1).padStart(2, '0')}) is before contract start date (${contractStart.toISOString().split('T')[0]}). Egyptian Labor Law 2025: Payroll cannot be processed before contract start date.`,
          );
        }
      }

      if (contractEndDate) {
        const contractEnd = new Date(contractEndDate);
        contractEnd.setHours(23, 59, 59, 999);

        // Check if payroll period is after contract end date
        if (periodStart > contractEnd) {
          hasIssues = true;
          employeesWithIssues.add(employeeNumber);
          contractViolations.push(
            `Employee ${employeeNumber} (${employeeName}): Payroll period (${year}-${String(month + 1).padStart(2, '0')}) is after contract end date (${contractEnd.toISOString().split('T')[0]}). Egyptian Labor Law 2025: Payroll cannot be processed after contract expiration.`,
          );
        }
      } else {
        // For indefinite contracts, validate against date of hire as fallback
        const dateOfHire = employeeData.dateOfHire;
        if (dateOfHire) {
          const hireDate = new Date(dateOfHire);
          hireDate.setHours(0, 0, 0, 0);

          if (periodEnd < hireDate) {
            hasIssues = true;
            employeesWithIssues.add(employeeNumber);
            contractViolations.push(
              `Employee ${employeeNumber} (${employeeName}): Payroll period (${year}-${String(month + 1).padStart(2, '0')}) is before date of hire (${hireDate.toISOString().split('T')[0]}).`,
            );
          }
        }
      }

      // Egyptian Labor Law 2025: Additional compliance checks
      // Check that contract start date is not in the future (for active employees)
      if (contractStartDate) {
        const contractStart = new Date(contractStartDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Contract start date should not be more than reasonable time in the future
        // (e.g., 30 days for onboarding)
        const maxFutureStartDate = new Date();
        maxFutureStartDate.setDate(maxFutureStartDate.getDate() + 30);
        
        if (contractStart > maxFutureStartDate) {
          hasIssues = true;
          employeesWithIssues.add(employeeNumber);
          contractViolations.push(
            `Employee ${employeeNumber} (${employeeName}): Contract start date (${contractStart.toISOString().split('T')[0]}) is more than 30 days in the future. This may violate Egyptian Labor Law 2025 contract validity requirements.`,
          );
        }
      }

      // Check that if contract end date exists, it's after start date
      if (contractStartDate && contractEndDate) {
        const contractStart = new Date(contractStartDate);
        const contractEnd = new Date(contractEndDate);
        
        if (contractEnd < contractStart) {
          hasIssues = true;
          employeesWithIssues.add(employeeNumber);
          contractViolations.push(
            `Employee ${employeeNumber} (${employeeName}): Contract end date (${contractEnd.toISOString().split('T')[0]}) is before contract start date (${contractStart.toISOString().split('T')[0]}). This violates Egyptian Labor Law 2025 contract validity requirements.`,
          );
        }
      }
    }

    // Combine all violations and missing fields
    const allIssues: string[] = [...missingFields, ...contractViolations];

    // Never block payroll - only log warnings
    // Employees with incomplete contracts will be excluded from payroll processing automatically
    // This allows payroll to proceed even if some or all employees have incomplete contract data
    if (allIssues.length > 0) {
      const issueCount = allIssues.length;
      const eligibleCount = eligibleEmployees.length;
      const uniqueEmployeesWithIssues = employeesWithIssues.size;
      const issueDetails = allIssues.slice(0, 10).join('; '); // Show first 10 issues
      const moreIssues = issueCount > 10 ? ` and ${issueCount - 10} more` : '';

      // Always log warnings but never block
      console.warn(
        `[Payroll Validation] ${uniqueEmployeesWithIssues} employee(s) eligible for payroll period have contract validation issues. ` +
        `These employees will be excluded from payroll processing. ` +
        `Details: ${issueDetails}${moreIssues}`
      );

      const validEmployeesCount = eligibleCount - uniqueEmployeesWithIssues;
      if (validEmployeesCount > 0) {
        console.log(
          `[Payroll Validation] Proceeding with payroll processing. ` +
          `${validEmployeesCount} employee(s) have valid contracts and will be included. ` +
          `${uniqueEmployeesWithIssues} employee(s) will be excluded due to incomplete contract data.`
        );
      } else {
        console.warn(
          `[Payroll Validation] WARNING: All ${eligibleCount} eligible employee(s) have contract validation issues. ` +
          `Payroll will proceed but no employees will be included in this payroll run. ` +
          `Please ensure employees have complete contract data (primaryPositionId, payGradeId, contractStartDate) for future payroll runs.`
        );
      }
      
      // Never throw error - always allow payroll to proceed
      // The payroll processing logic will automatically exclude employees with incomplete contracts
      return;
    }
  }

  // Helper: Validate payroll cycle compliance
  // BR 3: Payroll must be processed within defined cycles (monthly, etc.) per contract or region following local laws
  // Egyptian Labor Law 2025: Payroll must be processed monthly at the end of each month
  private async validatePayrollCycleCompliance(
    payrollPeriod: Date,
    entity: string,
  ): Promise<void> {
    // Validate that payroll period is aligned to monthly cycle (first day of month)
    // Egyptian Labor Law 2025 requires monthly payroll processing
    const periodDate = new Date(payrollPeriod);
    periodDate.setHours(0, 0, 0, 0);
    
    // Check if the payroll period is the first day of a month (monthly cycle alignment)
    const isFirstDayOfMonth = periodDate.getDate() === 1;
    
    if (!isFirstDayOfMonth) {
      // Calculate the first day of the month for the given period
      const firstDayOfMonth = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      // Format dates in local time to avoid timezone issues
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      throw new Error(
        `Payroll cycle validation failed: Payroll period must be aligned to monthly cycles (first day of month). ` +
        `Egyptian Labor Law 2025 requires payroll to be processed monthly. ` +
        `Provided period: ${formatLocalDate(periodDate)}, ` +
        `Expected period: ${formatLocalDate(firstDayOfMonth)} (first day of ${periodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}). ` +
        `Please use the first day of the target month as the payroll period.`
      );
    }

    // Validate that payroll period is within reasonable bounds (not too far in past or future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Allow processing for current month and up to 12 months in the past (for corrections)
    const maxPastMonths = 12;
    const minAllowedDate = new Date(currentMonthStart);
    minAllowedDate.setMonth(minAllowedDate.getMonth() - maxPastMonths);
    
    if (periodDate < minAllowedDate) {
      throw new Error(
        `Payroll cycle validation failed: Payroll period is too far in the past. ` +
        `Egyptian Labor Law 2025 compliance: Payroll corrections are limited to ${maxPastMonths} months. ` +
        `Provided period: ${periodDate.toISOString().split('T')[0]}, ` +
        `Minimum allowed: ${minAllowedDate.toISOString().split('T')[0]}.`
      );
    }

    // Validate entity/region is provided (required for per-region processing)
    if (!entity || entity.trim().length === 0) {
      throw new Error(
        `Payroll cycle validation failed: Entity/region is required. ` +
        `Egyptian Labor Law 2025 compliance: Payroll must be processed per contract or region. ` +
        `Please provide a valid entity/region name for this payroll run.`
      );
    }

    // Note: Duplicate payroll run check per entity/region is handled in the calling methods
    // This validation ensures cycle compliance (monthly alignment and entity requirement)
  }

  // Helper: Validate minimum salary bracket compliance
  // BR 4: The system must identify the minimum salary bracket(s) enforced through Local Labor Law
  // Egyptian Labor Law 2025: Minimum wage requirements must be enforced
  private async validateMinimumSalaryBracket(
    baseSalary: number,
    employeeId: string,
    payrollRunId: string,
    currentUserId: string,
  ): Promise<void> {
    // Egyptian Labor Law 2025: Minimum salary bracket identification
    // The minimum wage is enforced through approved pay grades (minimum baseSalary: 6000 EGP)
    // This is the minimum salary bracket enforced by Egyptian Labor Law 2025
    
    const MINIMUM_SALARY_BRACKET = 6000; // Egyptian Labor Law 2025 minimum wage (EGP)
    
    if (baseSalary > 0 && baseSalary < MINIMUM_SALARY_BRACKET) {
      // Get employee details for better error message
      let employeeNumber = employeeId;
      let employeeName = '';
      try {
        const employee = await this.employeeProfileService.findOne(employeeId);
        if (employee) {
          employeeNumber = employee.employeeNumber || employeeId;
          employeeName = employee.fullName || 
            `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
            employeeNumber;
        }
      } catch (error) {
        // If employee fetch fails, use employeeId
        console.warn(`Could not fetch employee details for minimum salary validation: ${error}`);
      }

      // Flag exception for minimum salary violation
      await this.flagPayrollException(
        payrollRunId,
        'MINIMUM_SALARY_VIOLATION',
        `Employee ${employeeNumber}${employeeName ? ` (${employeeName})` : ''}: Base salary ${baseSalary} is below the minimum salary bracket (${MINIMUM_SALARY_BRACKET} EGP) enforced by Egyptian Labor Law 2025. ` +
        `The system must identify and enforce minimum salary brackets as per local labor law requirements. ` +
        `Please ensure the employee's pay grade meets the minimum wage requirements.`,
        currentUserId,
        employeeId,
      );

      // Note: We flag the exception but don't block payroll processing
      // This allows payroll to proceed while alerting administrators to the violation
      // The exception will be visible in the payroll preview and can be resolved by managers
    }
  }

  // REQ-PY-24: Review and approve processed payroll initiation
  // REQ-PY-23: When approved, automatically start processing (draft generation)
  // This method reviews the payroll initiation and automatically triggers draft generation if approved
  async reviewPayrollInitiation(runId: string, approved: boolean, reviewerId: string, rejectionReason: string | undefined, currentUserId: string): Promise<payrollRuns> {
    console.log(`[Review Initiation] Starting review for payroll run: ${runId}, approved: ${approved}`);
    
    const payrollRun = await this.payrollRunModel.findOne({ runId });
    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Validate that payroll run is in a state that can be reviewed
    if (payrollRun.status !== PayRollStatus.DRAFT) {
      throw new Error(
        `Payroll run ${runId} is in ${payrollRun.status} status and cannot be reviewed. Only DRAFT status payroll runs can be reviewed.`,
      );
    }

    if (approved) {
      console.log(`[Review Initiation] Approving payroll run ${runId}...`);
      // REQ-PY-23: Start automatic processing of payroll initiation
      // Automatically trigger draft generation after approval
      // Note: Status remains DRAFT after initiation review - it will move to UNDER_REVIEW when sent for approval
      // paymentStatus remains PENDING until finance approves (this is correct behavior)
      payrollRun.status = PayRollStatus.DRAFT;
      // Clear any previous rejection reason if re-approved
      if ((payrollRun as any).rejectionReason) {
        (payrollRun as any).rejectionReason = undefined;
      }
      (payrollRun as any).updatedBy = currentUserId;
      await payrollRun.save();
      console.log(`[Review Initiation] Payroll run saved. Starting draft generation...`);
      
      // Automatically generate draft details for the approved payroll initiation
      // This processes all employees and calculates their payroll
      // REQ-PY-23: Automatic draft generation after approval
      try {
        await this.generateDraftDetailsForPayrollRun(payrollRun._id.toString(), currentUserId);
        console.log(`[Review Initiation] Draft generation completed successfully.`);
      } catch (error) {
        // If draft generation fails, update status and throw error
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Review Initiation] Error generating draft for payroll run ${runId}: ${errorMessage}`);
        console.error(`[Review Initiation] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
        throw new Error(`Failed to generate draft after approval: ${errorMessage}`);
      }

      // Reload the payroll run to get updated totals and exceptions
      // This ensures we return the payroll run with all the latest updates from draft generation
      const updatedPayrollRun = await this.payrollRunModel.findById(
        payrollRun._id,
      );
      if (!updatedPayrollRun) {
        throw new Error('Payroll run not found after draft generation');
      }

      // Ensure the payroll run is saved with all updates (exceptions, totalnetpay, etc.)
      // The generateDraftDetailsForPayrollRun already saved these, but we reload to ensure consistency
      
      // Notify Payroll Specialist
      if (payrollRun.payrollSpecialistId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_INITIATION_APPROVED,
          payrollRun.payrollSpecialistId.toString(),
          `Payroll initiation ${runId} has been approved. Draft generation started.`,
          { payrollRunId: payrollRun._id.toString(), runId },
          'Payroll Initiation Approved',
        );
      }
      
      return updatedPayrollRun;
    } else {
      // Validate status transition (DRAFT → REJECTED)
      this.validateStatusTransition(payrollRun.status, PayRollStatus.REJECTED);

      // If rejected, set status to REJECTED and store rejection reason
      payrollRun.status = PayRollStatus.REJECTED;
      (payrollRun as any).rejectionReason =
        rejectionReason || 'Rejected during payroll initiation review';

      // Clear any draft details if they exist (since it was rejected before processing)
      // This allows the payroll to be re-edited and re-reviewed
      await this.employeePayrollDetailsModel
        .deleteMany({ payrollRunId: payrollRun._id })
        .exec();

      (payrollRun as any).updatedBy = currentUserId;
      const savedPayrollRun = await payrollRun.save();
      
      // Notify Payroll Specialist about rejection
      if (payrollRun.payrollSpecialistId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_INITIATION_REJECTED,
          payrollRun.payrollSpecialistId.toString(),
          `Payroll initiation ${runId} has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
          { payrollRunId: payrollRun._id.toString(), runId, rejectionReason },
          'Payroll Initiation Rejected',
        );
      }
      
      return savedPayrollRun;
    }
  }

  // REQ-PY-26: Manually edit payroll initiation when needed
  // Allows editing of DRAFT or REJECTED payroll runs
  // REJECTED payroll runs are automatically changed back to DRAFT after editing
  async editPayrollInitiation(
    runId: string,
    updates: Partial<CreatePayrollRunDto>,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findOne({ runId });
    if (!payrollRun) throw new Error('Payroll run not found');

    // Cannot edit locked payroll runs
    if (payrollRun.status === PayRollStatus.LOCKED) {
      throw new Error(
        'Cannot edit locked payroll run. Please unlock it first if you need to make changes.',
      );
    }

    // Cannot edit payroll runs that are in approval workflow (UNDER_REVIEW, PENDING_FINANCE_APPROVAL, APPROVED)
    if (
      payrollRun.status === PayRollStatus.UNDER_REVIEW ||
      payrollRun.status === PayRollStatus.PENDING_FINANCE_APPROVAL ||
      payrollRun.status === PayRollStatus.APPROVED
    ) {
      throw new Error(
        `Cannot edit payroll run in ${payrollRun.status} status. Please reject it first if you need to make changes.`,
      );
    }

    // If payroll run is REJECTED, change it back to DRAFT after editing
    // This allows the payroll to be re-reviewed after corrections
    const wasRejected = payrollRun.status === PayRollStatus.REJECTED;

    if (updates.payrollPeriod) {
      // Validate payroll period if being updated
      await this.validatePayrollPeriodAgainstContracts(
        new Date(updates.payrollPeriod),
      );
      payrollRun.payrollPeriod = new Date(updates.payrollPeriod);
    }
    if (updates.entity) {
      payrollRun.entity = updates.entity;
    }
    // Note: Currency is stored in entity field format: "Entity Name|CURRENCY_CODE"
    // If entity is updated, currency can be included in the entity string
    if (updates.employees !== undefined) {
      payrollRun.employees = updates.employees;
    }
    if (updates.totalnetpay !== undefined) {
      payrollRun.totalnetpay = updates.totalnetpay;
    }
    if (updates.payrollSpecialistId) {
      payrollRun.payrollSpecialistId = new mongoose.Types.ObjectId(
        updates.payrollSpecialistId,
      ) as any;
    }

    // If it was rejected, change status back to DRAFT to allow re-review
    if (wasRejected) {
      payrollRun.status = PayRollStatus.DRAFT;
      // Clear rejection reason since it's being re-edited
      (payrollRun as any).rejectionReason = undefined;
    }

    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
  }

  // REQ-PY-25: Review Payroll period (Approve or Reject)
  // This method reviews the payroll period and updates the status accordingly
  async reviewPayrollPeriod(
    reviewDto: ReviewPayrollPeriodDto,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(reviewDto.payrollRunId);
    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Validate that payroll run is in a state that can be reviewed
    if (payrollRun.status !== PayRollStatus.DRAFT && payrollRun.status !== PayRollStatus.UNDER_REVIEW) {
      throw new Error(
        `Payroll run ${reviewDto.payrollRunId} is in ${payrollRun.status} status and cannot be reviewed. Only DRAFT or UNDER_REVIEW status payroll runs can be reviewed.`,
      );
    }

    // Update status based on review
    if (reviewDto.status === PayRollStatus.APPROVED || reviewDto.status === PayRollStatus.UNDER_REVIEW) {
      // Approve or move to under review
      payrollRun.status = reviewDto.status;
      // Clear any previous rejection reason if re-approved
      if ((payrollRun as any).rejectionReason) {
        (payrollRun as any).rejectionReason = undefined;
      }
    } else if (reviewDto.status === PayRollStatus.REJECTED) {
      // Reject the payroll period
      payrollRun.status = PayRollStatus.REJECTED;
      (payrollRun as any).rejectionReason =
        reviewDto.rejectionReason || 'Rejected during payroll period review';
    } else {
      throw new Error(`Invalid status ${reviewDto.status} for payroll period review`);
    }

    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
  }

  // REQ-PY-26: Edit payroll initiation (period) if rejected
  // This method allows editing just the payroll period for rejected payroll runs
  async editPayrollPeriod(
    editDto: EditPayrollPeriodDto,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(editDto.payrollRunId);
    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Can only edit period if payroll is in DRAFT or REJECTED status
    if (
      payrollRun.status !== PayRollStatus.DRAFT &&
      payrollRun.status !== PayRollStatus.REJECTED
    ) {
      throw new Error(
        `Cannot edit payroll period for payroll run in ${payrollRun.status} status. Only DRAFT or REJECTED payroll runs can have their period edited.`,
      );
    }

    // Validate payroll period against contracts
    await this.validatePayrollPeriodAgainstContracts(
      new Date(editDto.payrollPeriod),
    );

    // Update the payroll period
    payrollRun.payrollPeriod = new Date(editDto.payrollPeriod);

    // If it was rejected, change status back to DRAFT to allow re-review
    if (payrollRun.status === PayRollStatus.REJECTED) {
      payrollRun.status = PayRollStatus.DRAFT;
      // Clear rejection reason since it's being re-edited
      (payrollRun as any).rejectionReason = undefined;
    }

    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
  }

  // ====================================================================================
  // PHASE 0.1: SIGNING BONUS MANAGEMENT
  // ====================================================================================
  // REQ-PY-27: Automatically process signing bonuses
  // BR 24: Signing bonuses must be processed only for employees flagged as eligible in their contracts (linked through Employee Profile)
  async processSigningBonuses(
    currentUserId: string,
  ): Promise<employeeSigningBonus[]> {
    const PositionModel = this.payrollRunModel.db.model(Position.name);
    const ContractModel = this.payrollRunModel.db.model('Contract');
    const OnboardingModel = this.payrollRunModel.db.model('Onboarding');

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    console.log(`[processSigningBonuses] Looking for employees hired after: ${thirtyDaysAgo.toISOString()}`);

    // Get all approved signing bonuses using PayrollConfigurationService
    const signingBonusesResult = await this.payrollConfigurationService.findAllSigningBonuses({
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved signing bonuses
    });
    const approvedSigningBonuses = signingBonusesResult?.data || [];
    console.log(`[processSigningBonuses] Found ${approvedSigningBonuses.length} approved signing bonus configurations`);

    // APPROACH: Query employees directly by dateOfHire OR contractStartDate (last 30 days)
    // This catches all new hires regardless of status (ACTIVE, PROBATION, etc.)
    // Check both dateOfHire and contractStartDate to catch all new hires
    // Then check their contracts via onboarding records
    const recentEmployees = await this.employeeProfileModel
      .find({
        $or: [
          { dateOfHire: { $gte: thirtyDaysAgo } },
          { contractStartDate: { $gte: thirtyDaysAgo } },
        ],
      })
      .lean()
      .exec();

    console.log(`[processSigningBonuses] Found ${recentEmployees.length} employees hired in the last 30 days`);
    
    // Log all found employees for debugging
    recentEmployees.forEach((emp: any) => {
      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeNumber || 'Unknown';
      console.log(`[processSigningBonuses] Found employee: ${empName} (ID: ${emp._id}, dateOfHire: ${emp.dateOfHire}, status: ${emp.status})`);
    });

    if (recentEmployees.length === 0) {
      return []; // No employees hired in the last 30 days
    }

    const processedBonuses: employeeSigningBonus[] = [];
    // Convert all employee IDs to ObjectId for proper querying
    const employeeIds = recentEmployees.map((emp: any) => {
      if (emp._id instanceof Types.ObjectId) {
        return emp._id;
      }
      return new Types.ObjectId(emp._id.toString());
    });

    // Find onboarding records for these employees
    const onboardingRecords = await OnboardingModel.find({
      employeeId: { $in: employeeIds },
    })
      .populate('contractId')
      .lean()
      .exec();

    console.log(`[processSigningBonuses] Found ${onboardingRecords.length} onboarding records for recent employees`);
    
    // Log onboarding records found
    onboardingRecords.forEach((onboarding: any) => {
      const empId = onboarding.employeeId?._id?.toString() || onboarding.employeeId?.toString() || 'Unknown';
      const contractId = onboarding.contractId?._id?.toString() || onboarding.contractId?.toString() || 'None';
      console.log(`[processSigningBonuses] Onboarding record: employeeId=${empId}, contractId=${contractId}`);
    });

    // Create a map of employeeId -> onboarding for quick lookup
    // Use normalized string IDs for both keys and lookups
    const onboardingMap = new Map();
    onboardingRecords.forEach((onboarding: any) => {
      if (onboarding.employeeId) {
        // Normalize employeeId to string for consistent lookup
        let empId: string;
        if (onboarding.employeeId._id) {
          empId = onboarding.employeeId._id.toString();
        } else if (onboarding.employeeId instanceof Types.ObjectId) {
          empId = onboarding.employeeId.toString();
        } else {
          empId = onboarding.employeeId.toString();
        }
        if (!onboardingMap.has(empId)) {
          onboardingMap.set(empId, onboarding);
        }
      }
    });

    // FALLBACK: Also find contracts directly by looking for contracts with acceptanceDate in last 30 days
    // This catches cases where onboarding might not exist or contractId isn't set
    const recentContracts = await ContractModel.find({
      acceptanceDate: { $gte: thirtyDaysAgo },
      signingBonus: { $exists: true, $ne: null, $gt: 0 },
    })
      .populate('offerId')
      .lean()
      .exec();

    console.log(`[processSigningBonuses] Found ${recentContracts.length} contracts with signing bonuses accepted in last 30 days`);

    // Create a map of contractId -> contract for fallback lookup
    const contractMap = new Map();
    recentContracts.forEach((contract: any) => {
      if (contract._id) {
        contractMap.set(contract._id.toString(), contract);
      }
    });

    // Also try to map contracts to employees via offers -> candidates -> employees
    // This is a fallback if onboarding doesn't have the link
    const contractToEmployeeMap = new Map<string, string>(); // contractId -> employeeId
    for (const contract of recentContracts) {
      if (contract.offerId) {
        try {
          // Try to find employee via offer -> candidate -> employee email match
          const offer = contract.offerId;
          if (offer && (offer as any).candidateId) {
            const candidate = await this.employeeProfileModel.db.model('Candidate').findById((offer as any).candidateId).lean().exec();
            if (candidate && (candidate as any).personalEmail) {
              const employee = await this.employeeProfileModel.findOne({
                personalEmail: (candidate as any).personalEmail,
              }).lean().exec();
              if (employee && employee._id) {
                contractToEmployeeMap.set(contract._id.toString(), employee._id.toString());
              }
            }
          }
        } catch (e) {
          // Skip if can't resolve
        }
      }
    }

    let skippedNoOnboarding = 0;
    let skippedNoContract = 0;
    let skippedNoSigningBonus = 0;
    let skippedNoPosition = 0;
    let skippedNoConfig = 0;
    let skippedAlreadyExists = 0;

    // Process each recent employee
    for (const employee of recentEmployees) {
      const employeeId: any = employee._id;
      // Normalize employeeId to string for consistent lookup
      const employeeIdString = employeeId instanceof Types.ObjectId 
        ? employeeId.toString() 
        : (employeeId ? new Types.ObjectId(employeeId.toString()).toString() : '');
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeNumber || employeeIdString;

      console.log(`[processSigningBonuses] Processing employee: ${employeeName} (ID: ${employeeIdString})`);

      // Check if signing bonus already exists for this employee
      const existingBonus = await this.employeeSigningBonusModel.findOne({
        employeeId: employeeId instanceof Types.ObjectId ? employeeId : new Types.ObjectId(employeeIdString),
      });

      if (existingBonus) {
        skippedAlreadyExists++;
        console.log(`[processSigningBonuses] Skipping ${employeeName}: Signing bonus already exists (ID: ${existingBonus._id})`);
        continue; // Skip if already processed
      }

      // Get contract for this employee - try multiple methods
      let contract: any = null;
      let contractSource = '';

      // Method 1: Try onboarding record first
      const onboarding = onboardingMap.get(employeeIdString);
      if (onboarding && onboarding.contractId) {
        if (typeof onboarding.contractId === 'object' && onboarding.contractId._id) {
          // Already populated - use it directly
          contract = onboarding.contractId;
          contractSource = 'onboarding';
        } else if (typeof onboarding.contractId === 'object' && !onboarding.contractId._id) {
          // It's an ObjectId object, need to fetch
          const contractId = onboarding.contractId.toString();
          contract = await ContractModel.findById(contractId).lean().exec();
          contractSource = 'onboarding';
        } else {
          // It's a string ID, need to fetch
          contract = await ContractModel.findById(onboarding.contractId).lean().exec();
          contractSource = 'onboarding';
        }
      }

      // Method 2: Fallback - try to find contract via contractToEmployeeMap
      if (!contract) {
        for (const [contractId, empId] of contractToEmployeeMap.entries()) {
          if (empId === employeeIdString) {
            contract = contractMap.get(contractId);
            if (contract) {
              contractSource = 'contract-fallback';
              break;
            }
          }
        }
      }

      // Method 3: Last resort - try to find contract by employee email via offer -> candidate
      if (!contract) {
        try {
          if (employee.personalEmail) {
            const candidate = await this.employeeProfileModel.db.model('Candidate').findOne({
              personalEmail: employee.personalEmail,
            }).lean().exec();
            if (candidate && (candidate as any)._id) {
              const offer = await this.employeeProfileModel.db.model('Offer').findOne({
                candidateId: (candidate as any)._id,
              }).lean().exec();
              if (offer && (offer as any)._id) {
                const foundContract = await ContractModel.findOne({
                  offerId: (offer as any)._id,
                  signingBonus: { $exists: true, $ne: null, $gt: 0 },
                }).lean().exec();
                if (foundContract) {
                  contract = foundContract;
                  contractSource = 'email-lookup';
                }
              }
            }
          }
        } catch (e) {
          // Skip if lookup fails
        }
      }

      if (!contract) {
        skippedNoContract++;
        console.log(`[processSigningBonuses] Skipping ${employeeName}: No contract found via any method (onboarding, fallback, or email lookup)`);
        continue; // Contract not found
      }

      console.log(`[processSigningBonuses] Found contract for ${employeeName} via: ${contractSource}`);

      // BR 24: Check if employee is eligible for signing bonus
      // Priority: contract.signingBonus > 0 (if exists), otherwise check position config
      let contractSigningBonus: number | undefined = undefined;
      if (
        contract.signingBonus !== undefined &&
        contract.signingBonus !== null &&
        contract.signingBonus > 0
      ) {
        contractSigningBonus = contract.signingBonus;
        console.log(`[processSigningBonuses] Contract has signingBonus: ${contractSigningBonus}`);
      } else {
        console.log(`[processSigningBonuses] Contract doesn't have signingBonus (${contract.signingBonus}), will use position config amount if match found`);
      }

      // Get employee's position (if available)
      // FLEXIBLE: Allow processing even if position is missing, as long as contract has signingBonus
      let positionTitle: string | null = null;
      let position: any = null;

      if (employee.primaryPositionId) {
        position = await PositionModel.findById(employee.primaryPositionId);
        if (position) {
          positionTitle = (position as any).title;
          console.log(`[processSigningBonuses] Employee ${employeeName} has position: "${positionTitle}"`);
        } else {
          console.log(`[processSigningBonuses] ⚠ Employee ${employeeName} has primaryPositionId (${employee.primaryPositionId}) but position not found in database`);
        }
      } else {
        console.log(`[processSigningBonuses] ⚠ Employee ${employeeName} has no primaryPositionId (incomplete contract data). Will process if contract has signingBonus.`);
      }

      console.log(`[processSigningBonuses] Processing ${employeeName} with position: "${positionTitle || 'N/A (incomplete contract)'}", contract signingBonus: ${contractSigningBonus}`);

      // Find matching signing bonus configuration by position title (if position exists)
      let signingBonusConfig: any = null;
      
      if (positionTitle) {
        // Use case-insensitive matching and trim whitespace for flexibility
        const normalizedPositionTitle = positionTitle.trim().toLowerCase();
        console.log(`[processSigningBonuses] Normalized position title: "${normalizedPositionTitle}"`);
        console.log(`[processSigningBonuses] Available configs: ${approvedSigningBonuses.map((b: any) => `"${b.positionName}"`).join(', ')}`);
        
        signingBonusConfig = approvedSigningBonuses.find(
          (bonus: any) => {
            const normalizedConfigName = (bonus.positionName || '').trim().toLowerCase();
            const matches = normalizedConfigName === normalizedPositionTitle;
            if (matches) {
              console.log(`[processSigningBonuses] ✓ Exact match found: "${bonus.positionName}" matches "${positionTitle}"`);
            }
            return matches;
          }
        );

        // If no exact match, try partial matching (contains)
        if (!signingBonusConfig && normalizedPositionTitle) {
          console.log(`[processSigningBonuses] No exact match, trying partial matching...`);
          signingBonusConfig = approvedSigningBonuses.find(
            (bonus: any) => {
              const normalizedConfigName = (bonus.positionName || '').trim().toLowerCase();
              const matches = normalizedConfigName.includes(normalizedPositionTitle) || 
                     normalizedPositionTitle.includes(normalizedConfigName);
              if (matches) {
                console.log(`[processSigningBonuses] ✓ Partial match found: "${bonus.positionName}" partially matches "${positionTitle}"`);
              }
              return matches;
            }
          );
        }
      } else {
        console.log(`[processSigningBonuses] No position title available, will use fallback config if contract has signingBonus`);
      }

      // Fallback logic: Process even with incomplete data if contract has signingBonus
      if (!signingBonusConfig) {
        if (contractSigningBonus !== undefined && contractSigningBonus > 0 && approvedSigningBonuses.length > 0) {
          // Contract has signingBonus - use first config as fallback (even if no position or no match)
          const fallbackReason = positionTitle 
            ? `No match for position "${positionTitle}"`
            : `No position assigned (incomplete contract data - missing primaryPositionId)`;
          console.log(`[processSigningBonuses] ⚠ ${fallbackReason}, but contract has signingBonus (${contractSigningBonus}). Using first available config "${approvedSigningBonuses[0].positionName}" as fallback`);
          signingBonusConfig = approvedSigningBonuses[0];
        } else if (approvedSigningBonuses.length === 0) {
          skippedNoConfig++;
          console.log(`[processSigningBonuses] ❌ Skipping ${employeeName}: No signing bonus configs available in system. Contract signingBonus: ${contractSigningBonus}`);
          continue;
        } else if (!positionTitle && (!contractSigningBonus || contractSigningBonus <= 0)) {
          skippedNoConfig++;
          console.log(`[processSigningBonuses] ❌ Skipping ${employeeName}: No position assigned (incomplete contract) and contract has no signingBonus. Cannot determine bonus amount.`);
          continue;
        } else {
          skippedNoConfig++;
          console.log(`[processSigningBonuses] ❌ Skipping ${employeeName}: No matching config for position "${positionTitle || 'N/A'}" and contract has no signingBonus. Available configs: ${approvedSigningBonuses.map((b: any) => b.positionName).join(', ')}`);
          continue;
        }
      }

      const bonusData = signingBonusConfig as any;
      // Use contract signingBonus amount if available, otherwise use configuration amount
      // Priority: contract signingBonus > configuration amount (BR 24)
      const finalAmount =
        contractSigningBonus !== undefined && contractSigningBonus > 0
          ? contractSigningBonus
          : bonusData.amount;

      console.log(`[processSigningBonuses] Creating signing bonus for ${employeeName}: Amount=${finalAmount}, Config=${bonusData.positionName} (matched from position: ${positionTitle || 'N/A - using fallback'})`);

      // Create employee signing bonus record
      // Ensure employeeId is properly formatted as ObjectId
      const employeeIdForBonus = employeeId instanceof Types.ObjectId 
        ? employeeId 
        : new Types.ObjectId(employeeIdString);
      
      const employeeBonus = new this.employeeSigningBonusModel({
        employeeId: employeeIdForBonus as any,
        signingBonusId: bonusData._id as any,
        givenAmount: finalAmount, // Use contract amount if available (BR 24), otherwise configuration amount
        status: BonusStatus.PENDING,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      });

      await employeeBonus.save();
      processedBonuses.push(employeeBonus);
    }

    console.log(`[processSigningBonuses] ========== SUMMARY ==========`);
    console.log(`[processSigningBonuses] Total employees found: ${recentEmployees.length}`);
    console.log(`[processSigningBonuses] Onboarding records found: ${onboardingRecords.length}`);
    console.log(`[processSigningBonuses] Processed successfully: ${processedBonuses.length}`);
    console.log(`[processSigningBonuses] Skipped - Already exists: ${skippedAlreadyExists}`);
    console.log(`[processSigningBonuses] Skipped - No onboarding: ${skippedNoOnboarding}`);
    console.log(`[processSigningBonuses] Skipped - No contract: ${skippedNoContract}`);
    console.log(`[processSigningBonuses] Skipped - No signing bonus in contract: ${skippedNoSigningBonus}`);
    console.log(`[processSigningBonuses] Skipped - No position: ${skippedNoPosition}`);
    console.log(`[processSigningBonuses] Skipped - No matching config: ${skippedNoConfig}`);
    console.log(`[processSigningBonuses] =============================`);

    return processedBonuses;
  }

  // Create employee signing bonus manually
  async createEmployeeSigningBonus(createDto: CreateEmployeeSigningBonusDto, currentUserId: string): Promise<employeeSigningBonus> {
    // Validate employee exists
    const employee = await this.employeeProfileService.findOne(createDto.employeeId);
    if (!employee) {
      throw new Error(`Employee not found with ID: ${createDto.employeeId}`);
    }

    // Validate signing bonus configuration exists
    const signingBonusConfig = await this.payrollConfigurationService.findOneSigningBonus(createDto.signingBonusId);
    if (!signingBonusConfig) {
      throw new Error(`Signing bonus configuration not found with ID: ${createDto.signingBonusId}`);
    }

    // Check if signing bonus already exists for this employee
    const existingBonus = await this.employeeSigningBonusModel.findOne({
      employeeId: new mongoose.Types.ObjectId(createDto.employeeId) as any,
      signingBonusId: new mongoose.Types.ObjectId(createDto.signingBonusId) as any
    });

    if (existingBonus) {
      throw new Error(`Signing bonus already exists for this employee and configuration. Use edit-signing-bonus endpoint instead. Existing ID: ${existingBonus._id}`);
    }

    // Create the employee signing bonus
    const employeeBonus = new this.employeeSigningBonusModel({
      employeeId: new mongoose.Types.ObjectId(createDto.employeeId) as any,
      signingBonusId: new mongoose.Types.ObjectId(createDto.signingBonusId) as any,
      givenAmount: createDto.givenAmount,
      status: createDto.status || BonusStatus.PENDING,
      paymentDate: createDto.paymentDate ? new Date(createDto.paymentDate) : undefined,
      createdBy: currentUserId,
      updatedBy: currentUserId
    });

    const savedBonus = await employeeBonus.save();
    console.log(`[Create Signing Bonus] Created employee signing bonus: ${savedBonus._id} for employee: ${createDto.employeeId}`);
    return savedBonus;
  }

  // REQ-PY-28: Review and approve processed signing bonuses
  async reviewSigningBonus(reviewDto: SigningBonusReviewDto, currentUserId: string): Promise<employeeSigningBonus> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(reviewDto.employeeSigningBonusId)) {
      throw new Error(`Invalid signing bonus ID format: ${reviewDto.employeeSigningBonusId}`);
    }

    console.log(`[Review Signing Bonus] Looking for signing bonus with ID: ${reviewDto.employeeSigningBonusId}`);
    const bonus = await this.employeeSigningBonusModel.findById(reviewDto.employeeSigningBonusId);
    
    if (!bonus) {
      // Check if any signing bonuses exist to help with debugging
      const totalCount = await this.employeeSigningBonusModel.countDocuments();
      const pendingCount = await this.employeeSigningBonusModel.countDocuments({ status: BonusStatus.PENDING });
      console.error(`[Review Signing Bonus] Signing bonus not found. ID: ${reviewDto.employeeSigningBonusId}, Total employee signing bonuses in DB: ${totalCount}, Pending: ${pendingCount}`);
      
      // Check if the ID might be from the wrong collection (signingbonus config instead of employeesigningbonus)
      try {
        const configCheck = await this.payrollConfigurationService.findOneSigningBonus(reviewDto.employeeSigningBonusId);
        
        if (configCheck) {
          throw new Error(`The ID ${reviewDto.employeeSigningBonusId} belongs to a signing bonus CONFIGURATION (from 'signingbonus' collection), not an employee signing bonus record. You need to use an ID from the 'employeesigningbonus' collection. Please call 'POST /api/v1/payroll/process-signing-bonuses' first to create employee signing bonus records, then use one of those IDs.`);
        }
      } catch (error) {
        // If findOneSigningBonus throws NotFoundException, that's fine - it means it's not a config ID
        // Continue with the original error message
      }
      
      if (totalCount === 0) {
        throw new Error(`No employee signing bonuses exist in the system. The ID you provided (${reviewDto.employeeSigningBonusId}) was not found in the 'employeesigningbonus' collection. Please call 'POST /api/v1/payroll/process-signing-bonuses' endpoint first to create signing bonuses for eligible employees (those hired within the last 30 days with matching position configurations).`);
      } else {
        // Get a few example IDs to help the user
        const examples = await this.employeeSigningBonusModel.find().limit(5).select('_id employeeId status').populate('employeeId', 'fullName employeeNumber').exec();
        const exampleDetails = examples.map(b => {
          const emp = (b as any).employeeId;
          return `${b._id.toString()} (Employee: ${emp?.fullName || emp?.employeeNumber || 'N/A'}, Status: ${b.status})`;
        }).join('; ');
        throw new Error(`Employee signing bonus not found with ID: ${reviewDto.employeeSigningBonusId}. Available employee signing bonus IDs (examples): ${exampleDetails}. Please use a valid employee signing bonus ID from the 'process-signing-bonuses' response.`);
      }
    }

    console.log(`[Review Signing Bonus] Found signing bonus. Current status: ${bonus.status}, Updating to: ${reviewDto.status}`);

    bonus.status = reviewDto.status;
    if (reviewDto.paymentDate) {
      bonus.paymentDate = new Date(reviewDto.paymentDate);
    }

    (bonus as any).updatedBy = currentUserId;
    const savedBonus = await bonus.save();
    console.log(`[Review Signing Bonus] Signing bonus updated successfully. New status: ${savedBonus.status}`);
    return savedBonus;
  }

  // Get all signing bonuses with optional filtering
  async getSigningBonuses(
    status: BonusStatus | undefined,
    employeeId: string | undefined,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<{ data: employeeSigningBonus[]; total: number; page: number; limit: number }> {
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (employeeId && employeeId.trim()) {
      const searchTerm = employeeId.trim();
      
      // Try to find employees matching the search term
      let employeeIds: mongoose.Types.ObjectId[] = [];
      
      // First, try as ObjectId
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        const objectId = new mongoose.Types.ObjectId(searchTerm);
        const employee = await this.employeeProfileModel.findById(objectId).select('_id').exec();
        if (employee) {
          employeeIds.push(objectId);
        }
      }
      
      // Also search by employeeNumber
      const employeesByNumber = await this.employeeProfileModel
        .find({ employeeNumber: { $regex: searchTerm, $options: 'i' } })
        .select('_id')
        .exec();
      employeeIds.push(...employeesByNumber.map(emp => emp._id as mongoose.Types.ObjectId));
      
      // Also search by name (firstName or lastName)
      const nameParts = searchTerm.split(/\s+/);
      const nameQuery: any = {};
      if (nameParts.length === 1) {
        // Single word - search in both firstName and lastName
        nameQuery.$or = [
          { firstName: { $regex: nameParts[0], $options: 'i' } },
          { lastName: { $regex: nameParts[0], $options: 'i' } },
        ];
      } else {
        // Multiple words - assume first is firstName, rest is lastName
        nameQuery.firstName = { $regex: nameParts[0], $options: 'i' };
        nameQuery.lastName = { $regex: nameParts.slice(1).join(' '), $options: 'i' };
      }
      
      const employeesByName = await this.employeeProfileModel
        .find(nameQuery)
        .select('_id')
        .exec();
      employeeIds.push(...employeesByName.map(emp => emp._id as mongoose.Types.ObjectId));
      
      // Remove duplicates
      employeeIds = [...new Set(employeeIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id) as any);
      
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      } else {
        // No matching employees found - return empty result
        query.employeeId = { $in: [] }; // This will match nothing
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.employeeSigningBonusModel
        .find(query)
        .populate('employeeId', 'firstName lastName employeeNumber _id')
        .populate('signingBonusId', 'positionName amount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.employeeSigningBonusModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // Get signing bonus by ID
  async getSigningBonusById(
    id: string,
    currentUserId: string,
  ): Promise<employeeSigningBonus> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid signing bonus ID format: ${id}`);
    }

    const signingBonus = await this.employeeSigningBonusModel
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber _id')
      .populate('signingBonusId', 'positionName amount')
      .exec();

    if (!signingBonus) {
      throw new Error(`Signing bonus with ID ${id} not found`);
    }

    return signingBonus;
  }

  // REQ-PY-29: Manually edit signing bonuses when needed
  async editSigningBonus(
    editDto: SigningBonusEditDto,
    currentUserId: string,
  ): Promise<employeeSigningBonus> {
    const bonus = await this.employeeSigningBonusModel.findById(
      editDto.employeeSigningBonusId,
    );
    if (!bonus) throw new Error('Signing bonus not found');

    // Validation: Check if this signing bonus is part of any locked payroll run
    // A signing bonus is considered part of a locked payroll if:
    // 1. The employee has payroll details in a locked payroll run, AND
    // 2. The bonus was created before or during that payroll period
    const employeeId = (bonus as any).employeeId;
    const bonusCreatedAt = (bonus as any).createdAt;

    if (employeeId && bonusCreatedAt) {
      // Find all locked payroll runs
      const lockedPayrolls = await this.payrollRunModel
        .find({
          status: PayRollStatus.LOCKED,
        })
        .exec();

      // Check if the employee has payroll details in any locked payroll run
      for (const lockedPayroll of lockedPayrolls) {
        const payrollDetails = await this.employeePayrollDetailsModel
          .findOne({
            employeeId: employeeId,
            payrollRunId: lockedPayroll._id,
          })
          .exec();

        if (payrollDetails) {
          // Employee has payroll details in this locked payroll run
          // Check if bonus was created before or during this payroll period
          const payrollPeriod = lockedPayroll.payrollPeriod;
          if (payrollPeriod) {
            const periodEnd = new Date(payrollPeriod);
            periodEnd.setHours(23, 59, 59, 999); // End of the payroll period

            if (new Date(bonusCreatedAt) <= periodEnd) {
              throw new Error(
                `Cannot edit signing bonus. This bonus is part of a locked payroll run (RunId: ${lockedPayroll.runId}, Period: ${payrollPeriod.toISOString().split('T')[0]}). ` +
                  `Please unlock the payroll run first if you need to make changes.`,
              );
            }
          }
        }
      }
    }

    // Handle signingBonusId change (switching to different config)
    if (editDto.signingBonusId) {
      bonus.signingBonusId = new mongoose.Types.ObjectId(
        editDto.signingBonusId,
      ) as any;
      // If switching to a different signing bonus config, update givenAmount from new config
      // Note: If givenAmount is also provided in DTO, it will override this (manual edit takes precedence)
      try {
        const newConfig = await this.payrollConfigurationService.findOneSigningBonus(editDto.signingBonusId);
        if (newConfig && newConfig.amount) {
          // Only update from config if manual givenAmount is not provided
          if (editDto.givenAmount === undefined) {
            bonus.givenAmount = newConfig.amount;
          }
        }
      } catch (error) {
        // If config not found, keep existing givenAmount (or use manual givenAmount if provided)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Signing bonus config ${editDto.signingBonusId} not found: ${errorMessage}`,
        );
      }
    }

    // Handle status update
    if (editDto.status) {
      bonus.status = editDto.status;
    }

    // Handle paymentDate update
    if (editDto.paymentDate) {
      bonus.paymentDate = new Date(editDto.paymentDate);
    }

    // Handle givenAmount update (manual edit - takes precedence over config amount)
    // This is processed last to ensure manual edits override config-based amounts
    if (editDto.givenAmount !== undefined) {
      if (editDto.givenAmount < 0) {
        throw new Error('givenAmount cannot be negative');
      }
      bonus.givenAmount = editDto.givenAmount;
    }

    (bonus as any).updatedBy = currentUserId;
    return await bonus.save();
  }

  // ====================================================================================
  // PHASE 0.2: TERMINATION/RESIGNATION BENEFITS MANAGEMENT
  // ====================================================================================
  // REQ-PY-30 & REQ-PY-33: Automatically process benefits upon resignation/termination
  // According to business rules & signed contracts
  async processTerminationResignationBenefits(
    currentUserId: string,
  ): Promise<EmployeeTerminationResignation[]> {
    const TerminationRequestModel = this.payrollRunModel.db.model(
      TerminationRequest.name,
    );
    // Note: terminationAndResignationBenefits is accessed via PayrollConfigurationService, not directly

    // Get all approved termination requests that haven't been processed
    const approvedTerminations = await TerminationRequestModel.find({
      status: TerminationStatus.APPROVED,
    })
      .populate('employeeId', 'employeeNumber firstName lastName dateOfHire contractStartDate contractEndDate')
      .populate('contractId')
      .exec();

    const processedBenefits: EmployeeTerminationResignation[] = [];

    for (const termination of approvedTerminations) {
      // Check if benefit already exists for this termination
      const existingBenefit =
        await this.employeeTerminationResignationModel.findOne({
          terminationId: termination._id,
        });

      if (existingBenefit) {
        continue; // Skip if already processed
      }

      // Get employee details for validation (with PayGrade populated for salary calculations)
      const employee = await this.employeeProfileService.findOne(
        termination.employeeId.toString(),
      );
      if (!employee) {
        console.warn(
          `[Process Termination Benefits] Employee not found for termination ${termination._id}`,
        );
        continue;
      }

      // Ensure PayGrade is populated if not already
      if (employee.payGradeId && typeof employee.payGradeId === 'object' && employee.payGradeId !== null) {
        // Already populated
      } else if (employee.payGradeId) {
        // Need to populate
        const PayGradeModel = this.payrollRunModel.db.model(payGrade.name);
        const payGradeDoc = await PayGradeModel.findById(employee.payGradeId).exec();
        if (payGradeDoc) {
          (employee as any).payGradeId = payGradeDoc;
        }
      }

      // Get all approved termination/resignation benefits using PayrollConfigurationService
      const benefitsResult = await this.payrollConfigurationService.findAllTerminationBenefits({
        status: ConfigStatus.APPROVED,
        limit: 1000 // Get all approved termination benefits
      });
      const benefits = benefitsResult?.data || [];

      // For each approved benefit, validate eligibility according to business rules & contracts
      for (const benefit of benefits) {
        const benefitData = benefit as any;
        
        // Validate eligibility according to business rules & signed contracts
        const eligibilityCheck = await this.validateTerminationBenefitEligibility(
          employee,
          termination,
          benefitData,
        );

        if (!eligibilityCheck.isEligible) {
          console.log(
            `[Process Termination Benefits] Employee ${employee.employeeNumber} is not eligible for benefit ${benefitData.name}: ${eligibilityCheck.reason}`,
          );
          continue; // Skip this benefit if employee is not eligible
        }

        // Create employee termination benefit record
        const employeeBenefit = new this.employeeTerminationResignationModel({
          employeeId: termination.employeeId as any,
          benefitId: benefitData._id as any,
          givenAmount: eligibilityCheck.calculatedAmount || benefitData.amount, // Use calculated amount if available
          terminationId: termination._id as any,
          status: BenefitStatus.PENDING,
          createdBy: currentUserId,
          updatedBy: currentUserId,
        });

        await employeeBenefit.save();
        processedBenefits.push(employeeBenefit);
        console.log(
          `[Process Termination Benefits] Created benefit ${benefitData.name} (${eligibilityCheck.calculatedAmount || benefitData.amount}) for employee ${employee.employeeNumber}`,
        );
      }
    }

    return processedBenefits;
  }

  // Helper: Validate termination benefit eligibility according to business rules & signed contracts
  private async validateTerminationBenefitEligibility(
    employee: any,
    termination: any,
    benefitConfig: any,
  ): Promise<{
    isEligible: boolean;
    reason?: string;
    calculatedAmount?: number;
  }> {
    // 1. Check if employee has a valid contract
    if (!employee.contractStartDate) {
      return {
        isEligible: false,
        reason: 'Employee does not have a valid contract start date',
      };
    }

    // 2. Calculate employee tenure (from contract start date or date of hire to termination date)
    const contractStartDate = employee.contractStartDate
      ? new Date(employee.contractStartDate)
      : employee.dateOfHire
        ? new Date(employee.dateOfHire)
        : null;

    if (!contractStartDate) {
      return {
        isEligible: false,
        reason: 'Cannot determine employee contract start date or date of hire',
      };
    }

    const terminationDate = termination.terminationDate
      ? new Date(termination.terminationDate)
      : new Date(); // Use current date if termination date not specified

    const tenureMonths =
      (terminationDate.getTime() - contractStartDate.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44); // Average days per month

    const tenureYears = tenureMonths / 12;

    // 3. Check contract end date (if contract has ended, employee may still be eligible for benefits)
    const contractEndDate = employee.contractEndDate
      ? new Date(employee.contractEndDate)
      : null;

    // 4. Validate against business rules stored in benefit terms
    // The benefit.terms field can contain business rules in JSON format or plain text
    // Example: {"minTenureMonths": 12, "appliesTo": ["resignation", "termination"], "calculationMethod": "fixed"}
    let businessRules: any = {};
    if (benefitConfig.terms) {
      try {
        // Try to parse as JSON first
        businessRules = JSON.parse(benefitConfig.terms);
      } catch {
        // If not JSON, treat as plain text and check for common patterns
        const termsLower = benefitConfig.terms.toLowerCase();
        
        // Extract minimum tenure if mentioned (e.g., "minimum 12 months", "at least 1 year")
        const minTenureMatch = benefitConfig.terms.match(
          /(?:minimum|min|at least|after)\s*(\d+)\s*(?:month|year|yr)/i,
        );
        if (minTenureMatch) {
          const value = parseInt(minTenureMatch[1]);
          const unit = termsLower.includes('year') || termsLower.includes('yr')
            ? 'years'
            : 'months';
          businessRules.minTenure = { value, unit };
        }

        // Check if benefit applies to resignation or termination
        if (termsLower.includes('resignation') && !termsLower.includes('termination')) {
          businessRules.appliesTo = ['resignation'];
        } else if (termsLower.includes('termination') && !termsLower.includes('resignation')) {
          businessRules.appliesTo = ['termination'];
        } else {
          businessRules.appliesTo = ['resignation', 'termination'];
        }
      }
    }

    // 5. Check minimum tenure requirement
    if (businessRules.minTenure) {
      const { value, unit } = businessRules.minTenure;
      const requiredTenure = unit === 'years' ? value * 12 : value;
      
      if (tenureMonths < requiredTenure) {
        return {
          isEligible: false,
          reason: `Employee tenure (${tenureMonths.toFixed(1)} months) is less than required minimum (${requiredTenure} ${unit === 'years' ? 'months' : 'months'})`,
        };
      }
    }

    // 6. Check if benefit applies to this termination type
    // Termination initiator: 'employee' = resignation, 'hr' or 'manager' = termination
    const terminationType =
      termination.initiator === 'employee' ? 'resignation' : 'termination';
    
    if (businessRules.appliesTo && Array.isArray(businessRules.appliesTo)) {
      if (!businessRules.appliesTo.includes(terminationType)) {
        return {
          isEligible: false,
          reason: `Benefit applies to ${businessRules.appliesTo.join(' or ')}, but termination type is ${terminationType}`,
        };
      }
    }

    // 7. Calculate benefit amount based on business rules (if calculation method specified)
    let calculatedAmount = benefitConfig.amount;
    if (businessRules.calculationMethod === 'tenure_based' || businessRules.calculationMethod === 'percentage_of_salary') {
      // Get employee base salary from PayGrade
      let baseSalary = 0;
      if (employee.payGradeId) {
        // If payGradeId is populated (object), get baseSalary directly
        if (typeof employee.payGradeId === 'object' && employee.payGradeId !== null) {
          baseSalary = (employee.payGradeId as any).baseSalary || 0;
        } else {
          // If payGradeId is just an ID, we need to fetch the PayGrade
          const PayGradeModel = this.payrollRunModel.db.model(payGrade.name);
          const payGradeDoc = await PayGradeModel.findById(employee.payGradeId).exec();
          if (payGradeDoc) {
            baseSalary = (payGradeDoc as any).baseSalary || 0;
          }
        }
      }

      if (baseSalary > 0) {
        if (businessRules.calculationMethod === 'tenure_based') {
          // Example: 1 month salary per year of service
          const multiplier = businessRules.multiplier || 1; // months of salary per year
          calculatedAmount = (tenureYears * multiplier * baseSalary) / 12;
        } else if (businessRules.calculationMethod === 'percentage_of_salary') {
          const percentage = businessRules.percentage || 100;
          calculatedAmount = (baseSalary * percentage) / 100;
        }
      } else {
        console.warn(
          `[Validate Termination Benefit] Cannot calculate benefit amount for employee ${employee.employeeNumber}: base salary not found in PayGrade`,
        );
      }
    }

    // 8. Check contract validity (if contract has ended before termination, may affect eligibility)
    if (contractEndDate && terminationDate > contractEndDate) {
      // Contract ended before termination - may still be eligible but log for review
      console.log(
        `[Validate Termination Benefit] Contract ended on ${contractEndDate.toISOString()}, but termination date is ${terminationDate.toISOString()}`,
      );
    }

    // All validations passed
    return {
      isEligible: true,
      calculatedAmount,
    };
  }

  // Create employee termination benefit manually
  async createEmployeeTerminationBenefit(createDto: CreateEmployeeTerminationBenefitDto, currentUserId: string): Promise<EmployeeTerminationResignation> {
    // Validate employee exists
    const employee = await this.employeeProfileService.findOne(createDto.employeeId);
    if (!employee) {
      throw new Error(`Employee not found with ID: ${createDto.employeeId}`);
    }

    // Validate termination benefit configuration exists
    const benefitConfig = await this.payrollConfigurationService.findOneTerminationBenefit(createDto.benefitId);
    if (!benefitConfig) {
      throw new Error(`Termination benefit configuration not found with ID: ${createDto.benefitId}`);
    }

    // Validate termination request exists
    const TerminationRequestModel = this.payrollRunModel.db.model(TerminationRequest.name);
    const terminationRequest = await TerminationRequestModel.findById(createDto.terminationId).exec();
    if (!terminationRequest) {
      throw new Error(`Termination request not found with ID: ${createDto.terminationId}`);
    }

    // Check if termination benefit already exists for this employee + benefit + termination combination
    const existingBenefit = await this.employeeTerminationResignationModel.findOne({
      employeeId: new mongoose.Types.ObjectId(createDto.employeeId) as any,
      benefitId: new mongoose.Types.ObjectId(createDto.benefitId) as any,
      terminationId: new mongoose.Types.ObjectId(createDto.terminationId) as any
    });

    if (existingBenefit) {
      throw new Error(`Termination benefit already exists for this employee, benefit configuration, and termination request. Use edit-termination-benefit endpoint instead. Existing ID: ${existingBenefit._id}`);
    }

    // Create the employee termination benefit
    const employeeBenefit = new this.employeeTerminationResignationModel({
      employeeId: new mongoose.Types.ObjectId(createDto.employeeId) as any,
      benefitId: new mongoose.Types.ObjectId(createDto.benefitId) as any,
      terminationId: new mongoose.Types.ObjectId(createDto.terminationId) as any,
      givenAmount: createDto.givenAmount,
      status: createDto.status || BenefitStatus.PENDING,
      createdBy: currentUserId,
      updatedBy: currentUserId
    });

    const savedBenefit = await employeeBenefit.save();
    console.log(`[Create Termination Benefit] Created employee termination benefit: ${savedBenefit._id} for employee: ${createDto.employeeId}`);
    return savedBenefit;
  }

  // REQ-PY-31: Review and approve processed benefits upon resignation
  async reviewTerminationBenefit(reviewDto: TerminationBenefitReviewDto, currentUserId: string): Promise<EmployeeTerminationResignation> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(reviewDto.employeeTerminationResignationId)) {
      throw new Error(`Invalid termination benefit ID format: ${reviewDto.employeeTerminationResignationId}`);
    }

    console.log(`[Review Termination Benefit] Looking for termination benefit with ID: ${reviewDto.employeeTerminationResignationId}`);
    const benefit = await this.employeeTerminationResignationModel.findById(reviewDto.employeeTerminationResignationId);
    
    if (!benefit) {
      // Check if any termination benefits exist to help with debugging
      const totalCount = await this.employeeTerminationResignationModel.countDocuments();
      const pendingCount = await this.employeeTerminationResignationModel.countDocuments({ status: BenefitStatus.PENDING });
      console.error(`[Review Termination Benefit] Termination benefit not found. ID: ${reviewDto.employeeTerminationResignationId}, Total termination benefits in DB: ${totalCount}, Pending: ${pendingCount}`);
      
      // Check if the ID might be from the wrong collection (terminationAndResignationBenefits config instead of EmployeeTerminationResignation)
      try {
        const configCheck = await this.payrollConfigurationService.findOneTerminationBenefit(reviewDto.employeeTerminationResignationId);
        
        if (configCheck) {
          throw new Error(`The ID ${reviewDto.employeeTerminationResignationId} belongs to a termination benefit CONFIGURATION (from 'terminationandresignationbenefits' collection), not an employee termination benefit record. You need to use an ID from the 'employeeterminationresignations' collection. Please call 'POST /api/v1/payroll/process-termination-benefits' first to create employee termination benefit records, then use one of those IDs.`);
        }
      } catch (error) {
        // If findOneTerminationBenefit throws NotFoundException, that's fine - it means it's not a config ID
        // Continue with the original error message
      }
      
      if (totalCount === 0) {
        throw new Error(`No employee termination benefits exist in the system. The ID you provided (${reviewDto.employeeTerminationResignationId}) was not found in the 'employeeterminationresignations' collection. Please call 'POST /api/v1/payroll/process-termination-benefits' endpoint first to create termination benefits for eligible employees (those with approved termination requests).`);
      } else {
        // Get a few example IDs to help the user
        const examples = await this.employeeTerminationResignationModel.find().limit(5).select('_id employeeId status').populate('employeeId', 'fullName employeeNumber').exec();
        const exampleDetails = examples.map(b => {
          const emp = (b as any).employeeId;
          return `${b._id.toString()} (Employee: ${emp?.fullName || emp?.employeeNumber || 'N/A'}, Status: ${b.status})`;
        }).join('; ');
        throw new Error(`Employee termination benefit not found with ID: ${reviewDto.employeeTerminationResignationId}. Available employee termination benefit IDs (examples): ${exampleDetails}. Please use a valid employee termination benefit ID from the 'process-termination-benefits' response.`);
      }
    }

    console.log(`[Review Termination Benefit] Found termination benefit. Current status: ${benefit.status}, Updating to: ${reviewDto.status}`);

    benefit.status = reviewDto.status;
    (benefit as any).updatedBy = currentUserId;
    const savedBenefit = await benefit.save();
    console.log(`[Review Termination Benefit] Termination benefit updated successfully. New status: ${savedBenefit.status}`);
    return savedBenefit;
  }

  // REQ-PY-32: Manually edit benefits upon resignation when needed
  async editTerminationBenefit(
    editDto: TerminationBenefitEditDto,
    currentUserId: string,
  ): Promise<EmployeeTerminationResignation> {
    const benefit = await this.employeeTerminationResignationModel.findById(
      editDto.employeeTerminationResignationId,
    );
    if (!benefit) throw new Error('Termination benefit not found');

    // Validation: Check if this termination benefit is part of any locked payroll run
    // A termination benefit is considered part of a locked payroll if:
    // 1. The employee has payroll details in a locked payroll run, AND
    // 2. The benefit was created before or during that payroll period
    const employeeId = (benefit as any).employeeId;
    const benefitCreatedAt = (benefit as any).createdAt;

    if (employeeId && benefitCreatedAt) {
      // Find all locked payroll runs
      const lockedPayrolls = await this.payrollRunModel
        .find({
          status: PayRollStatus.LOCKED,
        })
        .exec();

      // Check if the employee has payroll details in any locked payroll run
      for (const lockedPayroll of lockedPayrolls) {
        const payrollDetails = await this.employeePayrollDetailsModel
          .findOne({
            employeeId: employeeId,
            payrollRunId: lockedPayroll._id,
          })
          .exec();

        if (payrollDetails) {
          // Employee has payroll details in this locked payroll run
          // Check if benefit was created before or during this payroll period
          const payrollPeriod = lockedPayroll.payrollPeriod;
          if (payrollPeriod) {
            const periodEnd = new Date(payrollPeriod);
            periodEnd.setHours(23, 59, 59, 999); // End of the payroll period

            if (new Date(benefitCreatedAt) <= periodEnd) {
              throw new Error(
                `Cannot edit termination benefit. This benefit is part of a locked payroll run (RunId: ${lockedPayroll.runId}, Period: ${payrollPeriod.toISOString().split('T')[0]}). ` +
                  `Please unlock the payroll run first if you need to make changes.`,
              );
            }
          }
        }
      }
    }

    // Handle benefitId change (switching to different config)
    if (editDto.benefitId) {
      benefit.benefitId = new mongoose.Types.ObjectId(editDto.benefitId) as any;
      // If switching to a different benefit config, update givenAmount from new config
      // Note: If givenAmount is also provided in DTO, it will override this (manual edit takes precedence)
      try {
        const newConfig = await this.payrollConfigurationService.findOneTerminationBenefit(editDto.benefitId);
        if (newConfig && newConfig.amount) {
          // Only update from config if manual givenAmount is not provided
          if (editDto.givenAmount === undefined) {
            benefit.givenAmount = newConfig.amount;
          }
        }
      } catch (error) {
        // If config not found, keep existing givenAmount (or use manual givenAmount if provided)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Termination benefit config ${editDto.benefitId} not found: ${errorMessage}`,
        );
      }
    }

    // Handle terminationId update
    if (editDto.terminationId) {
      benefit.terminationId = new mongoose.Types.ObjectId(
        editDto.terminationId,
      ) as any;
    }

    // Handle status update
    if (editDto.status) {
      benefit.status = editDto.status;
    }

    // Handle givenAmount update (manual edit - takes precedence over config amount)
    // This is processed last to ensure manual edits override config-based amounts
    if (editDto.givenAmount !== undefined) {
      if (editDto.givenAmount < 0) {
        throw new Error('givenAmount cannot be negative');
      }
      benefit.givenAmount = editDto.givenAmount;
    }

    (benefit as any).updatedBy = currentUserId;
    return await benefit.save();
  }

  // Get all termination benefits with optional filtering
  async getTerminationBenefits(
    status: BenefitStatus | undefined,
    employeeId: string | undefined,
    type: 'TERMINATION' | 'RESIGNATION' | undefined,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<{ data: EmployeeTerminationResignation[]; total: number; page: number; limit: number }> {
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (employeeId && employeeId.trim()) {
      const searchTerm = employeeId.trim();
      
      // Try to find employees matching the search term
      let employeeIds: mongoose.Types.ObjectId[] = [];
      
      // First, try as ObjectId
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        const objectId = new mongoose.Types.ObjectId(searchTerm);
        const employee = await this.employeeProfileModel.findById(objectId).select('_id').exec();
        if (employee) {
          employeeIds.push(objectId);
        }
      }
      
      // Also search by employeeNumber
      const employeesByNumber = await this.employeeProfileModel
        .find({ employeeNumber: { $regex: searchTerm, $options: 'i' } })
        .select('_id')
        .exec();
      employeeIds.push(...employeesByNumber.map(emp => emp._id as mongoose.Types.ObjectId));
      
      // Also search by name (firstName or lastName)
      const nameParts = searchTerm.split(/\s+/);
      const nameQuery: any = {};
      if (nameParts.length === 1) {
        // Single word - search in both firstName and lastName
        nameQuery.$or = [
          { firstName: { $regex: nameParts[0], $options: 'i' } },
          { lastName: { $regex: nameParts[0], $options: 'i' } },
        ];
      } else {
        // Multiple words - assume first is firstName, rest is lastName
        nameQuery.firstName = { $regex: nameParts[0], $options: 'i' };
        nameQuery.lastName = { $regex: nameParts.slice(1).join(' '), $options: 'i' };
      }
      
      const employeesByName = await this.employeeProfileModel
        .find(nameQuery)
        .select('_id')
        .exec();
      employeeIds.push(...employeesByName.map(emp => emp._id as mongoose.Types.ObjectId));
      
      // Remove duplicates
      employeeIds = [...new Set(employeeIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id) as any);
      
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      } else {
        // No matching employees found - return empty result
        query.employeeId = { $in: [] }; // This will match nothing
      }
    }

    // Filter by termination type if specified
    // We need to find termination requests with the specified type first
    if (type) {
      const TerminationRequestModel = this.employeeTerminationResignationModel.db.model('TerminationRequest');
      const terminations = await TerminationRequestModel.find({ type }).select('_id').exec();
      const terminationIds = terminations.map((t: any) => t._id);
      if (terminationIds.length === 0) {
        // No terminations of this type exist, return empty result
        return {
          data: [],
          total: 0,
          page,
          limit,
        };
      }
      query.terminationId = { $in: terminationIds };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.employeeTerminationResignationModel
        .find(query)
        .populate('employeeId', 'firstName lastName employeeNumber _id')
        .populate('benefitId', 'name amount')
        .populate('terminationId', 'reason initiator')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.employeeTerminationResignationModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // Get termination benefit by ID
  async getTerminationBenefitById(
    id: string,
    currentUserId: string,
  ): Promise<EmployeeTerminationResignation> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid termination benefit ID format: ${id}`);
    }

    const terminationBenefit = await this.employeeTerminationResignationModel
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber _id')
      .populate('benefitId', 'name amount')
      .populate('terminationId', 'reason initiator')
      .exec();

    if (!terminationBenefit) {
      throw new Error(`Termination benefit with ID ${id} not found`);
    }

    return terminationBenefit;
  }

  // REQ-PY-1: Automatically calculate salaries, allowances, deductions, and contributions
  // BR 35: Net Salary = Gross Salary – Taxes (% of Base Salary) – Social/Health Insurance
  // REQ-PY-1: Check HR Events (new hire, termination, resigned) and calculate netPay = (Net - Penalties + refunds)
  async calculatePayroll(
    employeeId: string,
    payrollRunId: string,
    baseSalary: number | undefined,
    currentUserId: string,
  ): Promise<employeePayrollDetails> {
    // Get employee using EmployeeProfileService
    const employee = await this.employeeProfileService.findOne(employeeId);
    if (!employee) throw new Error('Employee not found');

    // BR: Base salary should be fetched from PayGrade configuration automatically
    // Priority: 1) Provided baseSalary (if explicitly provided and > 0), 2) PayGrade baseSalary, 3) 0 (flag exception)
    let actualBaseSalary: number | undefined = undefined;
    let baseSalarySource: 'provided' | 'paygrade' | 'none' = 'none';

    // Step 1: Try to fetch from PayGrade first (automatic retrieval)
    if (employee.payGradeId) {
      try {
        const payGradeData = await this.payrollConfigurationService.findOnePayGrade(employee.payGradeId.toString());
        if (payGradeData) {
          // Only use PayGrade if it's approved (BR: Use approved configurations only)
          if (payGradeData.status === ConfigStatus.APPROVED) {
            if (payGradeData.baseSalary && payGradeData.baseSalary > 0) {
              actualBaseSalary = payGradeData.baseSalary;
              baseSalarySource = 'paygrade';
            } else {
              // PayGrade exists but has invalid baseSalary
              await this.flagPayrollException(
                payrollRunId,
                'INVALID_PAYGRADE_SALARY',
                `PayGrade ${employee.payGradeId} has invalid baseSalary (${payGradeData.baseSalary}) for employee ${employeeId}`,
                currentUserId,
                employeeId,
              );
            }
          } else {
            // PayGrade exists but not approved
            await this.flagPayrollException(
              payrollRunId,
              'PAYGRADE_NOT_APPROVED',
              `PayGrade ${employee.payGradeId} is not approved (status: ${payGradeData.status}) for employee ${employeeId}. Cannot use baseSalary from PayGrade.`,
              currentUserId,
              employeeId,
            );
          }
        }
      } catch (error) {
        // PayGrade not found or error fetching
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.flagPayrollException(
          payrollRunId,
          'PAYGRADE_NOT_FOUND',
          `PayGrade ${employee.payGradeId} not found or error fetching for employee ${employeeId}: ${errorMessage}`,
          currentUserId,
          employeeId,
        );
        console.warn(
          `PayGrade ${employee.payGradeId} not found for employee ${employeeId}: ${errorMessage}`,
        );
      }
    } else {
      // Employee has no PayGrade assigned
      await this.flagPayrollException(
        payrollRunId,
        'NO_PAYGRADE_ASSIGNED',
        `Employee ${employeeId} has no PayGrade assigned. Cannot automatically retrieve baseSalary.`,
        currentUserId,
        employeeId,
      );
    }

    // Step 2: Use provided baseSalary as override if explicitly provided and valid
    if (baseSalary !== undefined && baseSalary !== null && baseSalary > 0) {
      if (
        actualBaseSalary !== undefined &&
        actualBaseSalary > 0 &&
        baseSalary !== actualBaseSalary
      ) {
        // Warn if provided salary differs from PayGrade salary
        await this.flagPayrollException(
          payrollRunId,
          'BASE_SALARY_OVERRIDE',
          `Base salary override: Provided ${baseSalary} differs from PayGrade baseSalary ${actualBaseSalary} for employee ${employeeId}`,
          currentUserId,
          employeeId,
        );
      }
      actualBaseSalary = baseSalary;
      baseSalarySource = 'provided';
    }

    // Step 3: Final validation - ensure we have a valid baseSalary
    if (!actualBaseSalary || actualBaseSalary <= 0) {
      actualBaseSalary = 0;
      await this.flagPayrollException(
        payrollRunId,
        'MISSING_BASE_SALARY',
        `No valid baseSalary found for employee ${employeeId}. PayGrade: ${employee.payGradeId ? employee.payGradeId.toString() : 'none'}, Provided: ${baseSalary || 'none'}`,
        currentUserId,
        employeeId,
      );
    }

    // BR 4: Validate minimum salary bracket compliance (Egyptian Labor Law 2025)
    await this.validateMinimumSalaryBracket(actualBaseSalary, employeeId, payrollRunId, currentUserId);

    // Get payroll run to access payroll period for prorated calculations
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Check HR Events: new hire, termination, resigned
    const isNewHire = await this.checkNewHire(employeeId);
    const terminationInfo = await this.getTerminationInfo(employeeId);
    const isTerminated = !!terminationInfo;
    const isResigned = await this.checkResignation(employeeId);

    // REQ-PY-2: Calculate prorated salary for mid-month hires, terminations
    // BR 2: Salary calculation according to contract terms for partial periods
    // BR 36: Payroll processing for partial periods (mid-month hires/terminations)
    // Determine if proration is needed and calculate accordingly
    const payrollPeriodEnd = new Date(payrollRun.payrollPeriod);
    const payrollPeriodStart = new Date(
      payrollPeriodEnd.getFullYear(),
      payrollPeriodEnd.getMonth(),
      1,
    );
    const payrollPeriodEndDate = new Date(
      payrollPeriodEnd.getFullYear(),
      payrollPeriodEnd.getMonth() + 1,
      0,
    );

    // Normalize dates to start of day for accurate comparison
    const periodStart = new Date(payrollPeriodStart);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(payrollPeriodEndDate);
    periodEnd.setHours(23, 59, 59, 999);

    let needsProration = false;
    let startDate = new Date(periodStart);
    let endDate = new Date(periodEnd);

    // Check if employee was hired mid-month (within this payroll period)
    if (employee.dateOfHire) {
      const hireDate = new Date(employee.dateOfHire);
      hireDate.setHours(0, 0, 0, 0);

      // If hired after period start but within or before period end, prorate from hire date
      if (hireDate > periodStart && hireDate <= periodEnd) {
        needsProration = true;
        startDate = hireDate;
      }
      // If hired after period end, they shouldn't be in this payroll (but don't throw, just use full period)
      // This case should be handled by the employee filtering logic
    }

    // Check if employee was terminated/resigned mid-month (within this payroll period)
    if (terminationInfo && terminationInfo.terminationDate) {
      const terminationDate = new Date(terminationInfo.terminationDate);
      terminationDate.setHours(23, 59, 59, 999);

      // If terminated within the payroll period, prorate to termination date
      if (terminationDate >= periodStart && terminationDate < periodEnd) {
        needsProration = true;
        endDate = terminationDate;
      }
      // If terminated before period start, they shouldn't be in this payroll
      // If terminated after period end, use full period (no proration needed)
    }

    // Apply prorated salary calculation if needed (REQ-PY-2)
    // Only prorate if the employee worked partial period (hired or terminated mid-month)
    if (needsProration && actualBaseSalary > 0) {
      try {
        actualBaseSalary = await this.calculateProratedSalary(
          employeeId,
          actualBaseSalary,
          startDate,
          endDate,
          payrollPeriodEndDate,
          currentUserId,
        );
      } catch (error) {
        // If proration calculation fails, flag as exception but continue with full salary
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Error calculating prorated salary for employee ${employeeId}: ${errorMessage}`,
        );
        await this.flagPayrollException(
          payrollRunId,
          'PRORATION_ERROR',
          `Failed to calculate prorated salary for employee ${employeeId}: ${errorMessage}`,
          currentUserId,
          employeeId,
        );
      }
    }

    // Get allowances from configuration using PayrollConfigurationService (BR 38, BR 39)
    // BR 20: Allowances as part of employment contract
    // BR 38: Allowance structure support
    // BR 39: Allowance types tracking
    const allowancesResult = await this.payrollConfigurationService.findAllAllowances({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved allowances
    });
    
    // Get employee-specific applicable allowances (BR 20, BR 38, BR 39)
    const applicableAllowances = await this.getApplicableAllowancesForEmployee(
      employee,
      allowancesResult?.data || []
    );

    let totalAllowances = 0;
    for (const allowance of applicableAllowances) {
      totalAllowances += (allowance as any).amount || 0;
    }

    // Note: If proration was applied to base salary, allowances are typically also prorated
    // However, this depends on business rules - some allowances may be fixed regardless of days worked
    // For now, we apply allowances in full. This can be enhanced based on allowance type if needed.

    // Calculate Gross Salary (BR 9, BR 35)
    const grossSalary = actualBaseSalary + totalAllowances;

    // Apply statutory rules (REQ-PY-3) - Taxes and Insurance (BR 35)
    // BR 35: Taxes = % of Base Salary
    // Social Insurance and Pensions Law: Employee Insurance = GrossSalary * employee_percentage
    // BR 31: Store all calculation elements for auditability
    const statutoryBreakdown = await this.applyStatutoryRulesWithBreakdown(
      actualBaseSalary,
      employeeId,
      grossSalary, // Pass grossSalary for insurance calculations
    );
    const statutoryDeductions = statutoryBreakdown.total;

    // Get penalties from Time Management (missing working hours/days) and Leaves (unpaid leave)
    // BR 31: Store breakdown of penalties for auditability
    const penaltiesBreakdown = await this.calculatePenaltiesWithBreakdown(
      employeeId,
      payrollRunId,
    );
    const penalties = penaltiesBreakdown.total;

    // Get refunds using PayrollTrackingService
    const refunds = await this.calculateRefunds(employeeId, payrollRunId);

    // Calculate Net Salary (BR 35): Gross Salary – Taxes – Social/Health Insurance
    const netSalary = grossSalary - statutoryDeductions;

    // Calculate Net Pay (REQ-PY-1): Net Salary - Penalties + Refunds
    const netPay = netSalary - penalties + refunds;

    // Check bank status
    const bankStatus = employee.bankAccountNumber ? 'valid' : 'missing';

    // BR 31: Store deductions breakdown for auditability
    // Store breakdown as JSON in exceptions field (structured format)
    // Note: exceptions field is used to store both breakdown and any exception messages
    const deductionsBreakdown = {
      taxes: statutoryBreakdown.taxes,
      insurance: statutoryBreakdown.insurance,
      timeManagementPenalties: penaltiesBreakdown.timeManagementPenalties,
      unpaidLeavePenalties: penaltiesBreakdown.unpaidLeavePenalties,
      total: statutoryDeductions + penalties,
    };

    // Get currency from payroll run for storage in exceptions
    const payrollRunForCurrency =
      await this.payrollRunModel.findById(payrollRunId);
    const currency = payrollRunForCurrency
      ? this.getPayrollRunCurrency(payrollRunForCurrency)
      : 'USD';

    // Store breakdown as JSON string in exceptions field
    // Format: JSON object that can be parsed later for payslip generation and auditability
    // Structure includes deductions breakdown, exception tracking arrays, and currency information
    const breakdownJson = JSON.stringify({
      deductionsBreakdown,
      currency: currency, // Store currency for this payroll calculation
      timestamp: new Date().toISOString(),
      exceptionMessages: [], // Will be populated when exceptions are flagged
      exceptionHistory: [], // Will be populated for tracking exception lifecycle
    });

    const payrollDetails = new this.employeePayrollDetailsModel({
      employeeId: new mongoose.Types.ObjectId(employeeId) as any,
      payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      baseSalary: actualBaseSalary,
      allowances: totalAllowances,
      deductions: statutoryDeductions + penalties, // Total deductions = statutory + penalties
      netSalary,
      netPay: Math.max(0, netPay), // Ensure non-negative
      bankStatus: bankStatus as any,
      exceptions: breakdownJson, // Store breakdown for auditability (BR 31)
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    return await payrollDetails.save();
  }

  // Helper: Check if employee is a new hire
  private async checkNewHire(employeeId: string): Promise<boolean> {
    try {
      const employee = await this.employeeProfileService.findOne(employeeId);
      if (!employee) return false;

      // Check if hired within last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return employee.dateOfHire >= thirtyDaysAgo;
    } catch (error) {
      return false;
    }
  }

  // Helper: Get termination information (returns termination request if exists)
  private async getTerminationInfo(employeeId: string): Promise<any> {
    const TerminationRequestModel = this.payrollRunModel.db.model(
      TerminationRequest.name,
    );
    const termination = await TerminationRequestModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId) as any,
      status: TerminationStatus.APPROVED,
    }).sort({ createdAt: -1 }); // Get most recent termination
    return termination;
  }

  // Helper: Check if employee is terminated
  private async checkTermination(employeeId: string): Promise<boolean> {
    const termination = await this.getTerminationInfo(employeeId);
    return !!termination;
  }

  // Helper: Check if employee resigned
  private async checkResignation(employeeId: string): Promise<boolean> {
    // Similar to termination check, but would check resignation-specific status
    const TerminationRequestModel = this.payrollRunModel.db.model(
      TerminationRequest.name,
    );
    const resignation = await TerminationRequestModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId) as any,
      status: TerminationStatus.APPROVED,
      // Would check initiator type for resignation vs termination
    });
    return !!resignation;
  }

  // Helper: Calculate penalties from Time Management and Leaves
  private async calculatePenalties(
    employeeId: string,
    payrollRunId: string,
  ): Promise<number> {
    const breakdown = await this.calculatePenaltiesWithBreakdown(
      employeeId,
      payrollRunId,
    );
    return breakdown.total;
  }

  // Helper: Calculate penalties with breakdown (BR 31: Store all calculation elements for auditability)
  // BR 11: Unpaid leave deduction calculation (daily/hourly)
  // BR 34: Missing working hours/days penalties
  private async calculatePenaltiesWithBreakdown(
    employeeId: string,
    payrollRunId: string,
  ): Promise<{
    total: number;
    timeManagementPenalties: number;
    unpaidLeavePenalties: number;
  }> {
    // Get payroll run to determine payroll period
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Get employee to calculate daily/hourly rates
    const employee = await this.employeeProfileService.findOne(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get base salary for calculating daily/hourly rates
    let baseSalary = 0;
    if (employee.payGradeId) {
      try {
        const payGradeDoc = await this.payrollConfigurationService.findOnePayGrade(employee.payGradeId.toString());
        if (payGradeDoc && payGradeDoc.status === ConfigStatus.APPROVED) {
          baseSalary = payGradeDoc.baseSalary || 0;
          // Note: Minimum salary bracket validation is already performed in the main calculation flow
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Could not fetch PayGrade for employee ${employeeId}: ${errorMessage}`,
        );
      }
    }

    // Calculate daily rate (assuming 30 days per month, can be enhanced with actual working days)
    const dailyRate = baseSalary > 0 ? baseSalary / 30 : 0;
    // Calculate hourly rate (assuming 8 hours per day, 30 days per month = 240 hours)
    const hourlyRate = baseSalary > 0 ? baseSalary / 240 : 0;

    let timeManagementPenalties = 0;
    let unpaidLeavePenalties = 0;

    // ============================================
    // 1. Calculate Unpaid Leave Penalties (BR 11)
    // ============================================
    try {
      // Get payroll period dates
      const payrollPeriod = new Date(payrollRun.payrollPeriod);
      const year = payrollPeriod.getFullYear();
      const month = payrollPeriod.getMonth();
      const periodStart = new Date(year, month, 1);
      const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Get all leave requests for this employee within the payroll period
      const leaveRequests = await this.leavesService.getPastLeaveRequests(
        employeeId,
        {
          fromDate: periodStart,
          toDate: periodEnd,
          status: LeaveStatus.APPROVED, // Only approved leaves are considered
        },
      );

      // Batch fetch all unique LeaveTypes to avoid N+1 queries
      const uniqueLeaveTypeIds = [
        ...new Set(leaveRequests.map((lr: any) => lr.leaveTypeId)),
      ];

      // Access LeaveType model via db.model (since it's in LeavesModule)
      const LeaveTypeModel = this.payrollRunModel.db.model('LeaveType');
      const leaveTypes = await LeaveTypeModel.find({
        _id: {
          $in: uniqueLeaveTypeIds.map(
            (id: any) => new mongoose.Types.ObjectId(id),
          ),
        },
      }).exec();

      // Create a map for quick lookup: leaveTypeId -> paid status
      const leaveTypePaidMap = new Map<string, boolean>();
      for (const leaveType of leaveTypes) {
        const lt = leaveType as any;
        leaveTypePaidMap.set(lt._id.toString(), lt.paid !== false); // Default to true if not specified
      }

      // Filter for unpaid leaves and calculate penalties
      for (const leaveRequest of leaveRequests) {
        const leaveTypeId =
          leaveRequest.leaveTypeId?.toString() || leaveRequest.leaveTypeId;
        const isPaid = leaveTypePaidMap.get(leaveTypeId);

        // If leave type is not found in map, skip (already logged in batch fetch)
        // If isPaid is false, it's an unpaid leave
        if (isPaid === false) {
          // This is an unpaid leave - calculate penalty
          // BR 11: Unpaid leave deduction = daily rate * duration days
          const durationDays = leaveRequest.durationDays || 0;
          const penalty = dailyRate * durationDays;
          unpaidLeavePenalties += penalty;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Error calculating unpaid leave penalties for employee ${employeeId}: ${errorMessage}`,
      );
      // Continue with time management penalties even if leaves calculation fails
    }

    // ============================================
    // 2. Calculate Time Management Penalties (BR 34)
    // ============================================
    try {
      // Get payroll period dates
      const payrollPeriod = new Date(payrollRun.payrollPeriod);
      const year = payrollPeriod.getFullYear();
      const month = payrollPeriod.getMonth();
      const periodStart = new Date(year, month, 1);
      const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Access AttendanceRecord and TimeException models via db.model
      const AttendanceRecordModel =
        this.payrollRunModel.db.model('AttendanceRecord');
      const TimeExceptionModel = this.payrollRunModel.db.model('TimeException');

      // Get attendance records for this employee within the payroll period
      // Note: AttendanceRecord doesn't have a date field directly, so we'll check all records
      // and filter by exception dates or use a different approach
      // For now, we'll get all attendance records with exceptions for this employee
      const attendanceRecords = await AttendanceRecordModel.find({
        employeeId: new mongoose.Types.ObjectId(employeeId) as any,
        finalisedForPayroll: true, // Only finalized records
      }).exec();

      // Get time exceptions for this employee
      // Time exceptions that result in penalties: LATE, EARLY_LEAVE, SHORT_TIME, MISSED_PUNCH
      const timeExceptions = await TimeExceptionModel.find({
        employeeId: new mongoose.Types.ObjectId(employeeId) as any,
        status: {
          $in: [TimeExceptionStatus.APPROVED, TimeExceptionStatus.RESOLVED],
        }, // Only approved/resolved exceptions count
        type: {
          $in: [
            TimeExceptionType.LATE,
            TimeExceptionType.EARLY_LEAVE,
            TimeExceptionType.SHORT_TIME,
            TimeExceptionType.MISSED_PUNCH,
          ],
        },
      }).exec();

      // Calculate penalties from time exceptions
      // Note: This is a simplified calculation - actual penalty amounts would come from
      // LatenessRule or other configuration. For now, we'll use a default calculation.
      for (const exception of timeExceptions) {
        const exceptionData = exception as any;
        const exceptionType = exceptionData.type;

        // Check if the exception's attendance record date falls within payroll period
        // Since we don't have direct date on TimeException, we'll check via AttendanceRecord
        const attendanceRecord = attendanceRecords.find(
          (ar: any) =>
            ar._id.toString() === exceptionData.attendanceRecordId?.toString(),
        );

        if (attendanceRecord) {
          // Calculate penalty based on exception type
          // Default: 1 hour penalty for LATE, EARLY_LEAVE, SHORT_TIME
          // Default: 4 hours (half day) penalty for MISSED_PUNCH
          let penaltyHours = 0;

          if (exceptionType === TimeExceptionType.MISSED_PUNCH) {
            penaltyHours = 4; // Half day penalty
          } else if (
            [
              TimeExceptionType.LATE,
              TimeExceptionType.EARLY_LEAVE,
              TimeExceptionType.SHORT_TIME,
            ].includes(exceptionType)
          ) {
            penaltyHours = 1; // 1 hour penalty
          }

          const penalty = hourlyRate * penaltyHours;
          timeManagementPenalties += penalty;
        }
      }

      // Also check for missing working days (attendance records with very low or zero work minutes)
      // This would indicate missing days that should be penalized
      for (const attendanceRecord of attendanceRecords) {
        const record = attendanceRecord as any;
        const totalWorkMinutes = record.totalWorkMinutes || 0;
        const expectedWorkMinutes = 8 * 60; // 8 hours = 480 minutes

        // If work minutes are significantly less than expected, calculate penalty
        if (totalWorkMinutes < expectedWorkMinutes * 0.5) {
          // Less than 50% of expected work time - penalize the difference
          const missingMinutes = expectedWorkMinutes - totalWorkMinutes;
          const missingHours = missingMinutes / 60;
          const penalty = hourlyRate * missingHours;
          timeManagementPenalties += penalty;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Error calculating time management penalties for employee ${employeeId}: ${errorMessage}`,
      );
      // Continue even if time management calculation fails
    }

    const total = timeManagementPenalties + unpaidLeavePenalties;

    return {
      total: Math.round(total * 100) / 100,
      timeManagementPenalties: Math.round(timeManagementPenalties * 100) / 100,
      unpaidLeavePenalties: Math.round(unpaidLeavePenalties * 100) / 100,
    };
  }

  // Helper: Get applicable allowances for an employee based on their contract/position
  // BR 20: Allowances as part of employment contract
  // BR 38: Allowance structure support
  // BR 39: Allowance types tracking
  // Note: Since allowance schema doesn't have employee-specific fields, this implements
  // a flexible matching system based on naming conventions and employee attributes
  private async getApplicableAllowancesForEmployee(
    employee: any,
    allAllowances: any[],
  ): Promise<any[]> {
    // Validate inputs
    if (!employee || !allAllowances || allAllowances.length === 0) {
      return [];
    }

    // Get employee attributes for matching
    // Note: employeeProfileService.findOne() already populates these fields
    const employeePosition = employee.primaryPositionId;
    const employeeDepartment = employee.primaryDepartmentId;
    const employeePayGrade = employee.payGradeId;
    const employeeContractType = employee.contractType;
    const employeeWorkType = employee.workType;

    // Extract position, department, and pay grade details if populated
    // Handle both populated objects and ObjectIds
    let positionTitle: string = '';
    let departmentName: string = '';
    let payGradeGrade: string = '';

    if (employeePosition) {
      if (typeof employeePosition === 'object' && employeePosition !== null) {
        // Populated object
        positionTitle = ((employeePosition as any).title || '')
          .toLowerCase()
          .trim();
      } else if (typeof employeePosition === 'string') {
        // ObjectId as string - would need to fetch, but for now skip position matching
        positionTitle = '';
      }
    }

    if (employeeDepartment) {
      if (
        typeof employeeDepartment === 'object' &&
        employeeDepartment !== null
      ) {
        // Populated object
        departmentName = ((employeeDepartment as any).name || '')
          .toLowerCase()
          .trim();
      } else if (typeof employeeDepartment === 'string') {
        // ObjectId as string - would need to fetch, but for now skip department matching
        departmentName = '';
      }
    }

    if (employeePayGrade) {
      if (typeof employeePayGrade === 'object' && employeePayGrade !== null) {
        // Populated object
        payGradeGrade = ((employeePayGrade as any).grade || '')
          .toLowerCase()
          .trim();
      } else if (typeof employeePayGrade === 'string') {
        // ObjectId as string - would need to fetch, but for now skip pay grade matching
        payGradeGrade = '';
      }
    }

    // Normalize contract type and work type for matching
    const contractTypeStr = employeeContractType
      ? String(employeeContractType).toLowerCase().trim()
      : '';
    const workTypeStr = employeeWorkType
      ? String(employeeWorkType).toLowerCase().trim()
      : '';

    // Define matching keywords
    // Universal allowances - apply to all employees regardless of position/department
    const universalAllowanceKeywords = [
      'housing',
      'transport',
      'transportation',
      'communication',
      'meal',
      'meals',
      'uniform',
      'medical',
      'health',
      'insurance',
      'benefit',
      'general',
    ];

    // Position-specific keywords - match when both allowance name and position title contain the keyword
    const positionKeywords = [
      'manager',
      'director',
      'executive',
      'supervisor',
      'lead',
      'senior',
      'junior',
      'assistant',
      'officer',
      'specialist',
      'analyst',
      'coordinator',
      'administrator',
      'chief',
      'head',
      'vice',
      'president',
      'ceo',
      'cto',
      'cfo',
    ];

    // Department-specific keywords - match when both allowance name and department name contain the keyword
    const departmentKeywords = [
      'sales',
      'marketing',
      'hr',
      'human resources',
      'finance',
      'accounting',
      'it',
      'information technology',
      'operations',
      'production',
      'engineering',
      'research',
      'development',
      'r&d',
      'legal',
      'compliance',
      'quality',
      'qa',
    ];

    // Contract type keywords
    const contractTypeKeywords = [
      'contract',
      'permanent',
      'temporary',
      'part-time',
      'full-time',
      'freelance',
    ];

    // Work type keywords
    const workTypeKeywords = [
      'remote',
      'hybrid',
      'onsite',
      'office',
      'field',
      'travel',
    ];

    const applicableAllowances: any[] = [];

    for (const allowance of allAllowances) {
      // Validate allowance
      if (!allowance || !allowance.name) {
        continue; // Skip invalid allowances
      }

      const allowanceName = String(allowance.name).toLowerCase().trim();
      if (!allowanceName) {
        continue; // Skip empty allowance names
      }

      let isApplicable = false;

      // Step 1: Check if it's a universal allowance (applies to all employees)
      const isUniversal = universalAllowanceKeywords.some((keyword) =>
        allowanceName.includes(keyword),
      );

      if (isUniversal) {
        // Universal allowances apply to all employees
        isApplicable = true;
      } else {
        // Step 2: Check position-specific matching
        if (positionTitle) {
          const positionMatch = positionKeywords.some((keyword) => {
            const allowanceHasKeyword = allowanceName.includes(keyword);
            const positionHasKeyword = positionTitle.includes(keyword);
            // Both must contain the keyword for a match
            return allowanceHasKeyword && positionHasKeyword;
          });

          if (positionMatch) {
            isApplicable = true;
          }
        }

        // Step 3: Check department-specific matching (only if not already matched)
        if (!isApplicable && departmentName) {
          const departmentMatch = departmentKeywords.some((keyword) => {
            const allowanceHasKeyword = allowanceName.includes(keyword);
            const departmentHasKeyword = departmentName.includes(keyword);
            // Both must contain the keyword for a match
            return allowanceHasKeyword && departmentHasKeyword;
          });

          if (departmentMatch) {
            isApplicable = true;
          }
        }

        // Step 4: Check pay grade-specific matching (only if not already matched)
        if (!isApplicable && payGradeGrade) {
          // Match if allowance name contains "grade" and the pay grade identifier
          // Example: "Grade A Allowance" matches employee with Grade A
          if (allowanceName.includes('grade')) {
            // Check if pay grade is mentioned in allowance name
            // This handles cases like "Grade A", "Grade 1", etc.
            const payGradeParts = payGradeGrade
              .split(' ')
              .filter((p) => p.length > 0);
            const gradeMatch =
              payGradeParts.some((part) => allowanceName.includes(part)) ||
              allowanceName.includes(payGradeGrade);

            if (gradeMatch) {
              isApplicable = true;
            }
          }
        }

        // Step 5: Check contract type matching (only if not already matched)
        if (!isApplicable && contractTypeStr) {
          const contractMatch = contractTypeKeywords.some((keyword) => {
            const allowanceHasKeyword = allowanceName.includes(keyword);
            const contractHasKeyword = contractTypeStr.includes(keyword);
            return allowanceHasKeyword && contractHasKeyword;
          });

          if (contractMatch) {
            isApplicable = true;
          }
        }

        // Step 6: Check work type matching (only if not already matched)
        if (!isApplicable && workTypeStr) {
          const workTypeMatch = workTypeKeywords.some((keyword) => {
            const allowanceHasKeyword = allowanceName.includes(keyword);
            const workTypeHasKeyword = workTypeStr.includes(keyword);
            return allowanceHasKeyword && workTypeHasKeyword;
          });

          if (workTypeMatch) {
            isApplicable = true;
          }
        }

        // Step 7: Fallback logic - if no specific match found
        if (!isApplicable) {
          // Check if allowance has position/department-specific keywords
          const hasPositionKeyword = positionKeywords.some((kw) =>
            allowanceName.includes(kw),
          );
          const hasDepartmentKeyword = departmentKeywords.some((kw) =>
            allowanceName.includes(kw),
          );
          const hasContractKeyword = contractTypeKeywords.some((kw) =>
            allowanceName.includes(kw),
          );
          const hasWorkTypeKeyword = workTypeKeywords.some((kw) =>
            allowanceName.includes(kw),
          );
          const hasPayGradeKeyword = allowanceName.includes('grade');

          // If allowance has specific keywords but didn't match, exclude it
          // This prevents applying position-specific allowances to wrong employees
          if (
            hasPositionKeyword ||
            hasDepartmentKeyword ||
            hasContractKeyword ||
            hasWorkTypeKeyword ||
            hasPayGradeKeyword
          ) {
            // Allowance is specific but doesn't match - exclude it
            isApplicable = false;
          } else {
            // No specific keywords found - treat as universal allowance (applies to all)
            // This handles generic allowances that don't have position/department keywords
            isApplicable = true;
          }
        }
      }

      if (isApplicable) {
        applicableAllowances.push(allowance);
      }
    }

    // Safety check: If filtering resulted in empty set, return all allowances
    // This ensures backward compatibility and prevents breaking existing payrolls
    // However, this should rarely happen if universal allowances are properly configured
    return applicableAllowances.length > 0
      ? applicableAllowances
      : allAllowances;
  }

  // Helper: Calculate refunds if available using PayrollTrackingService
  // REQ-PY-18: Employees can list all refunds generated for them
  // REQ-PY-45 & REQ-PY-46: Finance monitors refunds pending payroll execution
  private async calculateRefunds(
    employeeId: string,
    payrollRunId: string,
  ): Promise<number> {
    try {
      // Get all refunds for the employee using PayrollTrackingService
      const refunds = await (
        this.payrollTrackingService as any
      ).getRefundsByEmployeeId(employeeId);

      if (!refunds || refunds.length === 0) {
        return 0;
      }

      // Filter for pending refunds that haven't been paid in a payroll run yet
      // and sum their amounts
      // Only include refunds with status PENDING that haven't been paid in any payroll run
      let totalRefunds = 0;
      for (const refund of refunds) {
        const refundData = refund as any;

        // Check if refund is pending and not yet paid in a payroll run
        // Use RefundStatus enum for proper type checking
        const isPending =
          refundData.status === RefundStatus.PENDING ||
          refundData.status === 'pending';
        const notPaid = !refundData.paidInPayrollRunId;

        if (isPending && notPaid) {
          // Sum the refund amount from refundDetails
          if (refundData.refundDetails && refundData.refundDetails.amount) {
            const amount = Number(refundData.refundDetails.amount);
            if (!isNaN(amount) && amount > 0) {
              totalRefunds += amount;
            }
          }
        }
      }

      // Round to 2 decimal places for currency precision
      return Math.round(totalRefunds * 100) / 100;
    } catch (error) {
      // If service is not available or error occurs, return 0
      // This ensures payroll calculation continues even if refunds service is unavailable
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Error fetching refunds for employee ${employeeId}: ${errorMessage}`,
      );
      return 0;
    }
  }

  // REQ-PY-2: Calculate prorated salaries for mid-month hires, terminations
  // BR 2: Salary calculation according to contract terms for partial periods
  // BR 36: Payroll processing for partial periods (mid-month hires/terminations)
  async calculateProratedSalary(
    employeeId: string,
    baseSalary: number,
    startDate: Date,
    endDate: Date,
    payrollPeriodEnd: Date,
    currentUserId: string,
  ): Promise<number> {
    // Validate inputs
    if (baseSalary <= 0) {
      return 0;
    }

    if (startDate > endDate) {
      throw new Error(
        `Invalid date range: startDate (${startDate}) cannot be after endDate (${endDate})`,
      );
    }

    // Calculate days in the payroll period month
    const daysInMonth = new Date(
      payrollPeriodEnd.getFullYear(),
      payrollPeriodEnd.getMonth() + 1,
      0,
    ).getDate();

    // Calculate days worked (inclusive of both start and end dates)
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysWorked = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    // Ensure days worked doesn't exceed days in month
    const actualDaysWorked = Math.min(daysWorked, daysInMonth);

    // Calculate prorated salary: (Base Salary / Days in Month) * Days Worked
    const proratedSalary = (baseSalary / daysInMonth) * actualDaysWorked;

    // Round to 2 decimal places for currency precision
    return Math.round(proratedSalary * 100) / 100;
  }

  // REQ-PY-3: Auto-apply statutory rules (income tax, pension, insurance, labor law deductions)
  // Note: Parameter is baseSalary per BR 35 (Taxes = % of Base Salary)
  async applyStatutoryRules(
    baseSalary: number,
    employeeId: string,
    currentUserId: string,
  ): Promise<number> {
    const breakdown = await this.applyStatutoryRulesWithBreakdown(
      baseSalary,
      employeeId,
    );
    return breakdown.total;
  }

  // Helper: Apply statutory rules with breakdown (BR 31: Store all calculation elements for auditability)
  // BR 35: Taxes = % of Base Salary
  // Social Insurance and Pensions Law: Employee Insurance = GrossSalary * employee_percentage, Employer Insurance = GrossSalary * employer_percentage
  async applyStatutoryRulesWithBreakdown(
    baseSalary: number,
    employeeId: string,
    grossSalary?: number, // Optional: if provided, use for insurance calculations; otherwise use baseSalary
  ): Promise<{
    total: number;
    taxes: number;
    insurance: number;
  }> {
    // Input validation
    if (!baseSalary || baseSalary < 0) {
      throw new Error('Base salary must be a positive number');
    }
    
    // Use grossSalary for insurance calculations if provided, otherwise fall back to baseSalary
    const salaryForInsurance = grossSalary && grossSalary > 0 ? grossSalary : baseSalary;

    let totalTaxes = 0;
    let totalInsurance = 0;

    // Get tax rules using PayrollConfigurationService
    // BR 5: Payroll income taxes' brackets identified and enforced through Local Tax Law
    // BR 35: Taxes = % of Base Salary
    // Egyptian Tax Law 2025: Tax brackets (tax rules) must be identified and enforced
    const taxRulesResult = await this.payrollConfigurationService.findAllTaxRules({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved tax rules
    });
    
    const approvedTaxRules = taxRulesResult?.data || [];
    
    // BR 5: Identify tax brackets enforced through Egyptian Tax Law 2025
    if (approvedTaxRules.length === 0) {
      console.warn(
        `[Tax Brackets Identification] No approved tax rules (tax brackets) found for employee ${employeeId}. ` +
        `Egyptian Tax Law 2025 requires payroll income tax brackets to be identified and enforced. ` +
        `Please ensure tax brackets are configured and approved in the payroll configuration.`
      );
    } else {
      // Identify and log tax brackets being applied
      const identifiedTaxBrackets = approvedTaxRules.map((rule: any) => {
        const ruleData = rule.toObject ? rule.toObject() : rule;
        return {
          name: ruleData.name || 'Unnamed Tax Bracket',
          rate: ruleData.rate || 0,
          description: ruleData.description || 'No description',
          enforcedThrough: 'Egyptian Tax Law 2025',
        };
      });
      
      console.log(
        `[Tax Brackets Identification] Employee ${employeeId}, Base Salary: ${baseSalary}. ` +
        `Identified ${identifiedTaxBrackets.length} tax bracket(s) enforced through Egyptian Tax Law 2025: ` +
        `${identifiedTaxBrackets.map(tb => `${tb.name} (${tb.rate}%)`).join(', ')}`
      );
    }
    
    for (const rule of approvedTaxRules) {
      const ruleData = rule as any;
      // Tax rules use 'rate' field (percentage), and apply to all base salaries
      // BR 35: Taxes calculated as percentage of base salary
      // Each tax rule represents a tax bracket enforced through Egyptian Tax Law 2025
      if (ruleData.rate && ruleData.rate > 0) {
        const taxAmount = (baseSalary * ruleData.rate) / 100;
        totalTaxes += taxAmount;
      }
    }

    // Get pension/insurance rules using PayrollConfigurationService
    // BR 7: Social insurances' brackets identified and enforced through Social Insurance and Pensions Law
    // BR 35: Social/Health Insurance = % of Base Salary (within salary brackets)
    const insuranceRulesResult = await this.payrollConfigurationService.findAllInsuranceBrackets({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved insurance brackets
    });
    
    const approvedInsuranceBrackets = insuranceRulesResult?.data || [];
    
    // BR 7: Identify social insurance brackets enforced through Social Insurance and Pensions Law
    // Note: Bracket matching uses baseSalary to determine which bracket applies, but calculation uses grossSalary
    const applicableInsuranceBrackets = approvedInsuranceBrackets.filter((rule: any) => {
      const ruleData = rule.toObject ? rule.toObject() : rule;
      // Insurance brackets use 'minSalary' and 'maxSalary' fields to determine applicability
      // The bracket is determined by baseSalary, but calculation uses grossSalary per Social Insurance and Pensions Law
      return (
        baseSalary >= ruleData.minSalary &&
        (ruleData.maxSalary === null ||
          ruleData.maxSalary === undefined ||
          baseSalary <= ruleData.maxSalary)
      );
    });
    
    if (applicableInsuranceBrackets.length === 0 && approvedInsuranceBrackets.length > 0) {
      console.warn(
        `[Social Insurance Brackets Identification] No applicable insurance brackets found for employee ${employeeId} with base salary ${baseSalary}. ` +
        `Social Insurance and Pensions Law requires social insurance brackets to be identified and enforced. ` +
        `Available brackets: ${approvedInsuranceBrackets.map((b: any) => {
          const bData = b.toObject ? b.toObject() : b;
          return `${bData.name} (${bData.minSalary}-${bData.maxSalary || '∞'})`;
        }).join(', ')}`
      );
    } else if (applicableInsuranceBrackets.length > 0) {
      // Identify and log social insurance brackets being applied
      const identifiedInsuranceBrackets = applicableInsuranceBrackets.map((rule: any) => {
        const ruleData = rule.toObject ? rule.toObject() : rule;
        return {
          name: ruleData.name || 'Unnamed Insurance Bracket',
          minSalary: ruleData.minSalary || 0,
          maxSalary: ruleData.maxSalary || null,
          employeeRate: ruleData.employeeRate || 0,
          employerRate: ruleData.employerRate || 0,
          description: `Social insurance bracket enforced through Social Insurance and Pensions Law`,
          enforcedThrough: 'Social Insurance and Pensions Law',
        };
      });
      
      console.log(
        `[Social Insurance Brackets Identification] Employee ${employeeId}, Base Salary: ${baseSalary}, Gross Salary: ${salaryForInsurance}. ` +
        `Identified ${identifiedInsuranceBrackets.length} social insurance bracket(s) enforced through Social Insurance and Pensions Law: ` +
        `${identifiedInsuranceBrackets.map(ib => `${ib.name} (${ib.minSalary}-${ib.maxSalary || '∞'}, Employee: ${ib.employeeRate}%, Employer: ${ib.employerRate}%)`).join(', ')}`
      );
    } else if (approvedInsuranceBrackets.length === 0) {
      console.warn(
        `[Social Insurance Brackets Identification] No approved insurance brackets found for employee ${employeeId}. ` +
        `Social Insurance and Pensions Law requires social insurance brackets to be identified and enforced. ` +
        `Please ensure insurance brackets are configured and approved in the payroll configuration.`
      );
    }
    
    for (const rule of applicableInsuranceBrackets) {
      const ruleData = rule as any;
      // Insurance brackets use 'minSalary' and 'maxSalary' fields, and 'employeeRate' (percentage)
      // Social Insurance and Pensions Law: Employee Insurance = GrossSalary * employee_percentage
      // Each insurance bracket represents a social insurance bracket enforced through Social Insurance and Pensions Law
      // Use employeeRate for employee deductions (employerRate is for employer contributions, tracked separately)
      if (ruleData.employeeRate && ruleData.employeeRate > 0) {
        // Calculate employee insurance contribution from gross salary
        const insuranceAmount = (salaryForInsurance * ruleData.employeeRate) / 100;
        totalInsurance += insuranceAmount;
      }
      // Note: Employer contributions (employerRate) are tracked but not deducted from employee pay
      // Employer Insurance = GrossSalary * employer_percentage (for reporting/accounting purposes)
    }

    const total = totalTaxes + totalInsurance;

    return {
      total: Math.round(total * 100) / 100,
      taxes: Math.round(totalTaxes * 100) / 100,
      insurance: Math.round(totalInsurance * 100) / 100,
    };
  }

  // ====================================================================================
  // PHASE 1.1: PAYROLL DRAFT GENERATION
  // ====================================================================================
  // REQ-PY-4: Generate draft payroll runs automatically at the end of each cycle
  // Phase 1.1.A: Auto process signing bonus in case of new hire
  // Phase 1.1.A: Auto process resignation and termination benefits
  // This method creates a complete draft payroll run with all employee calculations
  // BR 1: Employment contract requirements
  // BR 2: Contract terms validation
  // BR 20: Multi-currency support (currency stored in entity field)
  async generateDraftPayrollRun(payrollPeriod: Date, entity: string, payrollSpecialistId: string, currency: string | undefined, currentUserId: string, payrollManagerId?: string): Promise<payrollRuns> {
    // Validate inputs
    if (!payrollPeriod || !entity || !payrollSpecialistId) {
      throw new Error(
        'Payroll period, entity, and payroll specialist ID are required',
      );
    }

    // Validate payroll period is a valid date
    if (!(payrollPeriod instanceof Date) || isNaN(payrollPeriod.getTime())) {
      throw new Error('Invalid payroll period. Must be a valid date.');
    }

    // BR 3: Validate payroll cycle compliance (monthly cycles per contract/region following local laws)
    await this.validatePayrollCycleCompliance(payrollPeriod, entity);

    // BR 1, BR 2: Validate payroll period against employee contract dates
    await this.validatePayrollPeriodAgainstContracts(payrollPeriod);

    // Check for duplicate payroll runs for the same period (overlapping check)
    // Note: Duplicate check is also performed in validatePayrollCycleCompliance per entity/region
    const year = payrollPeriod.getFullYear();
    const month = payrollPeriod.getMonth();
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const existingRun = await this.payrollRunModel.findOne({
      payrollPeriod: {
        $gte: periodStart,
        $lte: periodEnd,
      },
      status: { $ne: PayRollStatus.REJECTED }, // Allow rejected runs to be recreated
    });

    if (existingRun) {
      throw new Error(
        `Payroll run already exists for period ${year}-${String(month + 1).padStart(2, '0')}. Existing runId: ${existingRun.runId}`,
      );
    }

    // Pre-initiation validation: Check if there are pending signing bonuses or termination benefits that need review
    // Requirement 0: Reviews/approvals before start of payroll initiation
    const validationResult = await this.validatePreInitiationRequirements();
    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
    }

    // Get active employees using EmployeeProfileService
    const employeesResult = await this.employeeProfileService.findAll({
      status: EmployeeStatus.ACTIVE,
      page: 1,
      limit: 10000, // Get all active employees
    } as any);
    const activeEmployees = Array.isArray(employeesResult)
      ? employeesResult
      : (employeesResult as any).data || [];

    if (activeEmployees.length === 0) {
      throw new Error(
        'No active employees found. Cannot generate draft payroll run.',
      );
    }

    // Generate runId (e.g., PR-2025-0001)
    // Count ALL payroll runs for the year to ensure unique runId across all months
    const count = await this.payrollRunModel.countDocuments({
      payrollPeriod: {
        $gte: new Date(year, 0, 1), // Start of year
        $lt: new Date(year + 1, 0, 1), // Start of next year
      },
    });
    const runId = `PR-${year}-${String(count + 1).padStart(4, '0')}`;

    // BR 20: Store currency in entity field format: "Entity Name|CURRENCY_CODE"
    const { entityName } = this.extractEntityAndCurrency(entity);
    const entityWithCurrency = currency
      ? this.formatEntityWithCurrency(entityName, currency)
      : entity; // If entity already contains currency or no currency provided, use as-is

    // Get payroll manager ID - use provided one or find a default
    let finalPayrollManagerId: mongoose.Types.ObjectId;
    if (payrollManagerId) {
      try {
        finalPayrollManagerId = new mongoose.Types.ObjectId(payrollManagerId) as any;
      } catch (error) {
        throw new Error(`Invalid payrollManagerId format: ${payrollManagerId}`);
      }
    } else {
      // Find a default payroll manager
      const defaultManager = await this.findDefaultPayrollManager();
      if (!defaultManager) {
        throw new Error('No payroll manager found. Please provide payrollManagerId or ensure a payroll manager exists in the system.');
      }
      try {
        finalPayrollManagerId = new mongoose.Types.ObjectId(defaultManager) as any;
      } catch (error) {
        throw new Error(`Invalid default payroll manager ID format: ${defaultManager}`);
      }
    }

    // Ensure finalPayrollManagerId is set
    if (!finalPayrollManagerId) {
      throw new Error('Payroll manager ID is required but was not set.');
    }

    // Validate that payrollManagerId is different from payrollSpecialistId
    if (finalPayrollManagerId.toString() === payrollSpecialistId) {
      throw new Error('Payroll manager must be different from payroll specialist.');
    }

    // Create payroll run first (initial state - will be populated by generateDraftDetailsForPayrollRun)
    const payrollRun = new this.payrollRunModel({
      runId,
      payrollPeriod,
      entity: entityWithCurrency, // Store entity with currency
      employees: activeEmployees.length, // Initial count, will be updated during draft generation
      exceptions: 0, // Will be updated during draft generation
      totalnetpay: 0, // Will be updated during draft generation
      payrollSpecialistId: new mongoose.Types.ObjectId(payrollSpecialistId) as any,
      payrollManagerId: finalPayrollManagerId,
      status: PayRollStatus.DRAFT,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
    const savedPayrollRun = await payrollRun.save();

    // Generate draft details for the newly created payroll run
    // This method:
    // 1. Processes signing bonuses for new hires (1.1.A)
    // 2. Processes termination/resignation benefits (1.1.A)
    // 3. Calculates payroll for each employee using calculatePayroll()
    // 4. Applies prorated salary calculations for mid-month hires/terminations (REQ-PY-2)
    // 5. Saves employeePayrollDetails records for each employee
    // 6. Integrates approved bonuses and benefits into netPay
    // 7. Updates payroll run totals and exception counts
    try {
      await this.generateDraftDetailsForPayrollRun(
        savedPayrollRun._id.toString(),
        currentUserId,
      );
    } catch (error) {
      // If draft generation fails, delete the payroll run to maintain data consistency
      await this.payrollRunModel.findByIdAndDelete(savedPayrollRun._id);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate draft payroll details: ${errorMessage}`,
      );
    }

    // Reload the payroll run to get updated totals and exceptions
    const updatedPayrollRun = await this.payrollRunModel.findById(
      savedPayrollRun._id,
    );
    if (!updatedPayrollRun) {
      throw new Error('Payroll run not found after draft generation');
    }

    return updatedPayrollRun;
  }

  // Private helper method: Generate draft details for an existing payroll run
  // This method processes all employees and calculates their payroll for a given payroll run
  // REQ-PY-23: Automatic draft generation after payroll initiation approval
  private async generateDraftDetailsForPayrollRun(payrollRunId: string, currentUserId: string): Promise<void> {
    console.log(`[Draft Generation] Starting draft generation for payroll run: ${payrollRunId}`);
    
    // First, automatically process signing bonuses and termination benefits
    // This ensures all HR events are processed before payroll calculation
    console.log(`[Draft Generation] Processing signing bonuses...`);
    await this.processSigningBonuses(currentUserId);
    console.log(`[Draft Generation] Signing bonuses processed. Processing termination benefits...`);
    await this.processTerminationResignationBenefits(currentUserId);
    console.log(`[Draft Generation] Termination benefits processed.`);

    // Get the payroll run
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Check if payroll run is locked - cannot generate draft for locked payroll
    if (payrollRun.status === PayRollStatus.LOCKED) {
      throw new Error('Cannot generate draft for locked payroll run');
    }

    // Get active employees using EmployeeProfileService
    console.log(`[Draft Generation] Fetching active employees...`);
    const employeesResult = await this.employeeProfileService.findAll({ 
      status: EmployeeStatus.ACTIVE,
      page: 1,
      limit: 10000, // Get all active employees
    } as any);
    const activeEmployees = Array.isArray(employeesResult) ? employeesResult : (employeesResult as any).data || [];
    console.log(`[Draft Generation] Found ${activeEmployees.length} active employees.`);

    // Update employee count in payroll run
    payrollRun.employees = activeEmployees.length;
    await payrollRun.save();

    // Clear any existing payroll details for this run (in case of regeneration)
    console.log(`[Draft Generation] Clearing existing payroll details...`);
    await this.employeePayrollDetailsModel.deleteMany({
      payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
    });

    // Calculate total net pay for all employees
    let totalNetPay = 0;
    let exceptions = 0;

    console.log(`[Draft Generation] Starting payroll calculation for ${activeEmployees.length} employees...`);
    for (let i = 0; i < activeEmployees.length; i++) {
      const employee = activeEmployees[i];
      if ((i + 1) % 10 === 0) {
        console.log(`[Draft Generation] Processing employee ${i + 1}/${activeEmployees.length}...`);
      }
      try {
        // Calculate payroll for each employee - base salary will be fetched from PayGrade
        // Pass undefined to let calculatePayroll fetch from PayGrade
        const payrollDetails = await this.calculatePayroll(
          employee._id.toString(),
          payrollRunId,
          undefined,
          currentUserId,
        );

        // Check if base salary is 0 (no PayGrade configured)
        if (payrollDetails.baseSalary <= 0) {
          exceptions++;
          await this.flagPayrollException(
            payrollRunId,
            'MISSING_BASE_SALARY',
            `Employee ${employee._id} has no PayGrade/base salary configured`,
            currentUserId,
            employee._id.toString(),
          );
        }

        // Add approved signing bonuses to netPay
        const approvedSigningBonus =
          await this.employeeSigningBonusModel.findOne({
            employeeId: employee._id,
            status: BonusStatus.APPROVED,
          });
        if (approvedSigningBonus) {
          (payrollDetails as any).bonus = approvedSigningBonus.givenAmount;
          (payrollDetails as any).netPay += approvedSigningBonus.givenAmount;
          await (payrollDetails as any).save();
        }

        // Add approved termination/resignation benefits to netPay
        const approvedBenefits =
          await this.employeeTerminationResignationModel.find({
            employeeId: employee._id,
            status: BenefitStatus.APPROVED,
          });
        let totalBenefits = 0;
        for (const benefit of approvedBenefits) {
          totalBenefits += benefit.givenAmount;
        }
        if (totalBenefits > 0) {
          (payrollDetails as any).benefit = totalBenefits;
          (payrollDetails as any).netPay += totalBenefits;
          await (payrollDetails as any).save();
        }

        totalNetPay += payrollDetails.netPay;
      } catch (error) {
        exceptions++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Draft Generation] Error calculating payroll for employee ${employee._id}: ${errorMessage}`);
        await this.flagPayrollException(
          payrollRunId,
          'CALC_ERROR',
          `Error calculating payroll for employee ${employee._id}: ${errorMessage}`,
          currentUserId,
          employee._id.toString(),
        );
      }
    }
    
    console.log(`[Draft Generation] Completed payroll calculation. Total net pay: ${totalNetPay}, Exceptions: ${exceptions}`);

    // Update payroll run with totals
    payrollRun.exceptions = exceptions;
    payrollRun.totalnetpay = totalNetPay;
    await payrollRun.save();
  }

  // Helper: Get deductions breakdown from employeePayrollDetails (BR 31)
  // Parses the breakdown stored in exceptions field
  private getDeductionsBreakdown(payrollDetails: any): {
    taxes: number;
    insurance: number;
    timeManagementPenalties: number;
    unpaidLeavePenalties: number;
    total: number;
  } | null {
    if (!payrollDetails || !payrollDetails.exceptions) {
      return null;
    }

    try {
      const parsed = JSON.parse(payrollDetails.exceptions);
      if (parsed.deductionsBreakdown) {
        return parsed.deductionsBreakdown;
      }
    } catch (error) {
      // If exceptions field doesn't contain JSON, it might be a regular exception message
      // Return null to indicate breakdown not available
      return null;
    }

    return null;
  }

  // Helper: Get currency from employee payroll details exceptions field
  // BR 20: Multi-currency support
  private getEmployeePayrollCurrency(payrollDetails: any): string {
    if (!payrollDetails || !payrollDetails.exceptions) {
      return 'USD'; // Default currency
    }

    try {
      const parsed = JSON.parse(payrollDetails.exceptions);
      if (parsed.currency) {
        return parsed.currency;
      }
    } catch (error) {
      // If parsing fails, return default
    }

    return 'USD'; // Default currency
  }

  // REQ-PY-6: Review system-generated payroll results in a preview dashboard
  // BR 31: Include deductions breakdown for auditability
  // BR 20: Include currency information in preview
  async getPayrollPreview(
    payrollRunId: string,
    targetCurrency: string | undefined,
    currentUserId: string,
  ): Promise<any> {
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    const payrollDetails = await this.employeePayrollDetailsModel
      .find({
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      })
      .populate('employeeId')
      .exec();

    // Get currency from payroll run
    const sourceCurrency = this.getPayrollRunCurrency(payrollRun);
    const displayCurrency = targetCurrency || sourceCurrency;
    const needsConversion = sourceCurrency !== displayCurrency;

    // Enhance payroll details with deductions breakdown (BR 31) and currency conversion (BR 20)
    const enhancedDetails = payrollDetails.map((detail: any) => {
      const breakdown = this.getDeductionsBreakdown(detail);

      // Convert amounts if different currency requested
      let baseSalary = detail.baseSalary;
      let allowances = detail.allowances;
      let deductions = detail.deductions;
      let netSalary = detail.netSalary;
      let netPay = detail.netPay;

      if (needsConversion) {
        baseSalary = this.convertCurrency(
          baseSalary,
          sourceCurrency,
          displayCurrency,
        );
        allowances = this.convertCurrency(
          allowances,
          sourceCurrency,
          displayCurrency,
        );
        deductions = this.convertCurrency(
          deductions,
          sourceCurrency,
          displayCurrency,
        );
        netSalary = this.convertCurrency(
          netSalary,
          sourceCurrency,
          displayCurrency,
        );
        netPay = this.convertCurrency(netPay, sourceCurrency, displayCurrency);

        // Convert breakdown amounts if available
        if (breakdown) {
          breakdown.taxes = this.convertCurrency(
            breakdown.taxes,
            sourceCurrency,
            displayCurrency,
          );
          breakdown.insurance = this.convertCurrency(
            breakdown.insurance,
            sourceCurrency,
            displayCurrency,
          );
          breakdown.timeManagementPenalties = this.convertCurrency(
            breakdown.timeManagementPenalties,
            sourceCurrency,
            displayCurrency,
          );
          breakdown.unpaidLeavePenalties = this.convertCurrency(
            breakdown.unpaidLeavePenalties,
            sourceCurrency,
            displayCurrency,
          );
          breakdown.total = this.convertCurrency(
            breakdown.total,
            sourceCurrency,
            displayCurrency,
          );
        }
      }

      return {
        employeeId: detail.employeeId,
        baseSalary,
        allowances,
        deductions,
        deductionsBreakdown: breakdown, // Add breakdown for auditability (BR 31)
        netSalary,
        netPay,
        bankStatus: detail.bankStatus,
        exceptions: detail.exceptions,
        currency: displayCurrency, // Include currency in response
      };
    });

    // Extract entity name and currency
    const { entityName, currency } = this.extractEntityAndCurrency(
      payrollRun.entity,
    );

    return {
      payrollRun: {
        runId: payrollRun.runId,
        payrollPeriod: payrollRun.payrollPeriod,
        status: payrollRun.status,
        employees: payrollRun.employees,
        exceptions: payrollRun.exceptions,
        totalnetpay: needsConversion
          ? this.convertCurrency(
              payrollRun.totalnetpay,
              sourceCurrency,
              displayCurrency,
            )
          : payrollRun.totalnetpay,
        entity: entityName,
        currency: displayCurrency,
        sourceCurrency: sourceCurrency, // Original currency
        converted: needsConversion, // Whether amounts were converted
      },
      employeeDetails: enhancedDetails,
    };
  }

  // ====================================================================================
  // PHASE 5: EXECUTION - PAYSLIP GENERATION & DISTRIBUTION
  // ====================================================================================
  // REQ-PY-8: Automatically generate and distribute employee payslips
  // Should only generate after REQ-PY-15 (Finance approval) & REQ-PY-7 (Lock)
  // BR 17: Auto-generated payslips with clear breakdown
  async generateAndDistributePayslips(
    payrollRunId: string,
    distributionMethod: 'PDF' | 'EMAIL' | 'PORTAL',
    currentUserId: string,
  ): Promise<any> {
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // REQ-PY-8: Must be approved by Finance (REQ-PY-15) AND locked (REQ-PY-7)
    if (
      payrollRun.status !== PayRollStatus.LOCKED ||
      payrollRun.paymentStatus !== PayRollPaymentStatus.PAID
    ) {
      throw new Error(
        'Payroll run must be approved by Finance and locked before generating payslips',
      );
    }

    const payrollDetails = await this.employeePayrollDetailsModel
      .find({
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      })
      .populate('employeeId')
      .exec();

    console.log(`[Generate Payslips] Found ${payrollDetails.length} employee payroll details for payroll run ${payrollRunId}`);

    if (payrollDetails.length === 0) {
      // Check payroll run status to provide more helpful error message
      const payrollRunStatus = payrollRun.status;
      const payrollRunPeriod = payrollRun.payrollPeriod;
      
      let errorMessage = `No employee payroll details found for payroll run ${payrollRunId}.\n\n`;
      errorMessage += `Payroll Run Status: ${payrollRunStatus}\n`;
      errorMessage += `Payroll Period: ${new Date(payrollRunPeriod).toISOString().split('T')[0]}\n\n`;
      errorMessage += `To generate payslips, you must first generate the payroll draft.\n\n`;
      errorMessage += `Option 1: Review and approve payroll initiation (auto-generates draft):\n`;
      errorMessage += `  POST /api/v1/payroll/review-initiation/${payrollRunId}\n`;
      errorMessage += `  Body: { "approved": true, "reviewerId": "...", "rejectionReason": null }\n\n`;
      errorMessage += `Option 2: Generate draft directly:\n`;
      errorMessage += `  POST /api/v1/payroll/generate-draft\n`;
      errorMessage += `  Body: { "payrollPeriod": "${new Date(payrollRunPeriod).toISOString()}", "entity": "${payrollRun.entity}", ... }\n\n`;
      errorMessage += `After generating the draft, complete the approval workflow:\n`;
      errorMessage += `  1. Send for approval → 2. Manager approval → 3. Finance approval → 4. Lock → 5. Generate payslips`;
      
      throw new Error(errorMessage);
    }

    const generatedPayslips: any[] = [];

    // Get all approved allowances, tax rules, and insurance brackets once (shared across employees)
    const allowancesResult = await this.payrollConfigurationService.findAllAllowances({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved allowances
    });
    const allAllowances = allowancesResult?.data || [];

    const taxRulesResult = await this.payrollConfigurationService.findAllTaxRules({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved tax rules
    });
    const allTaxRules = taxRulesResult?.data || [];

    const insuranceBracketsResult = await this.payrollConfigurationService.findAllInsuranceBrackets({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved insurance brackets
    });
    const allInsuranceBrackets = insuranceBracketsResult?.data || [];

    for (const detail of payrollDetails) {
      // Handle employeeId whether it's populated (object with _id) or just ObjectId
      const employeeIdString = 
        (detail.employeeId as any)?._id?.toString() ||
        (detail.employeeId as any)?.toString() ||
        detail.employeeId?.toString();
      
      if (!employeeIdString || !mongoose.Types.ObjectId.isValid(employeeIdString)) {
        const errorMsg = `Invalid employeeId in payroll detail: ${JSON.stringify(detail.employeeId)}`;
        console.error(`[Generate Payslips] ${errorMsg}`);
        await this.flagPayrollException(
          payrollRunId,
          'INVALID_EMPLOYEE_ID',
          errorMsg,
          currentUserId,
          'unknown',
        );
        continue;
      }
      
      const employeeId = employeeIdString;
      const baseSalary = detail.baseSalary;

      // Get deductions breakdown from stored data (BR 31)
      const deductionsBreakdown = this.getDeductionsBreakdown(detail);

      // Get employee for allowance filtering
      let employee;
      try {
        employee = await this.employeeProfileService.findOne(employeeId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Generate Payslips] Error fetching employee ${employeeId}: ${errorMessage}`);
        await this.flagPayrollException(
          payrollRunId,
          'EMPLOYEE_NOT_FOUND',
          `Employee ${employeeId} not found or invalid: ${errorMessage}`,
          currentUserId,
          employeeId,
        );
        continue;
      }

      // Get applicable allowances for this employee (BR 20, BR 38, BR 39)
      const employeeAllowances = await this.getApplicableAllowancesForEmployee(
        employee,
        allAllowances,
      );
      // Additional validation: Ensure only APPROVED allowances are included
      const applicableAllowances = employeeAllowances
        .filter((allowance: any) => {
          const allowanceData = allowance.toObject
            ? allowance.toObject()
            : allowance;
          return allowanceData.status === ConfigStatus.APPROVED;
        })
        .map((allowance: any) => ({
          ...(allowance.toObject ? allowance.toObject() : allowance),
          _id: allowance._id,
        }));

      // Get approved signing bonuses for this employee
      const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
      const approvedSigningBonuses = await this.employeeSigningBonusModel
        .find({
          employeeId: employeeObjectId,
          status: BonusStatus.APPROVED,
        })
        .populate('signingBonusId')
        .exec();

      const signingBonusConfigs: any[] = [];
      for (const bonus of approvedSigningBonuses) {
        if ((bonus as any).signingBonusId) {
          try {
            // Use PayrollConfigurationService instead of direct model query
            const signingBonusId = (bonus as any).signingBonusId;
            const configId = signingBonusId?._id 
              ? signingBonusId._id.toString() 
              : signingBonusId?.toString() || signingBonusId;
            
            if (configId) {
              const config = await this.payrollConfigurationService.findOneSigningBonus(configId);
              const configData = config as any;
              // Only include APPROVED signing bonus configurations
              if (configData.status === ConfigStatus.APPROVED) {
                signingBonusConfigs.push(configData);
              } else {
                console.warn(
                  `Signing bonus config ${configId} is not APPROVED (status: ${configData.status}). Skipping.`,
                );
              }
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const signingBonusId = (bonus as any).signingBonusId;
            const configId = signingBonusId?._id 
              ? signingBonusId._id.toString() 
              : signingBonusId?.toString() || signingBonusId;
            console.warn(
              `Error fetching signing bonus config ${configId}: ${errorMessage}`,
            );
            // Continue with other bonuses even if one fails
          }
        }
      }

      // Get approved termination/resignation benefits for this employee
      const approvedBenefits = await this.employeeTerminationResignationModel
        .find({
          employeeId: employeeObjectId,
          status: BenefitStatus.APPROVED,
        })
        .populate('benefitId')
        .exec();

      const terminationBenefitConfigs: any[] = [];
      for (const benefit of approvedBenefits) {
        if ((benefit as any).benefitId) {
          try {
            // Convert ObjectId to string if needed
            const benefitId = (benefit as any).benefitId;
            const configId = benefitId?._id 
              ? benefitId._id.toString() 
              : benefitId?.toString() || benefitId;
            
            if (configId) {
              const config = await this.payrollConfigurationService.findOneTerminationBenefit(configId);
              // Only include APPROVED termination benefit configurations
              if (config.status === ConfigStatus.APPROVED) {
                terminationBenefitConfigs.push(config);
              } else {
                console.warn(
                  `Termination benefit config ${configId} is not APPROVED (status: ${config.status}). Skipping.`,
                );
              }
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.warn(
              `Error fetching termination benefit config ${(benefit as any).benefitId}: ${errorMessage}`,
            );
            // Continue with other benefits even if one fails
          }
        }
      }

      // Get refunds for this employee (pending refunds that were included in this payroll)
      const allRefunds = await (
        this.payrollTrackingService as any
      ).getRefundsByEmployeeId(employeeId);
      const refundDetailsList: any[] = [];
      const refundsToProcess: any[] = []; // Track refunds that need to be marked as PAID
      for (const refund of allRefunds) {
        const refundData = refund as any;
        // Include refunds that were paid in this payroll run or are pending
        // Use RefundStatus enum for proper type checking
        const isPending =
          refundData.status === RefundStatus.PENDING ||
          refundData.status === 'pending';
        const isPaidInThisRun =
          refundData.paidInPayrollRunId &&
          refundData.paidInPayrollRunId.toString() === payrollRunId;

        if (isPaidInThisRun || (isPending && !refundData.paidInPayrollRunId)) {
          if (refundData.refundDetails) {
            refundDetailsList.push(refundData.refundDetails as any);
            // Track pending refunds that need to be processed after payslip generation
            if (isPending && !refundData.paidInPayrollRunId) {
              refundsToProcess.push(refundData);
            }
          }
        }
      }

      // Calculate total gross salary (needed for insurance calculations)
      const totalAllowancesAmount = applicableAllowances.reduce(
        (sum: number, allowance: any) => sum + (allowance.amount || 0),
        0,
      );
      const totalBonusesAmount = approvedSigningBonuses.reduce(
        (sum: number, bonus: any) => sum + (bonus.givenAmount || 0),
        0,
      );
      const totalBenefitsAmount = approvedBenefits.reduce(
        (sum: number, benefit: any) => sum + (benefit.givenAmount || 0),
        0,
      );
      const totalRefundsAmount = refundDetailsList.reduce(
        (sum: number, refund: any) => sum + (refund.amount || 0),
        0,
      );
      const totalGrossSalary =
        baseSalary +
        totalAllowancesAmount +
        totalBonusesAmount +
        totalBenefitsAmount +
        totalRefundsAmount;

      // Get applicable tax rules
      // BR 5: Payroll income taxes' brackets identified and enforced through Local Tax Law
      // Egyptian Tax Law 2025: Tax brackets (tax rules) must be identified and enforced
      // Note: Tax rules schema doesn't have minAmount/maxAmount fields - all approved tax rules apply
      // Each tax rule represents a tax bracket enforced through Egyptian Tax Law 2025
      // Filter to ensure only APPROVED rules are used (additional safety check)
      const applicableTaxRules = allTaxRules
        .filter((rule: any) => {
          const ruleData = rule.toObject ? rule.toObject() : rule;
          // Ensure rule is APPROVED (additional validation)
          return ruleData.status === ConfigStatus.APPROVED;
        })
        .map((rule: any) => {
          const ruleData = rule.toObject ? rule.toObject() : rule;
          // BR 5: Identify tax bracket with enforcement source
          return {
            ...ruleData,
            _id: rule._id,
            // Identify that this tax bracket is enforced through Egyptian Tax Law 2025
            enforcedThrough: 'Egyptian Tax Law 2025',
            taxBracketName: ruleData.name || 'Unnamed Tax Bracket',
            taxBracketRate: ruleData.rate || 0,
          };
        });
      
      // BR 5: Log identification of tax brackets for audit purposes
      if (applicableTaxRules.length > 0 && baseSalary > 0) {
        const taxBracketsInfo = applicableTaxRules.map((rule: any) => ({
          name: rule.taxBracketName,
          rate: rule.taxBracketRate,
          description: rule.description || 'No description',
          enforcedThrough: rule.enforcedThrough,
          appliedToSalary: baseSalary,
          calculatedTax: (baseSalary * rule.taxBracketRate) / 100,
        }));
        
        console.log(
          `[Tax Brackets Identification] Employee ${employeeId} (${employee?.employeeNumber || 'N/A'}), Base Salary: ${baseSalary}. ` +
          `Identified ${taxBracketsInfo.length} tax bracket(s) enforced through Egyptian Tax Law 2025: ` +
          `${taxBracketsInfo.map(tb => `${tb.name} (${tb.rate}%)`).join(', ')}`
        );
      } else if (applicableTaxRules.length === 0) {
        console.warn(
          `[Tax Brackets Identification] No approved tax brackets found for employee ${employeeId} (${employee?.employeeNumber || 'N/A'}). ` +
          `Egyptian Tax Law 2025 requires payroll income tax brackets to be identified and enforced.`
        );
      }

      // Get applicable insurance brackets (based on baseSalary)
      // BR 7: Social insurances' brackets identified and enforced through Social Insurance and Pensions Law
      // Filter by salary range and ensure only APPROVED brackets are used
      // Each insurance bracket represents a social insurance bracket enforced through Social Insurance and Pensions Law
      const applicableInsuranceBrackets = allInsuranceBrackets
        .filter((rule: any) => {
          const ruleData = rule.toObject ? rule.toObject() : rule;
          // Ensure bracket is APPROVED (additional validation)
          if (ruleData.status !== ConfigStatus.APPROVED) {
            return false;
          }
          // Check if baseSalary falls within bracket range
          return (
            baseSalary >= ruleData.minSalary &&
            (ruleData.maxSalary === null ||
              ruleData.maxSalary === undefined ||
              baseSalary <= ruleData.maxSalary)
          );
        })
        .map((rule: any) => {
          const ruleData = rule.toObject ? rule.toObject() : rule;
          // BR 7: Identify social insurance bracket with enforcement source
          return {
            ...ruleData,
            _id: rule._id,
            // Identify that this insurance bracket is enforced through Social Insurance and Pensions Law
            enforcedThrough: 'Social Insurance and Pensions Law',
            insuranceBracketName: ruleData.name || 'Unnamed Insurance Bracket',
            insuranceBracketMinSalary: ruleData.minSalary || 0,
            insuranceBracketMaxSalary: ruleData.maxSalary || null,
            insuranceBracketEmployeeRate: ruleData.employeeRate || 0,
            insuranceBracketEmployerRate: ruleData.employerRate || 0,
          };
        });
      
      // BR 7: Log identification of social insurance brackets for audit purposes
      if (applicableInsuranceBrackets.length > 0 && baseSalary > 0) {
        const insuranceBracketsInfo = applicableInsuranceBrackets.map((rule: any) => ({
          name: rule.insuranceBracketName,
          minSalary: rule.insuranceBracketMinSalary,
          maxSalary: rule.insuranceBracketMaxSalary,
          employeeRate: rule.insuranceBracketEmployeeRate,
          employerRate: rule.insuranceBracketEmployerRate,
          enforcedThrough: rule.enforcedThrough,
          bracketDeterminedBy: baseSalary, // Bracket is determined by baseSalary
          calculatedFromGrossSalary: totalGrossSalary, // But calculated from grossSalary per Social Insurance and Pensions Law
          calculatedInsurance: (totalGrossSalary * rule.insuranceBracketEmployeeRate) / 100,
        }));
        
        console.log(
          `[Social Insurance Brackets Identification] Employee ${employeeId} (${employee?.employeeNumber || 'N/A'}), Base Salary: ${baseSalary}, Gross Salary: ${totalGrossSalary}. ` +
          `Identified ${insuranceBracketsInfo.length} social insurance bracket(s) enforced through Social Insurance and Pensions Law: ` +
          `${insuranceBracketsInfo.map(ib => `${ib.name} (${ib.minSalary}-${ib.maxSalary || '∞'}, Employee: ${ib.employeeRate}%, Employer: ${ib.employerRate}%)`).join(', ')}`
        );
      } else if (applicableInsuranceBrackets.length === 0 && allInsuranceBrackets.length > 0) {
        console.warn(
          `[Social Insurance Brackets Identification] No applicable insurance brackets found for employee ${employeeId} (${employee?.employeeNumber || 'N/A'}) with base salary ${baseSalary}. ` +
          `Social Insurance and Pensions Law requires social insurance brackets to be identified and enforced.`
        );
      } else if (allInsuranceBrackets.length === 0) {
        console.warn(
          `[Social Insurance Brackets Identification] No approved insurance brackets found for employee ${employeeId} (${employee?.employeeNumber || 'N/A'}). ` +
          `Social Insurance and Pensions Law requires social insurance brackets to be identified and enforced.`
        );
      }

      // Get penalties for this employee
      // Note: Penalties are now calculated via calculatePenaltiesWithBreakdown() which uses TimeManagement and Leaves services
      // This model access is kept for legacy/compatibility but penalties are primarily calculated from TimeManagement and Leaves
      const penalties = await this.employeePenaltiesModel
        .findOne({
          employeeId: employeeObjectId,
          // Would filter by payroll period if available
        })
        .exec();

      // Calculate total deductions
      const totalTaxAmount = applicableTaxRules.reduce(
        (sum: number, rule: any) => {
          // Tax rules use 'rate' field (percentage), not 'percentage'
          return sum + (baseSalary * (rule.rate || 0)) / 100;
        },
        0,
      );
      const totalInsuranceAmount = applicableInsuranceBrackets.reduce(
        (sum: number, rule: any) => {
          // Social Insurance and Pensions Law: Employee Insurance = GrossSalary * employee_percentage
          // Insurance brackets use 'employeeRate' field (percentage)
          return sum + (totalGrossSalary * (rule.employeeRate || 0)) / 100;
        },
        0,
      );
      const totalPenaltiesAmount = penalties
        ? (penalties as any).amount || 0
        : 0;
      let totaDeductions =
        totalTaxAmount + totalInsuranceAmount + totalPenaltiesAmount;

      // Validate and fix totaDeductions if needed
      if (totaDeductions === undefined || totaDeductions === null || totaDeductions < 0) {
        console.warn(`[Generate Payslips] Warning: totaDeductions is ${totaDeductions} for employee ${employeeId}, setting to 0`);
        totaDeductions = 0;
      }

      // Check if payslip already exists for this employee and payroll run to avoid duplicates
      const existingPayslip = await this.paySlipModel.findOne({
        employeeId: employeeObjectId,
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      });

      if (existingPayslip) {
        console.log(`[Generate Payslips] Payslip already exists for employee ${employeeId} in payroll run ${payrollRunId} (ID: ${existingPayslip._id}). Skipping creation.`);
        // Verify the existing payslip is actually in the database
        const verifiedExisting = await this.paySlipModel.findById(existingPayslip._id);
        if (!verifiedExisting) {
          console.warn(`[Generate Payslips] WARNING: Existing payslip ${existingPayslip._id} was not found in database. Will create new one.`);
          // Don't skip - continue to create a new payslip
        } else {
          generatedPayslips.push(existingPayslip as any);
          continue;
        }
      }

      // Create payslip with proper structure matching schema
      let payslip: any = null;
      try {
        console.log(`[Generate Payslips] Creating payslip for employee ${employeeId}...`);
        
        const payrollRunObjectId = new mongoose.Types.ObjectId(payrollRunId);
        
        // Validate required fields before creating payslip
        if (!baseSalary || baseSalary < 0) {
          throw new Error(`Invalid baseSalary: ${baseSalary} for employee ${employeeId}`);
        }
        if (!totalGrossSalary || totalGrossSalary < 0) {
          throw new Error(`Invalid totalGrossSalary: ${totalGrossSalary} for employee ${employeeId}`);
        }
        if (detail.netPay === undefined || detail.netPay === null) {
          throw new Error(`Invalid netPay: ${detail.netPay} for employee ${employeeId}`);
        }
        
        // Ensure arrays are always arrays (not undefined) to match schema requirements
        // Convert nested objects to plain objects to ensure schema compatibility
        const earningsDetails = {
          baseSalary: baseSalary,
          allowances: Array.isArray(applicableAllowances) 
            ? applicableAllowances.map((a: any) => a.toObject ? a.toObject() : a)
            : [],
          ...(Array.isArray(signingBonusConfigs) && signingBonusConfigs.length > 0 && {
            bonuses: signingBonusConfigs.map((b: any) => b.toObject ? b.toObject() : b)
          }),
          ...(Array.isArray(terminationBenefitConfigs) && terminationBenefitConfigs.length > 0 && {
            benefits: terminationBenefitConfigs.map((b: any) => b.toObject ? b.toObject() : b)
          }),
          ...(Array.isArray(refundDetailsList) && refundDetailsList.length > 0 && {
            refunds: refundDetailsList.map((r: any) => r.toObject ? r.toObject() : r)
          }),
        };

        // BR 5: Store tax brackets (tax rules) with identification that they are enforced through Egyptian Tax Law 2025
        // Each tax rule in applicableTaxRules represents a tax bracket identified and enforced through local tax law
        const deductionsDetails = {
          taxes: Array.isArray(applicableTaxRules) 
            ? applicableTaxRules.map((t: any) => {
                const taxRule = t.toObject ? t.toObject() : t;
                // BR 5: Ensure tax bracket is identified with enforcement source
                // The tax rule name, description, and rate identify it as a tax bracket enforced through Egyptian Tax Law 2025
                return {
                  ...taxRule,
                  // Tax bracket identification: name identifies the bracket, rate is the tax rate
                  // These tax brackets are enforced through Egyptian Tax Law 2025
                  taxBracketName: taxRule.name || taxRule.taxBracketName || 'Unnamed Tax Bracket',
                  taxBracketRate: taxRule.rate || taxRule.taxBracketRate || 0,
                  enforcedThrough: taxRule.enforcedThrough || 'Egyptian Tax Law 2025',
                };
              })
            : [],
          // BR 7: Store social insurance brackets with identification that they are enforced through Social Insurance and Pensions Law
          // Each insurance bracket in applicableInsuranceBrackets represents a social insurance bracket identified and enforced through local law
          ...(Array.isArray(applicableInsuranceBrackets) && applicableInsuranceBrackets.length > 0 && {
            insurances: applicableInsuranceBrackets.map((i: any) => {
              const insuranceBracket = i.toObject ? i.toObject() : i;
              // BR 7: Ensure social insurance bracket is identified with enforcement source
              // The insurance bracket name, minSalary, maxSalary, employeeRate, and employerRate identify it as a bracket enforced through Social Insurance and Pensions Law
              return {
                ...insuranceBracket,
                // Social insurance bracket identification: name identifies the bracket, salary range and rates define the bracket
                // These social insurance brackets are enforced through Social Insurance and Pensions Law
                insuranceBracketName: insuranceBracket.name || insuranceBracket.insuranceBracketName || 'Unnamed Insurance Bracket',
                insuranceBracketMinSalary: insuranceBracket.minSalary || insuranceBracket.insuranceBracketMinSalary || 0,
                insuranceBracketMaxSalary: insuranceBracket.maxSalary !== undefined ? insuranceBracket.maxSalary : (insuranceBracket.insuranceBracketMaxSalary !== undefined ? insuranceBracket.insuranceBracketMaxSalary : null),
                insuranceBracketEmployeeRate: insuranceBracket.employeeRate || insuranceBracket.insuranceBracketEmployeeRate || 0,
                insuranceBracketEmployerRate: insuranceBracket.employerRate || insuranceBracket.insuranceBracketEmployerRate || 0,
                enforcedThrough: insuranceBracket.enforcedThrough || 'Social Insurance and Pensions Law',
              };
            })
          }),
          ...(penalties && {
            penalties: penalties.toObject ? penalties.toObject() : penalties
          }),
        };

        const payslipData = {
          employeeId: employeeObjectId,
          payrollRunId: payrollRunObjectId,
          earningsDetails: earningsDetails,
          deductionsDetails: deductionsDetails,
          totalGrossSalary: totalGrossSalary,
          totaDeductions: totaDeductions || 0, // Ensure it's never undefined
          netPay: detail.netPay,
          paymentStatus: PaySlipPaymentStatus.PENDING, // Default status
        };

        // Validate required fields before creating
        if (!payslipData.earningsDetails || !payslipData.earningsDetails.baseSalary) {
          throw new Error(`Invalid earningsDetails for employee ${employeeId}`);
        }
        if (!payslipData.deductionsDetails || !Array.isArray(payslipData.deductionsDetails.taxes)) {
          throw new Error(`Invalid deductionsDetails for employee ${employeeId}`);
        }

        payslip = new this.paySlipModel(payslipData);
        
        // Validate the document before saving
        const validationError = payslip.validateSync();
        if (validationError) {
          console.error(`[Generate Payslips] Validation error for employee ${employeeId}:`, validationError);
          throw new Error(`Payslip validation failed: ${validationError.message}`);
        }

        console.log(`[Generate Payslips] Saving payslip for employee ${employeeId}...`);
        console.log(`[Generate Payslips] Payslip data before save:`, JSON.stringify({
          employeeId: employeeObjectId.toString(),
          payrollRunId: payrollRunObjectId.toString(),
          totalGrossSalary,
          totaDeductions,
          netPay: detail.netPay,
          hasEarningsDetails: !!payslipData.earningsDetails,
          hasDeductionsDetails: !!payslipData.deductionsDetails,
          allowancesCount: payslipData.earningsDetails.allowances?.length || 0,
          taxesCount: payslipData.deductionsDetails.taxes?.length || 0,
        }, null, 2));
        
        let savedPayslip;
        try {
          // Explicitly save the payslip with error handling
          savedPayslip = await payslip.save();
          
          if (!savedPayslip || !savedPayslip._id) {
            throw new Error('Payslip save returned null or missing _id');
          }
          
          console.log(`[Generate Payslips] Successfully saved payslip ${savedPayslip._id} for employee ${employeeId} in MongoDB`);
          
          // Immediately verify the save by checking if the document exists
          const immediateCheck = await this.paySlipModel.findById(savedPayslip._id);
          if (!immediateCheck) {
            console.error(`[Generate Payslips] CRITICAL: Payslip ${savedPayslip._id} was not found immediately after save!`);
            // Try to save again as a last resort
            try {
              // Create a fresh instance to avoid any state issues
              const retryPayslip = new this.paySlipModel(payslipData);
              savedPayslip = await retryPayslip.save();
              console.log(`[Generate Payslips] Re-saved payslip ${savedPayslip._id} for employee ${employeeId}`);
              
              // Verify again
              const retryCheck = await this.paySlipModel.findById(savedPayslip._id);
              if (!retryCheck) {
                throw new Error('Payslip still not found after retry save');
              }
            } catch (retryError: any) {
              console.error(`[Generate Payslips] Re-save also failed:`, retryError);
              throw new Error(`Payslip save failed and could not be recovered: ${retryError.message || String(retryError)}`);
            }
          } else {
            console.log(`[Generate Payslips] Verified payslip ${savedPayslip._id} exists immediately after save for employee ${employeeId}`);
          }
        } catch (saveError: any) {
          console.error(`[Generate Payslips] Save error for employee ${employeeId}:`, saveError);
          if (saveError.errors) {
            console.error(`[Generate Payslips] Validation errors:`, JSON.stringify(saveError.errors, null, 2));
            // Log each validation error
            Object.keys(saveError.errors).forEach((key) => {
              console.error(`[Generate Payslips] Validation error for ${key}:`, saveError.errors[key].message);
            });
          }
          if (saveError.message) {
            console.error(`[Generate Payslips] Error message:`, saveError.message);
          }
          if (saveError.stack) {
            console.error(`[Generate Payslips] Error stack:`, saveError.stack);
          }
          
          // Provide more detailed error message
          let errorMessage = `Failed to save payslip for employee ${employeeId}`;
          if (saveError.errors) {
            const errorDetails = Object.keys(saveError.errors)
              .map((key) => `${key}: ${saveError.errors[key].message}`)
              .join('; ');
            errorMessage += ` - Validation errors: ${errorDetails}`;
          } else {
            errorMessage += `: ${saveError.message || String(saveError)}`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Additional verification: Query by employeeId and payrollRunId to ensure it's findable
        try {
          // Wait a brief moment to ensure database write is committed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const queryCheck = await this.paySlipModel.findOne({
            employeeId: employeeObjectId,
            payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
          });
          
          if (!queryCheck) {
            console.error(`[Generate Payslips] WARNING: Payslip not found by query for employee ${employeeId} and payroll run ${payrollRunId}`);
            console.error(`[Generate Payslips] Attempting to find by ID: ${savedPayslip._id}`);
            
            // Try finding by ID as fallback
            const idCheck = await this.paySlipModel.findById(savedPayslip._id);
            if (!idCheck) {
              throw new Error(`Payslip ${savedPayslip._id} was saved but cannot be queried from database`);
            } else {
              console.log(`[Generate Payslips] Payslip found by ID but not by query - possible indexing issue`);
            }
          } else {
            console.log(`[Generate Payslips] Confirmed payslip ${queryCheck._id} is queryable in database`);
            // Update savedPayslip to use the queried version to ensure it's the latest
            savedPayslip = queryCheck;
          }
        } catch (queryError) {
          console.error(`[Generate Payslips] Error querying payslip:`, queryError);
          // If query fails but save succeeded, log warning but continue
          // The payslip might still be saved but not immediately queryable (eventual consistency)
          console.warn(`[Generate Payslips] Payslip may be saved but not immediately queryable - this could be a database consistency issue`);
        }
        
        // Update payslip variable to the saved document for use in distribution
        payslip = savedPayslip;
        generatedPayslips.push(savedPayslip as any);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Generate Payslips] Error creating/saving payslip for employee ${employeeId}: ${errorMessage}`);
        if (error instanceof Error && (error as any).errors) {
          console.error(`[Generate Payslips] Validation errors:`, JSON.stringify((error as any).errors, null, 2));
        }
        // Flag as exception but continue with other employees
        await this.flagPayrollException(
          payrollRunId,
          'PAYSLIP_GENERATION_ERROR',
          `Failed to generate payslip for employee ${employeeId}: ${errorMessage}`,
          currentUserId,
          employeeId.toString(),
        );
        // Continue with next employee instead of failing entire process
        continue;
      }

      // Only process refunds and distribute if payslip was successfully created and saved
      if (!payslip || !payslip._id) {
        console.warn(`[Generate Payslips] Skipping refund processing and distribution for employee ${employeeId} - payslip creation failed`);
        continue;
      }

      // Process refunds that were included in this payslip (mark as PAID)
      // Integration with PayrollTrackingService: Mark refunds as paid after payslip generation
      for (const refundToProcess of refundsToProcess) {
        try {
          await (this.payrollTrackingService as any).processRefund(
            refundToProcess._id.toString(),
            {
              paidInPayrollRunId: payrollRunId,
            },
          );
        } catch (error) {
          // Log error but don't fail the entire process
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Error processing refund ${refundToProcess._id} for employee ${employeeId}: ${errorMessage}`,
          );
          // Flag as exception but continue with other refunds
          await this.flagPayrollException(
            payrollRunId,
            'REFUND_PROCESSING_ERROR',
            `Failed to process refund ${refundToProcess._id} for employee ${employeeId}: ${errorMessage}`,
            currentUserId,
            employeeId.toString(),
          );
        }
      }

      // Distribute payslip based on method
      try {
        if (distributionMethod === 'PDF') {
          await this.distributePayslipAsPDF(payslip, employeeObjectId);
        } else if (distributionMethod === 'EMAIL') {
          await this.distributePayslipViaEmail(payslip, employeeObjectId);
        } else if (distributionMethod === 'PORTAL') {
          await this.distributePayslipViaPortal(payslip);
        }
      } catch (error) {
        // Log error but don't fail the entire process
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Error distributing payslip ${payslip._id} via ${distributionMethod}: ${errorMessage}`,
        );
        // Flag as exception but continue with other payslips
        await this.flagPayrollException(
          payrollRunId,
          'PAYSLIP_DISTRIBUTION_ERROR',
          `Failed to distribute payslip for employee ${employeeId} via ${distributionMethod}: ${errorMessage}`,
          currentUserId,
          employeeId.toString(),
        );
      }
    }

    console.log(`[Generate Payslips] Completed. Generated ${generatedPayslips.length} payslips out of ${payrollDetails.length} employees via ${distributionMethod}`);

    // Verify payslips were actually saved to database and re-fetch them to ensure they're persisted
    const verifiedPayslipIds = [];
    const failedVerificationIds = [];
    const verifiedPayslips: any[] = [];
    
    try {
      for (const payslip of generatedPayslips) {
        try {
          if (!payslip || !payslip._id) {
            console.error(`[Generate Payslips] Invalid payslip object in generatedPayslips array`);
            continue;
          }
          
          const payslipId = payslip._id?.toString() || payslip.toString();
          if (!payslipId || payslipId === 'unknown') {
            console.error(`[Generate Payslips] Invalid payslip ID: ${payslipId}`);
            continue;
          }
          
          // Re-fetch from database to ensure it's actually persisted
          const verified = await this.paySlipModel.findById(payslipId);
          if (verified) {
            verifiedPayslipIds.push(payslipId);
            verifiedPayslips.push(verified);
            console.log(`[Generate Payslips] Verified payslip ${payslipId} exists in database`);
          } else {
            console.error(`[Generate Payslips] WARNING: Payslip ${payslipId} was not found in database after generation`);
            failedVerificationIds.push(payslipId);
            // Still add the original payslip to verifiedPayslips if it has an _id
            // This ensures we return what was generated even if verification fails
            if (payslip._id) {
              verifiedPayslips.push(payslip);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Generate Payslips] Error verifying payslip ${payslip?._id}: ${errorMsg}`);
          failedVerificationIds.push(payslip?._id?.toString() || 'unknown');
          // Still add the original payslip if it exists
          if (payslip && payslip._id) {
            verifiedPayslips.push(payslip);
          }
        }
      }
    } catch (verificationError) {
      console.error(`[Generate Payslips] Error during verification loop:`, verificationError);
      // If verification fails entirely, use the generated payslips
      if (verifiedPayslips.length === 0 && generatedPayslips.length > 0) {
        console.warn(`[Generate Payslips] Verification failed, using generated payslips as fallback`);
        verifiedPayslips.push(...generatedPayslips);
      }
    }
    
    if (failedVerificationIds.length > 0) {
      console.warn(`[Generate Payslips] ${failedVerificationIds.length} payslips failed verification:`, failedVerificationIds);
    }

    // Final verification: Count actual payslips in database for this payroll run
    let actualPayslipCount = 0;
    try {
      actualPayslipCount = await this.paySlipModel.countDocuments({
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId),
      });
      console.log(`[Generate Payslips] Final database count for payroll run ${payrollRunId}: ${actualPayslipCount} payslips`);
    } catch (countError) {
      console.error(`[Generate Payslips] Error counting payslips in database:`, countError);
      // Don't fail the entire operation if count fails
    }

    // If no payslips were generated at all, throw an error
    // But allow partial success if some were generated
    if (generatedPayslips.length === 0 && verifiedPayslips.length === 0) {
      throw new Error(
        `Failed to generate any payslips. Check the logs for validation errors.`,
      );
    }

    // If no payslips were verified but some were generated, use the generated ones
    // This handles cases where verification fails but payslips are actually saved
    const payslipsToReturn = verifiedPayslips.length > 0 ? verifiedPayslips : generatedPayslips;
    const successfulCount = verifiedPayslips.length > 0 ? verifiedPayslips.length : generatedPayslips.length;

    // Warn if some payslips weren't verified in database
    if (verifiedPayslipIds.length < generatedPayslips.length) {
      const missingCount = generatedPayslips.length - verifiedPayslipIds.length;
      console.error(
        `[Generate Payslips] WARNING: Only ${verifiedPayslipIds.length} out of ${generatedPayslips.length} payslips were verified in database. ${missingCount} payslips may need manual verification.`
      );
    }

    if (actualPayslipCount < verifiedPayslipIds.length && verifiedPayslipIds.length > 0) {
      console.error(
        `[Generate Payslips] WARNING: Database count (${actualPayslipCount}) is less than verified count (${verifiedPayslipIds.length})!`
      );
    }

    // Return payslips - prefer verified ones, but fall back to generated ones if verification failed
    return {
      message: `Generated ${successfulCount} payslip${successfulCount !== 1 ? 's' : ''} via ${distributionMethod}`,
      payslips: payslipsToReturn,
      verifiedPayslips: verifiedPayslipIds.length,
      actualDatabaseCount: actualPayslipCount,
      distributionMethod,
      totalEmployees: payrollDetails.length,
      successful: successfulCount,
      failed: payrollDetails.length - successfulCount,
      warnings: verifiedPayslipIds.length < generatedPayslips.length 
        ? [`Only ${verifiedPayslipIds.length} out of ${generatedPayslips.length} payslips were verified in database`]
        : [],
    };
  }

  // ====================================================================================
  // PAYSLIP VIEWING - For Payroll Specialists
  // ====================================================================================
  
  // Get all payslips for a payroll run (for Payroll Specialists to view)
  async getPayslipsByPayrollRun(
    payrollRunId: string,
    currentUserId: string,
  ): Promise<any[]> {
    const payslips = await this.paySlipModel
      .find({
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId),
      })
      .populate('employeeId', 'firstName lastName employeeId email')
      .populate('payrollRunId', 'runId payrollPeriod status')
      .sort({ createdAt: -1 })
      .exec();

    return payslips.map((payslip: any) => ({
      _id: payslip._id,
      employeeId: payslip.employeeId,
      payrollRunId: payslip.payrollRunId,
      earningsDetails: payslip.earningsDetails,
      deductionsDetails: payslip.deductionsDetails,
      totalGrossSalary: payslip.totalGrossSalary,
      totaDeductions: payslip.totaDeductions,
      netPay: payslip.netPay,
      paymentStatus: payslip.paymentStatus,
      createdAt: payslip.createdAt,
      updatedAt: payslip.updatedAt,
    }));
  }

  // Get a specific payslip by ID (for Payroll Specialists to view)
  async getPayslipById(
    payslipId: string,
    currentUserId: string,
  ): Promise<any> {
    const payslip = await this.paySlipModel
      .findById(payslipId)
      .populate('employeeId', 'firstName lastName employeeId email')
      .populate('payrollRunId', 'runId payrollPeriod status')
      .exec();

    if (!payslip) {
      throw new Error('Payslip not found');
    }

    return {
      _id: payslip._id,
      employeeId: payslip.employeeId,
      payrollRunId: payslip.payrollRunId,
      earningsDetails: payslip.earningsDetails,
      deductionsDetails: payslip.deductionsDetails,
      totalGrossSalary: payslip.totalGrossSalary,
      totaDeductions: payslip.totaDeductions,
      netPay: payslip.netPay,
      paymentStatus: payslip.paymentStatus,
      createdAt: (payslip as any).createdAt,
      updatedAt: (payslip as any).updatedAt,
    };
  }

  // Get all payslips (for Payroll Specialists to view all payslips)
  async getAllPayslips(
    currentUserId: string,
    filters?: {
      payrollRunId?: string;
      employeeId?: string;
      paymentStatus?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: any = {};

    if (filters?.payrollRunId) {
      query.payrollRunId = new mongoose.Types.ObjectId(filters.payrollRunId);
    }

    if (filters?.employeeId) {
      query.employeeId = new mongoose.Types.ObjectId(filters.employeeId);
    }

    if (filters?.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    // Debug logging
    console.log(`[Get All Payslips] Query:`, JSON.stringify(query, null, 2));
    console.log(`[Get All Payslips] Pagination: page=${page}, limit=${limit}, skip=${skip}`);
    console.log(`[Get All Payslips] Model name: ${this.paySlipModel.modelName}`);
    console.log(`[Get All Payslips] Collection name: ${this.paySlipModel.collection.name}`);

    // First, check total count without filters to see if any payslips exist
    const totalCountAll = await this.paySlipModel.countDocuments({});
    console.log(`[Get All Payslips] Total payslips in database (no filters): ${totalCountAll}`);
    
    // Also try a direct find to see what's actually there
    if (totalCountAll === 0) {
      const samplePayslips = await this.paySlipModel.find({}).limit(5).lean().exec();
      console.log(`[Get All Payslips] Sample payslips (first 5, if any):`, samplePayslips.length);
      if (samplePayslips.length > 0) {
        console.log(`[Get All Payslips] Sample payslip structure:`, {
          _id: samplePayslips[0]._id,
          employeeId: samplePayslips[0].employeeId,
          payrollRunId: samplePayslips[0].payrollRunId,
        });
      }
    }

    const [payslips, total] = await Promise.all([
      this.paySlipModel
        .find(query)
        .populate('employeeId', 'firstName lastName employeeId email')
        .populate('payrollRunId', 'runId payrollPeriod status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paySlipModel.countDocuments(query),
    ]);

    console.log(`[Get All Payslips] Found ${payslips.length} payslips matching query, total: ${total}`);
    if (payslips.length > 0) {
      console.log(`[Get All Payslips] First payslip sample:`, {
        _id: payslips[0]._id,
        employeeId: payslips[0].employeeId,
        payrollRunId: payslips[0].payrollRunId,
        paymentStatus: payslips[0].paymentStatus,
      });
    }

    return {
      data: payslips.map((payslip: any) => ({
        _id: payslip._id,
        employeeId: payslip.employeeId,
        payrollRunId: payslip.payrollRunId,
        earningsDetails: payslip.earningsDetails,
        deductionsDetails: payslip.deductionsDetails,
        totalGrossSalary: payslip.totalGrossSalary,
        totaDeductions: payslip.totaDeductions,
        netPay: payslip.netPay,
        paymentStatus: payslip.paymentStatus,
        createdAt: payslip.createdAt,
        updatedAt: payslip.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  // Helper: Distribute payslip as PDF
  // REQ-PY-8: PDF distribution method
  // Note: Requires pdfkit library: npm install pdfkit @types/pdfkit
  private async distributePayslipAsPDF(
    payslip: any,
    employeeId: any,
  ): Promise<void> {
    try {
      // Get employee details for PDF
      const employee = await this.employeeProfileService.findOne(
        employeeId.toString(),
      );
      if (!employee) {
        throw new Error('Employee not found for PDF generation');
      }

      // Get payroll run for period information
      const payrollRun = await this.payrollRunModel.findById(
        payslip.payrollRunId,
      );
      const periodDate = payrollRun
        ? new Date(payrollRun.payrollPeriod)
        : new Date();
      const periodMonth = periodDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      // Check if pdfkit is available (optional dependency)
      let PDFDocument: any;
      let fs: any;
      let path: any;

      try {
        PDFDocument = require('pdfkit');
        fs = require('fs');
        path = require('path');
      } catch (e) {
        // pdfkit not installed - log and continue (payslip is still saved)
        console.warn(
          `PDF generation skipped: pdfkit library not installed. Install with: npm install pdfkit @types/pdfkit`,
        );
        console.log(
          `Payslip ${payslip._id} generated successfully. PDF generation requires pdfkit library.`,
        );
        return; // Exit gracefully if library not available
      }

      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `payslip-${employee.employeeNumber}-${payslip._id.toString()}.pdf`;
      const payslipsDir = path.join(process.cwd(), 'payslips');
      const filePath = path.join(payslipsDir, fileName);

      // Ensure directory exists
      if (!fs.existsSync(payslipsDir)) {
        fs.mkdirSync(payslipsDir, { recursive: true });
      }

      // Create write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Generate PDF content
      doc.fontSize(20).text('PAYSLIP', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .text(
          `Employee: ${employee.fullName || `${employee.firstName} ${employee.lastName}`}`,
        );
      doc.text(`Employee Number: ${employee.employeeNumber}`);
      doc.text(`Period: ${periodMonth}`);
      doc.moveDown();

      // Earnings section
      doc.fontSize(14).text('EARNINGS', { underline: true });
      doc.fontSize(10);
      doc.text(`Base Salary: ${payslip.earningsDetails.baseSalary.toFixed(2)}`);

      if (
        payslip.earningsDetails.allowances &&
        payslip.earningsDetails.allowances.length > 0
      ) {
        payslip.earningsDetails.allowances.forEach((allowance: any) => {
          doc.text(
            `  ${allowance.name || 'Allowance'}: ${(allowance.amount || 0).toFixed(2)}`,
          );
        });
      }

      if (
        payslip.earningsDetails.bonuses &&
        payslip.earningsDetails.bonuses.length > 0
      ) {
        payslip.earningsDetails.bonuses.forEach((bonus: any) => {
          doc.text(`  Bonus: ${(bonus.amount || 0).toFixed(2)}`);
        });
      }

      if (
        payslip.earningsDetails.benefits &&
        payslip.earningsDetails.benefits.length > 0
      ) {
        payslip.earningsDetails.benefits.forEach((benefit: any) => {
          doc.text(`  Benefit: ${(benefit.amount || 0).toFixed(2)}`);
        });
      }

      if (
        payslip.earningsDetails.refunds &&
        payslip.earningsDetails.refunds.length > 0
      ) {
        payslip.earningsDetails.refunds.forEach((refund: any) => {
          doc.text(
            `  Refund: ${(refund.amount || 0).toFixed(2)} - ${refund.description || ''}`,
          );
        });
      }

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Gross Salary: ${payslip.totalGrossSalary.toFixed(2)}`, {
          underline: true,
        });

      // Deductions section
      doc.moveDown();
      doc.fontSize(14).text('DEDUCTIONS', { underline: true });
      doc.fontSize(10);

      if (
        payslip.deductionsDetails.taxes &&
        payslip.deductionsDetails.taxes.length > 0
      ) {
        payslip.deductionsDetails.taxes.forEach((tax: any) => {
          const taxAmount =
            (payslip.earningsDetails.baseSalary * (tax.percentage || 0)) / 100;
          doc.text(
            `  ${tax.name || 'Tax'} (${tax.percentage || 0}%): ${taxAmount.toFixed(2)}`,
          );
        });
      }

      if (
        payslip.deductionsDetails.insurances &&
        payslip.deductionsDetails.insurances.length > 0
      ) {
        payslip.deductionsDetails.insurances.forEach((insurance: any) => {
          const insuranceAmount =
            (payslip.earningsDetails.baseSalary * (insurance.percentage || 0)) /
            100;
          doc.text(
            `  ${insurance.name || 'Insurance'} (${insurance.percentage || 0}%): ${insuranceAmount.toFixed(2)}`,
          );
        });
      }

      if (payslip.deductionsDetails.penalties) {
        const penaltyAmount =
          (payslip.deductionsDetails.penalties as any).amount || 0;
        if (penaltyAmount > 0) {
          doc.text(`  Penalties: ${penaltyAmount.toFixed(2)}`);
        }
      }

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Deductions: ${payslip.totaDeductions.toFixed(2)}`, {
          underline: true,
        });

      // Summary
      doc.moveDown();
      doc.fontSize(16).text('NET PAY', { align: 'center', underline: true });
      doc
        .fontSize(18)
        .text(`${payslip.netPay.toFixed(2)}`, { align: 'center' });

      doc.end();

      // Wait for PDF to be generated
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', () => {
          console.log(`PDF generated successfully: ${filePath}`);
          resolve();
        });
        stream.on('error', reject);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error generating PDF for payslip ${payslip._id}: ${errorMessage}`,
      );
      throw error;
    }
  }

  // Helper: Distribute payslip via Email
  // REQ-PY-8: Email distribution method
  // Note: Requires nodemailer library: npm install nodemailer @types/nodemailer
  // Or @nestjs/mailer: npm install @nestjs/mailer nodemailer
  private async distributePayslipViaEmail(
    payslip: any,
    employeeId: any,
  ): Promise<void> {
    try {
      // Get employee details for email
      const employee = await this.employeeProfileService.findOne(
        employeeId.toString(),
      );
      if (!employee) {
        throw new Error('Employee not found for email distribution');
      }

      // Check if employee has work email
      const emailAddress =
        (employee as any).workEmail || (employee as any).personalEmail;
      if (!emailAddress) {
        throw new Error(
          `No email address found for employee ${employee.employeeNumber}`,
        );
      }

      // Get payroll run for period information
      const payrollRun = await this.payrollRunModel.findById(
        payslip.payrollRunId,
      );
      const periodDate = payrollRun
        ? new Date(payrollRun.payrollPeriod)
        : new Date();
      const periodMonth = periodDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      // Check if nodemailer is available (optional dependency)
      let nodemailer: any;

      try {
        nodemailer = require('nodemailer');
      } catch (e) {
        // nodemailer not installed - log and continue (payslip is still saved)
        console.warn(
          `Email sending skipped: nodemailer library not installed. Install with: npm install nodemailer @types/nodemailer`,
        );
        console.log(
          `Payslip ${payslip._id} generated successfully. Email sending requires nodemailer library.`,
        );
        return; // Exit gracefully if library not available
      }

      // Configure transporter (use environment variables)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Build earnings HTML
      let earningsHtml = `<p>Base Salary: ${payslip.earningsDetails.baseSalary.toFixed(2)}</p>`;
      if (
        payslip.earningsDetails.allowances &&
        payslip.earningsDetails.allowances.length > 0
      ) {
        earningsHtml += '<p>Allowances:</p><ul>';
        payslip.earningsDetails.allowances.forEach((allowance: any) => {
          earningsHtml += `<li>${allowance.name || 'Allowance'}: ${(allowance.amount || 0).toFixed(2)}</li>`;
        });
        earningsHtml += '</ul>';
      }
      if (
        payslip.earningsDetails.bonuses &&
        payslip.earningsDetails.bonuses.length > 0
      ) {
        earningsHtml += '<p>Bonuses:</p><ul>';
        payslip.earningsDetails.bonuses.forEach((bonus: any) => {
          earningsHtml += `<li>Bonus: ${(bonus.amount || 0).toFixed(2)}</li>`;
        });
        earningsHtml += '</ul>';
      }
      if (
        payslip.earningsDetails.refunds &&
        payslip.earningsDetails.refunds.length > 0
      ) {
        earningsHtml += '<p>Refunds:</p><ul>';
        payslip.earningsDetails.refunds.forEach((refund: any) => {
          earningsHtml += `<li>${refund.description || 'Refund'}: ${(refund.amount || 0).toFixed(2)}</li>`;
        });
        earningsHtml += '</ul>';
      }
      earningsHtml += `<p><strong>Total Gross Salary: ${payslip.totalGrossSalary.toFixed(2)}</strong></p>`;

      // Build deductions HTML
      let deductionsHtml = '';
      if (
        payslip.deductionsDetails.taxes &&
        payslip.deductionsDetails.taxes.length > 0
      ) {
        deductionsHtml += '<p>Taxes:</p><ul>';
        payslip.deductionsDetails.taxes.forEach((tax: any) => {
          const taxAmount =
            (payslip.earningsDetails.baseSalary * (tax.percentage || 0)) / 100;
          deductionsHtml += `<li>${tax.name || 'Tax'} (${tax.percentage || 0}%): ${taxAmount.toFixed(2)}</li>`;
        });
        deductionsHtml += '</ul>';
      }
      if (
        payslip.deductionsDetails.insurances &&
        payslip.deductionsDetails.insurances.length > 0
      ) {
        deductionsHtml += '<p>Insurance:</p><ul>';
        payslip.deductionsDetails.insurances.forEach((insurance: any) => {
          const insuranceAmount =
            (payslip.earningsDetails.baseSalary * (insurance.percentage || 0)) /
            100;
          deductionsHtml += `<li>${insurance.name || 'Insurance'} (${insurance.percentage || 0}%): ${insuranceAmount.toFixed(2)}</li>`;
        });
        deductionsHtml += '</ul>';
      }
      if (payslip.deductionsDetails.penalties) {
        const penaltyAmount =
          (payslip.deductionsDetails.penalties as any).amount || 0;
        if (penaltyAmount > 0) {
          deductionsHtml += `<p>Penalties: ${penaltyAmount.toFixed(2)}</p>`;
        }
      }
      deductionsHtml += `<p><strong>Total Deductions: ${payslip.totaDeductions.toFixed(2)}</strong></p>`;

      // Send email
      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER ||
          'payroll@company.com',
        to: emailAddress,
        subject: `Your Payslip for ${periodMonth}`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2c3e50;">Your Payslip for ${periodMonth}</h2>
              <p>Dear ${employee.fullName || `${employee.firstName} ${employee.lastName}`},</p>
              <p>Please find your payslip details below:</p>
              
              <h3 style="color: #27ae60;">Earnings</h3>
              ${earningsHtml}
              
              <h3 style="color: #e74c3c;">Deductions</h3>
              ${deductionsHtml}
              
              <h3 style="color: #3498db;">Net Pay</h3>
              <p style="font-size: 18px; font-weight: bold; color: #2c3e50;">${payslip.netPay.toFixed(2)}</p>
              
              <p>For detailed breakdown, please log in to the employee portal.</p>
              
              <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
                This is an automated message. Please do not reply to this email.
              </p>
            </body>
          </html>
        `,
      });

      console.log(
        `Email sent successfully for payslip ${payslip._id} to ${emailAddress}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error sending email for payslip ${payslip._id}: ${errorMessage}`,
      );
      throw error;
    }
  }

  // Helper: Distribute payslip via Portal
  // REQ-PY-8: Portal distribution method
  private async distributePayslipViaPortal(payslip: any): Promise<void> {
    try {
      // Portal distribution means making the payslip available in the employee portal
      // Since the payslip is already saved in the database, it's automatically available
      // for the employee to view through the portal API endpoints

      // The payslip is already linked to employeeId and payrollRunId, so:
      // 1. Employee can query their payslips via API: GET /payslips?employeeId=xxx
      // 2. Frontend can display payslips for the logged-in employee
      // 3. No additional action needed - the payslip is "distributed" by being in the database

      // Optional: You could add a flag or timestamp to track when payslip was made available
      // For now, we'll just log that portal distribution is complete

      console.log(`Payslip ${payslip._id} is now available in employee portal`);

      // The payslip is already saved and accessible, so portal distribution is complete
      // No additional database operations needed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error distributing payslip ${payslip._id} via portal: ${errorMessage}`,
      );
      throw error;
    }
  }

  // ====================================================================================
  // PHASE 3: REVIEW & APPROVAL WORKFLOW
  // ====================================================================================
  // REQ-PY-12: Send payroll run for approval to Manager and Finance
  // BR: Enforce proper workflow sequence
  // BR: Validate that manager has PAYROLL_MANAGER role
  // BR: Validate that finance staff has FINANCE_STAFF role
  // BR: Ensure payments cannot be made without validation (status must be DRAFT)
  async sendForApproval(
    payrollRunId: string,
    managerId: string,
    financeStaffId: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Validate that payroll run is in DRAFT status (cannot send for approval if already approved/rejected)
    if (payrollRun.status !== PayRollStatus.DRAFT) {
      throw new Error(
        `Cannot send payroll run for approval. Current status is '${payrollRun.status}'. Only payroll runs with 'DRAFT' status can be sent for approval.`,
      );
    }

    // Validate status transition (DRAFT → UNDER_REVIEW)
    this.validateStatusTransition(
      payrollRun.status,
      PayRollStatus.UNDER_REVIEW,
    );

    // Validate that managerId has PAYROLL_MANAGER role
    await this.validateEmployeeHasRole(
      managerId,
      SystemRole.PAYROLL_MANAGER,
      'Payroll Manager',
    );

    // Validate that financeStaffId has FINANCE_STAFF role
    await this.validateEmployeeHasRole(
      financeStaffId,
      SystemRole.FINANCE_STAFF,
      'Finance Staff',
    );

    // Ensure manager and finance staff are different people
    if (managerId === financeStaffId) {
      throw new Error(
        'Payroll Manager and Finance Staff must be different employees.',
      );
    }

    // Update payroll run: change status to UNDER_REVIEW and assign approvers
    payrollRun.status = PayRollStatus.UNDER_REVIEW;
    payrollRun.payrollManagerId = new mongoose.Types.ObjectId(managerId) as any;
    payrollRun.financeStaffId = new mongoose.Types.ObjectId(
      financeStaffId,
    ) as any;
    (payrollRun as any).updatedBy = currentUserId;

    const savedPayrollRun = await payrollRun.save();

    // Notify Payroll Manager
    await this.sendPayrollNotification(
      NotificationType.PAYROLL_SENT_FOR_APPROVAL,
      managerId,
      `Payroll run ${payrollRun.runId} has been sent for your approval`,
      { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
      'Payroll Pending Manager Approval',
    );

    // Notify Finance Staff
    await this.sendPayrollNotification(
      NotificationType.PAYROLL_SENT_FOR_APPROVAL,
      financeStaffId,
      `Payroll run ${payrollRun.runId} has been sent for finance approval`,
      { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
      'Payroll Pending Finance Approval',
    );

    return savedPayrollRun;
  }

  // Helper: Validate that an employee has a specific system role
  private async validateEmployeeHasRole(
    employeeId: string,
    requiredRole: SystemRole,
    roleDisplayName: string,
  ): Promise<void> {
    try {
      // Check if employee exists
      const employee = await this.employeeProfileModel.findById(employeeId);
      if (!employee) {
        throw new Error(
          `Employee with ID ${employeeId} not found. Please provide a valid employee ID.`,
        );
      }

      // Check if employee has the required system role
      const systemRole = await this.employeeSystemRoleModel
        .findOne({
          employeeProfileId: new mongoose.Types.ObjectId(employeeId),
          roles: { $in: [requiredRole] },
          isActive: true,
        })
        .exec();

      if (!systemRole) {
        throw new Error(
          `Employee ${employee.firstName} ${employee.lastName} (ID: ${employeeId}) does not have the ${roleDisplayName} role. Please select an employee with the ${roleDisplayName} role.`,
        );
      }
    } catch (error) {
      // Re-throw validation errors as-is
      if (error instanceof Error && error.message.includes('does not have')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      // For other errors, wrap in a more descriptive error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to validate ${roleDisplayName} role: ${errorMessage}`,
      );
    }
  }

  // REQ-PY-15: Finance Staff approve payroll disbursements before execution
  // BR: Enforce proper workflow sequence
  // BR: Only assigned finance staff can approve
  // BR: Ensure no incorrect payments are made (validation before approval)
  async approvePayrollDisbursement(
    financeDecisionDto: FinanceDecisionDto,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(
      financeDecisionDto.payrollRunId,
    );
    if (!payrollRun) throw new Error('Payroll run not found');

    // Validate that payroll run is in PENDING_FINANCE_APPROVAL status
    if (payrollRun.status !== PayRollStatus.PENDING_FINANCE_APPROVAL) {
      throw new Error(
        `Cannot process finance approval. Current status is '${payrollRun.status}'. Only payroll runs with 'PENDING_FINANCE_APPROVAL' status can be approved by Finance.`,
      );
    }

    // Validate that the current user is the assigned finance staff (if financeStaffId is set)
    if (payrollRun.financeStaffId) {
      const assignedFinanceStaffId = payrollRun.financeStaffId.toString();
      if (assignedFinanceStaffId !== currentUserId) {
        throw new Error(
          'Only the assigned Finance Staff member can approve this payroll run. Please contact the assigned Finance Staff member.',
        );
      }
    } else {
      // If no finance staff was assigned, validate that current user has FINANCE_STAFF role
      await this.validateEmployeeHasRole(
        currentUserId,
        SystemRole.FINANCE_STAFF,
        'Finance Staff',
      );
    }

    if (financeDecisionDto.decision === 'approve') {
      // Validate status transition (PENDING_FINANCE_APPROVAL → APPROVED)
      this.validateStatusTransition(payrollRun.status, PayRollStatus.APPROVED);

      payrollRun.status = PayRollStatus.APPROVED;
      payrollRun.paymentStatus = PayRollPaymentStatus.PAID;

      // Set finance approval date with validation
      if (financeDecisionDto.decisionDate) {
        const approvalDate = new Date(financeDecisionDto.decisionDate);
        // Validate that approval date is not in the future
        const now = new Date();
        if (approvalDate > now) {
          throw new Error('Finance approval date cannot be in the future');
        }
        payrollRun.financeApprovalDate = approvalDate;
      } else {
        payrollRun.financeApprovalDate = new Date();
      }

      // Update finance staff assignment if provided
      if (financeDecisionDto.financeStaffId) {
        payrollRun.financeStaffId = new mongoose.Types.ObjectId(
          financeDecisionDto.financeStaffId,
        ) as any;
      }

      // Save the payroll run first
      (payrollRun as any).updatedBy = currentUserId;
      const savedPayrollRun = await payrollRun.save();

      // Notify Payroll Manager
      if (payrollRun.payrollManagerId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_FINANCE_APPROVED,
          payrollRun.payrollManagerId.toString(),
          `Payroll run ${payrollRun.runId} has been approved by finance. Please lock the payroll.`,
          { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
          'Finance Approval Received',
        );
      }
      
      // Notify Payroll Specialist
      if (payrollRun.payrollSpecialistId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_FINANCE_APPROVED,
          payrollRun.payrollSpecialistId.toString(),
          `Payroll run ${payrollRun.runId} has been approved by finance`,
          { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
          'Finance Approval Received',
        );
      }

      // REQ-PY-8: Automatically generate and distribute payslips after Finance approval (REQ-PY-15)
      // Check if payroll is already locked - if yes, auto-generate payslips
      if (savedPayrollRun.status === PayRollStatus.LOCKED) {
        console.log(`[Auto-Generate Payslips] Finance approved payroll run ${savedPayrollRun._id}. Payroll is locked. Auto-generating payslips...`);
        try {
          // Auto-generate payslips via Portal (default distribution method)
          await this.generateAndDistributePayslips(
            savedPayrollRun._id.toString(),
            'PORTAL',
            currentUserId,
          );
          console.log(`[Auto-Generate Payslips] Successfully auto-generated payslips for payroll run ${savedPayrollRun._id}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Auto-Generate Payslips] Failed to auto-generate payslips for payroll run ${savedPayrollRun._id}: ${errorMessage}`);
          // Don't fail the approval if payslip generation fails - log and continue
        }
      } else {
        console.log(`[Auto-Generate Payslips] Finance approved payroll run ${savedPayrollRun._id}. Payroll is not locked yet. Payslips will be auto-generated when payroll is locked.`);
      }

      return savedPayrollRun;
    } else {
      // Validate status transition (PENDING_FINANCE_APPROVAL → REJECTED)
      this.validateStatusTransition(payrollRun.status, PayRollStatus.REJECTED);

      payrollRun.status = PayRollStatus.REJECTED;
      payrollRun.rejectionReason =
        financeDecisionDto.reason || 'Rejected by Finance';
      
      (payrollRun as any).updatedBy = currentUserId;
      const savedPayrollRun = await payrollRun.save();
      
      // Notify Payroll Specialist about rejection
      if (payrollRun.payrollSpecialistId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_FINANCE_REJECTED,
          payrollRun.payrollSpecialistId.toString(),
          `Payroll run ${payrollRun.runId} has been rejected by finance. Reason: ${financeDecisionDto.reason || 'No reason provided'}`,
          { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId, reason: financeDecisionDto.reason },
          'Finance Rejection',
        );
      }
      
      return savedPayrollRun;
    }
  }

  // REQ-PY-20: Payroll Manager resolve escalated irregularities
  // BR 9: Exception resolution workflow with history tracking
  async resolveIrregularity(
    payrollRunId: string,
    employeeId: string,
    exceptionCode: string,
    resolution: string,
    managerId: string,
    currentUserId: string,
  ): Promise<{
    payrollRun: payrollRuns;
    employeePayrollDetails: employeePayrollDetails;
  }> {
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Find employee payroll details
    const payrollDetails = await this.employeePayrollDetailsModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId) as any,
      payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
    });

    if (!payrollDetails) {
      throw new Error(
        `Payroll details not found for employee ${employeeId} in run ${payrollRunId}`,
      );
    }

    // Parse existing exceptions JSON
    let exceptionsData: any = {};
    if (payrollDetails.exceptions) {
      try {
        exceptionsData = JSON.parse(payrollDetails.exceptions);
      } catch (error) {
        throw new Error(
          `Invalid exceptions data format for employee ${employeeId}`,
        );
      }
    }

    // Initialize arrays if they don't exist
    if (!exceptionsData.exceptionMessages) {
      exceptionsData.exceptionMessages = [];
    }
    if (!exceptionsData.exceptionHistory) {
      exceptionsData.exceptionHistory = [];
    }

    // Find and resolve the exception
    let exceptionFound = false;
    for (const exception of exceptionsData.exceptionMessages) {
      if (exception.code === exceptionCode && exception.status === 'active') {
        // Store exception data for history before clearing
        const exceptionForHistory = {
          ...exception,
          action: 'resolved',
        };
        
        // Clear exception message string when resolving (requirement simplification)
        // As per requirement: "for simplicity just make exception string empty when resolving"
        exception.message = ''; // Clear message as per requirement
        exception.code = ''; // Clear code as per requirement
        exception.status = 'resolved';
        exception.resolvedBy = managerId;
        exception.resolvedAt = new Date().toISOString();
        exception.resolution = resolution;
        exceptionFound = true;

        // Add to history (with original data before clearing)
        exceptionsData.exceptionHistory.push(exceptionForHistory);
        break;
      }
    }

    if (!exceptionFound) {
      throw new Error(
        `Active exception with code ${exceptionCode} not found for employee ${employeeId}`,
      );
    }

    // Clear exception string when resolving (as per requirement)
    // Remove the exception from active list and clear the string
    const activeExceptions = exceptionsData.exceptionMessages.filter(
      (e: any) => e.status === 'active',
    );

    // If no active exceptions remain, clear the exceptions field
    if (activeExceptions.length === 0) {
      payrollDetails.exceptions = ''; // Clear exception string as per requirement
    } else {
      // Keep only active exceptions in the string
      exceptionsData.exceptionMessages = activeExceptions;
      payrollDetails.exceptions = JSON.stringify(exceptionsData);
    }

    (payrollDetails as any).updatedBy = currentUserId;
    await payrollDetails.save();

    // Decrement exceptions count when resolved (only if there are no more active exceptions for this employee)
    // Reuse activeExceptions variable calculated above
    if (activeExceptions.length === 0 && payrollRun.exceptions > 0) {
      // Check if this was the last exception for this employee
      // Note: This is a simplified approach - in production, you might want to track per-employee exception counts
      payrollRun.exceptions = Math.max(0, payrollRun.exceptions - 1);
    }

    (payrollRun as any).updatedBy = currentUserId;
    await payrollRun.save();

    return {
      payrollRun,
      employeePayrollDetails: payrollDetails,
    };
  }

  // Get exceptions for a specific employee in a payroll run
  // BR 9: Exception tracking per employee
  async getEmployeeExceptions(
    employeeId: string,
    payrollRunId: string,
    currentUserId: string,
  ): Promise<{
    activeExceptions: any[];
    resolvedExceptions: any[];
    exceptionHistory: any[];
    deductionsBreakdown: any | null;
  }> {
    const payrollDetails = await this.employeePayrollDetailsModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId) as any,
      payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
    });

    if (!payrollDetails || !payrollDetails.exceptions) {
      return {
        activeExceptions: [],
        resolvedExceptions: [],
        exceptionHistory: [],
        deductionsBreakdown: this.getDeductionsBreakdown(payrollDetails),
      };
    }

    try {
      const exceptionsData = JSON.parse(payrollDetails.exceptions);

      return {
        activeExceptions: (exceptionsData.exceptionMessages || []).filter(
          (e: any) => e.status === 'active',
        ),
        resolvedExceptions: (exceptionsData.exceptionMessages || []).filter(
          (e: any) => e.status === 'resolved',
        ),
        exceptionHistory: exceptionsData.exceptionHistory || [],
        deductionsBreakdown: this.getDeductionsBreakdown(payrollDetails),
      };
    } catch (error) {
      return {
        activeExceptions: [],
        resolvedExceptions: [],
        exceptionHistory: [],
        deductionsBreakdown: this.getDeductionsBreakdown(payrollDetails),
      };
    }
  }

  // Helper: Get historical payroll data for an employee
  // BR 9: Historical payroll data comparison for salary spike detection
  private async getEmployeeHistoricalPayrollData(
    employeeId: string,
    currentPayrollPeriod: Date,
  ): Promise<{
    averageBaseSalary: number;
    previousRunsCount: number;
    previousSalaries: number[];
    lastSalary: number | null;
  } | null> {
    try {
      // Get all previous payroll runs that are locked or approved (completed payrolls)
      // Only consider payrolls before the current period
      const currentPeriodStart = new Date(
        currentPayrollPeriod.getFullYear(),
        currentPayrollPeriod.getMonth(),
        1,
      );

      const previousPayrollRuns = await this.payrollRunModel
        .find({
          payrollPeriod: { $lt: currentPeriodStart },
          status: { $in: [PayRollStatus.LOCKED, PayRollStatus.APPROVED] }, // Only completed payrolls
        })
        .sort({ payrollPeriod: -1 }) // Most recent first
        .limit(12) // Consider last 12 months of payroll history
        .select('_id payrollPeriod')
        .exec();

      if (previousPayrollRuns.length === 0) {
        return {
          averageBaseSalary: 0,
          previousRunsCount: 0,
          previousSalaries: [],
          lastSalary: null,
        };
      }

      const previousPayrollRunIds = previousPayrollRuns.map((run) => run._id);

      // Get employee's payroll details from previous runs
      const previousPayrollDetails = await this.employeePayrollDetailsModel
        .find({
          employeeId: new mongoose.Types.ObjectId(employeeId) as any,
          payrollRunId: { $in: previousPayrollRunIds },
        })
        .select('baseSalary payrollRunId')
        .sort({ payrollRunId: -1 }) // Most recent first
        .exec();

      if (previousPayrollDetails.length === 0) {
        return {
          averageBaseSalary: 0,
          previousRunsCount: 0,
          previousSalaries: [],
          lastSalary: null,
        };
      }

      // Extract base salaries
      const previousSalaries = previousPayrollDetails
        .map((detail) => detail.baseSalary)
        .filter((salary) => salary > 0); // Filter out zero salaries

      if (previousSalaries.length === 0) {
        return {
          averageBaseSalary: 0,
          previousRunsCount: previousPayrollDetails.length,
          previousSalaries: [],
          lastSalary: null,
        };
      }

      // Calculate average base salary
      const sum = previousSalaries.reduce((acc, salary) => acc + salary, 0);
      const averageBaseSalary = sum / previousSalaries.length;
      const lastSalary = previousSalaries[0]; // Most recent salary

      return {
        averageBaseSalary: Math.round(averageBaseSalary * 100) / 100, // Round to 2 decimal places
        previousRunsCount: previousPayrollDetails.length,
        previousSalaries,
        lastSalary,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error getting historical payroll data for employee ${employeeId}: ${errorMessage}`,
      );
      return null;
    }
  }

  // Get all exceptions for a payroll run (across all employees)
  // BR 9: Exception tracking and reporting
  async getAllPayrollExceptions(
    payrollRunId: string,
    currentUserId: string,
  ): Promise<{
    totalExceptions: number;
    activeExceptions: number;
    resolvedExceptions: number;
    employeeExceptions: Array<{
      employeeId: string;
      activeExceptions: any[];
      resolvedExceptions: any[];
    }>;
  }> {
    const payrollDetails = await this.employeePayrollDetailsModel
      .find({
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      })
      .populate('employeeId')
      .exec();

    let totalActive = 0;
    let totalResolved = 0;
    const employeeExceptions: Array<{
      employeeId: string;
      activeExceptions: any[];
      resolvedExceptions: any[];
    }> = [];

    for (const detail of payrollDetails) {
      if (!detail.exceptions) continue;

      try {
        const exceptionsData = JSON.parse(detail.exceptions);
        const active = (exceptionsData.exceptionMessages || []).filter(
          (e: any) => e.status === 'active',
        );
        const resolved = (exceptionsData.exceptionMessages || []).filter(
          (e: any) => e.status === 'resolved',
        );

        totalActive += active.length;
        totalResolved += resolved.length;

        const employeeId =
          (detail.employeeId as any)._id?.toString() ||
          (detail.employeeId as any).toString();
        employeeExceptions.push({
          employeeId,
          activeExceptions: active,
          resolvedExceptions: resolved,
        });
      } catch (error) {
        // Skip invalid exception data
        continue;
      }
    }

    return {
      totalExceptions: totalActive + totalResolved,
      activeExceptions: totalActive,
      resolvedExceptions: totalResolved,
      employeeExceptions,
    };
  }

  // REQ-PY-22: Payroll Manager approve payroll runs
  // BR: Enforce proper workflow sequence
  async approvePayrollRun(
    managerApprovalDto: ManagerApprovalReviewDto,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(
      managerApprovalDto.payrollRunId,
    );
    if (!payrollRun) throw new Error('Payroll run not found');

    if (managerApprovalDto.managerDecision === PayRollStatus.APPROVED) {
      // Validate status transition (UNDER_REVIEW → PENDING_FINANCE_APPROVAL)
      this.validateStatusTransition(
        payrollRun.status,
        PayRollStatus.PENDING_FINANCE_APPROVAL,
      );

      payrollRun.status = PayRollStatus.PENDING_FINANCE_APPROVAL;

      // Set manager approval date with validation
      if (managerApprovalDto.managerApprovalDate) {
        const approvalDate = new Date(managerApprovalDto.managerApprovalDate);
        // Validate that approval date is not in the future
        const now = new Date();
        if (approvalDate > now) {
          throw new Error('Manager approval date cannot be in the future');
        }
        payrollRun.managerApprovalDate = approvalDate;
      } else {
        payrollRun.managerApprovalDate = new Date();
      }

      // Update manager assignment if provided
      if (managerApprovalDto.payrollManagerId) {
        payrollRun.payrollManagerId = new mongoose.Types.ObjectId(
          managerApprovalDto.payrollManagerId,
        ) as any;
      }
    } else if (managerApprovalDto.managerDecision === PayRollStatus.REJECTED) {
      // Validate status transition (UNDER_REVIEW → REJECTED)
      this.validateStatusTransition(payrollRun.status, PayRollStatus.REJECTED);

      payrollRun.status = PayRollStatus.REJECTED;
      payrollRun.rejectionReason =
        managerApprovalDto.managerComments || 'Rejected by Manager';
    } else {
      throw new Error(
        `Invalid manager decision: ${managerApprovalDto.managerDecision}. Must be '${PayRollStatus.APPROVED}' or '${PayRollStatus.REJECTED}'`,
      );
    }

    (payrollRun as any).updatedBy = currentUserId;
    const savedPayrollRun = await payrollRun.save();

    // Send notifications based on decision
    if (managerApprovalDto.managerDecision === PayRollStatus.APPROVED) {
      // Notify Finance Staff
      if (payrollRun.financeStaffId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_MANAGER_APPROVED,
          payrollRun.financeStaffId.toString(),
          `Payroll run ${payrollRun.runId} has been approved by manager. Awaiting finance approval.`,
          { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
          'Manager Approval Received',
        );
      }
      
      // Notify Payroll Specialist
      if (payrollRun.payrollSpecialistId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_MANAGER_APPROVED,
          payrollRun.payrollSpecialistId.toString(),
          `Payroll run ${payrollRun.runId} has been approved by manager`,
          { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId },
          'Manager Approval Received',
        );
      }
    } else {
      // Notify Payroll Specialist about rejection
      if (payrollRun.payrollSpecialistId) {
        await this.sendPayrollNotification(
          NotificationType.PAYROLL_MANAGER_REJECTED,
          payrollRun.payrollSpecialistId.toString(),
          `Payroll run ${payrollRun.runId} has been rejected by manager. Reason: ${managerApprovalDto.managerComments || 'No reason provided'}`,
          { payrollRunId: payrollRun._id.toString(), runId: payrollRun.runId, reason: managerApprovalDto.managerComments },
          'Manager Rejection',
        );
      }
    }

    return savedPayrollRun;
  }

  // Get all payroll runs with optional filtering
  async getAllPayrollRuns(
    status: string | undefined,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<{ data: payrollRuns[]; total: number; page: number; limit: number }> {
    try {
      const query: any = {};
      
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      
      const [payrollRuns, total] = await Promise.all([
        this.payrollRunModel
          .find(query)
          .populate('payrollSpecialistId', 'firstName lastName')
          .populate('payrollManagerId', 'firstName lastName')
          .populate('financeStaffId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.payrollRunModel.countDocuments(query).exec(),
      ]);

      return {
        data: payrollRuns,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to retrieve payroll runs: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Get payroll run by runId
  async getPayrollRunByRunId(runId: string, currentUserId: string): Promise<payrollRuns> {
    try {
      const payrollRun = await this.payrollRunModel
        .findOne({ runId })
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!payrollRun) {
        throw new Error(`Payroll run with runId ${runId} not found`);
      }

      return payrollRun;
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        throw error;
      }
      throw new Error(
        `Failed to retrieve payroll run: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
