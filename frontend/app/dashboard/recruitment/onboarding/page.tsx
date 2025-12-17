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
      const employeeId = user?.id || user?.userId;
      if (!employeeId) {
        showToast("Could not identify your employee ID", "error");
        return;
      }
      const onboardingData = await recruitmentApi.getOnboardingByEmployeeId(employeeId);
      setOnboarding(onboardingData);
    } catch (error: any) {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
              <p className="text-gray-500 mb-4">
                No onboarding tasks assigned yet. Onboarding will be available after you accept a job offer.
              </p>
              <Link href="/dashboard/recruitment/offers">
                <button className="text-blue-600 hover:underline">View your offers</button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
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

            {/* Tasks List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding Tasks</h2>
              <div className="space-y-4">
                {onboarding.tasks.map((task, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{task.name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{task.department}</p>
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
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTaskIndex(index);
                                setIsUploadModalOpen(true);
                              }}
                            >
                              Upload Document
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

