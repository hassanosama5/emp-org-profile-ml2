import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ExtendedNotificationDocument = HydratedDocument<ExtendedNotification>;

/**
 * ExtendedNotification Schema
 * 
 * This schema extends the basic NotificationLog from time-management
 * with additional fields needed for the notifications subsystem:
 * - Read/unread status tracking
 * - Additional structured data for frontend
 * - Optional title for better UX
 * - Created by tracking for audit
 * 
 * USAGE:
 * This schema is used by the notifications service to create rich notifications
 * across all subsystems (recruitment, onboarding, offboarding, time-management, etc.)
 * 
 * RELATIONSHIP:
 * - Extends the basic NotificationLog schema from time-management
 * - Uses the same 'to' field (recipient ObjectId)
 * - Uses the same 'type' field (from NotificationType enum)
 * - Uses the same 'message' field
 * - Adds: isRead, data, title, createdBy
 * 
 * IMPORTANT:
 * - Uses 'notificationlogs' collection (same as NotificationLog) to maintain compatibility
 * - This ensures existing notifications are not lost during migration
 */
@Schema({ 
  timestamps: true,
  collection: 'notificationlogs' // Use same collection as NotificationLog for backward compatibility
})
export class ExtendedNotification {
    /**
     * Recipient of the notification (EmployeeProfile._id or Candidate._id)
     */
    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
    to: Types.ObjectId;

    /**
     * Type of notification (from NotificationType enum)
     * Examples: 'SHIFT_EXPIRY_ALERT', 'LEAVE_APPROVED', 'INTERVIEW_SCHEDULED', etc.
     */
    @Prop({ required: true })
    type: string;

    /**
     * Human-readable notification message
     */
    @Prop()
    message?: string;

    /**
     * Read status flag
     * false = Unread (shows as "new" in UI)
     * true = Read (user has viewed/dismissed)
     */
    @Prop({ default: false, index: true })
    isRead?: boolean;

    /**
     * Additional structured data for the notification
     * 
     * Examples:
     * - Interview: { interviewId, candidateName, scheduledDate, videoLink }
     * - Shift Expiry: { assignmentId, employeeId, daysRemaining, urgency }
     * - Leave: { leaveRequestId, fromDate, toDate }
     * - Offboarding: { checklistId, department, terminationDate }
     */
    @Prop({ type: MongooseSchema.Types.Mixed })
    data?: Record<string, any>;

    /**
     * Optional title for the notification
     * A short headline for better UX
     */
    @Prop()
    title?: string;

    /**
     * ID of the user who created/triggered the notification
     * Useful for auditing
     */
    @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
    createdBy?: Types.ObjectId;
}

export const ExtendedNotificationSchema = SchemaFactory.createForClass(ExtendedNotification);

/**
 * Database Indexes for performance optimization
 * 
 * 1. { to: 1, createdAt: -1 } - Fetch user's notifications chronologically
 * 2. { to: 1, isRead: 1 } - Count unread notifications for badge
 * 3. { type: 1, createdAt: -1 } - Filter notifications by type
 */
ExtendedNotificationSchema.index({ to: 1, createdAt: -1 });
ExtendedNotificationSchema.index({ to: 1, isRead: 1 });
ExtendedNotificationSchema.index({ type: 1, createdAt: -1 });
