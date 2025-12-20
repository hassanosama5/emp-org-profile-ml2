import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { claims } from './models/claims.schema';
import { disputes } from './models/disputes.schema';
import { refunds } from './models/refunds.schema';
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';
import { EmployeeStatus } from '../employee-profile/enums/employee-profile.enums';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { PayrollConfigurationService } from '../payroll-configuration/payroll-configuration.service';
import { LeavesService } from '../leaves/leaves.service';
import { TimeManagementService } from '../time-management/services/time-management.service';
import { paySlip, PayslipDocument } from '../payroll-execution/models/payslip.schema';
import { payrollRuns, payrollRunsDocument } from '../payroll-execution/models/payrollRuns.schema';
import { LeaveEntitlement, LeaveEntitlementDocument } from '../leaves/models/leave-entitlement.schema';
import { LeaveRequest, LeaveRequestDocument } from '../leaves/models/leave-request.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../time-management/models/attendance-record.schema';
import { TimeException, TimeExceptionDocument } from '../time-management/models/time-exception.schema';
import { TimeExceptionType, TimeExceptionStatus } from '../time-management/models/enums/index';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';
import { Position, PositionDocument } from '../organization-structure/models/position.schema';
import { PositionAssignment, PositionAssignmentDocument } from '../organization-structure/models/position-assignment.schema';
import { LeaveStatus } from '../leaves/enums/leave-status.enum';
import { PaySlipPaymentStatus } from '../payroll-execution/enums/payroll-execution-enum';
import { CreateClaimDTO } from './dto/CreateClaimDTO.dto';
import { UpdateClaimDTO } from './dto/UpdateClaimDTO.dto';
import { CreateDisputeDTO } from './dto/CreateDisputeDTO.dto';
import { UpdateDisputeDTO } from './dto/UpdateDisputeDTO.dto';
import { CreateRefundDTO } from './dto/CreateRefundDTO.dto';
import { UpdateRefundDTO } from './dto/UpdateRefundDTO.dto';
import { ApproveClaimBySpecialistDTO } from './dto/ApproveClaimBySpecialistDTO.dto';
import { RejectClaimBySpecialistDTO } from './dto/RejectClaimBySpecialistDTO.dto';
import { ConfirmClaimApprovalDTO } from './dto/ConfirmClaimApprovalDTO.dto';
import { ApproveDisputeBySpecialistDTO } from './dto/ApproveDisputeBySpecialistDTO.dto';
import { RejectDisputeBySpecialistDTO } from './dto/RejectDisputeBySpecialistDTO.dto';
import { ConfirmDisputeApprovalDTO } from './dto/ConfirmDisputeApprovalDTO.dto';
import { GenerateRefundForDisputeDTO } from './dto/GenerateRefundForDisputeDTO.dto';
import { GenerateRefundForClaimDTO } from './dto/GenerateRefundForClaimDTO.dto';
import { ProcessRefundDTO } from './dto/ProcessRefundDTO.dto';
import {
  ClaimStatus,
  DisputeStatus,
  RefundStatus,
} from './enums/payroll-tracking-enum';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { ConfigStatus } from '../payroll-configuration/enums/payroll-configuration-enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmployeeSystemRole } from '../employee-profile/models/employee-system-role.schema';

