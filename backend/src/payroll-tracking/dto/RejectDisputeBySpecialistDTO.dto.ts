import { IsString, IsMongoId, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO for Payroll Specialist to reject disputes
 * REQ-PY-39: Payroll Specialist view, Approve/Reject Disputes
 */
export class RejectDisputeBySpecialistDTO {
  @IsMongoId()
  @IsNotEmpty()
  payrollSpecialistId: string; // Payroll specialist rejecting the dispute

  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Rejection reason must be at least 5 characters long',
  })
  rejectionReason: string; // Reason for rejection (required for transparency)
}