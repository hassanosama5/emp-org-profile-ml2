import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationStructureService } from '../organization-structure/organization-structure.service';

// Import all schemas
import { payGrade } from './models/payGrades.schema';
import { payrollPolicies } from './models/payrollPolicies.schema';
import { allowance } from './models/allowance.schema';
import { payType } from './models/payType.schema';
import { taxRules } from './models/taxRules.schema';
import { insuranceBrackets } from './models/insuranceBrackets.schema';
import { signingBonus } from './models/signingBonus.schema';
import { terminationAndResignationBenefits } from './models/terminationAndResignationBenefits';
import { CompanyWideSettings } from './models/CompanyWideSettings.schema';

// Import enums
import { ConfigStatus } from './enums/payroll-configuration-enums';

// Import DTOs
import { ApprovalDto, RejectionDto } from './dto/approval.dto';

// ============================================================================
// INTERFACES FOR DTOs (Temporary - Member A will replace with proper DTOs)
// ============================================================================

interface CreatePayGradeDto {
  grade: string;
  baseSalary: number;
  grossSalary: number;
}

interface UpdatePayGradeDto {
  grade?: string;
  baseSalary?: number;
  grossSalary?: number;
}

interface CreateAllowanceDto {
  name: string;
  amount: number;
}

interface UpdateAllowanceDto {
  name?: string;
  amount?: number;
}

interface CreatePayTypeDto {
  type: string;
  amount: number;
}

interface UpdatePayTypeDto {
  type?: string;
  amount?: number;
}

interface CreateTaxRuleDto {
  name: string;
  description?: string;
  rate: number;
}

interface UpdateTaxRuleDto {
  name?: string;
  description?: string;
  rate?: number;
}

interface CreateInsuranceBracketDto {
  name: string;
  // amount: number;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
}

interface UpdateInsuranceBracketDto {
  name?: string;
  // amount?: number;
  minSalary?: number;
  maxSalary?: number;
  employeeRate?: number;
  employerRate?: number;
}

interface CreateSigningBonusDto {
  positionName: string;
  amount: number;
}

interface UpdateSigningBonusDto {
  positionName?: string;
  amount?: number;
}

interface CreateTerminationBenefitDto {
  name: string;
  amount: number;
  terms?: string;
}

interface UpdateTerminationBenefitDto {
  name?: string;
  amount?: number;
  terms?: string;
}

interface CreatePayrollPolicyDto {
  policyName: string;
  policyType: string;
  description: string;
  effectiveDate: string;
  ruleDefinition: {
    percentage: number;
    fixedAmount: number;
    thresholdAmount: number;
  };
  applicability: string;
}

interface UpdatePayrollPolicyDto {
  policyName?: string;
  policyType?: string;
  description?: string;
  effectiveDate?: string;
  ruleDefinition?: {
    percentage?: number;
    fixedAmount?: number;
    thresholdAmount?: number;
  };
  applicability?: string;
}

interface CreateCompanySettingsDto {
  payDate: string;
  timeZone: string;
  currency: string;
}

interface UpdateCompanySettingsDto {
  payDate?: string;
  timeZone?: string;
  currency?: string;
}

