import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsISO8601,
  IsString,
} from 'class-validator';

export class FinanceDecisionDto {
  @IsMongoId()
  payrollRunId: string;

  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsMongoId()
  financeStaffId?: string;

  @IsOptional()
  @IsISO8601()
  decisionDate?: string; // to set financeApprovalDate
}
