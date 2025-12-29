// src/performance/dto/acknowledge-appraisal.dto.ts

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcknowledgeAppraisalDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
