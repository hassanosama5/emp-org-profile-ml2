import {
  IsMongoId,
  IsEnum,
  IsOptional,
  IsString,
  IsISO8601,
} from 'class-validator';
import { PayRollStatus } from '../enums/payroll-execution-enum';

export class ManagerApprovalReviewDto {
  @IsMongoId()
  payrollRunId: string; // The payroll run being reviewed

  @IsEnum(PayRollStatus)
  status: PayRollStatus; // Status of the payroll run (e.g., DRAFT, UNDER_REVIEW)

  @IsOptional()
  @IsString()
  managerComments?: string; // Optional comments from the manager

  @IsOptional()
  @IsEnum(PayRollStatus)
  managerDecision?: PayRollStatus; // Decision by the manager (approve/reject)

  @IsOptional()
  @IsMongoId()
  payrollManagerId?: string; // Optional: Update manager assignment during approval

  @IsOptional()
  @IsISO8601()
  managerApprovalDate?: string; // Optional: Set manager approval date (defaults to current date if not provided)
}
