import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { AttachmentType } from '../enums/attachment-type.enum';  
export class UpdateLeaveTypeDto {
  @IsOptional()
  @IsString()
  code?: string;  
  @IsOptional()
  @IsString()
  name?: string;  

  @IsOptional()
  @IsString()
  categoryId?: string;  
  @IsOptional()
  @IsString()
  description?: string;  

  @IsOptional()
  @IsBoolean()
  paid?: boolean;  

  @IsOptional()
  @IsBoolean()
  deductible?: boolean;  

  @IsOptional()
  @IsBoolean()
  requiresAttachment?: boolean;  

  @IsOptional()
  @IsEnum(AttachmentType)
  attachmentType?: AttachmentType;  
}
