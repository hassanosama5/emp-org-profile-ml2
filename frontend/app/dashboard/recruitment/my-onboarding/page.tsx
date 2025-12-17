"use client";

// CHANGED - ONB-004: Onboarding Tracker for New Hires
// CHANGED - ONB-007: Document Upload for Compliance
// New hires can view their onboarding steps and upload required documents

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { Onboarding, OnboardingTask, OnboardingTaskStatus } from "@/types/recruitment";
import type { EmployeeProfile } from "@/types";
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
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

// CHANGED - Document types for upload (lowercase to match backend enum)
const DOCUMENT_TYPES = [
  { value: "contract", label: "📝 Signed Contract", icon: "📝" },
  { value: "id", label: "🪪 ID Document (Passport/National ID)", icon: "🪪" },
  { value: "certificate", label: "📜 Certification/Diploma", icon: "📜" },
];

// CHANGED - Task step icons
const getTaskIcon = (taskName: string, department: string): string => {
  const name = taskName.toLowerCase();
  if (name.includes("email")) return "📧";
  if (name.includes("laptop") || name.includes("equipment")) return "💻";
  if (name.includes("sso") || name.includes("system access")) return "🔐";
  if (name.includes("workspace") || name.includes("desk")) return "🪑";
  if (name.includes("badge") || name.includes("id document")) return "🪪";
  if (name.includes("access card")) return "🎫";
  if (name.includes("payroll")) return "💰";
  if (name.includes("bonus")) return "🎁";
  if (name.includes("benefit")) return "🏥";
  if (name.includes("contract")) return "📝";
  if (name.includes("certification")) return "📜";
  if (name.includes("document") || name.includes("form")) return "📄";
  if (name.includes("training")) return "📚";
  if (name.includes("welcome") || name.includes("orientation")) return "👋";
  if (department === "IT") return "💻";
  if (department === "HR") return "👥";
  if (department === "Admin") return "🏢";
  if (department === "Payroll") return "💵";
  return "📋";
};

// CHANGED - Status colors and icons
const getStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: "✅",
        label: "Completed",
        bgClass: "bg-green-50 border-green-200",
        iconColor: "text-green-600",
      };
    case "in_progress":
      return {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: "🔄",
        label: "In Progress",
        bgClass: "bg-yellow-50 border-yellow-200",
        iconColor: "text-yellow-600",
      };
    case "pending":
    default:
      return {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: "⏳",
        label: "Pending",
        bgClass: "bg-gray-50 border-gray-200",
        iconColor: "text-gray-400",
      };
  }
};

// CHANGED - Check if task requires document upload
const isDocumentTask = (taskName: string): boolean => {
  const name = taskName.toLowerCase();
  return (
    name.includes("upload") ||
    name.includes("contract") ||
    name.includes("id document") ||
    name.includes("certification") ||
    name.includes("document")
  );
};

