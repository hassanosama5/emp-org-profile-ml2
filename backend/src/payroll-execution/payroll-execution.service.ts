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
    // PayrollConfigurationService is exported from PayrollConfigurationModule - inject directly
    private readonly payrollConfigurationService: PayrollConfigurationService,
    // PayrollTrackingService uses forwardRef due to potential circular dependency
    @Inject(forwardRef(() => PayrollTrackingService))
    private payrollTrackingService: PayrollTrackingService,
    // EmployeeProfileService is exported from EmployeeProfileModule - inject directly
    private readonly employeeProfileService: EmployeeProfileService,
    // LeavesService is exported from LeavesModule - inject directly
    private readonly leavesService: LeavesService,
  ) {}

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
    canInitiate: boolean;
    pendingSigningBonuses: number;
    pendingTerminationBenefits: number;
    pendingItems: Array<{
      type: 'signing_bonus' | 'termination_benefit';
      id: string;
      employeeId: string;
      employeeNumber?: string;
      itemName: string;
      amount: number;
      createdAt: Date;
    }>;
  }> {
    const validationResult = await this.validatePreInitiationRequirements();

    const pendingItems: Array<{
      type: 'signing_bonus' | 'termination_benefit';
      id: string;
      employeeId: string;
      employeeNumber?: string;
      itemName: string;
      amount: number;
      createdAt: Date;
    }> = [];

    if (validationResult.pendingSigningBonuses) {
      for (const bonus of validationResult.pendingSigningBonuses) {
        pendingItems.push({
          type: 'signing_bonus',
          id: bonus.id,
          employeeId: bonus.employeeId,
          employeeNumber: bonus.employeeNumber,
          itemName: bonus.bonusName || 'Signing Bonus',
          amount: bonus.givenAmount || 0,
          createdAt: bonus.createdAt,
        });
      }
    }

    if (validationResult.pendingTerminationBenefits) {
      for (const benefit of validationResult.pendingTerminationBenefits) {
        pendingItems.push({
          type: 'termination_benefit',
          id: benefit.id,
          employeeId: benefit.employeeId,
          employeeNumber: benefit.employeeNumber,
          itemName: benefit.benefitName || 'Termination Benefit',
          amount: benefit.givenAmount || 0,
          createdAt: benefit.createdAt,
        });
      }
    }

    return {
      canInitiate: validationResult.isValid,
      pendingSigningBonuses:
        validationResult.pendingSigningBonuses?.length || 0,
      pendingTerminationBenefits:
        validationResult.pendingTerminationBenefits?.length || 0,
      pendingItems,
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
    return await payrollRun.save();
  }

  async unlockPayroll(
    runId: string,
    unlockReason: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(runId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Validate status transition
    this.validateStatusTransition(payrollRun.status, PayRollStatus.UNLOCKED);

    if (!unlockReason || unlockReason.trim().length === 0) {
      throw new Error('Unlock reason is required when unlocking a payroll run');
    }

    payrollRun.status = PayRollStatus.UNLOCKED;
    payrollRun.unlockReason = unlockReason;
    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
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

  // REQ-PY-19: Unfreeze payrolls with reason (alias for unlockPayroll to match requirement terminology)
  // Note: Unfreeze and Unlock are functionally the same - both set status to UNLOCKED
  // This method provides the "unfreeze" terminology as mentioned in requirements
  async unfreezePayroll(
    runId: string,
    unfreezeReason: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    // Unfreeze is functionally the same as unlock - both allow modifications with reason
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

    return await payrollRun.save();
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

  // Helper: Validate payroll period against employee contract dates
  // BR 1: Employment contract requirements
  // BR 2: Contract terms validation
  private async validatePayrollPeriodAgainstContracts(
    payrollPeriod: Date,
  ): Promise<void> {
    const year = payrollPeriod.getFullYear();
    const month = payrollPeriod.getMonth();
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Get all active employees to validate their contract dates
    const employeesResult = await this.employeeProfileService.findAll({
      status: EmployeeStatus.ACTIVE,
    } as any);
    const activeEmployees = Array.isArray(employeesResult)
      ? employeesResult
      : (employeesResult as any).data || [];

    const contractViolations: string[] = [];

    for (const employee of activeEmployees) {
      const employeeData = employee as any;
      const contractStartDate = employeeData.contractStartDate;
      const contractEndDate = employeeData.contractEndDate;
      const dateOfHire = employeeData.dateOfHire;
      const employeeNumber =
        employeeData.employeeNumber ||
        employeeData._id?.toString() ||
        'Unknown';

      // If contract dates are specified, validate against them
      if (contractStartDate || contractEndDate) {
        const contractStart = contractStartDate
          ? new Date(contractStartDate)
          : null;
        const contractEnd = contractEndDate ? new Date(contractEndDate) : null;

        // Check if payroll period is before contract start date
        if (contractStart && periodEnd < contractStart) {
          contractViolations.push(
            `Employee ${employeeNumber}: Payroll period (${year}-${String(month + 1).padStart(2, '0')}) is before contract start date (${contractStart.toISOString().split('T')[0]})`,
          );
        }

        // Check if payroll period is after contract end date
        if (contractEnd && periodStart > contractEnd) {
          contractViolations.push(
            `Employee ${employeeNumber}: Payroll period (${year}-${String(month + 1).padStart(2, '0')}) is after contract end date (${contractEnd.toISOString().split('T')[0]})`,
          );
        }
      } else {
        // If contract dates are not specified, validate against date of hire
        // Payroll period should not be before date of hire
        if (dateOfHire) {
          const hireDate = new Date(dateOfHire);
          hireDate.setHours(0, 0, 0, 0);

          if (periodEnd < hireDate) {
            contractViolations.push(
              `Employee ${employeeNumber}: Payroll period (${year}-${String(month + 1).padStart(2, '0')}) is before date of hire (${hireDate.toISOString().split('T')[0]})`,
            );
          }
        }
      }
    }

    // If there are contract violations, throw error with details
    if (contractViolations.length > 0) {
      const violationCount = contractViolations.length;
      const violationDetails = contractViolations.slice(0, 5).join('; '); // Show first 5 violations
      const moreViolations =
        violationCount > 5 ? ` and ${violationCount - 5} more` : '';

      throw new Error(
        `Payroll period validation failed: ${violationCount} employee(s) have contract date violations. ` +
          `Details: ${violationDetails}${moreViolations}. ` +
          `Please ensure all employees have valid contracts for the payroll period.`,
      );
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
      return await payrollRun.save();
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

    // Get all active employees using EmployeeProfileService
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employeesResult = await this.employeeProfileService.findAll({
      status: EmployeeStatus.ACTIVE,
      page: 1,
      limit: 10000, // Get all active employees
    } as any);
    const allEmployees = Array.isArray(employeesResult)
      ? employeesResult
      : (employeesResult as any).data || [];

    // Filter employees hired within last 30 days
    const recentEmployees = allEmployees.filter((emp: any) => {
      return emp.dateOfHire && new Date(emp.dateOfHire) >= thirtyDaysAgo;
    });

    // Get all approved signing bonuses using PayrollConfigurationService
    const signingBonusesResult = await this.payrollConfigurationService.findAllSigningBonuses({
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved signing bonuses
    });
    const approvedSigningBonuses = signingBonusesResult?.data || [];

    const processedBonuses: employeeSigningBonus[] = [];

    for (const employee of recentEmployees) {
      // Check if signing bonus already exists for this employee
      const existingBonus = await this.employeeSigningBonusModel.findOne({
        employeeId: employee._id,
      });

      if (existingBonus) {
        continue; // Skip if already processed
      }

      // BR 24: Check if employee is eligible for signing bonus according to their contract
      // Find contract via Onboarding (employeeId -> contractId)
      const onboarding = await OnboardingModel.findOne({
        employeeId: employee._id,
      });
      let isEligible = false;
      let contractSigningBonus: number | undefined = undefined;

      if (onboarding && onboarding.contractId) {
        const contract = await ContractModel.findById(onboarding.contractId);
        if (
          contract &&
          contract.signingBonus !== undefined &&
          contract.signingBonus !== null &&
          contract.signingBonus > 0
        ) {
          isEligible = true;
          contractSigningBonus = contract.signingBonus;
        }
      }

      // If contract doesn't have signingBonus or employee doesn't have onboarding, skip
      if (!isEligible) {
        continue; // Employee not eligible according to contract (BR 24)
      }

      // Get employee's position
      if (!employee.primaryPositionId) {
        continue;
      }

      const position = await PositionModel.findById(employee.primaryPositionId);
      if (!position) {
        continue;
      }

      // Find matching signing bonus configuration by position title
      const signingBonusConfig = approvedSigningBonuses.find(
        (bonus: any) => bonus.positionName === (position as any).title,
      );

      if (signingBonusConfig) {
        const bonusData = signingBonusConfig as any;
        // Use contract signingBonus amount if available, otherwise use configuration amount
        // Priority: contract signingBonus > configuration amount
        const finalAmount =
          contractSigningBonus !== undefined
            ? contractSigningBonus
            : bonusData.amount;

        // Create employee signing bonus record
        const employeeBonus = new this.employeeSigningBonusModel({
          employeeId: employee._id as any,
          signingBonusId: bonusData._id as any,
          givenAmount: finalAmount, // Use contract amount if available (BR 24), otherwise configuration amount
          status: BonusStatus.PENDING,
          createdBy: currentUserId,
          updatedBy: currentUserId,
        });

        await employeeBonus.save();
        processedBonuses.push(employeeBonus);
      }
    }

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
    }).exec();

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

      // Get all approved termination/resignation benefits using PayrollConfigurationService
      const benefitsResult = await this.payrollConfigurationService.findAllTerminationBenefits({
        status: ConfigStatus.APPROVED,
        limit: 1000 // Get all approved termination benefits
      });
      const benefits = benefitsResult?.data || [];

      // For each approved benefit, create a record
      for (const benefit of benefits) {
        const benefitData = benefit as any;
        const employeeBenefit = new this.employeeTerminationResignationModel({
          employeeId: termination.employeeId as any,
          benefitId: benefitData._id as any,
          givenAmount: benefitData.amount, // Set from configuration amount
          terminationId: termination._id as any,
          status: BenefitStatus.PENDING,
          createdBy: currentUserId,
          updatedBy: currentUserId,
        });

        await employeeBenefit.save();
        processedBenefits.push(employeeBenefit);
      }
    }

    return processedBenefits;
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
    // BR 35: Taxes = % of Base Salary, Social/Health Insurance
    // BR 31: Store all calculation elements for auditability
    const statutoryBreakdown = await this.applyStatutoryRulesWithBreakdown(
      actualBaseSalary,
      employeeId,
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
  // BR 35: Taxes = % of Base Salary, Social/Health Insurance
  // Note: All calculations are based on baseSalary per BR 35
  private async applyStatutoryRulesWithBreakdown(
    baseSalary: number,
    employeeId: string,
  ): Promise<{
    total: number;
    taxes: number;
    insurance: number;
  }> {
    // Input validation
    if (!baseSalary || baseSalary < 0) {
      throw new Error('Base salary must be a positive number');
    }

    let totalTaxes = 0;
    let totalInsurance = 0;

    // Get tax rules using PayrollConfigurationService
    // BR 35: Taxes = % of Base Salary
    // Note: Tax rules apply to all salaries (no brackets in taxRules schema)
    const taxRulesResult = await this.payrollConfigurationService.findAllTaxRules({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved tax rules
    });
    
    for (const rule of taxRulesResult?.data || []) {
      const ruleData = rule as any;
      // Tax rules use 'rate' field (percentage), and apply to all base salaries
      // BR 35: Taxes calculated as percentage of base salary
      if (ruleData.rate && ruleData.rate > 0) {
        const taxAmount = (baseSalary * ruleData.rate) / 100;
        totalTaxes += taxAmount;
      }
    }

    // Get pension/insurance rules using PayrollConfigurationService
    // BR 35: Social/Health Insurance = % of Base Salary (within salary brackets)
    const insuranceRulesResult = await this.payrollConfigurationService.findAllInsuranceBrackets({ 
      status: ConfigStatus.APPROVED,
      limit: 1000 // Get all approved insurance brackets
    });
    
    for (const rule of insuranceRulesResult?.data || []) {
      const ruleData = rule as any;
      // Insurance brackets use 'minSalary' and 'maxSalary' fields, and 'employeeRate' (percentage)
      // BR 35: Insurance calculated as percentage of base salary within applicable bracket
      if (
        baseSalary >= ruleData.minSalary &&
        (ruleData.maxSalary === null ||
          ruleData.maxSalary === undefined ||
          baseSalary <= ruleData.maxSalary)
      ) {
        // Use employeeRate for employee deductions (employerRate is for employer contributions)
        if (ruleData.employeeRate && ruleData.employeeRate > 0) {
          const insuranceAmount = (baseSalary * ruleData.employeeRate) / 100;
          totalInsurance += insuranceAmount;
        }
        // Note: If insurance bracket has a fixed 'amount' field, it could be added here
        // Currently using percentage-based calculation per BR 35
      }
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

      // Get applicable tax rules
      // Note: Tax rules schema doesn't have minAmount/maxAmount fields - all approved tax rules apply
      // Filter to ensure only APPROVED rules are used (additional safety check)
      const applicableTaxRules = allTaxRules
        .filter((rule: any) => {
          const ruleData = rule.toObject ? rule.toObject() : rule;
          // Ensure rule is APPROVED (additional validation)
          return ruleData.status === ConfigStatus.APPROVED;
        })
        .map((rule: any) => ({
          ...(rule.toObject ? rule.toObject() : rule),
          _id: rule._id,
        }));

      // Get applicable insurance brackets (based on baseSalary)
      // Filter by salary range and ensure only APPROVED brackets are used
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
        .map((rule: any) => ({
          ...(rule.toObject ? rule.toObject() : rule),
          _id: rule._id,
        }));

      // Get penalties for this employee
      // Note: Penalties are now calculated via calculatePenaltiesWithBreakdown() which uses TimeManagement and Leaves services
      // This model access is kept for legacy/compatibility but penalties are primarily calculated from TimeManagement and Leaves
      const penalties = await this.employeePenaltiesModel
        .findOne({
          employeeId: employeeObjectId,
          // Would filter by payroll period if available
        })
        .exec();

      // Calculate total gross salary
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
          // Insurance brackets use 'employeeRate' field (percentage), not 'percentage'
          return sum + (baseSalary * (rule.employeeRate || 0)) / 100;
        },
        0,
      );
      const totalPenaltiesAmount = penalties
        ? (penalties as any).amount || 0
        : 0;
      const totaDeductions =
        totalTaxAmount + totalInsuranceAmount + totalPenaltiesAmount;

      // Check if payslip already exists for this employee and payroll run to avoid duplicates
      const existingPayslip = await this.paySlipModel.findOne({
        employeeId: employeeObjectId,
        payrollRunId: new mongoose.Types.ObjectId(payrollRunId) as any,
      });

      if (existingPayslip) {
        console.log(`[Generate Payslips] Payslip already exists for employee ${employeeId} in payroll run ${payrollRunId}. Skipping creation.`);
        generatedPayslips.push(existingPayslip as any);
        continue;
      }

      // Create payslip with proper structure matching schema
      let payslip: any = null;
      try {
        console.log(`[Generate Payslips] Creating payslip for employee ${employeeId}...`);
        
        const payrollRunObjectId = new mongoose.Types.ObjectId(payrollRunId);
        
        // Ensure arrays are always arrays (not undefined) to match schema requirements
        const payslipData = {
          employeeId: employeeObjectId,
          payrollRunId: payrollRunObjectId,
          earningsDetails: {
            baseSalary: baseSalary,
            allowances: Array.isArray(applicableAllowances) ? applicableAllowances : [],
            bonuses: Array.isArray(signingBonusConfigs) && signingBonusConfigs.length > 0 
              ? signingBonusConfigs 
              : undefined,
            benefits: Array.isArray(terminationBenefitConfigs) && terminationBenefitConfigs.length > 0
              ? terminationBenefitConfigs
              : undefined,
            refunds: Array.isArray(refundDetailsList) && refundDetailsList.length > 0 
              ? refundDetailsList 
              : undefined,
          },
          deductionsDetails: {
            taxes: Array.isArray(applicableTaxRules) ? applicableTaxRules : [],
            insurances: Array.isArray(applicableInsuranceBrackets) && applicableInsuranceBrackets.length > 0
              ? applicableInsuranceBrackets
              : undefined,
            penalties: penalties ? penalties : undefined,
          },
          totalGrossSalary: totalGrossSalary,
          totaDeductions: totaDeductions,
          netPay: detail.netPay,
          paymentStatus: PaySlipPaymentStatus.PENDING, // Default status
        };

        payslip = new this.paySlipModel(payslipData);

        console.log(`[Generate Payslips] Saving payslip for employee ${employeeId}...`);
        const savedPayslip = await payslip.save();
        console.log(`[Generate Payslips] Successfully saved payslip ${savedPayslip._id} for employee ${employeeId} in MongoDB`);
        
        // Verify the payslip was actually saved by querying it back
        const verifiedPayslip = await this.paySlipModel.findById(savedPayslip._id);
        if (!verifiedPayslip) {
          throw new Error(`Payslip was not found in database after save. Save operation may have failed.`);
        }
        
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

      // Only process refunds and distribute if payslip was successfully created
      if (!payslip) {
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

    if (generatedPayslips.length === 0) {
      throw new Error(
        `Failed to generate any payslips. Check the logs for validation errors.`,
      );
    }

    return {
      message: `Generated ${generatedPayslips.length} payslips via ${distributionMethod}`,
      payslips: generatedPayslips,
      distributionMethod,
      totalEmployees: payrollDetails.length,
      successful: generatedPayslips.length,
      failed: payrollDetails.length - generatedPayslips.length,
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
  async sendForApproval(
    payrollRunId: string,
    managerId: string,
    financeStaffId: string,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');

    // Validate status transition (DRAFT → UNDER_REVIEW)
    this.validateStatusTransition(
      payrollRun.status,
      PayRollStatus.UNDER_REVIEW,
    );

    payrollRun.status = PayRollStatus.UNDER_REVIEW;
    payrollRun.payrollManagerId = new mongoose.Types.ObjectId(managerId) as any;
    payrollRun.financeStaffId = new mongoose.Types.ObjectId(
      financeStaffId,
    ) as any;
    (payrollRun as any).updatedBy = currentUserId;

    return await payrollRun.save();
  }

  // REQ-PY-15: Finance Staff approve payroll disbursements before execution
  // BR: Enforce proper workflow sequence
  async approvePayrollDisbursement(
    financeDecisionDto: FinanceDecisionDto,
    currentUserId: string,
  ): Promise<payrollRuns> {
    const payrollRun = await this.payrollRunModel.findById(
      financeDecisionDto.payrollRunId,
    );
    if (!payrollRun) throw new Error('Payroll run not found');

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
    } else {
      // Validate status transition (PENDING_FINANCE_APPROVAL → REJECTED)
      this.validateStatusTransition(payrollRun.status, PayRollStatus.REJECTED);

      payrollRun.status = PayRollStatus.REJECTED;
      payrollRun.rejectionReason =
        financeDecisionDto.reason || 'Rejected by Finance';
    }

    (payrollRun as any).updatedBy = currentUserId;
    return await payrollRun.save();
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
        exception.status = 'resolved';
        exception.resolvedBy = managerId;
        exception.resolvedAt = new Date().toISOString();
        exception.resolution = resolution;
        exceptionFound = true;

        // Add to history
        exceptionsData.exceptionHistory.push({
          ...exception,
          action: 'resolved',
        });
        break;
      }
    }

    if (!exceptionFound) {
      throw new Error(
        `Active exception with code ${exceptionCode} not found for employee ${employeeId}`,
      );
    }

    // Update the exceptions field
    payrollDetails.exceptions = JSON.stringify(exceptionsData);
    (payrollDetails as any).updatedBy = currentUserId;
    await payrollDetails.save();

    // Decrement exceptions count when resolved (only if there are no more active exceptions for this employee)
    const activeExceptions = exceptionsData.exceptionMessages.filter(
      (e: any) => e.status === 'active',
    );
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
    return await payrollRun.save();
  }
}
