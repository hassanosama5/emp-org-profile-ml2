import { Schema, SchemaFactory, Prop } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { HydratedDocument } from "mongoose";

export enum PunchType{
    IN = 'IN',
    OUT = 'OUT',
}

export type Punch = {
    type: PunchType;
    time: Date;
}

export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord>;

@Schema()
export class AttendanceRecord{
    @Prop({required: true})
    employeeId: string; // refrence employee id in the integration part

    @Prop({default: []})
    punches: Punch[];

    @Prop({ default: 0 }) // to be computed after creating an instance
    totalWorkMinutes: number;

    @Prop({ default: false }) // to be computed after creating an instance
    hasMissedPunch: boolean;

    @Prop({ type: Types.ObjectId, ref: 'TimeException', default: [] })
    exceptionIds: Types.ObjectId[];

    @Prop({ default: true }) // should be set to false when there is an attendance correction request that is not yet resolved
    finalisedForPayroll: boolean;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
