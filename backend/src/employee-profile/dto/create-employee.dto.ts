import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDate,
  IsMongoId,
  ValidateNested,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Gender,
  MaritalStatus,
  ContractType,
  WorkType,
  EmployeeStatus,
  SystemRole,
} from '../enums/employee-profile.enums';

class AddressDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsString()
  @Matches(/^[0-9]{14}$/, { message: 'National ID must be 14 digits' })
  nationalId: string;

  // ONB-004/ONB-005: HR Manager can specify employee number, or it will be auto-generated
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,15}$/)
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @Type(() => Date)
  @IsDate()
  dateOfHire: Date;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  candidateId?: string; // Add this field

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractStartDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractEndDate?: Date;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsMongoId()
  primaryPositionId?: string;

  @IsOptional()
  @IsMongoId()
  primaryDepartmentId?: string;

  @IsOptional()
  @IsMongoId()
  supervisorPositionId?: string;

  @IsOptional()
  @IsMongoId()
  payGradeId?: string;

  // =============================================================================
  // SYSTEM ROLE ASSIGNMENT FOR NEW EMPLOYEES
  // =============================================================================
  // This field allows specifying the system role during employee creation.
  // Used by recruitment when creating employees from hired candidates.
  // The role determines what dashboards and features the employee can access:
  // - HR_MANAGER: Full HR access, can manage all HR operations
  // - HR_EMPLOYEE: HR operations, limited management capabilities
  // - HR_ADMIN: HR administrative functions
  // - PAYROLL_MANAGER: Full payroll management access
  // - PAYROLL_SPECIALIST: Payroll operations
  // - SYSTEM_ADMIN: Full system administration
  // - LEGAL_POLICY_ADMIN: Legal and policy management
  // - RECRUITER: Recruitment operations
  // - FINANCE_STAFF: Finance operations
  // - DEPARTMENT_HEAD: Department management and team oversight
  // - DEPARTMENT_EMPLOYEE: Default role for regular employees
  // If not provided, defaults to DEPARTMENT_EMPLOYEE in the service.
  // =============================================================================
  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole;
}
