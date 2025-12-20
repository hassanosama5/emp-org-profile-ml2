"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Payslip } from "@/types/payslip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

export default function PayslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own payslips
  // No need for restrictive useRequireAuth - all roles are employees

  const payslipId = params.id as string;

  useEffect(() => {
    const fetchPayslip = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getPayslipById(employeeId!, payslipId);
        setPayslip(data);
      } catch (err: any) {
        setError(err.message || "Failed to load payslip");
      } finally {
        setLoading(false);
      }
    };

    fetchPayslip();
  }, [user, payslipId]);

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

  const [downloading, setDownloading] = useState(false);
  // Helper function to extract error message from API response
  const getErrorMessage = (err: any): string => {
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
    return "Failed to download payslip. Please try again.";
  };

  const handleDownload = async () => {
    if (!payslip || !user) return;

    try {
      const employeeId = user.id || user.userId;
      if (!employeeId) {
        alert("User ID not found. Please log in again.");
        return;
      }
      
      setDownloading(true);
      const blob = await payslipsApi.downloadPayslip(employeeId, payslip._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = `payslip-${payslip.payrollRunId?.runId || payslip._id}-${formatDate(payslip.payrollRunId?.payrollPeriod).replace(/\s/g, '-')}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloading(false);
    } catch (err: any) {
      console.error("Error downloading payslip:", err);
      const errorMessage = getErrorMessage(err);
      alert(errorMessage);
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-64 bg-gray-200 rounded-lg"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                {error ? "Error Loading Payslip" : "Payslip Not Found"}
              </h3>
              <p className="text-red-700 mb-6 max-w-md mx-auto">
                {error || "The payslip you're looking for doesn't exist or has been removed."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/dashboard/payroll-tracking")}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  ← Back to Payslips
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Enhanced Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <span className="text-3xl">💰</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payslip Details</h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <span>📅</span>
              <span>{formatDate(payslip.payrollRunId?.payrollPeriod)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard/payroll-tracking")}
            className="flex items-center gap-2"
          >
            <span>←</span>
            <span>Back</span>
          </Button>
          <Button 
            variant="primary" 
            onClick={handleDownload} 
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Enhanced Status Overview Card */}
      <Card className="mb-6 shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <CardTitle className="text-xl">Payslip Status & Process</CardTitle>
              <CardDescription className="mt-1">Current status of your salary in the payroll process</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Status */}
            <div className="transform transition-all hover:scale-105">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>💳</span>
                <span>Payment Status</span>
              </p>
              <div className={`p-5 rounded-xl border-2 shadow-md transition-all ${
                payslip.paymentStatus === "PAID" 
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300" 
                  : "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xl font-bold ${
                    payslip.paymentStatus === "PAID" ? "text-green-700" : "text-yellow-700"
                  }`}>
                    {payslip.paymentStatus}
                  </span>
                  <div className={`p-2 rounded-full ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-200" 
                      : "bg-yellow-200 animate-pulse"
                  }`}>
                    {payslip.paymentStatus === "PAID" ? (
                      <span className="text-2xl">✓</span>
                    ) : (
                      <span className="text-2xl">⏳</span>
                    )}
                  </div>
                </div>
                <p className="text-sm mt-2 text-gray-700 leading-relaxed">
                  {payslip.paymentStatus === "PAID" 
                    ? "✅ Your salary has been processed and transferred to your account."
                    : "⏳ Your salary is currently being processed. Payment will be completed soon."}
                </p>
              </div>
            </div>

            {/* Overall Status */}
            <div className="transform transition-all hover:scale-105">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📋</span>
                <span>Overall Status</span>
              </p>
              <div className={`p-5 rounded-xl border-2 shadow-md transition-all ${
                payslip.status === "paid" 
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                  : payslip.status === "disputed" || payslip.status === "paid-disputed"
                  ? "bg-gradient-to-br from-red-50 to-rose-50 border-red-300"
                  : "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xl font-bold ${
                    payslip.status === "paid" 
                      ? "text-green-700"
                      : payslip.status === "disputed" || payslip.status === "paid-disputed"
                      ? "text-red-700"
                      : "text-yellow-700"
                  }`}>
                    {payslip.status === "paid-disputed" ? "PAID (DISPUTED)" : (payslip.status || "PENDING").toUpperCase()}
                  </span>
                  <div className={`p-2 rounded-full ${
                    payslip.status === "paid" 
                      ? "bg-green-200"
                      : payslip.status === "disputed" || payslip.status === "paid-disputed"
                      ? "bg-red-200"
                      : "bg-yellow-200 animate-pulse"
                  }`}>
                    {payslip.status === "paid" ? (
                      <span className="text-2xl">✓</span>
                    ) : payslip.status === "disputed" || payslip.status === "paid-disputed" ? (
                      <span className="text-2xl">⚠️</span>
                    ) : (
                      <span className="text-2xl">⏳</span>
                    )}
                  </div>
                </div>
                <p className="text-sm mt-2 text-gray-700 leading-relaxed">
                  {payslip.status === "paid" 
                    ? "✅ All processes completed successfully."
                    : payslip.status === "paid-disputed"
                    ? "⚠️ Payment completed, but there is an active dispute."
                    : payslip.status === "disputed"
                    ? "🚫 Payment is on hold due to an active dispute."
                    : "⏳ Awaiting processing and approval."}
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Dispute Information */}
          {payslip.hasActiveDispute && payslip.latestDispute && (
            <div className="mt-6 p-5 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-200 rounded-full">
                  <span className="text-3xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-bold text-orange-900 text-lg">Active Dispute</h4>
                    <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-semibold">
                      {payslip.latestDispute.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-orange-900">
                      <span className="font-semibold">Dispute ID:</span>{" "}
                      <span className="font-mono bg-orange-100 px-2 py-1 rounded">{payslip.latestDispute.disputeId}</span>
                    </p>
                    <p className="text-orange-800 leading-relaxed">
                      <span className="font-semibold">Description:</span> {payslip.latestDispute.description}
                    </p>
                    {payslip.latestDispute.createdAt && (
                      <p className="text-xs text-orange-700 mt-3 flex items-center gap-1">
                        <span>📅</span>
                        <span>Created: {formatDate(payslip.latestDispute.createdAt)}</span>
                      </p>
                    )}
                    {payslip.disputeCount && payslip.disputeCount > 1 && (
                      <p className="text-xs text-orange-700 flex items-center gap-1">
                        <span>📊</span>
                        <span>Total disputes on this payslip: {payslip.disputeCount}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Status Timeline */}
          <div className="mt-8">
            <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>🕐</span>
              <span>Process Timeline</span>
            </p>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-4 relative">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-500 shadow-lg shadow-green-200" 
                      : "bg-gray-300"
                  }`}>
                    {payslip.paymentStatus === "PAID" ? (
                      <span className="text-white text-sm">✓</span>
                    ) : (
                      <span className="text-gray-500 text-xs">1</span>
                    )}
                  </div>
                  <div className={`flex-1 p-3 rounded-lg ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-gray-50 border border-gray-200"
                  }`}>
                    <span className={`text-sm font-medium ${
                      payslip.paymentStatus === "PAID" ? "text-green-900" : "text-gray-500"
                    }`}>
                      Payslip Generated
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-500 shadow-lg shadow-green-200" 
                      : "bg-gray-300"
                  }`}>
                    {payslip.paymentStatus === "PAID" ? (
                      <span className="text-white text-sm">✓</span>
                    ) : (
                      <span className="text-gray-500 text-xs">2</span>
                    )}
                  </div>
                  <div className={`flex-1 p-3 rounded-lg ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-gray-50 border border-gray-200"
                  }`}>
                    <span className={`text-sm font-medium ${
                      payslip.paymentStatus === "PAID" ? "text-green-900" : "text-gray-500"
                    }`}>
                      Approved by Finance
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-500 shadow-lg shadow-green-200" 
                      : "bg-gray-300"
                  }`}>
                    {payslip.paymentStatus === "PAID" ? (
                      <span className="text-white text-sm">✓</span>
                    ) : (
                      <span className="text-gray-500 text-xs">3</span>
                    )}
                  </div>
                  <div className={`flex-1 p-3 rounded-lg ${
                    payslip.paymentStatus === "PAID" 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-gray-50 border border-gray-200"
                  }`}>
                    <span className={`text-sm font-medium ${
                      payslip.paymentStatus === "PAID" ? "text-green-900" : "text-gray-500"
                    }`}>
                      Payment Processed
                    </span>
                  </div>
                </div>
                {payslip.hasActiveDispute && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t-2 border-orange-200">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 bg-orange-500 shadow-lg shadow-orange-200">
                      <span className="text-white text-sm">⚠</span>
                    </div>
                    <div className="flex-1 p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <span className="text-sm font-medium text-orange-900">
                        Dispute Under Review
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Summary Card */}
        <Card className="lg:col-span-1 shadow-lg border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <CardTitle>Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-5">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Employee</p>
                <p className="font-bold text-gray-900 text-lg">
                  {payslip.employeeId?.firstName} {payslip.employeeId?.lastName}
                </p>
                <p className="text-sm text-gray-600 mt-1 font-mono">{payslip.employeeId?.employeeNumber}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payroll Run</p>
                <p className="font-bold text-gray-900 text-lg">
                  {payslip.payrollRunId?.runId || "N/A"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Period</p>
                <p className="font-bold text-gray-900 text-lg">
                  {formatDate(payslip.payrollRunId?.payrollPeriod)}
                </p>
              </div>
              {payslip.createdAt && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Generated</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {formatDate(payslip.createdAt)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Earnings and Deductions */}
        <Card className="lg:col-span-2 shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xl">💵</span>
              <CardTitle>Earnings & Deductions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-8">
              {/* Enhanced Earnings */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-xl">📈</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Earnings</h3>
                </div>
                <div className="space-y-3 bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded border border-green-100">
                    <span className="text-gray-700 font-medium">Base Salary</span>
                    <span className="font-bold text-gray-900 text-lg">
                      {formatCurrency(payslip.earningsDetails.baseSalary)}
                    </span>
                  </div>
                  
                  {payslip.earningsDetails.allowances?.map((allowance, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-green-100">
                      <span className="text-gray-700 font-medium">{allowance.allowanceName}</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(allowance.amount)}
                      </span>
                    </div>
                  ))}

                  {payslip.earningsDetails.bonuses?.map((bonus, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-green-100">
                      <span className="text-gray-700 font-medium flex items-center gap-2">
                        <span>🎁</span>
                        <span>{bonus.bonusName}</span>
                      </span>
                      <span className="font-bold text-green-600 text-lg">
                        +{formatCurrency(bonus.amount)}
                      </span>
                    </div>
                  ))}

                  {payslip.earningsDetails.refunds?.map((refund, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-green-100">
                      <span className="text-gray-700 font-medium flex items-center gap-2">
                        <span>💰</span>
                        <span>{refund.refundDescription}</span>
                      </span>
                      <span className="font-bold text-green-600 text-lg">
                        +{formatCurrency(refund.refundAmount)}
                      </span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center py-3 px-4 mt-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
                    <span className="text-lg font-bold text-gray-900">Gross Salary</span>
                    <span className="text-xl font-bold text-green-700">
                      {formatCurrency(payslip.totalGrossSalary)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Deductions */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-xl">📉</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Deductions</h3>
                </div>
                <div className="space-y-3 bg-red-50 rounded-lg p-4 border border-red-200">
                  {payslip.deductionsDetails.taxes?.map((tax, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-red-100">
                      <span className="text-gray-700 font-medium flex items-center gap-2">
                        <span>📋</span>
                        <span>{tax.taxName} ({tax.taxRate}%)</span>
                      </span>
                      <span className="font-bold text-red-600">
                        -{formatCurrency(tax.taxAmount)}
                      </span>
                    </div>
                  ))}

                  {payslip.deductionsDetails.insurances?.map((insurance, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-red-100">
                      <span className="text-gray-700 font-medium flex items-center gap-2">
                        <span>🛡️</span>
                        <span>{insurance.insuranceName}</span>
                      </span>
                      <span className="font-bold text-red-600">
                        -{formatCurrency(insurance.employeeContribution)}
                      </span>
                    </div>
                  ))}

                  {payslip.deductionsDetails.penalties && (
                    <>
                      {payslip.deductionsDetails.penalties.missingHoursDeduction && (
                        <div className="flex justify-between items-center py-2 px-3 bg-white rounded border border-red-100">
                          <span className="text-gray-700 font-medium flex items-center gap-2">
                            <span>⏰</span>
                            <span>Missing Hours Deduction</span>
                          </span>
                          <span className="font-bold text-red-600">
                            -{formatCurrency(payslip.deductionsDetails.penalties.missingHoursDeduction)}
                          </span>
                        </div>
                      )}
                      {payslip.deductionsDetails.penalties.missingDaysDeduction && (
                        <div className="flex justify-between items-center py-2 px-3 bg-white rounded border border-red-100">
                          <span className="text-gray-700 font-medium flex items-center gap-2">
                            <span>📅</span>
                            <span>Missing Days Deduction</span>
                          </span>
                          <span className="font-bold text-red-600">
                            -{formatCurrency(payslip.deductionsDetails.penalties.missingDaysDeduction)}
                          </span>
                        </div>
                      )}
                      {payslip.deductionsDetails.penalties.unpaidLeaveDeduction && (
                        <div className="flex justify-between items-center py-2 px-3 bg-white rounded border border-red-100">
                          <span className="text-gray-700 font-medium flex items-center gap-2">
                            <span>🏖️</span>
                            <span>Unpaid Leave Deduction</span>
                          </span>
                          <span className="font-bold text-red-600">
                            -{formatCurrency(payslip.deductionsDetails.penalties.unpaidLeaveDeduction)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between items-center py-3 px-4 mt-4 bg-gradient-to-r from-red-100 to-rose-100 rounded-lg border-2 border-red-300">
                    <span className="text-lg font-bold text-gray-900">Total Deductions</span>
                    <span className="text-xl font-bold text-red-700">
                      -{formatCurrency(payslip.totaDeductions || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Net Pay */}
              <div className="pt-6 border-t-4 border-blue-400">
                <div className="flex justify-between items-center py-5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">💵</span>
                    <span className="text-2xl font-bold text-white">Net Pay</span>
                  </div>
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(payslip.netPay)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

