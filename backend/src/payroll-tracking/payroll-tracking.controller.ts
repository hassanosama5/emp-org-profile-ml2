import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PayrollTrackingService } from './payroll-tracking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
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

@Controller('payroll-tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollTrackingController {
  constructor(
    private readonly payrollTrackingService: PayrollTrackingService,
  ) {}

  // ==================== CLAIMS ENDPOINTS ====================

  // REQ-PY-17: Employees submit expense reimbursement claims for review.
  @Post('claims')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async createClaim(
    @Body() createClaimDTO: CreateClaimDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.createClaim(createClaimDTO, user.userId);
  }

  // REQ-PY-42: Payroll specialists review claims that are still under review.
  @Get('claims/pending')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async getPendingClaims(@CurrentUser() user: any) {
    return await this.payrollTrackingService.getPendingClaims();
  }

  // REQ-PY-44: Finance staff view claim approvals ready for refund processing.
  @Get('claims/approved')
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getApprovedClaimsForFinance(@CurrentUser() user: any) {
    return await this.payrollTrackingService.getApprovedClaimsForFinance();
  }

  // REQ-PY-18: Employees track every claim they have submitted.
  @Get('claims/employee/:employeeId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.PAYROLL_SPECIALIST, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getClaimsByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getClaimsByEmployeeId(employeeId);
  }

  // REQ-PY-18: Drill into the detailed status of a specific claim.
  @Get('claims/:claimId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.PAYROLL_SPECIALIST, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getClaimById(
    @Param('claimId') claimId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getClaimById(claimId);
  }

  // REQ-PY-17: Allow updates to a claim while it is still in workflow.
  @Put('claims/:claimId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async updateClaim(
    @Param('claimId') claimId: string,
    @Body() updateClaimDTO: UpdateClaimDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.updateClaim(
      claimId,
      updateClaimDTO,
      user.userId,
    );
  }

  // ==================== APPROVAL ENDPOINTS ====================

  // REQ-PY-42: Payroll specialists approve valid claims.
  @Put('claims/:claimId/approve-by-specialist')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async approveClaimBySpecialist(
    @Param('claimId') claimId: string,
    @Body() approveClaimBySpecialistDTO: ApproveClaimBySpecialistDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.approveClaimBySpecialist(
      claimId,
      approveClaimBySpecialistDTO,
      user.userId,
    );
  }

  // REQ-PY-42: Payroll specialists reject claims with documented reasons.
  @Put('claims/:claimId/reject-by-specialist')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async rejectClaimBySpecialist(
    @Param('claimId') claimId: string,
    @Body() rejectClaimBySpecialistDTO: RejectClaimBySpecialistDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.rejectClaimBySpecialist(
      claimId,
      rejectClaimBySpecialistDTO,
      user.userId,
    );
  }

  // REQ-PY-43: Payroll managers confirm approved claims before finance sees them.
  @Put('claims/:claimId/confirm-approval')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN) // Payroll Manager is often a senior Payroll Specialist
  async confirmClaimApproval(
    @Param('claimId') claimId: string,
    @Body() confirmClaimApprovalDTO: ConfirmClaimApprovalDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.confirmClaimApproval(
      claimId,
      confirmClaimApprovalDTO,
      user.userId,
    );
  }

  // ==================== DISPUTES ENDPOINTS ====================

  // REQ-PY-16: Employees raise payroll disputes tied to a payslip.
  @Post('disputes')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async createDispute(
    @Body() createDisputeDTO: CreateDisputeDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.createDispute(createDisputeDTO, user.userId);
  }

  // REQ-PY-39: Payroll specialists review disputes awaiting investigation.
  @Get('disputes/pending')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async getPendingDisputes(@CurrentUser() user: any) {
    return await this.payrollTrackingService.getPendingDisputes();
  }

  // REQ-PY-41: Finance staff view all disputes that were approved.
  @Get('disputes/approved')
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getApprovedDisputesForFinance(@CurrentUser() user: any) {
    return await this.payrollTrackingService.getApprovedDisputesForFinance();
  }

  // REQ-PY-18: Employees track every dispute they opened.
  @Get('disputes/employee/:employeeId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.PAYROLL_SPECIALIST, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getDisputesByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getDisputesByEmployeeId(
      employeeId,
    );
  }

  // REQ-PY-18: Drill into the workflow state of a single dispute.
  @Get('disputes/:disputeId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.PAYROLL_SPECIALIST, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getDisputeById(
    @Param('disputeId') disputeId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getDisputeById(disputeId);
  }

  // REQ-PY-16: Allow employees to refine dispute details during review.
  @Put('disputes/:disputeId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async updateDispute(
    @Param('disputeId') disputeId: string,
    @Body() updateDisputeDTO: UpdateDisputeDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.updateDispute(
      disputeId,
      updateDisputeDTO,
      user.userId,
    );
  }

  // REQ-PY-39: Payroll specialists approve disputes that are validated.
  @Put('disputes/:disputeId/approve-by-specialist')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async approveDisputeBySpecialist(
    @Param('disputeId') disputeId: string,
    @Body() approveDisputeBySpecialistDTO: ApproveDisputeBySpecialistDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.approveDisputeBySpecialist(
      disputeId,
      approveDisputeBySpecialistDTO,
      user.userId,
    );
  }

  // REQ-PY-39: Payroll specialists reject disputes with a reason.
  @Put('disputes/:disputeId/reject-by-specialist')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async rejectDisputeBySpecialist(
    @Param('disputeId') disputeId: string,
    @Body() rejectDisputeBySpecialistDTO: RejectDisputeBySpecialistDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.rejectDisputeBySpecialist(
      disputeId,
      rejectDisputeBySpecialistDTO,
      user.userId,
    );
  }

  // REQ-PY-40: Payroll managers confirm specialist approvals on disputes.
  @Put('disputes/:disputeId/confirm-approval')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN) // Payroll Manager is often a senior Payroll Specialist
  async confirmDisputeApproval(
    @Param('disputeId') disputeId: string,
    @Body() confirmDisputeApprovalDTO: ConfirmDisputeApprovalDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.confirmDisputeApproval(
      disputeId,
      confirmDisputeApprovalDTO,
      user.userId,
    );
  }

  // ==================== REFUNDS ENDPOINTS ====================

  // REQ-PY-45 & REQ-PY-46: Finance staff create refunds tied to approved items.
  @Post('refunds')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async createRefund(
    @Body() createRefundDTO: CreateRefundDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.createRefund(createRefundDTO, user.userId);
  }

  // REQ-PY-45 & REQ-PY-46: Finance monitors refunds waiting to be paid.
  @Get('refunds/pending')
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getPendingRefunds(@CurrentUser() user: any) {
    return await this.payrollTrackingService.getPendingRefunds();
  }

  // REQ-PY-18: Employees view refunds generated for their claims/disputes.
  @Get('refunds/employee/:employeeId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getRefundsByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getRefundsByEmployeeId(employeeId);
  }

  // REQ-PY-18: Drill into the lifecycle of a specific refund.
  @Get('refunds/:refundId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getRefundById(
    @Param('refundId') refundId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getRefundById(refundId);
  }

  // REQ-PY-45 & REQ-PY-46: Finance updates refund details before payout.
  @Put('refunds/:refundId')
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async updateRefund(
    @Param('refundId') refundId: string,
    @Body() updateRefundDTO: UpdateRefundDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.updateRefund(
      refundId,
      updateRefundDTO,
      user.userId,
    );
  }

  // REQ-PY-46: Mark refunds as paid when included in the payroll run.
  @Put('refunds/:refundId/process')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async processRefund(
    @Param('refundId') refundId: string,
    @Body() processRefundDTO: ProcessRefundDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.processRefund(
      refundId,
      processRefundDTO,
      user.userId,
    );
  }

  // REQ-PY-45: Create refunds for disputes once approvals finish.
  @Post('refunds/dispute/:disputeId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async generateRefundForDispute(
    @Param('disputeId') disputeId: string,
    @Body() generateRefundForDisputeDTO: GenerateRefundForDisputeDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.generateRefundForDispute(
      disputeId,
      generateRefundForDisputeDTO,
      user.userId,
    );
  }

  // REQ-PY-46: Create refunds for approved expense claims.
  @Post('refunds/claim/:claimId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async generateRefundForClaim(
    @Param('claimId') claimId: string,
    @Body() generateRefundForClaimDTO: GenerateRefundForClaimDTO,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.generateRefundForClaim(
      claimId,
      generateRefundForClaimDTO,
      user.userId,
    );
  }

  // ==================== EMPLOYEE SELF-SERVICE ENDPOINTS (REQ-PY-1 to REQ-PY-15) ====================

  // REQ-PY-1: Employees view and download their payslips online
  @Get('employee/:employeeId/payslips')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getPayslipsByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getPayslipsByEmployeeId(employeeId);
  }

  // REQ-PY-1 & REQ-PY-2: Employees view/download a specific payslip and see its status
  @Get('employee/:employeeId/payslips/:payslipId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getPayslipById(
    @Param('employeeId') employeeId: string,
    @Param('payslipId') payslipId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getPayslipById(payslipId, employeeId);
  }

  // REQ-PY-3: Employees view base salary according to employment contract
  @Get('employee/:employeeId/base-salary')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getEmployeeBaseSalary(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    return await this.payrollTrackingService.getEmployeeBaseSalary(employeeId);
  }

  // REQ-PY-5: Employees view compensation for unused/encashed leave days
  @Get('employee/:employeeId/leave-encashment')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getLeaveEncashmentByEmployeeId(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payrollRunId') payrollRunId?: string,
  ) {
    return await this.payrollTrackingService.getLeaveEncashmentByEmployeeId(
      employeeId,
      payrollRunId,
    );
  }

  // REQ-PY-7: Employees view transportation/commuting compensation
  @Get('employee/:employeeId/transportation-allowance')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getTransportationAllowance(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payslipId') payslipId?: string,
  ) {
    return await this.payrollTrackingService.getTransportationAllowance(
      employeeId,
      payslipId,
    );
  }

  // REQ-PY-8: Employees view detailed tax deductions with law/rule applied
  @Get('employee/:employeeId/tax-deductions')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getTaxDeductions(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payslipId') payslipId?: string,
  ) {
    return await this.payrollTrackingService.getTaxDeductions(employeeId, payslipId);
  }

  // REQ-PY-9: Employees view insurance deductions itemized
  @Get('employee/:employeeId/insurance-deductions')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getInsuranceDeductions(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payslipId') payslipId?: string,
  ) {
    return await this.payrollTrackingService.getInsuranceDeductions(
      employeeId,
      payslipId,
    );
  }

  // REQ-PY-10: Employees view salary deductions due to misconduct/absenteeism
  @Get('employee/:employeeId/misconduct-deductions')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getMisconductDeductions(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payslipId') payslipId?: string,
  ) {
    return await this.payrollTrackingService.getMisconductDeductions(
      employeeId,
      payslipId,
    );
  }

  // REQ-PY-11: Employees view deductions for unpaid leave days
  @Get('employee/:employeeId/unpaid-leave-deductions')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getUnpaidLeaveDeductions(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payslipId') payslipId?: string,
  ) {
    return await this.payrollTrackingService.getUnpaidLeaveDeductions(
      employeeId,
      payslipId,
    );
  }

  // REQ-PY-13: Employees access salary history
  @Get('employee/:employeeId/salary-history')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getSalaryHistory(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return await this.payrollTrackingService.getSalaryHistory(
      employeeId,
      limit ? parseInt(limit, 10) : 12,
    );
  }

  // REQ-PY-14: Employees view employer contributions
  @Get('employee/:employeeId/employer-contributions')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getEmployerContributions(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('payslipId') payslipId?: string,
  ) {
    return await this.payrollTrackingService.getEmployerContributions(
      employeeId,
      payslipId,
    );
  }

  // REQ-PY-15: Employees download tax documents (annual tax statement)
  @Get('employee/:employeeId/tax-documents')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.SYSTEM_ADMIN)
  async getTaxDocuments(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('year') year?: string,
  ) {
    return await this.payrollTrackingService.getTaxDocuments(
      employeeId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  // ==================== OPERATIONAL REPORTS ENDPOINTS (REQ-PY-25, REQ-PY-29, REQ-PY-38) ====================

  // REQ-PY-38: Payroll specialist generate payroll reports by department
  @Get('reports/department/:departmentId')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.SYSTEM_ADMIN)
  async getPayrollReportByDepartment(
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: any,
    @Query('payrollRunId') payrollRunId?: string,
  ) {
    return await this.payrollTrackingService.getPayrollReportByDepartment(
      departmentId,
      payrollRunId,
    );
  }

  // REQ-PY-29: Finance staff generate month-end and year-end payroll summaries
  @Get('reports/payroll-summary')
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getPayrollSummary(
    @Query('period') period: 'month' | 'year',
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return await this.payrollTrackingService.getPayrollSummary(
      period,
      date ? new Date(date) : undefined,
      departmentId,
    );
  }

  // REQ-PY-25: Finance staff generate reports about taxes, insurance contributions, and benefits
  @Get('reports/tax-insurance-benefits')
  @Roles(SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getTaxInsuranceBenefitsReport(
    @Query('period') period: 'month' | 'year',
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return await this.payrollTrackingService.getTaxInsuranceBenefitsReport(
      period,
      date ? new Date(date) : undefined,
      departmentId,
    );
  }

  // ==================== ORGANIZATION STRUCTURE INTEGRATION ENDPOINTS ====================

  // Get all active departments for payroll reporting
  @Get('departments')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getActiveDepartments(@CurrentUser() user: any) {
    return await this.payrollTrackingService.getActiveDepartments();
  }

  // Get payroll summary for all departments
  @Get('reports/departments-summary')
  @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN)
  async getPayrollSummaryByAllDepartments(
    @Query('period') period: 'month' | 'year',
    @CurrentUser() user: any,
    @Query('date') date?: string,
  ) {
    return await this.payrollTrackingService.getPayrollSummaryByAllDepartments(
      period,
      date ? new Date(date) : undefined,
    );
  }
}
