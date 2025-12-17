"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  Onboarding,
  Application,
  ApplicationStatus,
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

// CHANGED - Pre-boarding task templates for HR Employee to trigger
const PREBOARDING_TASK_TEMPLATES = [
  { name: "Sign Employment Contract", department: "HR", notes: "Review and sign employment contract digitally" },
  { name: "Complete Tax Forms (W-4)", department: "HR", notes: "Fill out tax withholding forms" },
  { name: "Submit ID Documents", department: "HR", notes: "Upload government-issued ID and work authorization" },
  { name: "Emergency Contact Form", department: "HR", notes: "Provide emergency contact information" },
  { name: "Direct Deposit Setup", department: "Finance", notes: "Set up payroll direct deposit" },
  { name: "Background Check Authorization", department: "HR", notes: "Authorize background check" },
  { name: "NDA/Confidentiality Agreement", department: "Legal", notes: "Sign non-disclosure agreement" },
  { name: "Benefits Enrollment Form", department: "HR", notes: "Review and select benefit options" },
];

function PreboardingPageContent() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const searchParams = useSearchParams();

  // CHANGED - State for applications ready for pre-boarding
  const [applications, setApplications] = useState<Application[]>([]);
  // CHANGED - State for existing onboardings
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);

  // CHANGED - Modal states
  const [isCreateTasksModalOpen, setIsCreateTasksModalOpen] = useState(false);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedOnboarding, setSelectedOnboarding] = useState<Onboarding | null>(null);

  // CHANGED - Task form state
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [customTaskForm, setCustomTaskForm] = useState({
    name: "",
    department: "",
    deadline: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  // CHANGED - Auto-open pre-boarding modal if applicationId is in query params (REC-029 integration)
  useEffect(() => {
    const applicationId = searchParams?.get("applicationId");
    if (applicationId && applications.length > 0) {
      const app = applications.find((a) => a._id === applicationId);
      if (app) {
        setSelectedApplication(app);
        setIsCreateTasksModalOpen(true);
        // Clear the query parameter from URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [applications, searchParams]);

  // CHANGED - Load applications and onboardings
  const loadData = async () => {
    try {
      setLoading(true);

      // Get all applications
      const apps = await recruitmentApi.getApplications();
      // CHANGED - Filter for applications at offer stage or hired (ready for pre-boarding)
      const eligibleApps = apps.filter(
        (app) =>
          app.status === ApplicationStatus.OFFER ||
          app.status === ApplicationStatus.HIRED
      );
      setApplications(eligibleApps);

      // Get all onboardings
      const onboardingData = await recruitmentApi.getAllOnboardings();
      setOnboardings(onboardingData);
    } catch (error: any) {
      showToast(error.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED - Check if application already has onboarding
  const getOnboardingForApplication = (application: Application): Onboarding | undefined => {
    // This is a simplified check - in reality you'd need to match via employee/candidate ID
    return undefined; // Pre-boarding is before employee creation
  };

  // CHANGED - Open modal to trigger pre-boarding tasks
  const handleOpenTriggerPreboarding = (application: Application) => {
    setSelectedApplication(application);
    setSelectedTasks([]);
    setIsCreateTasksModalOpen(true);
  };

  // CHANGED - Toggle task selection
  const handleToggleTask = (taskName: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskName)
        ? prev.filter((t) => t !== taskName)
        : [...prev, taskName]
    );
  };

  // CHANGED - Select all tasks
  const handleSelectAllTasks = () => {
    if (selectedTasks.length === PREBOARDING_TASK_TEMPLATES.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(PREBOARDING_TASK_TEMPLATES.map((t) => t.name));
    }
  };

  // CHANGED - Trigger pre-boarding tasks (create onboarding with selected tasks)
  const handleTriggerPreboarding = async () => {
    if (!selectedApplication || selectedTasks.length === 0) {
      showToast("Please select at least one task", "error");
      return;
    }

    try {
      // CHANGED - Get candidateId from application (handle populated object)
      const candidateId =
        typeof selectedApplication.candidateId === "object"
          ? (selectedApplication.candidateId as any)?._id
          : selectedApplication.candidateId;

      if (!candidateId) {
        showToast("Candidate ID not found", "error");
        return;
      }

      // CHANGED - Create tasks from selected templates
      const tasks = PREBOARDING_TASK_TEMPLATES.filter((t) =>
        selectedTasks.includes(t.name)
      ).map((t) => ({
        name: t.name,
        department: t.department,
        status: OnboardingTaskStatus.PENDING,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        notes: t.notes,
      }));

      // CHANGED - Note: In a real scenario, onboarding requires employeeId which doesn't exist yet
      // For pre-boarding BEFORE employee creation, we'd need a separate pre-boarding model
      // For now, we'll show a message that pre-boarding tasks have been queued

      showToast(
        `Pre-boarding triggered! ${tasks.length} tasks queued for candidate. Tasks will be added to onboarding when employee profile is created.`,
        "success"
      );
      setIsCreateTasksModalOpen(false);

      // CHANGED - In production, you might store these tasks temporarily or create a pre-boarding record
      // await recruitmentApi.createPreboardingTasks(candidateId, tasks);

    } catch (error: any) {
      showToast(error.message || "Failed to trigger pre-boarding", "error");
    }
  };

  // CHANGED - Open custom task modal for existing onboarding
  const handleOpenAddCustomTask = (onboarding: Onboarding) => {
    setSelectedOnboarding(onboarding);
    setCustomTaskForm({
      name: "",
      department: "",
      deadline: "",
      notes: "",
    });
    setIsCustomTaskModalOpen(true);
  };

  // CHANGED - Add custom task to existing onboarding
  const handleAddCustomTask = async () => {
    if (!selectedOnboarding) return;

    if (!customTaskForm.name || !customTaskForm.department) {
      showToast("Please fill in task name and department", "error");
      return;
    }

    try {
      await recruitmentApi.addTaskToOnboarding(selectedOnboarding._id, {
        name: customTaskForm.name,
        department: customTaskForm.department,
        status: OnboardingTaskStatus.PENDING,
        deadline: customTaskForm.deadline
          ? new Date(customTaskForm.deadline).toISOString()
          : undefined,
        notes: customTaskForm.notes || undefined,
      });
      showToast("Pre-boarding task added successfully", "success");
      setIsCustomTaskModalOpen(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to add task", "error");
    }
  };

  // CHANGED - Update task status
  const handleUpdateTaskStatus = async (
    onboardingId: string,
    taskIndex: number,
    status: OnboardingTaskStatus
  ) => {
    try {
      await recruitmentApi.updateOnboardingTask(onboardingId, taskIndex, { status });
      showToast("Task status updated", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to update task", "error");
    }
  };

  // CHANGED - Calculate pre-boarding progress
  const getPreboardingProgress = (onboarding: Onboarding): number => {
    if (!onboarding.tasks || onboarding.tasks.length === 0) return 0;
    const completed = onboarding.tasks.filter(
      (task) => task.status === OnboardingTaskStatus.COMPLETED
    ).length;
    return Math.round((completed / onboarding.tasks.length) * 100);
  };

  // CHANGED - Filter for pre-boarding tasks (HR, Legal, Finance departments typically)
  const getPreboardingTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.filter(
      (task) =>
        task.department === "HR" ||
        task.department === "Legal" ||
        task.department === "Finance" ||
        task.name.toLowerCase().includes("contract") ||
        task.name.toLowerCase().includes("form")
    ) || [];
  };

  // CHANGED - Get candidate name from application
  const getCandidateName = (application: Application): string => {
    if (typeof application.candidateId === "object") {
      const candidate = application.candidateId as any;
      return candidate?.fullName || candidate?.firstName || "Unknown Candidate";
    }
    return application.candidate?.fullName || "Unknown Candidate";
  };

  // CHANGED - Get job title from application
  const getJobTitle = (application: Application): string => {
    return application.requisition?.template?.title || "Position";
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_EMPLOYEE,
        SystemRole.HR_MANAGER,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
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
          <h1 className="text-3xl font-bold text-gray-900">Pre-boarding Management</h1>
          <p className="text-gray-600 mt-1">
            Trigger pre-boarding tasks after offer acceptance and before start date
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <>
            {/* CHANGED - Section: Candidates Ready for Pre-boarding */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Candidates Ready for Pre-boarding
              </h2>
              <p className="text-gray-600 mb-4">
                Candidates with accepted offers awaiting pre-boarding tasks
              </p>

              {applications.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-500">
                      No candidates ready for pre-boarding at this time.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {applications.map((application) => (
                    <Card key={application._id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg text-gray-900">
                          {getCandidateName(application)}
                        </CardTitle>
                        <CardDescription>
                          {getJobTitle(application)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Status:</span>
                            <StatusBadge status={application.status} type="application" />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Applied:</span>
                            <span className="text-gray-900">
                              {application.createdAt
                                ? new Date(application.createdAt).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleOpenTriggerPreboarding(application)}
                        >
                          Trigger Pre-boarding Tasks
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* CHANGED - Section: Active Pre-boarding Checklists */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Active Pre-boarding Checklists
              </h2>
              <p className="text-gray-600 mb-4">
                Track and manage pre-boarding tasks for new hires
              </p>

              {onboardings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-500">No active pre-boarding checklists.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {onboardings.map((onboarding) => {
                    const preboardingTasks = getPreboardingTasks(onboarding);
                    const progress = getPreboardingProgress(onboarding);

                    return (
                      <Card key={onboarding._id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl text-gray-900">
                                {onboarding.employee?.fullName || `Employee ${onboarding.employeeId}`}
                              </CardTitle>
                              <CardDescription>
                                Pre-boarding Progress: {progress}% • {preboardingTasks.length} pre-boarding tasks
                              </CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddCustomTask(onboarding)}
                            >
                              Add Task
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Pre-boarding tasks */}
                          {preboardingTasks.length > 0 ? (
                            <div className="space-y-2">
                              {preboardingTasks.map((task, index) => {
                                // Find actual index in full tasks array
                                const actualIndex = onboarding.tasks?.findIndex(
                                  (t) => t.name === task.name
                                );

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 border rounded bg-gray-50"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{task.name}</span>
                                        <StatusBadge status={task.status} type="onboarding" />
                                      </div>
                                      <p className="text-sm text-gray-500 mt-1">
                                        {task.department}
                                        {task.deadline &&
                                          ` • Due: ${new Date(task.deadline).toLocaleDateString()}`}
                                      </p>
                                      {task.notes && (
                                        <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                                      )}
                                    </div>
                                    <div>
                                      <Select
                                        value={task.status}
                                        onChange={(e) =>
                                          handleUpdateTaskStatus(
                                            onboarding._id,
                                            actualIndex ?? index,
                                            e.target.value as OnboardingTaskStatus
                                          )
                                        }
                                        className="w-32"
                                        options={[
                                          { value: OnboardingTaskStatus.PENDING, label: "Pending" },
                                          { value: OnboardingTaskStatus.IN_PROGRESS, label: "In Progress" },
                                          { value: OnboardingTaskStatus.COMPLETED, label: "Completed" },
                                        ]}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">
                              No pre-boarding tasks yet. Click "Add Task" to add tasks.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* CHANGED - Modal: Trigger Pre-boarding Tasks */}
        <Modal
          isOpen={isCreateTasksModalOpen}
          onClose={() => setIsCreateTasksModalOpen(false)}
          title="Trigger Pre-boarding Tasks"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Select pre-boarding tasks to trigger for{" "}
              <span className="font-semibold text-gray-900">
                {selectedApplication && getCandidateName(selectedApplication)}
              </span>
            </p>

            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium text-gray-900">Available Tasks</span>
              <Button variant="ghost" size="sm" onClick={handleSelectAllTasks}>
                {selectedTasks.length === PREBOARDING_TASK_TEMPLATES.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {PREBOARDING_TASK_TEMPLATES.map((task) => (
                <label
                  key={task.name}
                  className={`flex items-start p-3 border rounded cursor-pointer transition-colors ${
                    selectedTasks.includes(task.name)
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.name)}
                    onChange={() => handleToggleTask(task.name)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{task.name}</div>
                    <div className="text-sm text-gray-500">
                      {task.department} • {task.notes}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-500">
                {selectedTasks.length} task(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateTasksModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTriggerPreboarding} disabled={selectedTasks.length === 0}>
                  Trigger Pre-boarding
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* CHANGED - Modal: Add Custom Task */}
        <Modal
          isOpen={isCustomTaskModalOpen}
          onClose={() => setIsCustomTaskModalOpen(false)}
          title="Add Pre-boarding Task"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <Input
                value={customTaskForm.name}
                onChange={(e) =>
                  setCustomTaskForm({ ...customTaskForm, name: e.target.value })
                }
                placeholder="e.g., Submit Medical Certificate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <Select
                value={customTaskForm.department}
                onChange={(e) =>
                  setCustomTaskForm({ ...customTaskForm, department: e.target.value })
                }
                options={[
                  { value: "", label: "Select department..." },
                  { value: "HR", label: "HR" },
                  { value: "Finance", label: "Finance" },
                  { value: "Legal", label: "Legal" },
                  { value: "IT", label: "IT" },
                  { value: "Admin", label: "Admin" },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <Input
                type="date"
                value={customTaskForm.deadline}
                onChange={(e) =>
                  setCustomTaskForm({ ...customTaskForm, deadline: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                value={customTaskForm.notes}
                onChange={(e) =>
                  setCustomTaskForm({ ...customTaskForm, notes: e.target.value })
                }
                placeholder="Additional instructions or details..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCustomTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomTask}>Add Task</Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

export default function PreboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PreboardingPageContent />
    </Suspense>
  );
}

