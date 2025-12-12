import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsISO8601,
  IsString,
} from 'class-validator';

export const ALLOWED_HR_EVENTS = [
  'normal',
  'new_hire',
  'resignation',
  'termination',
  'probation_end',
] as const;
export type HREventType = (typeof ALLOWED_HR_EVENTS)[number];

export class HrChecksDto {
  @IsMongoId()
  employeeId: string;

  @IsIn(ALLOWED_HR_EVENTS as unknown as string[])
  eventType: HREventType;

  @IsISO8601()
  eventDate: string;

  @IsOptional()
  @IsString()
  eventDescription?: string;
}
