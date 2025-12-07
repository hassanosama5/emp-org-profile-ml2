import { IsMongoId, IsOptional, IsString, IsEnum } from 'class-validator';
import {
  ContractType,
  WorkType,
} from '../../employee-profile/enums/employee-profile.enums';

/**
 * DTO for creating an employee profile from an accepted offer and signed contract
 * Used by HR Manager to convert candidate to employee
 */
export class CreateEmployeeFromContractDto {
  @IsMongoId()
  offerId: string;

  @IsOptional()
  @IsMongoId()
  contractId?: string;

  @IsOptional()
  @IsString()
  workEmail?: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @IsOptional()
  @IsMongoId()
  primaryDepartmentId?: string;

  @IsOptional()
  @IsMongoId()
  supervisorPositionId?: string;

  @IsOptional()
  @IsMongoId()
  payGradeId?: string;
}
