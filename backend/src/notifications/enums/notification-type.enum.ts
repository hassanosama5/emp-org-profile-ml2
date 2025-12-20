/**
 * NotificationType Enum
 *
 * Defines all notification types used across the HR system.
 * Each type corresponds to a specific event that triggers a notification.
 *
 * Notifications are stored in the NotificationLog collection and displayed
 * in the user's notification bell/center in the frontend.
 */
export enum NotificationType {
  // =============================================================================
  // LEAVE MODULE NOTIFICATIONS
  // =============================================================================
  // Sent to employees and managers regarding leave requests

  LEAVE_APPROVED = 'leave_approved', // Employee: Your leave was approved
  LEAVE_REJECTED = 'leave_rejected', // Employee: Your leave was rejected
  LEAVE_CREATED = 'leave_created', // Manager: New leave request to review
  LEAVE_MODIFIED = 'leave_modified', // Employee: Your leave was modified
  LEAVE_FINALIZED = 'leave_finalized', // All parties: Leave request finalized
  LEAVE_RETURNED_FOR_CORRECTION = 'leave_returned_for_correction', // Employee: Fix and resubmit

  // ===== RECRUITMENT SUBSYSTEM =====
  // Interview, hiring, and application notifications
  INTERVIEW_PANEL_INVITATION = 'INTERVIEW_PANEL_INVITATION',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED',
  INTERVIEW_RESCHEDULED = 'INTERVIEW_RESCHEDULED',
  INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',
  FEEDBACK_READY_FOR_REVIEW = 'FEEDBACK_READY_FOR_REVIEW',
  CANDIDATE_HIRED = 'CANDIDATE_HIRED',
  CANDIDATE_REJECTED = 'CANDIDATE_REJECTED',
  CANDIDATE_OFFER_CREATED = 'CANDIDATE_OFFER_CREATED',
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  OFFER_RESPONSE_ACCEPTED = 'OFFER_RESPONSE_ACCEPTED',
  OFFER_RESPONSE_REJECTED = 'OFFER_RESPONSE_REJECTED',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  NEW_APPLICATION_RECEIVED = 'NEW_APPLICATION_RECEIVED',

  // =============================================================================
  // ONBOARDING → PAYROLL INTEGRATION NOTIFICATIONS (ONB-018, ONB-019)
  // =============================================================================
  // Notifications sent to Payroll team when new hires are ready for payroll
  NEW_HIRE_PAYROLL_READY = 'NEW_HIRE_PAYROLL_READY',
  SIGNING_BONUS_PENDING_REVIEW = 'SIGNING_BONUS_PENDING_REVIEW',
  ONBOARDING_PAYROLL_TASK_COMPLETED = 'ONBOARDING_PAYROLL_TASK_COMPLETED',

  // =============================================================================
  // ONBOARDING NOTIFICATIONS (ONB-004, ONB-005)
  // =============================================================================
  // Notifications for the onboarding workflow
  ONBOARDING_WELCOME = 'ONBOARDING_WELCOME',
  ONBOARDING_TASK_REMINDER = 'ONBOARDING_TASK_REMINDER',
  ONBOARDING_COMPLETED = 'ONBOARDING_COMPLETED',
  ONBOARDING_DOCUMENT_UPLOADED = 'ONBOARDING_DOCUMENT_UPLOADED',
  ONBOARDING_ACCESS_PROVISIONED = 'ONBOARDING_ACCESS_PROVISIONED',
  ONBOARDING_EQUIPMENT_RESERVED = 'ONBOARDING_EQUIPMENT_RESERVED',

  // =============================================================================
  // OFFBOARDING NOTIFICATIONS (OFF-001 to OFF-019)
  // =============================================================================
  // Notifications for the offboarding/separation workflow
  RESIGNATION_SUBMITTED = 'RESIGNATION_SUBMITTED',
  RESIGNATION_STATUS_UPDATED = 'RESIGNATION_STATUS_UPDATED',
  TERMINATION_INITIATED = 'TERMINATION_INITIATED',
  TERMINATION_APPROVED = 'TERMINATION_APPROVED',
  CLEARANCE_CHECKLIST_CREATED = 'CLEARANCE_CHECKLIST_CREATED',
  CLEARANCE_SIGN_OFF_NEEDED = 'CLEARANCE_SIGN_OFF_NEEDED',
  CLEARANCE_ITEM_UPDATED = 'CLEARANCE_ITEM_UPDATED',
  CLEARANCE_ALL_APPROVED = 'CLEARANCE_ALL_APPROVED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',
  FINAL_SETTLEMENT_TRIGGERED = 'FINAL_SETTLEMENT_TRIGGERED',
  FINAL_SETTLEMENT_COMPLETED = 'FINAL_SETTLEMENT_COMPLETED',

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
  MISSED_PUNCH_PAYROLL_ALERT = 'MISSED_PUNCH_PAYROLL_ALERT',

