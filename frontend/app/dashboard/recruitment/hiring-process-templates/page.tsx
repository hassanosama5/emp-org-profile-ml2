"use client";

// CHANGED - REC-004: Hiring Process Templates Management Page
// HR Manager can define standardized hiring process templates with custom stages and progress percentages

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  HiringProcessTemplate,
  CreateHiringProcessTemplateDto,
  UpdateHiringProcessTemplateDto,
  StageDefinition,
  ApplicationStage,
} from "@/types/recruitment";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

interface TemplateFormData {
  name: string;
  description: string;
  stages: StageDefinition[];
  isActive: boolean;
}

export default function HiringProcessTemplatesPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [templates, setTemplates] = useState<HiringProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<HiringProcessTemplate | null>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    stages: [],
    isActive: true,
  });

  const [newStage, setNewStage] = useState<Partial<StageDefinition>>({
    stage: ApplicationStage.SCREENING,
    name: "",
    order: 1,
    progressPercentage: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await recruitmentApi.getAllHiringProcessTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message || "Failed to load hiring process templates", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      stages: [],
      isActive: true,
    });
    setNewStage({
      stage: ApplicationStage.SCREENING,
      name: "",
      order: 1,
      progressPercentage: 0,
    });
    setErrors({});
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (template: HiringProcessTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      stages: [...template.stages],
      isActive: template.isActive ?? true,
    });
    setNewStage({
      stage: ApplicationStage.SCREENING,
      name: "",
      order: template.stages.length + 1,
      progressPercentage: 0,
    });
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleAddStage = () => {
    if (!newStage.stage || !newStage.name || newStage.progressPercentage === undefined) {
      showToast("Please fill in all stage fields", "error");
      return;
    }

    if (newStage.progressPercentage < 0 || newStage.progressPercentage > 100) {
      showToast("Progress percentage must be between 0 and 100", "error");
      return;
    }

    const stage: StageDefinition = {
      stage: newStage.stage as ApplicationStage,
      name: newStage.name,
      order: newStage.order || formData.stages.length + 1,
      progressPercentage: newStage.progressPercentage,
    };

    setFormData({
      ...formData,
      stages: [...formData.stages, stage].sort((a, b) => a.order - b.order),
    });

    setNewStage({
      stage: ApplicationStage.SCREENING,
      name: "",
      order: formData.stages.length + 2,
      progressPercentage: 0,
    });
  };

  const handleRemoveStage = (index: number) => {
    const newStages = formData.stages.filter((_, i) => i !== index);
    // Reorder stages
    newStages.forEach((stage, i) => {
      stage.order = i + 1;
    });
    setFormData({ ...formData, stages: newStages });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (formData.stages.length === 0) {
      newErrors.stages = "At least one stage is required";
    }

    // Validate stages
    formData.stages.forEach((stage, index) => {
      if (!stage.name.trim()) {
        newErrors[`stage_${index}_name`] = "Stage name is required";
      }
      if (stage.progressPercentage < 0 || stage.progressPercentage > 100) {
        newErrors[`stage_${index}_progress`] = "Progress must be between 0 and 100";
      }
    });

    // Check for duplicate stages
    const stageTypes = formData.stages.map((s) => s.stage);
    const duplicates = stageTypes.filter((type, index) => stageTypes.indexOf(type) !== index);
    if (duplicates.length > 0) {
      newErrors.stages = "Each stage type can only appear once";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const dto: CreateHiringProcessTemplateDto = {
        name: formData.name,
        description: formData.description || undefined,
        stages: formData.stages,
        isActive: formData.isActive,
      };

      await recruitmentApi.createHiringProcessTemplate(dto);
      showToast("Hiring process template created successfully!", "success");
      setIsCreateModalOpen(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      showToast(error.message || "Failed to create hiring process template", "error");
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate || !validateForm()) {
      return;
    }

    try {
      const dto: UpdateHiringProcessTemplateDto = {
        name: formData.name,
        description: formData.description || undefined,
        stages: formData.stages,
        isActive: formData.isActive,
      };

      await recruitmentApi.updateHiringProcessTemplate(selectedTemplate._id, dto);
      showToast("Hiring process template updated successfully!", "success");
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      showToast(error.message || "Failed to update hiring process template", "error");
    }
  };

  const getStageLabel = (stage: ApplicationStage): string => {
    const labels: Record<ApplicationStage, string> = {
      [ApplicationStage.SCREENING]: "Screening",
      [ApplicationStage.DEPARTMENT_INTERVIEW]: "Department Interview",
      [ApplicationStage.HR_INTERVIEW]: "HR Interview",
      [ApplicationStage.OFFER]: "Offer",
    };
    return labels[stage] || stage;
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      {/* Template Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Name *
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Standard Hiring Process, Executive Hiring Process"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe when to use this template..."
          rows={3}
        />
      </div>

      {/* Stages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hiring Stages *
        </label>
        {errors.stages && <p className="text-red-500 text-xs mb-2">{errors.stages}</p>}

        {/* Existing Stages */}
        {formData.stages.length > 0 && (
          <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded">
            {formData.stages.map((stage, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white px-3 py-2 rounded border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}. {getStageLabel(stage.stage)}
                    </span>
                    <span className="text-xs text-gray-500">({stage.name})</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Progress: {stage.progressPercentage}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStage(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Stage */}
        <div className="space-y-2 border-2 border-dashed border-gray-300 p-4 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Add Stage</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Stage Type *
              </label>
              <Select
                value={newStage.stage || ApplicationStage.SCREENING}
                onChange={(e) =>
                  setNewStage({ ...newStage, stage: e.target.value as ApplicationStage })
                }
                options={Object.values(ApplicationStage).map((stage) => ({
                  value: stage,
                  label: getStageLabel(stage),
                }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Stage Name *
              </label>
              <Input
                value={newStage.name || ""}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                placeholder="e.g., Initial Screening"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Order *
              </label>
              <Input
                type="number"
                min="1"
                value={newStage.order || 1}
                onChange={(e) =>
                  setNewStage({ ...newStage, order: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Progress % * (0-100)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newStage.progressPercentage || 0}
                onChange={(e) =>
                  setNewStage({
                    ...newStage,
                    progressPercentage: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <Button type="button" onClick={handleAddStage} variant="outline" size="sm">
            + Add Stage
          </Button>
        </div>
      </div>

      {/* Active Status */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Active (available for use)</span>
        </label>
      </div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8">
          <Link
            href="/dashboard/recruitment"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to Recruitment
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hiring Process Templates</h1>
              <p className="text-gray-600 mt-1">
                Define standardized hiring processes with custom stages and progress tracking
                (REC-004)
              </p>
            </div>
            <Button onClick={handleOpenCreate}>+ Create Template</Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 What is a Hiring Process Template?
            </h3>
            <p className="text-sm text-blue-800">
              Hiring process templates define the stages that applications go through (e.g.,
              Screening, Interview, Offer, Hired) and the progress percentage for each stage.
              When a template is assigned to a job requisition, the system automatically calculates
              application progress based on the template's stage definitions.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading hiring process templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No hiring process templates found.</p>
              <p className="text-sm text-gray-400 mb-6">
                Create your first template to define custom hiring processes.
              </p>
              <Button onClick={handleOpenCreate}>+ Create Your First Template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      )}
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
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Stages:</p>
                      <div className="space-y-1">
                        {template.stages
                          .sort((a, b) => a.order - b.order)
                          .map((stage, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                            >
                              <span className="text-gray-700">
                                {stage.order}. {getStageLabel(stage.stage)}
                              </span>
                              <span className="text-gray-500">{stage.progressPercentage}%</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        size="sm"
                        onClick={() => handleOpenEdit(template)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Hiring Process Template"
          size="xl"
        >
          {renderFormFields()}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Template</Button>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Hiring Process Template"
          size="xl"
        >
          {renderFormFields()}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Template</Button>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

