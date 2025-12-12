import { IsMongoId, IsOptional, IsNumber, Min } from 'class-validator';

export class TerminationBenefitEditDto {
  @IsMongoId()
  employeeTerminationResignationId: string;

  @IsOptional()
  @IsMongoId()
  benefitId?: string; // switch to a different configured benefit

  @IsOptional()
  @IsMongoId()
  terminationId?: string; // relink to a termination request if needed

  @IsOptional()
  @IsNumber()
  @Min(0)
  givenAmount?: number; // for manually editing the benefit amount given to this employee
}
