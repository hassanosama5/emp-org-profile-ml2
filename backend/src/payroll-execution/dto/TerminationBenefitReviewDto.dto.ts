import { IsEnum, IsMongoId } from 'class-validator';
import { BenefitStatus } from '../enums/payroll-execution-enum';

export class TerminationBenefitReviewDto {
  @IsMongoId()
  employeeTerminationResignationId: string; // _id of EmployeeTerminationResignation

  @IsEnum(BenefitStatus)
  status: BenefitStatus; // APPROVED | REJECTED | PENDING | PAID
}
