// src/recruitment/dto/termination-request.dto.ts
import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { TerminationStatus } from '../enums/termination-status.enum';
import { TerminationInitiation } from '../enums/termination-initiation.enum';

export class CreateTerminationRequestDto {
  @IsString()
  employeeId: string; // employeeNumber, e.g. "EMP-001"

  @IsEnum(TerminationInitiation)
  initiator: TerminationInitiation; // 'employee' | 'hr' | 'manager'

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  employeeComments?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  // contractId is still saved in DB as employee._id, but we don't need
  // it in the incoming body anymore -> we will set it in the service.
}

export class UpdateTerminationStatusDto {
  @IsEnum(TerminationStatus)
  status: TerminationStatus;

  @IsOptional()
  @IsString()
  hrComments?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

export class UpdateTerminationDetailsDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  employeeComments?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

// ============================================================================
// NEW CHANGES: DTOs for separate resignation and termination endpoints
// Added to support OFF-018 (Employee Resignation) and OFF-001 (HR Termination)
// These allow ANY employee type to resign, not just DEPARTMENT_EMPLOYEE
// ============================================================================

/**
 * DTO for employee resignation - ANY employee type can resign themselves
 * Used with POST /offboarding/resign
 * No employeeId needed - we get it from the JWT token
 */
export class SubmitResignationDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsDateString()
  requestedLastDay?: string; // When the employee wants their last day to be
}

/**
 * DTO for HR Manager to terminate an employee based on performance
 * Used with POST /offboarding/terminate
 */
export class TerminateEmployeeDto {
  @IsString()
  employeeId: string; // employeeNumber of the employee to terminate, e.g. "EMP-001"

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  hrComments?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}