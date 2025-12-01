import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PolicyType,
  Applicability,
} from '../enums/payroll-configuration-enums';

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
  @IsDateString()
  effectiveDate: Date;

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
  @IsString()
  effectiveDate?: Date;

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
