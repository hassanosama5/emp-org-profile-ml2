import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProfileChangeRequestDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  requestDescription: string;

  @IsOptional()
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
