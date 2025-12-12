import { IsString, IsOptional, IsDate } from 'class-validator';

export class ViewTeamLeaveBalancesDto {
  @IsString()
  managerId: string;

  @IsOptional()
  @IsDate()
  upcomingFromDate?: Date;

  @IsOptional()
  @IsDate()
  upcomingToDate?: Date;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
