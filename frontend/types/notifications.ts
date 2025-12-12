export enum NotificationType {
  // Leave Module Notifications
  LEAVE_APPROVED = 'leave_approved',
  LEAVE_REJECTED = 'leave_rejected',
  LEAVE_CREATED = 'leave_created',
  LEAVE_MODIFIED = 'leave_modified',
  LEAVE_FINALIZED = 'leave_finalized',
  LEAVE_RETURNED_FOR_CORRECTION = 'leave_returned_for_correction',

  // Time Management Module Notifications
  SHIFT_EXPIRY = 'shift_expiry',
  SHIFT_EXPIRY_ALERT = 'SHIFT_EXPIRY_ALERT',
  SHIFT_EXPIRY_BULK_ALERT = 'SHIFT_EXPIRY_BULK_ALERT',
  SHIFT_RENEWAL_CONFIRMATION = 'SHIFT_RENEWAL_CONFIRMATION',
  SHIFT_ARCHIVE_NOTIFICATION = 'SHIFT_ARCHIVE_NOTIFICATION',
  MISSED_PUNCH = 'missed_punch',
  MISSED_PUNCH_EMPLOYEE_ALERT = 'MISSED_PUNCH_EMPLOYEE_ALERT',
  MISSED_PUNCH_MANAGER_ALERT = 'MISSED_PUNCH_MANAGER_ALERT',
}

export interface Notification {
  _id: string;
  to: string;
  type: NotificationType | string; // Allow both enum values and string types from time-management
  message: string;
  isRead?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  source?: 'unified' | 'time-management'; // Track which module created it
}

export interface CreateNotificationDto {
  to: string;
  type: NotificationType;
  message: string;
}

export interface GetNotificationsResponse {
  data: Notification[];
  total: number;
  unread: number;
}

export interface NotificationFilter {
  type?: NotificationType;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
}

