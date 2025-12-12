import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProfileChangeRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  requestDescription: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ProcessProfileChangeRequestDto {
  @IsEnum(['APPROVED', 'REJECTED', 'CANCELED'])
  status: 'APPROVED' | 'REJECTED' | 'CANCELED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
