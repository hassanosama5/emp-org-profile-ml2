import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateJobTemplateDto {
  @IsString() title: string;
  @IsString() department: string;
  @IsOptional() @IsArray() qualifications?: string[];
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsString() description?: string;
}

export class UpdateJobTemplateDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsArray() qualifications?: string[];
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsString() description?: string;
}
