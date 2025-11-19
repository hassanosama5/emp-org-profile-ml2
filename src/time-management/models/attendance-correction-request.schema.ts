import { Types } from "mongoose";
import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { AttendanceRecord, Punch } from "./attendance-record.schema";
import { HydratedDocument } from "mongoose";

export enum CorrectionRequestStatus{
    SUBMITTED = 'SUBMITTED',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ESCALATED = 'ESCALATED',
}

export type AttendanceCorrectionRequestDocument = HydratedDocument<AttendanceCorrectionRequest>;

@Schema()
export class AttendanceCorrectionRequest{
    @Prop({required: true})
    employeeId: string; // reference employee id in the integration part

    @Prop({type: Types.ObjectId, ref: 'AttendanceRecord', required: true})
    attendanceRecord: AttendanceRecord;

    @Prop()
    reason?: string;

    @Prop({ enum: CorrectionRequestStatus, default: CorrectionRequestStatus.SUBMITTED })
    status: CorrectionRequestStatus;
}

export const AttendanceCorrectionRequestSchema = SchemaFactory.createForClass(AttendanceCorrectionRequest);
