"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Payslip } from "@/types/payslip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SalaryHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [salaryHistory, setSalaryHistory] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(12);

  // All authenticated users can view their own salary history (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchSalaryHistory = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getSalaryHistory(employeeId!, limit);
        setSalaryHistory(data);
      } catch (err: any) {
        setError(err.message || "Failed to load salary history");
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryHistory();
  }, [user, limit]);

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return "N/A";
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

  const formatMonthYear = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return dateString;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "paid") {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          Paid
        </span>
      );
    } else if (statusLower === "pending") {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
          Pending
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
          {status}
        </span>
      );
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (salaryHistory.length === 0) return null;

    const totalGross = salaryHistory.reduce((sum, payslip) => sum + (payslip.totalGrossSalary || 0), 0);
    const totalDeductions = salaryHistory.reduce((sum, payslip) => sum + (payslip.totaDeductions || 0), 0);
    const totalNet = salaryHistory.reduce((sum, payslip) => sum + (payslip.netPay || 0), 0);
    const averageGross = totalGross / salaryHistory.length;
    const averageNet = totalNet / salaryHistory.length;
    const highestNet = Math.max(...salaryHistory.map((p) => p.netPay || 0));
    const lowestNet = Math.min(...salaryHistory.map((p) => p.netPay || 0));

    return {
      totalGross,
      totalDeductions,
      totalNet,
      averageGross,
      averageNet,
      highestNet,
      lowestNet,
      count: salaryHistory.length,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading salary history...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Salary History</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, access your salary history so you can track payments over time.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
            <option value={36}>Last 36 months</option>
            <option value={1000}>All time</option>
          </select>
          <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
            Back to Payroll
          </Button>
        </div>
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-1">Total Gross Salary</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalGross)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.count} {stats.count === 1 ? "period" : "periods"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-red-600">
                -{formatCurrency(stats.totalDeductions)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Average: {formatCurrency(stats.totalDeductions / stats.count)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-1">Total Net Pay</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalNet)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Average: {formatCurrency(stats.averageNet)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 mb-1">Net Pay Range</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(stats.lowestNet)} - {formatCurrency(stats.highestNet)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Lowest to Highest
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salary History Table */}
      {salaryHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Detailed breakdown of your salary payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payroll Run</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Gross Salary</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deductions</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Net Pay</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((payslip) => (
                    <tr
                      key={payslip._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {payslip.payrollRunId?.payrollPeriod
                              ? formatMonthYear(payslip.payrollRunId.payrollPeriod)
                              : "N/A"}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-600">
                          {payslip.payrollRunId?.runId || "N/A"}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payslip.totalGrossSalary)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-semibold text-red-600">
                          -{formatCurrency(payslip.totaDeductions || 0)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-bold text-green-600 text-lg">
                          {formatCurrency(payslip.netPay)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getPaymentStatusBadge(payslip.paymentStatus)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="text-sm text-gray-600">
                          {formatDate(payslip.createdAt)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Link href={`/dashboard/payroll-tracking/${payslip._id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Salary History Available
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You don't have any salary history records yet.
              </p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
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
              <p className="font-semibold text-blue-900 mb-1">Track Your Payments Over Time</p>
              <p className="text-sm text-blue-800 mb-3">
                Your salary history allows you to track all your salary payments over time. This helps you:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Monitor Payment Trends:</strong> See how your salary has changed over time, including gross salary, deductions, and net pay.
                </li>
                <li>
                  <strong>Track Payment Status:</strong> View whether each payment has been processed (Paid/Pending) so you know when payments were made.
                </li>
                <li>
                  <strong>Review Payment Details:</strong> Each entry shows gross salary, total deductions, and net pay for that period.
                </li>
                <li>
                  <strong>Access Historical Data:</strong> Use the limit selector to view different time periods (6, 12, 24, 36 months, or all time).
                </li>
                <li>
                  <strong>View Statistics:</strong> See totals, averages, and ranges for gross salary, deductions, and net pay across all periods.
                </li>
                <li>
                  <strong>Detailed Payslip Access:</strong> Click "View Details" on any entry to see the full payslip with all earnings and deductions breakdown.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your salary history is sorted by most recent first. You can view detailed information for any payslip by clicking
                "View Details". This helps you track payments over time and understand your salary trends.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

