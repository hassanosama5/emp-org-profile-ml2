import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateSigningBonusDto {
  @ApiProperty({ description: 'Position name eligible for signing bonus' })
  @IsString()
  positionName: string;

  @ApiProperty({ description: 'Signing bonus amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpdateSigningBonusDto {
  @ApiProperty({
    required: false,
    description: 'Position name eligible for signing bonus',
  })
  @IsOptional()
  @IsString()
  positionName?: string;

  @ApiProperty({
    required: false,
    description: 'Signing bonus amount',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
