import { IsString, IsOptional, IsDate } from 'class-validator';

export class FlagIrregularPatternDto {
  @IsString()
  leaveRequestId: string;

  @IsString()
  managerId: string;

  @IsString()
  flagReason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class IrregularPatternAnalysisDto {
  @IsString()
  managerId: string;

  @IsOptional()
  @IsDate()
  analysisFromDate?: Date;

  @IsOptional()
  @IsDate()
  analysisToDate?: Date;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
