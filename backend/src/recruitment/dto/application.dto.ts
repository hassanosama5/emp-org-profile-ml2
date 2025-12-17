import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApplicationStatus } from '../enums/application-status.enum';

export class CreateApplicationDto {
  @IsString() candidateId: string; // ObjectId of Candidate as string
  @IsString() requisitionId: string; // ObjectId of JobRequisition as string
  @IsOptional() @IsString() assignedHr?: string; // ObjectId of User as string
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus) status: ApplicationStatus; // Must be one of: submitted, in_process, offer, hired, rejected

  // CHANGED - REC-022: Added rejection reason for automated rejection notifications
  @IsOptional()
  @IsString()
  rejectionReason?: string; // Custom rejection message to include in notification email
}
