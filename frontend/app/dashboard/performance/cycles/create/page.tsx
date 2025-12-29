"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import {
  CreateAppraisalCycleInput,
  CycleAssignment,
  CycleTemplateAssignment,
} from "@/components/Performance/performanceCycles";
import { createAppraisalCycle } from "@/lib/api/performance/Api/performanceCyclesApi";
import { fetchAppraisalTemplates } from "@/lib/api/performance/Api/performanceTemplatesApi";
import {
  AppraisalTemplate,
  AppraisalTemplateType,
  APPRAISAL_TEMPLATE_TYPES,
} from "@/components/Performance/performanceTemplates";
import { departmentsApi } from "@/lib/api/organization-structure/departments.api";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { SystemRole } from "@/types";

interface TemplateAssignmentFormRow {
  templateId: string;
  departmentIds: string[]; // Array of selected department IDs
}

interface AssignmentFormRow {
  employeeNumber: string; // Employee number input
  employeeProfileId: string; // Resolved employee profile ID
  managerNumber: string; // Manager employee number input
  managerProfileId: string; // Resolved manager profile ID
  departmentId: string;
  templateId: string;
  dueDate: string;
  // Validation states
  employeeValidating?: boolean;
  employeeError?: string;
  managerValidating?: boolean;
  managerError?: string;
}

interface Department {
  id: string;
  _id?: string;
  name: string;
}

interface Employee {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  roles?: string[];
  primaryDepartmentId?: string;
}

