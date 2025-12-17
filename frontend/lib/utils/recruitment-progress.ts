// CHANGED - REC-004: Utility functions for calculating recruitment progress
// Supports both template-based and hardcoded progress calculation

import {
  ApplicationStatus,
  ApplicationStage,
  HiringProcessTemplate,
} from "@/types/recruitment";

/**
 * Calculate progress percentage based on application status and stage
 * If a template is provided, uses template's stage definitions
 * Otherwise, falls back to hardcoded values
 */
export function calculateProgress(
  status: ApplicationStatus | string,
  stage?: ApplicationStage | string,
  template?: HiringProcessTemplate | null
): number {
  // If template is provided, use template-based calculation
  if (template && template.stages && template.stages.length > 0) {
    const currentStage = stage as ApplicationStage;
    const stageDefinition = template.stages.find((s) => s.stage === currentStage);
    if (stageDefinition) {
      return stageDefinition.progressPercentage;
    }
  }

  // Fallback to status-based calculation
  const statusStr = (status || "").toString().toLowerCase();
  const stageStr = (stage || "").toString().toLowerCase();

  // Use stage if available, otherwise use status
  if (stageStr) {
    const stageMap: Record<string, number> = {
      screening: 20,
      department_interview: 50,
      hr_interview: 60,
      offer: 80,
    };
    if (stageMap[stageStr] !== undefined) {
      return stageMap[stageStr];
    }
  }

  // Status-based mapping
  const statusMap: Record<string, number> = {
    submitted: 10,
    in_process: 40,
    offer: 80,
    hired: 100,
    rejected: 0,
  };

  return statusMap[statusStr] ?? 0;
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-green-600";
  if (percentage >= 80) return "bg-green-500";
  if (percentage >= 50) return "bg-yellow-500";
  if (percentage >= 20) return "bg-blue-500";
  return "bg-gray-400";
}

/**
 * Get stage label for display
 */
export function getStageLabel(stage: ApplicationStage | string): string {
  const labels: Record<string, string> = {
    [ApplicationStage.SCREENING]: "Screening",
    [ApplicationStage.DEPARTMENT_INTERVIEW]: "Department Interview",
    [ApplicationStage.HR_INTERVIEW]: "HR Interview",
    [ApplicationStage.OFFER]: "Offer",
  };
  return labels[stage] || stage.toString();
}

