import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

/**
 * NotificationLog Schema
 * 
 * This schema stores all in-app notifications for the HR system.
 * Notifications are displayed in the notification bell/center in the frontend.
 * 
 * SUPPORTED MODULES:
 * - Time Management: Shift expiry, missed punch alerts
 * - Leave Management: Leave approvals, rejections, modifications
 * - Recruitment: Interview scheduling, hiring/rejection decisions
 * 
 * RECIPIENT TYPES:
 * The 'to' field can store either:
 * - Employee ID (ObjectId from EmployeeProfile)
 * - Candidate ID (ObjectId from Candidate)
 * This allows notifications to be sent to both employees and job candidates.
 * 
 * PERSISTENCE:
 * Notifications persist across login sessions (stored in MongoDB).
 * They remain unread until explicitly marked as read by the user.
 * The isRead flag determines if the notification appears as "new" in the UI.
 * 
 * INDEXES:
 * - { to: 1, createdAt: -1 } - For fetching user's notifications in chronological order
 * - { to: 1, isRead: 1 } - For counting unread notifications
 */
@Schema({ timestamps: true })
export class NotificationLog {
    /**
     * Recipient of the notification
     * 
     * Can be either:
     * - EmployeeProfile._id (for employees, HR staff, managers)
     * - Candidate._id (for job candidates/applicants)
     * 
     * Note: We don't use `ref` here because the reference can be to different collections.
     * The notification service handles resolving the recipient based on context.
     */
    @Prop({ type: Types.ObjectId, required: true, index: true })
    to: Types.ObjectId;

    /**
     * Type of notification (from NotificationType enum)
     * 
     * RECRUITMENT SUBSYSTEM TYPES:
     * - 'INTERVIEW_PANEL_INVITATION' - Panel member assigned to interview
     * - 'INTERVIEW_SCHEDULED' - Candidate's interview scheduled
     * - 'INTERVIEW_CANCELLED' - Interview was cancelled
     * - 'INTERVIEW_RESCHEDULED' - Interview date changed
     * - 'CANDIDATE_HIRED' - HR Employee notified of hire
     * - 'CANDIDATE_REJECTED' - HR Employee notified of rejection
     * - 'APPLICATION_ACCEPTED' - Candidate notified of acceptance
     * - 'APPLICATION_REJECTED' - Candidate notified of rejection
     * 
     * TIME MANAGEMENT TYPES:
     * - 'SHIFT_EXPIRY_ALERT' - Shift expiring soon
     * - 'MISSED_PUNCH_EMPLOYEE_ALERT' - Employee missed punch
     * - 'MISSED_PUNCH_MANAGER_ALERT' - Manager notified of missed punch
     * 
     * LEAVE TYPES:
     * - 'leave_approved', 'leave_rejected', 'leave_created', etc.
     */
    @Prop({ required: true })
    type: string;

    /**
     * Human-readable notification message
     * 
     * This is the main text displayed in the notification.
     * For recruitment notifications, typically includes:
     * - Candidate/position names
     * - Date/time information
     * - Next steps or action items
     */
    @Prop()
    message?: string;

    /**
     * Read status flag
     * 
     * false = Unread (shows as "new" in UI, counted in badge)
     * true = Read (user has viewed/dismissed this notification)
     * 
     * Marked as read via PATCH /notifications/:id/read endpoint
     */
    @Prop({ default: false })
    isRead?: boolean;

    /**
     * Additional structured data for the notification
     * 
     * Stores extra information that the frontend can use for:
     * - Linking to relevant pages (applicationId, interviewId, etc.)
     * - Displaying additional context
     * - Actions the user can take
     * 
     * RECRUITMENT DATA EXAMPLES:
     * For INTERVIEW_PANEL_INVITATION:
     * {
     *   interviewId: '...',
     *   candidateName: 'John Doe',
     *   positionTitle: 'Software Engineer',
     *   scheduledDate: '2024-01-15T10:00:00.000Z',
     *   method: 'video',
     *   videoLink: 'https://meet.google.com/...',
     *   stage: 'department_interview'
     * }
     * 
     * For CANDIDATE_HIRED / CANDIDATE_REJECTED:
     * {
     *   candidateName: 'John Doe',
     *   candidateId: '...',
     *   positionTitle: 'Software Engineer',
     *   applicationId: '...',
     *   action: 'HIRED' | 'REJECTED'
     * }
     */
    @Prop({ type: MongooseSchema.Types.Mixed })
    data?: Record<string, any>;

    /**
     * Optional title for the notification
     * 
     * A short headline for the notification.
     * If not provided, the frontend generates a title from the type.
     */
    @Prop()
    title?: string;

    /**
     * ID of the user who created/triggered the notification
     * 
     * Useful for auditing and determining the source.
     * For recruitment: Usually the HR Employee or HR Manager who took action.
     */
    @Prop({ type: Types.ObjectId })
    createdBy?: Types.ObjectId;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

/**
 * Database Indexes
 * 
 * These indexes optimize the most common queries:
 * 
 * 1. { to: 1, createdAt: -1 }
 *    - Used by: getNotifications(userId) 
 *    - Purpose: Fetch user's notifications in newest-first order
 *    - Query: db.notificationlogs.find({ to: userId }).sort({ createdAt: -1 })
 * 
 * 2. { to: 1, isRead: 1 }
 *    - Used by: getUnreadCount(userId)
 *    - Purpose: Count unread notifications for badge display
 *    - Query: db.notificationlogs.countDocuments({ to: userId, isRead: false })
 */
NotificationLogSchema.index({ to: 1, createdAt: -1 });
NotificationLogSchema.index({ to: 1, isRead: 1 });
