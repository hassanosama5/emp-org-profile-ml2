import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationStructureController } from './organization-structure.controller';
import { OrganizationStructureService } from './organization-structure.service';
import { Department, DepartmentSchema } from './models/department.schema';
import { Position, PositionSchema } from './models/position.schema';
import {
  PositionAssignment,
  PositionAssignmentSchema,
} from './models/position-assignment.schema';
import {
  StructureApproval,
  StructureApprovalSchema,
} from './models/structure-approval.schema';
import {
  StructureChangeLog,
  StructureChangeLogSchema,
} from './models/structure-change-log.schema';
import {
  StructureChangeRequest,
  StructureChangeRequestSchema,
} from './models/structure-change-request.schema';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';

@Module({
  imports: [
    // Register Department FIRST to ensure it's available for Position hooks
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
    ]),
    // Then register Position which depends on Department
    MongooseModule.forFeature([
      { name: Position.name, schema: PositionSchema },
    ]),
    // Register other models
    MongooseModule.forFeature([
      { name: PositionAssignment.name, schema: PositionAssignmentSchema },
      { name: StructureApproval.name, schema: StructureApprovalSchema },
      { name: StructureChangeLog.name, schema: StructureChangeLogSchema },
      {
        name: StructureChangeRequest.name,
        schema: StructureChangeRequestSchema,
      },
    ]),
    forwardRef(() => EmployeeProfileModule),
  ],
  controllers: [OrganizationStructureController],
  providers: [OrganizationStructureService],
  exports: [OrganizationStructureService, MongooseModule],
})
export class OrganizationStructureModule {}
