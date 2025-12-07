import {
  IsMongoId,
} from 'class-validator';

export class SendForApprovalDto {
  @IsMongoId()
  payrollRunId: string; // MongoDB ObjectId

  @IsMongoId()
  managerId: string; // MongoDB ObjectId of Payroll Manager

  @IsMongoId()
  financeStaffId: string; // MongoDB ObjectId of Finance Staff
}

