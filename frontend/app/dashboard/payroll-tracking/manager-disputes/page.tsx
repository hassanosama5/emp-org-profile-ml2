"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import Link from "next/link";

interface Dispute {
  _id: string;
  disputeId: string;
  description: string;
  employeeId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payrollSpecialistId?: {
    firstName: string;
    lastName: string;
  };
  payslipId?: {
    _id: string;
    payrollRunId?: {
      runId: string;
      payrollPeriod: string;
    };
  };
  status: string;
  resolutionComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ManagerDisputesPage() {
  useRequireAuth(SystemRole.PAYROLL_MANAGER);
  const { user } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const data = await payslipsApi.getPendingDisputes();
        // Filter to only show disputes pending manager approval
        const pendingManagerDisputes = (data || []).filter(
          (d: Dispute) => d.status === "pending payroll Manager approval"
        );
        setDisputes(pendingManagerDisputes);
      } catch (err: any) {
        setError(err.message || "Failed to load pending disputes");
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pending disputes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.refresh()}>Retry</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/payroll-manager")}>
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Dispute Confirmations</h1>
          <p className="text-gray-600 mt-1">
            As a Payroll Manager, confirm approval of disputes, so that finance staff can be notified. (multi-step approval)
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-manager")}>
          Back to Dashboard
        </Button>
      </div>

      {disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card key={dispute._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {dispute.disputeId}
                      </h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                        Pending Your Approval
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{dispute.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                      {dispute.employeeId && (
                        <div>
                          <span className="font-medium text-gray-500">Employee:</span>{" "}
                          {dispute.employeeId.firstName} {dispute.employeeId.lastName} ({dispute.employeeId.employeeNumber})
                        </div>
                      )}
                      {dispute.payrollSpecialistId && (
                        <div>
                          <span className="font-medium text-gray-500">Reviewed by:</span>{" "}
                          {dispute.payrollSpecialistId.firstName} {dispute.payrollSpecialistId.lastName}
                        </div>
                      )}
                      {dispute.payslipId?.payrollRunId && (
                        <div>
                          <span className="font-medium text-gray-500">Payroll Run:</span>{" "}
                          {dispute.payslipId.payrollRunId.runId}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-500">Submitted:</span>{" "}
                        {formatDate(dispute.createdAt)}
                      </div>
                    </div>
                    {dispute.resolutionComment && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">Specialist Comment:</p>
                        <p className="text-sm text-blue-800">{dispute.resolutionComment}</p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Link href={`/dashboard/payroll-tracking/disputes/${dispute._id}`}>
                      <Button variant="primary" size="sm">
                        Review & Confirm
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push("/dashboard/payroll-tracking/disputes")}
                    >
                      View All Disputes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Confirmations</h3>
              <p className="text-sm text-gray-600 mb-4">
                There are no disputes awaiting your confirmation at this time.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard/payroll-manager")}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Confirm Dispute Approval (Multi-Step Approval)</p>
              <p className="text-sm text-blue-800 mb-2">
                As a Payroll Manager, you can confirm disputes that have been approved by Payroll Specialists. Only approved disputes will reach you for confirmation.
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
                <li>
                  <strong>Review:</strong> Click "Review & Confirm" to view full dispute details and the specialist's resolution comment.
                </li>
                <li>
                  <strong>Confirm:</strong> Once you confirm the approval, the dispute status becomes "Approved" and finance staff will be notified.
                </li>
                <li>
                  <strong>Finance Notification:</strong> Finance staff will receive a notification that the dispute is ready for refund processing.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Multi-Step Workflow:</strong> Employee submits → Payroll Specialist approves → <strong>You confirm</strong> → Finance staff notified → Finance processes refund
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

