import { IsArray, IsMongoId, IsOptional, IsDateString, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CycleAssignmentDto } from './cycle-assignment.dto';

export class BulkAssignmentDto {
  @IsMongoId()
  cycleId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CycleAssignmentDto)
  assignments: CycleAssignmentDto[];
}
