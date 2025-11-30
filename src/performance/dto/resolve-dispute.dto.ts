import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppraisalDisputeStatus } from '../enums/performance.enums';

export class ResolveDisputeDto {
  @IsEnum(AppraisalDisputeStatus)
  status: AppraisalDisputeStatus;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}
