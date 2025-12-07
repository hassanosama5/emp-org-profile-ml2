import { IsString, IsOptional, IsMongoId, IsNotEmpty } from 'class-validator';

/**
 * DTO for Payroll Manager to confirm dispute approval
 * REQ-PY-40: Payroll manager confirm on Dispute Approval
 */
export class ConfirmDisputeApprovalDTO {
  @IsMongoId()
  @IsNotEmpty()
  payrollManagerId: string; // Payroll manager confirming the approval

  @IsOptional()
  @IsString()
  resolutionComment?: string; // Optional comment from manager confirming the approval
}