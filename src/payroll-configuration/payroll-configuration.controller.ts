import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { PayrollConfigurationService } from './payroll-configuration.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigStatus } from './enums/payroll-configuration-enums';
import { CreatePayGradeDto, UpdatePayGradeDto } from './dto/pay-grade.dto';
import { ApprovalDto, RejectionDto } from './dto/approval.dto';
import { FilterDto } from './dto/filter.dto';
import { CreateAllowanceDto, UpdateAllowanceDto } from './dto/allowance.dto';
import { CreatePayTypeDto, UpdatePayTypeDto } from './dto/pay-type.dto';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './dto/tax-rule.dto';
import {
  CreateInsuranceBracketDto,
  UpdateInsuranceBracketDto,
} from './dto/insurance-bracket.dto';
import {
  CreateSigningBonusDto,
  UpdateSigningBonusDto,
} from './dto/signing-bonus.dto';
import {
  CreateTerminationBenefitDto,
  UpdateTerminationBenefitDto,
} from './dto/termination-benefit.dto';
import {
  CreatePayrollPolicyDto,
  UpdatePayrollPolicyDto,
} from './dto/payroll-policy.dto';
import {
  CreateCompanySettingsDto,
  UpdateCompanySettingsDto,
} from './dto/company-settings.dto';
import { ObjectIdPipe } from './common/pipes/object-id.pipe';

// ✅ AUTH IMPORTS - FIXED PATHS
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

