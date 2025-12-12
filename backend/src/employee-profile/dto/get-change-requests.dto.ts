// src/employee-profile/dto/get-change-requests.dto.ts
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetChangeRequestsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  status?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : parseInt(value)))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : parseInt(value)))
  limit?: number;
}
