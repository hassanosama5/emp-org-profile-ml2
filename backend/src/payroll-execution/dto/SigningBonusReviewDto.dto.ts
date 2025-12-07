import { IsEnum, IsMongoId, IsOptional, IsISO8601 } from 'class-validator';
import { BonusStatus } from '../enums/payroll-execution-enum';

export class SigningBonusReviewDto {
  @IsMongoId()
  employeeSigningBonusId: string; // _id of employeeSigningBonus doc

  @IsEnum(BonusStatus)
  status: BonusStatus; // APPROVED | REJECTED | PENDING | PAID

  @IsOptional()
  @IsISO8601()
  paymentDate?: string; // set when paying
}
