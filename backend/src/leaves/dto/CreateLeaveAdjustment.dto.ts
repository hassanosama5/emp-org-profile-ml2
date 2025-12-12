import { IsString, IsNumber, IsEnum } from 'class-validator';
import { AdjustmentType } from '../enums/adjustment-type.enum';  

export class CreateLeaveAdjustmentDto {
  @IsString()
  employeeId: string;  

  @IsString()
  leaveTypeId: string;  
  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;  
  @IsNumber()
  amount: number;  

  @IsString()
  reason: string;  
  @IsString()
  hrUserId: string;  
}
