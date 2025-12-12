import { IsString, IsOptional } from 'class-validator';

export class ViewLeaveBalanceDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  leaveTypeId?: string;
}
