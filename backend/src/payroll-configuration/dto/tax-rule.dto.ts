import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateTaxRuleDto {
  @ApiProperty({ description: 'Tax rule name' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Tax rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Tax rate', minimum: 0 })
  @IsNumber()
  @Min(0)
  rate: number;
}

export class UpdateTaxRuleDto {
  @ApiProperty({ required: false, description: 'Tax rule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Tax rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Tax rate', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;
}
