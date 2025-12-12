import { IsString, IsNumber } from 'class-validator';

export class AssignPersonalizedLeaveDto {
  @IsString()
  employeeId: string;  

  @IsString()
  leaveTypeId!: string;  

  @IsNumber()
  personalizedEntitlement!: number;  
}