interface FilterDto {
  status?: ConfigStatus;
  createdBy?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class PayrollConfigurationService {
  // Helper method for case-insensitive status comparison
  private normalizeStatus(status: string | ConfigStatus): string {
    return status?.toString().toLowerCase() || '';
  }

  constructor(
    @InjectModel(payGrade.name) private payGradeModel: Model<payGrade>,
    @InjectModel(payrollPolicies.name)
    private payrollPoliciesModel: Model<payrollPolicies>,
    @InjectModel(allowance.name) private allowanceModel: Model<allowance>,
    @InjectModel(payType.name) private payTypeModel: Model<payType>,
    @InjectModel(taxRules.name) private taxRulesModel: Model<taxRules>,
    @InjectModel(insuranceBrackets.name)
    private insuranceBracketsModel: Model<insuranceBrackets>,
    @InjectModel(signingBonus.name)
    private signingBonusModel: Model<signingBonus>,
    @InjectModel(terminationAndResignationBenefits.name)
    private terminationBenefitsModel: Model<terminationAndResignationBenefits>,
    @InjectModel(CompanyWideSettings.name)
    private companySettingsModel: Model<CompanyWideSettings>,
    private readonly organizationStructureService: OrganizationStructureService,
  ) {}

  // ============================================================================
  // PAY GRADE OPERATIONS
  // ============================================================================

  /**
   * Create a new pay grade in DRAFT status
   */
  async createPayGrade(createDto: CreatePayGradeDto, userId: string) {
    // Business Rule: Validate gross salary >= base salary
    if (createDto.grossSalary < createDto.baseSalary) {
      throw new BadRequestException(
        'Gross salary must be greater than or equal to base salary',
      );
    }

    // Business Rule: Check minimum salary threshold (6000)
    if (createDto.baseSalary < 6000 || createDto.grossSalary < 6000) {
      throw new BadRequestException(
        'Base salary and gross salary must be at least 6000',
      );
    }

    const payGrade = new this.payGradeModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await payGrade.save();
  }

  /**
   * Update a pay grade - only allowed in DRAFT status
   */
  async updatePayGrade(
    id: string,
    updateDto: UpdatePayGradeDto,
    userId: string,
  ) {
    const payGrade = await this.payGradeModel.findById(id);

    if (!payGrade) {
      throw new NotFoundException(`Pay grade with ID ${id} not found`);
    }

    // Draft-only edit enforcement
    if (this.normalizeStatus(payGrade.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update pay grade with status ${payGrade.status}. Only DRAFT items can be edited.`,
      );
    }

    // Business Rule: Validate gross salary >= base salary
    const newGrossSalary = updateDto.grossSalary ?? payGrade.grossSalary;
    const newBaseSalary = updateDto.baseSalary ?? payGrade.baseSalary;

    if (newGrossSalary < newBaseSalary) {
      throw new BadRequestException(
        'Gross salary must be greater than or equal to base salary',
      );
    }

    // Business Rule: Check minimum salary threshold
    if (newBaseSalary < 6000 || newGrossSalary < 6000) {
      throw new BadRequestException(
        'Base salary and gross salary must be at least 6000',
      );
    }

    Object.assign(payGrade, updateDto);
    return await payGrade.save();
  }

  /**
   * Get all pay grades with optional filtering
   */
  async findAllPayGrades(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.payGradeModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.payGradeModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single pay grade by ID
   */
  async findOnePayGrade(id: string) {
    const payGrade = await this.payGradeModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!payGrade) {
      throw new NotFoundException(`Pay grade with ID ${id} not found`);
    }

    return payGrade;
  }

  /**
   * Approve a pay grade - changes status from DRAFT to APPROVED
   */
  async approvePayGrade(id: string, approvalDto: ApprovalDto, userId: string) {
    const payGrade = await this.payGradeModel.findById(id);

    if (!payGrade) {
      throw new NotFoundException(`Pay grade with ID ${id} not found`);
    }

    if (this.normalizeStatus(payGrade.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve pay grade with status ${payGrade.status}. Only DRAFT items can be approved.`,
      );
    }

    payGrade.status = ConfigStatus.APPROVED;
    payGrade.approvedBy = new Types.ObjectId(userId);
    payGrade.approvedAt = new Date();

    return await payGrade.save();
  }

  /**
   * Reject a pay grade - changes status from DRAFT to REJECTED
   */
  async rejectPayGrade(id: string, rejectionDto: RejectionDto, userId: string) {
    const payGrade = await this.payGradeModel.findById(id);

    if (!payGrade) {
      throw new NotFoundException(`Pay grade with ID ${id} not found`);
    }

    if (this.normalizeStatus(payGrade.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject pay grade with status ${payGrade.status}. Only DRAFT items can be rejected.`,
      );
    }

    payGrade.status = ConfigStatus.REJECTED;
    payGrade.approvedBy = new Types.ObjectId(userId);
    payGrade.approvedAt = new Date();

    return await payGrade.save();
  }

  /**
   * Delete a pay grade - only allowed in DRAFT status
   */
  async deletePayGrade(id: string) {
    const payGrade = await this.payGradeModel.findById(id);

    if (!payGrade) {
      throw new NotFoundException(`Pay grade with ID ${id} not found`);
    }

    if (this.normalizeStatus(payGrade.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete pay grade with status ${payGrade.status}.`,
      );
    }

    await this.payGradeModel.findByIdAndDelete(id);
    return { message: 'Pay grade deleted successfully' };
  }

  // ============================================================================
  // ALLOWANCE OPERATIONS
  // ============================================================================

  async createAllowance(createDto: CreateAllowanceDto, userId: string) {
    if (createDto.amount < 0) {
      throw new BadRequestException('Allowance amount must be non-negative');
    }

    const allowance = new this.allowanceModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await allowance.save();
  }

  async updateAllowance(
    id: string,
    updateDto: UpdateAllowanceDto,
    userId: string,
  ) {
    const allowance = await this.allowanceModel.findById(id);

    if (!allowance) {
      throw new NotFoundException(`Allowance with ID ${id} not found`);
    }

    if (this.normalizeStatus(allowance.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update allowance with status ${allowance.status}. Only DRAFT items can be edited.`,
      );
    }

    if (updateDto.amount !== undefined && updateDto.amount < 0) {
      throw new BadRequestException('Allowance amount must be non-negative');
    }

    Object.assign(allowance, updateDto);
    return await allowance.save();
  }

  async findAllAllowances(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.allowanceModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.allowanceModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAllowance(id: string) {
    const allowance = await this.allowanceModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!allowance) {
      throw new NotFoundException(`Allowance with ID ${id} not found`);
    }

    return allowance;
  }

  async approveAllowance(id: string, approvalDto: ApprovalDto, userId: string) {
    const allowance = await this.allowanceModel.findById(id);

    if (!allowance) {
      throw new NotFoundException(`Allowance with ID ${id} not found`);
    }

    if (this.normalizeStatus(allowance.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve allowance with status ${allowance.status}. Only DRAFT items can be approved.`,
      );
    }

    allowance.status = ConfigStatus.APPROVED;
    allowance.approvedBy = new Types.ObjectId(userId);
    allowance.approvedAt = new Date();

    return await allowance.save();
  }

  async rejectAllowance(
    id: string,
    rejectionDto: RejectionDto,
    userId: string,
  ) {
    const allowance = await this.allowanceModel.findById(id);

    if (!allowance) {
      throw new NotFoundException(`Allowance with ID ${id} not found`);
    }

    if (this.normalizeStatus(allowance.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject allowance with status ${allowance.status}. Only DRAFT items can be rejected.`,
      );
    }

    allowance.status = ConfigStatus.REJECTED;
    allowance.approvedBy = new Types.ObjectId(userId);
    allowance.approvedAt = new Date();
    if (rejectionDto.comment) {
      // Store rejection comment if needed (you may need to add a comment field to the schema)
    }

    return await allowance.save();
  }

  async deleteAllowance(id: string) {
    const allowance = await this.allowanceModel.findById(id);

    if (!allowance) {
      throw new NotFoundException(`Allowance with ID ${id} not found`);
    }

    if (this.normalizeStatus(allowance.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete allowance with status ${allowance.status}.`,
      );
    }

    await this.allowanceModel.findByIdAndDelete(id);
    return { message: 'Allowance deleted successfully' };
  }

  // ============================================================================
  // PAY TYPE OPERATIONS
  // ============================================================================

  async createPayType(createDto: CreatePayTypeDto, userId: string) {
    if (createDto.amount < 6000) {
      throw new BadRequestException('Pay type amount must be at least 6000');
    }

    const payType = new this.payTypeModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await payType.save();
  }

  async updatePayType(id: string, updateDto: UpdatePayTypeDto, userId: string) {
    const payType = await this.payTypeModel.findById(id);

    if (!payType) {
      throw new NotFoundException(`Pay type with ID ${id} not found`);
    }

    if (this.normalizeStatus(payType.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update pay type with status ${payType.status}. Only DRAFT items can be edited.`,
      );
    }

    if (updateDto.amount !== undefined && updateDto.amount < 6000) {
      throw new BadRequestException('Pay type amount must be at least 6000');
    }

    Object.assign(payType, updateDto);
    return await payType.save();
  }

  async findAllPayTypes(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.payTypeModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.payTypeModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePayType(id: string) {
    const payType = await this.payTypeModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!payType) {
      throw new NotFoundException(`Pay type with ID ${id} not found`);
    }

    return payType;
  }

  async approvePayType(id: string, approvalDto: ApprovalDto, userId: string) {
    const payType = await this.payTypeModel.findById(id);

    if (!payType) {
      throw new NotFoundException(`Pay type with ID ${id} not found`);
    }

    if (this.normalizeStatus(payType.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve pay type with status ${payType.status}. Only DRAFT items can be approved.`,
      );
    }

    payType.status = ConfigStatus.APPROVED;
    payType.approvedBy = new Types.ObjectId(userId);
    payType.approvedAt = new Date();

    return await payType.save();
  }

  async rejectPayType(id: string, rejectionDto: RejectionDto, userId: string) {
    const payType = await this.payTypeModel.findById(id);

    if (!payType) {
      throw new NotFoundException(`Pay type with ID ${id} not found`);
    }

    if (this.normalizeStatus(payType.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject pay type with status ${payType.status}. Only DRAFT items can be rejected.`,
      );
    }

    payType.status = ConfigStatus.REJECTED;
    payType.approvedBy = new Types.ObjectId(userId);
    payType.approvedAt = new Date();

    return await payType.save();
  }

  async deletePayType(id: string) {
    const payType = await this.payTypeModel.findById(id);

    if (!payType) {
      throw new NotFoundException(`Pay type with ID ${id} not found`);
    }

    if (this.normalizeStatus(payType.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete pay type with status ${payType.status}.`,
      );
    }

    await this.payTypeModel.findByIdAndDelete(id);
    return { message: 'Pay type deleted successfully' };
  }

  // ============================================================================
  // TAX RULES OPERATIONS
  // ============================================================================

  async createTaxRule(createDto: CreateTaxRuleDto, userId: string) {
    if (createDto.rate < 0) {
      throw new BadRequestException('Tax rate must be non-negative');
    }

    const taxRule = new this.taxRulesModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await taxRule.save();
  }

  async updateTaxRule(id: string, updateDto: UpdateTaxRuleDto, userId: string) {
    const taxRule = await this.taxRulesModel.findById(id);

    if (!taxRule) {
      throw new NotFoundException(`Tax rule with ID ${id} not found`);
    }

    // Special case: Tax rules can be edited even when APPROVED (for legal updates)
    // When edited, approved tax rules should go back to DRAFT for re-approval
    const wasApproved = this.normalizeStatus(taxRule.status) === this.normalizeStatus(ConfigStatus.APPROVED);
    
    if (
      this.normalizeStatus(taxRule.status) !== this.normalizeStatus(ConfigStatus.DRAFT) &&
      !wasApproved
    ) {
      throw new BadRequestException(
        `Cannot update tax rule with status ${taxRule.status}. Only DRAFT items can be edited.`,
      );
    }

    if (updateDto.rate !== undefined && updateDto.rate < 0) {
      throw new BadRequestException('Tax rate must be non-negative');
    }

    // If tax rule was approved, change status back to DRAFT for re-approval after legal update
    if (wasApproved) {
      taxRule.status = ConfigStatus.DRAFT;
      // Clear approval information since it needs to be re-approved
      taxRule.approvedBy = undefined;
      taxRule.approvedAt = undefined;
    }

    Object.assign(taxRule, updateDto);
    return await taxRule.save();
  }

  async findAllTaxRules(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.taxRulesModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.taxRulesModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneTaxRule(id: string) {
    const taxRule = await this.taxRulesModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!taxRule) {
      throw new NotFoundException(`Tax rule with ID ${id} not found`);
    }

    return taxRule;
  }

  async approveTaxRule(id: string, approvalDto: ApprovalDto, userId: string) {
    const taxRule = await this.taxRulesModel.findById(id);

    if (!taxRule) {
      throw new NotFoundException(`Tax rule with ID ${id} not found`);
    }

    if (this.normalizeStatus(taxRule.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve tax rule with status ${taxRule.status}. Only DRAFT items can be approved.`,
      );
    }

    taxRule.status = ConfigStatus.APPROVED;
    taxRule.approvedBy = new Types.ObjectId(userId);
    taxRule.approvedAt = new Date();

    return await taxRule.save();
  }

  async rejectTaxRule(id: string, rejectionDto: RejectionDto, userId: string) {
    const taxRule = await this.taxRulesModel.findById(id);

    if (!taxRule) {
      throw new NotFoundException(`Tax rule with ID ${id} not found`);
    }

    if (this.normalizeStatus(taxRule.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject tax rule with status ${taxRule.status}. Only DRAFT items can be rejected.`,
      );
    }

    taxRule.status = ConfigStatus.REJECTED;
    taxRule.approvedBy = new Types.ObjectId(userId);
    taxRule.approvedAt = new Date();

    return await taxRule.save();
  }

  async deleteTaxRule(id: string) {
    const taxRule = await this.taxRulesModel.findById(id);

    if (!taxRule) {
      throw new NotFoundException(`Tax rule with ID ${id} not found`);
    }

    if (this.normalizeStatus(taxRule.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete tax rule with status ${taxRule.status}.`,
      );
    }

    await this.taxRulesModel.findByIdAndDelete(id);
    return { message: 'Tax rule deleted successfully' };
  }

  // ============================================================================
  // INSURANCE BRACKETS OPERATIONS
  // ============================================================================

  async createInsuranceBracket(
    createDto: CreateInsuranceBracketDto,
    userId: string,
  ) {
    // Validation
    // if (createDto.amount < 0) {
    //   throw new BadRequestException('Insurance amount must be non-negative');
    // }

    if (createDto.minSalary >= createDto.maxSalary) {
      throw new BadRequestException('Min salary must be less than max salary');
    }

    if (createDto.employeeRate < 0 || createDto.employeeRate > 100) {
      throw new BadRequestException('Employee rate must be between 0 and 100');
    }

    if (createDto.employerRate < 0 || createDto.employerRate > 100) {
      throw new BadRequestException('Employer rate must be between 0 and 100');
    }

    // Business Rule: Insurance oversight handoff
    // For insurance brackets, HR must be notified for final approval
    console.log('Insurance bracket created - HR oversight required');

    const insuranceBracket = new this.insuranceBracketsModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await insuranceBracket.save();
  }

  async updateInsuranceBracket(
    id: string,
    updateDto: UpdateInsuranceBracketDto,
    userId: string,
  ) {
    const insuranceBracket = await this.insuranceBracketsModel.findById(id);

    if (!insuranceBracket) {
      throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
    }

    if (this.normalizeStatus(insuranceBracket.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update insurance bracket with status ${insuranceBracket.status}. Only DRAFT items can be edited.`,
      );
    }

    // Validation
    const newMinSalary = updateDto.minSalary ?? insuranceBracket.minSalary;
    const newMaxSalary = updateDto.maxSalary ?? insuranceBracket.maxSalary;

    if (newMinSalary >= newMaxSalary) {
      throw new BadRequestException('Min salary must be less than max salary');
    }

    if (updateDto.employeeRate !== undefined) {
      if (updateDto.employeeRate < 0 || updateDto.employeeRate > 100) {
        throw new BadRequestException(
          'Employee rate must be between 0 and 100',
        );
      }
    }

    if (updateDto.employerRate !== undefined) {
      if (updateDto.employerRate < 0 || updateDto.employerRate > 100) {
        throw new BadRequestException(
          'Employer rate must be between 0 and 100',
        );
      }
    }

    Object.assign(insuranceBracket, updateDto);
    return await insuranceBracket.save();
  }

  async findAllInsuranceBrackets(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.insuranceBracketsModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.insuranceBracketsModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneInsuranceBracket(id: string) {
    const insuranceBracket = await this.insuranceBracketsModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!insuranceBracket) {
      throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
    }

    return insuranceBracket;
  }

  async approveInsuranceBracket(
    id: string,
    approvalDto: ApprovalDto,
    userId: string,
  ) {
    const insuranceBracket = await this.insuranceBracketsModel.findById(id);

    if (!insuranceBracket) {
      throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
    }

    if (this.normalizeStatus(insuranceBracket.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve insurance bracket with status ${insuranceBracket.status}. Only DRAFT items can be approved.`,
      );
    }

    // Business Rule: Insurance oversight - HR approval required
    console.log('Insurance bracket approved by HR');

    insuranceBracket.status = ConfigStatus.APPROVED;
    insuranceBracket.approvedBy = new Types.ObjectId(userId);
    insuranceBracket.approvedAt = new Date();

    return await insuranceBracket.save();
  }

  async rejectInsuranceBracket(
    id: string,
    rejectionDto: RejectionDto,
    userId: string,
  ) {
    const insuranceBracket = await this.insuranceBracketsModel.findById(id);

    if (!insuranceBracket) {
      throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
    }

    if (this.normalizeStatus(insuranceBracket.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject insurance bracket with status ${insuranceBracket.status}. Only DRAFT items can be rejected.`,
      );
    }

    insuranceBracket.status = ConfigStatus.REJECTED;
    insuranceBracket.approvedBy = new Types.ObjectId(userId);
    insuranceBracket.approvedAt = new Date();

    return await insuranceBracket.save();
  }

  async deleteInsuranceBracket(id: string) {
    const insuranceBracket = await this.insuranceBracketsModel.findById(id);

    if (!insuranceBracket) {
      throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
    }

    if (this.normalizeStatus(insuranceBracket.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete insurance bracket with status ${insuranceBracket.status}.`,
      );
    }

    await this.insuranceBracketsModel.findByIdAndDelete(id);
    return { message: 'Insurance bracket deleted successfully' };
  }

  // ============================================================================
  // SIGNING BONUS OPERATIONS
  // ============================================================================

  async createSigningBonus(createDto: CreateSigningBonusDto, userId: string) {
    if (createDto.amount < 0) {
      throw new BadRequestException(
        'Signing bonus amount must be non-negative',
      );
    }

    // Validate that positionName exists in organization structure
    const positions = await this.organizationStructureService.getAllPositions(
      undefined,
      true, // Only active positions
    );
    const positionExists = positions.some(
      (position) => position.title.trim().toLowerCase() === createDto.positionName.trim().toLowerCase(),
    );

    if (!positionExists) {
      throw new BadRequestException(
        `Position "${createDto.positionName}" does not exist in the organization structure. Please select a valid position.`,
      );
    }

    const signingBonus = new this.signingBonusModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await signingBonus.save();
  }

  async updateSigningBonus(
    id: string,
    updateDto: UpdateSigningBonusDto,
    userId: string,
  ) {
    const signingBonus = await this.signingBonusModel.findById(id);

    if (!signingBonus) {
      throw new NotFoundException(`Signing bonus with ID ${id} not found`);
    }

    if (this.normalizeStatus(signingBonus.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update signing bonus with status ${signingBonus.status}. Only DRAFT items can be edited.`,
      );
    }

    if (updateDto.amount !== undefined && updateDto.amount < 0) {
      throw new BadRequestException(
        'Signing bonus amount must be non-negative',
      );
    }

    // Validate positionName if it's being updated
    if (updateDto.positionName !== undefined) {
      const positions = await this.organizationStructureService.getAllPositions(
        undefined,
        true, // Only active positions
      );
      const positionExists = positions.some(
        (position) => position.title.trim().toLowerCase() === updateDto.positionName!.trim().toLowerCase(),
      );

      if (!positionExists) {
        throw new BadRequestException(
          `Position "${updateDto.positionName}" does not exist in the organization structure. Please select a valid position.`,
        );
      }
    }

    Object.assign(signingBonus, updateDto);
    return await signingBonus.save();
  }

  async findAllSigningBonuses(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.signingBonusModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.signingBonusModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneSigningBonus(id: string) {
    const signingBonus = await this.signingBonusModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!signingBonus) {
      throw new NotFoundException(`Signing bonus with ID ${id} not found`);
    }

    return signingBonus;
  }

  async approveSigningBonus(
    id: string,
    approvalDto: ApprovalDto,
    userId: string,
  ) {
    const signingBonus = await this.signingBonusModel.findById(id);

    if (!signingBonus) {
      throw new NotFoundException(`Signing bonus with ID ${id} not found`);
    }

    if (this.normalizeStatus(signingBonus.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve signing bonus with status ${signingBonus.status}. Only DRAFT items can be approved.`,
      );
    }

    signingBonus.status = ConfigStatus.APPROVED;
    signingBonus.approvedBy = new Types.ObjectId(userId);
    signingBonus.approvedAt = new Date();

    return await signingBonus.save();
  }

  async rejectSigningBonus(
    id: string,
    rejectionDto: RejectionDto,
    userId: string,
  ) {
    const signingBonus = await this.signingBonusModel.findById(id);

    if (!signingBonus) {
      throw new NotFoundException(`Signing bonus with ID ${id} not found`);
    }

    if (this.normalizeStatus(signingBonus.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject signing bonus with status ${signingBonus.status}. Only DRAFT items can be rejected.`,
      );
    }

    signingBonus.status = ConfigStatus.REJECTED;
    signingBonus.approvedBy = new Types.ObjectId(userId);
    signingBonus.approvedAt = new Date();

    return await signingBonus.save();
  }

  async deleteSigningBonus(id: string) {
    const signingBonus = await this.signingBonusModel.findById(id);

    if (!signingBonus) {
      throw new NotFoundException(`Signing bonus with ID ${id} not found`);
    }

    if (this.normalizeStatus(signingBonus.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot delete signing bonus with status ${signingBonus.status}. Only DRAFT items can be deleted.`,
      );
    }

    await this.signingBonusModel.findByIdAndDelete(id);
    return { message: 'Signing bonus deleted successfully' };
  }

  // ============================================================================
  // TERMINATION BENEFITS OPERATIONS
  // ============================================================================

  async createTerminationBenefit(
    createDto: CreateTerminationBenefitDto,
    userId: string,
  ) {
    if (createDto.amount < 0) {
      throw new BadRequestException(
        'Termination benefit amount must be non-negative',
      );
    }

    const benefit = new this.terminationBenefitsModel({
      ...createDto,
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await benefit.save();
  }

  async updateTerminationBenefit(
    id: string,
    updateDto: UpdateTerminationBenefitDto,
    userId: string,
  ) {
    const benefit = await this.terminationBenefitsModel.findById(id);

    if (!benefit) {
      throw new NotFoundException(
        `Termination benefit with ID ${id} not found`,
      );
    }

    if (this.normalizeStatus(benefit.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update termination benefit with status ${benefit.status}. Only DRAFT items can be edited.`,
      );
    }

    if (updateDto.amount !== undefined && updateDto.amount < 0) {
      throw new BadRequestException(
        'Termination benefit amount must be non-negative',
      );
    }

    Object.assign(benefit, updateDto);
    return await benefit.save();
  }

  async findAllTerminationBenefits(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.terminationBenefitsModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.terminationBenefitsModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneTerminationBenefit(id: string) {
    const benefit = await this.terminationBenefitsModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!benefit) {
      throw new NotFoundException(
        `Termination benefit with ID ${id} not found`,
      );
    }

    return benefit;
  }

  async approveTerminationBenefit(
    id: string,
    approvalDto: ApprovalDto,
    userId: string,
  ) {
    const benefit = await this.terminationBenefitsModel.findById(id);

    if (!benefit) {
      throw new NotFoundException(
        `Termination benefit with ID ${id} not found`,
      );
    }

    if (this.normalizeStatus(benefit.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve termination benefit with status ${benefit.status}. Only DRAFT items can be approved.`,
      );
    }

    benefit.status = ConfigStatus.APPROVED;
    benefit.approvedBy = new Types.ObjectId(userId);
    benefit.approvedAt = new Date();

    return await benefit.save();
  }

  async rejectTerminationBenefit(
    id: string,
    rejectionDto: RejectionDto,
    userId: string,
  ) {
    const benefit = await this.terminationBenefitsModel.findById(id);

    if (!benefit) {
      throw new NotFoundException(
        `Termination benefit with ID ${id} not found`,
      );
    }

    if (this.normalizeStatus(benefit.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject termination benefit with status ${benefit.status}. Only DRAFT items can be rejected.`,
      );
    }

    benefit.status = ConfigStatus.REJECTED;
    benefit.approvedBy = new Types.ObjectId(userId);
    benefit.approvedAt = new Date();

    return await benefit.save();
  }

  async deleteTerminationBenefit(id: string) {
    const benefit = await this.terminationBenefitsModel.findById(id);

    if (!benefit) {
      throw new NotFoundException(
        `Termination benefit with ID ${id} not found`,
      );
    }

    if (this.normalizeStatus(benefit.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete termination benefit with status ${benefit.status}.`,
      );
    }

    await this.terminationBenefitsModel.findByIdAndDelete(id);
    return { message: 'Termination benefit deleted successfully' };
  }

  // ============================================================================
  // PAYROLL POLICIES OPERATIONS
  // ============================================================================

  async createPayrollPolicy(createDto: CreatePayrollPolicyDto, userId: string) {
    // Validation for rule definition
    const { ruleDefinition } = createDto;

    if (ruleDefinition.percentage < 0 || ruleDefinition.percentage > 100) {
      throw new BadRequestException('Percentage must be between 0 and 100');
    }

    if (ruleDefinition.fixedAmount < 0) {
      throw new BadRequestException('Fixed amount must be non-negative');
    }

    if (ruleDefinition.thresholdAmount < 1) {
      throw new BadRequestException('Threshold amount must be at least 1');
    }

    const policy = new this.payrollPoliciesModel({
      ...createDto,
      effectiveDate: new Date(createDto.effectiveDate),
      status: ConfigStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
    });

    return await policy.save();
  }

  async updatePayrollPolicy(
    id: string,
    updateDto: UpdatePayrollPolicyDto,
    userId: string,
  ) {
    const policy = await this.payrollPoliciesModel.findById(id);

    if (!policy) {
      throw new NotFoundException(`Payroll policy with ID ${id} not found`);
    }

    if (this.normalizeStatus(policy.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot update payroll policy with status ${policy.status}. Only DRAFT items can be edited.`,
      );
    }

    // Validation for rule definition if provided
    if (updateDto.ruleDefinition) {
      const { percentage, fixedAmount, thresholdAmount } =
        updateDto.ruleDefinition;

      if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
        throw new BadRequestException('Percentage must be between 0 and 100');
      }

      if (fixedAmount !== undefined && fixedAmount < 0) {
        throw new BadRequestException('Fixed amount must be non-negative');
      }

      if (thresholdAmount !== undefined && thresholdAmount < 1) {
        throw new BadRequestException('Threshold amount must be at least 1');
      }
    }

    // Convert effectiveDate string to Date if provided
    const updateData: any = { ...updateDto };
    if (updateData.effectiveDate) {
      updateData.effectiveDate = new Date(updateData.effectiveDate);
    }
    
    Object.assign(policy, updateData);
    return await policy.save();
  }