// CHANGED - Get suggested document type based on task name
// Note: Backend expects lowercase values matching the DocumentType enum
const getSuggestedDocType = (taskName: string): string => {
  const name = taskName.toLowerCase();
  if (name.includes("contract")) return "contract";
  if (name.includes("id")) return "id";
  if (name.includes("certification") || name.includes("certificate")) return "certificate";
  return "contract";
};

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [employeeStatus, setEmployeeStatus] = useState<string | null>(null);
  
  // CHANGED - ONB-007: Document upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(-1);
  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    documentType: "contract",
    nationalId: "",
    documentDescription: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id || user?.userId) {
      loadEmployeeStatus();
      loadOnboarding();
    }
  }, [user]);

  // Load employee status to determine appropriate message
  const loadEmployeeStatus = async () => {
    try {
      const profile = await employeeProfileApi.getMyProfile();
      if (profile && typeof profile === "object" && "status" in profile) {
        setEmployeeStatus((profile as EmployeeProfile).status);
      }
    } catch (error) {
      console.warn("Could not load employee status:", error);
      // Don't show error to user, just continue without status
    }
  };

  const loadOnboarding = async () => {
    try {
      setLoading(true);
      // CHANGED - Get employee ID from user context
      const employeeId = user?.id || user?.userId;
      if (!employeeId) {
        showToast("Could not identify your employee ID", "error");
        return;
      }

      const data = await recruitmentApi.getOnboardingByEmployeeId(employeeId);
      setOnboarding(data);

      // Calculate progress
      if (data?.tasks && data.tasks.length > 0) {
        const completed = data.tasks.filter(
          (t: OnboardingTask) => t.status === OnboardingTaskStatus.COMPLETED
        ).length;
        setProgress(Math.round((completed / data.tasks.length) * 100));
      }
    } catch (error: any) {
      // CHANGED - Handle 404 gracefully (no onboarding yet)
      // Check multiple patterns since error format can vary
      const errorMsg = error.message?.toLowerCase() || "";
      const isNotFound = 
        errorMsg.includes("404") || 
        errorMsg.includes("not found") ||
        errorMsg.includes("onboarding checklist not found") ||
        error.response?.status === 404;
      
      if (isNotFound) {
        console.info("No onboarding record found for this employee");
        setOnboarding(null);
      } else {
        showToast(error.message || "Failed to load your onboarding", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if onboarding is completed
  const isOnboardingCompleted = (onboarding: Onboarding | null): boolean => {
    if (!onboarding) return false;
    // Check if status is completed or completionDate exists
    if (onboarding.status === "completed" || onboarding.completionDate) {
      return true;
    }
    // Check if all tasks are completed
    if (onboarding.tasks && onboarding.tasks.length > 0) {
      return onboarding.tasks.every(
        (task) => task.status === OnboardingTaskStatus.COMPLETED
      );
    }
    return false;
  };

  // CHANGED - ONB-007: Open upload modal for a task
  const handleOpenUpload = (task: OnboardingTask, globalIndex: number) => {
    setSelectedTask(task);
    setSelectedTaskIndex(globalIndex);
    setUploadForm({
      file: null,
      documentType: getSuggestedDocType(task.name),
      nationalId: "",
      documentDescription: "",
    });
    setIsUploadModalOpen(true);
  };

  // CHANGED - ONB-007: Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be less than 5MB", "error");
        return;
      }
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        showToast("Please upload a PDF, Word document, or image file", "error");
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  // CHANGED - ONB-007: Upload document
  const handleUploadDocument = async () => {
    if (!onboarding || selectedTaskIndex < 0) return;

    if (!uploadForm.file && !uploadForm.nationalId && !uploadForm.documentDescription) {
      showToast("Please select a file or provide document details", "error");
      return;
    }

    try {
      setUploading(true);
      await recruitmentApi.uploadTaskDocument(
        onboarding._id,
        selectedTaskIndex,
        uploadForm.file!,
        uploadForm.documentType,
        uploadForm.nationalId || undefined,
        uploadForm.documentDescription || undefined
      );
      showToast("Document uploaded successfully! ✅", "success");
      setIsUploadModalOpen(false);
      loadOnboarding(); // Refresh to show updated status
    } catch (error: any) {
      showToast(error.message || "Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  };

  // CHANGED - Get next task to complete
  const getNextTask = (): OnboardingTask | null => {
    if (!onboarding?.tasks) return null;
    // Find first in_progress task
    const inProgress = onboarding.tasks.find(
      (t) => t.status === OnboardingTaskStatus.IN_PROGRESS
    );
    if (inProgress) return inProgress;
    // Find first pending task
    return onboarding.tasks.find(
      (t) => t.status === OnboardingTaskStatus.PENDING
    ) || null;
  };

  // CHANGED - Group tasks by department
  const getTasksByDepartment = () => {
    if (!onboarding?.tasks) return {};
    const grouped: Record<string, { task: OnboardingTask; globalIndex: number }[]> = {};
    onboarding.tasks.forEach((task, index) => {
      const dept = task.department || "General";
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push({ task, globalIndex: index });
    });
    return grouped;
  };

  // CHANGED - Get completion stats
  const getStats = () => {
    if (!onboarding?.tasks) return { total: 0, completed: 0, inProgress: 0, pending: 0 };
    const tasks = onboarding.tasks;
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length,
      inProgress: tasks.filter((t) => t.status === OnboardingTaskStatus.IN_PROGRESS).length,
      pending: tasks.filter((t) => t.status === OnboardingTaskStatus.PENDING).length,
    };
  };

  // CHANGED - Get document upload tasks
  const getDocumentTasks = () => {
    if (!onboarding?.tasks) return [];
    return onboarding.tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => isDocumentTask(task.name));
  };

  const stats = getStats();
  const nextTask = getNextTask();
  const tasksByDept = getTasksByDepartment();
  const documentTasks = getDocumentTasks();

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            My Onboarding Tracker
          </h1>
          <p className="text-gray-600 mt-1">
            Track your onboarding progress and upload required documents
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading your onboarding...</p>
          </div>
        ) : !onboarding ? (
          <Card className={employeeStatus === "ACTIVE" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}>
            <CardContent className="py-16 text-center">
              {employeeStatus === "ACTIVE" ? (
                <>
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Onboarding Completed
                  </h2>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    You are already an active employee. Your onboarding was completed when you joined the organization.
                    You have full access to all employee features.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/dashboard">
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">👋</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to the Team!
                  </h2>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Your onboarding checklist will appear here once HR creates your employee profile from your accepted offer. 
                    This happens automatically after you upload your signed contract and HR finalizes the offer.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/dashboard/recruitment/offers">
                      <Button variant="outline">View My Offers</Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="outline">Go to Dashboard</Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* CHANGED - Completion Banner */}
            {isOnboardingCompleted(onboarding) && (
              <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">🎉 Onboarding Complete!</h2>
                      <p className="text-green-100">
                        Congratulations! You've completed all onboarding tasks and are now a full employee. 
                        You can access all employee features from your dashboard.
                      </p>
                    </div>
                    <Link href="/dashboard">
                      <Button className="bg-white text-green-600 hover:bg-gray-100">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CHANGED - Progress Overview */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardContent className="py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-2">
                      {isOnboardingCompleted(onboarding)
                        ? "🎉 Onboarding Complete!"
                        : progress >= 75
                        ? "Almost There!"
                        : progress >= 50
                        ? "Great Progress!"
                        : "Let's Get Started!"}
                    </h2>
                    <p className="text-blue-100">
                      {isOnboardingCompleted(onboarding)
                        ? "Welcome to the team! You've completed all onboarding tasks."
                        : `${stats.completed} of ${stats.total} tasks completed`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="white"
                          strokeWidth="12"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${progress * 3.52} 352`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CHANGED - Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center">
                <CardContent className="py-6">
                  <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-500">Total Tasks</div>
                </CardContent>
              </Card>
              <Card className="text-center bg-green-50 border-green-200">
                <CardContent className="py-6">
                  <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </CardContent>
              </Card>
              <Card className="text-center bg-yellow-50 border-yellow-200">
                <CardContent className="py-6">
                  <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
                  <div className="text-sm text-yellow-700">In Progress</div>
                </CardContent>
              </Card>
              <Card className="text-center bg-gray-50 border-gray-200">
                <CardContent className="py-6">
                  <div className="text-3xl font-bold text-gray-600">{stats.pending}</div>
                  <div className="text-sm text-gray-500">Pending</div>
                </CardContent>
              </Card>
            </div>

            {/* CHANGED - ONB-007: Document Upload Section */}
            {documentTasks.length > 0 && !isOnboardingCompleted(onboarding) && (
              <Card className="border-2 border-purple-300 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-900 flex items-center gap-2">
                    <span className="text-2xl">📁</span>
                    Documents Required
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    Upload these documents to complete your onboarding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentTasks.map(({ task, index }) => {
                      const isCompleted = task.status === OnboardingTaskStatus.COMPLETED;
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-2 ${
                            isCompleted
                              ? "border-green-300 bg-green-50"
                              : "border-purple-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">
                              {isCompleted ? "✅" : getTaskIcon(task.name, task.department)}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{task.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {isCompleted
                                  ? task.documentId ? "Document uploaded" : "Completed"
                                  : task.deadline
                                  ? `Due: ${new Date(task.deadline).toLocaleDateString()}`
                                  : "Required for compliance"}
                              </p>
                              {!isCompleted && (
                                <Button
                                  size="sm"
                                  className="mt-3"
                                  onClick={() => handleOpenUpload(task, index)}
                                >
                                  📤 Upload
                                </Button>
                              )}
                              {isCompleted && task.documentId && (
                                <span className="inline-block mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                  Document ID: {String(task.documentId).slice(-6)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CHANGED - Next Task Highlight */}
            {nextTask && !isOnboardingCompleted(onboarding) && (
              <Card className="border-2 border-blue-500 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <span className="text-2xl">👉</span>
                    Up Next: {nextTask.name}
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    {nextTask.department} Department
                    {nextTask.deadline && ` • Due: ${new Date(nextTask.deadline).toLocaleDateString()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {nextTask.notes && (
                    <p className="text-sm text-blue-800 mb-4">{nextTask.notes}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        getStatusConfig(nextTask.status).color
                      }`}
                    >
                      {getStatusConfig(nextTask.status).icon}{" "}
                      {getStatusConfig(nextTask.status).label}
                    </span>
                    {isDocumentTask(nextTask.name) && nextTask.status !== OnboardingTaskStatus.COMPLETED && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const idx = onboarding.tasks.findIndex((t) => t.name === nextTask.name);
                          if (idx >= 0) handleOpenUpload(nextTask, idx);
                        }}
                      >
                        📤 Upload Document
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CHANGED - Tasks by Department */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">All Tasks</h2>
              {Object.entries(tasksByDept).map(([department, tasks]) => {
                // Map department codes to user-friendly labels based on user stories
                const getDepartmentLabel = (dept: string): string => {
                  switch (dept) {
                    case "IT": return "System Admin Tasks";      // ONB-009
                    case "Admin": return "HR Employee Tasks";    // ONB-012
                    case "HR": return "HR Tasks";
                    case "Payroll": return "Payroll Tasks";
                    case "Legal": return "Legal Tasks";
                    default: return `${dept} Tasks`;
                  }
                };
                
                return (
                <Card key={department}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-xl">
                        {department === "IT"
                          ? "💻"
                          : department === "HR"
                          ? "👥"
                          : department === "Admin"
                          ? "🏢"
                          : department === "Payroll"
                          ? "💵"
                          : department === "Legal"
                          ? "⚖️"
                          : "📋"}
                      </span>
                      {getDepartmentLabel(department)}
                    </CardTitle>
                    <CardDescription>
                      {tasks.filter((t) => t.task.status === OnboardingTaskStatus.COMPLETED).length} of{" "}
                      {tasks.length} completed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tasks.map(({ task, globalIndex }) => {
                        const statusConfig = getStatusConfig(task.status);
                        const needsUpload = isDocumentTask(task.name) && task.status !== OnboardingTaskStatus.COMPLETED;
                        return (
                          <div
                            key={globalIndex}
                            className={`flex items-start gap-4 p-4 rounded-lg border ${statusConfig.bgClass}`}
                          >
                            <div className={`text-2xl ${statusConfig.iconColor}`}>
                              {getTaskIcon(task.name, department)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900">{task.name}</h3>
                                  {task.deadline && (
                                    <p className="text-sm text-gray-500">
                                      Due: {new Date(task.deadline).toLocaleDateString()}
                                    </p>
                                  )}
                                  {task.notes && (
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                      {task.notes}
                                    </p>
                                  )}
                                  {task.status === OnboardingTaskStatus.COMPLETED && (
                                    <p className="text-xs text-green-600 mt-1">
                                      ✓ Completed
                                    </p>
                                  )}
                                  {task.documentId && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      📎 Document attached
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${statusConfig.color}`}
                                  >
                                    {statusConfig.icon} {statusConfig.label}
                                  </span>
                                  {needsUpload && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenUpload(task, globalIndex)}
                                    >
                                      📤 Upload
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>

            {/* CHANGED - Help Section */}
            <Card className="bg-gray-50">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">❓</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Need Help?</h3>
                    <p className="text-sm text-gray-600">
                      If you have questions about any onboarding task or need assistance,
                      please contact HR or your assigned onboarding buddy. They're here to help
                      make your transition smooth!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CHANGED - ONB-007: Upload Document Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title={`Upload Document: ${selectedTask?.name || ""}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📋 <strong>Task:</strong> {selectedTask?.name}
              </p>
              {selectedTask?.notes && (
                <p className="text-sm text-blue-700 mt-1">{selectedTask.notes}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type *
              </label>
              <Select
                value={uploadForm.documentType}
                onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                options={DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload File *
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  uploadForm.file
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-blue-400"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                {uploadForm.file ? (
                  <div>
                    <span className="text-3xl">✅</span>
                    <p className="text-sm font-medium text-green-700 mt-2">
                      {uploadForm.file.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {(uploadForm.file.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl">📁</span>
                    <p className="text-sm text-gray-600 mt-2">
                      Click to select a file
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, Word, or Image (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {uploadForm.documentType === "id" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  National ID / Passport Number
                </label>
                <Input
                  value={uploadForm.nationalId}
                  onChange={(e) => setUploadForm({ ...uploadForm, nationalId: e.target.value })}
                  placeholder="Enter your ID number"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <Input
                value={uploadForm.documentDescription}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, documentDescription: e.target.value })
                }
                placeholder="Brief description of the document"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Note:</strong> Uploaded documents will be reviewed by HR for compliance.
                Make sure all information is accurate and legible.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUploadDocument}
                disabled={!uploadForm.file || uploading}
              >
                {uploading ? "Uploading..." : "📤 Upload Document"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
