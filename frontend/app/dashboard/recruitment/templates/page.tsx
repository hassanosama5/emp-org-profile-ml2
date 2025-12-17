"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { performanceApi } from "@/lib/api/performance/performance";
import {
  AppraisalTemplate,
  CreateAppraisalTemplateDto,
  UpdateAppraisalTemplateDto,
  AppraisalTemplateType,
  AppraisalRatingScaleType,
} from "@/types/performance";
import {
  CreateAppraisalTemplateInput,
  UpdateAppraisalTemplateInput,
} from "@/components/Performance/performanceTemplates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { AppraisalTemplateForm } from "@/components/Performance/AppraisalTemplateForm";
import { SystemRole } from "@/types";

export default function AppraisalTemplatesPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AppraisalTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await performanceApi.getAllTemplates();
      setTemplates(data);
    } catch (error: any) {
      showToast(error.message || "Failed to load appraisal templates", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: AppraisalTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleCreate = async (input: CreateAppraisalTemplateInput) => {
    try {
      setIsSubmitting(true);
      // Convert Input type to Dto type for API
      const dto: CreateAppraisalTemplateDto = {
        name: input.name,
        templateType: input.templateType as AppraisalTemplateType,
        description: input.description,
        ratingScale: {
          type: input.ratingScale.type as AppraisalRatingScaleType,
          min: input.ratingScale.min,
          max: input.ratingScale.max,
          step: input.ratingScale.step,
          labels: input.ratingScale.labels,
        },
        criteria: input.criteria,
        instructions: input.instructions,
        applicableDepartmentIds: input.applicableDepartmentIds,
        applicablePositionIds: input.applicablePositionIds,
      };
      await performanceApi.createTemplate(dto);
      showToast("Appraisal template created successfully", "success");
      handleCloseModal();
      loadTemplates();
    } catch (error: any) {
      showToast(error.message || "Failed to create appraisal template", "error");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (input: UpdateAppraisalTemplateInput) => {
    if (!editingTemplate) return;
    try {
      setIsSubmitting(true);
      // Convert Input type to Dto type for API
      const dto: UpdateAppraisalTemplateDto = {
        description: input.description,
        ratingScale: input.ratingScale ? {
          type: input.ratingScale.type as AppraisalRatingScaleType,
          min: input.ratingScale.min,
          max: input.ratingScale.max,
          step: input.ratingScale.step,
          labels: input.ratingScale.labels,
        } : undefined,
        criteria: input.criteria,
        instructions: input.instructions,
        applicableDepartmentIds: input.applicableDepartmentIds,
        applicablePositionIds: input.applicablePositionIds,
        isActive: input.isActive,
      };
      await performanceApi.updateTemplate(editingTemplate._id, dto);
      showToast("Appraisal template updated successfully", "success");
      handleCloseModal();
      loadTemplates();
    } catch (error: any) {
      showToast(error.message || "Failed to update appraisal template", "error");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTemplateType = (type: AppraisalTemplateType): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatScaleType = (type: AppraisalRatingScaleType): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Check if user is HR Employee or HR Manager
  const isHREmployee = user?.roles?.includes(SystemRole.HR_EMPLOYEE);
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const canManage = isHREmployee || isHRManager;

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
        <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Recruitment
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appraisal Templates</h1>
            <p className="text-gray-600 mt-1">
              Structured assessment and scoring forms per role for consistent evaluations
            </p>
          </div>
          {canManage && (
            <Button onClick={handleOpenCreate}>Create Template</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading appraisal templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No appraisal templates found.</p>
            {canManage && (
              <Button onClick={handleOpenCreate}>Create First Template</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{template.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatTemplateType(template.templateType)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>
                      Scale: {formatScaleType(template.ratingScale.type)} ({template.ratingScale.min}-
                      {template.ratingScale.max})
                    </span>
                    <span>•</span>
                    <span>{template.criteria.length} criteria</span>
                  </div>

                  {((template.applicableDepartmentIds?.length ?? 0) > 0 ||
                    (template.applicablePositionIds?.length ?? 0) > 0) && (
                    <div className="text-xs text-gray-500">
                      Applicable to:{" "}
                      {(template.applicableDepartmentIds?.length ?? 0) > 0 && (
                        <span>{template.applicableDepartmentIds?.length ?? 0} department(s)</span>
                      )}
                      {(template.applicableDepartmentIds?.length ?? 0) > 0 &&
                        (template.applicablePositionIds?.length ?? 0) > 0 && <span>, </span>}
                      {(template.applicablePositionIds?.length ?? 0) > 0 && (
                        <span>{template.applicablePositionIds?.length ?? 0} position(s)</span>
                      )}
                    </div>
                  )}

                  {canManage && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => handleOpenEdit(template)}
                    >
                      Edit Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTemplate ? "Edit Appraisal Template" : "Create Appraisal Template"}
        size="xl"
      >
        <AppraisalTemplateForm
          mode={editingTemplate ? "edit" : "create"}
          initialValue={editingTemplate || undefined}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={handleCloseModal}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
}