  async findAllPayrollPolicies(filterDto?: FilterDto) {
    const { status, createdBy, page = 1, limit = 10 } = filterDto || {};
    const filter: any = {};

    if (status) filter.status = status;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.payrollPoliciesModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.payrollPoliciesModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePayrollPolicy(id: string) {
    const policy = await this.payrollPoliciesModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!policy) {
      throw new NotFoundException(`Payroll policy with ID ${id} not found`);
    }

    return policy;
  }

  async approvePayrollPolicy(
    id: string,
    approvalDto: ApprovalDto,
    userId: string,
  ) {
    const policy = await this.payrollPoliciesModel.findById(id);

    if (!policy) {
      throw new NotFoundException(`Payroll policy with ID ${id} not found`);
    }

    if (this.normalizeStatus(policy.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot approve payroll policy with status ${policy.status}. Only DRAFT items can be approved.`,
      );
    }

    policy.status = ConfigStatus.APPROVED;
    policy.approvedBy = new Types.ObjectId(userId);
    policy.approvedAt = new Date();

    return await policy.save();
  }

  async rejectPayrollPolicy(
    id: string,
    rejectionDto: RejectionDto,
    userId: string,
  ) {
    const policy = await this.payrollPoliciesModel.findById(id);

    if (!policy) {
      throw new NotFoundException(`Payroll policy with ID ${id} not found`);
    }

    if (this.normalizeStatus(policy.status) !== this.normalizeStatus(ConfigStatus.DRAFT)) {
      throw new BadRequestException(
        `Cannot reject payroll policy with status ${policy.status}. Only DRAFT items can be rejected.`,
      );
    }

    policy.status = ConfigStatus.REJECTED;
    policy.approvedBy = new Types.ObjectId(userId);
    policy.approvedAt = new Date();

    return await policy.save();
  }

  async deletePayrollPolicy(id: string) {
    const policy = await this.payrollPoliciesModel.findById(id);

    if (!policy) {
      throw new NotFoundException(`Payroll policy with ID ${id} not found`);
    }

    if (this.normalizeStatus(policy.status) === this.normalizeStatus(ConfigStatus.REJECTED)) {
      throw new BadRequestException(
        `Cannot delete payroll policy with status ${policy.status}.`,
      );
    }

    await this.payrollPoliciesModel.findByIdAndDelete(id);
    return { message: 'Payroll policy deleted successfully' };
  }

  // ============================================================================
  // COMPANY WIDE SETTINGS OPERATIONS (No approval workflow needed)
  // ============================================================================

  async createCompanySettings(
    createDto: CreateCompanySettingsDto,
    userId: string,
  ) {
    // Check if settings already exist (only one record should exist)
    const existingSettings = await this.companySettingsModel.findOne();

    if (existingSettings) {
      throw new ConflictException(
        'Company settings already exist. Use update instead.',
      );
    }

    // Validate currency is EGP
    if (createDto.currency !== 'EGP') {
      throw new BadRequestException('Only EGP currency is allowed');
    }

    const settings = new this.companySettingsModel({
      ...createDto,
      payDate: new Date(createDto.payDate),
      createdBy: new Types.ObjectId(userId),
    });
    return await settings.save();
  }

  async updateCompanySettings(
    updateDto: UpdateCompanySettingsDto,
    userId: string,
  ) {
    const settings = await this.companySettingsModel.findOne();

    if (!settings) {
      throw new NotFoundException(
        'Company settings not found. Create them first.',
      );
    }

    // Validate currency if provided
    if (updateDto.currency && updateDto.currency !== 'EGP') {
      throw new BadRequestException('Only EGP currency is allowed');
    }

    // Convert payDate string to Date if provided
    const updateData: any = { ...updateDto };
    if (updateData.payDate) {
      updateData.payDate = new Date(updateData.payDate);
    }
    
    Object.assign(settings, {
      ...updateData,
      updatedBy: new Types.ObjectId(userId),
      updatedAt: new Date(),
    });
    return await settings.save();
  }

  async getCompanySettings() {
    const settings = await this.companySettingsModel.findOne();

    if (!settings) {
      throw new NotFoundException('Company settings not found');
    }

    return settings;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get dashboard statistics for all configuration items
   */
  async getConfigurationStats() {
    const [
      payGradeStats,
      allowanceStats,
      payTypeStats,
      taxRuleStats,
      insuranceStats,
      signingBonusStats,
      terminationBenefitStats,
      policyStats,
    ] = await Promise.all([
      this.getEntityStats(this.payGradeModel),
      this.getEntityStats(this.allowanceModel),
      this.getEntityStats(this.payTypeModel),
      this.getEntityStats(this.taxRulesModel),
      this.getEntityStats(this.insuranceBracketsModel),
      this.getEntityStats(this.signingBonusModel),
      this.getEntityStats(this.terminationBenefitsModel),
      this.getEntityStats(this.payrollPoliciesModel),
    ]);

    return {
      payGrades: payGradeStats,
      allowances: allowanceStats,
      payTypes: payTypeStats,
      taxRules: taxRuleStats,
      insuranceBrackets: insuranceStats,
      signingBonuses: signingBonusStats,
      terminationBenefits: terminationBenefitStats,
      payrollPolicies: policyStats,
    };
  }

  /**
   * Helper method to get statistics for any entity
   */
  private async getEntityStats(model: Model<any>) {
    const [total, draft, approved, rejected] = await Promise.all([
      model.countDocuments(),
      model.countDocuments({ status: ConfigStatus.DRAFT }),
      model.countDocuments({ status: ConfigStatus.APPROVED }),
      model.countDocuments({ status: ConfigStatus.REJECTED }),
    ]);

    return {
      total,
      draft,
      approved,
      rejected,
    };
  }

  /**
   * Get all pending approvals (DRAFT items) across all entities
   */
  async getPendingApprovals(userId?: string) {
    const filter: any = { status: ConfigStatus.DRAFT };
    if (userId) {
      filter.createdBy = new Types.ObjectId(userId);
    }

    const [
      payGrades,
      allowances,
      payTypes,
      taxRules,
      insuranceBrackets,
      signingBonuses,
      terminationBenefits,
      policies,
    ] = await Promise.all([
      this.payGradeModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.allowanceModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.payTypeModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.taxRulesModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.insuranceBracketsModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.signingBonusModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.terminationBenefitsModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
      this.payrollPoliciesModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email'),
    ]);

    return {
      payGrades,
      allowances,
      payTypes,
      taxRules,
      insuranceBrackets,
      signingBonuses,
      terminationBenefits,
      policies,
      totalPending:
        payGrades.length +
        allowances.length +
        payTypes.length +
        taxRules.length +
        insuranceBrackets.length +
        signingBonuses.length +
        terminationBenefits.length +
        policies.length,
    };
  }
}
