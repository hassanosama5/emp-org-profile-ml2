import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

@Schema({ timestamps: true })
export class NotificationLog {
    @Prop({required: true})
    to: string; // reference employee id in the integration part

    @Prop({ required: true })
    type: string;

    @Prop()
    message?: string;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
