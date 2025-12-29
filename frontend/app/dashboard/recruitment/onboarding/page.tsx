"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Onboarding, OnboardingTaskStatus, DocumentType } from "@/types/recruitment";
import { SystemRole } from "@/types";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    try {
      setLoading(true);
      const userId = user?.id || user?.userId;
      if (!userId) {
        showToast("Could not identify your user ID", "error");
        return;
      }

      // ONB-004: Check if user is a candidate or employee
      // Candidates use candidateId endpoint, employees use employeeId endpoint
      const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);
      
      console.log("[ONB-004] Loading onboarding for user:", userId, "isCandidate:", isCandidate, "userType:", user?.userType, "roles:", user?.roles);
      
      let onboardingData;
      if (isCandidate) {
        // Candidate viewing their onboarding (employee profile linked via personal email)
        onboardingData = await recruitmentApi.getOnboardingByCandidateId(userId);
      } else {
        // Employee viewing their own onboarding
        onboardingData = await recruitmentApi.getOnboardingByEmployeeId(userId);
      }
      
      setOnboarding(onboardingData);
    } catch (error: any) {
      console.error("[ONB-004] Error loading onboarding:", error);
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        setOnboarding(null);
      } else {
        showToast(error.message || "Failed to load onboarding", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!onboarding || selectedTaskIndex === null || !selectedFile) {
      showToast("Please select a file", "error");
      return;
    }

    try {
      setUploading(true);
      await recruitmentApi.uploadTaskDocument(
        onboarding._id,
        selectedTaskIndex,
        selectedFile,
        DocumentType.ID
      );
      showToast("Document uploaded successfully", "success");
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedTaskIndex(null);
      loadOnboarding();
    } catch (error: any) {
      showToast(error.message || "Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  };

  const getProgressPercentage = (): number => {
    if (!onboarding || onboarding.tasks.length === 0) return 0;
    const completed = onboarding.tasks.filter(
      (task) => task.status === OnboardingTaskStatus.COMPLETED
    ).length;
    return Math.round((completed / onboarding.tasks.length) * 100);
  };

//typescript build error zawed dol
  const isOnboardingCompleted = (): boolean => {
    if (!onboarding) return false;
    // Check if all tasks are completed
    if (onboarding.tasks.length > 0) {
      return onboarding.tasks.every(
        (task) => task.status === OnboardingTaskStatus.COMPLETED
      );
    }
    // Fallback: check status or completionDate
    return onboarding.status === 'completed' || !!onboarding.completionDate;
  };

  //lghayet hena

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ONB-007: Determine if a task is actionable by the candidate (document upload tasks)
  // Candidates can only upload documents - NOT issue badges, allocate equipment, etc.
  const isCandidateTask = (taskName: string): boolean => {
    const nameLower = taskName.toLowerCase();
    
    // Tasks that are NEVER for candidates (handled by IT/Admin/HR staff)
    const staffOnlyKeywords = [
      "allocate",
      "issue",
      "reserve",
      "set up",
      "create payroll",
      "process signing",
      "set up benefits",
      "provision",
      "badge",
      "access card",
      "workspace",
      "desk",
      "laptop",
      "email account",
      "sso",
    ];
    
    // If it contains staff-only keywords, it's NOT a candidate task
    if (staffOnlyKeywords.some((keyword) => nameLower.includes(keyword))) {
      return false;
    }
    
    // Tasks that ARE for candidates (document uploads)
    const candidateTaskKeywords = [
      "upload",
      "submit",
      "provide",
    ];
    
    return candidateTaskKeywords.some((keyword) => nameLower.includes(keyword));
  };

  // Check user roles for proper access control
  const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isHREmployee = user?.roles?.includes(SystemRole.HR_EMPLOYEE);
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  
  // HR Manager is VIEW ONLY - cannot edit tasks
  // HR Employee can action equipment tasks (desk, badge, laptop, etc.)
  // System Admin can action IT tasks (email, SSO, system access)
  const canUserActionTask = (task: any): boolean => {
    if (isCandidate) {
      // Candidates can only upload documents
      return isCandidateTask(task.name);
    }
    if (isHRManager) {
      // HR Manager is VIEW ONLY - cannot action any tasks
      return false;
    }
    if (isSystemAdmin) {
      // System Admin can action IT tasks
      return task.department === "IT";
    }
    if (isHREmployee) {
      // HR Employee can action HR department tasks (equipment, payroll, etc.)
      return task.department === "HR";
    }
    // Default: no action
    return false;
  };
  
  // Get handler description for a task (based on USER STORIES)
  const getTaskHandler = (task: any): string => {
    const nameLower = task.name?.toLowerCase() || "";
    
    // Document tasks (Candidate/New Hire - ONB-007)
    if (nameLower.includes("upload") || nameLower.includes("document") ||
        nameLower.includes("certification") || nameLower.includes("form") ||
        nameLower.includes("contract") && nameLower.includes("sign")) {
      return "Your task - please upload document (ONB-007)";
    }
    
    // IT tasks (System Admin - ONB-009)
    if (task.department === "IT" || nameLower.includes("email") || 
        nameLower.includes("sso") || nameLower.includes("system access") ||
        nameLower.includes("internal systems")) {
      return "Handled by System Admin (ONB-009)";
    }
    
    // Equipment tasks (HR Employee - ONB-012)
    if (nameLower.includes("laptop") || nameLower.includes("equipment") ||
        nameLower.includes("workspace") || nameLower.includes("desk") ||
        nameLower.includes("badge") || nameLower.includes("access card")) {
      return "Handled by HR Employee (ONB-012)";
    }
    
    // Automatic tasks (System - ONB-018/019)
    if (nameLower.includes("payroll") || nameLower.includes("bonus") || nameLower.includes("benefits")) {
      return "Automatic - System handles (ONB-018/019)";
    }
    
    return `Handled by ${task.department}`;
  };

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
          <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Recruitment
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Onboarding</h1>
          <p className="text-gray-600 mt-1">Complete your onboarding tasks</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading onboarding...</p>
          </div>
        ) : !onboarding ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Onboarding Tasks Yet</h3>
                <p className="text-gray-500 mb-4">
                  Your onboarding will be available after HR creates your employee profile from your signed contract.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg text-left text-sm">
                  <p className="font-medium text-blue-800 mb-2">What happens next?</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Accept a job offer</li>
                    <li>Upload your signed contract</li>
                    <li>HR will create your employee profile</li>
                    <li>Your onboarding tasks will appear here</li>
                  </ol>
                </div>
                <Link href="/dashboard/recruitment/offers" className="mt-4 inline-block">
                  <button className="text-blue-600 hover:underline">View your offers →</button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Info Banner for Candidates */}
            {!isOnboardingCompleted() && (user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE)) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💼</span>
                  <div>
                    <p className="font-medium text-blue-900">Welcome, New Hire!</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Complete all your onboarding tasks below. Once finished, your employee account will be activated
                      and you can login with your employee credentials (Employee Number + your password).
                    </p>
                    {(onboarding as any).employee && (
                      <p className="text-sm text-blue-600 mt-2">
                        <strong>Your Employee Number:</strong> {(onboarding as any).employee.employeeNumber || 'Will be provided'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                      <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Tasks:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {onboarding.tasks.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Completed:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {onboarding.tasks.filter(
                          (t) => t.status === OnboardingTaskStatus.COMPLETED
                        ).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pending:</span>
                      <span className="ml-2 font-semibold text-yellow-600">
                        {onboarding.tasks.filter(
                          (t) => t.status === OnboardingTaskStatus.PENDING
                        ).length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Complete Message - Show when all tasks done */}
            {isOnboardingCompleted() && (
              <Card className="border-2 border-green-500 bg-green-50">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎉</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-800 mb-2">
                        Congratulations! Your Onboarding is Complete
                      </h3>
                      <p className="text-green-700 mb-4">
                        All your onboarding tasks have been completed. Your employee account is now active!
                      </p>
                      {(onboarding as any).employee && (
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="font-medium text-gray-800 mb-3">Your Employee Credentials:</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Employee Number:</span>
                              <p className="font-semibold text-gray-900">
                                {(onboarding as any).employee.employeeNumber || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Work Email:</span>
                              <p className="font-semibold text-gray-900">
                                {(onboarding as any).employee.workEmail || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Name:</span>
                              <p className="font-semibold text-gray-900">
                                {(onboarding as any).employee.fullName || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <p className="font-semibold text-green-600">
                                {(onboarding as any).employee.status || 'ACTIVE'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                            <p className="font-medium">💡 How to login as Employee:</p>
                            <p>Use your <strong>Employee Number</strong> or <strong>Work Email</strong> with your existing password to access the employee portal.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding Tasks</h2>
              <div className="space-y-4">
                {onboarding.tasks.map((task, index) => {
                  return (
                  <Card 
                    key={index} 
                    className={`hover:shadow-md transition-shadow ${
                      isCandidate && isCandidateTask(task.name) && task.status !== OnboardingTaskStatus.COMPLETED
                        ? "border-l-4 border-l-blue-500 bg-blue-50/30" 
                        : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{task.name}</CardTitle>
                            {isCandidate && isCandidateTask(task.name) && task.status !== OnboardingTaskStatus.COMPLETED && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Your Action Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {task.department}
                            {isCandidate && !isCandidateTask(task.name) && (
                              <span className="ml-2 text-gray-400">(View Only)</span>
                            )}
                          </p>
                        </div>
                        <StatusBadge status={task.status} type="onboarding" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {task.deadline && (
                          <div className="text-sm text-gray-900">
                            <span className="text-gray-500">Deadline:</span>
                            <span className="ml-2 text-gray-900">{formatDate(task.deadline)}</span>
                          </div>
                        )}
                        {task.notes && (
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                            {task.notes}
                          </div>
                        )}
                        {task.status !== OnboardingTaskStatus.COMPLETED && (
                          <div className="pt-3 border-t">
                            {/* Role-based task actions */}
                            {canUserActionTask(task) ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTaskIndex(index);
                                  setIsUploadModalOpen(true);
                                }}
                              >
                                {isCandidate ? "📄 Upload Document" : "✅ Complete Task"}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                                <span>⏳</span>
                                <span>
                                  {isHRManager ? (
                                    // HR Manager sees who handles each task (view only)
                                    getTaskHandler(task)
                                  ) : isCandidate ? (
                                    // Candidate sees who handles non-document tasks
                                    getTaskHandler(task)
                                  ) : isSystemAdmin && task.department === "HR" ? (
                                    // System Admin can't action HR tasks
                                    "Handled by HR Employee"
                                  ) : isHREmployee && task.department === "IT" ? (
                                    // HR Employee can't action IT tasks
                                    "Handled by System Admin (ONB-009)"
                                  ) : (
                                    getTaskHandler(task)
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setSelectedTaskIndex(null);
          }}
          title="Upload Document"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                  setSelectedTaskIndex(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {selectedTaskIndex !== null && onboarding && (
              <p className="text-sm text-gray-600">
                Task: <strong>{onboarding.tasks[selectedTaskIndex]?.name}</strong>
              </p>
            )}
            <Input
              label="Select Document"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
            )}
            <p className="text-xs text-gray-500">
              Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG
            </p>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

