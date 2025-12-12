import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsEnum,
  Validate,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { OfferResponseStatus } from '../enums/offer-response-status.enum';
import { OfferFinalStatus } from '../enums/offer-final-status.enum';

@ValidatorConstraint({ name: 'isValidISODate', async: false })
export class IsValidISODateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Check if it's a valid ISO 8601 date that can be parsed
    const date = new Date(value);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value);
  }

  defaultMessage() {
    return 'deadline must be a valid ISO 8601 date string';
  }
}

export class CreateOfferDto {
  @IsString() applicationId: string; // ObjectId as string
  @IsString() candidateId: string; // ObjectId as string
  @IsNumber() grossSalary: number;
  @IsOptional() @IsNumber() signingBonus?: number;
  @IsOptional() @IsArray() benefits?: string[];
  @IsOptional() @IsString() conditions?: string;
  @IsOptional() @IsString() insurances?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() role?: string;
  @Validate(IsValidISODateConstraint) deadline: string; // ISO 8601 date string
}

export class RespondToOfferDto {
  @IsEnum(OfferResponseStatus) applicantResponse: OfferResponseStatus; // Must be one of: accepted, rejected, pending
}

export class FinalizeOfferDto {
  @IsEnum(OfferFinalStatus) finalStatus: OfferFinalStatus; // Must be one of: approved, rejected, pending
}
