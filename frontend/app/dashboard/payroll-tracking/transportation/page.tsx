"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface TransportationAllowanceData {
  payslipId: string;
  payrollPeriod?: {
    _id?: string;
    runId?: string;
    payrollPeriod?: string;
  };
  transportationAllowance: Array<{
    _id?: string;
    type: string;
    allowanceName?: string;
    name?: string;
    amount: number;
    description?: string;
    configurationDetails?: {
      name: string;
      amount: number;
      status: string;
      approvedAt?: string;
    };
  }>;
  totalTransportationAllowance: number;
}

export default function TransportationAllowancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [transportationData, setTransportationData] = useState<TransportationAllowanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own transportation allowance (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchTransportationAllowance = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getTransportationAllowance(employeeId!);
        setTransportationData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load transportation allowance information");
      } finally {
        setLoading(false);
      }
    };

    fetchTransportationAllowance();
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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading transportation allowance information...</p>
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

  if (!transportationData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No transportation allowance information available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
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
          <h1 className="text-3xl font-bold text-gray-900">Transportation Allowance</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view transportation or commuting compensation so you know your travel-related costs are covered.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Payroll Period Info */}
      {transportationData.payrollPeriod && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payroll Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transportationData.payrollPeriod.runId && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payroll Run ID</p>
                  <p className="font-semibold text-gray-900">
                    {transportationData.payrollPeriod.runId}
                  </p>
                </div>
              )}
              {transportationData.payrollPeriod.payrollPeriod && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Period</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(transportationData.payrollPeriod.payrollPeriod)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transportation Allowances */}
      <Card>
        <CardHeader>
          <CardTitle>Transportation & Commuting Compensation</CardTitle>
          <CardDescription>
            Travel-related allowances included in your payslip
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transportationData.transportationAllowance.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🚗</div>
              <p className="text-gray-500 text-lg mb-2">No Transportation Allowance</p>
              <p className="text-gray-400 text-sm">
                You don't have any transportation or commuting compensation in your current payslip.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                If you believe you should receive transportation allowance, please contact HR or Payroll.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transportationData.transportationAllowance.map((allowance, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🚗</span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {allowance.allowanceName || allowance.name || "Transportation Allowance"}
                          </h4>
                          {allowance.type && (
                            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {allowance.type}
                            </span>
                          )}
                        </div>
                      </div>
                      {allowance.description && (
                        <p className="text-sm text-gray-600 mt-2">{allowance.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500 mb-1">Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(allowance.amount)}
                      </p>
                    </div>
                  </div>

                  {allowance.configurationDetails && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">Configuration Details</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className={`font-semibold ${
                            allowance.configurationDetails.status === "APPROVED"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}>
                            {allowance.configurationDetails.status}
                          </p>
                        </div>
                        {allowance.configurationDetails.approvedAt && (
                          <div>
                            <p className="text-gray-500">Approved At</p>
                            <p className="font-semibold text-gray-900">
                              {formatDate(allowance.configurationDetails.approvedAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Total Summary */}
              <div className="pt-6 mt-6 border-t-2 border-blue-300">
                <div className="flex justify-between items-center p-4 bg-blue-100 rounded-lg">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Total Transportation Allowance
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Combined compensation for all transportation and commuting costs
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-700">
                      {formatCurrency(transportationData.totalTransportationAllowance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6 bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-green-900 mb-1">About Transportation & Commuting Compensation</p>
              <p className="text-sm text-green-800 mb-2">
                Transportation allowance is compensation provided to cover your commuting and travel-related costs.
                This amount is included in your payslip as part of your earnings, so you know your travel-related costs are covered.
              </p>
              <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
                <li>
                  <strong>Coverage:</strong> Transportation allowance helps cover costs such as fuel, public transportation, parking, vehicle maintenance, or other commuting expenses.
                </li>
                <li>
                  <strong>Contract-Based:</strong> The allowance amount is determined by your employment contract and company policies.
                </li>
                <li>
                  <strong>Tax Implications:</strong> This compensation is included in your gross salary and may be subject to taxes depending on local regulations.
                </li>
                <li>
                  <strong>Questions:</strong> If you have questions about your transportation allowance or believe you should receive compensation, please contact HR or Payroll department.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

