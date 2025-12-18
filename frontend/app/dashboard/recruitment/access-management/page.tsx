"use client";

// CHANGED - New page for System Admin Access Management (ONB-009, ONB-013, OFF-007)

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Toast, useToast } from "@/components/leaves/Toast";
import { AlertCircle, CheckCircle, Clock, User } from "lucide-react";

interface Employee {
  _id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail?: string;
  department?: string;
  position?: string;
  status: string;
}

interface OnboardingTask {
  name: string;
  department: string;
  status: string;
  deadline?: string;
  notes?: string;
}

interface OnboardingInfo {
  _id: string;
  employeeId: string | { _id: string; firstName?: string; lastName?: string; fullName?: string; employeeNumber?: string };
  employee?: { _id: string; firstName?: string; lastName?: string; fullName?: string; employeeNumber?: string };
  tasks: OnboardingTask[];
  status: string;
}

// CHANGED - New interface for pending IT tasks across all onboardings
interface PendingITTask {
  onboardingId: string;
  taskIndex: number;
  taskName: string;
  taskStatus: string;
  deadline?: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
}

export default function AccessManagementPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [processing, setProcessing] = useState(false);
  // CHANGED - Add state for pending IT tasks across all onboardings
  const [pendingITTasks, setPendingITTasks] = useState<PendingITTask[]>([]);
  const [loadingPendingTasks, setLoadingPendingTasks] = useState(true);

  // Check if user is System Admin
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);

  useEffect(() => {
    loadEmployees();
    loadAllPendingITTasks();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await recruitmentApi.getAllEmployees();
      // CHANGED - Backend returns { message, data, meta }, extract data array
      const employeeList = response?.data || response || [];
      setEmployees(Array.isArray(employeeList) ? employeeList : []);
    } catch (error: any) {
      showToast(error.message || "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED - Load all pending IT tasks from all onboardings (ONB-009)
  const loadAllPendingITTasks = async () => {
    try {
      setLoadingPendingTasks(true);
      const onboardings = await recruitmentApi.getAllOnboardings();
      const allPendingTasks: PendingITTask[] = [];

      for (const onboarding of onboardings) {
        // FIXED - Use 'employee' field which contains the populated data from backend
        const employee = onboarding.employee;
        const employeeName = employee?.fullName || 
          `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 
          'Unknown Employee';
        const employeeNumber = employee?.employeeNumber || 'N/A';
        // employeeId is now a string from the backend transformation
        const employeeId = onboarding.employeeId || employee?._id;

        // Find IT department tasks that are not completed
        onboarding.tasks?.forEach((task: OnboardingTask, index: number) => {
          if (task.department === 'IT' && task.status !== 'COMPLETED' && task.status !== 'completed') {
            allPendingTasks.push({
              onboardingId: onboarding._id,
              taskIndex: index,
              taskName: task.name,
              taskStatus: task.status,
              deadline: task.deadline,
              employeeId: employeeId,
              employeeName: employeeName,
              employeeNumber: employeeNumber,
            });
          }
        });
      }

      setPendingITTasks(allPendingTasks);
    } catch (error: any) {
      console.error("Failed to load pending IT tasks:", error);
    } finally {
      setLoadingPendingTasks(false);
    }
  };

  // CHANGED - Complete an IT task directly from the pending list
  const handleCompleteITTask = async (task: PendingITTask) => {
    try {
      setProcessing(true);
      // Use lowercase 'completed' to match backend enum
      await recruitmentApi.updateOnboardingTaskStatus(
        task.onboardingId,
        task.taskIndex,
        'completed'
      );
      showToast(`Task "${task.taskName}" completed for ${task.employeeName}`, "success");
      // Reload the pending tasks list
      await loadAllPendingITTasks();
    } catch (error: any) {
      showToast(error.message || "Failed to complete task", "error");
    } finally {
      setProcessing(false);
    }
  };

  const loadOnboardingInfo = async (employeeId: string) => {
    try {
      const data = await recruitmentApi.getOnboardingByEmployeeId(employeeId);
      // CHANGED - Check if data is valid (not empty object or null)
      if (data && data._id && data.tasks) {
        setOnboardingInfo(data);
      } else {
        setOnboardingInfo(null);
      }
    } catch (error: any) {
      // CHANGED - Employee might not have onboarding record (404 is expected)
      // Don't show error toast for "not found" errors
      console.log("No onboarding found for employee (this is normal for existing employees)");
      setOnboardingInfo(null);
    }
  };

  const handleSelectEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setRevokeReason("");
    setOnboardingInfo(null); // CHANGED - Reset onboarding info while loading
    await loadOnboardingInfo(employee._id);
  };

  // CHANGED - ONB-009: Provision system access for an employee
  const handleProvisionAccess = async (taskIndex: number) => {
    if (!selectedEmployee || !onboardingInfo) return;

    try {
      setProcessing(true);
      await recruitmentApi.provisionSystemAccess(selectedEmployee._id, taskIndex);
      showToast("System access provisioned successfully", "success");
      // Reload onboarding info to see updated task status
      await loadOnboardingInfo(selectedEmployee._id);
    } catch (error: any) {
      showToast(error.message || "Failed to provision access", "error");
    } finally {
      setProcessing(false);
    }
  };

  // CHANGED - OFF-007: Revoke system access for an employee
  const handleRevokeAccess = async () => {
    if (!selectedEmployee) return;

    if (!revokeReason.trim()) {
      showToast("Please provide a reason for revoking access", "error");
      return;
    }

    try {
      setProcessing(true);
      await recruitmentApi.revokeSystemAccess(selectedEmployee.employeeNumber, revokeReason);
      showToast("System access revoked successfully", "success");
      setRevokeReason("");
      // Reload employee list to see updated status
      await loadEmployees();
      setSelectedEmployee(null);
      setOnboardingInfo(null);
    } catch (error: any) {
      showToast(error.message || "Failed to revoke access", "error");
    } finally {
      setProcessing(false);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.employeeNumber?.toLowerCase().includes(searchLower) ||
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.workEmail?.toLowerCase().includes(searchLower) ||
      emp.department?.toLowerCase().includes(searchLower)
    );
  });

  // Get IT-related tasks from onboarding
  const itTasks = onboardingInfo?.tasks?.filter(
    (task) => task.department === "IT"
  ) || [];

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
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
          <h1 className="text-3xl font-bold text-gray-900">Access Management</h1>
          <p className="text-gray-600 mt-1">
            Provision or revoke system access for employees (ONB-009, ONB-013, OFF-007)
          </p>
        </div>

        {/* CHANGED - Pending IT Tasks Section (ONB-009) */}
        <Card className="mb-8 border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending IT Tasks ({pendingITTasks.length})
            </CardTitle>
            <CardDescription className="text-orange-700">
              IT provisioning tasks that need your attention (ONB-009)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPendingTasks ? (
              <p className="text-gray-500 text-center py-4">Loading pending tasks...</p>
            ) : pendingITTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">All IT tasks are completed!</p>
                <p className="text-gray-500 text-sm">No pending access provisioning tasks</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingITTasks.map((task, index) => (
                  <div
                    key={`${task.onboardingId}-${task.taskIndex}`}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{task.employeeName}</span>
                        <span className="text-sm text-gray-500">#{task.employeeNumber}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-orange-800">{task.taskName}</span>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          task.taskStatus === 'PENDING' || task.taskStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.taskStatus}
                        </span>
                      </div>
                      {task.deadline && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Deadline: {new Date(task.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCompleteITTask(task)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processing ? "..." : "Complete"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Employees</CardTitle>
                <CardDescription>Select an employee to manage access</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />

                {loading ? (
                  <p className="text-gray-500 text-center py-4">Loading employees...</p>
                ) : filteredEmployees.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No employees found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp._id}
                        onClick={() => handleSelectEmployee(emp)}
                        className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                          selectedEmployee?._id === emp._id
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {emp.employeeNumber}
                        </div>
                        <div className="text-xs text-gray-400">
                          {emp.department || "No Department"}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            emp.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Access Management Panel */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <div className="space-y-6">
                {/* Employee Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </CardTitle>
                    <CardDescription>
                      Employee Number: {selectedEmployee.employeeNumber}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2">{selectedEmployee.workEmail || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Department:</span>
                        <span className="ml-2">{selectedEmployee.department || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Position:</span>
                        <span className="ml-2">{selectedEmployee.position || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                            selectedEmployee.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedEmployee.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Provision Access - ONB-009 */}
                {selectedEmployee.status === "ACTIVE" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-700">Provision Access (ONB-009)</CardTitle>
                      <CardDescription>
                        Grant system access to the employee via onboarding tasks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {onboardingInfo ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 mb-4">
                            IT Tasks from Onboarding Checklist:
                          </p>
                          {itTasks.length > 0 ? (
                            itTasks.map((task, index) => {
                              // Find the actual index in the full tasks array
                              const taskIndex = onboardingInfo.tasks.findIndex(
                                (t) => t.name === task.name && t.department === task.department
                              );
                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    {/* CHANGED - Added text-gray-900 for visibility */}
                                    <div className="font-medium text-gray-900">{task.name}</div>
                                    <div className="text-xs text-gray-500">
                                      Status: {task.status}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleProvisionAccess(taskIndex)}
                                    disabled={processing || task.status === "completed"}
                                    className={
                                      task.status === "completed"
                                        ? "bg-gray-400"
                                        : "bg-green-600 hover:bg-green-700"
                                    }
                                  >
                                    {task.status === "completed" ? "Completed" : "Provision"}
                                  </Button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-500">No IT tasks found in onboarding.</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          No onboarding record found for this employee.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Revoke Access - OFF-007 */}
                {selectedEmployee.status === "ACTIVE" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-700">Revoke Access (OFF-007)</CardTitle>
                      <CardDescription>
                        Revoke system and account access upon termination
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Revocation *
                          </label>
                          <textarea
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder="Enter the reason for revoking access..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleRevokeAccess}
                          disabled={processing || !revokeReason.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {processing ? "Processing..." : "Revoke System Access"}
                        </Button>
                        <p className="text-xs text-gray-500">
                          Warning: This will set the employee status to INACTIVE and revoke all system access.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Already Inactive */}
                {selectedEmployee.status !== "ACTIVE" && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-gray-500">
                        This employee is currently <strong>{selectedEmployee.status}</strong>.
                        System access has already been revoked.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    Select an employee from the list to manage their system access.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

