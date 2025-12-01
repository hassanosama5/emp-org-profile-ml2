import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';

export class CreateCompanySettingsDto {
  @ApiProperty({ description: 'Pay date (ISO string)' })
  @IsDateString()
  payDate: Date;

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
  @IsDateString()
  payDate?: Date;

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
