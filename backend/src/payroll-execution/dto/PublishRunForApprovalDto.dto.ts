import { IsMongoId } from 'class-validator';

export class PublishRunForApprovalDto {
  @IsMongoId()
  payrollRunId: string;
}
