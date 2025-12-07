import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PolicyType,
  Applicability,
} from '../enums/payroll-configuration-enums';

@ValidatorConstraint({ name: 'isValidISODate', async: false })
export class IsValidISODateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Check if it's a valid ISO 8601 date that can be parsed
    const date = new Date(value);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value);
  }

  defaultMessage() {
    return 'effectiveDate must be a valid ISO 8601 date string';
  }
}

class RuleDefinitionDto {
  @ApiProperty({ description: 'Percentage value', minimum: 0 })
  @IsNumber()
  @Min(0)
  percentage: number;

  @ApiProperty({ description: 'Fixed amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  fixedAmount: number;

  @ApiProperty({ description: 'Threshold amount', minimum: 1 })
  @IsNumber()
  @Min(1)
  thresholdAmount: number;
}

export class CreatePayrollPolicyDto {
  @ApiProperty({ description: 'Policy name' })
  @IsString()
  policyName: string;

  @ApiProperty({ description: 'Policy type', enum: PolicyType })
  @IsEnum(PolicyType)
  policyType: PolicyType;

  @ApiProperty({ description: 'Policy description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Effective date (ISO string)' })
  @Validate(IsValidISODateConstraint)
  effectiveDate: string;

  @ApiProperty({ description: 'Rule definition' })
  @ValidateNested()
  @Type(() => RuleDefinitionDto)
  ruleDefinition: RuleDefinitionDto;

  @ApiProperty({ description: 'Applicability', enum: Applicability })
  @IsEnum(Applicability)
  applicability: Applicability;
}

export class UpdatePayrollPolicyDto {
  @ApiProperty({ required: false, description: 'Policy name' })
  @IsOptional()
  @IsString()
  policyName?: string;

  @ApiProperty({
    required: false,
    description: 'Policy type',
    enum: PolicyType,
  })
  @IsOptional()
  @IsEnum(PolicyType)
  policyType?: PolicyType;

  @ApiProperty({ required: false, description: 'Policy description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Effective date (ISO string)' })
  @IsOptional()
  @Validate(IsValidISODateConstraint)
  effectiveDate?: string;

  @ApiProperty({ required: false, description: 'Rule definition' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleDefinitionDto)
  ruleDefinition?: RuleDefinitionDto;

  @ApiProperty({
    required: false,
    description: 'Applicability',
    enum: Applicability,
  })
  @IsOptional()
  @IsEnum(Applicability)
  applicability?: Applicability;
}
