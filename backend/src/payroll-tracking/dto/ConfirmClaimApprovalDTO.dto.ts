import { IsString, IsOptional, IsMongoId, IsNotEmpty } from 'class-validator';

/**
 * DTO for Payroll Manager to confirm expense claim approval
 * REQ-PY-43: Payroll manager confirm Expense claims Approval
 */
export class ConfirmClaimApprovalDTO {
  @IsMongoId()
  @IsNotEmpty()
  payrollManagerId: string; // Payroll manager confirming the approval

  @IsOptional()
  @IsString()
  resolutionComment?: string; // Optional comment from manager confirming the approval
}