import { IsString, IsDate } from 'class-validator';

export class DelegateApprovalDto {
  @IsString()
  delegateId: string;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;
}

