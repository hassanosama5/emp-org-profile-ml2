"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Dispute {
  _id: string;
  disputeId: string;
  description: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payslipId: {
    _id: string;
    payrollRunId?: {
      runId: string;
      payrollPeriod: string;
    };
  };
  status: "under review" | "pending payroll Manager approval" | "approved" | "rejected";
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Refund {
  _id: string;
  claimId?: {
    _id: string;
  };
  disputeId?: {
    _id: string;
  };
  refundDetails: {
    description: string;
    amount: number;
  };
  status: "pending" | "paid";
  paidInPayrollRunId?: {
    _id: string;
    runId: string;
    payrollPeriod: string;
  };
}

export default function DisputesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Allow ALL authenticated users (all roles are employees and need to check their disputes)
  // Staff roles can view all disputes, regular employees can only view their own
  const isPayrollSpecialist = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
  const isPayrollManager = user?.roles?.includes(SystemRole.PAYROLL_MANAGER);
  const isFinanceStaff = user?.roles?.includes(SystemRole.FINANCE_STAFF);
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  const isEmployee = user?.roles?.includes(SystemRole.DEPARTMENT_EMPLOYEE);
  
  // All authenticated users have access to view their own disputes
  // No need for useRequireAuth since we check authentication in the component

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        let data;
        
        // All authenticated users can fetch their own disputes
        // Staff roles (Payroll Specialist, Payroll Manager, Finance Staff, System Admin) can fetch all disputes
        let refundsData: Refund[] = [];
        
        if (isPayrollSpecialist || isPayrollManager || isFinanceStaff || isSystemAdmin) {
          // For payroll staff, fetch all disputes (regardless of status)
          [data, refundsData] = await Promise.all([
            payslipsApi.getAllDisputes(),
            payslipsApi.getAllRefunds(),
          ]);
        } else if (user?.id || user?.userId) {
          // For all other users (all roles are employees), fetch only their own disputes
          const employeeId = user.id || user.userId;
          [data, refundsData] = await Promise.all([
            payslipsApi.getDisputesByEmployeeId(employeeId!),
            payslipsApi.getRefundsByEmployeeId(employeeId!),
          ]);
        } else {
          setError("User ID not found");
          setLoading(false);
          return;
        }
        
        setDisputes(Array.isArray(data) ? data : []);
        setRefunds(Array.isArray(refundsData) ? refundsData : []);
      } catch (err: any) {
        // If error is 403 and user is payroll staff, show empty state instead of error
        if ((isPayrollSpecialist || isPayrollManager || isFinanceStaff || isSystemAdmin) && err.message?.includes('403')) {
          setDisputes([]);
        } else {
          setError(err.message || "Failed to load disputes");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDisputes();
    }
  }, [user, isEmployee, isPayrollSpecialist, isPayrollManager, isFinanceStaff, isSystemAdmin]);

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

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "approved") {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          Approved
        </span>
      );
    } else if (statusLower === "rejected") {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
          Rejected
        </span>
      );
    } else if (statusLower === "pending payroll manager approval" || statusLower.includes("pending")) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
          Pending Manager Approval
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
          Under Review
        </span>
      );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === "paid") {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          Paid
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
          Pending Payment
        </span>
      );
    }
  };

  const getPaymentStatus = (dispute: Dispute) => {
    const refund = refunds.find(
      (r) => r.disputeId?._id === dispute._id
    );
    
    if (!refund) {
      // Check if approved but no refund yet
      if (dispute.status === "approved") {
        return { status: "pending", message: "Awaiting refund generation" };
      }
      return { status: "not_applicable", message: "Not approved yet" };
    }
    
    if (refund.status === "paid") {
      return {
        status: "paid",
        message: `Paid in ${refund.paidInPayrollRunId?.runId || "payroll run"}`,
        refund,
      };
    }
    
    return { status: "pending", message: "Pending payment in next payroll", refund };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading disputes...</p>
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
                <Button onClick={() => window.location.reload()}>Retry</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
                  Back to Payroll
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
          <h1 className="text-3xl font-bold text-gray-900">
            {isEmployee ? "My Payroll Disputes" : "All Payroll Disputes"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEmployee 
              ? "As an Employee, track the approval and payment status of your claims and disputes, so that you know when you'll be reimbursed."
              : "View and manage all payroll disputes"}
          </p>
        </div>
        <div className="flex gap-2">
          {isEmployee && (
            <Link href="/dashboard/payroll-tracking/disputes/new">
              <Button>Create New Dispute</Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => {
            // Redirect based on user role
            if (isPayrollManager) {
              router.push("/dashboard/payroll-manager");
            } else if (isPayrollSpecialist) {
              router.push("/dashboard/payroll-specialist");
            } else if (isFinanceStaff) {
              router.push("/dashboard/finance");
            } else {
              router.push("/dashboard/payroll-tracking");
            }
          }}>
            Back
          </Button>
        </div>
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
                      {getStatusBadge(dispute.status)}
                      {(() => {
                        const paymentStatus = getPaymentStatus(dispute);
                        return paymentStatus.status !== "not_applicable" && getPaymentStatusBadge(paymentStatus.status);
                      })()}
                    </div>
                    <p className="text-gray-700 mb-3">{dispute.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Payslip:</span>{" "}
                        {dispute.payslipId?.payrollRunId?.runId || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Period:</span>{" "}
                        {dispute.payslipId?.payrollRunId?.payrollPeriod
                          ? new Date(dispute.payslipId.payrollRunId.payrollPeriod).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                            })
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Payment Status:</span> {getPaymentStatus(dispute).message}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(dispute.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span> {formatDate(dispute.updatedAt)}
                      </div>
                    </div>
                    {dispute.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-800">{dispute.rejectionReason}</p>
                      </div>
                    )}
                    {dispute.resolutionComment && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900 mb-1">Resolution Comment:</p>
                        <p className="text-sm text-green-800">{dispute.resolutionComment}</p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <Link href={`/dashboard/payroll-tracking/disputes/${dispute.disputeId}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
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
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Disputes Found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You haven't created any payroll disputes yet.
              </p>
              <Link href="/dashboard/payroll-tracking/disputes/new">
                <Button>Create Your First Dispute</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

