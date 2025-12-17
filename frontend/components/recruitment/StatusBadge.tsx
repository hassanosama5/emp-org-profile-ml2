"use client";

import { ApplicationStatus, InterviewStatus, OnboardingTaskStatus, TerminationStatus } from "@/types/recruitment";

interface StatusBadgeProps {
  status: string | undefined | null;
  type?: "application" | "interview" | "onboarding" | "termination" | "resignation";
}

export function StatusBadge({ status, type = "application" }: StatusBadgeProps) {
  const getColor = () => {
    if (type === "application") {
      switch (status) {
        case ApplicationStatus.SUBMITTED:
          return "bg-blue-100 text-blue-800";
        case ApplicationStatus.IN_PROCESS:
          return "bg-yellow-100 text-yellow-800";
        case ApplicationStatus.OFFER:
          return "bg-purple-100 text-purple-800";
        case ApplicationStatus.HIRED:
          return "bg-green-100 text-green-800";
        case ApplicationStatus.REJECTED:
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
    
    if (type === "interview") {
      switch (status) {
        case InterviewStatus.SCHEDULED:
          return "bg-blue-100 text-blue-800";
        case InterviewStatus.COMPLETED:
          return "bg-green-100 text-green-800";
        case InterviewStatus.CANCELLED:
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
    
    if (type === "onboarding") {
      switch (status) {
        case OnboardingTaskStatus.PENDING:
          return "bg-yellow-100 text-yellow-800";
        case OnboardingTaskStatus.IN_PROGRESS:
          return "bg-blue-100 text-blue-800";
        case OnboardingTaskStatus.COMPLETED:
          return "bg-green-100 text-green-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
    
    if (type === "termination" || type === "resignation") {
      switch (status) {
        case TerminationStatus.PENDING:
          return "bg-yellow-100 text-yellow-800";
        case TerminationStatus.APPROVED:
          return "bg-green-100 text-green-800";
        case TerminationStatus.REJECTED:
          return "bg-red-100 text-red-800";
        case TerminationStatus.COMPLETED:
          return "bg-gray-100 text-gray-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
    
    return "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string | undefined | null): string => {
    if (!status) return "Unknown";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Handle undefined/null status
  if (!status) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Unknown
      </span>
    );
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor()}`}>
      {formatStatus(status)}
    </span>
  );
}

