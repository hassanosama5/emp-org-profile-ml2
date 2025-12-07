import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  Min,
} from 'class-validator';

/**
 * DTO for Payroll Specialist to approve expense claims
 * REQ-PY-42: Payroll Specialist view, Approve/Reject Expense claims
 */
export class ApproveClaimBySpecialistDTO {
  @IsMongoId()
  @IsNotEmpty()
  payrollSpecialistId: string; // Payroll specialist approving the claim

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Approved amount must be greater than 0 if provided' })
  approvedAmount?: number; // Optional approved amount (can differ from claimed amount - partial approval)

  @IsOptional()
  @IsString()
  resolutionComment?: string; // Optional comment from specialist explaining the approval
}