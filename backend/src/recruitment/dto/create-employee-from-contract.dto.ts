import { IsMongoId, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import {
  ContractType,
  WorkType,
  SystemRole,
} from '../../employee-profile/enums/employee-profile.enums';

/**
 * DTO for creating an employee profile from an accepted offer and signed contract
 * Used by HR Manager to convert candidate to employee
 */
export class CreateEmployeeFromContractDto {
  // Note: offerId comes from URL parameter, not body
  // Removed @IsMongoId() offerId: string; - it's passed as URL param in controller

  @IsOptional()
  @IsMongoId()
  contractId?: string;

  @IsOptional()
  @IsString()
  workEmail?: string;

  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

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

  // =============================================================================
  // SYSTEM ROLE ASSIGNMENT FOR NEW EMPLOYEES (RECRUITMENT INTEGRATION)
  // =============================================================================
  // This field allows HR to specify what system role the new employee should have.
  // If not provided, the system will attempt to determine the role automatically
  // based on the job template's title/department (see recruitment.service.ts).
  // 
  // This is crucial for hiring HR staff, payroll staff, etc. - they need the
  // correct role to access their dashboards and perform their job functions.
  //
  // Available roles:
  // - DEPARTMENT_EMPLOYEE (default): Regular employee
  // - DEPARTMENT_HEAD: Department management
  // - HR_MANAGER: Full HR access
  // - HR_EMPLOYEE: HR operations
  // - HR_ADMIN: HR administrative functions
  // - PAYROLL_MANAGER: Payroll management
  // - PAYROLL_SPECIALIST: Payroll operations
  // - SYSTEM_ADMIN: System administration
  // - LEGAL_POLICY_ADMIN: Legal/policy management
  // - RECRUITER: Recruitment operations
  // - FINANCE_STAFF: Finance operations
  // =============================================================================
  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole;
}
