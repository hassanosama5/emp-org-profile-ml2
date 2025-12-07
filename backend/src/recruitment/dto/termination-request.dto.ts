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
