import { IsOptional, IsString } from 'class-validator';

export class SubmitDisputeDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}
