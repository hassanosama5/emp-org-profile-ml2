import { IsString, IsMongoId, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO for Payroll Specialist to reject expense claims
 * REQ-PY-42: Payroll Specialist view, Approve/Reject Expense claims
 */
export class RejectClaimBySpecialistDTO {
  @IsMongoId()
  @IsNotEmpty()
  payrollSpecialistId: string; // Payroll specialist rejecting the claim

  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Rejection reason must be at least 5 characters long',
  })
  rejectionReason: string; // Reason for rejection (required for transparency)
}