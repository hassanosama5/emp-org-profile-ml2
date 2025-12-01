import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { ConfigStatus } from '../enums/payroll-configuration-enums';

export class FilterDto {
  @ApiProperty({
    required: false,
    enum: ConfigStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(ConfigStatus)
  status?: ConfigStatus;

  @ApiProperty({
    required: false,
    description: 'Filter by creator user ID',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({
    required: false,
    default: 1,
    description: 'Page number',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 10,
    description: 'Items per page',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
