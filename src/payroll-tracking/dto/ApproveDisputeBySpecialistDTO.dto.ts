import { IsString, IsOptional, IsMongoId, IsNotEmpty } from 'class-validator';

/**
 * DTO for Payroll Specialist to approve disputes
 * REQ-PY-39: Payroll Specialist view, Approve/Reject Disputes
 */
export class ApproveDisputeBySpecialistDTO {
  @IsMongoId()
  @IsNotEmpty()
  payrollSpecialistId: string; // Payroll specialist approving the dispute

  @IsOptional()
  @IsString()
  resolutionComment?: string; // Optional comment from specialist explaining the approval decision
}