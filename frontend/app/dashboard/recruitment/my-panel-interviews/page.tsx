"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Modal } from "@/components/leaves/Modal";
import { Textarea } from "@/components/shared/ui/Textarea";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { InterviewStatus, InterviewMethod } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Toast, useToast } from "@/components/leaves/Toast";

// Interface for the panel interview data returned by the API
interface PanelInterview {
  _id: string;
  applicationId: string;
  stage: string;
  scheduledDate: string;
  method: string;
  videoLink?: string;
  status: string;
  panelSize: number;
  feedbackSubmitted: number;
  allFeedbackComplete: boolean;
  candidate: {
    _id: string;
    fullName: string;
    email?: string;
  };
  position: {
    title: string;
    department: string;
  };
  application: {
    _id: string;
    status: string;
    stage: string;
    isReferral: boolean;
  };
  myFeedback: {
    _id?: string;
    score?: number;
    comments?: string;
    hasSubmitted: boolean;
  };
}

export default function MyPanelInterviewsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [interviews, setInterviews] = useState<PanelInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<PanelInterview | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    score: 0,
    comments: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const data = await recruitmentApi.getMyPanelInterviews();
      // Sort by scheduled date (upcoming first)
      const sortedInterviews = [...data].sort((a, b) => {
        const dateA = new Date(a.scheduledDate).getTime();
        const dateB = new Date(b.scheduledDate).getTime();
        return dateA - dateB;
      });
      setInterviews(sortedInterviews);
    } catch (error: any) {
      console.error("Failed to load panel interviews:", error);
      showToast("Failed to load your panel interviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFeedback = (interview: PanelInterview) => {
    setSelectedInterview(interview);
    // Pre-fill with existing feedback if available
    if (interview.myFeedback?.hasSubmitted) {
      setFeedbackForm({
        score: interview.myFeedback.score || 0,
        comments: interview.myFeedback.comments || "",
      });
    } else {
      setFeedbackForm({ score: 0, comments: "" });
    }
    setIsFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;

    if (feedbackForm.score < 0 || feedbackForm.score > 100) {
      showToast("Score must be between 0 and 100", "error");
      return;
    }

    try {
      setSubmitting(true);
      await recruitmentApi.submitInterviewFeedback(selectedInterview._id, {
        score: feedbackForm.score,
        comments: feedbackForm.comments,
      });
      showToast("Feedback submitted successfully!", "success");
      setIsFeedbackModalOpen(false);
      loadInterviews(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      showToast(error?.message || "Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInterviewMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case "video":
        return "📹";
      case "phone":
        return "📞";
      case "onsite":
        return "🏢";
      default:
        return "📋";
    }
  };

  const getStageLabel = (stage: string) => {
    const stageLabels: Record<string, string> = {
      screening: "Screening Interview",
      department_interview: "Department Interview",
      hr_interview: "HR Interview",
      technical_interview: "Technical Interview",
    };
    return stageLabels[stage?.toLowerCase()] || stage || "Interview";
  };

  const isInterviewPast = (scheduledDate: string) => {
    return new Date(scheduledDate) < new Date();
  };

  const canSubmitFeedback = (interview: PanelInterview) => {
    // Can submit feedback if the interview is scheduled or completed
    // and the interview date has passed (or is today)
    return (
      interview.status !== "cancelled" &&
      (interview.status === "scheduled" || interview.status === "completed")
    );
  };

  // Separate upcoming and past interviews
  const upcomingInterviews = interviews.filter(
    (int) => !isInterviewPast(int.scheduledDate) && int.status !== "cancelled"
  );
  const pastInterviews = interviews.filter(
    (int) => isInterviewPast(int.scheduledDate) || int.status === "cancelled"
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Interview Panel</h1>
          <p className="text-gray-500 mt-1">
            Interviews where you have been selected as a panel member
          </p>
        </div>
        <Button onClick={loadInterviews} variant="outline" size="sm">
          🔄 Refresh
        </Button>
      </div>

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Panel Assignments
            </h3>
            <p className="text-gray-500">
              You haven&apos;t been assigned to any interview panels yet.
              When you are selected as a panel member for an interview, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming Interviews */}
          {upcomingInterviews.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-500">🗓️</span> Upcoming Interviews
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                  {upcomingInterviews.length}
                </span>
              </h2>
              <div className="grid gap-4">
                {upcomingInterviews.map((interview) => (
                  <Card key={interview._id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">
                              {getInterviewMethodIcon(interview.method)}
                            </span>
                            <h3 className="font-semibold text-gray-900">
                              {getStageLabel(interview.stage)}
                            </h3>
                            <StatusBadge status={interview.status as InterviewStatus} />
                            {interview.application.isReferral && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⭐ Referral
                              </span>
                            )}
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">
                                <span className="font-medium">Candidate:</span>{" "}
                                {interview.candidate.fullName}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Position:</span>{" "}
                                {interview.position.title}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Department:</span>{" "}
                                {interview.position.department}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">
                                <span className="font-medium">Scheduled:</span>{" "}
                                {formatDate(interview.scheduledDate)}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Method:</span>{" "}
                                {interview.method}
                              </p>
                              {interview.videoLink && (
                                <a
                                  href={interview.videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  📹 Join Video Call
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              👥 Panel Size: {interview.panelSize}
                            </span>
                            <span>
                              📝 Feedback: {interview.feedbackSubmitted}/{interview.panelSize}
                            </span>
                            {interview.myFeedback?.hasSubmitted && (
                              <span className="text-green-600 font-medium">
                                ✅ You have submitted feedback
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {canSubmitFeedback(interview) && (
                            <Button
                              variant={interview.myFeedback?.hasSubmitted ? "outline" : "primary"}
                              size="sm"
                              onClick={() => handleOpenFeedback(interview)}
                            >
                              {interview.myFeedback?.hasSubmitted
                                ? "Edit Feedback"
                                : "Submit Feedback"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Interviews */}
          {pastInterviews.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-gray-400">📁</span> Past Interviews
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {pastInterviews.length}
                </span>
              </h2>
              <div className="grid gap-4">
                {pastInterviews.map((interview) => (
                  <Card key={interview._id} className="border-l-4 border-l-gray-300 opacity-90">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">
                              {getInterviewMethodIcon(interview.method)}
                            </span>
                            <h3 className="font-semibold text-gray-900">
                              {getStageLabel(interview.stage)}
                            </h3>
                            <StatusBadge status={interview.status as InterviewStatus} />
                            {interview.application.isReferral && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⭐ Referral
                              </span>
                            )}
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">
                                <span className="font-medium">Candidate:</span>{" "}
                                {interview.candidate.fullName}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Position:</span>{" "}
                                {interview.position.title}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">
                                <span className="font-medium">Date:</span>{" "}
                                {formatDate(interview.scheduledDate)}
                              </p>
                              {interview.myFeedback?.hasSubmitted && (
                                <p className="text-green-600">
                                  <span className="font-medium">Your Score:</span>{" "}
                                  {interview.myFeedback.score}/100
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              📝 Feedback: {interview.feedbackSubmitted}/{interview.panelSize}
                            </span>
                            {interview.allFeedbackComplete && (
                              <span className="text-green-600 font-medium">
                                ✅ All feedback complete
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {canSubmitFeedback(interview) && !interview.myFeedback?.hasSubmitted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenFeedback(interview)}
                            >
                              Submit Feedback
                            </Button>
                          )}
                          {interview.myFeedback?.hasSubmitted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenFeedback(interview)}
                            >
                              View/Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Feedback Modal */}
      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        title={`Submit Feedback - ${selectedInterview?.candidate.fullName}`}
      >
        <form onSubmit={handleSubmitFeedback}>
          <div className="space-y-4">
            {selectedInterview && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p>
                  <span className="font-medium">Interview:</span>{" "}
                  {getStageLabel(selectedInterview.stage)}
                </p>
                <p>
                  <span className="font-medium">Candidate:</span>{" "}
                  {selectedInterview.candidate.fullName}
                </p>
                <p>
                  <span className="font-medium">Position:</span>{" "}
                  {selectedInterview.position.title}
                </p>
                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {formatDate(selectedInterview.scheduledDate)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score (0-100) *
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={feedbackForm.score}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, score: parseInt(e.target.value) || 0 })
                }
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Rate the candidate from 0 (not suitable) to 100 (excellent fit)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments
              </label>
              <Textarea
                value={feedbackForm.comments}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, comments: e.target.value })
                }
                rows={4}
                placeholder="Provide detailed feedback about the candidate's performance, skills, and fit for the role..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFeedbackModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

