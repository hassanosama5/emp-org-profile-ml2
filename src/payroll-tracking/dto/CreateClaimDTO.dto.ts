import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
} from 'class-validator';

export class CreateClaimDTO {
  @IsString()
  description: string; // Description of the claim

  @IsString()
  claimType: string; // For example: medical, overtime, etc.

  @IsMongoId()
  @IsNotEmpty()
  employeeId: string; // Reference to EmployeeProfile - Employee submitting the claim

  @IsNumber()
  amount: number; // The claimed amount

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string; // Finance staff assigned to handle the claim (optional, usually assigned during review)
}