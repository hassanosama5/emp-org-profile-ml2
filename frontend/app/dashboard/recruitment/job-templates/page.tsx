"use client";

// CHANGED - REC-003: Job Templates Management Page
// HR Manager can define standardized job description templates
// FIXED - Removed nested TemplateForm component to fix input focus issue
// CHANGED - Integrated with Organization Structure for departments and positions

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { departmentsApi } from "@/lib/api/organization-structure/departments.api";
import { positionsApi } from "@/lib/api/organization-structure/positions.api";
import { JobTemplate } from "@/types/recruitment";
import { DepartmentResponseDto, PositionResponseDto } from "@/types/organization-structure";
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
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

// CHANGED - Form data type for creating/editing templates
// Only includes fields that backend accepts: title, department, description, qualifications, skills
interface TemplateFormData {
  title: string;
  department: string;
  description: string;
  qualifications: string[];
  skills: string[];
}

export default function JobTemplatesPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);
  
  // CHANGED - Organization Structure data for dropdowns
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [loadingOrgData, setLoadingOrgData] = useState(true);
  
  // CHANGED - Form state (only fields backend accepts)
  const [formData, setFormData] = useState<TemplateFormData>({
    title: "",
    department: "",
    description: "",
    qualifications: [],
    skills: [],
  });
  
  // CHANGED - For adding qualifications and skills
  const [newQualification, setNewQualification] = useState("");
  const [newSkill, setNewSkill] = useState("");
  
  // CHANGED - Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTemplates();
    loadOrganizationData();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await recruitmentApi.getJobTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message || "Failed to load job templates", "error");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED - Load departments and positions from Organization Structure
  const loadOrganizationData = async () => {
    try {
      setLoadingOrgData(true);
      const [deptData, posData] = await Promise.all([
        departmentsApi.getAllDepartments({ isActive: true }),
        positionsApi.getAllPositions({ isActive: true }),
      ]);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setPositions(Array.isArray(posData) ? posData : []);
    } catch (error: any) {
      console.error("Failed to load organization data:", error);
      showToast("Failed to load departments/positions. Please refresh.", "error");
    } finally {
      setLoadingOrgData(false);
    }
  };

  // CHANGED - Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      department: "",
      description: "",
      qualifications: [],
      skills: [],
    });
    setNewQualification("");
    setNewSkill("");
    setErrors({});
  };

  // CHANGED - Open create modal
  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // CHANGED - Open edit modal
  const handleOpenEdit = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title || "",
      department: template.department || "",
      description: template.description || "",
      qualifications: template.qualifications || [],
      skills: template.skills || [],
    });
    setNewQualification("");
    setNewSkill("");
    setErrors({});
    setIsEditModalOpen(true);
  };

  // CHANGED - Add qualification
  const handleAddQualification = () => {
    if (newQualification.trim()) {
      setFormData((prev) => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification.trim()],
      }));
      setNewQualification("");
      // Clear error if it exists
      if (errors.qualifications) {
        setErrors((prev) => ({ ...prev, qualifications: "" }));
      }
    }
  };

  // CHANGED - Remove qualification
  const handleRemoveQualification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index),
    }));
  };

  // CHANGED - Add skill
  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
      // Clear error if it exists
      if (errors.skills) {
        setErrors((prev) => ({ ...prev, skills: "" }));
      }
    }
  };

  // CHANGED - Remove skill
  const handleRemoveSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  // CHANGED - Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = "Title is required";
    }
    if (!formData.department || formData.department.trim().length === 0) {
      newErrors.department = "Department is required";
    }
    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = "Description is required";
    }
    if (formData.qualifications.length === 0) {
      newErrors.qualifications = "At least one qualification is required";
    }
    if (formData.skills.length === 0) {
      newErrors.skills = "At least one skill is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // CHANGED - Create template
  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      await recruitmentApi.createJobTemplate(formData);
      showToast("Job template created successfully!", "success");
      setIsCreateModalOpen(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      showToast(error.message || "Failed to create job template", "error");
    }
  };

  // CHANGED - Update template
  const handleUpdate = async () => {
    if (!selectedTemplate || !validateForm()) return;

    try {
      await recruitmentApi.updateJobTemplate(selectedTemplate._id, formData);
      showToast("Job template updated successfully!", "success");
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      showToast(error.message || "Failed to update job template", "error");
    }
  };

  // CHANGED - Render form fields (inline, not as separate component)
  // CHANGED - Now uses dropdowns for title (position) and department from Organization Structure
  const renderFormFields = () => (
    <div className="space-y-4">
      {/* Loading indicator for organization data */}
      {loadingOrgData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          Loading departments and positions...
        </div>
      )}

      {/* Title (Position) - Now a dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Title (Position) *
        </label>
        <select
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loadingOrgData}
        >
          <option value="">Select a position...</option>
          {positions.map((position) => (
            <option key={position._id} value={position.title}>
              {position.title} {position.code ? `(${position.code})` : ""}
            </option>
          ))}
        </select>
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        {positions.length === 0 && !loadingOrgData && (
          <p className="text-amber-600 text-xs mt-1">
            No positions found. Please create positions in Organization Structure first.
          </p>
        )}
      </div>

      {/* Department - Now a dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Department *
        </label>
        <select
          value={formData.department}
          onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loadingOrgData}
        >
          <option value="">Select a department...</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept.name}>
              {dept.name} {dept.code ? `(${dept.code})` : ""}
            </option>
          ))}
        </select>
        {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
        {departments.length === 0 && !loadingOrgData && (
          <p className="text-amber-600 text-xs mt-1">
            No departments found. Please create departments in Organization Structure first.
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Description *
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the role, responsibilities, and expectations..."
          rows={4}
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Qualifications */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Qualifications * (click Add after typing each one)
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newQualification}
            onChange={(e) => setNewQualification(e.target.value)}
            placeholder="e.g., Bachelor's degree in Computer Science"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddQualification();
              }
            }}
          />
          <Button type="button" onClick={handleAddQualification} variant="outline">
            Add
          </Button>
        </div>
        {errors.qualifications && <p className="text-red-500 text-xs mb-2">{errors.qualifications}</p>}
        {formData.qualifications.length > 0 && (
          <div className="space-y-1 bg-gray-50 p-2 rounded">
            {formData.qualifications.map((qual, index) => (
              <div key={`qual-${index}`} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                <span className="text-sm text-gray-900">• {qual}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveQualification(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Required Skills * (click Add after typing each one)
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="e.g., React, Python, Communication"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSkill();
              }
            }}
          />
          <Button type="button" onClick={handleAddSkill} variant="outline">
            Add
          </Button>
        </div>
        {errors.skills && <p className="text-red-500 text-xs mb-2">{errors.skills}</p>}
        {formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded">
            {formData.skills.map((skill, index) => (
              <span
                key={`skill-${index}`}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(index)}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
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
              <h1 className="text-3xl font-bold text-gray-900">Job Templates</h1>
              <p className="text-gray-600 mt-1">
                Define standardized job description templates for consistent postings (REC-003)
              </p>
            </div>
            <Button onClick={handleOpenCreate}>+ Create Template</Button>
          </div>
        </div>

        {/* CHANGED - Info Card */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📝 What is a Job Template?
            </h3>
            <p className="text-sm text-blue-800">
              Job templates are standardized job descriptions that ensure consistency across all job postings.
              Each template includes: <strong>title, department, description, qualifications, and skills</strong>.
              When creating a job requisition, HR staff selects a template and specifies the number of openings and location.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Note:</strong> Titles and departments are now linked to the Organization Structure. 
              Make sure positions and departments exist there before creating templates.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading job templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No job templates found.</p>
              <p className="text-sm text-gray-400 mb-6">
                Create your first job template to start posting consistent job openings.
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
                      <CardTitle className="text-lg text-gray-900">{template.title}</CardTitle>
                      <CardDescription className="mt-1">{template.department}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description || "No description provided."}
                  </p>

                  {/* Qualifications Preview */}
                  {template.qualifications && template.qualifications.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Qualifications:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.qualifications.slice(0, 3).map((q, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {q}
                          </span>
                        ))}
                        {template.qualifications.length > 3 && (
                          <span className="text-xs text-gray-500">+{template.qualifications.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills Preview */}
                  {template.skills && template.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {template.skills.length > 3 && (
                          <span className="text-gray-400 text-xs">
                            +{template.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(template)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Link href={`/dashboard/recruitment/job-requisitions`} className="flex-1">
                      <Button size="sm" className="w-full">
                        Use Template
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Template Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            resetForm();
          }}
          title="Create Job Template"
          size="lg"
        >
          {renderFormFields()}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Template</Button>
          </div>
        </Modal>

        {/* Edit Template Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTemplate(null);
            resetForm();
          }}
          title="Edit Job Template"
          size="lg"
        >
          {renderFormFields()}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedTemplate(null);
                resetForm();
              }}
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
