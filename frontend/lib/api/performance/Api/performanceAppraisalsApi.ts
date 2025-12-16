// frontend/lib/api/performance/Api/performanceAppraisalsApi.ts

import api from "@/lib/api/client";
import {
  AppraisalRecord,
  UpsertAppraisalRecordInput,
} from "@/components/Performance/performanceRecords";

const APPRAISALS_BASE_PATH = "/performance/appraisals";
const ASSIGNMENTS_BASE_PATH = "/performance/assignments";

// Get single appraisal record by id
export async function fetchAppraisalById(id: string): Promise<AppraisalRecord> {
  const data = (await api.get(
    `${APPRAISALS_BASE_PATH}/${id}`
  )) as unknown as AppraisalRecord;
  return data;
}

// Save or update draft for a given assignment
export async function upsertAppraisalRecordApi(
  assignmentId: string,
  managerProfileId: string,
  input: UpsertAppraisalRecordInput
): Promise<AppraisalRecord> {
  const data = (await api.post(
    `${ASSIGNMENTS_BASE_PATH}/${assignmentId}/records`,
    input,
    {
      params: { managerProfileId },
    }
  )) as unknown as AppraisalRecord;

  return data;
}

// Submit completed appraisal (manager → HR)
export async function submitAppraisalRecordApi(
  recordId: string,
  managerProfileId: string
): Promise<AppraisalRecord> {
  const data = (await api.patch(
    `${APPRAISALS_BASE_PATH}/${recordId}/submit`,
    null,
    {
      params: { managerProfileId },
    }
  )) as unknown as AppraisalRecord;

  return data;
}
