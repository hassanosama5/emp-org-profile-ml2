import api from "../client";
import {
  AppraisalTemplate,
  CreateAppraisalTemplateDto,
  UpdateAppraisalTemplateDto,
} from "@/types/performance";

export const performanceApi = {
  // ============================================
  // APPRAISAL TEMPLATES
  // ============================================
  
  // Create a new appraisal template
  createTemplate: async (data: CreateAppraisalTemplateDto): Promise<AppraisalTemplate> => {
    return await api.post("/performance/templates", data);
  },

  // Get all appraisal templates
  getAllTemplates: async (): Promise<AppraisalTemplate[]> => {
    return await api.get("/performance/templates");
  },

  // Get a single template by ID
  getTemplateById: async (id: string): Promise<AppraisalTemplate> => {
    return await api.get(`/performance/templates/${id}`);
  },

  // Update an existing template
  updateTemplate: async (
    id: string,
    data: UpdateAppraisalTemplateDto
  ): Promise<AppraisalTemplate> => {
    return await api.patch(`/performance/templates/${id}`, data);
  },
};
