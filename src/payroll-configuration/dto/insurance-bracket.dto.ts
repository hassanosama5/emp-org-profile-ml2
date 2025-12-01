import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  Validate,
} from 'class-validator';
import { MinLessThanMax } from '../common/validators/min-less-than-max.validator';

export class CreateInsuranceBracketDto {
  @ApiProperty({ description: 'Insurance bracket name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Fixed insurance amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Minimum salary for bracket', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Validate(MinLessThanMax, ['maxSalary'])
  minSalary: number;

  @ApiProperty({ description: 'Maximum salary for bracket' })
  @IsNumber()
  maxSalary: number;

  @ApiProperty({
    description: 'Employee contribution rate (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  employeeRate: number;

  @ApiProperty({
    description: 'Employer contribution rate (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  employerRate: number;
}

export class UpdateInsuranceBracketDto {
  @ApiProperty({ required: false, description: 'Insurance bracket name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Fixed insurance amount',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    required: false,
    description: 'Minimum salary for bracket',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Validate(MinLessThanMax, ['maxSalary'])
  minSalary?: number;

  @ApiProperty({ required: false, description: 'Maximum salary for bracket' })
  @IsOptional()
  @IsNumber()
  maxSalary?: number;

  @ApiProperty({
    required: false,
    description: 'Employee contribution rate (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employeeRate?: number;

  @ApiProperty({
    required: false,
    description: 'Employer contribution rate (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employerRate?: number;
}