@ApiTags('payroll-configuration')
@Controller('payroll-configuration')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ ADDED JwtAuthGuard
export class PayrollConfigurationController {
  constructor(
    private readonly payrollConfigService: PayrollConfigurationService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // ==================== PAY GRADES ====================
  @Get('pay-grades')
  @ApiOperation({ summary: 'Get all pay grades with pagination and filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ConfigStatus })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of pay grades',
  })
  async getPayGrades(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllPayGrades(filterDto);
  }

  @Get('pay-grades/:id')
  @ApiOperation({ summary: 'Get pay grade by ID' })
  @ApiParam({ name: 'id', description: 'Pay grade ID' })
  @ApiResponse({ status: 200, description: 'Returns pay grade details' })
  @ApiResponse({ status: 404, description: 'Pay grade not found' })
  async getPayGrade(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOnePayGrade(id);
  }

  @Post('pay-grades')
  @ApiOperation({ summary: 'Create a new pay grade' })
  @ApiBody({ type: CreatePayGradeDto })
  @ApiResponse({ status: 201, description: 'Pay grade created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createPayGrade(
    @Body() createDto: CreatePayGradeDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createPayGrade(createDto, user.userId); // ✅ Use real userId
  }

  @Put('pay-grades/:id')
  @ApiOperation({ summary: 'Update a pay grade (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Pay grade ID' })
  @ApiBody({ type: UpdatePayGradeDto })
  @ApiResponse({ status: 200, description: 'Pay grade updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot update non-DRAFT pay grade',
  })
  @ApiResponse({ status: 404, description: 'Pay grade not found' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updatePayGrade(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdatePayGradeDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updatePayGrade(id, updateDto, user.userId); // ✅ Use real userId
  }

  @Delete('pay-grades/:id')
  @ApiOperation({ summary: 'Delete a pay grade (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Pay grade ID' })
  @ApiResponse({ status: 200, description: 'Pay grade deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete non-DRAFT pay grade',
  })
  @ApiResponse({ status: 404, description: 'Pay grade not found' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deletePayGrade(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deletePayGrade(id);
  }

  @Post('pay-grades/:id/approve')
  @ApiOperation({ summary: 'Approve a pay grade' })
  @ApiParam({ name: 'id', description: 'Pay grade ID' })
  @ApiBody({ type: ApprovalDto })
  @ApiResponse({ status: 200, description: 'Pay grade approved successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot approve non-DRAFT pay grade',
  })
  @ApiResponse({ status: 404, description: 'Pay grade not found' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approvePayGrade(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approvePayGrade(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('pay-grades/:id/reject')
  @ApiOperation({ summary: 'Reject a pay grade' })
  @ApiParam({ name: 'id', description: 'Pay grade ID' })
  @ApiBody({ type: RejectionDto })
  @ApiResponse({ status: 200, description: 'Pay grade rejected successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot reject non-DRAFT pay grade',
  })
  @ApiResponse({ status: 404, description: 'Pay grade not found' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectPayGrade(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectPayGrade(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== DASHBOARD & UTILITIES ====================
  @Get('stats')
  @ApiOperation({ summary: 'Get configuration statistics dashboard' })
  @ApiResponse({ status: 200, description: 'Returns configuration statistics' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async getConfigurationStats() {
    return this.payrollConfigService.getConfigurationStats();
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get all pending approvals' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({ status: 200, description: 'Returns pending approval items' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async getPendingApprovals(@Query('userId') userId?: string) {
    return this.payrollConfigService.getPendingApprovals(userId);
  }

  @Get('debug/db')
  @ApiOperation({ summary: 'Debug database connection info' })
  @Roles(SystemRole.SYSTEM_ADMIN)
  async getDbDebug() {
    const db = this.connection?.db;
    if (!db) {
      throw new BadRequestException('Database connection not initialized');
    }
    const collections = await db.listCollections().toArray();
    return {
      database: db.databaseName,
      collections: collections.map((c) => c.name),
    };
  }

  // ==================== COMPANY SETTINGS ====================
  @Get('company-settings')
  @ApiOperation({ summary: 'Get company-wide settings' })
  @ApiResponse({ status: 200, description: 'Returns company settings' })
  @ApiResponse({ status: 404, description: 'Company settings not found' })
  async getCompanySettings() {
    return this.payrollConfigService.getCompanySettings();
  }

  @Post('company-settings')
  @ApiOperation({ summary: 'Create company-wide settings' })
  @ApiResponse({ status: 201, description: 'Company settings created' })
  @ApiResponse({ status: 409, description: 'Company settings already exist' })
  @Roles(SystemRole.SYSTEM_ADMIN)
  async createCompanySettings(
    @Body() createDto: CreateCompanySettingsDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    if (!createDto) {
      throw new BadRequestException('Request body is required');
    }
    return this.payrollConfigService.createCompanySettings(
      createDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Put('company-settings')
  @ApiOperation({ summary: 'Update company-wide settings' })
  @ApiResponse({ status: 200, description: 'Company settings updated' })
  @ApiResponse({ status: 404, description: 'Company settings not found' })
  @Roles(SystemRole.SYSTEM_ADMIN)
  async updateCompanySettings(
    @Body() updateDto: UpdateCompanySettingsDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updateCompanySettings(
      updateDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== ALLOWANCES ====================
  @Get('allowances')
  @ApiOperation({ summary: 'Get all allowances with pagination and filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ConfigStatus })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllowances(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllAllowances(filterDto);
  }

  @Get('allowances/:id')
  @ApiOperation({ summary: 'Get allowance by ID' })
  @ApiParam({ name: 'id', description: 'Allowance ID' })
  async getAllowance(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOneAllowance(id);
  }

  @Post('allowances')
  @ApiOperation({ summary: 'Create allowance (DRAFT)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createAllowance(
    @Body() createDto: CreateAllowanceDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createAllowance(createDto, user.userId); // ✅ Use real userId
  }

  @Put('allowances/:id')
  @ApiOperation({ summary: 'Update allowance (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Allowance ID' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updateAllowance(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdateAllowanceDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updateAllowance(
      id,
      updateDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Delete('allowances/:id')
  @ApiOperation({ summary: 'Delete allowance (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Allowance ID' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deleteAllowance(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deleteAllowance(id);
  }

  @Post('allowances/:id/approve')
  @ApiOperation({ summary: 'Approve allowance' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approveAllowance(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approveAllowance(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('allowances/:id/reject')
  @ApiOperation({ summary: 'Reject allowance' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectAllowance(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectAllowance(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== PAY TYPES ====================
  @Get('pay-types')
  @ApiOperation({ summary: 'Get all pay types with pagination and filtering' })
  async getPayTypes(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllPayTypes(filterDto);
  }

  @Get('pay-types/:id')
  @ApiOperation({ summary: 'Get pay type by ID' })
  async getPayType(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOnePayType(id);
  }

  @Post('pay-types')
  @ApiOperation({ summary: 'Create pay type (DRAFT)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createPayType(
    @Body() createDto: CreatePayTypeDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createPayType(createDto, user.userId); // ✅ Use real userId
  }

  @Put('pay-types/:id')
  @ApiOperation({ summary: 'Update pay type (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updatePayType(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdatePayTypeDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updatePayType(id, updateDto, user.userId); // ✅ Use real userId
  }

  @Delete('pay-types/:id')
  @ApiOperation({ summary: 'Delete pay type (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deletePayType(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deletePayType(id);
  }

  @Post('pay-types/:id/approve')
  @ApiOperation({ summary: 'Approve pay type' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approvePayType(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approvePayType(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('pay-types/:id/reject')
  @ApiOperation({ summary: 'Reject pay type' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectPayType(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectPayType(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== TAX RULES ====================
  @Get('tax-rules')
  @ApiOperation({ summary: 'Get all tax rules with pagination and filtering' })
  async getTaxRules(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllTaxRules(filterDto);
  }

  @Get('tax-rules/:id')
  @ApiOperation({ summary: 'Get tax rule by ID' })
  async getTaxRule(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOneTaxRule(id);
  }

  @Post('tax-rules')
  @ApiOperation({ summary: 'Create tax rule (DRAFT)' })
  @Roles(SystemRole.LEGAL_POLICY_ADMIN)
  async createTaxRule(
    @Body() createDto: CreateTaxRuleDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createTaxRule(createDto, user.userId); // ✅ Use real userId
  }

  @Put('tax-rules/:id')
  @ApiOperation({ summary: 'Update tax rule (DRAFT only)' })
  @Roles(SystemRole.LEGAL_POLICY_ADMIN)
  async updateTaxRule(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdateTaxRuleDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updateTaxRule(id, updateDto, user.userId); // ✅ Use real userId
  }

  @Delete('tax-rules/:id')
  @ApiOperation({ summary: 'Delete tax rule (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deleteTaxRule(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deleteTaxRule(id);
  }

  @Post('tax-rules/:id/approve')
  @ApiOperation({ summary: 'Approve tax rule' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approveTaxRule(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approveTaxRule(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('tax-rules/:id/reject')
  @ApiOperation({ summary: 'Reject tax rule' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectTaxRule(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectTaxRule(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== INSURANCE BRACKETS ====================
  @Get('insurance-brackets')
  @ApiOperation({
    summary: 'Get all insurance brackets with pagination and filtering',
  })
  async getInsuranceBrackets(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllInsuranceBrackets(filterDto);
  }

  @Get('insurance-brackets/:id')
  @ApiOperation({ summary: 'Get insurance bracket by ID' })
  async getInsuranceBracket(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOneInsuranceBracket(id);
  }

  @Post('insurance-brackets')
  @ApiOperation({ summary: 'Create insurance bracket (DRAFT)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createInsuranceBracket(
    @Body() createDto: CreateInsuranceBracketDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createInsuranceBracket(
      createDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Put('insurance-brackets/:id')
  @ApiOperation({ summary: 'Update insurance bracket (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updateInsuranceBracket(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdateInsuranceBracketDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updateInsuranceBracket(
      id,
      updateDto,
      user.userId, // ✅ Use real userId
    );
  }

  @Delete('insurance-brackets/:id')
  @ApiOperation({ summary: 'Delete insurance bracket (DRAFT only)' })
  @Roles(SystemRole.HR_MANAGER)
  async deleteInsuranceBracket(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deleteInsuranceBracket(id);
  }

  @Post('insurance-brackets/:id/approve')
  @ApiOperation({ summary: 'Approve insurance bracket' })
  @Roles(SystemRole.HR_MANAGER)
  async approveInsuranceBracket(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approveInsuranceBracket(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('insurance-brackets/:id/reject')
  @ApiOperation({ summary: 'Reject insurance bracket' })
  @Roles(SystemRole.HR_MANAGER)
  async rejectInsuranceBracket(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectInsuranceBracket(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== SIGNING BONUSES ====================
  @Get('signing-bonuses')
  @ApiOperation({
    summary: 'Get all signing bonuses with pagination and filtering',
  })
  async getSigningBonuses(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllSigningBonuses(filterDto);
  }

  @Get('signing-bonuses/:id')
  @ApiOperation({ summary: 'Get signing bonus by ID' })
  async getSigningBonus(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOneSigningBonus(id);
  }

  @Post('signing-bonuses')
  @ApiOperation({ summary: 'Create signing bonus (DRAFT)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createSigningBonus(
    @Body() createDto: CreateSigningBonusDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createSigningBonus(createDto, user.userId); // ✅ Use real userId
  }

  @Put('signing-bonuses/:id')
  @ApiOperation({ summary: 'Update signing bonus (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updateSigningBonus(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdateSigningBonusDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updateSigningBonus(
      id,
      updateDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Delete('signing-bonuses/:id')
  @ApiOperation({ summary: 'Delete signing bonus (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deleteSigningBonus(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deleteSigningBonus(id);
  }

  @Post('signing-bonuses/:id/approve')
  @ApiOperation({ summary: 'Approve signing bonus' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approveSigningBonus(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approveSigningBonus(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('signing-bonuses/:id/reject')
  @ApiOperation({ summary: 'Reject signing bonus' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectSigningBonus(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectSigningBonus(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== TERMINATION BENEFITS ====================
  @Get('termination-benefits')
  @ApiOperation({
    summary: 'Get all termination benefits with pagination and filtering',
  })
  async getTerminationBenefits(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllTerminationBenefits(filterDto);
  }

  @Get('termination-benefits/:id')
  @ApiOperation({ summary: 'Get termination benefit by ID' })
  async getTerminationBenefit(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOneTerminationBenefit(id);
  }

  @Post('termination-benefits')
  @ApiOperation({ summary: 'Create termination benefit (DRAFT)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createTerminationBenefit(
    @Body() createDto: CreateTerminationBenefitDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createTerminationBenefit(
      createDto,
      user.userId, // ✅ Use real userId
    );
  }

  @Put('termination-benefits/:id')
  @ApiOperation({ summary: 'Update termination benefit (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updateTerminationBenefit(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdateTerminationBenefitDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updateTerminationBenefit(
      id,
      updateDto,
      user.userId, // ✅ Use real userId
    );
  }

  @Delete('termination-benefits/:id')
  @ApiOperation({ summary: 'Delete termination benefit (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deleteTerminationBenefit(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deleteTerminationBenefit(id);
  }

  @Post('termination-benefits/:id/approve')
  @ApiOperation({ summary: 'Approve termination benefit' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approveTerminationBenefit(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approveTerminationBenefit(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('termination-benefits/:id/reject')
  @ApiOperation({ summary: 'Reject termination benefit' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectTerminationBenefit(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectTerminationBenefit(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }

  // ==================== PAYROLL POLICIES ====================
  @Get('policies')
  @ApiOperation({
    summary: 'Get all payroll policies with pagination and filtering',
  })
  async getPayrollPolicies(@Query() filterDto: FilterDto) {
    return this.payrollConfigService.findAllPayrollPolicies(filterDto);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get payroll policy by ID' })
  async getPayrollPolicy(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.findOnePayrollPolicy(id);
  }

  @Post('policies')
  @ApiOperation({ summary: 'Create payroll policy (DRAFT)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async createPayrollPolicy(
    @Body() createDto: CreatePayrollPolicyDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.createPayrollPolicy(
      createDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Update payroll policy (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_SPECIALIST)
  async updatePayrollPolicy(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateDto: UpdatePayrollPolicyDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.updatePayrollPolicy(
      id,
      updateDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Delete payroll policy (DRAFT only)' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async deletePayrollPolicy(@Param('id', ObjectIdPipe) id: string) {
    return this.payrollConfigService.deletePayrollPolicy(id);
  }

  @Post('policies/:id/approve')
  @ApiOperation({ summary: 'Approve payroll policy' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async approvePayrollPolicy(
    @Param('id', ObjectIdPipe) id: string,
    @Body() approvalDto: ApprovalDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.approvePayrollPolicy(
      id,
      approvalDto,
      user.userId,
    ); // ✅ Use real userId
  }

  @Post('policies/:id/reject')
  @ApiOperation({ summary: 'Reject payroll policy' })
  @Roles(SystemRole.PAYROLL_MANAGER)
  async rejectPayrollPolicy(
    @Param('id', ObjectIdPipe) id: string,
    @Body() rejectionDto: RejectionDto,
    @CurrentUser() user: any, // ✅ ADDED: Current user context
  ) {
    return this.payrollConfigService.rejectPayrollPolicy(
      id,
      rejectionDto,
      user.userId,
    ); // ✅ Use real userId
  }
}
