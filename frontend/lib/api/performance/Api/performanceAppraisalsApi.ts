// frontend/lib/api/performance/Api/performanceAppraisalsApi.ts

import api from "@/lib/api/client";
import {
  AppraisalRecord,
  UpsertAppraisalRecordInput,
} from "@/components/Performance/performanceRecords";

const APPRAISALS_BASE_PATH = "/performance/appraisals";
const ASSIGNMENTS_BASE_PATH = "/performance/assignments";
const EMPLOYEE_APPRAISALS_BASE_PATH = `${APPRAISALS_BASE_PATH}/employee`;

// Get single appraisal record by id
export async function fetchAppraisalById(
  id: string,
): Promise<AppraisalRecord> {
  const raw = await api.get(`${APPRAISALS_BASE_PATH}/${id}`);
  return raw as unknown as AppraisalRecord;
}

// Get ALL appraisals for the *current logged-in employee*
// lib/api/performance/Api/performanceAppraisalsApi.ts
export async function fetchMyAppraisals(): Promise<AppraisalRecord[]> {
  const raw: any = await api.get(`${EMPLOYEE_APPRAISALS_BASE_PATH}/me`);

  const list =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.results) ? raw.results :
    [];

  return list as AppraisalRecord[];
}


// Get appraisals for a specific employee profile (admin / HR view)
export async function fetchEmployeeAppraisals(
  employeeProfileId: string,
): Promise<AppraisalRecord[]> {
  const raw = await api.get(
    `${EMPLOYEE_APPRAISALS_BASE_PATH}/${employeeProfileId}`,
  );
  return raw as unknown as AppraisalRecord[];
}

// Save or update draft for a given assignment (manager fills form)
export async function upsertAppraisalRecordApi(
  assignmentId: string,
  managerProfileId: string,
  input: UpsertAppraisalRecordInput,
): Promise<AppraisalRecord> {
  const raw = await api.post(
    `${ASSIGNMENTS_BASE_PATH}/${assignmentId}/records`,
    input,
    {
      params: { managerProfileId },
    },
  );
  return raw as unknown as AppraisalRecord;
}

// Submit completed appraisal (manager → HR)
export async function submitAppraisalRecordApi(
  recordId: string,
  managerProfileId: string,
): Promise<AppraisalRecord> {
  // Use empty object instead of null to avoid JSON parsing issues
  // Some backends may return null responses which cause JSON parsing errors
  const raw = await api.patch(
    `${APPRAISALS_BASE_PATH}/${recordId}/submit`,
    {}, // Empty object instead of null
    {
      params: { managerProfileId },
    },
  );
  return raw as unknown as AppraisalRecord;
}

// Get time management summary for employee during appraisal period (REQ-AE-03)
export async function fetchTimeManagementSummary(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<any> {
  const raw = await api.get(
    `/performance/time-management-summary/${employeeId}`,
    {
      params: { startDate, endDate },
    },
  );
  return raw;
}
