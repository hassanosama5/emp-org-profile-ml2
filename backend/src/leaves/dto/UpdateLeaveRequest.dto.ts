import { IsString,IsNumber, IsOptional, IsDate, IsObject, IsArray } from 'class-validator';

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsString()
  leaveTypeId?: string;

  @IsOptional()
  @IsObject()
  dates?: { from: Date; to: Date };

  @IsOptional()
  @IsNumber()
  durationDays?: number;

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
