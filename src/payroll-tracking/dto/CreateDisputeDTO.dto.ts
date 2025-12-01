import { IsString, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateDisputeDTO {
  @IsString()
  description: string; // Description of the dispute

  @IsMongoId()
  @IsNotEmpty()
  employeeId: string; // Employee who raised the dispute

  @IsMongoId()
  @IsNotEmpty()
  payslipId: string; // The payslip related to the dispute (REQ-PY-16: dispute by selecting payslip)
}