"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole, EmployeeProfile } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { Shield, Search, Check, X, User, Loader2 } from "lucide-react";

interface EmployeeWithRoles extends EmployeeProfile {
  systemRoles?: {
    roles: SystemRole[];
    permissions: string[];
    isActive: boolean;
  };
}

export default function RoleAssignmentPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [employees, setEmployees] = useState<EmployeeWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<SystemRole[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // All available system roles (excluding JOB_CANDIDATE)
  const allRoles = useMemo(() => {
    return Object.values(SystemRole).filter(
      (role) => role !== SystemRole.JOB_CANDIDATE
    );
  }, []);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeProfileApi.getAllEmployees({
        limit: 1000, // Get all employees
      });
      setEmployees(response.data || []);
    } catch (error: any) {
      showToast(error.message || "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = async (employee: EmployeeWithRoles) => {
    setSelectedEmployee(employee);
    setLoadingRoles(true);
    try {
      const rolesData = await employeeProfileApi.getEmployeeRoles(
        employee.id || employee._id || ""
      );
      setSelectedRoles(rolesData.roles || []);
    } catch (error: any) {
      // If no roles exist, start with empty array
      setSelectedRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const toggleRole = (role: SystemRole) => {
    setSelectedRoles((prev) => {
      const newRoles = prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role];
      // Ensure at least one role is selected
      if (newRoles.length === 0) {
        showToast("Employee must have at least one role", "error");
        return prev;
      }
      return newRoles;
    });
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;

    const employeeId = selectedEmployee.id || selectedEmployee._id || "";
    if (!employeeId) {
      showToast("Invalid employee ID", "error");
      return;
    }

    try {
      setSaving(true);
      await employeeProfileApi.assignRoles(
        employeeId,
        selectedRoles,
        [] // Permissions can be added later if needed
      );
      showToast("Roles assigned successfully", "success");
      // Reload employee roles
      await handleEmployeeSelect(selectedEmployee);
      // Reload employees list
      await loadEmployees();
    } catch (error: any) {
      showToast(error.message || "Failed to assign roles", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.fullName?.toLowerCase().includes(term) ||
        emp.employeeNumber?.toLowerCase().includes(term) ||
        emp.workEmail?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const getRoleDescription = (role: SystemRole): string => {
    const descriptions: Record<SystemRole, string> = {
      [SystemRole.DEPARTMENT_EMPLOYEE]: "Basic employee access",
      [SystemRole.DEPARTMENT_HEAD]: "Team management and reporting",
      [SystemRole.HR_MANAGER]: "HR operations and management",
      [SystemRole.HR_EMPLOYEE]: "HR support and assistance",
      [SystemRole.HR_ADMIN]: "HR configuration and administration",
      [SystemRole.PAYROLL_SPECIALIST]: "Payroll processing",
      [SystemRole.PAYROLL_MANAGER]: "Payroll management",
      [SystemRole.SYSTEM_ADMIN]: "Full system administration access",
      [SystemRole.LEGAL_POLICY_ADMIN]: "Legal and policy management",
      [SystemRole.RECRUITER]: "Recruitment and hiring",
      [SystemRole.FINANCE_STAFF]: "Finance operations",
      [SystemRole.JOB_CANDIDATE]: "Job candidate access",
    };
    return descriptions[role] || "System role";
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Role Assignment Management
          </h1>
          <p className="text-gray-600 mt-1">
            Assign and manage system roles for employees
          </p>
        </div>

        <Toast {...toast} onClose={hideToast} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle>Select Employee</CardTitle>
              <CardDescription>
                Search and select an employee to manage their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, employee number, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Employee List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No employees found
                  </div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const isSelected =
                      selectedEmployee?.id === employee.id ||
                      selectedEmployee?._id === employee._id;
                    return (
                      <button
                        key={employee.id || employee._id}
                        onClick={() => handleEmployeeSelect(employee)}
                        className={`w-full text-left p-4 border rounded-lg transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {employee.fullName || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.employeeNumber} • {employee.workEmail}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assign Roles</CardTitle>
              <CardDescription>
                {selectedEmployee
                  ? `Managing roles for ${selectedEmployee.fullName}`
                  : "Select an employee to assign roles"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedEmployee ? (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Select an employee from the list to manage their roles</p>
                </div>
              ) : loadingRoles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current Status */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Current Roles:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoles.length === 0 ? (
                        <span className="text-gray-500 italic">No roles assigned</span>
                      ) : (
                        selectedRoles.map((role) => (
                          <span
                            key={role}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {role}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      Available Roles:
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {allRoles.map((role) => {
                        const isSelected = selectedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRole(role)}
                            className={`w-full text-left p-3 border rounded-lg transition-colors flex items-center justify-between ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {role}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {getRoleDescription(role)}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setSelectedRoles([]);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving || selectedRoles.length === 0}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Roles"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
