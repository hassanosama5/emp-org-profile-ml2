// frontend/components/Performance/performanceRecords.ts

import { AppraisalTemplate } from "./performanceTemplates";

// Matches backend RatingEntry schema / RatingEntryDto
export interface RatingEntry {
  key: string;
  title: string;
  ratingValue: number;
  ratingLabel?: string;
  weightedScore?: number;
  comments?: string;
}

// Minimal shape for AppraisalRecord returned by backend
export interface AppraisalRecord {
  id?: string;
  _id?: string;

  assignmentId: any;
  cycleId: any;
  templateId: any;
  employeeProfileId: any;
  managerProfileId: any;

  ratings: RatingEntry[];
  totalScore?: number;
  overallRatingLabel?: string;
  managerSummary?: string;
  strengths?: string;
  improvementAreas?: string;

  status: string;
  managerSubmittedAt?: string;
  hrPublishedAt?: string;
  employeeViewedAt?: string;
  employeeAcknowledgedAt?: string;
}

// Input payload for upsertAppraisalRecord (matches UpsertAppraisalRecordDto)
export interface UpsertAppraisalRecordInput {
  ratings: RatingEntry[];
  totalScore?: number;
  overallRatingLabel?: string;
  managerSummary?: string;
  strengths?: string;
  improvementAreas?: string;
}
