import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateJobRequisitionDto {
  @IsString() templateId: string; // ObjectId of JobTemplate as string
  @IsNumber() openings: number;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @IsString()
  location?: string;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @IsString()
  hiringManagerId?: string; // ObjectId as string
}
