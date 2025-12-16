// frontend/lib/api/performance/Api/performanceCyclesApi.ts

import api from "@/lib/api/client";
import {
  AppraisalCycle,
  CreateAppraisalCycleInput,
  CycleProgressSummary,
  CycleReminderResult,
} from "@/components/Performance/performanceCycles";

const CYCLES_BASE_PATH = "/performance/cycles";

export async function fetchAppraisalCycles(): Promise<AppraisalCycle[]> {
  const raw = await api.get(CYCLES_BASE_PATH);
  return raw as unknown as AppraisalCycle[];
}

export async function createAppraisalCycle(
  input: CreateAppraisalCycleInput,
): Promise<AppraisalCycle> {
  const raw = await api.post(CYCLES_BASE_PATH, input);
  return raw as unknown as AppraisalCycle;
}

// Status transitions

export async function activateAppraisalCycle(
  id: string,
): Promise<AppraisalCycle> {
  const raw = await api.patch(`${CYCLES_BASE_PATH}/${id}/activate`, {});
  return raw as unknown as AppraisalCycle;
}

export async function publishAppraisalCycle(
  id: string,
): Promise<AppraisalCycle> {
  const raw = await api.patch(`${CYCLES_BASE_PATH}/${id}/publish`, {});
  return raw as unknown as AppraisalCycle;
}

export async function closeAppraisalCycle(
  id: string,
): Promise<AppraisalCycle> {
  const raw = await api.patch(`${CYCLES_BASE_PATH}/${id}/close`, {});
  return raw as unknown as AppraisalCycle;
}

export async function archiveAppraisalCycle(
  id: string,
): Promise<AppraisalCycle> {
  const raw = await api.patch(`${CYCLES_BASE_PATH}/${id}/archive`, {});
  return raw as unknown as AppraisalCycle;
}

/* ============================================================
   Step 4 – Monitoring & Reminders
   ============================================================ */

// GET /performance/cycles/:id/progress
export async function fetchCycleProgress(
  id: string,
): Promise<CycleProgressSummary> {
  const raw = await api.get(`${CYCLES_BASE_PATH}/${id}/progress`);
  return raw as unknown as CycleProgressSummary;
}

// POST /performance/cycles/:id/reminders
export async function sendCycleRemindersApi(
  id: string,
): Promise<CycleReminderResult> {
  const raw = await api.post(`${CYCLES_BASE_PATH}/${id}/reminders`, {});
  return raw as unknown as CycleReminderResult;
}
