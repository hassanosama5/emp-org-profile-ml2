import { IsString, IsBoolean } from 'class-validator';

export class HrOverrideDecisionDto {
  @IsString()
  leaveRequestId: string;

  @IsString()
  hrUserId: string;

  @IsBoolean()
  overrideToApproved: boolean;

  @IsString()
  overrideReason: string;  // Required but no character limit
}

