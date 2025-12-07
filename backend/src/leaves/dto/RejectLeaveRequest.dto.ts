// reject-leave-request.dto.ts
import { IsString, IsEnum } from 'class-validator';
import { LeaveStatus } from '../enums/leave-status.enum';

export class RejectLeaveRequestDto {
  @IsString()
  leaveRequestId: string; // Leave Request ID

  @IsEnum(LeaveStatus)
  status: LeaveStatus;  // REJECTED
}
