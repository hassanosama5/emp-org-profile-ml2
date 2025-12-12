import { IsString } from 'class-validator';

export class FinalizeLeaveRequestDto {
  @IsString()
  leaveRequestId: string;
}

