// frontend/lib/api/performance/Api/performanceTemplatesApi.ts

import api from "@/lib/api/client";
import {
  AppraisalTemplate,
  CreateAppraisalTemplateInput,
  UpdateAppraisalTemplateInput,
} from "@/components/Performance/performanceTemplates";

const TEMPLATES_BASE_PATH = "/performance/templates";

// ---------------------------------------------------------------------------
// LIST + GET ONE
// ---------------------------------------------------------------------------

export async function fetchAppraisalTemplates(): Promise<AppraisalTemplate[]> {
  const data = (await api.get(
    TEMPLATES_BASE_PATH,
  )) as unknown as AppraisalTemplate[];
  return data;
}

export async function fetchAppraisalTemplateById(
  id: string,
): Promise<AppraisalTemplate> {
  const data = (await api.get(
    `${TEMPLATES_BASE_PATH}/${id}`,
  )) as unknown as AppraisalTemplate;
  return data;
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

export async function createAppraisalTemplate(
  input: CreateAppraisalTemplateInput,
): Promise<AppraisalTemplate> {
  const data = (await api.post(
    TEMPLATES_BASE_PATH,
    input,
  )) as unknown as AppraisalTemplate;
  return data;
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

export async function updateAppraisalTemplate(
  id: string,
  input: UpdateAppraisalTemplateInput,
): Promise<AppraisalTemplate> {
  const data = (await api.patch(
    `${TEMPLATES_BASE_PATH}/${id}`,
    input,
  )) as unknown as AppraisalTemplate;
  return data;
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function deleteAppraisalTemplate(id: string): Promise<void> {
  await api.delete(`${TEMPLATES_BASE_PATH}/${id}`);
}
