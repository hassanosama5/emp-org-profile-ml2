// Performance and Appraisal Types

export enum AppraisalTemplateType {
  ANNUAL = 'ANNUAL',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  PROBATIONARY = 'PROBATIONARY',
  PROJECT = 'PROJECT',
  AD_HOC = 'AD_HOC',
}

export enum AppraisalRatingScaleType {
  THREE_POINT = 'THREE_POINT',
  FIVE_POINT = 'FIVE_POINT',
  TEN_POINT = 'TEN_POINT',
}

export interface RatingScaleDefinition {
  type: AppraisalRatingScaleType;
  min: number;
  max: number;
  step?: number;
  labels?: string[];
}

export interface EvaluationCriterion {
  key: string;
  title: string;
  details?: string;
  weight?: number;
  maxScore?: number;
  required?: boolean;
}

export interface AppraisalTemplate {
  _id: string;
  name: string;
  description?: string;
  templateType: AppraisalTemplateType;
  ratingScale: RatingScaleDefinition;
  criteria: EvaluationCriterion[];
  instructions?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// DTOs
export interface CreateAppraisalTemplateDto {
  name: string;
  description?: string;
  templateType: AppraisalTemplateType;
  ratingScale: RatingScaleDefinition;
  criteria: EvaluationCriterion[];
  instructions?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
}

export interface UpdateAppraisalTemplateDto {
  name?: string;
  description?: string;
  templateType?: AppraisalTemplateType;
  ratingScale?: RatingScaleDefinition;
  criteria?: EvaluationCriterion[];
  instructions?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
  isActive?: boolean;
}

// Organization Structure Types (for selection)
export interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Position {
  _id: string;
  code: string;
  title: string;
  description?: string;
  departmentId?: string;
  isActive: boolean;
}
