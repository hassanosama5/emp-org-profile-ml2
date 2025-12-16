// frontend/components/Performance/performanceCycles.ts

import {
  AppraisalTemplateType,
} from "./performanceTemplates";

// Cycle status enum (matches backend AppraisalCycleStatus)
export const APPRAISAL_CYCLE_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "CLOSED",
  "ARCHIVED",
] as const;

export type AppraisalCycleStatus =
  (typeof APPRAISAL_CYCLE_STATUSES)[number];

// Template assignment inside a cycle
export interface CycleTemplateAssignment {
  templateId: string;
  departmentIds: string[]; // Department ObjectIds as strings
}

// Individual assignment of employee → manager for the cycle
export interface CycleAssignment {
  employeeProfileId: string;
  managerProfileId: string;
  departmentId: string;
  positionId?: string;
  templateId: string;
  dueDate?: string;
}

// What the backend returns for a cycle
export interface AppraisalCycle {
  id?: string;
  _id?: string;

  name: string;
  description?: string;
  cycleType: AppraisalTemplateType;

  startDate: string; // ISO date string
  endDate: string;   // ISO date string

  managerDueDate?: string;
  employeeAcknowledgementDueDate?: string;

  templateAssignments: CycleTemplateAssignment[];

  status: AppraisalCycleStatus;
  publishedAt?: string;
  closedAt?: string;
  archivedAt?: string;
}

// Payload for POST /performance/cycles
export interface CreateAppraisalCycleInput {
  name: string;
  description?: string;
  cycleType: AppraisalTemplateType;

  startDate: string;
  endDate: string;

  managerDueDate?: string;
  employeeAcknowledgementDueDate?: string;

  templateAssignments: CycleTemplateAssignment[];
  assignments: CycleAssignment[];
}

// (There is no generic update endpoint in the backend right now,
// but we keep this for possible future use.)
export interface UpdateAppraisalCycleInput {
  description?: string;
  managerDueDate?: string;
  employeeAcknowledgementDueDate?: string;
  templateAssignments?: CycleTemplateAssignment[];
}

/* ============================================================
   Step 4 – HR Monitoring & Reminders (frontend types)
   Matches PerformanceService.getCycleProgress / sendCycleReminders
   ============================================================ */

export interface CycleProgressByDepartment {
  departmentId: string;
  totalAssignments: number;
  submitted: number;
  completionRate: number;
}

export interface CycleProgressSummary {
  cycleId: string;
  name: string;
  status: AppraisalCycleStatus;
  totalAssignments: number;
  byStatus: Record<string, number>;
  completionRate: number;
  byDepartment: CycleProgressByDepartment[];
}

// Shape of POST /performance/cycles/:id/reminders response
export interface CycleReminderResult {
  cycleId: string;
  cycleName: string;
  pendingCount: number;
  // We only need the count in the UI; keep pendingAssignments loose
  pendingAssignments: any[];
}
