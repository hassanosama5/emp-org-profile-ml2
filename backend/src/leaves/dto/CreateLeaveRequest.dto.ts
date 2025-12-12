import { IsString,IsNumber, IsArray, IsOptional, IsDate, IsObject } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  employeeId: string;  

  @IsString()
  leaveTypeId!: string;  

  @IsObject()
  dates: { from: Date; to: Date };

  @IsNumber()
  durationDays: number;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;

  @IsOptional()
  @IsArray()
  approvalFlow?: { role: string; status: string; decidedBy?: string; decidedAt?: Date }[];

//@IsOptional()
  //@IsString()
  //status?: string;  //hashoof mawdoo3 el status da b3dein 

}
