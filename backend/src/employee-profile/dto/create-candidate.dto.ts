import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDate,
  IsMongoId,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Gender } from '../enums/employee-profile.enums';

export class CreateCandidateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsString()
  @Matches(/^[0-9]{14}$/, { message: 'National ID must be 14 digits' })
  nationalId: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,15}$/)
  mobilePhone?: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsMongoId()
  positionId?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCandidateDto extends PartialType(
  OmitType(CreateCandidateDto, ['nationalId'] as const),
) {}
