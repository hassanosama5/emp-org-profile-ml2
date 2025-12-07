import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RatingEntryDto {
  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsNumber()
  ratingValue: number;

  @IsOptional()
  @IsString()
  ratingLabel?: string;

  @IsOptional()
  @IsNumber()
  weightedScore?: number;

  @IsOptional()
  @IsString()
  comments?: string;
}
