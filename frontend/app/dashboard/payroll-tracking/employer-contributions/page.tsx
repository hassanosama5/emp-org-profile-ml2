"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface EmployerContribution {
  type: string;
  employeeContribution: number;
  employerContribution: number;
  total: number;
}

interface EmployerContributionsData {
  payslipId: string;
  payrollPeriod?: {
    _id: string;
    runId: string;
    payrollPeriod: string;
    status: string;
    entity?: string;
  };
  employerContributions: EmployerContribution[];
  totalEmployerContributions: number;
}

export default function EmployerContributionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [contributionsData, setContributionsData] = useState<EmployerContributionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own employer contributions (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchEmployerContributions = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getEmployerContributions(employeeId!);
        setContributionsData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load employer contributions information");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployerContributions();
  }, [user]);

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
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getContributionTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      HEALTH: "Health Insurance",
      DENTAL: "Dental Insurance",
      VISION: "Vision Insurance",
      LIFE: "Life Insurance",
      DISABILITY: "Disability Insurance",
      PENSION: "Pension",
      RETIREMENT: "Retirement",
      SOCIAL_SECURITY: "Social Security",
      MEDICARE: "Medicare",
      OTHER: "Other",
    };
    return typeMap[type] || type;
  };

  const getContributionTypeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      HEALTH: "🏥",
      DENTAL: "🦷",
      VISION: "👁️",
      LIFE: "🛡️",
      DISABILITY: "♿",
      PENSION: "💰",
      RETIREMENT: "🏦",
      SOCIAL_SECURITY: "🏛️",
      MEDICARE: "⚕️",
      OTHER: "📋",
    };
    return iconMap[type] || "💼";
  };

  const getContributionTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      HEALTH: "bg-blue-100 text-blue-800 border-blue-300",
      DENTAL: "bg-teal-100 text-teal-800 border-teal-300",
      VISION: "bg-purple-100 text-purple-800 border-purple-300",
      LIFE: "bg-green-100 text-green-800 border-green-300",
      DISABILITY: "bg-orange-100 text-orange-800 border-orange-300",
      PENSION: "bg-yellow-100 text-yellow-800 border-yellow-300",
      RETIREMENT: "bg-indigo-100 text-indigo-800 border-indigo-300",
      SOCIAL_SECURITY: "bg-gray-100 text-gray-800 border-gray-300",
      MEDICARE: "bg-pink-100 text-pink-800 border-pink-300",
      OTHER: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colorMap[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading employer contributions information...</p>
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

  if (!contributionsData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No employer contributions information available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasContributions = contributionsData.employerContributions.length > 0;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employer Contributions</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view employer contributions (insurance, pension, allowances) so you know the full value of your benefits package.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Payroll Period Info */}
      {contributionsData.payrollPeriod && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payroll Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contributionsData.payrollPeriod.runId && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payroll Run ID</p>
                  <p className="font-semibold text-gray-900">
                    {contributionsData.payrollPeriod.runId}
                  </p>
                </div>
              )}
              {contributionsData.payrollPeriod.payrollPeriod && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Period</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(contributionsData.payrollPeriod.payrollPeriod)}
                  </p>
                </div>
              )}
              {contributionsData.payrollPeriod.status && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {contributionsData.payrollPeriod.status.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Employer Contributions Summary */}
      <Card className={`mb-6 ${hasContributions ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
        <CardHeader>
          <CardTitle className={hasContributions ? 'text-green-900' : 'text-gray-900'}>
            Total Employer Contributions
          </CardTitle>
          <CardDescription>
            Total amount your employer contributes towards your benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-green-600 mb-2">
              {formatCurrency(contributionsData.totalEmployerContributions)}
            </p>
            <p className="text-sm text-gray-600">
              This is the total amount your employer pays on your behalf for benefits
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Employer Contributions Breakdown */}
      {hasContributions ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contributions Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of employer contributions by benefit type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contributionsData.employerContributions.map((contribution, idx) => (
                <div
                  key={idx}
                  className="p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-3xl">{getContributionTypeIcon(contribution.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {getContributionTypeLabel(contribution.type)}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getContributionTypeColor(contribution.type)}`}>
                            {contribution.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs text-gray-500 mb-1">Your Contribution</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {formatCurrency(contribution.employeeContribution)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs text-gray-500 mb-1">Employer Contribution</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(contribution.employerContribution)}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-xs text-gray-500 mb-1">Total Coverage</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(contribution.total)}
                        </p>
                      </div>
                    </div>
                    {contribution.employerContribution > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Employer Contribution Percentage</span>
                          <span className="font-semibold text-green-600">
                            {((contribution.employerContribution / contribution.total) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-3">ℹ️</div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                No Employer Contributions Found
              </h3>
              <p className="text-sm text-yellow-800">
                No employer contributions are recorded for this payroll period.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits Summary Card */}
      {hasContributions && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Benefits Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Employee Contributions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    contributionsData.employerContributions.reduce(
                      (sum, contrib) => sum + (contrib.employeeContribution || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Coverage Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    contributionsData.employerContributions.reduce(
                      (sum, contrib) => sum + (contrib.total || 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Your Full Benefits Package</p>
              <p className="text-sm text-blue-800 mb-3">
                Employer contributions show the full value of your benefits package. Your employer pays these amounts on your behalf for:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Insurance (Health, Dental, Vision, Life, Disability):</strong> Your employer shares the cost of insurance premiums, making comprehensive coverage more affordable.
                </li>
                <li>
                  <strong>Pension & Retirement Plans:</strong> Your employer contributes to your pension and retirement savings, helping secure your financial future.
                </li>
                <li>
                  <strong>Social Security & Medicare:</strong> Employer contributions to social security and Medicare programs (if applicable in your region).
                </li>
                <li>
                  <strong>Allowances & Other Benefits:</strong> Additional employer contributions for various allowances and benefits as part of your compensation package.
                </li>
                <li>
                  <strong>Total Coverage Value:</strong> The combined value of both your contribution and your employer's contribution shows the total amount invested in your benefits.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Understanding Your Total Compensation:</strong> These employer contributions are part of your total compensation package
                and represent additional value beyond your base salary. The employer contribution amount
                is not deducted from your salary but is paid by your employer on your behalf. This helps you understand
                the full value of your benefits package, including insurance, pension, and allowances.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

