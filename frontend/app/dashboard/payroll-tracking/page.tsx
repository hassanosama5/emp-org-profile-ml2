"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Payslip } from "@/types/payslip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

export default function PayrollPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Allow ALL authenticated users to access this page (all roles are employees and need to check their salary, claims, etc.)
  // Staff roles (Payroll Specialist, Payroll Manager, Finance Staff, System Admin) can access any employee's data
  // But all users should be able to access their own payroll-tracking information
  // No need for hasAccess variable - all authenticated users have access

  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Wait for mount and auth initialization before redirecting
    if (!mounted || authLoading) return;
    
    // All authenticated users have access (all roles are employees)
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
  }, [mounted, isAuthenticated, authLoading, router]);

  useEffect(() => {
    const fetchPayslips = async () => {
      // Only fetch data if user is authenticated (all authenticated users have access)
      if (authLoading || !isAuthenticated) {
        return;
      }

      // For Finance staff and Payroll Specialists, they might not have an employee ID, so show empty state
      // TODO: In the future, Finance staff and Payroll Specialists could see all payslips or a different view
      if (!user?.id && !user?.userId) {
        // Finance staff and Payroll Specialists might not have employee profile - show empty state
        if (
          user?.roles?.includes(SystemRole.FINANCE_STAFF) ||
          user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST) ||
          user?.roles?.includes(SystemRole.PAYROLL_MANAGER)
        ) {
          setPayslips([]);
          setLoading(false);
          return;
        }
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getPayslipsByEmployeeId(employeeId!);
        setPayslips(data);
      } catch (err: any) {
        setError(err.message || "Failed to load payroll information");
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [user, isAuthenticated, authLoading]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadge = (status?: string, paymentStatus?: string) => {
    const statusColors: Record<string, string> = {
      paid: "bg-green-100 text-green-800 border border-green-300",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      disputed: "bg-red-100 text-red-800 border border-red-300",
      "paid-disputed": "bg-orange-100 text-orange-800 border border-orange-300",
    };

    const color = statusColors[status || "pending"] || "bg-gray-100 text-gray-800 border border-gray-300";
    const displayText = status === "paid-disputed" 
      ? "PAID (DISPUTED)" 
      : status?.toUpperCase() || "PENDING";
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        {displayText}
      </span>
    );
  };

  const getStatusMessage = (payslip: Payslip): string => {
    if (payslip.status === "paid") {
      return "Your salary has been processed and paid.";
    } else if (payslip.status === "paid-disputed") {
      return "Your salary has been paid, but there is an active dispute on this payslip.";
    } else if (payslip.status === "disputed") {
      return "This payslip has an active dispute. Payment is on hold until resolved.";
    } else {
      return "Your salary is being processed. Payment is pending.";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-red-200 bg-red-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Payroll Information</h3>
              <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalPayslips = payslips.length;
  const paidPayslips = payslips.filter(p => p.paymentStatus === "PAID").length;
  const pendingPayslips = payslips.filter(p => p.paymentStatus !== "PAID").length;
  const totalNetPay = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const disputedPayslips = payslips.filter(p => p.hasActiveDispute).length;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <span className="text-4xl">💰</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Payroll Tracking</h1>
            <p className="text-gray-600 mt-2 text-lg">View and download your payslips, manage claims, and track disputes</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {totalPayslips > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Payslips</p>
                  <p className="text-3xl font-bold text-gray-900">{totalPayslips}</p>
                </div>
                <span className="text-4xl">📄</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Paid</p>
                  <p className="text-3xl font-bold text-gray-900">{paidPayslips}</p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingPayslips}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>
          {disputedPayslips > 0 && (
            <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Disputed</p>
                    <p className="text-3xl font-bold text-gray-900">{disputedPayslips}</p>
                  </div>
                  <span className="text-4xl">⚠️</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Enhanced Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Enhanced Salary Information Section */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Salary Information</CardTitle>
                <CardDescription className="mt-1">View your salary details and history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/base-salary")}
            >
              <span className="mr-2 text-lg">💰</span>
              <span>Base Salary</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/salary-history")}
            >
              <span className="mr-2 text-lg">📊</span>
              <span>Salary History</span>
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced Earnings & Benefits Section */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-green-300 bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Earnings & Benefits</CardTitle>
                <CardDescription className="mt-1">View your additional earnings and benefits</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/leave-encashment")}
            >
              <span className="mr-2 text-lg">🏖️</span>
              <span>Leave Encashment</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/transportation")}
            >
              <span className="mr-2 text-lg">🚗</span>
              <span>Transportation Allowance</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-green-50 hover:border-green-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/employer-contributions")}
            >
              <span className="mr-2 text-lg">💼</span>
              <span>Employer Contributions</span>
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced Deductions Section */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-red-300 bg-gradient-to-br from-white to-red-50/30">
          <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">📉</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Deductions</CardTitle>
                <CardDescription className="mt-1">View detailed breakdown of deductions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-red-50 hover:border-red-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/tax-deductions")}
            >
              <span className="mr-2 text-lg">📋</span>
              <span>Tax Deductions</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-red-50 hover:border-red-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/insurance-deductions")}
            >
              <span className="mr-2 text-lg">🛡️</span>
              <span>Insurance Deductions</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-red-50 hover:border-red-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/misconduct-deductions")}
            >
              <span className="mr-2 text-lg">⚠️</span>
              <span>Misconduct Deductions</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-red-50 hover:border-red-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/unpaid-leave-deductions")}
            >
              <span className="mr-2 text-lg">📅</span>
              <span>Unpaid Leave Deductions</span>
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced Documents & Reports Section */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Documents & Reports</CardTitle>
                <CardDescription className="mt-1">Access official documents and reports</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-purple-50 hover:border-purple-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/tax-documents")}
            >
              <span className="mr-2 text-lg">📄</span>
              <span>Tax Documents</span>
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced Claims & Disputes Section */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-orange-300 bg-gradient-to-br from-white to-orange-50/30">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">⚖️</span>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Claims & Disputes</CardTitle>
                <CardDescription className="mt-1">Manage your expense claims and disputes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-orange-50 hover:border-orange-300 transition-colors" 
              size="sm"
              onClick={() => {
                // Route Payroll Specialists to pending claims, employees to their claims
                const isPayrollSpecialist = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
                if (isPayrollSpecialist) {
                  router.push("/dashboard/payroll-tracking/pending-claims");
                } else {
                  router.push("/dashboard/payroll-tracking/claims");
                }
              }}
            >
              <span className="mr-2 text-lg">💵</span>
              <span>Expense Claims</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-orange-50 hover:border-orange-300 transition-colors" 
              size="sm"
              onClick={() => {
                // Route Payroll Specialists to pending disputes, employees to their disputes
                const isPayrollSpecialist = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
                if (isPayrollSpecialist) {
                  router.push("/dashboard/payroll-tracking/pending-disputes");
                } else {
                  router.push("/dashboard/payroll-tracking/disputes");
                }
              }}
            >
              <span className="mr-2 text-lg">⚖️</span>
              <span>Payroll Disputes</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-orange-50 hover:border-orange-300 transition-colors" 
              size="sm"
              onClick={() => router.push("/dashboard/payroll-tracking/tracking")}
            >
              <span className="mr-2 text-lg">📈</span>
              <span>Track Status</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Payslips Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <span className="text-2xl">📋</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Payslips</h2>
            <p className="text-gray-600 mt-1">View and download your monthly payslips online. Click "View Details" to see a complete breakdown of your earnings and deductions.</p>
          </div>
        </div>
      </div>

      {payslips.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Payslips Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Your payslips will appear here once they are generated by the payroll system. 
                Check back after your next payroll cycle.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payslips.map((payslip) => (
            <Card key={payslip._id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-xl">💰</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          Payslip - {formatDate(payslip.payrollRunId?.payrollPeriod)}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Run ID: {payslip.payrollRunId?.runId || "N/A"}
                        </p>
                      </div>
                      {getStatusBadge(payslip.status, payslip.paymentStatus)}
                    </div>
                    
                    {/* Enhanced Status Message */}
                    <div className={`mb-4 p-3 rounded-lg text-sm border-2 ${
                      payslip.status === "paid" 
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200"
                        : payslip.status === "paid-disputed" || payslip.status === "disputed"
                        ? "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 border-orange-200"
                        : "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-800 border-yellow-200"
                    }`}>
                      <p className="font-semibold flex items-center gap-2">
                        {payslip.status === "paid" ? "✅" : payslip.status === "disputed" ? "⚠️" : "⏳"}
                        <span>{getStatusMessage(payslip)}</span>
                      </p>
                      {payslip.hasActiveDispute && payslip.latestDispute && (
                        <p className="text-xs mt-2 opacity-90 flex items-center gap-1">
                          <span>📝</span>
                          <span>Latest dispute: {payslip.latestDispute.description.substring(0, 60)}
                          {payslip.latestDispute.description.length > 60 ? "..." : ""}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Gross Salary</p>
                        <p className="font-bold text-gray-900 text-lg">
                          {formatCurrency(payslip.totalGrossSalary)}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Deductions</p>
                        <p className="font-bold text-red-600 text-lg">
                          {formatCurrency(payslip.totaDeductions || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Net Pay</p>
                        <p className="font-bold text-blue-700 text-xl">
                          {formatCurrency(payslip.netPay)}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment Status</p>
                        <p className={`font-bold text-lg ${
                          payslip.paymentStatus === "PAID" ? "text-green-600" : "text-yellow-600"
                        }`}>
                          {payslip.paymentStatus}
                        </p>
                      </div>
                    </div>
                    
                    {payslip.hasActiveDispute && (
                      <div className="mt-3 flex items-center gap-2 text-sm p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-orange-600 font-bold">⚠️ Active Dispute</span>
                        {payslip.disputeCount && payslip.disputeCount > 1 && (
                          <span className="text-gray-600">
                            ({payslip.disputeCount} dispute{payslip.disputeCount > 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href={`/dashboard/payroll-tracking/${payslip._id}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full sm:w-auto hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <span className="mr-2">👁️</span>
                        View Details
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                      onClick={async (e) => {
                        try {
                          const employeeId = user?.id || user?.userId;
                          if (!employeeId) {
                            alert("User ID not found. Please log in again.");
                            return;
                          }
                          
                          // Show loading state
                          const button = e.currentTarget;
                          const originalText = button.textContent;
                          if (button) {
                            button.disabled = true;
                            button.innerHTML = '<span class="mr-2">⏳</span><span>Downloading...</span>';
                          }
                          
                          const blob = await payslipsApi.downloadPayslip(
                            employeeId,
                            payslip._id
                          );
                          
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          const fileName = `payslip-${payslip.payrollRunId?.runId || payslip._id}-${formatDate(payslip.payrollRunId?.payrollPeriod).replace(/\s/g, '-')}.pdf`;
                          a.download = fileName;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          
                          // Restore button
                          if (button) {
                            button.disabled = false;
                            button.innerHTML = '<span class="mr-2">📥</span><span>Download PDF</span>';
                          }
                        } catch (err: any) {
                          console.error("Error downloading payslip:", err);
                          alert(err.message || "Failed to download payslip. Please try again.");
                          // Restore button on error (check if button still exists)
                          const button = e.currentTarget;
                          if (button) {
                            button.disabled = false;
                            button.innerHTML = '<span class="mr-2">📥</span><span>Download PDF</span>';
                          }
                        }
                      }}
                    >
                      <span className="mr-2">📥</span>
                      <span>Download PDF</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

