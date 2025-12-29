"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  Onboarding,
  CreateOnboardingDto,
  UpdateOnboardingDto,
  UpdateOnboardingTaskDto,
  OnboardingTask,
  OnboardingTaskStatus,
} from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

export default function HROnboardingPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState<Onboarding | null>(null);
  const [createForm, setCreateForm] = useState<CreateOnboardingDto>({
    employeeId: "",
    contractId: "",
    tasks: [],
  });
  const [taskForm, setTaskForm] = useState<OnboardingTask>({
    name: "",
    department: "",
    status: OnboardingTaskStatus.PENDING,
    deadline: "",
  });

  // CHANGED - Check user roles for task permissions
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isHREmployee = user?.roles?.includes(SystemRole.HR_EMPLOYEE);
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);

  // CHANGED - Check if a task is a document upload task (done by New Hire, not HR)
  const isDocumentUploadTask = (taskName: string): boolean => {
    const name = taskName.toLowerCase();
    return name.includes('upload') || 
           name.includes('document') || 
           name.includes('id document') ||
           name.includes('certification') ||
           name.includes('contract');
  };

  // CHANGED - Determine if user can update a specific task based on USER STORIES
  // Candidate/New Hire: Upload documents (ID, contracts, certifications)
  // System Admin: Provision system access (email, SSO, payroll access, internal systems)
  // HR Employee: Reserve equipment, desk, access cards ONLY
  // HR Manager: VIEW ONLY (creates checklist and employee profile, but doesn't complete tasks)
  // Automatic: Payroll initiation, signing bonus (no one manually completes)
  const canUpdateTask = (taskDepartment: string, taskName: string): boolean => {
    const nameLower = taskName.toLowerCase();
    
    // Document upload tasks are ONLY for the Candidate/New Hire
    if (isDocumentUploadTask(taskName)) {
      return false; // Staff can't complete - only candidate can upload
    }

    // Automatic tasks - no one manually completes these
    if (nameLower.includes('payroll') || nameLower.includes('signing bonus') || 
        nameLower.includes('benefits')) {
      return false; // System handles automatically
    }

    // System Admin tasks (ONB-009): email, SSO, system access, internal systems
    const isSystemAdminTask = nameLower.includes('email account') || nameLower.includes('email') ||
      nameLower.includes('sso') || nameLower.includes('system access') || 
      nameLower.includes('internal systems') || taskDepartment === 'IT';

    // HR Employee tasks (ONB-012): equipment, desk, badge, access card ONLY
    const isHREmployeeTask = nameLower.includes('laptop') || nameLower.includes('equipment') ||
      nameLower.includes('workspace') || nameLower.includes('desk') ||
      nameLower.includes('badge') || nameLower.includes('access card');

    // System Admin can complete System Admin tasks
    if (isSystemAdmin && isSystemAdminTask) {
      return true;
    }
    
    // HR Employee can complete HR Employee tasks (equipment only)
    if (isHREmployee && isHREmployeeTask) {
      return true;
    }
    
    // HR Manager = VIEW ONLY (per user story)
    return false;
  };

  // CHANGED - Get label for who should complete this task (based on USER STORIES)
  const getTaskResponsibleRole = (taskDepartment: string, taskName: string): string => {
    const nameLower = taskName.toLowerCase();
    
    // Document upload tasks - Candidate/New Hire (ONB-007)
    if (isDocumentUploadTask(taskName)) {
      return 'Candidate/New Hire (ONB-007)';
    }
    
    // Automatic tasks - System handles (ONB-018, ONB-019)
    if (nameLower.includes('payroll') || nameLower.includes('signing bonus')) {
      return 'Automatic (System)';
    }
    if (nameLower.includes('benefits')) {
      return 'Automatic (System)';
    }
    
    // System Admin tasks - email, SSO, system access (ONB-009)
    if (nameLower.includes('email') || nameLower.includes('sso') || 
        nameLower.includes('system access') || nameLower.includes('internal systems') ||
        taskDepartment === 'IT') {
      return 'System Admin (ONB-009)';
    }
    
    // HR Employee tasks - equipment, desk, badge, access card (ONB-012)
    if (nameLower.includes('laptop') || nameLower.includes('equipment') ||
        nameLower.includes('workspace') || nameLower.includes('desk') ||
        nameLower.includes('badge') || nameLower.includes('access card')) {
      return 'HR Employee (ONB-012)';
    }
    
    return taskDepartment;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await recruitmentApi.getAllOnboardings();
      setOnboardings(data);
    } catch (error: any) {
      showToast(error.message || "Failed to load onboardings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({
      employeeId: "",
      contractId: "",
      tasks: [],
    });
    setIsCreateModalOpen(true);
  };

  // CHANGED - Added validation and better error handling
  const handleCreateOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CHANGED - Validate employee ID format (MongoDB ObjectId is 24 hex characters)
    const employeeId = createForm.employeeId.trim();
    if (!employeeId) {
      showToast("Please enter an Employee ID", "error");
      return;
    }
    
    // CHANGED - Check if it looks like a valid MongoDB ObjectId
    const mongoIdRegex = /^[a-fA-F0-9]{24}$/;
    if (!mongoIdRegex.test(employeeId)) {
      showToast("Invalid Employee ID format. Must be a 24-character MongoDB ObjectId (e.g., 507f1f77bcf86cd799439011)", "error");
      return;
    }
    
    try {
      // CHANGED - Debug logging
      console.log("🔍 Creating onboarding with:", {
        employeeId,
        contractId: createForm.contractId || undefined,
        tasksCount: (createForm.tasks || []).length,
      });
      
      // Backend requires tasks array (can be empty initially)
      const onboardingData: CreateOnboardingDto = {
        employeeId: employeeId,
        contractId: createForm.contractId || undefined,
        tasks: createForm.tasks || [], // Ensure tasks array is present
      };
      
      await recruitmentApi.createOnboarding(onboardingData);
      showToast("Onboarding created successfully", "success");
      setIsCreateModalOpen(false);
      loadData();
    } catch (error: any) {
      // CHANGED - Better error display
      console.error("Create onboarding error:", error);
      const errorMessage = error.message || "Failed to create onboarding";
      showToast(errorMessage, "error");
    }
  };

  const handleOpenAddTask = (onboarding: Onboarding) => {
    setSelectedOnboarding(onboarding);
    setTaskForm({
      name: "",
      department: "",
      status: OnboardingTaskStatus.PENDING,
      deadline: "",
    });
    setIsTaskModalOpen(true);
  };

  const handleAddTask = async () => {
    if (!selectedOnboarding) return;
    try {
      await recruitmentApi.addTaskToOnboarding(selectedOnboarding._id, taskForm);
      showToast("Task added successfully", "success");
      setIsTaskModalOpen(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to add task", "error");
    }
  };

  const handleUpdateTask = async (onboardingId: string, taskIndex: number, data: UpdateOnboardingTaskDto) => {
    try {
      await recruitmentApi.updateOnboardingTask(onboardingId, taskIndex, data);
      showToast("Task updated successfully", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to update task", "error");
    }
  };

  const handleSendReminders = async () => {
    try {
      await recruitmentApi.sendOnboardingReminders();
      showToast("Reminders sent successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to send reminders", "error");
    }
  };

  const getProgressPercentage = (onboarding: Onboarding): number => {
    if (!onboarding.tasks || onboarding.tasks.length === 0) return 0;
    const completed = onboarding.tasks.filter(
      (task) => task.status === OnboardingTaskStatus.COMPLETED
    ).length;
    return Math.round((completed / onboarding.tasks.length) * 100);
  };

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
              ← Back to Recruitment
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Onboarding Management</h1>
            <p className="text-gray-600 mt-1">Manage new hire onboarding processes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSendReminders}>
              Send Reminders
            </Button>
            <Button onClick={handleOpenCreate}>Create Onboarding</Button>
          </div>
        </div>

        {/* CHANGED - Permission Legend (Based on User Stories) */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Task Responsibilities (User Stories)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Candidate</span>
                <span className="text-gray-600">→ Upload Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">System Admin</span>
                <span className="text-gray-600">→ Email, SSO, Access</span>
                {isSystemAdmin && <span className="text-green-600 text-xs">✓ You</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">HR Employee</span>
                <span className="text-gray-600">→ Equipment, Desk, Badge</span>
                {isHREmployee && <span className="text-green-600 text-xs">✓ You</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">HR Manager</span>
                <span className="text-gray-600">→ VIEW ONLY</span>
                {isHRManager && !isHREmployee && !isSystemAdmin && <span className="text-orange-600 text-xs">✓ You</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Automatic</span>
                <span className="text-gray-600">→ Payroll, Bonus</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading onboardings...</p>
          </div>
        ) : onboardings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No onboarding records found.</p>
              <Button onClick={handleOpenCreate}>Create Onboarding</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {onboardings.map((onboarding) => (
              <Card key={onboarding._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Employee Name - Prominent Display */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {(onboarding.employee?.fullName || onboarding.employee?.firstName || 'E')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-xl text-gray-900">
                            {onboarding.employee?.fullName || 
                             `${onboarding.employee?.firstName || ''} ${onboarding.employee?.lastName || ''}`.trim() || 
                             'Unknown Employee'}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            {onboarding.employee?.employeeNumber && (
                              <span className="font-medium">#{onboarding.employee.employeeNumber}</span>
                            )}
                            {onboarding.employee?.workEmail && (
                              <span className="ml-2">• {onboarding.employee.workEmail}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <CardDescription className="mt-1">
                        Progress: {getProgressPercentage(onboarding)}% •{" "}
                        {onboarding.tasks?.length || 0} tasks
                      </CardDescription>
                    </div>
                    {/* REMOVED: Add Task button removed for all users per user request */}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(onboarding)}%` }}
                      />
                    </div>
                  </div>
                  {onboarding.tasks && onboarding.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {onboarding.tasks.map((task, index) => {
                        const userCanUpdate = canUpdateTask(task.department, task.name);
                        const responsibleRole = getTaskResponsibleRole(task.department, task.name);
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-3 border rounded ${
                              userCanUpdate ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {/* Task name with department icon */}
                                <span className="text-lg">
                                  {task.department === 'IT' ? '💻' : 
                                   task.department === 'HR' ? '👥' : '📋'}
                                </span>
                                <span className="font-medium text-gray-900">{task.name}</span>
                                <StatusBadge status={task.status} type="onboarding" />
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${
                                  task.department === 'IT' ? 'bg-blue-100 text-blue-800' :
                                  task.department === 'HR' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {responsibleRole}
                                </span>
                                {task.deadline && `Deadline: ${new Date(task.deadline).toLocaleDateString()}`}
                              </p>
                              {task.notes && (
                                <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              {userCanUpdate ? (
                                /* User can update - show dropdown */
                                <Select
                                  value={task.status}
                                  onChange={(e) =>
                                    handleUpdateTask(onboarding._id, index, {
                                      status: e.target.value as OnboardingTaskStatus,
                                    })
                                  }
                                  className="w-32"
                                  options={[
                                    { value: OnboardingTaskStatus.PENDING, label: "Pending" },
                                    { value: OnboardingTaskStatus.IN_PROGRESS, label: "In Progress" },
                                    { value: OnboardingTaskStatus.COMPLETED, label: "Completed" },
                                  ]}
                                />
                              ) : (
                                /* User cannot update - show view-only badge */
                                <span className="text-xs text-gray-400 italic">
                                  View only
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No tasks assigned yet.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Onboarding Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Onboarding"
        >
          <form onSubmit={handleCreateOnboarding}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <Input
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  placeholder="24-character MongoDB ObjectId"
                  required
                />
                {/* CHANGED - Added helper text */}
                <p className="text-xs text-gray-500 mt-1">
                  Enter the employee's MongoDB ObjectId (24 hex characters). 
                  You can find this in the Employee Profile database.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract ID (Optional)
                </label>
                <Input
                  value={createForm.contractId || ""}
                  onChange={(e) => setCreateForm({ ...createForm, contractId: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Modal>

        {/* Add Task Modal */}
        <Modal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          title="Add Onboarding Task"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <Input
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <Input
                value={taskForm.department}
                onChange={(e) => setTaskForm({ ...taskForm, department: e.target.value })}
                required
              />
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <Input
                  type="date"
                  value={taskForm.deadline ? new Date(taskForm.deadline).toISOString().split('T')[0] : ""}
                  onChange={(e) => {
                    // Convert date to ISO string for backend
                    const date = e.target.value;
                    if (date) {
                      setTaskForm({ ...taskForm, deadline: new Date(date).toISOString() });
                    } else {
                      setTaskForm({ ...taskForm, deadline: undefined });
                    }
                  }}
                />
              </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTaskModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddTask}>Add Task</Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

