import { IsString, IsOptional, IsEnum, IsDate, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveStatus } from '../enums/leave-status.enum';

export class FilterLeaveHistoryDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  leaveTypeId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @IsOptional()
  @IsString()
  status?: string; // Accept as string, will be normalized in controller/service

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
