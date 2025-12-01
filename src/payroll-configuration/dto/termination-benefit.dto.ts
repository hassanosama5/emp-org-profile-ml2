import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateTerminationBenefitDto {
  @ApiProperty({ description: 'Termination/resignation benefit name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Benefit amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ required: false, description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  terms?: string;
}

export class UpdateTerminationBenefitDto {
  @ApiProperty({
    required: false,
    description: 'Termination/resignation benefit name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Benefit amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ required: false, description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  terms?: string;
}
