import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
import { LeaveStatus } from '../enums/leave-status.enum';

export class ViewPastLeaveRequestsDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  toDate?: Date;

  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @IsOptional()
  @IsString()
  leaveTypeId?: string;
}
