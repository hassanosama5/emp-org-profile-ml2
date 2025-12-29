"use client";

// CHANGED - New Notification Templates Management page for HR Manager
// Implements REC-022: Automated rejection notifications and templates

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

// CHANGED - Default notification templates
const DEFAULT_TEMPLATES = {
  rejection: {
    subject: "Application Update",
    body: `Dear {candidateName},

Thank you for your interest in our company. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.

{rejectionReason}

We appreciate the time you invested in the application process and wish you the best in your job search.

Best regards,
HR Team`,
  },
  in_process: {
    subject: "Application Status Update",
    body: `Dear {candidateName},

Your application status has been updated to: In Process.

We are currently reviewing your application and will keep you updated on the next steps.

Best regards,
HR Team`,
  },
  offer: {
    subject: "Congratulations - Job Offer",
    body: `Dear {candidateName},

Congratulations! Your application has progressed to the offer stage.

You will receive further communication regarding the offer details shortly.

Best regards,
HR Team`,
  },
  hired: {
    subject: "Welcome to the Team!",
    body: `Dear {candidateName},

Congratulations! We are pleased to offer you the position.

You will receive further communication regarding onboarding and next steps.

Best regards,
HR Team`,
  },
  interview_scheduled: {
    subject: "Interview Scheduled",
    body: `Dear {candidateName},

Your interview has been scheduled for {interviewDate}.
Interview Method: {method}
{videoLink}

We look forward to meeting with you.

Best regards,
HR Team`,
  },
};

type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

export default function NotificationTemplatesPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // CHANGED - State for templates (in production, these would be stored in database)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ subject: "", body: "" });

  // CHANGED - Open edit modal
  const handleOpenEdit = (templateKey: TemplateKey) => {
    setSelectedTemplate(templateKey);
    setEditForm({
      subject: templates[templateKey].subject,
      body: templates[templateKey].body,
    });
    setIsEditModalOpen(true);
  };

  // CHANGED - Save template changes
  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;

    setTemplates((prev) => ({
      ...prev,
      [selectedTemplate]: {
        subject: editForm.subject,
        body: editForm.body,
      },
    }));

    showToast("Template saved successfully", "success");
    setIsEditModalOpen(false);
    setSelectedTemplate(null);
  };

  // CHANGED - Reset to default
  const handleResetTemplate = (templateKey: TemplateKey) => {
    setTemplates((prev) => ({
      ...prev,
      [templateKey]: DEFAULT_TEMPLATES[templateKey],
    }));
    showToast("Template reset to default", "success");
  };

  // CHANGED - Get template display name
  const getTemplateName = (key: TemplateKey): string => {
    const names: Record<TemplateKey, string> = {
      rejection: "Rejection Notification",
      in_process: "In Process Notification",
      offer: "Offer Stage Notification",
      hired: "Hired Notification",
      interview_scheduled: "Interview Scheduled",
    };
    return names[key];
  };

  // CHANGED - Get template description
  const getTemplateDescription = (key: TemplateKey): string => {
    const descriptions: Record<TemplateKey, string> = {
      rejection: "Sent when an application is rejected (REC-022)",
      in_process: "Sent when application moves to review",
      offer: "Sent when candidate receives an offer",
      hired: "Sent when candidate is hired",
      interview_scheduled: "Sent when interview is scheduled",
    };
    return descriptions[key];
  };

  // CHANGED - Get template icon
  const getTemplateIcon = (key: TemplateKey): string => {
    const icons: Record<TemplateKey, string> = {
      rejection: "❌",
      in_process: "⏳",
      offer: "🎉",
      hired: "✅",
      interview_scheduled: "📅",
    };
    return icons[key];
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN]}>
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
          <h1 className="text-3xl font-bold text-gray-900">
            Notification Templates
          </h1>
          <p className="text-gray-600 mt-1">
            Manage email templates for candidate notifications (REC-022)
          </p>
        </div>

        {/* CHANGED - Available Variables Info */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Available Template Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{candidateName}"}</code>
                <p className="text-gray-600 mt-1">Candidate's name</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{rejectionReason}"}</code>
                <p className="text-gray-600 mt-1">Custom rejection message</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{interviewDate}"}</code>
                <p className="text-gray-600 mt-1">Interview date/time</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{method}"}</code>
                <p className="text-gray-600 mt-1">Interview method</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{videoLink}"}</code>
                <p className="text-gray-600 mt-1">Video call link</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{role}"}</code>
                <p className="text-gray-600 mt-1">Job role/position</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{grossSalary}"}</code>
                <p className="text-gray-600 mt-1">Salary offered</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <code className="text-blue-600">{"{deadline}"}</code>
                <p className="text-gray-600 mt-1">Offer deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CHANGED - Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(templates) as TemplateKey[]).map((templateKey) => (
            <Card key={templateKey} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTemplateIcon(templateKey)}</span>
                    <div>
                      <CardTitle className="text-lg">
                        {getTemplateName(templateKey)}
                      </CardTitle>
                      <CardDescription>
                        {getTemplateDescription(templateKey)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Subject:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {templates[templateKey].subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Preview:</p>
                    <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                        {templates[templateKey].body.substring(0, 200)}
                        {templates[templateKey].body.length > 200 && "..."}
                      </pre>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(templateKey)}
                    >
                      Edit Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetTemplate(templateKey)}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHANGED - Note about persistence */}
        <Card className="mt-8 bg-yellow-50 border-yellow-200">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Template changes are currently stored in your browser session. 
              In a production environment, these would be saved to the database and persist across sessions.
              The backend uses these templates when sending automated notifications.
            </p>
          </CardContent>
        </Card>

        {/* CHANGED - Edit Template Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit ${selectedTemplate ? getTemplateName(selectedTemplate) : "Template"}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={editForm.subject}
                onChange={(e) =>
                  setEditForm({ ...editForm, subject: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Body
              </label>
              <Textarea
                value={editForm.body}
                onChange={(e) =>
                  setEditForm({ ...editForm, body: e.target.value })
                }
                rows={12}
                className="w-full font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variables like {"{candidateName}"} to personalize the message.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>Save Template</Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

