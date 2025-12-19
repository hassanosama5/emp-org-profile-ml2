// frontend/lib/api/performance/Api/performanceAssignmentsApi.ts

import api from "@/lib/api/client";
import { CycleAssignment } from "@/components/Performance/performanceCycles";
import { AppraisalAssignment } from "@/components/Performance/performanceAssignments";

export interface BulkAssignmentInput {
  cycleId: string;
  assignments: CycleAssignment[];
}

export interface BulkAssignmentResponse {
  assignments: any[];
}

// REQ-PP-05: Bulk assignment for existing cycles
export async function createBulkAssignments(
  input: BulkAssignmentInput
): Promise<BulkAssignmentResponse> {
  const response = await api.post("/performance/assignments/bulk", input);
  return response as unknown as BulkAssignmentResponse;
}

// Get assignments for a specific manager
export async function fetchManagerAssignments(
  managerProfileId: string,
  cycleId?: string
): Promise<AppraisalAssignment[]> {
  const params = cycleId ? { cycleId } : {};
  const response = await api.get(
    `/performance/assignments/manager/${managerProfileId}`,
    { params }
  );
  
  // Handle different response formats
  const data = (response as any)?.data || response;
  return Array.isArray(data) ? data : [];
}
