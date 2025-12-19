"use client";

import React, { useEffect, useState } from "react";
import {
  AppraisalTemplate,
  CreateAppraisalTemplateInput,
  UpdateAppraisalTemplateInput,
} from "./performanceTemplates";
import {
  fetchAppraisalTemplates,
  createAppraisalTemplate,
  updateAppraisalTemplate,
  deleteAppraisalTemplate,
} from "../../lib/api/performance/Api/performanceTemplatesApi";
import { AppraisalTemplateForm } from "./AppraisalTemplateForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

type FormMode = "none" | "create" | "edit";

export const AppraisalTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("none");
  const [selectedTemplate, setSelectedTemplate] =
    useState<AppraisalTemplate | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAppraisalTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const openCreateForm = () => {
    setSelectedTemplate(null);
    setFormMode("create");
  };

  const openEditForm = (template: AppraisalTemplate) => {
    setSelectedTemplate(template);
    setFormMode("edit");
  };

  const closeForm = () => {
    setSelectedTemplate(null);
    setFormMode("none");
  };

  const handleCreate = async (input: CreateAppraisalTemplateInput) => {
    try {
      setSaving(true);
      setError(null);
      const created = await createAppraisalTemplate(input);
      setTemplates((prev) => [...prev, created]);
      setFormMode("none");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (input: UpdateAppraisalTemplateInput) => {
    if (!selectedTemplate) return;

    const id = selectedTemplate.id ?? selectedTemplate._id;
    if (!id) {
      console.error("Selected template has no id/_id");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = await updateAppraisalTemplate(id, input);
      const updatedId = updated.id ?? updated._id;

      setTemplates((prev) =>
        prev.map((t) => ((t.id ?? t._id) === updatedId ? updated : t))
      );
      setSelectedTemplate(null);
      setFormMode("none");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: AppraisalTemplate) => {
    const id = template.id ?? template._id;
    if (!id) {
      console.error("Template has no id/_id");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete template "${template.name}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setSaving(true);
      setError(null);
      await deleteAppraisalTemplate(id);
      setTemplates((prev) => prev.filter((t) => (t.id ?? t._id) !== id));
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to delete template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white-900">
            Appraisal Templates
          </h1>
          <p className="text-gray-600 mt-1 max-w-2xl">
            Configure standardized appraisal templates, rating scales, and
            criteria so managers evaluate employees consistently.
          </p>
        </div>
        <Button onClick={openCreateForm} variant="primary">
          + New Template
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading templates…</span>
            </div>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Templates Found</CardTitle>
            <CardDescription>
              Click "New Template" to create your first appraisal template.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Templates ({templates.length})</CardTitle>
            <CardDescription>
              Manage your appraisal templates and rating scales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating Scale
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criteria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((t, index) => {
                    const key = t.id ?? t._id ?? `${t.name}-${index}`;
                    return (
                      <tr
                        key={key}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {t.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {t.templateType}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {t.ratingScale.min} – {t.ratingScale.max}
                          {t.ratingScale.type &&
                            t.ratingScale.labels &&
                            ` (${t.ratingScale.labels.join(", ")})`}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {t.criteria.length} criterion
                          {t.criteria.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => openEditForm(t)}
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDelete(t)}
                              variant="danger"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {formMode !== "none" && (
        <AppraisalTemplateForm
          mode={formMode === "create" ? "create" : "edit"}
          initialValue={
            formMode === "edit" && selectedTemplate
              ? selectedTemplate
              : undefined
          }
          onCreate={formMode === "create" ? handleCreate : undefined}
          onUpdate={formMode === "edit" ? handleUpdate : undefined}
          onCancel={closeForm}
          isSubmitting={saving}
        />
      )}
    </div>
  );
};
