// frontend/lib/api/performance/Api/performanceDisputesApi.ts

import api from "@/lib/api/client";
import {
  AppraisalDispute,
  SubmitDisputeInput,
  ResolveDisputeInput,
} from "@/components/Performance/performanceDisputes";

const APPRAISALS_BASE_PATH = "/performance/appraisals";
const DISPUTES_BASE_PATH = "/performance/disputes";

// Step 6 – Employee / HR employee submits a dispute for an appraisal
export async function submitDisputeApi(
  appraisalId: string,
  employeeProfileId: string,
  input: SubmitDisputeInput,
): Promise<AppraisalDispute> {
  const raw = await api.post(
    `${APPRAISALS_BASE_PATH}/${appraisalId}/disputes`,
    input,
    {
      params: { employeeProfileId },
    },
  );
  return raw as unknown as AppraisalDispute;
}

// Get disputes for a specific appraisal (used to show if a dispute already exists)
export async function fetchDisputesForAppraisal(
  appraisalId: string,
): Promise<AppraisalDispute[]> {
  const raw = await api.get(
    `${APPRAISALS_BASE_PATH}/${appraisalId}/disputes`,
  );
  return raw as unknown as AppraisalDispute[];
}

// Used for HR dashboards (Step 7)
export async function fetchDisputes(params?: {
  cycleId?: string;
  status?: string;
}): Promise<AppraisalDispute[]> {
  const raw = await api.get(DISPUTES_BASE_PATH, { params });
  return raw as unknown as AppraisalDispute[];
}

// Used for HR dispute detail view (Step 7)
export async function fetchDisputeById(
  id: string,
): Promise<AppraisalDispute> {
  const raw = await api.get(`${DISPUTES_BASE_PATH}/${id}`);
  return raw as unknown as AppraisalDispute;
}

// Used in Step 7 – HR resolves a dispute
export async function resolveDisputeApi(
  id: string,
  resolverEmployeeId: string,
  input: ResolveDisputeInput,
): Promise<AppraisalDispute> {
  const raw = await api.patch(
    `${DISPUTES_BASE_PATH}/${id}/resolve`,
    input,
    {
      params: { resolverEmployeeId },
    },
  );
  return raw as unknown as AppraisalDispute;
}
