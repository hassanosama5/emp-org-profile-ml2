import { SchemaFactory, Schema, Prop } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { HydratedDocument } from "mongoose";

export enum ShiftAssignmentStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
}

export type ShiftAssignmentDocument = HydratedDocument<ShiftAssignment>;

@Schema()
export class ShiftAssignment{
    @Prop() // refrence employee id in the integration part
    employeeId?: string;

    @Prop()
    departmentId?: string; // refrence department id in the integration part

    @Prop()
    positionId?: string; // refrence position id in the integration part

    @Prop({type: Types.ObjectId, ref: 'Shift', required: true})
    shiftId: Types.ObjectId;

    @Prop({type: Types.ObjectId, ref: 'ScheduleRule'})
    scheduleRuleId?: Types.ObjectId;

    @Prop({required: true})
    startDate: Date;

    @Prop()
    endDate?: Date; //null means ongoing

    @Prop({enum: ShiftAssignmentStatus, default: ShiftAssignmentStatus.PENDING})
    status: ShiftAssignmentStatus;
}

export const ShiftAssignmentSchema = SchemaFactory.createForClass(ShiftAssignment);