  // Repeated Lateness Disciplinary Notifications
  REPEATED_LATENESS_FLAGGED = 'REPEATED_LATENESS_FLAGGED',
  REPEATED_LATENESS_ESCALATED = 'REPEATED_LATENESS_ESCALATED',

  // Payroll Cut-off Escalation Notifications (US18)
  PAYROLL_CUTOFF_ESCALATION_ALERT = 'PAYROLL_CUTOFF_ESCALATION_ALERT',

  // Employee Profile Module Notifications
  PROFILE_CHANGE_REQUEST_SUBMITTED = 'profile_change_request_submitted',
  PROFILE_CHANGE_APPROVED = 'profile_change_approved',
  PROFILE_CHANGE_REJECTED = 'profile_change_rejected',
  PROFILE_UPDATED = 'profile_updated',

  // Organization Structure Module Notifications
  STRUCTURE_CHANGE_REQUEST_SUBMITTED = 'structure_change_request_submitted',
  STRUCTURE_CHANGE_REQUEST_APPROVED = 'structure_change_request_approved',
  STRUCTURE_CHANGE_REQUEST_REJECTED = 'structure_change_request_rejected',

  // =============================================================================
  // PERFORMANCE MODULE NOTIFICATIONS (N-022)
  // =============================================================================
  // Notifications for performance appraisal workflow
  APPRAISAL_ASSIGNED = 'appraisal_assigned', // Manager: New appraisal form assigned to you
  APPRAISAL_PUBLISHED = 'appraisal_published', // Employee: Your appraisal has been published
  APPRAISAL_SUBMITTED = 'appraisal_submitted', // HR: Manager submitted an appraisal for review
  APPRAISAL_DISPUTE_SUBMITTED = 'appraisal_dispute_submitted', // HR: Employee submitted a dispute
  APPRAISAL_DISPUTE_RESOLVED = 'appraisal_dispute_resolved', // Employee: Your dispute has been resolved

  // Payroll Tracking Module Notifications
  DISPUTE_APPROVED_FOR_FINANCE = 'dispute_approved_for_finance',
  CLAIM_APPROVED_FOR_FINANCE = 'claim_approved_for_finance',
  DISPUTE_APPROVED = 'dispute_approved',
  CLAIM_APPROVED = 'claim_approved',
  DISPUTE_REJECTED = 'dispute_rejected',
  CLAIM_REJECTED = 'claim_rejected',

  // =============================================================================
  // PAYROLL EXECUTION MODULE NOTIFICATIONS
  // =============================================================================
  PAYROLL_INITIATION_CREATED = 'payroll_initiation_created',
  PAYROLL_INITIATION_APPROVED = 'payroll_initiation_approved',
  PAYROLL_INITIATION_REJECTED = 'payroll_initiation_rejected',
  PAYROLL_SENT_FOR_APPROVAL = 'payroll_sent_for_approval',
  PAYROLL_MANAGER_APPROVED = 'payroll_manager_approved',
  PAYROLL_MANAGER_REJECTED = 'payroll_manager_rejected',
  PAYROLL_FINANCE_APPROVED = 'payroll_finance_approved',
  PAYROLL_FINANCE_REJECTED = 'payroll_finance_rejected',
  PAYROLL_LOCKED = 'payroll_locked',
  PAYROLL_UNLOCKED = 'payroll_unlocked',
  PAYROLL_PAYSLIPS_GENERATED = 'payroll_payslips_generated',
  PAYROLL_IRREGULARITY_FLAGGED = 'payroll_irregularity_flagged',
  PAYROLL_IRREGULARITY_RESOLVED = 'payroll_irregularity_resolved',
}
