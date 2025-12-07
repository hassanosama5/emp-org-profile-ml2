import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isValidISODate', async: false })
export class IsValidISODateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value);
  }

  defaultMessage() {
    return 'payDate must be a valid ISO 8601 date string';
  }
}

export class CreateCompanySettingsDto {
  @ApiProperty({ description: 'Pay date (ISO string)' })
  @Validate(IsValidISODateConstraint)
  payDate: string;

  @ApiProperty({ description: 'Time zone (e.g., Africa/Cairo)' })
  @IsString()
  timeZone: string;

  @ApiProperty({ description: 'Currency code', enum: ['EGP'] })
  @IsString()
  @IsIn(['EGP'])
  currency: string;
}

export class UpdateCompanySettingsDto {
  @ApiProperty({ required: false, description: 'Pay date (ISO string)' })
  @IsOptional()
  @Validate(IsValidISODateConstraint)
  payDate?: string;

  @ApiProperty({
    required: false,
    description: 'Time zone (e.g., Africa/Cairo)',
  })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiProperty({ required: false, description: 'Currency code', enum: ['EGP'] })
  @IsOptional()
  @IsString()
  @IsIn(['EGP'])
  currency?: string;
}
