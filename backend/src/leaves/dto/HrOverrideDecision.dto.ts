import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class HrOverrideDecisionDto {
  @IsString()
  leaveRequestId: string;

  @IsString()
  hrUserId: string;

  @IsBoolean()
  overrideToApproved: boolean;  //not sure

  @IsOptional()
  @IsString()
  overrideReason?: string;   //not sure
}