export default function CreateAppraisalCyclePage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cycleType, setCycleType] = useState<AppraisalTemplateType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [managerDueDate, setManagerDueDate] = useState("");
  const [employeeAckDueDate, setEmployeeAckDueDate] = useState("");

  const [templateRows, setTemplateRows] = useState<TemplateAssignmentFormRow[]>(
    [{ templateId: "", departmentIds: [] }]
  );
  const [assignmentRows, setAssignmentRows] = useState<AssignmentFormRow[]>([
    {
      employeeNumber: "",
      employeeProfileId: "",
      managerNumber: "",
      managerProfileId: "",
      departmentId: "",
      templateId: "",
      dueDate: "",
    },
  ]);

  // Options data
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState({
    templates: true,
    departments: true,
    employees: true,
  });

  // Fetch all options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all options in parallel
        const [templatesData, departmentsData, employeesResponse] =
          await Promise.all([
            fetchAppraisalTemplates(),
            departmentsApi.getAllDepartments({ isActive: true }),
            employeeProfileApi.getAllEmployees({ limit: 1000 }), // Get all employees
          ]);

        setTemplates(templatesData || []);
        setLoadingOptions((prev) => ({ ...prev, templates: false }));

        // Process departments
        const deptList: Department[] = (departmentsData || []).map(
          (d: any) => ({
            id: d._id || d.id || "",
            _id: d._id || d.id,
            name: d.name || "Unknown",
          })
        );
        setDepartments(deptList);
        setLoadingOptions((prev) => ({ ...prev, departments: false }));

        // Process employees
        const empList: Employee[] = (employeesResponse?.data || []).map(
          (e: any) => ({
            id: e._id || e.id || "",
            _id: e._id || e.id,
            firstName: e.firstName || "",
            lastName: e.lastName || "",
            employeeNumber: e.employeeNumber,
            roles: e.roles || [],
            primaryDepartmentId:
              e.primaryDepartmentId?._id ||
              e.primaryDepartmentId?.id ||
              e.primaryDepartmentId,
          })
        );
        setEmployees(empList);

        // Filter managers (employees with manager roles)
        const managerList = empList.filter((emp) =>
          emp.roles?.some(
            (role) =>
              role?.toLowerCase().includes("manager") ||
              role?.toLowerCase().includes("head") ||
              role === SystemRole.DEPARTMENT_HEAD ||
              role === SystemRole.HR_MANAGER ||
              role === SystemRole.HR_ADMIN
          )
        );
        setManagers(managerList);
        setLoadingOptions((prev) => ({ ...prev, employees: false }));
      } catch (err: any) {
        console.error("Failed to fetch options:", err);
        setError(err?.message || "Failed to load form options");
      } finally {
        setLoading(false);
      }
    };

    void fetchOptions();
  }, []);

  // Validate employee number and resolve to profile ID
  const validateEmployeeNumber = async (
    employeeNumber: string,
    index: number,
    type: "employee" | "manager"
  ): Promise<void> => {
    if (!employeeNumber.trim()) {
      setAssignmentRows((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          if (type === "employee") {
            return {
              ...r,
              employeeProfileId: "",
              employeeValidating: false,
              employeeError: undefined,
            };
          } else {
            return {
              ...r,
              managerProfileId: "",
              managerValidating: false,
              managerError: undefined,
            };
          }
        })
      );
      return;
    }

    // Set validating state
    setAssignmentRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (type === "employee") {
          return {
            ...r,
            employeeValidating: true,
            employeeError: undefined,
          };
        } else {
          return {
            ...r,
            managerValidating: true,
            managerError: undefined,
          };
        }
      })
    );

    try {
      const employee = await employeeProfileApi.searchByEmployeeNumber(
        employeeNumber.trim()
      );
      const emp = employee as any;
      const profileId = emp._id || emp.id || "";

      if (!profileId) {
        throw new Error("Employee profile ID not found");
      }

      // Success - set the profile ID
      setAssignmentRows((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          if (type === "employee") {
            return {
              ...r,
              employeeProfileId: profileId,
              employeeValidating: false,
              employeeError: undefined,
            };
          } else {
            return {
              ...r,
              managerProfileId: profileId,
              managerValidating: false,
              managerError: undefined,
            };
          }
        })
      );
    } catch (err: any) {
      // Error - clear profile ID and set error message
      const errorMessage =
        err?.message || `Employee with number "${employeeNumber}" not found`;
      setAssignmentRows((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          if (type === "employee") {
            return {
              ...r,
              employeeProfileId: "",
              employeeValidating: false,
              employeeError: errorMessage,
            };
          } else {
            return {
              ...r,
              managerProfileId: "",
              managerValidating: false,
              managerError: errorMessage,
            };
          }
        })
      );
    }
  };

  // Get department display name
  const getDepartmentName = (deptId: string): string => {
    const dept = departments.find((d) => d.id === deptId || d._id === deptId);
    return dept?.name || deptId || "Unknown";
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError("Cycle name is required");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("Start date must be before end date");
      return;
    }

    // Build templateAssignments
    const templateAssignments: CycleTemplateAssignment[] = templateRows
      .map((row) => ({
        templateId: row.templateId.trim(),
        departmentIds: row.departmentIds.filter(Boolean),
      }))
      .filter((t) => t.templateId && t.departmentIds.length > 0);

    if (templateAssignments.length === 0) {
      setError(
        "Please add at least one template assignment with a template and at least one department"
      );
      return;
    }

    // Validate all employee numbers are resolved
    const unresolvedEmployees = assignmentRows.filter(
      (row) => row.employeeNumber.trim() && !row.employeeProfileId
    );
    const unresolvedManagers = assignmentRows.filter(
      (row) => row.managerNumber.trim() && !row.managerProfileId
    );

    if (unresolvedEmployees.length > 0) {
      setError(
        `Please resolve employee numbers: ${unresolvedEmployees
          .map((r) => r.employeeNumber)
          .join(", ")}`
      );
      return;
    }

    if (unresolvedManagers.length > 0) {
      setError(
        `Please resolve manager numbers: ${unresolvedManagers
          .map((r) => r.managerNumber)
          .join(", ")}`
      );
      return;
    }

    // Build assignments
    const assignments: CycleAssignment[] = assignmentRows
      .map((row) => ({
        employeeProfileId: row.employeeProfileId.trim(),
        managerProfileId: row.managerProfileId.trim(),
        departmentId: row.departmentId.trim(),
        templateId: row.templateId.trim(),
        dueDate: row.dueDate.trim() || undefined,
      }))
      .filter(
        (a) =>
          a.employeeProfileId &&
          a.managerProfileId &&
          a.departmentId &&
          a.templateId
      );

    if (assignments.length === 0) {
      setError(
        "Please add at least one assignment with employee, manager, department, and template"
      );
      return;
    }

    const payload: CreateAppraisalCycleInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      cycleType,
      startDate,
      endDate,
      managerDueDate: managerDueDate || undefined,
      employeeAcknowledgementDueDate: employeeAckDueDate || undefined,
      templateAssignments,
      assignments,
    };

    try {
      setSaving(true);
      setError(null);
      await createAppraisalCycle(payload);
      router.push("/dashboard/performance/cycles");
    } catch (err: any) {
      console.error("Failed to create cycle:", err);
      setError(err?.message || "Failed to create appraisal cycle");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading form options…</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white-900">
              Create Appraisal Cycle
            </h1>
            <p className="text-gray-600 mt-1">
              Set up a new appraisal cycle with templates and assignments
            </p>
          </div>
          <Link href="/dashboard/performance/cycles">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cycle Information</CardTitle>
          <CardDescription>
            Basic information about the appraisal cycle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cycle Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Q1 2025 Performance Review"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of this appraisal cycle"
            />
          </div>

          {/* Cycle Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cycle Type <span className="text-red-500">*</span>
            </label>
            <select
              value={cycleType}
              onChange={(e) =>
                setCycleType(e.target.value as AppraisalTemplateType)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {APPRAISAL_TEMPLATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Due Date (optional)
              </label>
              <input
                type="date"
                value={managerDueDate}
                onChange={(e) => setManagerDueDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Acknowledgement Due Date (optional)
              </label>
              <input
                type="date"
                value={employeeAckDueDate}
                onChange={(e) => setEmployeeAckDueDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Assignments */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle>Template Assignments</CardTitle>
              <CardDescription>
                Assign templates to departments for this cycle
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() =>
                setTemplateRows((prev) => [
                  ...prev,
                  { templateId: "", departmentIds: [] },
                ])
              }
              variant="outline"
              size="sm"
            >
              + Add Template Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {templateRows.map((row, index) => (
            <Card key={index} className="border-gray-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={row.templateId}
                      onChange={(e) =>
                        setTemplateRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, templateId: e.target.value }
                              : r
                          )
                        )
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingOptions.templates}
                    >
                      <option value="">Select template</option>
                      {templates.map((t) => {
                        const id = t.id ?? t._id ?? "";
                        return (
                          <option key={id} value={id}>
                            {t.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departments <span className="text-red-500">*</span>
                    </label>
                    <select
                      multiple
                      value={row.departmentIds}
                      onChange={(e) => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        setTemplateRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, departmentIds: selected } : r
                          )
                        );
                      }}
                      size={Math.min(5, departments.length)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingOptions.departments}
                    >
                      {departments.map((d) => {
                        const id = d.id || d._id || "";
                        return (
                          <option key={id} value={id}>
                            {d.name}
                          </option>
                        );
                      })}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Hold Ctrl/Cmd to select multiple departments
                    </p>
                  </div>
                  {templateRows.length > 1 && (
                    <div>
                      <Button
                        type="button"
                        onClick={() =>
                          setTemplateRows((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                        variant="danger"
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle>Individual Assignments</CardTitle>
              <CardDescription>
                Assign specific employees to managers for appraisal
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() =>
                setAssignmentRows((prev) => [
                  ...prev,
                  {
                    employeeNumber: "",
                    employeeProfileId: "",
                    managerNumber: "",
                    managerProfileId: "",
                    departmentId: "",
                    templateId: "",
                    dueDate: "",
                  },
                ])
              }
              variant="outline"
              size="sm"
            >
              + Add Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentRows.map((row, index) => (
            <Card key={index} className="border-gray-200">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={row.employeeNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    employeeNumber: value,
                                    employeeProfileId: "",
                                    employeeError: undefined,
                                  }
                                : r
                            )
                          );
                          // Debounce validation
                          if (value.trim()) {
                            setTimeout(() => {
                              validateEmployeeNumber(value, index, "employee");
                            }, 500);
                          }
                        }}
                        placeholder="e.g., EMP-2025-0017"
                        className={`w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          row.employeeError
                            ? "border-red-300 bg-red-50"
                            : row.employeeProfileId
                            ? "border-green-300 bg-green-50"
                            : "border-gray-300"
                        }`}
                      />
                      {row.employeeValidating && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {row.employeeProfileId && !row.employeeValidating && (
                        <div className="absolute right-3 top-2.5">
                          <svg
                            className="h-5 w-5 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    {row.employeeError && (
                      <p className="mt-1 text-xs text-red-600">
                        {row.employeeError}
                      </p>
                    )}
                    {row.employeeProfileId && !row.employeeError && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Employee found
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager Employee Number{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={row.managerNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    managerNumber: value,
                                    managerProfileId: "",
                                    managerError: undefined,
                                  }
                                : r
                            )
                          );
                          // Debounce validation
                          if (value.trim()) {
                            setTimeout(() => {
                              validateEmployeeNumber(value, index, "manager");
                            }, 500);
                          }
                        }}
                        placeholder="e.g., EMP-2025-0017"
                        className={`w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          row.managerError
                            ? "border-red-300 bg-red-50"
                            : row.managerProfileId
                            ? "border-green-300 bg-green-50"
                            : "border-gray-300"
                        }`}
                      />
                      {row.managerValidating && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {row.managerProfileId && !row.managerValidating && (
                        <div className="absolute right-3 top-2.5">
                          <svg
                            className="h-5 w-5 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    {row.managerError && (
                      <p className="mt-1 text-xs text-red-600">
                        {row.managerError}
                      </p>
                    )}
                    {row.managerProfileId && !row.managerError && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Manager found
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={row.departmentId}
                      onChange={(e) => {
                        setAssignmentRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, departmentId: e.target.value }
                              : r
                          )
                        );
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingOptions.departments}
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => {
                        const id = d.id || d._id || "";
                        return (
                          <option key={id} value={id}>
                            {d.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={row.templateId}
                      onChange={(e) =>
                        setAssignmentRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, templateId: e.target.value }
                              : r
                          )
                        )
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingOptions.templates}
                    >
                      <option value="">Select template</option>
                      {templates.map((t) => {
                        const id = t.id ?? t._id ?? "";
                        return (
                          <option key={id} value={id}>
                            {t.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (optional)
                    </label>
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) =>
                        setAssignmentRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, dueDate: e.target.value } : r
                          )
                        )
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {assignmentRows.length > 1 && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() =>
                        setAssignmentRows((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      variant="danger"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/performance/cycles">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              variant="primary"
              isLoading={saving}
            >
              Create Cycle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
