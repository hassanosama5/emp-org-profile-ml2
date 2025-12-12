import { IsMongoId, IsEnum, IsOptional, IsString } from 'class-validator';
import { SystemRole } from '../enums/employee-profile.enums';

export class AssignSystemRoleDto {
  @IsMongoId()
  employeeProfileId: string;

  @IsEnum(SystemRole, { each: true })
  roles: SystemRole[];

  @IsOptional()
  @IsString({ each: true })
  permissions?: string[];
}
