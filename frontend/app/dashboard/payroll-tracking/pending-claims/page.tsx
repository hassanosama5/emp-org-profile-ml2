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

interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  amount: number;
  employeeId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function PendingClaimsPage() {
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const { user } = useAuth();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const data = await payslipsApi.getPendingClaims();
        setClaims(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load pending claims");
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
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

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pending claims...</p>
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
                <Button variant="outline" onClick={() => router.push("/dashboard/payroll-specialist")}>
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
          <h1 className="text-3xl font-bold text-gray-900">Pending Claims</h1>
          <p className="text-gray-600 mt-1">
            As a Payroll Specialist, approve/reject expense claims, so that they can be escalated to the Payroll Manager in case of approval.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-specialist")}>
          Back to Dashboard
        </Button>
      </div>

      {claims.length > 0 ? (
        <div className="space-y-4">
          {claims.map((claim) => (
            <Card key={claim._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {claim.claimId}
                      </h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                        {claim.status === "under review" ? "Under Review" : "Pending Approval"}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                        {claim.claimType}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{claim.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                      {claim.employeeId && (
                        <div>
                          <span className="font-medium text-gray-500">Employee:</span>{" "}
                          {claim.employeeId.firstName} {claim.employeeId.lastName} ({claim.employeeId.employeeNumber})
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-500">Amount:</span>{" "}
                        {formatCurrency(claim.amount)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Submitted:</span>{" "}
                        {formatDate(claim.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Link href={`/dashboard/payroll-tracking/claims/${claim._id}`}>
                      <Button variant="primary" size="sm">
                        Review Claim
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push("/dashboard/payroll-tracking/claims")}
                    >
                      View All Claims
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Claims</h3>
              <p className="text-sm text-gray-600 mb-4">
                There are no claims awaiting your review at this time.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard/payroll-specialist")}>
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
              <p className="font-semibold text-blue-900 mb-1">Approve/Reject Expense Claims</p>
              <p className="text-sm text-blue-800 mb-2">
                As a Payroll Specialist, you can approve or reject expense claims. Click "Review Claim" to investigate the claim and make your decision.
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
                <li>
                  <strong>Approve:</strong> If the claim is valid, approve it. You can approve a partial amount if needed. The claim will be escalated to the Payroll Manager for final confirmation.
                </li>
                <li>
                  <strong>Reject:</strong> If the claim is invalid, reject it with a clear reason. The employee will be notified of the rejection.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Workflow:</strong> Employee submits → Payroll Specialist approves/rejects → (If approved) Payroll Manager confirms → Finance processes refund
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

