import { IsString, IsOptional, IsEnum, IsDateString, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveStatus } from '../enums/leave-status.enum';

export class FilterTeamLeaveDataDto {
  @IsString()
  managerId: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  leaveTypeId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

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
  @IsIn(['asc', 'desc'])
  sortByDepartment?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;
}
