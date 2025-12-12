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