import {
  Controller,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  Get,
  Put,
  UseGuards,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums'; // Enum for roles
import { PayrollExecutionService } from './payroll-execution.service'; // Make sure this is the correct path
import { CreatePayrollRunDto } from './dto/CreatePayrollRunDto.dto';
import { EmployeePayrollDetailsUpsertDto } from './dto/EmployeePayrollDetailsUpsertDto.dto';
import { PublishRunForApprovalDto } from './dto/PublishRunForApprovalDto.dto';
import { FlagPayrollExceptionDto } from './dto/FlagPayrollExceptionDto.dto';
import { LockPayrollDto } from './dto/LockPayrollDto.dto';
import { UnlockPayrollDto } from './dto/UnlockPayrollDto.dto';
import { SigningBonusReviewDto } from './dto/SigningBonusReviewDto.dto';
import { SigningBonusEditDto } from './dto/SigningBonusEditDto.dto';
import { CreateEmployeeTerminationBenefitDto } from './dto/CreateEmployeeTerminationBenefitDto.dto';
import { CreateEmployeeSigningBonusDto } from './dto/CreateEmployeeSigningBonusDto.dto';
import { TerminationBenefitReviewDto } from './dto/TerminationBenefitReviewDto.dto';
import { TerminationBenefitEditDto } from './dto/TerminationBenefitEditDto.dto';
import { GeneratePayrollDraftDto } from './dto/GeneratePayrollDraftDto.dto';
import { ManagerApprovalReviewDto } from './dto/ManagerApprovalReviewDto.dto';
import { FinanceDecisionDto } from './dto/FinanceDecisionDto.dto';
import { ReviewPayrollPeriodDto } from './dto/ReviewPayrollPeriodDto.dto';
import { EditPayrollPeriodDto } from './dto/EditPayrollPeriodDto.dto';
import { ProcessPayrollInitiationDto } from './dto/ProcessPayrollInitiationDto.dto';
import { ReviewPayrollInitiationDto } from './dto/ReviewPayrollInitiationDto.dto';
import { CalculatePayrollDto } from './dto/CalculatePayrollDto.dto';
import { CalculateProratedSalaryDto } from './dto/CalculateProratedSalaryDto.dto';
import { ApplyStatutoryRulesDto } from './dto/ApplyStatutoryRulesDto.dto';
import { GenerateDraftPayrollRunDto } from './dto/GenerateDraftPayrollRunDto.dto';
import { GenerateAndDistributePayslipsDto, PayslipDistributionMethod } from './dto/GenerateAndDistributePayslipsDto.dto';
import { SendForApprovalDto } from './dto/SendForApprovalDto.dto';
import { ResolveIrregularityDto } from './dto/ResolveIrregularityDto.dto';
import { BonusStatus, BenefitStatus } from './enums/payroll-execution-enum';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollExecutionController {
  constructor(private readonly payrollService: PayrollExecutionService) {}

  // REQ-PY-23: Allow PAYROLL_SPECIALIST to create payroll runs
  @Post('create')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can create payroll runs
  async createPayrollRun(
    @Body() createPayrollRunDto: CreatePayrollRunDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.createPayrollRun(
      createPayrollRunDto,
      user.userId,
    );
  }

  // REQ-PY-24: Allow PAYROLL_MANAGER to review payroll runs
  @Post(':id/review')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_MANAGER) // Only PAYROLL_MANAGER can review payroll runs
  async reviewPayroll(
    @Param('id') id: string,
    @Body() publishRunForApprovalDto: PublishRunForApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.reviewPayroll(
      id,
      publishRunForApprovalDto,
      user.userId,
    );
  }

  // REQ-PY-5: Allow PAYROLL_SPECIALIST to generate payroll details
  @Post('generate-details')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can generate payroll details
  async generateEmployeePayrollDetails(
    @Body() employeePayrollDetailsDto: EmployeePayrollDetailsUpsertDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.generateEmployeePayrollDetails(
      employeePayrollDetailsDto,
      user.userId,
    );
  }

  // REQ-PY-5: Allow PAYROLL_SPECIALIST to flag payroll exceptions
  @Post('flag-exception')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can flag payroll exceptions
  async flagPayrollException(
    @Body() flagPayrollExceptionDto: FlagPayrollExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.flagPayrollException(
      flagPayrollExceptionDto.payrollRunId,
      flagPayrollExceptionDto.code,
      flagPayrollExceptionDto.message,
      user.userId,
    );
  }

  // REQ-PY-5: Auto-detect irregularities (salary spikes, missing bank accounts, negative net pay)
  @Post('detect-irregularities/:payrollRunId')
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async detectIrregularities(
    @Param('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.detectIrregularities(payrollRunId, user.userId);
  }

  // REQ-PY-7: Allow PAYROLL_MANAGER to lock payroll
  @Post(':id/lock')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_MANAGER) // Only PAYROLL_MANAGER can lock payroll
  async lockPayroll(@Param('id') id: string, @CurrentUser() user: any) {
    return this.payrollService.lockPayroll(id, user.userId);
  }

  // REQ-PY-19: Allow PAYROLL_MANAGER to unlock payroll
  @Post(':id/unlock')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_MANAGER) // Only PAYROLL_MANAGER can unlock payroll
  async unlockPayroll(
    @Param('id') id: string,
    @Body() unlockPayrollDto: UnlockPayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.unlockPayroll(
      id,
      unlockPayrollDto.unlockReason,
      user.userId,
    );
  }

  // REQ-PY-7: Freeze finalized payroll (alternative terminology - functionally same as lock)
  // Note: Freeze and Lock are functionally the same - both set status to LOCKED
  @Post(':id/freeze')
  @Roles(SystemRole.PAYROLL_MANAGER) // Only PAYROLL_MANAGER can freeze payroll
  async freezePayroll(@Param('id') id: string, @CurrentUser() user: any) {
    return this.payrollService.freezePayroll(id, user.userId);
  }

  // REQ-PY-19: Unfreeze payrolls with reason (alternative terminology - functionally same as unlock)
  // Note: Unfreeze and Unlock are functionally the same - both set status to UNLOCKED
  @Post(':id/unfreeze')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_MANAGER) // Only PAYROLL_MANAGER can unfreeze payroll
  async unfreezePayroll(
    @Param('id') id: string,
    @Body() unlockPayrollDto: UnlockPayrollDto,
    @CurrentUser() user: any,
  ) {
    // Unfreeze uses the same DTO as unlock (both require a reason)
    return this.payrollService.unfreezePayroll(
      id,
      unlockPayrollDto.unlockReason,
      user.userId,
    );
  }

  // REQ-PY-23: Allow PAYROLL_SPECIALIST to process payroll initiation
  @Post('process-initiation')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)  // Only PAYROLL_SPECIALIST can process payroll initiation
  async processPayrollInitiation(
    @Body() processPayrollInitiationDto: ProcessPayrollInitiationDto,
    @CurrentUser() user: any,
  ) {
    try {
      // BR 20: Multi-currency support - currency stored in entity field format: "Entity Name|CURRENCY_CODE"
      return await this.payrollService.processPayrollInitiation(
        new Date(processPayrollInitiationDto.payrollPeriod),
        processPayrollInitiationDto.entity,
        processPayrollInitiationDto.payrollSpecialistId,
        processPayrollInitiationDto.currency,
        user.userId,
        processPayrollInitiationDto.payrollManagerId,
      );
    } catch (error) {
      // Log the error for debugging
      console.error('Error processing payroll initiation:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Re-throw known HTTP exceptions
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // Convert plain Error objects to BadRequestException with proper message
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      
      // Handle unexpected errors
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to process payroll initiation',
      );
    }
  }

  // REQ-PY-24: Allow PAYROLL_SPECIALIST to review and approve processed payroll initiation
  // Note: The workflow/UI is handled on the frontend, but the backend endpoint is accessible to Payroll Specialist
  // REQ-PY-26: Edit payroll initiation (period) if rejected - rejected payrolls can be re-edited
  @Post('review-initiation/:runId')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // As per REQ-PY-24: "As a Payroll Specialist, I want to review and approve processed payroll initiation"
  async reviewPayrollInitiation(
    @Param('runId') runId: string,
    @Body() reviewPayrollInitiationDto: ReviewPayrollInitiationDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.reviewPayrollInitiation(
      runId,
      reviewPayrollInitiationDto.approved,
      reviewPayrollInitiationDto.reviewerId,
      reviewPayrollInitiationDto.rejectionReason,
      user.userId,
    );
  }

  // REQ-PY-26: Allow PAYROLL_SPECIALIST to manually edit payroll initiation when needed
  @Put('edit-initiation/:runId')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // As per REQ-PY-26: "As a Payroll Specialist, I want to manually edit payroll initiation when needed"
  async editPayrollInitiation(
    @Param('runId') runId: string,
    @Body() updates: Partial<CreatePayrollRunDto>,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.editPayrollInitiation(
      runId,
      updates,
      user.userId,
    );
  }

  // REQ-PY-25: Review Payroll period (Approve or Reject)
  // Note: This uses ReviewPayrollPeriodDto for proper validation
  @Post('review-payroll-period')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async reviewPayrollPeriod(
    @Body() reviewDto: ReviewPayrollPeriodDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.reviewPayrollPeriod(
      reviewDto,
      user.userId,
    );
  }

  // REQ-PY-26: Edit payroll initiation (period) if rejected
  // Note: This uses EditPayrollPeriodDto for editing just the period
  @Put('edit-payroll-period')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async editPayrollPeriod(
    @Body() editDto: EditPayrollPeriodDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.editPayrollPeriod(
      editDto,
      user.userId,
    );
  }

  // REQ-PY-27: Allow PAYROLL_SPECIALIST to process signing bonuses
  @Post('process-signing-bonuses')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can process signing bonuses
  async processSigningBonuses(@CurrentUser() user: any) {
    return this.payrollService.processSigningBonuses(user.userId);
  }

  // Create employee signing bonus manually
  @Post('create-signing-bonus')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)  // Only PAYROLL_SPECIALIST can create signing bonuses
  async createEmployeeSigningBonus(@Body() createDto: CreateEmployeeSigningBonusDto, @CurrentUser() user: any) {
    return this.payrollService.createEmployeeSigningBonus(createDto, user.userId);
  }

  // REQ-PY-28: Allow PAYROLL_SPECIALIST to review and approve processed signing bonuses
  @Post('review-signing-bonus')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // As per REQ-PY-28: "As a Payroll Specialist, I want to review and approve processed signing bonuses"
  async reviewSigningBonus(
    @Body() reviewDto: SigningBonusReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.reviewSigningBonus(reviewDto, user.userId);
  }

  // REQ-PY-29: Allow PAYROLL_SPECIALIST to edit signing bonus
  @Put('edit-signing-bonus')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can edit signing bonus
  async editSigningBonus(
    @Body() editDto: SigningBonusEditDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.editSigningBonus(editDto, user.userId);
  }

  // REQ-PY-30 & REQ-PY-33: Allow PAYROLL_SPECIALIST to process benefits upon resignation/termination
  @Post('process-termination-benefits')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can process termination benefits
  async processTerminationResignationBenefits(@CurrentUser() user: any) {
    return this.payrollService.processTerminationResignationBenefits(user.userId);
  }

  // Create employee termination benefit manually
  @Post('create-termination-benefit')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)  // Only PAYROLL_SPECIALIST can create termination benefits
  async createEmployeeTerminationBenefit(@Body() createDto: CreateEmployeeTerminationBenefitDto, @CurrentUser() user: any) {
    return this.payrollService.createEmployeeTerminationBenefit(createDto, user.userId);
  }

  // REQ-PY-31: Allow PAYROLL_SPECIALIST to review and approve processed benefits upon resignation
  @Post('review-termination-benefit')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST) // As per REQ-PY-31: "As a Payroll Specialist, I want to review and approve processed benefits upon resignation"
  async reviewTerminationBenefit(
    @Body() reviewDto: TerminationBenefitReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.reviewTerminationBenefit(reviewDto, user.userId);
  }

  // REQ-PY-32: Allow PAYROLL_SPECIALIST to manually edit termination benefits
  @Put('edit-termination-benefit')
  @Roles(SystemRole.PAYROLL_SPECIALIST) // Only PAYROLL_SPECIALIST can edit termination benefits
  async editTerminationBenefit(
    @Body() editDto: TerminationBenefitEditDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.editTerminationBenefit(editDto, user.userId);
  }

  // REQ-PY-1: Automatically calculate salaries, allowances, deductions, and contributions
  // Note: baseSalary is optional - if not provided, will be fetched from employee's PayGrade configuration
  @Post('calculate-payroll')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async calculatePayroll(
    @Body() calculatePayrollDto: CalculatePayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.calculatePayroll(
      calculatePayrollDto.employeeId,
      calculatePayrollDto.payrollRunId,
      calculatePayrollDto.baseSalary,
      user.userId,
    );
  }

  // REQ-PY-2: Calculate prorated salaries for mid-month hires, terminations
  @Post('calculate-prorated-salary')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async calculateProratedSalary(
    @Body() calculateProratedSalaryDto: CalculateProratedSalaryDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.calculateProratedSalary(
      calculateProratedSalaryDto.employeeId,
      calculateProratedSalaryDto.baseSalary,
      new Date(calculateProratedSalaryDto.startDate),
      new Date(calculateProratedSalaryDto.endDate),
      new Date(calculateProratedSalaryDto.payrollPeriodEnd),
      user.userId,
    );
  }

  // REQ-PY-3: Auto-apply statutory rules (income tax, pension, insurance, labor law deductions)
  // Note: Uses baseSalary per BR 35 (Taxes = % of Base Salary)
  @Post('apply-statutory-rules')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async applyStatutoryRules(
    @Body() applyStatutoryRulesDto: ApplyStatutoryRulesDto,
    @CurrentUser() user: any,
  ) {
    // Return breakdown for better frontend display
    return this.payrollService.applyStatutoryRulesWithBreakdown(
      applyStatutoryRulesDto.baseSalary,
      applyStatutoryRulesDto.employeeId,
    );
  }

  // REQ-PY-4: Generate draft payroll runs automatically at the end of each cycle
  // Automatically processes signing bonuses and termination benefits before generating draft
  // Base salaries are fetched from PayGrade configuration for each employee
  // BR 20: Multi-currency support
  @Post('generate-draft')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async generateDraftPayrollRun(
    @Body() generateDraftPayrollRunDto: GenerateDraftPayrollRunDto,
    @CurrentUser() user: any,
  ) {
    // BR 20: Multi-currency support - currency stored in entity field format: "Entity Name|CURRENCY_CODE"
    return this.payrollService.generateDraftPayrollRun(
      new Date(generateDraftPayrollRunDto.payrollPeriod),
      generateDraftPayrollRunDto.entity,
      generateDraftPayrollRunDto.payrollSpecialistId,
      generateDraftPayrollRunDto.currency,
      user.userId,
      generateDraftPayrollRunDto.payrollManagerId,
    );
  }

  // REQ-PY-6: Review system-generated payroll results in a preview dashboard
  // BR 20: Multi-currency support with optional currency conversion
  @Get('preview/:payrollRunId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getPayrollPreview(
    @Param('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
    @Query('currency') currency?: string, // Optional query parameter for currency conversion
  ) {
    return this.payrollService.getPayrollPreview(
      payrollRunId,
      currency,
      user.userId,
    );
  }

  // Requirement 0: Get pre-initiation validation status
  // Returns detailed information about pending items that need review before payroll initiation
  @Get('pre-initiation-validation')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getPreInitiationValidationStatus(@CurrentUser() user: any) {
    return this.payrollService.getPreInitiationValidationStatus(user.userId);
  }

  // Get all signing bonuses with optional filtering
  @Get('signing-bonuses')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getSigningBonuses(
    @CurrentUser() user: any,
    @Query('status') status?: BonusStatus,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payrollService.getSigningBonuses(
      status,
      employeeId,
      page || 1,
      limit || 10,
      user.userId,
    );
  }

  // Get signing bonus by ID
  @Get('signing-bonuses/:id')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getSigningBonusById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getSigningBonusById(id, user.userId);
  }

  // Get all termination benefits with optional filtering
  @Get('termination-benefits')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getTerminationBenefits(
    @CurrentUser() user: any,
    @Query('status') status?: BenefitStatus,
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: 'TERMINATION' | 'RESIGNATION',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payrollService.getTerminationBenefits(
      status,
      employeeId,
      type,
      page || 1,
      limit || 10,
      user.userId,
    );
  }

  // Get termination benefit by ID
  @Get('termination-benefits/:id')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getTerminationBenefitById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getTerminationBenefitById(id, user.userId);
  }

  // REQ-PY-8: Automatically generate and distribute employee payslips
  @Post('generate-payslips')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async generateAndDistributePayslips(
    @Body() generateAndDistributePayslipsDto: GenerateAndDistributePayslipsDto,
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.payrollService.generateAndDistributePayslips(
        generateAndDistributePayslipsDto.payrollRunId,
        generateAndDistributePayslipsDto.distributionMethod || PayslipDistributionMethod.PORTAL,
        user.userId,
      );
      
      // Log the result for debugging
      console.log(`[Controller] Payslip generation result:`, {
        successful: result.successful,
        failed: result.failed,
        verifiedPayslips: result.verifiedPayslips,
        actualDatabaseCount: result.actualDatabaseCount,
        totalEmployees: result.totalEmployees,
      });
      
      // Return success even if some payslips failed, as long as at least one succeeded
      if (result.successful > 0) {
        return result;
      } else {
        // Only throw error if no payslips were generated at all
        throw new Error(
          result.warnings?.join('; ') || 'Failed to generate any payslips. Check the logs for validation errors.'
        );
      }
    } catch (error: any) {
      // Log full error details for debugging
      console.error(`[Controller] Error generating payslips:`, {
        message: error?.message,
        stack: error?.stack,
        payrollRunId: generateAndDistributePayslipsDto.payrollRunId,
      });
      
      // Re-throw with proper error message for better frontend handling
      throw new Error(
        error?.message || 'Failed to generate and distribute payslips. Please check that the payroll run is locked and payment status is PAID.'
      );
    }
  }

  // REQ-PY-12: Send payroll run for approval to Manager and Finance
  @Post('send-for-approval')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async sendForApproval(
    @Body() sendForApprovalDto: SendForApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.sendForApproval(
      sendForApprovalDto.payrollRunId,
      sendForApprovalDto.managerId,
      sendForApprovalDto.financeStaffId,
      user.userId,
    );
  }

  // REQ-PY-15: Finance Staff approve payroll disbursements before execution
  @Post('finance-approval')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.FINANCE_STAFF)
  async approvePayrollDisbursement(
    @Body() financeDecisionDto: FinanceDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.approvePayrollDisbursement(
      financeDecisionDto,
      user.userId,
    );
  }

  // Get all payslips for a payroll run (for Payroll Specialists to view)
  @Get('payslips/payroll-run/:payrollRunId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getPayslipsByPayrollRun(
    @Param('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getPayslipsByPayrollRun(payrollRunId, user.userId);
  }

  // Get a specific payslip by ID (for Payroll Specialists to view)
  @Get('payslips/:payslipId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getPayslipById(
    @Param('payslipId') payslipId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getPayslipById(payslipId, user.userId);
  }

  // Get all payslips with filters (for Payroll Specialists to view all payslips)
  @Get('payslips')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getAllPayslips(
    @Query('payrollRunId') payrollRunId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.payrollService.getAllPayslips(user.userId, {
      payrollRunId,
      employeeId,
      paymentStatus,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // REQ-PY-20: Payroll Manager resolve escalated irregularities
  // BR 9: Exception resolution workflow
  @Post('resolve-irregularity')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_MANAGER)
  async resolveIrregularity(
    @Body() resolveIrregularityDto: ResolveIrregularityDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.resolveIrregularity(
      resolveIrregularityDto.payrollRunId,
      resolveIrregularityDto.employeeId,
      resolveIrregularityDto.exceptionCode,
      resolveIrregularityDto.resolution,
      resolveIrregularityDto.managerId,
      user.userId,
    );
  }

  // BR 9: Get exceptions for a specific employee
  @Get('employee-exceptions/:employeeId/:payrollRunId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getEmployeeExceptions(
    @Param('employeeId') employeeId: string,
    @Param('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getEmployeeExceptions(
      employeeId,
      payrollRunId,
      user.userId,
    );
  }

  // BR 9: Get all exceptions for a payroll run
  @Get('payroll-exceptions/:payrollRunId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
  async getAllPayrollExceptions(
    @Param('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getAllPayrollExceptions(
      payrollRunId,
      user.userId,
    );
  }

  // REQ-PY-22: Payroll Manager approve payroll runs
  @Post('manager-approval')
  @UsePipes(ValidationPipe)
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approvePayrollRun(
    @Body() managerApprovalDto: ManagerApprovalReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.approvePayrollRun(
      managerApprovalDto,
      user.userId,
    );
  }

  // Get all payroll runs with optional filtering
  @Get('runs')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getAllPayrollRuns(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payrollService.getAllPayrollRuns(
      status,
      page || 1,
      limit || 100,
      user.userId,
    );
  }

  // Get payroll run by ID
  @Get('runs/:runId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getPayrollRunById(
    @Param('runId') runId: string,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.getPayrollRunByRunId(runId, user.userId);
  }
}
