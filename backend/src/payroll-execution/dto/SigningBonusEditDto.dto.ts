import {
  IsMongoId,
  IsOptional,
  IsEnum,
  IsISO8601,
  IsNumber,
  Min,
} from 'class-validator';
import { BonusStatus } from '../enums/payroll-execution-enum';

export class SigningBonusEditDto {
  @IsMongoId()
  employeeSigningBonusId: string;

  @IsOptional()
  @IsMongoId()
  signingBonusId?: string; // switch to a different configured signingBonus

  @IsOptional()
  @IsEnum(BonusStatus)
  status?: BonusStatus;

  @IsOptional()
  @IsISO8601()
  paymentDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  givenAmount?: number; // for manually editing the signing bonus amount given to this employee
}
