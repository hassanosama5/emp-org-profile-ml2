// frontend/components/Performance/performanceTemplates.ts

// Match backend enum AppraisalTemplateType
export const APPRAISAL_TEMPLATE_TYPES = [
  "ANNUAL",
  "SEMI_ANNUAL",
  "PROBATIONARY",
  "PROJECT",
  "AD_HOC",
] as const;
export type AppraisalTemplateType =
  (typeof APPRAISAL_TEMPLATE_TYPES)[number];

// Match backend enum AppraisalRatingScaleType
export const RATING_SCALE_TYPES = [
  "THREE_POINT",
  "FIVE_POINT",
  "TEN_POINT",
] as const;
export type AppraisalRatingScaleType =
  (typeof RATING_SCALE_TYPES)[number];

export interface RatingScaleDefinition {
  type: AppraisalRatingScaleType;
  min: number;
  max: number;
  step?: number;
  labels?: string[];
}

// UI can still use description, but backend DTO will ignore it
export interface EvaluationCriterion {
  key: string;
  title: string;
  description?: string; // UI-only, we’ll strip this out before sending
  weight?: number;
  maxScore?: number;
  required?: boolean;
}

export interface AppraisalTemplate {
  // backend returns _id; sometimes mapped to id, so allow both
  id?: string;
  _id?: string;

  name: string;
  templateType: AppraisalTemplateType;
  description?: string;
  ratingScale: RatingScaleDefinition;
  criteria: EvaluationCriterion[];
  instructions?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppraisalTemplateInput {
  name: string;
  templateType: AppraisalTemplateType;
  description?: string;
  ratingScale: RatingScaleDefinition;
  criteria: EvaluationCriterion[];
  instructions?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
}

export interface UpdateAppraisalTemplateInput {
  description?: string;
  ratingScale?: RatingScaleDefinition;
  criteria?: EvaluationCriterion[];
  instructions?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
  isActive?: boolean;
}
