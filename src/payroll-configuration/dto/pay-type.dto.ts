import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePayTypeDto {
  @ApiProperty({ description: 'Pay type name' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Pay type amount', minimum: 6000 })
  @IsNumber()
  @Min(6000)
  amount: number;
}

export class UpdatePayTypeDto {
  @ApiProperty({ required: false, description: 'Pay type name' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    required: false,
    description: 'Pay type amount',
    minimum: 6000,
  })
  @IsOptional()
  @IsNumber()
  @Min(6000)
  amount?: number;
}
