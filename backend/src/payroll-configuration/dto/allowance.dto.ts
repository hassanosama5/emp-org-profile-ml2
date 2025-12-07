import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateAllowanceDto {
  @ApiProperty({ description: 'Allowance name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Allowance amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpdateAllowanceDto {
  @ApiProperty({ required: false, description: 'Allowance name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Allowance amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
