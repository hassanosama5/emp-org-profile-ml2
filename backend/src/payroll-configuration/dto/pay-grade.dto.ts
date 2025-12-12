import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Validate, IsOptional } from 'class-validator';

export class CreatePayGradeDto {
  @ApiProperty({ description: 'Pay grade level' })
  @IsString()
  grade: string;

  @ApiProperty({ description: 'Base salary amount', minimum: 6000 })
  @IsNumber()
  @Min(6000)
  baseSalary: number;

  @ApiProperty({ description: 'Gross salary amount', minimum: 6000 })
  @IsNumber()
  @Min(6000)
  grossSalary: number;
}

export class UpdatePayGradeDto {
  @ApiProperty({ required: false, description: 'Pay grade level' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({
    required: false,
    description: 'Base salary amount',
    minimum: 6000,
  })
  @IsOptional()
  @IsNumber()
  @Min(6000)
  baseSalary?: number;

  @ApiProperty({
    required: false,
    description: 'Gross salary amount',
    minimum: 6000,
  })
  @IsOptional()
  @IsNumber()
  @Min(6000)
  grossSalary?: number;
}
