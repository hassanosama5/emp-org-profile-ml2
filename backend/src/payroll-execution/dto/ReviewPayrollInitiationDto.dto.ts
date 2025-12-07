import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReviewPayrollInitiationDto {
  @IsBoolean()
  approved: boolean; // true to approve, false to reject

  @IsMongoId()
  reviewerId: string; // MongoDB ObjectId of the reviewer

  @IsOptional()
  @IsString()
  rejectionReason?: string; // Required if approved is false
}

