import { IsString, IsDate } from 'class-validator';

export class DelegateApprovalDto {
  @IsString()
  managerId: string;

  @IsString()
  delegateId: string;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;
}
