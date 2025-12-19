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
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Toast, useToast } from "@/components/leaves/Toast";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { createBulkAssignments } from "@/lib/api/performance/Api/performanceAssignmentsApi";
import { fetchAppraisalCycles } from "@/lib/api/performance/Api/performanceCyclesApi";
import { fetchAppraisalTemplates } from "@/lib/api/performance/Api/performanceTemplatesApi";
import { departmentsApi } from "@/lib/api/organization-structure/departments.api";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import type {
  AppraisalCycle,
  CycleAssignment,
} from "@/components/Performance/performanceCycles";
import type { AppraisalTemplate } from "@/components/Performance/performanceTemplates";
import type {
  DepartmentResponseDto,
  PositionResponseDto,
} from "@/types/organization-structure";
import { positionsApi } from "@/lib/api/organization-structure/positions.api";

interface AssignmentRow {
  employeeNumber: string;
  employeeProfileId: string;
  managerNumber: string;
  managerProfileId: string;
  departmentId: string;
  positionId: string;
  templateId: string;
  dueDate: string;
  employeeValidating?: boolean;
  employeeError?: string;
  managerValidating?: boolean;
  managerError?: string;
}

export default function BulkAssignmentPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [cycleId, setCycleId] = useState("");
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([
    {
      employeeNumber: "",
      employeeProfileId: "",
      managerNumber: "",
      managerProfileId: "",
      departmentId: "",
      positionId: "",
      templateId: "",
      dueDate: "",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const [cyclesData, templatesData, deptsData, posData] = await Promise.all(
        [
          fetchAppraisalCycles(),
          fetchAppraisalTemplates(),
          departmentsApi.getAllDepartments({ isActive: true }),
          positionsApi.getAllPositions({ isActive: true }),
        ]
      );

      setCycles(Array.isArray(cyclesData) ? cyclesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setPositions(Array.isArray(posData) ? posData : []);
    } catch (error: any) {
      console.error("Failed to load options:", error);
      showToast(error.message || "Failed to load options", "error");
    } finally {
      setLoading(false);
    }
  };

  const validateEmployeeNumber = async (
    employeeNumber: string,
    rowIndex: number
  ): Promise<string | null> => {
    if (!employeeNumber.trim()) return "Employee number is required";

    try {
      const employee = await employeeProfileApi.getEmployeeByNumber(
        employeeNumber.trim()
      );
      if (!employee) return "Employee not found";
      return null;
    } catch (error: any) {
      return error.message || "Employee not found";
    }
  };

  const validateManagerNumber = async (
    managerNumber: string,
    rowIndex: number
  ): Promise<string | null> => {
    if (!managerNumber.trim()) return "Manager number is required";

    try {
      const manager = await employeeProfileApi.getEmployeeByNumber(
        managerNumber.trim()
      );
      if (!manager) return "Manager not found";

      // A manager is valid if they have a position (primaryPositionId)
      // The organizational structure (supervisorPositionId) determines actual reporting relationships
      // Any employee with a position can potentially be a manager if other employees report to their position
      const managerObj = manager as any;
      const hasPosition = !!(
        managerObj.primaryPositionId || managerObj.primaryPosition
      );

      if (!hasPosition) {
        return "Employee must have a position to be assigned as a manager";
      }

      // If they have a position, they're valid as a manager
      // The actual reporting relationship is determined by supervisorPositionId in the organizational structure
      return null;
    } catch (error: any) {
      return error.message || "Manager not found";
    }
  };

  const handleEmployeeNumberChange = async (
    value: string,
    rowIndex: number
  ) => {
    const updated = [...assignmentRows];
    updated[rowIndex].employeeNumber = value;
    updated[rowIndex].employeeProfileId = "";
    updated[rowIndex].employeeError = undefined;
    updated[rowIndex].employeeValidating = true;
    setAssignmentRows(updated);

    if (value.trim()) {
      const error = await validateEmployeeNumber(value, rowIndex);
      if (error) {
        updated[rowIndex].employeeError = error;
        updated[rowIndex].employeeValidating = false;
        setAssignmentRows(updated);
        return;
      }

      try {
        const employee = await employeeProfileApi.getEmployeeByNumber(
          value.trim()
        );
        if (employee && typeof employee === "object" && "_id" in employee) {
          const emp = employee as any;
          updated[rowIndex].employeeProfileId =
            emp._id || emp.id || "";
          updated[rowIndex].departmentId =
            (emp.primaryDepartmentId as any)?._id?.toString() ||
            (emp.primaryDepartmentId as any)?.toString() ||
            emp.primaryDepartmentId ||
            "";
        }
      } catch (err) {
        updated[rowIndex].employeeError = "Failed to load employee";
      }
    }

    updated[rowIndex].employeeValidating = false;
    setAssignmentRows(updated);
  };

  const handleManagerNumberChange = async (value: string, rowIndex: number) => {
    const updated = [...assignmentRows];
    updated[rowIndex].managerNumber = value;
    updated[rowIndex].managerProfileId = "";
    updated[rowIndex].managerError = undefined;
    updated[rowIndex].managerValidating = true;
    setAssignmentRows(updated);

    if (value.trim()) {
      const error = await validateManagerNumber(value, rowIndex);
      if (error) {
        updated[rowIndex].managerError = error;
        updated[rowIndex].managerValidating = false;
        setAssignmentRows(updated);
        return;
      }

      try {
        const manager = await employeeProfileApi.getEmployeeByNumber(
          value.trim()
        );
        if (manager && typeof manager === "object" && "_id" in manager) {
          const mgr = manager as any;
          updated[rowIndex].managerProfileId = mgr._id || mgr.id || "";
        }
      } catch (err) {
        updated[rowIndex].managerError = "Failed to load manager";
      }
    }

    updated[rowIndex].managerValidating = false;
    setAssignmentRows(updated);
  };

  const addRow = () => {
    setAssignmentRows([
      ...assignmentRows,
      {
        employeeNumber: "",
        employeeProfileId: "",
        managerNumber: "",
        managerProfileId: "",
        departmentId: "",
        positionId: "",
        templateId: "",
        dueDate: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (assignmentRows.length > 1) {
      setAssignmentRows(assignmentRows.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cycleId) {
      showToast("Please select an appraisal cycle", "error");
      return;
    }

    // Validate all rows
    for (let i = 0; i < assignmentRows.length; i++) {
      const row = assignmentRows[i];
      if (!row.employeeProfileId) {
        showToast(
          `Row ${i + 1}: Please enter a valid employee number`,
          "error"
        );
        return;
      }
      if (!row.managerProfileId) {
        showToast(`Row ${i + 1}: Please enter a valid manager number`, "error");
        return;
      }
      if (!row.departmentId) {
        showToast(`Row ${i + 1}: Please select a department`, "error");
        return;
      }
      if (!row.templateId) {
        showToast(`Row ${i + 1}: Please select a template`, "error");
        return;
      }
    }

    try {
      setSubmitting(true);

      const assignments: CycleAssignment[] = assignmentRows.map((row) => ({
        employeeProfileId: row.employeeProfileId,
        managerProfileId: row.managerProfileId,
        departmentId: row.departmentId,
        positionId: row.positionId || undefined,
        templateId: row.templateId,
        dueDate: row.dueDate || undefined,
      }));

      await createBulkAssignments({
        cycleId,
        assignments,
      });

      showToast(
        `Successfully created ${assignments.length} assignment(s)`,
        "success"
      );
      router.push("/dashboard/performance/assignments");
    } catch (error: any) {
      showToast(error.message || "Failed to create bulk assignments", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCycle = cycles.find((c) => {
    const cId = c._id || c.id || "";
    return cId === cycleId;
  });

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_MANAGER,
        SystemRole.HR_EMPLOYEE,
        SystemRole.HR_ADMIN,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white-900">
              Bulk Assignment
            </h1>
            <p className="text-gray-600 mt-1">
              Add multiple appraisal assignments to an existing cycle
            </p>
          </div>
          <Link href="/dashboard/performance/assignments">
            <Button variant="outline">Back to Assignments</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>
              Select a cycle and add multiple employee-manager assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cycle Selection */}
                <div>
                  <Select
                    label="Appraisal Cycle *"
                    value={cycleId}
                    onChange={(e) => setCycleId(e.target.value)}
                    options={[
                      { value: "", label: "Select cycle" },
                      ...cycles.map((cycle) => ({
                        value: cycle._id || cycle.id || "",
                        label: `${cycle.name} (${cycle.cycleType})`,
                      })),
                    ]}
                    placeholder="Select appraisal cycle"
                    className="text-gray-900"
                  />
                  {selectedCycle && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cycle dates:{" "}
                      {new Date(selectedCycle.startDate).toLocaleDateString()} -{" "}
                      {new Date(selectedCycle.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Assignment Rows */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Assignments
                    </h3>
                    <Button
                      type="button"
                      onClick={addRow}
                      variant="outline"
                      className="text-sm"
                    >
                      + Add Row
                    </Button>
                  </div>

                  {assignmentRows.map((row, index) => (
                    <Card key={index} className="bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium text-gray-900">
                            Assignment {index + 1}
                          </h4>
                          {assignmentRows.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeRow(index)}
                              variant="outline"
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Input
                              label="Employee Number *"
                              placeholder="Enter employee number"
                              value={row.employeeNumber}
                              onChange={(e) =>
                                handleEmployeeNumberChange(
                                  e.target.value,
                                  index
                                )
                              }
                              className="text-gray-900"
                            />
                            {row.employeeValidating && (
                              <p className="text-xs text-blue-600 mt-1">
                                Validating...
                              </p>
                            )}
                            {row.employeeError && (
                              <p className="text-xs text-red-600 mt-1">
                                {row.employeeError}
                              </p>
                            )}
                          </div>

                          <div>
                            <Input
                              label="Manager Number *"
                              placeholder="Enter manager employee number"
                              value={row.managerNumber}
                              onChange={(e) =>
                                handleManagerNumberChange(e.target.value, index)
                              }
                              className="text-gray-900"
                            />
                            {row.managerValidating && (
                              <p className="text-xs text-blue-600 mt-1">
                                Validating...
                              </p>
                            )}
                            {row.managerError && (
                              <p className="text-xs text-red-600 mt-1">
                                {row.managerError}
                              </p>
                            )}
                          </div>

                          <div>
                            <Select
                              label="Department *"
                              value={row.departmentId}
                              onChange={(e) => {
                                const updated = [...assignmentRows];
                                updated[index].departmentId = e.target.value;
                                updated[index].positionId = "";
                                setAssignmentRows(updated);
                              }}
                              options={[
                                { value: "", label: "Select department" },
                                ...departments.map((dept) => ({
                                  value: typeof dept._id === "string" ? dept._id : (dept._id as any)?.toString() || "",
                                  label: dept.name || "Unknown",
                                })),
                              ]}
                              placeholder="Select department"
                              className="text-gray-900"
                            />
                          </div>

                          <div>
                            <Select
                              label="Position (optional)"
                              value={row.positionId}
                              onChange={(e) => {
                                const updated = [...assignmentRows];
                                updated[index].positionId = e.target.value;
                                setAssignmentRows(updated);
                              }}
                              options={[
                                {
                                  value: "",
                                  label: "Select position (optional)",
                                },
                                ...positions
                                  .filter((pos) => {
                                    const posDeptId =
                                      (
                                        pos.departmentId as any
                                      )?._id?.toString() ||
                                      (pos.departmentId as any)?.toString() ||
                                      pos.departmentId;
                                    return posDeptId === row.departmentId;
                                  })
                                  .map((pos) => ({
                                    value: typeof pos._id === "string" ? pos._id : (pos._id as any)?.toString() || "",
                                    label: pos.title || "Unknown Position",
                                  })),
                              ]}
                              placeholder="Select position"
                              className="text-gray-900"
                            />
                          </div>

                          <div>
                            <Select
                              label="Template *"
                              value={row.templateId}
                              onChange={(e) => {
                                const updated = [...assignmentRows];
                                updated[index].templateId = e.target.value;
                                setAssignmentRows(updated);
                              }}
                              options={[
                                { value: "", label: "Select template" },
                                ...templates.map((template) => ({
                                  value: template._id || template.id || "",
                                  label: `${template.name} (${template.templateType})`,
                                })),
                              ]}
                              placeholder="Select template"
                              className="text-gray-900"
                            />
                          </div>

                          <div>
                            <Input
                              label="Due Date (optional)"
                              type="date"
                              value={row.dueDate}
                              onChange={(e) => {
                                const updated = [...assignmentRows];
                                updated[index].dueDate = e.target.value;
                                setAssignmentRows(updated);
                              }}
                              className="text-gray-900"
                            />
                            {selectedCycle && !row.dueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Default:{" "}
                                {selectedCycle.managerDueDate
                                  ? new Date(
                                      selectedCycle.managerDueDate
                                    ).toLocaleDateString()
                                  : new Date(
                                      selectedCycle.endDate
                                    ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Link href="/dashboard/performance/assignments">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    isLoading={submitting}
                    variant="primary"
                  >
                    Create {assignmentRows.length} Assignment
                    {assignmentRows.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