@Injectable()
export class PayrollTrackingService {
  constructor(
    @InjectModel(claims.name) private readonly claimModel: Model<claims>,
    @InjectModel(disputes.name) private readonly disputeModel: Model<disputes>,
    @InjectModel(refunds.name) private readonly refundModel: Model<refunds>,
    @InjectModel(EmployeeProfile.name)
    private readonly employeeProfileModel: Model<EmployeeProfileDocument>,
    @Inject(forwardRef(() => EmployeeProfileService))
    private readonly employeeProfileService: EmployeeProfileService,
    @Inject(PayrollConfigurationService)
    private readonly payrollConfigurationService: PayrollConfigurationService,
    @Inject(LeavesService)
    private readonly leavesService: LeavesService,
    @Inject(forwardRef(() => TimeManagementService))
    private readonly timeManagementService: TimeManagementService,
    @InjectModel(paySlip.name) private readonly payslipModel: Model<PayslipDocument>,
    @InjectModel(payrollRuns.name) private readonly payrollRunsModel: Model<payrollRunsDocument>,
    @InjectModel(LeaveEntitlement.name)
    private readonly leaveEntitlementModel: Model<LeaveEntitlementDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly leaveRequestModel: Model<LeaveRequestDocument>,
    @InjectModel(AttendanceRecord.name)
    private readonly attendanceRecordModel: Model<AttendanceRecordDocument>,
    @InjectModel(TimeException.name)
    private readonly timeExceptionModel: Model<TimeExceptionDocument>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Position.name)
    private readonly positionModel: Model<PositionDocument>,
    @InjectModel(PositionAssignment.name)
    private readonly positionAssignmentModel: Model<PositionAssignmentDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private readonly employeeSystemRoleModel: Model<any>,
    @InjectModel('NotificationLog')
    private readonly notificationLogModel: Model<any>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  // Helper method to generate unique IDs
  private async generateClaimId(): Promise<string> {
    try {
    const year = new Date().getFullYear();
      const count = await this.claimModel.countDocuments({
        claimId: new RegExp(`^CLAIM-${year}-`),
      });
    const sequence = String(count + 1).padStart(4, '0');
    return `CLAIM-${year}-${sequence}`;
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to generate claim ID: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  private async generateDisputeId(): Promise<string> {
    try {
    const year = new Date().getFullYear();
      const count = await this.disputeModel.countDocuments({
        disputeId: new RegExp(`^DISP-${year}-`),
      });
    const sequence = String(count + 1).padStart(4, '0');
    return `DISP-${year}-${sequence}`;
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to generate dispute ID: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Helper method to validate and convert ObjectId
  private validateObjectId(id: string, fieldName: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid ${fieldName}: ${id} is not a valid MongoDB ObjectId`,
      );
    }
    return new Types.ObjectId(id);
  }

  /**
   * Validates that an employee exists in the employee-profile collection.
   * Optionally checks if the employee is active.
   * Uses EmployeeProfileService for proper validation and error handling.
   * @param employeeId - The employee ID to validate
   * @param checkActive - If true, also validates that employee status is ACTIVE
   * @returns The validated ObjectId
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if employee is not active (when checkActive is true)
   */
  private async validateEmployeeExists(
    employeeId: string,
    checkActive = true,
  ): Promise<Types.ObjectId> {
    const validEmployeeId = this.validateObjectId(employeeId, 'employeeId');

    // Use EmployeeProfileService for validation (handles NotFoundException automatically)
    const employee = await this.employeeProfileService.findOne(employeeId);

    if (checkActive && employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException(
        `Employee with ID ${employeeId} is not active. Current status: ${employee.status}`,
      );
    }

    return validEmployeeId;
  }

  /**
   * Helper method to enrich tax deduction with full tax rule details from PayrollConfigurationService
   * @param taxDeduction - The tax deduction from payslip (embedded taxRules document)
   * @returns Enriched tax deduction with full configuration details
   */
  private async enrichTaxDeductionWithConfiguration(taxDeduction: any): Promise<any> {
    try {
      if (!taxDeduction || !taxDeduction.name) {
        return taxDeduction;
      }

      // Try to find tax rule by name (since payslip stores embedded documents)
      const taxRulesResult = await this.payrollConfigurationService.findAllTaxRules({
        status: ConfigStatus.APPROVED,
        page: 1,
        limit: 100, // Get all approved tax rules
      });

      const matchingTaxRule = taxRulesResult.data.find(
        (rule: any) => rule.name === taxDeduction.name || rule._id?.toString() === taxDeduction._id?.toString(),
      );

      if (matchingTaxRule) {
        return {
          ...taxDeduction,
          configurationDetails: {
            name: matchingTaxRule.name,
            description: matchingTaxRule.description,
            rate: matchingTaxRule.rate,
            status: matchingTaxRule.status,
            approvedAt: matchingTaxRule.approvedAt,
            approvedBy: matchingTaxRule.approvedBy,
          },
        };
      }

      // If not found, return original with warning
      return {
        ...taxDeduction,
        configurationDetails: {
          warning: 'Tax rule configuration not found or not approved',
          status: taxDeduction.status || 'unknown',
        },
      };
    } catch (error: any) {
      // If service call fails, return original deduction
      console.warn(`Failed to enrich tax deduction: ${error?.message}`);
      return taxDeduction;
    }
  }

  /**
   * Helper method to enrich insurance deduction with full insurance bracket details from PayrollConfigurationService
   * @param insuranceDeduction - The insurance deduction from payslip (embedded insuranceBrackets document)
   * @returns Enriched insurance deduction with full configuration details
   */
  private async enrichInsuranceDeductionWithConfiguration(insuranceDeduction: any): Promise<any> {
    try {
      if (!insuranceDeduction || !insuranceDeduction.name) {
        return insuranceDeduction;
      }

      // Try to find insurance bracket by name
      const insuranceBracketsResult = await this.payrollConfigurationService.findAllInsuranceBrackets({
        status: ConfigStatus.APPROVED,
        page: 1,
        limit: 100, // Get all approved insurance brackets
      });

      const matchingBracket = insuranceBracketsResult.data.find(
        (bracket: any) => bracket.name === insuranceDeduction.name || bracket._id?.toString() === insuranceDeduction._id?.toString(),
      );

      if (matchingBracket) {
        return {
          ...insuranceDeduction,
          configurationDetails: {
            name: matchingBracket.name,
            minSalary: matchingBracket.minSalary,
            maxSalary: matchingBracket.maxSalary,
            employeeRate: matchingBracket.employeeRate,
            employerRate: matchingBracket.employerRate,
            status: matchingBracket.status,
            approvedAt: matchingBracket.approvedAt,
            approvedBy: matchingBracket.approvedBy,
          },
        };
      }

      // If not found, return original with warning
      return {
        ...insuranceDeduction,
        configurationDetails: {
          warning: 'Insurance bracket configuration not found or not approved',
          status: insuranceDeduction.status || 'unknown',
        },
      };
    } catch (error: any) {
      // If service call fails, return original deduction
      console.warn(`Failed to enrich insurance deduction: ${error?.message}`);
      return insuranceDeduction;
    }
  }

  /**
   * Validates that a user has permission to access an employee's data.
   * 
   * Security Rule:
   * - DEPARTMENT_EMPLOYEE can only access their own data
   * - PAYROLL_SPECIALIST, PAYROLL_MANAGER, FINANCE_STAFF, and SYSTEM_ADMIN can access any employee's data
   * 
   * @param requestedEmployeeId - The employee ID being accessed
   * @param authenticatedUserId - The authenticated user's ID (from req.user)
   * @param userRoles - The authenticated user's roles (from EmployeeSystemRole)
   * @throws ForbiddenException if DEPARTMENT_EMPLOYEE tries to access another employee's data
   * 
   * Note: This method should be called from service methods that access employee-specific data.
   * The controller should extract the user from req.user and pass it to the service.
   */
  private validateEmployeeAccess(
    requestedEmployeeId: string,
    authenticatedUserId: string | undefined,
    userRoles: SystemRole[] | undefined,
  ): void {
    // If no authenticated user or roles provided, skip validation
    // (This allows the method to work without authentication for testing or admin access)
    if (!authenticatedUserId || !userRoles || userRoles.length === 0) {
      return;
    }

    // Convert to ObjectId strings for comparison
    const requestedId = requestedEmployeeId.toString();
    const authenticatedId = authenticatedUserId.toString();

    // Check if user is a regular employee (not staff/admin)
    const isRegularEmployee = userRoles.some(
      (role) =>
        role === SystemRole.DEPARTMENT_EMPLOYEE &&
        !userRoles.includes(SystemRole.PAYROLL_SPECIALIST) &&
        !userRoles.includes(SystemRole.PAYROLL_MANAGER) &&
        !userRoles.includes(SystemRole.FINANCE_STAFF) &&
        !userRoles.includes(SystemRole.SYSTEM_ADMIN),
    );

    // If user is a regular employee, they can only access their own data
    if (isRegularEmployee && requestedId !== authenticatedId) {
      throw new ForbiddenException(
        'You do not have permission to access this employee\'s data. You can only access your own data.',
      );
    }

    // Staff roles (PAYROLL_SPECIALIST, PAYROLL_MANAGER, FINANCE_STAFF, SYSTEM_ADMIN) can access any employee's data
    // No additional validation needed
  }

  /**
   * Helper method to get payroll period date range
   * @param payrollRun - The payroll run document
   * @returns Object with startDate and endDate for the payroll period
   */
  private getPayrollPeriodDateRange(payrollRun: any): { startDate: Date; endDate: Date } {
    if (!payrollRun || !payrollRun.payrollPeriod) {
      throw new BadRequestException('Invalid payroll run: missing payroll period');
    }

    const payrollPeriod = new Date(payrollRun.payrollPeriod);
    // Assuming monthly payroll: start of month to end of month
    const startDate = new Date(payrollPeriod.getFullYear(), payrollPeriod.getMonth(), 1);
    const endDate = new Date(payrollPeriod.getFullYear(), payrollPeriod.getMonth() + 1, 0, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Helper method to check if a date falls within a date range
   * @param date - The date to check
   * @param startDate - Start of the range
   * @param endDate - End of the range
   * @returns true if date is within range
   */
  private isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return checkDate >= start && checkDate <= end;
  }

  /**
   * Helper method to check if a date range overlaps with another date range
   * @param range1Start - Start of first range
   * @param range1End - End of first range
   * @param range2Start - Start of second range
   * @param range2End - End of second range
   * @returns true if ranges overlap
   */
  private doDateRangesOverlap(
    range1Start: Date,
    range1End: Date,
    range2Start: Date,
    range2End: Date,
  ): boolean {
    return range1Start <= range2End && range1End >= range2Start;
  }

  /**
   * Get all employees with a specific role
   */
  private async getEmployeesByRole(role: SystemRole): Promise<string[]> {
    try {
      console.log(`[getEmployeesByRole] Searching for employees with role: ${role}`);
      
      // Try both exact match and case-insensitive match
      const systemRoles = await this.employeeSystemRoleModel
        .find({
          roles: { $in: [role] },
          isActive: true,
        })
        .select('employeeProfileId roles')
        .lean()
        .exec();

      console.log(`[getEmployeesByRole] Found ${systemRoles.length} employees with role ${role}`);
      
      if (systemRoles.length === 0) {
        // Try case-insensitive search as fallback
        console.log(`[getEmployeesByRole] Trying case-insensitive search...`);
        const allRoles = await this.employeeSystemRoleModel
          .find({ isActive: true })
          .select('employeeProfileId roles')
          .lean()
          .exec();
        
        const matchingRoles = allRoles.filter((sr: any) => {
          return sr.roles && sr.roles.some((r: string) => 
            r.toLowerCase() === role.toLowerCase()
          );
        });
        
        console.log(`[getEmployeesByRole] Found ${matchingRoles.length} employees with case-insensitive match`);
        
        return matchingRoles.map((sr: any) => sr.employeeProfileId.toString());
      }

      const employeeIds = systemRoles.map((sr: any) => {
        const empId = sr.employeeProfileId;
        return empId instanceof Types.ObjectId ? empId.toString() : String(empId);
      });
      
      console.log(`[getEmployeesByRole] Returning ${employeeIds.length} employee IDs:`, employeeIds);
      return employeeIds;
    } catch (error: any) {
      console.error(`[getEmployeesByRole] Error fetching employees with role ${role}:`, error);
      return [];
    }
  }

  /**
   * Notification method that integrates with the NotificationsService
   * This method sends notifications to users through the centralized notification system.
   * 
   * @param notificationType - Type of notification from NotificationType enum
   * @param recipientId - Employee ID of the notification recipient (or 'FINANCE_STAFF' for all finance staff)
   * @param recipientRole - Role of the recipient (e.g., 'FINANCE_STAFF', 'DEPARTMENT_EMPLOYEE')
   * @param message - Notification message
   * @param metadata - Additional metadata about the notification (optional)
   */
  private async sendNotification(
    notificationType: string,
    recipientId: string | Types.ObjectId,
    recipientRole: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Convert recipientId to string for processing
      const recipientIdStr = recipientId instanceof Types.ObjectId 
        ? recipientId.toString() 
        : recipientId;

      // If recipientId is 'FINANCE_STAFF', get all finance staff employees
      if (recipientIdStr === 'FINANCE_STAFF' || recipientRole === 'FINANCE_STAFF') {
        console.log('[PAYROLL_TRACKING_NOTIFICATION] Notifying all finance staff...');
        const financeStaffIds = await this.getEmployeesByRole(SystemRole.FINANCE_STAFF);
        
        if (financeStaffIds.length === 0) {
          console.warn('[PAYROLL_TRACKING_NOTIFICATION] No finance staff found to notify');
          console.warn('[PAYROLL_TRACKING_NOTIFICATION] This might mean:');
          console.warn('  1. No employees have the FINANCE_STAFF role assigned');
          console.warn('  2. The role name does not match exactly');
          console.warn('  3. All finance staff have isActive=false');
          return;
        }

        console.log(`[PAYROLL_TRACKING_NOTIFICATION] Creating notifications for ${financeStaffIds.length} finance staff members`);

        // Send notification to each finance staff member
        const notifications = financeStaffIds.map(async (staffId: string) => {
          try {
            if (!Types.ObjectId.isValid(staffId)) {
              console.error(`[PAYROLL_TRACKING_NOTIFICATION] Invalid employee ID: ${staffId}`);
              return;
            }
            
            const notification = await this.notificationLogModel.create({
              to: new Types.ObjectId(staffId),
              type: notificationType,
              message: message,
              isRead: false,
            });
            
            console.log(`[PAYROLL_TRACKING_NOTIFICATION] ✅ Created notification ${notification._id} for finance staff ${staffId}`);
            return notification;
          } catch (err: any) {
            console.error(`[PAYROLL_TRACKING_NOTIFICATION] ❌ Error creating notification for ${staffId}:`, err?.message || err);
            console.error(`[PAYROLL_TRACKING_NOTIFICATION] Error details:`, err);
          }
        });

        const results = await Promise.all(notifications);
        const successful = results.filter(r => r !== undefined).length;
        console.log(`[PAYROLL_TRACKING_NOTIFICATION] ✅ Successfully sent ${successful} out of ${notifications.length} notifications to finance staff`);
        return;
      }

      // For individual recipients, create notification directly
      if (recipientIdStr && Types.ObjectId.isValid(recipientIdStr)) {
        try {
          await this.notificationLogModel.create({
            to: new Types.ObjectId(recipientIdStr),
            type: notificationType,
            message: message,
            isRead: false,
          });
          console.log(`[PAYROLL_TRACKING_NOTIFICATION] Sent notification to ${recipientIdStr}`);
        } catch (err: any) {
          console.error(`[PAYROLL_TRACKING_NOTIFICATION] Error creating notification:`, err);
        }
      } else {
        console.warn(`[PAYROLL_TRACKING_NOTIFICATION] Invalid recipient ID: ${recipientIdStr}`);
      }

    } catch (error: any) {
      // Don't throw error - notifications should not break the main workflow
      // Log error for debugging
      console.error('[PAYROLL_TRACKING_NOTIFICATION_ERROR]', {
        notificationType,
        recipientId: recipientId instanceof Types.ObjectId 
          ? recipientId.toString() 
          : recipientId,
        error: error instanceof Error ? error?.message : 'Unknown error',
      });
    }
  }

  // Claims
  // REQ-PY-17: Employees submit expense reimbursement claims for review.
  async createClaim(createClaimDTO: CreateClaimDTO, currentUserId: string) {
    try {
      // Validate required fields
      if (
        !createClaimDTO.description ||
        createClaimDTO.description.trim().length === 0
      ) {
        throw new BadRequestException(
          'Description is required and cannot be empty',
        );
      }
      if (
        !createClaimDTO.claimType ||
        createClaimDTO.claimType.trim().length === 0
      ) {
        throw new BadRequestException(
          'Claim type is required and cannot be empty',
        );
      }
      if (!createClaimDTO.amount || createClaimDTO.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }
      if (createClaimDTO.amount > 10000000) {
        throw new BadRequestException('Amount exceeds maximum allowed limit');
      }
      
      // Validate employee exists and is active
      const employeeId = await this.validateEmployeeExists(
        createClaimDTO.employeeId,
        true, // Check if employee is active
      );
      // Validate finance staff if provided (optional, so don't check active status)
      const financeStaffId = createClaimDTO.financeStaffId 
        ? await this.validateEmployeeExists(
            createClaimDTO.financeStaffId,
            false, // Finance staff might not need to be active
          )
        : undefined;
      
      const claimId = await this.generateClaimId();
      
      const claimData = {
        ...createClaimDTO,
        employeeId,
        financeStaffId,
        claimId,
        status: ClaimStatus.UNDER_REVIEW,
        createdBy: new Types.ObjectId(currentUserId),
        updatedBy: new Types.ObjectId(currentUserId),
      };
      
      const newClaim = new this.claimModel(claimData);
      const savedClaim = await newClaim.save();
      
      return await this.claimModel
        .findById(savedClaim._id)
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .exec();
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.name === 'ValidationError') {
        const validationErrors = Object.values(error?.errors || {})
          .map((err: any) => err?.message)
          .join(', ');
        throw new BadRequestException(
          `Validation error: ${validationErrors || error?.message || 'Unknown validation error'}`,
        );
      }
      if (error?.code === 11000) {
        throw new BadRequestException(
          `Duplicate key error: ${JSON.stringify(error?.keyValue || {})}`,
        );
      }
      throw new BadRequestException(
        `Failed to create claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-18: Employees drill into the lifecycle of a specific claim.
  async getClaimById(claimId: string) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }

      // Try to find by MongoDB _id first (if it's a valid ObjectId)
      let claim = null;
      if (Types.ObjectId.isValid(claimId)) {
        claim = await this.claimModel
          .findById(claimId)
          .populate('employeeId', 'firstName lastName employeeNumber')
          .populate('payrollSpecialistId', 'firstName lastName')
          .populate('payrollManagerId', 'firstName lastName')
          .populate('financeStaffId', 'firstName lastName')
          .exec();
      }
      
      // If not found by _id, try by claimId string
      if (!claim) {
        claim = await this.claimModel
          .findOne({ claimId })
          .populate('employeeId', 'firstName lastName employeeNumber')
          .populate('payrollSpecialistId', 'firstName lastName')
          .populate('payrollManagerId', 'firstName lastName')
          .populate('financeStaffId', 'firstName lastName')
          .exec();
      }

    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }
    return claim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-17: Support editing/resubmitting claims before a final decision.
  async updateClaim(claimId: string, updateClaimDTO: UpdateClaimDTO, currentUserId: string) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }

    const claim = await this.claimModel.findOne({ claimId });
    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }

      // Only allow updates if claim is still under review (employees can only update before resolution)
      if (claim.status !== ClaimStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot update claim. Claim status is ${claim.status}. Only claims under review can be updated.`,
        );
      }

      // Validate employee ownership: employees can only update their own claims
      // System admins can update any claim (handled by controller role check)
      const claimEmployeeId = claim.employeeId instanceof Types.ObjectId
        ? claim.employeeId.toString()
        : (claim.employeeId as any)?._id?.toString() || String(claim.employeeId);
      
      const currentUserProfile = await this.employeeProfileService.findOne(currentUserId);
      if (!currentUserProfile) {
        throw new NotFoundException('Current user profile not found');
      }

      // Check if current user has staff/admin roles
      const userSystemRole = await this.employeeSystemRoleModel.findOne({
        employeeProfileId: new Types.ObjectId(currentUserId),
        isActive: true,
      }).exec();

      const userRoles = userSystemRole?.roles || [];
      const isStaff = userRoles.some(
        (role) =>
          role === SystemRole.PAYROLL_SPECIALIST ||
          role === SystemRole.PAYROLL_MANAGER ||
          role === SystemRole.FINANCE_STAFF ||
          role === SystemRole.SYSTEM_ADMIN
      );

      // If user is not staff/admin and doesn't own the claim, deny access
      const currentUserEmployeeId = (currentUserProfile as any)._id?.toString() || currentUserId;
      if (!isStaff && currentUserEmployeeId !== claimEmployeeId) {
        throw new ForbiddenException('You can only update your own claims');
      }

      // Calculate effective amount (use updated amount if provided, otherwise current amount)
      const effectiveAmount = updateClaimDTO.amount !== undefined 
        ? updateClaimDTO.amount 
        : claim.amount;

      // Validate update data
      if (updateClaimDTO.amount !== undefined && updateClaimDTO.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      // Prevent reducing claim amount below approved amount
      if (updateClaimDTO.amount !== undefined && claim.approvedAmount) {
        if (updateClaimDTO.amount < claim.approvedAmount) {
          throw new BadRequestException(
            `Cannot reduce claim amount to ${updateClaimDTO.amount} because it is below the approved amount (${claim.approvedAmount})`,
          );
        }
      }

      if (updateClaimDTO.approvedAmount !== undefined) {
        if (updateClaimDTO.approvedAmount <= 0) {
          throw new BadRequestException(
            'Approved amount must be greater than 0',
          );
        }
        // Use effective amount (accounts for concurrent amount updates)
        if (updateClaimDTO.approvedAmount > effectiveAmount) {
          throw new BadRequestException(
            `Approved amount (${updateClaimDTO.approvedAmount}) cannot exceed the claim amount (${effectiveAmount})`,
          );
        }
      }
      if (
        updateClaimDTO.description !== undefined &&
        updateClaimDTO.description.trim().length === 0
      ) {
        throw new BadRequestException('Description cannot be empty');
      }
      if (
        updateClaimDTO.claimType !== undefined &&
        updateClaimDTO.claimType.trim().length === 0
      ) {
        throw new BadRequestException('Claim type cannot be empty');
      }

    const updateData: any = { ...updateClaimDTO };
    if (updateClaimDTO.financeStaffId) {
        // Validate finance staff exists (don't check active status)
        updateData.financeStaffId = await this.validateEmployeeExists(
          updateClaimDTO.financeStaffId,
          false,
        );
      }
      updateData.updatedBy = new Types.ObjectId(currentUserId);

      const updatedClaim = await this.claimModel
        .findOneAndUpdate({ claimId }, updateData, {
          new: true,
          runValidators: true,
        })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!updatedClaim) {
        throw new NotFoundException(
          `Claim with ID ${claimId} not found after update`,
        );
      }

    return updatedClaim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.name === 'ValidationError') {
        const validationErrors = Object.values(error?.errors || {})
          .map((err: any) => err.message)
          .join(', ');
        throw new BadRequestException(
          `Validation error: ${validationErrors || error?.message}`,
        );
      }
      throw new BadRequestException(
        `Failed to update claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-18: Employees track the list of claims they have submitted.
  async getClaimsByEmployeeId(employeeId: string) {
    try {
      if (!employeeId || employeeId.trim().length === 0) {
        throw new BadRequestException('Employee ID is required');
      }

      // Validate employee exists (don't check active status for viewing historical claims)
      const validEmployeeId = await this.validateEmployeeExists(
        employeeId,
        false,
      );

      console.log(`[getClaimsByEmployeeId] Querying claims for employeeId: ${employeeId}, validEmployeeId: ${validEmployeeId}`);

      // Build query with multiple formats
      const queryConditions: any[] = [
        { employeeId: validEmployeeId }
      ];
      
      // Try with original employeeId as ObjectId if valid
      if (Types.ObjectId.isValid(employeeId)) {
        queryConditions.push({ employeeId: new Types.ObjectId(employeeId) });
      }
      
      // Try with original employeeId as string
      queryConditions.push({ employeeId: employeeId });

      // Try multiple query formats to handle different storage formats
      let claims = await this.claimModel
        .find({ $or: queryConditions })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .exec();

      console.log(`[getClaimsByEmployeeId] Found ${claims.length} claims for employeeId: ${employeeId}`);

      return claims;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve claims: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-42: Payroll specialists review all claims currently under review.
  async getPendingClaims() {
    try {
      return await this.claimModel
        .find({ 
          status: { 
            $in: [ClaimStatus.UNDER_REVIEW, ClaimStatus.PENDING_MANAGER_APPROVAL] 
          } 
        })
      .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
      .populate('financeStaffId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve pending claims: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Get all claims (for payroll staff to view all claims regardless of status)
  async getAllClaims() {
    try {
      return await this.claimModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve all claims: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async approveClaim(
    claimId: string,
    approvedAmount: number,
    financeStaffId: string,
    resolutionComment?: string,
  ) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }
      if (!approvedAmount || approvedAmount <= 0) {
        throw new BadRequestException('Approved amount must be greater than 0');
      }
      if (!financeStaffId || financeStaffId.trim().length === 0) {
        throw new BadRequestException('Finance staff ID is required');
      }

    const claim = await this.claimModel.findOne({ claimId });
    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }
    if (claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Claim is already ${claim.status}`);
    }
      if (approvedAmount > claim.amount) {
        throw new BadRequestException(
          `Approved amount (${approvedAmount}) cannot exceed the original claim amount (${claim.amount})`,
        );
      }

      const updatedClaim = await this.claimModel
        .findOneAndUpdate(
      { claimId },
      {
        status: ClaimStatus.APPROVED,
        approvedAmount,
            financeStaffId: this.validateObjectId(
              financeStaffId,
              'financeStaffId',
            ),
        resolutionComment,
      },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!updatedClaim) {
        throw new NotFoundException(
          `Claim with ID ${claimId} not found after approval`,
        );
      }

      return updatedClaim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to approve claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async rejectClaim(
    claimId: string,
    rejectionReason: string,
    financeStaffId: string,
  ) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new BadRequestException('Rejection reason is required');
      }
      if (!financeStaffId || financeStaffId.trim().length === 0) {
        throw new BadRequestException('Finance staff ID is required');
      }

    const claim = await this.claimModel.findOne({ claimId });
    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }
    if (claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Claim is already ${claim.status}`);
    }

      const updatedClaim = await this.claimModel
        .findOneAndUpdate(
      { claimId },
      {
        status: ClaimStatus.REJECTED,
            rejectionReason: rejectionReason.trim(),
            financeStaffId: this.validateObjectId(
              financeStaffId,
              'financeStaffId',
            ),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!updatedClaim) {
        throw new NotFoundException(
          `Claim with ID ${claimId} not found after rejection`,
        );
      }

      return updatedClaim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to reject claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Disputes
  // REQ-PY-16: Employees dispute payslips or deductions tied to a payslip.
  async createDispute(createDisputeDTO: CreateDisputeDTO, currentUserId: string) {
    try {
      // Validate required fields
      if (
        !createDisputeDTO.description ||
        createDisputeDTO.description.trim().length === 0
      ) {
        throw new BadRequestException(
          'Description is required and cannot be empty',
        );
      }
      if (createDisputeDTO.description.trim().length < 10) {
        throw new BadRequestException(
          'Description must be at least 10 characters long to explain the dispute',
        );
      }

      // Validate employee exists and is active
      const employeeId = await this.validateEmployeeExists(
        createDisputeDTO.employeeId,
        true, // Check if employee is active
      );
      // Validate payslipId (ObjectId format only, existence validated by populate)
      const payslipId = this.validateObjectId(
        createDisputeDTO.payslipId,
        'payslipId',
      );
      
      // Security: Verify that the payslip belongs to the employee
      const payslip = await this.payslipModel
        .findOne({ _id: payslipId, employeeId })
        .exec();
      
      if (!payslip) {
        throw new NotFoundException(
          `Payslip with ID ${createDisputeDTO.payslipId} not found for employee ${createDisputeDTO.employeeId}. You can only dispute your own payslips.`,
        );
      }
      
      const disputeId = await this.generateDisputeId();
      const newDispute = new this.disputeModel({
        ...createDisputeDTO,
        employeeId,
        payslipId,
        disputeId,
        status: DisputeStatus.UNDER_REVIEW,
        createdBy: new Types.ObjectId(currentUserId),
        updatedBy: new Types.ObjectId(currentUserId),
      });
      const savedDispute = await newDispute.save();
      return await this.disputeModel
        .findById(savedDispute._id)
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.name === 'ValidationError') {
        const validationErrors = Object.values(error?.errors || {})
          .map((err: any) => err.message)
          .join(', ');
        throw new BadRequestException(
          `Validation error: ${validationErrors || error?.message}`,
        );
      }
      if (error?.code === 11000) {
        throw new BadRequestException(
          `Duplicate key error: ${JSON.stringify(error?.keyValue)}`,
        );
      }
      throw new BadRequestException(
        `Failed to create dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-18: Employees review the investigation status of a dispute.
  async getDisputeById(disputeId: string) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }

      // Try to find dispute by either MongoDB _id or disputeId string
      let dispute;
      if (Types.ObjectId.isValid(disputeId)) {
        // If it's a valid MongoDB ObjectId, try finding by _id first
        dispute = await this.disputeModel
          .findById(disputeId)
          .populate('employeeId', 'firstName lastName employeeNumber')
          .populate('payrollSpecialistId', 'firstName lastName')
          .populate('payrollManagerId', 'firstName lastName')
          .populate('financeStaffId', 'firstName lastName')
          .populate('payslipId')
          .exec();
        if (!dispute) {
          // If not found by _id, try by disputeId string
          dispute = await this.disputeModel
            .findOne({ disputeId })
            .populate('employeeId', 'firstName lastName employeeNumber')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .populate('payslipId')
            .exec();
        }
      } else {
        // If it's not a valid ObjectId, search by disputeId string
        dispute = await this.disputeModel
          .findOne({ disputeId })
          .populate('employeeId', 'firstName lastName employeeNumber')
          .populate('payrollSpecialistId', 'firstName lastName')
          .populate('payrollManagerId', 'firstName lastName')
          .populate('financeStaffId', 'firstName lastName')
          .populate('payslipId')
          .exec();
      }

      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }
      return dispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-16: Allow dispute owners to refine details before resolution.
  async updateDispute(disputeId: string, updateDisputeDTO: UpdateDisputeDTO, currentUserId: string) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }

      // Try to find dispute by either MongoDB _id or disputeId string
      let dispute;
      if (Types.ObjectId.isValid(disputeId)) {
        // If it's a valid MongoDB ObjectId, try finding by _id first
        dispute = await this.disputeModel.findById(disputeId);
        if (!dispute) {
          // If not found by _id, try by disputeId string
          dispute = await this.disputeModel.findOne({ disputeId });
        }
      } else {
        // If it's not a valid ObjectId, search by disputeId string
        dispute = await this.disputeModel.findOne({ disputeId });
      }

      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }

      // Only allow updates if dispute is still under review (employees can only update before resolution)
      if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot update dispute. Dispute status is ${dispute.status}. Only disputes under review can be updated.`,
        );
      }

      // Validate employee ownership: employees can only update their own disputes
      // System admins can update any dispute (handled by controller role check)
      const disputeEmployeeId = dispute.employeeId instanceof Types.ObjectId
        ? dispute.employeeId.toString()
        : (dispute.employeeId as any)?._id?.toString() || String(dispute.employeeId);
      
      const currentUserProfile = await this.employeeProfileService.findOne(currentUserId);
      if (!currentUserProfile) {
        throw new NotFoundException('Current user profile not found');
      }

      // Check if current user has staff/admin roles
      const userSystemRole = await this.employeeSystemRoleModel.findOne({
        employeeProfileId: new Types.ObjectId(currentUserId),
        isActive: true,
      }).exec();

      const userRoles = userSystemRole?.roles || [];
      const isStaff = userRoles.some(
        (role) =>
          role === SystemRole.PAYROLL_SPECIALIST ||
          role === SystemRole.PAYROLL_MANAGER ||
          role === SystemRole.FINANCE_STAFF ||
          role === SystemRole.SYSTEM_ADMIN
      );

      // If user is not staff/admin and doesn't own the dispute, deny access
      const currentUserEmployeeId = (currentUserProfile as any)._id?.toString() || currentUserId;
      if (!isStaff && currentUserEmployeeId !== disputeEmployeeId) {
        throw new ForbiddenException('You can only update your own disputes');
      }

      // Validate update data
      if (updateDisputeDTO.description !== undefined) {
        if (updateDisputeDTO.description.trim().length === 0) {
          throw new BadRequestException('Description cannot be empty');
        }
        if (updateDisputeDTO.description.trim().length < 10) {
          throw new BadRequestException(
            'Description must be at least 10 characters long',
          );
        }
      }
      if (
        updateDisputeDTO.rejectionReason !== undefined &&
        updateDisputeDTO.rejectionReason.trim().length === 0
      ) {
        throw new BadRequestException('Rejection reason cannot be empty');
      }

      // Build update object with only defined fields (remove undefined values)
      const updateData: any = {};
      
      if (updateDisputeDTO.description !== undefined) {
        updateData.description = updateDisputeDTO.description.trim();
      }
      
      if (updateDisputeDTO.resolutionComment !== undefined) {
        updateData.resolutionComment = updateDisputeDTO.resolutionComment.trim();
      }
      
      if (updateDisputeDTO.rejectionReason !== undefined) {
        updateData.rejectionReason = updateDisputeDTO.rejectionReason.trim();
      }
      
      if (updateDisputeDTO.financeStaffId !== undefined) {
        // Validate finance staff exists (don't check active status)
        updateData.financeStaffId = await this.validateEmployeeExists(
          updateDisputeDTO.financeStaffId,
          false,
        );
      }
      
      if (updateDisputeDTO.status !== undefined) {
        updateData.status = updateDisputeDTO.status;
      }

      // Always update the updatedBy field
      updateData.updatedBy = new Types.ObjectId(currentUserId);

      // Use $set operator to ensure all fields are properly updated
      const updateQuery = { $set: updateData };

      // Use the dispute's _id for the update query to ensure we update the correct document
      const updatedDispute = await this.disputeModel
        .findByIdAndUpdate(dispute._id, updateQuery, {
          new: true,
          runValidators: true,
        })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();

      if (!updatedDispute) {
        throw new NotFoundException(
          `Dispute with ID ${disputeId} not found after update`,
        );
      }

      return updatedDispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.name === 'ValidationError') {
        const validationErrors = Object.values(error?.errors || {})
          .map((err: any) => err.message)
          .join(', ');
        throw new BadRequestException(
          `Validation error: ${validationErrors || error?.message}`,
        );
      }
      throw new BadRequestException(
        `Failed to update dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-18: Employees list all disputes they have opened.
  async getDisputesByEmployeeId(employeeId: string) {
    try {
      if (!employeeId || employeeId.trim().length === 0) {
        throw new BadRequestException('Employee ID is required');
      }

      // Validate employee exists (don't check active status for viewing historical disputes)
      const validEmployeeId = await this.validateEmployeeExists(
        employeeId,
        false,
      );

      console.log(`[getDisputesByEmployeeId] Querying disputes for employeeId: ${employeeId}, validEmployeeId: ${validEmployeeId}`);

      // Build query with multiple formats
      const queryConditions: any[] = [
        { employeeId: validEmployeeId }
      ];
      
      // Try with original employeeId as ObjectId if valid
      if (Types.ObjectId.isValid(employeeId)) {
        queryConditions.push({ employeeId: new Types.ObjectId(employeeId) });
      }
      
      // Try with original employeeId as string
      queryConditions.push({ employeeId: employeeId });

      // Try multiple query formats to handle different storage formats
      let disputes = await this.disputeModel
        .find({ $or: queryConditions })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .sort({ createdAt: -1 })
        .exec();

      console.log(`[getDisputesByEmployeeId] Found ${disputes.length} disputes for employeeId: ${employeeId}`);

      return disputes;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve disputes: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-39: Payroll specialists review disputes waiting for action.
  async getPendingDisputes() {
    try {
      return await this.disputeModel
        .find({ 
          status: { 
            $in: [DisputeStatus.UNDER_REVIEW, DisputeStatus.PENDING_MANAGER_APPROVAL] 
          } 
        })
      .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
      .populate('financeStaffId', 'firstName lastName')
      .populate('payslipId')
      .sort({ createdAt: -1 })
      .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve pending disputes: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Get all disputes (for payroll staff to view all disputes regardless of status)
  async getAllDisputes() {
    try {
      return await this.disputeModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve all disputes: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async approveDispute(
    disputeId: string,
    financeStaffId: string,
    resolutionComment?: string,
  ) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }
      if (!financeStaffId || financeStaffId.trim().length === 0) {
        throw new BadRequestException('Finance staff ID is required');
      }

    const dispute = await this.disputeModel.findOne({ disputeId });
    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }
    if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Dispute is already ${dispute.status}`);
    }

      const updatedDispute = await this.disputeModel
        .findOneAndUpdate(
      { disputeId },
      {
        status: DisputeStatus.APPROVED,
            financeStaffId: this.validateObjectId(
              financeStaffId,
              'financeStaffId',
            ),
        resolutionComment,
      },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();

      if (!updatedDispute) {
        throw new NotFoundException(
          `Dispute with ID ${disputeId} not found after approval`,
        );
      }

      return updatedDispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to approve dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async rejectDispute(
    disputeId: string,
    rejectionReason: string,
    financeStaffId: string,
  ) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new BadRequestException('Rejection reason is required');
      }
      if (!financeStaffId || financeStaffId.trim().length === 0) {
        throw new BadRequestException('Finance staff ID is required');
      }

    const dispute = await this.disputeModel.findOne({ disputeId });
    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }
    if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Dispute is already ${dispute.status}`);
    }

      const updatedDispute = await this.disputeModel
        .findOneAndUpdate(
      { disputeId },
      {
        status: DisputeStatus.REJECTED,
            rejectionReason: rejectionReason.trim(),
            financeStaffId: this.validateObjectId(
              financeStaffId,
              'financeStaffId',
            ),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();

      if (!updatedDispute) {
        throw new NotFoundException(
          `Dispute with ID ${disputeId} not found after rejection`,
        );
      }

      return updatedDispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to reject dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Refunds
  // REQ-PY-45 & REQ-PY-46: Finance staff create refunds tied to approved items.
  async createRefund(createRefundDTO: CreateRefundDTO, currentUserId: string) {
    try {
      // Validate required fields
      if (!createRefundDTO.refundDetails) {
        throw new BadRequestException('Refund details are required');
      }
      if (
        !createRefundDTO.refundDetails.description ||
        createRefundDTO.refundDetails.description.trim().length === 0
      ) {
        throw new BadRequestException(
          'Refund description is required and cannot be empty',
        );
      }
      if (
        !createRefundDTO.refundDetails.amount ||
        createRefundDTO.refundDetails.amount <= 0
      ) {
        throw new BadRequestException('Refund amount must be greater than 0');
      }
      if (createRefundDTO.refundDetails.amount > 10000000) {
        throw new BadRequestException(
          'Refund amount exceeds maximum allowed limit',
        );
      }

    // Validate that either claimId or disputeId is provided and is approved
      if (createRefundDTO.claimId && createRefundDTO.disputeId) {
        throw new BadRequestException(
          'Cannot provide both claimId and disputeId. Please provide only one.',
        );
      }
      if (!createRefundDTO.claimId && !createRefundDTO.disputeId) {
        throw new BadRequestException(
          'Either claimId or disputeId must be provided',
        );
      }

    if (createRefundDTO.claimId) {
      const claim = await this.claimModel.findById(createRefundDTO.claimId);
      if (!claim) {
          throw new NotFoundException(
            `Claim with ID ${createRefundDTO.claimId} not found`,
          );
      }
      if (claim.status !== ClaimStatus.APPROVED) {
          throw new BadRequestException(
            `Claim must be approved before creating a refund. Current status: ${claim.status}`,
          );
        }
        // Check if refund already exists for this claim (pending OR paid)
        const existingRefund = await this.refundModel.findOne({
          claimId: createRefundDTO.claimId,
          status: { $in: [RefundStatus.PENDING, RefundStatus.PAID] },
        });
        if (existingRefund) {
          throw new BadRequestException(
            `A refund already exists for this claim (status: ${existingRefund.status}). Cannot create duplicate refunds.`,
          );
      }
    }
    if (createRefundDTO.disputeId) {
        const dispute = await this.disputeModel.findById(
          createRefundDTO.disputeId,
        );
      if (!dispute) {
          throw new NotFoundException(
            `Dispute with ID ${createRefundDTO.disputeId} not found`,
          );
      }
      if (dispute.status !== DisputeStatus.APPROVED) {
          throw new BadRequestException(
            `Dispute must be approved before creating a refund. Current status: ${dispute.status}`,
          );
        }
        // Check if refund already exists for this dispute (pending OR paid)
        const existingRefund = await this.refundModel.findOne({
          disputeId: createRefundDTO.disputeId,
          status: { $in: [RefundStatus.PENDING, RefundStatus.PAID] },
        });
        if (existingRefund) {
          throw new BadRequestException(
            `A refund already exists for this dispute (status: ${existingRefund.status}). Cannot create duplicate refunds.`,
          );
        }
    }

      // Validate employee exists (refunds can be for inactive employees too, so don't check active)
      const validEmployeeId = await this.validateEmployeeExists(
        createRefundDTO.employeeId,
        false,
      );
      // Validate finance staff if provided
      const validFinanceStaffId = createRefundDTO.financeStaffId
        ? await this.validateEmployeeExists(
            createRefundDTO.financeStaffId,
            false,
          )
        : undefined;

    const newRefund = new this.refundModel({
      ...createRefundDTO,
        employeeId: validEmployeeId,
        financeStaffId: validFinanceStaffId,
        claimId: createRefundDTO.claimId
          ? this.validateObjectId(createRefundDTO.claimId, 'claimId')
          : undefined,
        disputeId: createRefundDTO.disputeId
          ? this.validateObjectId(createRefundDTO.disputeId, 'disputeId')
          : undefined,
      status: createRefundDTO.status || RefundStatus.PENDING,
      createdBy: new Types.ObjectId(currentUserId),
      updatedBy: new Types.ObjectId(currentUserId),
    });
    const savedRefund = await newRefund.save();
      return await this.refundModel
        .findById(savedRefund._id)
      .populate('employeeId', 'firstName lastName employeeNumber')
      .populate('financeStaffId', 'firstName lastName')
      .populate('claimId')
      .populate('disputeId')
      .populate('paidInPayrollRunId')
      .exec();
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.name === 'ValidationError') {
        const validationErrors = Object.values(error?.errors || {})
          .map((err: any) => err.message)
          .join(', ');
        throw new BadRequestException(
          `Validation error: ${validationErrors || error?.message}`,
        );
      }
      if (error?.code === 11000) {
        throw new BadRequestException(
          `Duplicate key error: ${JSON.stringify(error?.keyValue)}`,
        );
      }
      throw new BadRequestException(
        `Failed to create refund: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-18: Employees inspect the lifecycle of a specific refund.
  /**
   * ✅ CALLED FROM OTHER SUBSYSTEMS:
   * - PayrollExecutionModule: Called to verify refund details when processing payroll runs.
   *   Used to get refund information before including it in payslip earnings.
   * 
   * Integration Status: ✅ AVAILABLE
   * - Method is ready for use by PayrollExecutionModule for refund verification
   */
  async getRefundById(refundId: string) {
    try {
      // Reject reserved route keywords that should not be treated as refund IDs
      const reservedKeywords = ['all', 'pending', 'employee'];
      if (reservedKeywords.includes(refundId?.toLowerCase())) {
        throw new BadRequestException(`'${refundId}' is a reserved keyword and cannot be used as a refund ID`);
      }
      
      if (!refundId || !Types.ObjectId.isValid(refundId)) {
        throw new BadRequestException('Valid refund ID is required');
      }

      const refund = await this.refundModel
        .findById(refundId)
      .populate('employeeId', 'firstName lastName employeeNumber')
      .populate('financeStaffId', 'firstName lastName')
      .populate('claimId')
      .populate('disputeId')
      .populate('paidInPayrollRunId')
      .exec();

    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found`);
    }
    return refund;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve refund: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-45 & REQ-PY-46: Finance can adjust pending refunds before payout.
  async updateRefund(refundId: string, updateRefundDTO: UpdateRefundDTO, currentUserId: string) {
    try {
      if (!refundId || !Types.ObjectId.isValid(refundId)) {
        throw new BadRequestException('Valid refund ID is required');
      }

    const refund = await this.refundModel.findById(refundId);
    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found`);
    }

      // Prevent ALL updates to paid refunds (paid refunds are immutable)
      if (refund.status === RefundStatus.PAID) {
        throw new BadRequestException(
          'Cannot update a refund that has already been paid. Paid refunds are immutable.',
        );
      }

      // Validate update data
      if (updateRefundDTO.refundDetails) {
        if (
          !updateRefundDTO.refundDetails.description ||
          updateRefundDTO.refundDetails.description.trim().length === 0
        ) {
          throw new BadRequestException('Refund description cannot be empty');
        }
        if (
          !updateRefundDTO.refundDetails.amount ||
          updateRefundDTO.refundDetails.amount <= 0
        ) {
          throw new BadRequestException('Refund amount must be greater than 0');
        }
      }

      // Prevent status changes that violate business rules
      if (updateRefundDTO.status) {
        if (
          refund.status === RefundStatus.PENDING &&
          updateRefundDTO.status === RefundStatus.PAID &&
          !updateRefundDTO.paidInPayrollRunId
        ) {
          throw new BadRequestException(
            'Cannot mark refund as paid without providing paidInPayrollRunId',
          );
        }
      }

    const updateData: any = { ...updateRefundDTO };
    if (updateRefundDTO.financeStaffId) {
        // Validate finance staff exists (don't check active status)
        updateData.financeStaffId = await this.validateEmployeeExists(
          updateRefundDTO.financeStaffId,
          false,
        );
    }
    if (updateRefundDTO.claimId) {
        updateData.claimId = this.validateObjectId(
          updateRefundDTO.claimId,
          'claimId',
        );
    }
    if (updateRefundDTO.disputeId) {
        updateData.disputeId = this.validateObjectId(
          updateRefundDTO.disputeId,
          'disputeId',
        );
    }
    if (updateRefundDTO.paidInPayrollRunId) {
        updateData.paidInPayrollRunId = this.validateObjectId(
          updateRefundDTO.paidInPayrollRunId,
          'paidInPayrollRunId',
        );
      }
      updateData.updatedBy = new Types.ObjectId(currentUserId);

      const updatedRefund = await this.refundModel
        .findByIdAndUpdate(refundId, updateData, {
          new: true,
          runValidators: true,
        })
        .populate('employeeId', 'firstName lastName employeeNumber')
      .populate('financeStaffId', 'firstName lastName')
      .populate('claimId')
      .populate('disputeId')
      .populate('paidInPayrollRunId')
      .exec();

      if (!updatedRefund) {
        throw new NotFoundException(
          `Refund with ID ${refundId} not found after update`,
        );
      }

    return updatedRefund;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.name === 'ValidationError') {
        const validationErrors = Object.values(error?.errors || {})
          .map((err: any) => err.message)
          .join(', ');
        throw new BadRequestException(
          `Validation error: ${validationErrors || error?.message}`,
        );
      }
      throw new BadRequestException(
        `Failed to update refund: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-18: Employees can list all refunds generated for them.
  /**
   * ✅ CALLED FROM OTHER SUBSYSTEMS:
   * - PayrollExecutionModule: Called during payroll calculation to get all pending refunds
   *   for a specific employee that need to be included in the current payroll run.
   *   The refunds are then added to the payslip earningsDetails.refunds array.
   * 
   * Integration Status: ✅ ACTIVE
   * - Used in PayrollExecutionService.calculateRefunds() for net pay calculation
   * - Used in PayrollExecutionService.generateAndDistributePayslips() for payslip generation
   */
  async getRefundsByEmployeeId(employeeId: string) {
    try {
      if (!employeeId || employeeId.trim().length === 0) {
        throw new BadRequestException('Employee ID is required');
      }

      // Validate employee exists (don't check active status for viewing historical refunds)
      const validEmployeeId = await this.validateEmployeeExists(
        employeeId,
        false,
      );

      console.log(`[getRefundsByEmployeeId] Querying refunds for employeeId: ${employeeId}, validEmployeeId: ${validEmployeeId}`);

      // Build query with multiple formats
      const queryConditions: any[] = [
        { employeeId: validEmployeeId }
      ];
      
      // Try with original employeeId as ObjectId if valid
      if (Types.ObjectId.isValid(employeeId)) {
        queryConditions.push({ employeeId: new Types.ObjectId(employeeId) });
      }
      
      // Try with original employeeId as string
      queryConditions.push({ employeeId: employeeId });

      // Query refunds using the validated employeeId (which is an ObjectId)
      // Try multiple query formats to handle different storage formats
      let refunds = await this.refundModel
        .find({ $or: queryConditions })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('financeStaffId', 'firstName lastName')
        .populate('claimId')
        .populate('disputeId')
        .populate('paidInPayrollRunId')
        .sort({ createdAt: -1 })
        .exec();

      console.log(`[getRefundsByEmployeeId] Found ${refunds.length} refunds by direct employeeId query`);

      // If no refunds found directly, also check refunds associated with employee's claims/disputes
      // This handles cases where refunds might be linked via claimId/disputeId
      if (refunds.length === 0) {
        // Get all claims and disputes for this employee
        const employeeClaims = await this.claimModel.find({ 
          $or: [
            { employeeId: validEmployeeId },
            { employeeId: new Types.ObjectId(employeeId) }
          ]
        }).select('_id').exec();
        
        const employeeDisputes = await this.disputeModel.find({ 
          $or: [
            { employeeId: validEmployeeId },
            { employeeId: new Types.ObjectId(employeeId) }
          ]
        }).select('_id').exec();
        
        console.log(`[getRefundsByEmployeeId] Found ${employeeClaims.length} claims and ${employeeDisputes.length} disputes for employee`);
        
        const claimIds = employeeClaims.map(c => c._id);
        const disputeIds = employeeDisputes.map(d => d._id);
        
        if (claimIds.length > 0 || disputeIds.length > 0) {
          const query: any = {
            $or: []
          };
          
          if (claimIds.length > 0) {
            query.$or.push({ claimId: { $in: claimIds } });
          }
          if (disputeIds.length > 0) {
            query.$or.push({ disputeId: { $in: disputeIds } });
          }
          
          if (query.$or.length > 0) {
            console.log(`[getRefundsByEmployeeId] Querying refunds by claimIds (${claimIds.length}) and disputeIds (${disputeIds.length})`);
            refunds = await this.refundModel
              .find(query)
              .populate('employeeId', 'firstName lastName employeeNumber')
              .populate('financeStaffId', 'firstName lastName')
              .populate('claimId')
              .populate('disputeId')
              .populate('paidInPayrollRunId')
              .sort({ createdAt: -1 })
              .exec();
            console.log(`[getRefundsByEmployeeId] Found ${refunds.length} refunds via claims/disputes query`);
          }
        }
      }

      // Also try to find ALL refunds and filter by employeeId from populated data (last resort)
      if (refunds.length === 0) {
        console.log(`[getRefundsByEmployeeId] Trying to find all refunds and filter by employee...`);
        const allRefunds = await this.refundModel
          .find({})
          .populate('employeeId', 'firstName lastName employeeNumber')
          .populate('claimId')
          .populate('disputeId')
          .exec();
        
        console.log(`[getRefundsByEmployeeId] Total refunds in database: ${allRefunds.length}`);
        
        // Filter refunds where employeeId matches (handling both ObjectId and populated objects)
        refunds = allRefunds.filter((refund: any) => {
          const refundEmployeeId = refund.employeeId?._id?.toString() || refund.employeeId?.toString() || String(refund.employeeId);
          const targetEmployeeId = validEmployeeId.toString();
          const targetEmployeeIdString = employeeId;
          return refundEmployeeId === targetEmployeeId || refundEmployeeId === targetEmployeeIdString;
        });
        
        console.log(`[getRefundsByEmployeeId] Filtered to ${refunds.length} refunds matching employee`);
      }

      console.log(`[getRefundsByEmployeeId] Final result: ${refunds.length} refunds for employeeId: ${employeeId}`);
      
      return refunds;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve refunds: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-45 & REQ-PY-46: Finance monitors refunds pending payroll execution.
  /**
   * ✅ CALLED FROM OTHER SUBSYSTEMS:
   * - PayrollExecutionModule: Called at the start of payroll run execution to retrieve
   *   all pending refunds that need to be included in the current payroll cycle.
   *   PayrollExecutionModule will then:
   *   1. Filter refunds by employees in the current payroll run
   *   2. Include refund amounts in payslip earningsDetails.refunds
   *   3. Call processRefund() after payroll run is finalized to mark refunds as PAID
   * 
   * Integration Status: ✅ AVAILABLE
   * - Method is ready for use by PayrollExecutionModule
   * - Can be used for bulk refund retrieval at payroll run start
   */
  async getPendingRefunds() {
    try {
      return await this.refundModel
        .find({ status: RefundStatus.PENDING })
      .populate('employeeId', 'firstName lastName employeeNumber')
      .populate('financeStaffId', 'firstName lastName')
      .populate('claimId')
      .populate('disputeId')
      .sort({ createdAt: -1 })
      .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve pending refunds: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Get all refunds (for finance staff to view all refunds regardless of status)
  async getAllRefunds() {
    try {
      return await this.refundModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('financeStaffId', 'firstName lastName')
        .populate('claimId')
        .populate('disputeId')
        .populate('paidInPayrollRunId')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve all refunds: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-46: Mark refunds as paid once included in the payroll run.
  /**
   * ✅ CALLED FROM OTHER SUBSYSTEMS:
   * - PayrollExecutionModule: Called after a payroll run is finalized and payments are processed.
   *   This method marks refunds as PAID and links them to the payroll run that executed the payment.
   *   
   *   Workflow:
   *   1. PayrollExecutionModule includes pending refunds in payslip earnings
   *   2. Payslips are generated with refunds in earningsDetails.refunds
   *   3. PayrollExecutionModule calls this method for each refund that was included in payslip
   *   4. Refund status changes from PENDING to PAID
   *   5. paidInPayrollRunId is set to link refund to the payroll run
   * 
   * Integration Status: ✅ ACTIVE
   * - Called from PayrollExecutionService.generateAndDistributePayslips() after payslip generation
   * - Automatically marks refunds as PAID when included in payroll
   */
  async processRefund(refundId: string, processRefundDTO: ProcessRefundDTO, currentUserId: string) {
    try {
      if (!refundId || !Types.ObjectId.isValid(refundId)) {
        throw new BadRequestException('Valid refund ID is required');
      }
      if (!processRefundDTO.paidInPayrollRunId) {
        throw new BadRequestException(
          'Payroll run ID is required to process refund',
        );
      }

    const refund = await this.refundModel.findById(refundId);
    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found`);
    }
    if (refund.status !== RefundStatus.PENDING) {
        throw new BadRequestException(
          `Refund is already ${refund.status}. Only pending refunds can be processed.`,
        );
    }

      const updatedRefund = await this.refundModel
        .findByIdAndUpdate(
      refundId,
      {
        status: RefundStatus.PAID,
            paidInPayrollRunId: this.validateObjectId(
              processRefundDTO.paidInPayrollRunId,
              'paidInPayrollRunId',
            ),
            updatedBy: new Types.ObjectId(currentUserId),
      },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
      .populate('financeStaffId', 'firstName lastName')
      .populate('claimId')
      .populate('disputeId')
      .populate('paidInPayrollRunId')
      .exec();

      if (!updatedRefund) {
        throw new NotFoundException(
          `Refund with ID ${refundId} not found after processing`,
        );
      }

      // Notify employee that refund has been processed and included in payroll
      const employeeIdValue = updatedRefund.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      const refundAmount = updatedRefund.refundDetails?.amount || 0;
      const refundDescription = updatedRefund.refundDetails?.description || 'Refund';
      const payrollRunIdValue = updatedRefund.paidInPayrollRunId;
      const payrollRunId = payrollRunIdValue instanceof Types.ObjectId
        ? payrollRunIdValue.toString()
        : (payrollRunIdValue as any)?._id?.toString() || (payrollRunIdValue ? String(payrollRunIdValue) : 'N/A');
      
      await this.sendNotification(
        'REFUND_PROCESSED',
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your refund of ${refundAmount} for "${refundDescription}" has been processed and included in payroll run ${payrollRunId}. The amount will be reflected in your next payslip.`,
        {
          refundId: updatedRefund._id.toString(),
          refundAmount,
          refundDescription,
          payrollRunId,
          status: RefundStatus.PAID,
          claimId: updatedRefund.claimId?.toString(),
          disputeId: updatedRefund.disputeId?.toString(),
        },
      );

      return updatedRefund;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process refund: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== PAYROLL SPECIALIST METHODS (REQ-PY-39, REQ-PY-42) ====================

  // Payroll Specialist approves claim (REQ-PY-42)
  async approveClaimBySpecialist(
    claimId: string,
    approveClaimBySpecialistDTO: ApproveClaimBySpecialistDTO,
    currentUserId: string,
  ) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }

      const claim = await this.claimModel.findOne({ claimId });
      if (!claim) {
        throw new NotFoundException(`Claim with ID ${claimId} not found`);
      }
      if (claim.status !== ClaimStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Claim is already ${claim.status}. Only claims under review can be approved by specialist.`,
        );
      }

      // Validate approved amount if provided
      const approvedAmount =
        approveClaimBySpecialistDTO.approvedAmount || claim.amount;
      if (approvedAmount <= 0) {
        throw new BadRequestException('Approved amount must be greater than 0');
      }
      if (approvedAmount > claim.amount) {
        throw new BadRequestException(
          `Approved amount (${approvedAmount}) cannot exceed the original claim amount (${claim.amount})`,
        );
      }

      // Validate payroll specialist exists
      const validPayrollSpecialistId = await this.validateEmployeeExists(
        approveClaimBySpecialistDTO.payrollSpecialistId,
        false, // Don't check active status for staff
      );

      // Specialist approves - status becomes PENDING_MANAGER_APPROVAL, waiting for manager confirmation
      const updatedClaim = await this.claimModel
        .findOneAndUpdate(
          { claimId },
          {
            status: ClaimStatus.PENDING_MANAGER_APPROVAL, // Waiting for manager approval
            payrollSpecialistId: validPayrollSpecialistId,
            approvedAmount,
            resolutionComment: approveClaimBySpecialistDTO.resolutionComment,
            updatedBy: new Types.ObjectId(currentUserId),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!updatedClaim) {
        throw new NotFoundException(
          `Claim with ID ${claimId} not found after approval`,
        );
      }

      // Notify employee about status change (pending manager approval)
      const employeeIdValue = updatedClaim.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      await this.sendNotification(
        'CLAIM_PENDING_MANAGER_APPROVAL',
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your expense claim ${claimId} has been approved by payroll specialist and is pending manager approval. Approved amount: ${approvedAmount}`,
        {
          claimId: updatedClaim.claimId,
          approvedAmount,
          status: ClaimStatus.PENDING_MANAGER_APPROVAL,
        },
      );

      return updatedClaim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to approve claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Payroll Specialist rejects claim (REQ-PY-42)
  async rejectClaimBySpecialist(
    claimId: string,
    rejectClaimBySpecialistDTO: RejectClaimBySpecialistDTO,
    currentUserId: string,
  ) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }
      if (
        !rejectClaimBySpecialistDTO.rejectionReason ||
        rejectClaimBySpecialistDTO.rejectionReason.trim().length === 0
      ) {
        throw new BadRequestException('Rejection reason is required');
      }

      const claim = await this.claimModel.findOne({ claimId });
      if (!claim) {
        throw new NotFoundException(`Claim with ID ${claimId} not found`);
      }
      if (claim.status !== ClaimStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Claim is already ${claim.status}. Cannot reject a claim that is not under review.`,
        );
      }

      // Validate payroll specialist exists
      const validPayrollSpecialistId = await this.validateEmployeeExists(
        rejectClaimBySpecialistDTO.payrollSpecialistId,
        false, // Don't check active status for staff
      );

      const updatedClaim = await this.claimModel
        .findOneAndUpdate(
          { claimId },
          {
            status: ClaimStatus.REJECTED,
            rejectionReason: rejectClaimBySpecialistDTO.rejectionReason.trim(),
            payrollSpecialistId: validPayrollSpecialistId,
            updatedBy: new Types.ObjectId(currentUserId),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!updatedClaim) {
        throw new NotFoundException(
          `Claim with ID ${claimId} not found after rejection`,
        );
      }

      // Notify employee about rejection
      const employeeIdValue = updatedClaim.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      await this.sendNotification(
        NotificationType.CLAIM_REJECTED,
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your expense claim ${claimId} has been rejected. Reason: ${rejectClaimBySpecialistDTO.rejectionReason}`,
        {
          claimId: updatedClaim.claimId,
          rejectionReason: rejectClaimBySpecialistDTO.rejectionReason,
          status: ClaimStatus.REJECTED,
        },
      );

      return updatedClaim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to reject claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Payroll Specialist approves dispute (REQ-PY-39)
  async approveDisputeBySpecialist(
    disputeId: string,
    approveDisputeBySpecialistDTO: ApproveDisputeBySpecialistDTO,
    currentUserId: string,
  ) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }

      const dispute = await this.disputeModel.findOne({ disputeId });
      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }
      if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Dispute is already ${dispute.status}. Only disputes under review can be approved by specialist.`,
        );
      }

      // Validate payroll specialist exists
      const validPayrollSpecialistId = await this.validateEmployeeExists(
        approveDisputeBySpecialistDTO.payrollSpecialistId,
        false, // Don't check active status for staff
      );

      // Specialist approves - status becomes PENDING_MANAGER_APPROVAL, waiting for manager confirmation
      const updatedDispute = await this.disputeModel
        .findOneAndUpdate(
          { disputeId },
          {
            status: DisputeStatus.PENDING_MANAGER_APPROVAL, // Waiting for manager approval
            payrollSpecialistId: validPayrollSpecialistId,
            resolutionComment: approveDisputeBySpecialistDTO.resolutionComment,
            updatedBy: new Types.ObjectId(currentUserId),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();

      if (!updatedDispute) {
        throw new NotFoundException(
          `Dispute with ID ${disputeId} not found after approval`,
        );
      }

      // Notify employee about status change (pending manager approval)
      const employeeIdValue = updatedDispute.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      await this.sendNotification(
        'DISPUTE_PENDING_MANAGER_APPROVAL',
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your payroll dispute ${disputeId} has been approved by payroll specialist and is pending manager approval.`,
        {
          disputeId: updatedDispute.disputeId,
          status: DisputeStatus.PENDING_MANAGER_APPROVAL,
        },
      );

      return updatedDispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to approve dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Payroll Specialist rejects dispute (REQ-PY-39)
  async rejectDisputeBySpecialist(
    disputeId: string,
    rejectDisputeBySpecialistDTO: RejectDisputeBySpecialistDTO,
    currentUserId: string,
  ) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }
      if (
        !rejectDisputeBySpecialistDTO.rejectionReason ||
        rejectDisputeBySpecialistDTO.rejectionReason.trim().length === 0
      ) {
        throw new BadRequestException('Rejection reason is required');
      }

      const dispute = await this.disputeModel.findOne({ disputeId });
      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }
      if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Dispute is already ${dispute.status}. Cannot reject a dispute that is not under review.`,
        );
      }

      // Validate payroll specialist exists
      const validPayrollSpecialistId = await this.validateEmployeeExists(
        rejectDisputeBySpecialistDTO.payrollSpecialistId,
        false, // Don't check active status for staff
      );

      const updatedDispute = await this.disputeModel
        .findOneAndUpdate(
          { disputeId },
          {
            status: DisputeStatus.REJECTED,
            rejectionReason:
              rejectDisputeBySpecialistDTO.rejectionReason.trim(),
            payrollSpecialistId: validPayrollSpecialistId,
            updatedBy: new Types.ObjectId(currentUserId),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();

      if (!updatedDispute) {
        throw new NotFoundException(
          `Dispute with ID ${disputeId} not found after rejection`,
        );
      }

      // Notify employee about rejection
      const employeeIdValue = updatedDispute.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      await this.sendNotification(
        NotificationType.DISPUTE_REJECTED,
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your payroll dispute ${disputeId} has been rejected. Reason: ${rejectDisputeBySpecialistDTO.rejectionReason}`,
        {
          disputeId: updatedDispute.disputeId,
          rejectionReason: rejectDisputeBySpecialistDTO.rejectionReason,
          status: DisputeStatus.REJECTED,
        },
      );

      return updatedDispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to reject dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== PAYROLL MANAGER METHODS (REQ-PY-40, REQ-PY-43) ====================

  // Payroll Manager confirms dispute approval (REQ-PY-40)
  async confirmDisputeApproval(
    disputeId: string,
    confirmDisputeApprovalDTO: ConfirmDisputeApprovalDTO,
    currentUserId: string,
  ) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }

      const dispute = await this.disputeModel.findOne({ disputeId });
      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }
      if (dispute.status !== DisputeStatus.PENDING_MANAGER_APPROVAL) {
        throw new BadRequestException(
          `Dispute must be pending manager approval. Current status: ${dispute.status}`,
        );
      }

      // Validate payroll manager exists
      const validPayrollManagerId = await this.validateEmployeeExists(
        confirmDisputeApprovalDTO.payrollManagerId,
        false, // Don't check active status for staff
      );

      // Manager confirms - status becomes APPROVED, finance staff can now see it
      const updatedDispute = await this.disputeModel
        .findOneAndUpdate(
          { disputeId },
          {
            status: DisputeStatus.APPROVED, // Manager approved, now visible to finance
            payrollManagerId: validPayrollManagerId,
            resolutionComment:
              confirmDisputeApprovalDTO.resolutionComment ||
              dispute.resolutionComment,
            updatedBy: new Types.ObjectId(currentUserId),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .exec();

      if (!updatedDispute) {
        throw new NotFoundException(
          `Dispute with ID ${disputeId} not found after confirmation`,
        );
      }

      // Notify finance staff that a dispute has been approved and is ready for refund processing
      await this.sendNotification(
        NotificationType.DISPUTE_APPROVED_FOR_FINANCE,
        'FINANCE_STAFF',
        'FINANCE_STAFF',
        `A new dispute ${disputeId} has been approved by the Payroll Manager and is ready for refund processing. Employee: ${(updatedDispute.employeeId as any)?.firstName || ''} ${(updatedDispute.employeeId as any)?.lastName || ''}`,
        {
          disputeId: updatedDispute.disputeId,
          employeeId: (() => {
            const empId = updatedDispute.employeeId;
            return empId instanceof Types.ObjectId
              ? empId.toString()
              : (empId as any)?._id?.toString() || String(empId);
          })(),
          status: DisputeStatus.APPROVED,
        },
      );

      // Also notify employee that dispute has been fully approved
      const employeeIdValue = updatedDispute.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      await this.sendNotification(
        NotificationType.DISPUTE_APPROVED,
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your payroll dispute ${disputeId} has been fully approved by the payroll manager. Finance staff will process your refund.`,
        {
          disputeId: updatedDispute.disputeId,
          status: DisputeStatus.APPROVED,
        },
      );

      return updatedDispute;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to confirm dispute approval: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Payroll Manager confirms claim approval (REQ-PY-43)
  async confirmClaimApproval(
    claimId: string,
    confirmClaimApprovalDTO: ConfirmClaimApprovalDTO,
    currentUserId: string,
  ) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }

      const claim = await this.claimModel.findOne({ claimId });
      if (!claim) {
        throw new NotFoundException(`Claim with ID ${claimId} not found`);
      }
      if (claim.status !== ClaimStatus.PENDING_MANAGER_APPROVAL) {
        throw new BadRequestException(
          `Claim must be pending manager approval. Current status: ${claim.status}`,
        );
      }

      // Validate payroll manager exists
      const validPayrollManagerId = await this.validateEmployeeExists(
        confirmClaimApprovalDTO.payrollManagerId,
        false, // Don't check active status for staff
      );

      // Manager confirms - status becomes APPROVED, finance staff can now see it
      const updatedClaim = await this.claimModel
        .findOneAndUpdate(
          { claimId },
          {
            status: ClaimStatus.APPROVED, // Manager approved, now visible to finance
            payrollManagerId: validPayrollManagerId,
            resolutionComment:
              confirmClaimApprovalDTO.resolutionComment ||
              claim.resolutionComment,
            updatedBy: new Types.ObjectId(currentUserId),
          },
          { new: true, runValidators: true },
        )
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .exec();

      if (!updatedClaim) {
        throw new NotFoundException(
          `Claim with ID ${claimId} not found after confirmation`,
        );
      }

      // REQ: As Finance staff, I want to view and get notified with approved expense claims, so that adjustments can be done.
      // Notify all finance staff that a claim has been approved and is ready for refund processing
      console.log(`[confirmClaimApproval] Notifying finance staff about approved claim ${claimId}`);
      await this.sendNotification(
        NotificationType.CLAIM_APPROVED_FOR_FINANCE,
        'FINANCE_STAFF',
        'FINANCE_STAFF',
        `New Approved Expense Claim: ${claimId} - Employee: ${(updatedClaim.employeeId as any)?.firstName || ''} ${(updatedClaim.employeeId as any)?.lastName || ''} (${(updatedClaim.employeeId as any)?.employeeNumber || 'N/A'}) - Amount: $${(updatedClaim.approvedAmount || updatedClaim.amount).toFixed(2)} - Ready for refund processing`,
        {
          claimId: updatedClaim.claimId,
          employeeId: (() => {
            const empId = updatedClaim.employeeId;
            return empId instanceof Types.ObjectId
              ? empId.toString()
              : (empId as any)?._id?.toString() || String(empId);
          })(),
          employeeName: `${(updatedClaim.employeeId as any)?.firstName || ''} ${(updatedClaim.employeeId as any)?.lastName || ''}`,
          employeeNumber: (updatedClaim.employeeId as any)?.employeeNumber || 'N/A',
          approvedAmount: updatedClaim.approvedAmount || updatedClaim.amount,
          status: ClaimStatus.APPROVED,
        },
      );
      console.log(`[confirmClaimApproval] Finance staff notification sent for claim ${claimId}`);

      // Also notify employee that claim has been fully approved
      const employeeIdValue = updatedClaim.employeeId;
      const employeeId = employeeIdValue instanceof Types.ObjectId
        ? employeeIdValue.toString()
        : (employeeIdValue as any)?._id?.toString() || String(employeeIdValue);
      
      await this.sendNotification(
        NotificationType.CLAIM_APPROVED,
        employeeId,
        'DEPARTMENT_EMPLOYEE',
        `Your expense claim ${claimId} has been fully approved by the payroll manager. Finance staff will process your refund of $${(updatedClaim.approvedAmount || updatedClaim.amount).toFixed(2)}.`,
        {
          claimId: updatedClaim.claimId,
          approvedAmount: updatedClaim.approvedAmount || updatedClaim.amount,
          status: ClaimStatus.APPROVED,
        },
      );

      return updatedClaim;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to confirm claim approval: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== FINANCE STAFF METHODS (REQ-PY-41, REQ-PY-44) ====================

  // Finance staff view approved disputes (REQ-PY-41)
  async getApprovedDisputesForFinance() {
    try {
      return await this.disputeModel
        .find({ status: DisputeStatus.APPROVED })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .populate('payslipId')
        .sort({ updatedAt: -1, createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve approved disputes: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Finance staff view approved claims (REQ-PY-44)
  async getApprovedClaimsForFinance() {
    try {
      return await this.claimModel
        .find({ status: ClaimStatus.APPROVED })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .sort({ updatedAt: -1, createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve approved claims: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== REFUND METHODS (REQ-PY-45, REQ-PY-46) ====================

  // Finance staff generate refund for approved dispute (REQ-PY-45)
  // This is already handled by createRefund, but adding a specific method for clarity
  async generateRefundForDispute(
    disputeId: string,
    generateRefundForDisputeDTO: GenerateRefundForDisputeDTO,
    currentUserId: string,
  ) {
    try {
      if (!disputeId || disputeId.trim().length === 0) {
        throw new BadRequestException('Dispute ID is required');
      }

      // Find dispute by custom disputeId (string like "DISP-2025-0001")
      const dispute = await this.disputeModel.findOne({ disputeId });
      if (!dispute) {
        throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
      }
      if (dispute.status !== DisputeStatus.APPROVED) {
        throw new BadRequestException(
          `Dispute must be approved before generating refund. Current status: ${dispute.status}`,
        );
      }

      // Check if refund already exists for this dispute (pending OR paid)
      const existingRefund = await this.refundModel.findOne({
        disputeId: dispute._id,
        status: { $in: [RefundStatus.PENDING, RefundStatus.PAID] },
      });
      if (existingRefund) {
        throw new BadRequestException(
          `A refund already exists for this dispute (status: ${existingRefund.status}). Cannot create duplicate refunds.`,
        );
      }

      // Get MongoDB _id for createRefund (which uses findById)
      const disputeObjectId = dispute._id.toString();
      const employeeId = dispute.employeeId.toString();
      const createRefundDTO: CreateRefundDTO = {
        refundDetails: generateRefundForDisputeDTO.refundDetails,
        employeeId,
        financeStaffId: generateRefundForDisputeDTO.financeStaffId,
        disputeId: disputeObjectId,
      };

      return await this.createRefund(createRefundDTO, currentUserId);
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate refund for dispute: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Finance staff generate refund for approved claim (REQ-PY-46)
  async generateRefundForClaim(
    claimId: string,
    generateRefundForClaimDTO: GenerateRefundForClaimDTO,
    currentUserId: string,
  ) {
    try {
      if (!claimId || claimId.trim().length === 0) {
        throw new BadRequestException('Claim ID is required');
      }

      const claim = await this.claimModel.findOne({ claimId });
      if (!claim) {
        throw new NotFoundException(`Claim with ID ${claimId} not found`);
      }
      if (claim.status !== ClaimStatus.APPROVED) {
        throw new BadRequestException(
          `Claim must be approved before generating refund. Current status: ${claim.status}`,
        );
      }

      // Check if refund already exists for this claim (pending OR paid)
      const existingRefund = await this.refundModel.findOne({
        claimId: claim._id,
        status: { $in: [RefundStatus.PENDING, RefundStatus.PAID] },
      });
      if (existingRefund) {
        throw new BadRequestException(
          `A refund already exists for this claim (status: ${existingRefund.status}). Cannot create duplicate refunds.`,
        );
      }

      const employeeId = claim.employeeId.toString();
      const claimObjectId = claim._id.toString();
      const createRefundDTO: CreateRefundDTO = {
        refundDetails: generateRefundForClaimDTO.refundDetails,
        employeeId,
        financeStaffId: generateRefundForClaimDTO.financeStaffId,
        claimId: claimObjectId,
      };

      return await this.createRefund(createRefundDTO, currentUserId);
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate refund for claim: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== EMPLOYEE SELF-SERVICE METHODS (REQ-PY-1 to REQ-PY-15) ====================

  // REQ-PY-1: Employees view and download their payslips online
  // REQ-PY-2: Employees view status and details of their payslips (paid, disputed)
  async getPayslipsByEmployeeId(employeeId: string) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);
      const payslips = await this.payslipModel
        .find({ employeeId: validEmployeeId })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollRunId', 'runId payrollPeriod status entity')
        .sort({ createdAt: -1 })
        .exec();

      // Enhance each payslip with dispute status
      const enhancedPayslips = await Promise.all(
        payslips.map(async (payslip) => {
          const payslipId = payslip._id;
          const disputes = await this.disputeModel
            .find({ payslipId })
            .select('disputeId status description createdAt')
            .sort({ createdAt: -1 })
            .exec();

          const isDisputed = disputes.length > 0;
          const hasActiveDispute = disputes.some(
            (d) => d.status !== DisputeStatus.REJECTED,
          );

          const payslipData = payslip.toObject ? payslip.toObject() : payslip;
          return {
            ...payslipData,
            paymentStatus: payslip.paymentStatus,
            isDisputed,
            hasActiveDispute,
            disputeCount: disputes.length,
            // Overall status for display: "paid", "pending", "disputed", "paid-disputed"
            status: hasActiveDispute
              ? payslip.paymentStatus === PaySlipPaymentStatus.PAID
                ? 'paid-disputed'
                : 'disputed'
              : payslip.paymentStatus === PaySlipPaymentStatus.PAID
                ? 'paid'
                : 'pending',
          };
        }),
      );

      return enhancedPayslips;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve payslips: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-1: Employees download a specific payslip
  // REQ-PY-2: Employees view status and details of a specific payslip (paid, disputed)
  async getPayslipById(payslipId: string, employeeId: string) {
    try {
      const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);

      const payslip = await this.payslipModel
        .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollRunId', 'runId payrollPeriod status entity')
        .exec();

      if (!payslip) {
        throw new NotFoundException(
          `Payslip with ID ${payslipId} not found for this employee`,
        );
      }

      // Check if this payslip has any disputes (to show "disputed" status)
      const disputes = await this.disputeModel
        .find({ payslipId: validPayslipId })
        .select('disputeId status description createdAt')
        .sort({ createdAt: -1 })
        .exec();

      // Determine if payslip is disputed
      const isDisputed = disputes.length > 0;
      const hasActiveDispute = disputes.some(
        (d) => d.status !== DisputeStatus.REJECTED,
      );
      const latestDispute = disputes.length > 0 ? disputes[0] : null;

      // Return payslip with enhanced status information
      const payslipData = payslip.toObject ? payslip.toObject() : payslip;
      return {
        ...payslipData,
        // Payment status from payslip (PENDING or PAID)
        paymentStatus: payslip.paymentStatus,
        // Disputed status information
        isDisputed,
        hasActiveDispute,
        disputeCount: disputes.length,
        latestDispute: latestDispute
          ? {
              disputeId: latestDispute.disputeId,
              status: latestDispute.status,
              description: latestDispute.description,
              createdAt: (latestDispute as any)?.createdAt,
            }
          : null,
        // Overall status for display: "paid", "pending", "disputed", "paid-disputed"
        status: hasActiveDispute
          ? payslip.paymentStatus === PaySlipPaymentStatus.PAID
            ? 'paid-disputed'
            : 'disputed'
          : payslip.paymentStatus === PaySlipPaymentStatus.PAID
            ? 'paid'
            : 'pending',
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve payslip: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-1: Employees download a specific payslip as PDF
  async downloadPayslipAsPDF(payslipId: string, employeeId: string): Promise<Buffer> {
    try {
      const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);

      // Get payslip with populated data
      const payslip = await this.payslipModel
        .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
        .populate('employeeId', 'firstName lastName employeeNumber fullName')
        .populate('payrollRunId', 'runId payrollPeriod status entity')
        .exec();

      if (!payslip) {
        throw new NotFoundException(
          `Payslip with ID ${payslipId} not found for this employee`,
        );
      }

      // Get employee details
      const employee = await this.employeeProfileService.findOne(employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Get payroll run for period information
      const payrollRun = await this.payrollRunsModel.findById(payslip.payrollRunId).exec();
      const periodDate = payrollRun
        ? new Date(payrollRun.payrollPeriod)
        : new Date();
      const periodMonth = periodDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      // Check if pdfkit is available
      let PDFDocument: any;
      try {
        PDFDocument = require('pdfkit');
      } catch (e) {
        throw new BadRequestException(
          'PDF generation is not available. Please contact system administrator.',
        );
      }

      // Generate PDF in memory
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      // Collect PDF data
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      // Generate PDF content
      doc.fontSize(20).text('PAYSLIP', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(
        `Employee: ${employee.fullName || `${employee.firstName} ${employee.lastName}`}`,
      );
      doc.text(`Employee Number: ${employee.employeeNumber}`);
      doc.text(`Period: ${periodMonth}`);
      if (payrollRun?.runId) {
        doc.text(`Payroll Run: ${payrollRun.runId}`);
      }
      doc.moveDown();

      // Earnings section
      doc.fontSize(14).text('EARNINGS', { underline: true });
      doc.fontSize(10);
      doc.text(`Base Salary: $${payslip.earningsDetails.baseSalary.toFixed(2)}`);

      if (
        payslip.earningsDetails.allowances &&
        payslip.earningsDetails.allowances.length > 0
      ) {
        payslip.earningsDetails.allowances.forEach((allowance: any) => {
          doc.text(
            `  ${allowance.allowanceName || 'Allowance'}: $${(allowance.amount || 0).toFixed(2)}`,
          );
        });
      }

      if (
        payslip.earningsDetails.bonuses &&
        payslip.earningsDetails.bonuses.length > 0
      ) {
        payslip.earningsDetails.bonuses.forEach((bonus: any) => {
          doc.text(`  ${bonus.bonusName || 'Bonus'}: $${(bonus.amount || 0).toFixed(2)}`);
        });
      }

      if (
        payslip.earningsDetails.benefits &&
        payslip.earningsDetails.benefits.length > 0
      ) {
        payslip.earningsDetails.benefits.forEach((benefit: any) => {
          doc.text(`  ${benefit.benefitName || 'Benefit'}: $${(benefit.amount || 0).toFixed(2)}`);
        });
      }

      if (
        payslip.earningsDetails.refunds &&
        payslip.earningsDetails.refunds.length > 0
      ) {
        payslip.earningsDetails.refunds.forEach((refund: any) => {
          doc.text(
            `  Refund: $${(refund.refundAmount || 0).toFixed(2)} - ${refund.refundDescription || ''}`,
          );
        });
      }

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Gross Salary: $${payslip.totalGrossSalary.toFixed(2)}`, {
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
          doc.text(
            `  ${tax.taxName || 'Tax'} (${tax.taxRate || 0}%): $${(tax.taxAmount || 0).toFixed(2)}`,
          );
        });
      }

      if (
        payslip.deductionsDetails.insurances &&
        payslip.deductionsDetails.insurances.length > 0
      ) {
        payslip.deductionsDetails.insurances.forEach((insurance: any) => {
          doc.text(
            `  ${insurance.insuranceName || 'Insurance'}: $${(insurance.employeeContribution || 0).toFixed(2)}`,
          );
        });
      }

      if (payslip.deductionsDetails.penalties) {
        const penalties = payslip.deductionsDetails.penalties as any;
        if (penalties.missingHoursDeduction) {
          doc.text(`  Missing Hours Deduction: $${penalties.missingHoursDeduction.toFixed(2)}`);
        }
        if (penalties.missingDaysDeduction) {
          doc.text(`  Missing Days Deduction: $${penalties.missingDaysDeduction.toFixed(2)}`);
        }
        if (penalties.unpaidLeaveDeduction) {
          doc.text(`  Unpaid Leave Deduction: $${penalties.unpaidLeaveDeduction.toFixed(2)}`);
        }
        if (penalties.totalPenalties) {
          doc.text(`  Total Penalties: $${penalties.totalPenalties.toFixed(2)}`);
        }
      }

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Deductions: $${(payslip.totaDeductions || 0).toFixed(2)}`, {
          underline: true,
        });

      // Summary
      doc.moveDown();
      doc.fontSize(16).text('NET PAY', { align: 'center', underline: true });
      doc
        .fontSize(18)
        .text(`$${payslip.netPay.toFixed(2)}`, { align: 'center' });

      doc.end();

      // Wait for PDF to be generated and return buffer
      return new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate PDF: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-3: Employees view base salary according to employment contract
  async getEmployeeBaseSalary(employeeId: string) {
    try {
      // Use EmployeeProfileService for proper validation and populated data
      const employee = await this.employeeProfileService.findOne(employeeId);

      // Extract payGradeId - handle both populated and non-populated cases
      let payGradeIdValue: string | null = null;
      if (employee.payGradeId) {
        payGradeIdValue = (employee.payGradeId as any)?._id?.toString() || 
                         (employee.payGradeId as any)?.toString() || 
                         null;
      }

      // Enrich pay grade details using PayrollConfigurationService
      let payGradeDetails: any = null;
      let baseSalary: number | null = null;
      let grossSalary: number | null = null;

      if (payGradeIdValue) {
        try {
          const payGrade = await this.payrollConfigurationService.findOnePayGrade(payGradeIdValue);
          if (payGrade) {
            // Extract base salary and gross salary regardless of status
            baseSalary = payGrade.baseSalary || null;
            grossSalary = payGrade.grossSalary || null;

            // Include full pay grade details
            payGradeDetails = {
              _id: (payGrade as any)._id?.toString(),
              grade: payGrade.grade,
              baseSalary: payGrade.baseSalary,
              grossSalary: payGrade.grossSalary,
              status: payGrade.status,
              // Include status warning if not approved
              ...(payGrade.status !== ConfigStatus.APPROVED && {
                statusWarning: `Pay grade status is ${payGrade.status}. Base salary may not be active.`,
              }),
            };
          }
        } catch (error: any) {
          // If pay grade not found, log warning but continue
          console.warn(`Pay grade not found for employee ${employeeId}: ${error?.message}`);
        }
      }

      // Build response with base salary at root level
      const response: any = {
        employeeId: (employee as any)._id?.toString() || (employee as any).id?.toString() || employeeId,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        contractType: employee.contractType,
        workType: employee.workType,
        payGradeId: payGradeIdValue,
        payGradeDetails: payGradeDetails,
        // Base salary at root level for easy access
        baseSalary: baseSalary,
        grossSalary: grossSalary,
        contractStartDate: employee.contractStartDate,
        contractEndDate: employee.contractEndDate,
      };

      // Add warning if no pay grade is assigned
      if (!payGradeIdValue) {
        response.warning = 'No pay grade assigned to this employee. Base salary information is not available.';
      } else if (!baseSalary) {
        response.warning = 'Pay grade found but base salary information is not available.';
      }

      return response;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve base salary: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-5: Employees view compensation for unused/encashed leave days
  async getLeaveEncashmentByEmployeeId(employeeId: string, payrollRunId?: string) {
    try {
      // Get employee profile using EmployeeProfileService (includes payGradeId populated)
      const employee = await this.employeeProfileService.findOne(employeeId);
      const validEmployeeId = new Types.ObjectId((employee as any)._id?.toString() || employeeId);

      // Get leave entitlements with full details
      const leaveEntitlements = await this.leaveEntitlementModel
        .find({ employeeId: validEmployeeId })
        .populate('leaveTypeId', 'name code paid encashable')
        .exec();

      // Get payroll run and payslip
      let payrollRun;
      let payslip;
      if (payrollRunId) {
        const validPayrollRunId = this.validateObjectId(payrollRunId, 'payrollRunId');
        payrollRun = await this.payrollRunsModel.findById(validPayrollRunId).exec();
        if (!payrollRun) {
          throw new NotFoundException(`Payroll run with ID ${payrollRunId} not found`);
        }
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId, payrollRunId: validPayrollRunId })
          .populate('payrollRunId')
          .exec();
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .populate('payrollRunId')
          .sort({ createdAt: -1 })
          .exec();
        if (payslip && payslip.payrollRunId) {
          payrollRun = await this.payrollRunsModel.findById(payslip.payrollRunId).exec();
        }
      }

      // Get leave encashment from payslip earnings
      const leaveEncashment = payslip?.earningsDetails?.allowances?.filter(
        (allowance: any) => 
          allowance.type === 'LEAVE_ENCASHMENT' || 
          allowance.name?.toLowerCase().includes('leave') ||
          allowance.name?.toLowerCase().includes('encashment'),
      ) || [];

      // Enrich leave encashment allowances with configuration details
      const enrichedLeaveEncashment = await Promise.all(
        leaveEncashment.map(async (enc: any) => {
          try {
            // Try to find matching allowance configuration
            if (enc.name) {
              const allowancesResult = await this.payrollConfigurationService.findAllAllowances({
                status: ConfigStatus.APPROVED,
                page: 1,
                limit: 100,
              });
              const matchingAllowance = allowancesResult.data.find(
                (allowance: any) => allowance.name === enc.name || allowance._id?.toString() === enc._id?.toString(),
              );
              if (matchingAllowance) {
                return {
                  ...enc,
                  configurationDetails: {
                    name: matchingAllowance.name,
                    amount: matchingAllowance.amount,
                    status: matchingAllowance.status,
                    approvedAt: matchingAllowance.approvedAt,
                  },
                };
              }
            }
            return enc;
          } catch (error: any) {
            console.warn(`Failed to enrich leave encashment allowance: ${error?.message}`);
            return enc;
          }
        }),
      );

      // Calculate potential encashment for unused leave days
      // Base salary for daily calculation (assuming monthly salary)
      const baseSalary = (employee.payGradeId as any)?.baseSalary || 0;
      const dailySalary = baseSalary > 0 ? baseSalary / 30 : 0; // Approximate daily salary

      // Calculate unused leave days that could be encashed
      const encashableLeaves = leaveEntitlements
        .filter((ent) => {
          const leaveType = ent.leaveTypeId as any;
          return leaveType && (leaveType.encashable !== false) && ent.remaining > 0;
        })
        .map((ent) => {
          const leaveType = ent.leaveTypeId as any;
          const potentialEncashment = ent.remaining * dailySalary;
      return {
            leaveType: {
              id: leaveType._id || leaveType,
              name: leaveType.name,
              code: leaveType.code,
            },
            remainingDays: ent.remaining,
            accruedDays: ent.accruedActual,
            takenDays: ent.taken,
            potentialEncashmentAmount: potentialEncashment,
            isEncashable: leaveType.encashable !== false,
          };
        });

      // Get payroll period info if available
      let payrollPeriodInfo: {
        payrollRunId: any;
        runId: string;
        period: Date;
        startDate: Date;
        endDate: Date;
      } | null = null;
      if (payrollRun) {
        const { startDate, endDate } = this.getPayrollPeriodDateRange(payrollRun);
        payrollPeriodInfo = {
          payrollRunId: payrollRun._id,
          runId: payrollRun.runId,
          period: payrollRun.payrollPeriod,
          startDate,
          endDate,
        };
      }

      return {
        employeeId: validEmployeeId,
        employeeNumber: employee.employeeNumber,
        baseSalary,
        dailySalary,
        leaveEntitlements: leaveEntitlements.map((ent) => ({
          leaveType: ent.leaveTypeId,
          remaining: ent.remaining,
          accrued: ent.accruedActual,
          taken: ent.taken,
          yearlyEntitlement: ent.yearlyEntitlement,
        })),
        encashableLeaves,
        encashmentInPayslip: enrichedLeaveEncashment.map((enc: any) => ({
          type: enc.type,
          name: enc.name,
          amount: enc.amount,
          description: enc.description,
          configurationDetails: enc.configurationDetails,
        })),
        totalEncashmentInPayslip: enrichedLeaveEncashment.reduce(
          (sum: number, enc: any) => sum + (enc.amount || 0),
          0,
        ),
        payslipId: payslip?._id,
        payrollPeriod: payrollPeriodInfo,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve leave encashment: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-7: Employees view transportation/commuting compensation
  async getTransportationAllowance(employeeId: string, payslipId?: string) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);

      let payslip;
      if (payslipId) {
        const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
        payslip = await this.payslipModel
          .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
          .exec();
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .sort({ createdAt: -1 })
          .exec();
      }

      if (!payslip) {
        throw new NotFoundException('No payslip found for this employee');
      }

      const transportationAllowance = payslip.earningsDetails?.allowances?.filter(
        (allowance: any) =>
          allowance.type === 'TRANSPORTATION' ||
          allowance.name?.toLowerCase().includes('transport') ||
          allowance.name?.toLowerCase().includes('commuting'),
      ) || [];

      // Enrich transportation allowances with configuration details
      const enrichedTransportationAllowance = await Promise.all(
        transportationAllowance.map(async (allowance: any) => {
          try {
            if (allowance.name) {
              const allowancesResult = await this.payrollConfigurationService.findAllAllowances({
                status: ConfigStatus.APPROVED,
                page: 1,
                limit: 100,
              });
              const matchingAllowance = allowancesResult.data.find(
                (configAllowance: any) => configAllowance.name === allowance.name || configAllowance._id?.toString() === allowance._id?.toString(),
              );
              if (matchingAllowance) {
                return {
                  ...allowance,
                  configurationDetails: {
                    name: matchingAllowance.name,
                    amount: matchingAllowance.amount,
                    status: matchingAllowance.status,
                    approvedAt: matchingAllowance.approvedAt,
                  },
                };
              }
            }
            return allowance;
          } catch (error: any) {
            console.warn(`Failed to enrich transportation allowance: ${error?.message}`);
            return allowance;
          }
        }),
      );

      return {
        payslipId: payslip._id,
        payrollPeriod: payslip.payrollRunId,
        transportationAllowance: enrichedTransportationAllowance,
        totalTransportationAllowance: enrichedTransportationAllowance.reduce(
          (sum: number, allowance: any) => sum + (allowance.amount || 0),
          0,
        ),
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve transportation allowance: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-8: Employees view detailed tax deductions with law/rule applied
  async getTaxDeductions(employeeId: string, payslipId?: string) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);

      let payslip;
      if (payslipId) {
        const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
        payslip = await this.payslipModel
          .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
          .populate('payrollRunId')
          .exec();
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .populate('payrollRunId')
          .sort({ createdAt: -1 })
          .exec();
      }

      if (!payslip) {
        throw new NotFoundException('No payslip found for this employee');
      }

      // Enrich tax deductions with full tax rule details (including laws/rules from description)
      const taxDeductions = payslip.deductionsDetails?.taxes || [];
      const enrichedTaxDeductions = await Promise.all(
        taxDeductions.map((tax: any) => this.enrichTaxDeductionWithConfiguration(tax)),
      );

      return {
        payslipId: payslip._id,
        payrollPeriod: payslip.payrollRunId,
        taxDeductions: enrichedTaxDeductions,
        totalTaxDeductions: enrichedTaxDeductions.reduce(
          (sum: number, tax: any) => sum + (tax.amount || tax.taxAmount || 0),
          0,
        ),
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve tax deductions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-9: Employees view insurance deductions itemized
  async getInsuranceDeductions(employeeId: string, payslipId?: string) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);

      let payslip;
      if (payslipId) {
        const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
        payslip = await this.payslipModel
          .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
          .populate('payrollRunId')
          .exec();
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .populate('payrollRunId')
          .sort({ createdAt: -1 })
          .exec();
      }

      if (!payslip) {
        throw new NotFoundException('No payslip found for this employee');
      }

      // Enrich insurance deductions with full configuration details from PayrollConfigurationService
      const insuranceDeductions = payslip.deductionsDetails?.insurances || [];
      const enrichedInsuranceDeductions = await Promise.all(
        insuranceDeductions.map((insurance: any) => this.enrichInsuranceDeductionWithConfiguration(insurance)),
      );

      return {
        payslipId: payslip._id,
        payrollPeriod: payslip.payrollRunId,
        insuranceDeductions: enrichedInsuranceDeductions,
        totalInsuranceDeductions: enrichedInsuranceDeductions.reduce(
          (sum: number, insurance: any) => sum + (insurance.amount || 0),
          0,
        ),
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve insurance deductions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-10: Employees view salary deductions due to misconduct/absenteeism
  async getMisconductDeductions(employeeId: string, payslipId?: string) {
    try {
      // Get employee profile using EmployeeProfileService (includes payGradeId populated)
      const employee = await this.employeeProfileService.findOne(employeeId);
      const validEmployeeId = new Types.ObjectId((employee as any)._id?.toString() || employeeId);

      // Get payroll run and payslip
      let payrollRun;
      let payslip;
      let payrollPeriodRange: { startDate: Date; endDate: Date } | null = null;

      if (payslipId) {
        const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
        payslip = await this.payslipModel
          .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
          .populate('payrollRunId')
          .exec();
        if (!payslip) {
          throw new NotFoundException(`Payslip with ID ${payslipId} not found for this employee`);
        }
        if (payslip.payrollRunId) {
          payrollRun = await this.payrollRunsModel.findById(payslip.payrollRunId).exec();
          if (payrollRun) {
            payrollPeriodRange = this.getPayrollPeriodDateRange(payrollRun);
          }
        }
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .populate('payrollRunId')
          .sort({ createdAt: -1 })
          .exec();
      if (!payslip) {
        throw new NotFoundException('No payslip found for this employee');
      }
        if (payslip.payrollRunId) {
          payrollRun = await this.payrollRunsModel.findById(payslip.payrollRunId).exec();
          if (payrollRun) {
            payrollPeriodRange = this.getPayrollPeriodDateRange(payrollRun);
          }
        }
      }

      // Get all time exceptions that could result in deductions
      // Status should be RESOLVED (meaning they've been processed and may result in deductions)
      const allTimeExceptions = await this.timeExceptionModel
        .find({
          employeeId: validEmployeeId,
          status: { $in: [TimeExceptionStatus.RESOLVED, TimeExceptionStatus.APPROVED] },
          type: {
            $in: [
              TimeExceptionType.LATE,
              TimeExceptionType.SHORT_TIME,
              TimeExceptionType.EARLY_LEAVE,
              TimeExceptionType.MISSED_PUNCH,
            ],
          },
        })
        .populate('attendanceRecordId')
        .sort({ _id: -1 }) // Use _id for sorting since TimeException doesn't have timestamps
        .exec();

      // Filter time exceptions by payroll period if available
      let relevantTimeExceptions = allTimeExceptions;
      if (payrollPeriodRange) {
        relevantTimeExceptions = allTimeExceptions.filter((exception) => {
          const attendanceRecord = exception.attendanceRecordId as any;
          if (!attendanceRecord) {
            // If no attendance record available, include it (better to show than hide)
            return true;
          }
          
          // Get date from first punch in attendance record (since AttendanceRecord doesn't have createdAt)
          let exceptionDate: Date | undefined;
          if (attendanceRecord.punches && Array.isArray(attendanceRecord.punches) && attendanceRecord.punches.length > 0) {
            // Use the first punch time as the date
            exceptionDate = new Date(attendanceRecord.punches[0].time);
          } else {
            // If no punches available, include it (better to show than hide)
            return true;
          }
          
          return this.isDateInRange(
            exceptionDate,
            payrollPeriodRange!.startDate,
            payrollPeriodRange!.endDate,
          );
        });
      }

      // Get attendance records for the payroll period to check for absenteeism
      // Note: AttendanceRecord doesn't have timestamps, so we can't filter by createdAt
      // We'll get all finalized records and filter by punch times if needed
      let attendanceRecords: AttendanceRecordDocument[] = [];
      if (payrollPeriodRange) {
        // Get all finalized attendance records for the employee
        const allAttendanceRecords = await this.attendanceRecordModel
          .find({
            employeeId: validEmployeeId,
            finalisedForPayroll: true,
          })
          .exec();
        
        // Filter by first punch time within the payroll period
        attendanceRecords = allAttendanceRecords.filter((record) => {
          if (!record.punches || record.punches.length === 0) {
            return false; // Skip records without punches
          }
          const firstPunchTime = new Date(record.punches[0].time);
          return this.isDateInRange(
            firstPunchTime,
            payrollPeriodRange.startDate,
            payrollPeriodRange.endDate,
          );
        });
      }

      // Calculate base salary for deductions
      const baseSalary = (employee.payGradeId as any)?.baseSalary || 0;
      const dailySalary = baseSalary > 0 ? baseSalary / 30 : 0;
      const hourlySalary = dailySalary > 0 ? dailySalary / 8 : 0;

      // Categorize time exceptions
      const lateExceptions = relevantTimeExceptions.filter(
        (ex) => ex.type === TimeExceptionType.LATE,
      );
      const earlyLeaveExceptions = relevantTimeExceptions.filter(
        (ex) => ex.type === TimeExceptionType.EARLY_LEAVE,
      );
      const shortTimeExceptions = relevantTimeExceptions.filter(
        (ex) => ex.type === TimeExceptionType.SHORT_TIME,
      );
      const missedPunchExceptions = relevantTimeExceptions.filter(
        (ex) => ex.type === TimeExceptionType.MISSED_PUNCH,
      );

      // Get penalties from payslip
      const payslipPenalties = payslip.deductionsDetails?.penalties || null;

      // Calculate potential deductions (this is informational - actual deductions are in payslip)
      const misconductSummary = {
        lateCount: lateExceptions.length,
        earlyLeaveCount: earlyLeaveExceptions.length,
        shortTimeCount: shortTimeExceptions.length,
        missedPunchCount: missedPunchExceptions.length,
        totalExceptions: relevantTimeExceptions.length,
      };

      return {
        employeeId: validEmployeeId,
        employeeNumber: employee.employeeNumber,
        payslipId: payslip._id,
        payrollPeriod: payrollRun ? {
          payrollRunId: payrollRun._id,
          runId: payrollRun.runId,
          period: payrollRun.payrollPeriod,
          startDate: payrollPeriodRange?.startDate,
          endDate: payrollPeriodRange?.endDate,
        } : null,
        baseSalary,
        dailySalary,
        hourlySalary,
        penalties: payslipPenalties,
        misconductSummary,
        timeExceptions: {
          all: relevantTimeExceptions.map((ex) => {
            const attendanceRecord = ex.attendanceRecordId as any;
            // Get date from first punch in attendance record (since AttendanceRecord doesn't have createdAt)
            let exceptionDate: Date | undefined;
            if (attendanceRecord && typeof attendanceRecord === 'object') {
              if (attendanceRecord.punches && Array.isArray(attendanceRecord.punches) && attendanceRecord.punches.length > 0) {
                exceptionDate = new Date(attendanceRecord.punches[0].time);
              }
            }
            return {
              id: ex._id,
              type: ex.type,
              status: ex.status,
              reason: ex.reason,
              attendanceRecordId: ex.attendanceRecordId,
              date: exceptionDate,
            };
          }),
          late: lateExceptions.map((ex) => ({
            id: ex._id,
            type: ex.type,
            status: ex.status,
            reason: ex.reason,
            attendanceRecordId: ex.attendanceRecordId,
          })),
          earlyLeave: earlyLeaveExceptions.map((ex) => ({
            id: ex._id,
            type: ex.type,
            status: ex.status,
            reason: ex.reason,
            attendanceRecordId: ex.attendanceRecordId,
          })),
          shortTime: shortTimeExceptions.map((ex) => ({
            id: ex._id,
            type: ex.type,
            status: ex.status,
            reason: ex.reason,
            attendanceRecordId: ex.attendanceRecordId,
          })),
          missedPunch: missedPunchExceptions.map((ex) => ({
            id: ex._id,
            type: ex.type,
            status: ex.status,
            reason: ex.reason,
            attendanceRecordId: ex.attendanceRecordId,
          })),
        },
        attendanceRecords: attendanceRecords.length,
        note: 'Actual deductions are reflected in the payslip penalties. This is informational data showing time exceptions that may have resulted in deductions.',
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve misconduct deductions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-11: Employees view deductions for unpaid leave days
  async getUnpaidLeaveDeductions(employeeId: string, payslipId?: string) {
    try {
      // Get employee profile using EmployeeProfileService (includes payGradeId populated)
      const employee = await this.employeeProfileService.findOne(employeeId);
      const validEmployeeId = new Types.ObjectId((employee as any)._id?.toString() || employeeId);

      // Get payroll run and payslip
      let payrollRun;
      let payslip;
      let payrollPeriodRange: { startDate: Date; endDate: Date } | null = null;

      if (payslipId) {
        const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
        payslip = await this.payslipModel
          .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
          .populate('payrollRunId')
          .exec();
        if (!payslip) {
          throw new NotFoundException(`Payslip with ID ${payslipId} not found for this employee`);
        }
        if (payslip.payrollRunId) {
          payrollRun = await this.payrollRunsModel.findById(payslip.payrollRunId).exec();
          if (payrollRun) {
            payrollPeriodRange = this.getPayrollPeriodDateRange(payrollRun);
          }
        }
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .populate('payrollRunId')
          .sort({ createdAt: -1 })
          .exec();
        if (payslip && payslip.payrollRunId) {
          payrollRun = await this.payrollRunsModel.findById(payslip.payrollRunId).exec();
          if (payrollRun) {
            payrollPeriodRange = this.getPayrollPeriodDateRange(payrollRun);
          }
        }
      }

      // Get all approved leave requests
      const allLeaveRequests = await this.leaveRequestModel
        .find({
          employeeId: validEmployeeId,
          status: LeaveStatus.APPROVED,
        })
        .populate('leaveTypeId', 'name code paid deductible')
        .sort({ 'dates.from': -1 })
        .exec();

      // Filter unpaid leave requests (where paid === false)
      const unpaidLeaveRequests = allLeaveRequests.filter(
        (request) => {
          const leaveType = request.leaveTypeId as any;
          return leaveType && leaveType.paid === false;
        },
      );

      // Filter by payroll period if available
      let relevantUnpaidLeaves = unpaidLeaveRequests;
      if (payrollPeriodRange) {
        relevantUnpaidLeaves = unpaidLeaveRequests.filter((leave) => {
          const leaveStart = new Date(leave.dates.from);
          const leaveEnd = new Date(leave.dates.to);
          return this.doDateRangesOverlap(
            leaveStart,
            leaveEnd,
            payrollPeriodRange!.startDate,
            payrollPeriodRange!.endDate,
          );
        });
      }

      // Calculate base salary for daily/hourly calculation
      const baseSalary = (employee.payGradeId as any)?.baseSalary || 0;
      const dailySalary = baseSalary > 0 ? baseSalary / 30 : 0; // Approximate daily salary
      const hourlySalary = dailySalary > 0 ? dailySalary / 8 : 0; // Approximate hourly salary

      // Calculate deductions for each unpaid leave
      const unpaidLeaveDeductions = relevantUnpaidLeaves.map((leave) => {
        const leaveType = leave.leaveTypeId as any;
        const deductionAmount = leave.durationDays * dailySalary;
        
        // Calculate days within payroll period if filtering by period
        let daysInPeriod = leave.durationDays;
        if (payrollPeriodRange) {
          const leaveStart = new Date(leave.dates.from);
          const leaveEnd = new Date(leave.dates.to);
          const periodStart = new Date(payrollPeriodRange.startDate);
          const periodEnd = new Date(payrollPeriodRange.endDate);
          
          // Calculate overlapping days
          const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
          const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
          if (overlapStart <= overlapEnd) {
            const diffTime = overlapEnd.getTime() - overlapStart.getTime();
            daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          } else {
            daysInPeriod = 0;
          }
      }

      return {
          leaveRequestId: leave._id,
          leaveType: {
            id: leaveType._id || leaveType,
            name: leaveType.name,
            code: leaveType.code,
            paid: leaveType.paid,
            deductible: leaveType.deductible,
          },
          dates: {
            from: leave.dates.from,
            to: leave.dates.to,
          },
          durationDays: leave.durationDays,
          daysInPayrollPeriod: daysInPeriod,
          dailySalary,
          deductionAmount: daysInPeriod * dailySalary,
          justification: leave.justification,
          status: leave.status,
        };
      });

      // Calculate total deduction amount
      const totalDeductionAmount = unpaidLeaveDeductions.reduce(
        (sum, deduction) => sum + (deduction.deductionAmount || 0),
        0,
      );

      // Get deduction from payslip if available
      const payslipDeduction = payslip?.deductionsDetails?.penalties?.unpaidLeaveDeduction || null;

      return {
        employeeId: validEmployeeId,
        employeeNumber: employee.employeeNumber,
        baseSalary,
        dailySalary,
        hourlySalary,
        unpaidLeaveRequests: unpaidLeaveDeductions,
        totalUnpaidLeaveDays: relevantUnpaidLeaves.reduce(
          (sum, leave) => sum + leave.durationDays,
          0,
        ),
        totalDeductionAmount,
        payslipDeduction,
        payslipId: payslip?._id,
        payrollPeriod: payrollRun ? {
          payrollRunId: payrollRun._id,
          runId: payrollRun.runId,
          period: payrollRun.payrollPeriod,
          startDate: payrollPeriodRange?.startDate,
          endDate: payrollPeriodRange?.endDate,
        } : null,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve unpaid leave deductions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-13: Employees access salary history
  async getSalaryHistory(employeeId: string, limit = 12) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);
      return await this.payslipModel
        .find({ employeeId: validEmployeeId })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payrollRunId', 'runId payrollPeriod status entity')
        .select('earningsDetails deductionsDetails totalGrossSalary totaDeductions netPay paymentStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve salary history: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-14: Employees view employer contributions
  async getEmployerContributions(employeeId: string, payslipId?: string) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);

      let payslip;
      if (payslipId) {
        const validPayslipId = this.validateObjectId(payslipId, 'payslipId');
        payslip = await this.payslipModel
          .findOne({ _id: validPayslipId, employeeId: validEmployeeId })
          .populate('payrollRunId')
          .exec();
      } else {
        payslip = await this.payslipModel
          .findOne({ employeeId: validEmployeeId })
          .populate('payrollRunId')
          .sort({ createdAt: -1 })
          .exec();
      }

      if (!payslip) {
        throw new NotFoundException('No payslip found for this employee');
      }

      // Employer contributions are typically in insurance brackets
      const employerContributions = payslip.deductionsDetails?.insurances?.map(
        (insurance: any) => ({
          type: insurance.type,
          employeeContribution: insurance.employeeContribution || 0,
          employerContribution: insurance.employerContribution || 0,
          total: insurance.amount || 0,
        }),
      ) || [];

      return {
        payslipId: payslip._id,
        payrollPeriod: payslip.payrollRunId,
        employerContributions,
        totalEmployerContributions: employerContributions.reduce(
          (sum, contrib) => sum + (contrib.employerContribution || 0),
          0,
        ),
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve employer contributions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-15: Employees download tax documents (annual tax statement)
  async getTaxDocuments(employeeId: string, year?: number) {
    try {
      const validEmployeeId = await this.validateEmployeeExists(employeeId, false);
      const targetYear = year || new Date().getFullYear();

      // Get all payslips for the year
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31);

      const payrollRuns = await this.payrollRunsModel
        .find({
          payrollPeriod: { $gte: startDate, $lte: endDate },
        })
        .exec();

      const payrollRunIds = payrollRuns.map((run) => run._id);

      const payslips = await this.payslipModel
        .find({
          employeeId: validEmployeeId,
          payrollRunId: { $in: payrollRunIds },
        })
        .populate('payrollRunId', 'runId payrollPeriod')
        .sort({ createdAt: 1 })
        .exec();

      // Calculate annual totals
      const annualTotals = {
        totalGrossSalary: payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0),
        totalDeductions: payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0),
        totalNetPay: payslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
        totalTaxes: payslips.reduce(
          (sum, p) =>
            sum +
            (p.deductionsDetails?.taxes?.reduce(
              (taxSum: number, tax: any) => taxSum + (tax.amount || 0),
              0,
            ) || 0),
          0,
        ),
        payslips: payslips.map((p) => ({
          payslipId: p._id,
          payrollPeriod: p.payrollRunId,
          grossSalary: p.totalGrossSalary,
          deductions: p.totaDeductions,
          netPay: p.netPay,
        })),
      };

      return {
        employeeId: validEmployeeId,
        year: targetYear,
        annualStatement: annualTotals,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve tax documents: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== OPERATIONAL REPORTS METHODS (REQ-PY-25, REQ-PY-29, REQ-PY-38) ====================

  // REQ-PY-38: Payroll specialist generate payroll reports by department
  async getPayrollReportByDepartment(departmentId: string, payrollRunId?: string) {
    try {
      const validDepartmentId = this.validateObjectId(departmentId, 'departmentId');
      
      // Get department with populated head position
      const department = await this.departmentModel
        .findById(validDepartmentId)
        .populate('headPositionId', 'title code')
        .exec();

      if (!department) {
        throw new NotFoundException(`Department with ID ${departmentId} not found`);
      }

      if (!department.isActive) {
        throw new BadRequestException(`Department ${department.name} is not active`);
      }

      // Get all positions in this department
      const positions = await this.positionModel
        .find({ departmentId: validDepartmentId, isActive: true })
        .select('_id code title')
        .exec();

      // Get employees in this department using EmployeeProfileService
      const employeesData = await this.employeeProfileService.findByDepartment(departmentId);
      const employees = employeesData
        .filter(emp => emp.status === EmployeeStatus.ACTIVE)
        .map(emp => ({
          _id: new Types.ObjectId((emp as any)._id?.toString() || (emp as any).id?.toString()),
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeNumber: emp.employeeNumber,
          primaryPositionId: emp.primaryPositionId,
        }));

      const employeeIds = employees.map((emp) => emp._id);

      // Get active position assignments for this department (for additional context)
      const activePositionAssignments = await this.positionAssignmentModel
        .find({
          departmentId: validDepartmentId,
          endDate: { $exists: false }, // No end date means currently active
        })
        .populate('positionId', 'code title')
        .populate('employeeProfileId', 'firstName lastName employeeNumber')
        .exec();

      let payrollRun;
      if (payrollRunId) {
        const validPayrollRunId = this.validateObjectId(payrollRunId, 'payrollRunId');
        payrollRun = await this.payrollRunsModel.findById(validPayrollRunId).exec();
        if (!payrollRun) {
          throw new NotFoundException(`Payroll run with ID ${payrollRunId} not found`);
        }
      } else {
        payrollRun = await this.payrollRunsModel
          .findOne()
          .sort({ createdAt: -1 })
          .exec();
      }

      if (!payrollRun) {
        throw new NotFoundException('No payroll run found');
      }

      // Get payslips for employees in this department
      const payslips = await this.payslipModel
        .find({
          employeeId: { $in: employeeIds },
          payrollRunId: payrollRun._id,
        })
        .populate('employeeId', 'firstName lastName employeeNumber primaryPositionId')
        .exec();

      // Calculate detailed breakdown
      const totalGrossSalary = payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0);
      const totalDeductions = payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
      const totalNetPay = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);

      // Calculate taxes and insurance by department
      const taxBreakdown: Record<string, number> = {};
      const insuranceBreakdown: Record<string, { employee: number; employer: number }> = {};
      let totalTaxes = 0;
      let totalEmployeeInsurance = 0;
      let totalEmployerInsurance = 0;

      payslips.forEach((payslip) => {
        // Taxes
        payslip.deductionsDetails?.taxes?.forEach((tax: any) => {
          const taxType = tax.type || tax.name || 'Unknown';
          taxBreakdown[taxType] = (taxBreakdown[taxType] || 0) + (tax.amount || 0);
          totalTaxes += tax.amount || 0;
        });

        // Insurance
        payslip.deductionsDetails?.insurances?.forEach((insurance: any) => {
          const insType = insurance.type || insurance.name || 'Unknown';
          if (!insuranceBreakdown[insType]) {
            insuranceBreakdown[insType] = { employee: 0, employer: 0 };
          }
          insuranceBreakdown[insType].employee += insurance.employeeContribution || 0;
          insuranceBreakdown[insType].employer += insurance.employerContribution || 0;
          totalEmployeeInsurance += insurance.employeeContribution || 0;
          totalEmployerInsurance += insurance.employerContribution || 0;
        });
      });

      // Group payslips by position for analysis
      const payslipsByPosition: Record<string, any[]> = {};
      payslips.forEach((payslip) => {
        const employee = payslip.employeeId as any;
        const positionId = employee?.primaryPositionId?._id?.toString() || employee?.primaryPositionId?.toString() || 'UNASSIGNED';
        if (!payslipsByPosition[positionId]) {
          payslipsByPosition[positionId] = [];
        }
        payslipsByPosition[positionId].push(payslip);
      });

      const report = {
        department: {
          id: department._id,
          name: department.name,
          code: department.code,
          description: department.description,
          isActive: department.isActive,
          headPosition: department.headPositionId ? {
            id: (department.headPositionId as any)?._id,
            title: (department.headPositionId as any)?.title,
            code: (department.headPositionId as any)?.code,
          } : null,
        },
        organizationStructure: {
          totalPositions: positions.length,
          positions: positions.map((pos) => ({
            id: pos._id,
            code: pos.code,
            title: pos.title,
          })),
          activeAssignments: activePositionAssignments.length,
        },
        payrollRun: {
          id: payrollRun._id,
          runId: payrollRun.runId,
          payrollPeriod: payrollRun.payrollPeriod,
          status: payrollRun.status,
          paymentStatus: payrollRun.paymentStatus,
        },
        summary: {
          totalEmployees: employees.length,
          employeesWithPayslips: payslips.length,
          employeesWithoutPayslips: employees.length - payslips.length,
          totalGrossSalary,
          totalDeductions,
          totalNetPay,
          averageGrossSalary: payslips.length > 0 ? totalGrossSalary / payslips.length : 0,
          averageNetPay: payslips.length > 0 ? totalNetPay / payslips.length : 0,
        },
        financialBreakdown: {
          taxes: {
            breakdown: taxBreakdown,
            total: totalTaxes,
          },
          insurance: {
            breakdown: insuranceBreakdown,
            totalEmployeeContributions: totalEmployeeInsurance,
            totalEmployerContributions: totalEmployerInsurance,
            total: totalEmployeeInsurance + totalEmployerInsurance,
          },
        },
        payslipsByPosition: Object.keys(payslipsByPosition).map((positionId) => {
          const positionPayslips = payslipsByPosition[positionId];
          const position = positions.find((p) => p._id.toString() === positionId);
          return {
            position: position ? {
              id: position._id,
              code: position.code,
              title: position.title,
            } : { id: 'UNASSIGNED', code: 'UNASSIGNED', title: 'Unassigned Position' },
            employeeCount: positionPayslips.length,
            totalGrossSalary: positionPayslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0),
            totalDeductions: positionPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0),
            totalNetPay: positionPayslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
          };
        }),
        payslips: payslips.map((p) => {
          const employee = p.employeeId as any;
          return {
            employee: {
              id: employee?._id || employee,
              firstName: employee?.firstName,
              lastName: employee?.lastName,
              employeeNumber: employee?.employeeNumber,
              position: employee?.primaryPositionId ? {
                id: (employee.primaryPositionId as any)?._id,
                title: (employee.primaryPositionId as any)?.title,
                code: (employee.primaryPositionId as any)?.code,
              } : null,
            },
          grossSalary: p.totalGrossSalary,
          deductions: p.totaDeductions,
          netPay: p.netPay,
          paymentStatus: p.paymentStatus,
            payslipId: p._id,
          };
        }),
      };

      return report;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate department report: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-29: Finance staff generate month-end and year-end payroll summaries
  async getPayrollSummary(period: 'month' | 'year', date?: Date, departmentId?: string) {
    try {
      const targetDate = date || new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === 'month') {
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(targetDate.getFullYear(), 0, 1);
        endDate = new Date(targetDate.getFullYear(), 11, 31);
      }

      // Filter by department if provided
      let department: DepartmentDocument | null = null;
      let employeeIds: Types.ObjectId[] | null = null;
      
      if (departmentId) {
        const validDepartmentId = this.validateObjectId(departmentId, 'departmentId');
        department = await this.departmentModel.findById(validDepartmentId).exec();
        if (!department) {
          throw new NotFoundException(`Department with ID ${departmentId} not found`);
        }
        
        // Get employees in this department using EmployeeProfileService
        const employees = await this.employeeProfileService.findByDepartment(departmentId);
        // Filter to only active employees and extract IDs
        employeeIds = employees
          .filter(emp => emp.status === EmployeeStatus.ACTIVE)
          .map((emp) => new Types.ObjectId((emp as any)._id?.toString() || (emp as any).id?.toString()));
        
        if (employeeIds.length === 0) {
          // Return empty summary if no employees in department
          return {
            period,
            startDate,
            endDate,
            department: {
              id: department._id,
              name: department.name,
              code: department.code,
            },
            totalPayrollRuns: 0,
            totalEmployees: 0,
            totalGrossSalary: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            payrollRuns: [],
            departmentBreakdown: null,
          };
        }
      }

      const payrollRuns = await this.payrollRunsModel
        .find({
          payrollPeriod: { $gte: startDate, $lte: endDate },
          status: 'FINALIZED',
        })
        .populate('payrollSpecialistId', 'firstName lastName')
        .populate('payrollManagerId', 'firstName lastName')
        .populate('financeStaffId', 'firstName lastName')
        .sort({ payrollPeriod: 1 })
        .exec();

      const payrollRunIds = payrollRuns.map((run) => run._id);

      // Build payslip query
      const payslipQuery: any = { payrollRunId: { $in: payrollRunIds } };
      if (employeeIds && employeeIds.length > 0) {
        payslipQuery.employeeId = { $in: employeeIds };
      }

      const payslips = await this.payslipModel
        .find(payslipQuery)
        .populate('employeeId', 'firstName lastName employeeNumber primaryDepartmentId')
        .exec();

      // Calculate department breakdown if filtering by department or if no filter (show all departments)
      let departmentBreakdown: any = null;
      if (department) {
        // Single department breakdown
        departmentBreakdown = {
          department: {
            id: department._id,
            name: department.name,
            code: department.code,
          },
          employeeCount: employeeIds?.length || 0,
          totalGrossSalary: payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0),
          totalDeductions: payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0),
          totalNetPay: payslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
        };
      } else {
        // All departments breakdown
        const departmentMap = new Map<string, { name: string; code: string; payslips: any[] }>();
        
        payslips.forEach((payslip) => {
          const employee = payslip.employeeId as any;
          const deptId = employee?.primaryDepartmentId?.toString() || 'UNASSIGNED';
          
          if (!departmentMap.has(deptId)) {
            departmentMap.set(deptId, {
              name: deptId === 'UNASSIGNED' ? 'Unassigned' : 'Unknown',
              code: deptId === 'UNASSIGNED' ? 'UNASSIGNED' : 'UNKNOWN',
              payslips: [],
            });
          }
          departmentMap.get(deptId)!.payslips.push(payslip);
        });

        // Populate department names
        const departmentIds = Array.from(departmentMap.keys()).filter((id) => id !== 'UNASSIGNED');
        if (departmentIds.length > 0) {
          const departments = await this.departmentModel
            .find({ _id: { $in: departmentIds.map((id) => new Types.ObjectId(id)) } })
            .select('_id name code')
            .exec();
          
          departments.forEach((dept) => {
            const deptId = dept._id.toString();
            if (departmentMap.has(deptId)) {
              departmentMap.get(deptId)!.name = dept.name;
              departmentMap.get(deptId)!.code = dept.code;
            }
          });
        }

        departmentBreakdown = Array.from(departmentMap.entries()).map(([deptId, data]) => ({
          department: {
            id: deptId === 'UNASSIGNED' ? null : deptId,
            name: data.name,
            code: data.code,
          },
          employeeCount: new Set(data.payslips.map((p) => p.employeeId.toString())).size,
          totalGrossSalary: data.payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0),
          totalDeductions: data.payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0),
          totalNetPay: data.payslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
        }));
      }

      const summary = {
        period,
        startDate,
        endDate,
        department: department ? {
          id: department._id,
          name: department.name,
          code: department.code,
        } : null,
        totalPayrollRuns: payrollRuns.length,
        totalEmployees: new Set(payslips.map((p) => p.employeeId.toString())).size,
        totalGrossSalary: payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0),
        totalDeductions: payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0),
        totalNetPay: payslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
        payrollRuns: payrollRuns.map((run) => ({
          runId: run.runId,
          payrollPeriod: run.payrollPeriod,
          employees: run.employees,
          totalNetPay: run.totalnetpay,
          status: run.status,
          paymentStatus: run.paymentStatus,
        })),
        departmentBreakdown,
      };

      return summary;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate payroll summary: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // REQ-PY-25: Finance staff generate reports about taxes, insurance contributions, and benefits
  async getTaxInsuranceBenefitsReport(period: 'month' | 'year', date?: Date, departmentId?: string) {
    try {
      const targetDate = date || new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === 'month') {
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(targetDate.getFullYear(), 0, 1);
        endDate = new Date(targetDate.getFullYear(), 11, 31);
      }

      // Filter by department if provided
      let department: DepartmentDocument | null = null;
      let employeeIds: Types.ObjectId[] | null = null;
      
      if (departmentId) {
        const validDepartmentId = this.validateObjectId(departmentId, 'departmentId');
        department = await this.departmentModel.findById(validDepartmentId).exec();
        if (!department) {
          throw new NotFoundException(`Department with ID ${departmentId} not found`);
        }
        
        // Get employees in this department using EmployeeProfileService
        const employees = await this.employeeProfileService.findByDepartment(departmentId);
        // Filter to only active employees and extract IDs
        employeeIds = employees
          .filter(emp => emp.status === EmployeeStatus.ACTIVE)
          .map((emp) => new Types.ObjectId((emp as any)._id?.toString() || (emp as any).id?.toString()));
        
        if (employeeIds.length === 0) {
          // Return empty report if no employees in department
          return {
            period,
            startDate,
            endDate,
            department: {
              id: department._id,
              name: department.name,
              code: department.code,
            },
            taxes: {
              breakdown: {},
              total: 0,
            },
            insurance: {
              breakdown: {},
              totalEmployeeContributions: 0,
              totalEmployerContributions: 0,
              total: 0,
            },
            benefits: {
              total: 0,
            },
            summary: {
              totalEmployees: 0,
              totalPayslips: 0,
            },
            departmentBreakdown: null,
          };
        }
      }

      const payrollRuns = await this.payrollRunsModel
        .find({
          payrollPeriod: { $gte: startDate, $lte: endDate },
          status: 'FINALIZED',
        })
        .exec();

      const payrollRunIds = payrollRuns.map((run) => run._id);

      // Build payslip query
      const payslipQuery: any = { payrollRunId: { $in: payrollRunIds } };
      if (employeeIds && employeeIds.length > 0) {
        payslipQuery.employeeId = { $in: employeeIds };
      }

      const payslips = await this.payslipModel
        .find(payslipQuery)
        .populate('employeeId', 'primaryDepartmentId')
        .exec();

      // Aggregate taxes
      const taxBreakdown: Record<string, number> = {};
      let totalTaxes = 0;

      // Aggregate insurance contributions
      const insuranceBreakdown: Record<string, { employee: number; employer: number }> = {};
      let totalEmployeeInsurance = 0;
      let totalEmployerInsurance = 0;

      // Aggregate benefits
      let totalBenefits = 0;

      payslips.forEach((payslip) => {
        // Taxes
        payslip.deductionsDetails?.taxes?.forEach((tax: any) => {
          const taxType = tax.type || tax.name || 'Unknown';
          taxBreakdown[taxType] = (taxBreakdown[taxType] || 0) + (tax.amount || 0);
          totalTaxes += tax.amount || 0;
        });

        // Insurance
        payslip.deductionsDetails?.insurances?.forEach((insurance: any) => {
          const insType = insurance.type || insurance.name || 'Unknown';
          if (!insuranceBreakdown[insType]) {
            insuranceBreakdown[insType] = { employee: 0, employer: 0 };
          }
          insuranceBreakdown[insType].employee += insurance.employeeContribution || 0;
          insuranceBreakdown[insType].employer += insurance.employerContribution || 0;
          totalEmployeeInsurance += insurance.employeeContribution || 0;
          totalEmployerInsurance += insurance.employerContribution || 0;
        });

        // Benefits
        payslip.earningsDetails?.benefits?.forEach((benefit: any) => {
          totalBenefits += benefit.amount || 0;
        });
      });

      // Calculate department breakdown if not filtering by specific department
      let departmentBreakdown: any = null;
      if (!department) {
        // Group by department for breakdown
        const departmentMap = new Map<string, { 
          name: string; 
          code: string; 
          payslips: any[];
          taxes: Record<string, number>;
          insurance: Record<string, { employee: number; employer: number }>;
          benefits: number;
        }>();
        
        payslips.forEach((payslip) => {
          const employee = payslip.employeeId as any;
          const deptId = employee?.primaryDepartmentId?.toString() || 'UNASSIGNED';
          
          if (!departmentMap.has(deptId)) {
            departmentMap.set(deptId, {
              name: deptId === 'UNASSIGNED' ? 'Unassigned' : 'Unknown',
              code: deptId === 'UNASSIGNED' ? 'UNASSIGNED' : 'UNKNOWN',
              payslips: [],
              taxes: {},
              insurance: {},
              benefits: 0,
            });
          }
          
          const deptData = departmentMap.get(deptId)!;
          deptData.payslips.push(payslip);
          
          // Aggregate taxes for this department
          payslip.deductionsDetails?.taxes?.forEach((tax: any) => {
            const taxType = tax.type || tax.name || 'Unknown';
            deptData.taxes[taxType] = (deptData.taxes[taxType] || 0) + (tax.amount || 0);
          });
          
          // Aggregate insurance for this department
          payslip.deductionsDetails?.insurances?.forEach((insurance: any) => {
            const insType = insurance.type || insurance.name || 'Unknown';
            if (!deptData.insurance[insType]) {
              deptData.insurance[insType] = { employee: 0, employer: 0 };
            }
            deptData.insurance[insType].employee += insurance.employeeContribution || 0;
            deptData.insurance[insType].employer += insurance.employerContribution || 0;
          });
          
          // Aggregate benefits for this department
          payslip.earningsDetails?.benefits?.forEach((benefit: any) => {
            deptData.benefits += benefit.amount || 0;
          });
        });

        // Populate department names
        const departmentIds = Array.from(departmentMap.keys()).filter((id) => id !== 'UNASSIGNED');
        if (departmentIds.length > 0) {
          const departments = await this.departmentModel
            .find({ _id: { $in: departmentIds.map((id) => new Types.ObjectId(id)) } })
            .select('_id name code')
            .exec();
          
          departments.forEach((dept) => {
            const deptId = dept._id.toString();
            if (departmentMap.has(deptId)) {
              departmentMap.get(deptId)!.name = dept.name;
              departmentMap.get(deptId)!.code = dept.code;
            }
          });
        }

        departmentBreakdown = Array.from(departmentMap.entries()).map(([deptId, data]) => ({
          department: {
            id: deptId === 'UNASSIGNED' ? null : deptId,
            name: data.name,
            code: data.code,
          },
          employeeCount: new Set(data.payslips.map((p) => p.employeeId.toString())).size,
          taxes: {
            breakdown: data.taxes,
            total: Object.values(data.taxes).reduce((sum, val) => sum + val, 0),
          },
          insurance: {
            breakdown: data.insurance,
            totalEmployeeContributions: Object.values(data.insurance).reduce((sum, ins) => sum + ins.employee, 0),
            totalEmployerContributions: Object.values(data.insurance).reduce((sum, ins) => sum + ins.employer, 0),
            total: Object.values(data.insurance).reduce((sum, ins) => sum + ins.employee + ins.employer, 0),
          },
          benefits: {
            total: data.benefits,
          },
        }));
      }

      return {
        period,
        startDate,
        endDate,
        department: department ? {
          id: department._id,
          name: department.name,
          code: department.code,
        } : null,
        taxes: {
          breakdown: taxBreakdown,
          total: totalTaxes,
        },
        insurance: {
          breakdown: insuranceBreakdown,
          totalEmployeeContributions: totalEmployeeInsurance,
          totalEmployerContributions: totalEmployerInsurance,
          total: totalEmployeeInsurance + totalEmployerInsurance,
        },
        benefits: {
          total: totalBenefits,
        },
        summary: {
          totalEmployees: new Set(payslips.map((p) => p.employeeId.toString())).size,
          totalPayslips: payslips.length,
        },
        departmentBreakdown,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate tax/insurance/benefits report: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== ORGANIZATION STRUCTURE INTEGRATION METHODS ====================

  /**
   * Get all active departments for payroll reporting purposes
   * This method helps payroll specialists and finance staff identify departments for filtering reports
   */
  async getActiveDepartments() {
    try {
      const departments = await this.departmentModel
        .find({ isActive: true })
        .populate('headPositionId', 'title code')
        .select('_id name code description headPositionId isActive')
        .sort({ name: 1 })
        .exec();

      // Get employee count for each department
      const departmentsWithEmployeeCount = await Promise.all(
        departments.map(async (dept) => {
          const employeeCount = await this.employeeProfileModel
            .countDocuments({
              primaryDepartmentId: dept._id,
              status: EmployeeStatus.ACTIVE,
            })
            .exec();

          return {
            id: dept._id,
            name: dept.name,
            code: dept.code,
            description: dept.description,
            isActive: dept.isActive,
            headPosition: dept.headPositionId ? {
              id: (dept.headPositionId as any)?._id,
              title: (dept.headPositionId as any)?.title,
              code: (dept.headPositionId as any)?.code,
            } : null,
            activeEmployeeCount: employeeCount,
          };
        }),
      );

      return {
        totalDepartments: departmentsWithEmployeeCount.length,
        departments: departmentsWithEmployeeCount,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to retrieve departments: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get payroll summary for all departments
   * This provides a comprehensive view of payroll across all departments
   */
  async getPayrollSummaryByAllDepartments(period: 'month' | 'year', date?: Date) {
    try {
      const targetDate = date || new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === 'month') {
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(targetDate.getFullYear(), 0, 1);
        endDate = new Date(targetDate.getFullYear(), 11, 31);
      }

      // Get all active departments
      const departments = await this.departmentModel
        .find({ isActive: true })
        .select('_id name code')
        .exec();

      // Get payroll runs for the period
      const payrollRuns = await this.payrollRunsModel
        .find({
          payrollPeriod: { $gte: startDate, $lte: endDate },
          status: 'FINALIZED',
        })
        .exec();

      const payrollRunIds = payrollRuns.map((run) => run._id);

      // Get all payslips
      const payslips = await this.payslipModel
        .find({ payrollRunId: { $in: payrollRunIds } })
        .populate('employeeId', 'primaryDepartmentId')
        .exec();

      // Calculate summary for each department
      const departmentSummaries = await Promise.all(
        departments.map(async (dept) => {
          // Get employees in this department using EmployeeProfileService
          const employees = await this.employeeProfileService.findByDepartment(dept._id.toString());
          // Filter to only active employees and extract IDs
          const employeeIds = employees
            .filter(emp => emp.status === EmployeeStatus.ACTIVE)
            .map((emp) => new Types.ObjectId((emp as any)._id?.toString() || (emp as any).id?.toString()));

          // Filter payslips for this department
          const deptPayslips = payslips.filter((p) => {
            const employee = p.employeeId as any;
            const empId = employee?._id?.toString() || employee?.toString();
            return employeeIds.some((eid) => eid.toString() === empId);
          });

          const totalGrossSalary = deptPayslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0);
          const totalDeductions = deptPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
          const totalNetPay = deptPayslips.reduce((sum, p) => sum + (p.netPay || 0), 0);

          return {
            department: {
              id: dept._id,
              name: dept.name,
              code: dept.code,
            },
            employeeCount: employees.length,
            employeesWithPayslips: deptPayslips.length,
            totalGrossSalary,
            totalDeductions,
            totalNetPay,
            averageGrossSalary: deptPayslips.length > 0 ? totalGrossSalary / deptPayslips.length : 0,
            averageNetPay: deptPayslips.length > 0 ? totalNetPay / deptPayslips.length : 0,
          };
        }),
      );

      // Calculate totals
      const totalGrossSalary = departmentSummaries.reduce((sum, dept) => sum + dept.totalGrossSalary, 0);
      const totalDeductions = departmentSummaries.reduce((sum, dept) => sum + dept.totalDeductions, 0);
      const totalNetPay = departmentSummaries.reduce((sum, dept) => sum + dept.totalNetPay, 0);
      const totalEmployees = departmentSummaries.reduce((sum, dept) => sum + dept.employeeCount, 0);

      return {
        period,
        startDate,
        endDate,
        summary: {
          totalDepartments: departments.length,
          totalEmployees,
          totalGrossSalary,
          totalDeductions,
          totalNetPay,
        },
        departments: departmentSummaries.sort((a, b) => b.totalNetPay - a.totalNetPay), // Sort by net pay descending
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to generate payroll summary by departments: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // ==================== EXPORT METHODS ====================

  /**
   * Export tax/insurance/benefits report as CSV
   */
  async exportTaxInsuranceBenefitsReportAsCSV(
    period: 'month' | 'year',
    date?: Date,
    departmentId?: string,
  ): Promise<string> {
    const reportData = await this.getTaxInsuranceBenefitsReport(period, date, departmentId);
    return this.formatReportAsCSV(reportData, 'Tax, Insurance & Benefits Report');
  }

  /**
   * Export tax/insurance/benefits report as PDF
   */
  async exportTaxInsuranceBenefitsReportAsPDF(
    period: 'month' | 'year',
    date?: Date,
    departmentId?: string,
  ): Promise<Buffer> {
    const reportData = await this.getTaxInsuranceBenefitsReport(period, date, departmentId);
    return this.formatReportAsPDF(reportData, 'Tax, Insurance & Benefits Report');
  }

  /**
   * Export payroll summary as CSV
   */
  async exportPayrollSummaryAsCSV(
    period: 'month' | 'year',
    date?: Date,
    departmentId?: string,
  ): Promise<string> {
    const summaryData = await this.getPayrollSummary(period, date, departmentId);
    return this.formatSummaryAsCSV(summaryData, period === 'month' ? 'Month-End Payroll Summary' : 'Year-End Payroll Summary');
  }

  /**
   * Export payroll summary as PDF
   */
  async exportPayrollSummaryAsPDF(
    period: 'month' | 'year',
    date?: Date,
    departmentId?: string,
  ): Promise<Buffer> {
    const summaryData = await this.getPayrollSummary(period, date, departmentId);
    return this.formatSummaryAsPDF(summaryData, period === 'month' ? 'Month-End Payroll Summary' : 'Year-End Payroll Summary');
  }

  /**
   * Format report data as CSV
   */
  private formatReportAsCSV(data: any, reportTitle: string): string {
    const lines: string[] = [];
    
    // Header
    lines.push(reportTitle);
    lines.push(`Generated: ${new Date().toISOString()}`);
    if (data.period) lines.push(`Period: ${data.period}`);
    if (data.startDate) lines.push(`Start Date: ${data.startDate}`);
    if (data.endDate) lines.push(`End Date: ${data.endDate}`);
    if (data.department) lines.push(`Department: ${data.department.name}`);
    lines.push('');

    // Summary
    if (data.summary) {
      lines.push('Summary');
      lines.push('Field,Value');
      Object.entries(data.summary).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
      lines.push('');
    }

    // Taxes
    if (data.taxes && data.taxes.breakdown) {
      lines.push('Tax Breakdown');
      lines.push('Tax Name,Amount');
      Object.entries(data.taxes.breakdown).forEach(([taxName, amount]) => {
        lines.push(`${taxName},${amount}`);
      });
      lines.push(`Total Taxes,${data.taxes.total || 0}`);
      lines.push('');
    }

    // Insurance
    if (data.insurance && data.insurance.breakdown) {
      lines.push('Insurance Breakdown');
      lines.push('Insurance Type,Employee Contribution,Employer Contribution,Total');
      Object.entries(data.insurance.breakdown).forEach(([insuranceName, details]: [string, any]) => {
        const employee = details.employee || 0;
        const employer = details.employer || 0;
        const total = employee + employer;
        lines.push(`${insuranceName},${employee},${employer},${total}`);
      });
      lines.push(`Total Employee Contributions,${data.insurance.totalEmployeeContributions || 0}`);
      lines.push(`Total Employer Contributions,${data.insurance.totalEmployerContributions || 0}`);
      lines.push(`Total Insurance,${data.insurance.total || 0}`);
      lines.push('');
    }

    // Benefits
    if (data.benefits) {
      lines.push('Benefits');
      lines.push('Total Benefits');
      lines.push(`${data.benefits.total || 0}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format summary data as CSV
   */
  private formatSummaryAsCSV(data: any, summaryTitle: string): string {
    const lines: string[] = [];
    
    // Header
    lines.push(summaryTitle);
    lines.push(`Generated: ${new Date().toISOString()}`);
    if (data.period) lines.push(`Period: ${data.period}`);
    if (data.startDate) lines.push(`Start Date: ${data.startDate}`);
    if (data.endDate) lines.push(`End Date: ${data.endDate}`);
    lines.push('');

    // Summary
    if (data.summary) {
      lines.push('Summary');
      lines.push('Field,Value');
      Object.entries(data.summary).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
      lines.push('');
    }

    // Employee breakdown
    if (data.employees && data.employees.length > 0) {
      lines.push('Employee Breakdown');
      lines.push('Employee Number,Employee Name,Department,Gross Salary,Deductions,Net Pay');
      data.employees.forEach((emp: any) => {
        const employeeNumber = emp.employee?.employeeNumber || 'N/A';
        const employeeName = emp.employee ? `${emp.employee.firstName} ${emp.employee.lastName}` : 'N/A';
        const department = emp.department?.name || 'N/A';
        const grossSalary = emp.grossSalary || 0;
        const deductions = emp.deductions || 0;
        const netPay = emp.netPay || 0;
        lines.push(`${employeeNumber},${employeeName},${department},${grossSalary},${deductions},${netPay}`);
      });
      lines.push('');
    }

    // Department breakdown
    if (data.departments && data.departments.length > 0) {
      lines.push('Department Breakdown');
      lines.push('Department Name,Employee Count,Total Gross Salary,Total Deductions,Total Net Pay');
      data.departments.forEach((dept: any) => {
        const deptName = dept.department?.name || 'N/A';
        const empCount = dept.employeeCount || 0;
        const totalGross = dept.totalGrossSalary || 0;
        const totalDeductions = dept.totalDeductions || 0;
        const totalNetPay = dept.totalNetPay || 0;
        lines.push(`${deptName},${empCount},${totalGross},${totalDeductions},${totalNetPay}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format report data as PDF
   */
  private async formatReportAsPDF(data: any, reportTitle: string): Promise<Buffer> {
    let PDFDocument: any;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      throw new BadRequestException(
        'PDF generation is not available. Please contact system administrator.',
      );
    }

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text(reportTitle, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    if (data.period) doc.text(`Period: ${data.period}`, { align: 'center' });
    if (data.startDate) doc.text(`Start Date: ${new Date(data.startDate).toLocaleDateString()}`, { align: 'center' });
    if (data.endDate) doc.text(`End Date: ${new Date(data.endDate).toLocaleDateString()}`, { align: 'center' });
    if (data.department) doc.text(`Department: ${data.department.name}`, { align: 'center' });
    doc.moveDown(1);

    // Summary
    if (data.summary) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      Object.entries(data.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, { indent: 20 });
      });
      doc.moveDown(1);
    }

    // Taxes
    if (data.taxes && data.taxes.breakdown) {
      doc.fontSize(14).text('Tax Breakdown', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      Object.entries(data.taxes.breakdown).forEach(([taxName, amount]: [string, any]) => {
        doc.text(`${taxName}: ${amount}`, { indent: 20 });
      });
      doc.text(`Total Taxes: ${data.taxes.total || 0}`, { indent: 20, bold: true });
      doc.moveDown(1);
    }

    // Insurance
    if (data.insurance && data.insurance.breakdown) {
      doc.fontSize(14).text('Insurance Breakdown', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      Object.entries(data.insurance.breakdown).forEach(([insuranceName, details]: [string, any]) => {
        const employee = details.employee || 0;
        const employer = details.employer || 0;
        const total = employee + employer;
        doc.text(`${insuranceName}:`, { indent: 20 });
        doc.text(`  Employee: ${employee}`, { indent: 40 });
        doc.text(`  Employer: ${employer}`, { indent: 40 });
        doc.text(`  Total: ${total}`, { indent: 40 });
      });
      doc.text(`Total Employee Contributions: ${data.insurance.totalEmployeeContributions || 0}`, { indent: 20, bold: true });
      doc.text(`Total Employer Contributions: ${data.insurance.totalEmployerContributions || 0}`, { indent: 20, bold: true });
      doc.text(`Total Insurance: ${data.insurance.total || 0}`, { indent: 20, bold: true });
      doc.moveDown(1);
    }

    // Benefits
    if (data.benefits) {
      doc.fontSize(14).text('Benefits', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Total Benefits: ${data.benefits.total || 0}`, { indent: 20, bold: true });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', (error: any) => {
        reject(new BadRequestException(`Failed to generate PDF: ${error?.message || 'Unknown error'}`));
      });
    });
  }

  /**
   * Format summary data as PDF
   */
  private async formatSummaryAsPDF(data: any, summaryTitle: string): Promise<Buffer> {
    let PDFDocument: any;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      throw new BadRequestException(
        'PDF generation is not available. Please contact system administrator.',
      );
    }

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text(summaryTitle, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    if (data.period) doc.text(`Period: ${data.period}`, { align: 'center' });
    if (data.startDate) doc.text(`Start Date: ${new Date(data.startDate).toLocaleDateString()}`, { align: 'center' });
    if (data.endDate) doc.text(`End Date: ${new Date(data.endDate).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    // Summary
    if (data.summary) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      Object.entries(data.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, { indent: 20 });
      });
      doc.moveDown(1);
    }

    // Employee breakdown (first 50 to avoid PDF being too large)
    if (data.employees && data.employees.length > 0) {
      doc.fontSize(14).text('Employee Breakdown', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9);
      const employeesToShow = data.employees.slice(0, 50);
      employeesToShow.forEach((emp: any, index: number) => {
        const employeeNumber = emp.employee?.employeeNumber || 'N/A';
        const employeeName = emp.employee ? `${emp.employee.firstName} ${emp.employee.lastName}` : 'N/A';
        const department = emp.department?.name || 'N/A';
        const grossSalary = emp.grossSalary || 0;
        const deductions = emp.deductions || 0;
        const netPay = emp.netPay || 0;
        
        doc.text(`${index + 1}. ${employeeNumber} - ${employeeName} (${department})`, { indent: 20 });
        doc.text(`   Gross: ${grossSalary} | Deductions: ${deductions} | Net Pay: ${netPay}`, { indent: 40 });
        doc.moveDown(0.2);
      });
      if (data.employees.length > 50) {
        doc.text(`... and ${data.employees.length - 50} more employees`, { indent: 20, italic: true });
      }
      doc.moveDown(1);
    }

    // Department breakdown
    if (data.departments && data.departments.length > 0) {
      doc.fontSize(14).text('Department Breakdown', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      data.departments.forEach((dept: any) => {
        const deptName = dept.department?.name || 'N/A';
        const empCount = dept.employeeCount || 0;
        const totalGross = dept.totalGrossSalary || 0;
        const totalDeductions = dept.totalDeductions || 0;
        const totalNetPay = dept.totalNetPay || 0;
        
        doc.text(`${deptName}:`, { indent: 20, bold: true });
        doc.text(`  Employees: ${empCount}`, { indent: 40 });
        doc.text(`  Total Gross Salary: ${totalGross}`, { indent: 40 });
        doc.text(`  Total Deductions: ${totalDeductions}`, { indent: 40 });
        doc.text(`  Total Net Pay: ${totalNetPay}`, { indent: 40 });
        doc.moveDown(0.3);
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', (error: any) => {
        reject(new BadRequestException(`Failed to generate PDF: ${error?.message || 'Unknown error'}`));
      });
    });
  }
}
