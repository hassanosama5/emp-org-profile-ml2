import { IsArray, IsString, IsBoolean } from 'class-validator';

export class ProcessMultipleRequestsDto {
  @IsArray()
  @IsString({ each: true })
  leaveRequestIds: string[];

  @IsString()
  hrUserId: string;

  @IsBoolean()
  approved: boolean;
}

