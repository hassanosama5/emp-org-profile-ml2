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

interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
  status: "under review" | "pending payroll Manager approval" | "approved" | "rejected";
  createdAt?: string;
}

interface Dispute {
  _id: string;
  disputeId: string;
  description: string;
  status: "under review" | "pending payroll Manager approval" | "approved" | "rejected";
  payslipId: {
    _id: string;
  };
  createdAt?: string;
}

interface Refund {
  _id: string;
  claimId?: {
    _id: string;
    claimId: string;
    claimType: string;
  };
  disputeId?: {
    _id: string;
    disputeId: string;
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
  createdAt?: string;
}

interface TrackingData {
  claims: Claim[];
  disputes: Dispute[];
  refunds: Refund[];
}

export default function TrackingPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<TrackingData>({ claims: [], disputes: [], refunds: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "claims" | "disputes" | "refunds">("all");

  // Allow all employee roles to access this page (all roles are employees and need to check their salary, claims, etc.)
  // Staff roles (Payroll Specialist, Payroll Manager, Finance Staff, System Admin) can access any employee's data
  const hasAccess = user?.roles?.some(
    (role) => 
      role === SystemRole.DEPARTMENT_EMPLOYEE || 
      role === SystemRole.DEPARTMENT_HEAD ||
      role === SystemRole.HR_MANAGER ||
      role === SystemRole.HR_EMPLOYEE ||
      role === SystemRole.HR_ADMIN ||
      role === SystemRole.RECRUITER ||
      role === SystemRole.LEGAL_POLICY_ADMIN ||
      role === SystemRole.FINANCE_STAFF || 
      role === SystemRole.PAYROLL_SPECIALIST ||
      role === SystemRole.PAYROLL_MANAGER ||
      role === SystemRole.SYSTEM_ADMIN
  );

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !hasAccess)) {
      router.replace("/auth/login");
    }
  }, [hasAccess, isAuthenticated, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      // Only fetch data if user is authenticated and has access
      if (authLoading || !isAuthenticated || !hasAccess) {
        return;
      }

      const isFinanceStaff = user?.roles?.includes(SystemRole.FINANCE_STAFF);
      const isPayrollSpecialist = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
      const isPayrollManager = user?.roles?.includes(SystemRole.PAYROLL_MANAGER);

      try {
        let claims, disputes, refunds;

        if (isFinanceStaff || isPayrollSpecialist || isPayrollManager) {
          // Finance staff, Payroll Specialists, and Payroll Managers should see ALL claims, disputes, and refunds
          console.log("Fetching ALL tracking data for Staff");
          const [allClaims, allDisputes, allRefunds] = await Promise.all([
            payslipsApi.getAllClaims(),
            payslipsApi.getAllDisputes(),
            payslipsApi.getAllRefunds(),
          ]);
          
          claims = allClaims || [];
          disputes = allDisputes || [];
          refunds = allRefunds || [];
        } else {
          // Regular employees see only their own data
          if (!user?.id && !user?.userId) {
            setError("User ID not found");
            setLoading(false);
            return;
          }
          
          const employeeId = user.id || user.userId;
          console.log("Fetching tracking data for employeeId:", employeeId);
          [claims, disputes, refunds] = await Promise.all([
            payslipsApi.getClaimsByEmployeeId(employeeId!),
            payslipsApi.getDisputesByEmployeeId(employeeId!),
            payslipsApi.getRefundsByEmployeeId(employeeId!),
          ]);
        }

        console.log("Tracking data fetched:", { 
          claimsCount: claims?.length || 0, 
          disputesCount: disputes?.length || 0, 
          refundsCount: refunds?.length || 0,
          refunds: refunds 
        });
        setData({ claims: claims || [], disputes: disputes || [], refunds: refunds || [] });
      } catch (err: any) {
        console.error("Error fetching tracking data:", err);
        setError(err.message || "Failed to load tracking data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAuthenticated, hasAccess, authLoading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getApprovalStatusBadge = (status: string) => {
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
          Pending Approval
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

  const getPaymentStatus = (item: Claim | Dispute, refunds: Refund[]) => {
    const refund = refunds.find(
      (r) =>
        (item._id && r.claimId?._id === item._id) ||
        (item._id && r.disputeId?._id === item._id)
    );
    
    if (!refund) {
      // Check if approved but no refund yet
      if (item.status === "approved") {
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

  // Calculate statistics
  const stats = {
    totalClaims: data.claims.length,
    approvedClaims: data.claims.filter((c) => c.status === "approved").length,
    totalDisputes: data.disputes.length,
    approvedDisputes: data.disputes.filter((d) => d.status === "approved").length,
    pendingRefunds: data.refunds.filter((r) => r.status === "pending").length,
    paidRefunds: data.refunds.filter((r) => r.status === "paid").length,
    totalPendingAmount: data.refunds
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + (r.refundDetails?.amount || 0), 0),
    totalPaidAmount: data.refunds
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + (r.refundDetails?.amount || 0), 0),
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tracking information...</p>
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

  const filteredClaims = activeTab === "all" || activeTab === "claims" ? data.claims : [];
  const filteredDisputes = activeTab === "all" || activeTab === "disputes" ? data.disputes : [];
  const filteredRefunds = activeTab === "all" || activeTab === "refunds" ? data.refunds : [];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims & Disputes Tracking</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, track the approval and payment status of your claims and disputes, so that you know when you'll be reimbursed.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">Total Claims</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalClaims}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.approvedClaims} approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">Total Disputes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDisputes}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.approvedDisputes} approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">Pending Refunds</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pendingRefunds}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(stats.totalPendingAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">Paid Refunds</p>
            <p className="text-2xl font-bold text-green-600">{stats.paidRefunds}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(stats.totalPaidAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All ({data.claims.length + data.disputes.length})
          </button>
          <button
            onClick={() => setActiveTab("claims")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "claims"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Claims ({data.claims.length})
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "disputes"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Disputes ({data.disputes.length})
          </button>
          <button
            onClick={() => setActiveTab("refunds")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "refunds"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Refunds ({data.refunds.length})
          </button>
        </nav>
      </div>

      {/* Claims List */}
      {filteredClaims.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Claims</h2>
          <div className="space-y-4">
            {filteredClaims.map((claim) => {
              const paymentStatus = getPaymentStatus(claim, data.refunds);
              return (
                <Card key={claim._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{claim.claimId}</h3>
                          {getApprovalStatusBadge(claim.status)}
                          {paymentStatus.status !== "not_applicable" && (
                            getPaymentStatusBadge(paymentStatus.status)
                          )}
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            {claim.claimType}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{claim.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Claimed Amount</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(claim.amount)}
                            </p>
                          </div>
                          {claim.approvedAmount !== undefined && claim.approvedAmount !== null && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Approved Amount</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(claim.approvedAmount)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                            <p className="text-sm font-medium text-gray-900">
                              {paymentStatus.message}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link href={`/dashboard/payroll-tracking/claims/${claim._id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Disputes List */}
      {filteredDisputes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Disputes</h2>
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => {
              const paymentStatus = getPaymentStatus(dispute, data.refunds);
              return (
                <Card key={dispute._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {dispute.disputeId}
                          </h3>
                          {getApprovalStatusBadge(dispute.status)}
                          {paymentStatus.status !== "not_applicable" && (
                            getPaymentStatusBadge(paymentStatus.status)
                          )}
                        </div>
                        <p className="text-gray-700 mb-3">{dispute.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                            <p className="text-sm font-medium text-gray-900">
                              {paymentStatus.message}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Created</p>
                            <p className="text-sm text-gray-900">{formatDate(dispute.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link href={`/dashboard/payroll-tracking/disputes/${dispute._id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Refunds List */}
      {filteredRefunds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Refunds</h2>
          <div className="space-y-4">
            {filteredRefunds.map((refund) => (
              <Card key={refund._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getPaymentStatusBadge(refund.status)}
                        {refund.claimId && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                            Claim: {refund.claimId.claimId}
                          </span>
                        )}
                        {refund.disputeId && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                            Dispute: {refund.disputeId.disputeId}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{refund.refundDetails?.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Refund Amount</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(refund.refundDetails?.amount || 0)}
                          </p>
                        </div>
                        {refund.paidInPayrollRunId && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Paid In Payroll Run</p>
                            <p className="text-sm font-medium text-gray-900">
                              {refund.paidInPayrollRunId.runId}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Created</p>
                          <p className="text-sm text-gray-900">{formatDate(refund.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredClaims.length === 0 && filteredDisputes.length === 0 && filteredRefunds.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Items Found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {activeTab === "all"
                  ? "You don't have any claims, disputes, or refunds yet."
                  : activeTab === "claims"
                  ? "You don't have any claims yet."
                  : activeTab === "disputes"
                  ? "You don't have any disputes yet."
                  : "You don't have any refunds yet."}
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/dashboard/payroll-tracking/claims/new">
                  <Button variant="outline">Submit Claim</Button>
                </Link>
                <Link href="/dashboard/payroll-tracking/disputes/new">
                  <Button variant="outline">Create Dispute</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Understanding Payment Status</p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Under Review:</strong> Your claim/dispute is being reviewed by the payroll team
                </li>
                <li>
                  <strong>Pending Approval:</strong> Waiting for manager approval
                </li>
                <li>
                  <strong>Approved:</strong> Approved and awaiting refund generation by finance team
                </li>
                <li>
                  <strong>Pending Payment:</strong> Refund generated, will be paid in the next payroll cycle
                </li>
                <li>
                  <strong>Paid:</strong> Refund has been processed and included in your payslip
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Once a refund is marked as "Paid", you can find it in your payslip
                under the refunds section. The payment is typically processed in the next available payroll cycle
                after approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

