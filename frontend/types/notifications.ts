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
  SHIFT_REASSIGNMENT_CONFIRMATION = 'SHIFT_REASSIGNMENT_CONFIRMATION',
  SHIFT_ARCHIVE_NOTIFICATION = 'SHIFT_ARCHIVE_NOTIFICATION',
  MISSED_PUNCH = 'missed_punch',
  MISSED_PUNCH_EMPLOYEE_ALERT = 'MISSED_PUNCH_EMPLOYEE_ALERT',
  MISSED_PUNCH_MANAGER_ALERT = 'MISSED_PUNCH_MANAGER_ALERT',
  
  // Repeated Lateness Notifications
  REPEATED_LATENESS_FLAGGED = 'REPEATED_LATENESS_FLAGGED',
  
  // Payroll Cut-off Escalation Notifications
  PAYROLL_CUTOFF_ESCALATION_ALERT = 'PAYROLL_CUTOFF_ESCALATION_ALERT',

  // Recruitment Module Notifications - Interview Panel
  INTERVIEW_PANEL_INVITATION = 'INTERVIEW_PANEL_INVITATION',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED',
  INTERVIEW_RESCHEDULED = 'INTERVIEW_RESCHEDULED',

  // Recruitment Module Notifications - Hiring Decision (HR Employee notifications)
  CANDIDATE_HIRED = 'CANDIDATE_HIRED',
  CANDIDATE_REJECTED = 'CANDIDATE_REJECTED',
  CANDIDATE_OFFER_CREATED = 'CANDIDATE_OFFER_CREATED',

  // Recruitment Module Notifications - Offer Flow
  // Sent to candidate when HR Manager creates an offer
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  // Sent to HR when candidate accepts the offer
  OFFER_RESPONSE_ACCEPTED = 'OFFER_RESPONSE_ACCEPTED',
  // Sent to HR when candidate rejects the offer
  OFFER_RESPONSE_REJECTED = 'OFFER_RESPONSE_REJECTED',

  // Recruitment Module Notifications - Candidate notifications
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',

  // Payroll Tracking Module Notifications
  DISPUTE_APPROVED_FOR_FINANCE = 'dispute_approved_for_finance',
  CLAIM_APPROVED_FOR_FINANCE = 'claim_approved_for_finance',
  DISPUTE_APPROVED = 'dispute_approved',
  CLAIM_APPROVED = 'claim_approved',
  DISPUTE_REJECTED = 'dispute_rejected',
  CLAIM_REJECTED = 'claim_rejected',
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
  title?: string; // Optional notification title
  data?: Record<string, any>; // Additional notification data (interview details, etc.)
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

