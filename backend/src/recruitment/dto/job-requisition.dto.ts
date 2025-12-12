import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateJobRequisitionDto {
  @IsString() templateId: string; // ObjectId of JobTemplate as string
  @IsNumber() openings: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() hiringManagerId?: string; // ObjectId as string
}
