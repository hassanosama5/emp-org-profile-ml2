import { IsNumber, IsArray, IsOptional, ValidateNested, IsISO8601, IsString } from 'class-validator';
import { Type } from 'class-transformer';


class BlockedPeriodDto {
  @IsISO8601()
  from: string;

  @IsISO8601()
  to: string;

  @IsOptional()
  reason?: string;
}

class HolidayDto {
  @IsString()
  name: string;

  @IsISO8601()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCalendarDto {
  @IsNumber()
  year: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedPeriodDto)
  blockedPeriods?: BlockedPeriodDto[];
}
