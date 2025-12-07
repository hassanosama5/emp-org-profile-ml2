import { IsString, IsOptional, IsEnum, IsDate, IsIn, IsNumber } from 'class-validator';
import { LeaveStatus } from '../enums/leave-status.enum';

export class FilterLeaveHistoryDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  leaveTypeId?: string;

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
  @IsIn(['asc', 'desc'])
  sortByDate?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortByStatus?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}
