"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface InsuranceDeduction {
  _id?: string;
  insuranceName?: string;
  name?: string;
  employeeContribution?: number;
  amount?: number;
  description?: string;
  configurationDetails?: {
    name: string;
    minSalary?: number;
    maxSalary?: number;
    employeeRate?: number;
    employerRate?: number;
    status: string;
    approvedAt?: string;
    approvedBy?: string;
    warning?: string;
  };
}

interface InsuranceDeductionsData {
  payslipId: string;
  payrollPeriod?: {
    _id?: string;
    runId?: string;
    payrollPeriod?: string;
  };
  insuranceDeductions: InsuranceDeduction[];
  totalInsuranceDeductions: number;
}

export default function InsuranceDeductionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [insuranceData, setInsuranceData] = useState<InsuranceDeductionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own insurance deductions (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchInsuranceDeductions = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getInsuranceDeductions(employeeId!);
        setInsuranceData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load insurance deductions information");
      } finally {
        setLoading(false);
      }
    };

    fetchInsuranceDeductions();
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

  const getInsuranceName = (insurance: InsuranceDeduction): string => {
    return insurance.insuranceName || insurance.name || insurance.configurationDetails?.name || "Insurance Deduction";
  };

  const getInsuranceAmount = (insurance: InsuranceDeduction): number => {
    return insurance.employeeContribution || insurance.amount || 0;
  };

  const getInsuranceType = (insuranceName: string): { type: string; icon: string; badgeColor: string; bgColor: string; borderColor: string } => {
    const name = insuranceName.toLowerCase();
    if (name.includes("health")) {
      return { 
        type: "Health Insurance", 
        icon: "🏥", 
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-300"
      };
    }
    if (name.includes("pension") || name.includes("retirement")) {
      return { 
        type: "Pension/Retirement", 
        icon: "💰", 
        badgeColor: "bg-green-100 text-green-800 border-green-300",
        bgColor: "bg-green-50",
        borderColor: "border-green-300"
      };
    }
    if (name.includes("unemployment")) {
      return { 
        type: "Unemployment Insurance", 
        icon: "📋", 
        badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-300",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-300"
      };
    }
    if (name.includes("disability")) {
      return { 
        type: "Disability Insurance", 
        icon: "♿", 
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-300"
      };
    }
    if (name.includes("social") || name.includes("security")) {
      return { 
        type: "Social Security", 
        icon: "🛡️", 
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-300"
      };
    }
    return { 
      type: "Insurance", 
      icon: "🛡️", 
      badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300"
    };
  };

  const getProtectionDescription = (insuranceType: string): string => {
    const type = insuranceType.toLowerCase();
    if (type.includes("health")) {
      return "Covers medical expenses, doctor visits, hospital stays, and prescription medications.";
    }
    if (type.includes("pension") || type.includes("retirement")) {
      return "Provides retirement benefits and pension payments upon retirement.";
    }
    if (type.includes("unemployment")) {
      return "Provides financial support if you become unemployed through no fault of your own.";
    }
    if (type.includes("disability")) {
      return "Provides income replacement if you become disabled and unable to work.";
    }
    if (type.includes("social") || type.includes("security")) {
      return "Provides retirement, disability, and survivor benefits as part of social security system.";
    }
    return "Provides protection and benefits as defined by the insurance policy.";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading insurance deductions information...</p>
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

  if (!insuranceData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No insurance deductions information available</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Insurance Deductions</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view insurance deductions (health, pension, unemployment, etc.) itemized, so you know what protections are covered by your contributions.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Payroll Period Info */}
      {insuranceData.payrollPeriod && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payroll Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insuranceData.payrollPeriod.runId && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payroll Run ID</p>
                  <p className="font-semibold text-gray-900">
                    {insuranceData.payrollPeriod.runId}
                  </p>
                </div>
              )}
              {insuranceData.payrollPeriod.payrollPeriod && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Period</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(insuranceData.payrollPeriod.payrollPeriod)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Deductions */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Contributions Breakdown</CardTitle>
          <CardDescription>
            Health, pension, unemployment, and other insurance deductions with coverage details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insuranceData.insuranceDeductions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🛡️</div>
              <p className="text-gray-500 text-lg mb-2">No Insurance Deductions</p>
              <p className="text-gray-400 text-sm">
                No insurance deductions are applied to your current payslip.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insuranceData.insuranceDeductions.map((insurance, idx) => {
                const insuranceName = getInsuranceName(insurance);
                const insuranceAmount = getInsuranceAmount(insurance);
                const insuranceType = getInsuranceType(insuranceName);
                const protectionDesc = getProtectionDescription(insuranceName);

                return (
                  <div
                    key={idx}
                    className={`p-5 ${insuranceType.bgColor} border-2 ${insuranceType.borderColor} rounded-lg hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{insuranceType.icon}</span>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{insuranceName}</h4>
                            <span className={`inline-block mt-1 px-2 py-1 ${insuranceType.badgeColor} text-xs font-medium rounded border`}>
                              {insuranceType.type}
                            </span>
                          </div>
                        </div>
                        {insurance.description && (
                          <p className="text-sm text-gray-600 mt-2">{insurance.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-500 mb-1">Your Contribution</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(insuranceAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Protection Coverage */}
                    <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">Coverage & Protection</p>
                      <p className="text-sm text-gray-600">{protectionDesc}</p>
                    </div>

                    {/* Configuration Details */}
                    {insurance.configurationDetails && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-3">Contribution Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {insurance.configurationDetails.employeeRate !== undefined && (
                            <div className="p-3 bg-white rounded border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Employee Rate</p>
                              <p className="text-lg font-bold text-gray-900">
                                {insurance.configurationDetails.employeeRate}%
                              </p>
                            </div>
                          )}
                          {insurance.configurationDetails.employerRate !== undefined && (
                            <div className="p-3 bg-white rounded border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Employer Contribution Rate</p>
                              <p className="text-lg font-bold text-green-600">
                                {insurance.configurationDetails.employerRate}%
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Your employer also contributes to this insurance
                              </p>
                            </div>
                          )}
                        </div>
                        {(insurance.configurationDetails.minSalary !== undefined || insurance.configurationDetails.maxSalary !== undefined) && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
                            <p className="font-medium mb-1">Salary Bracket:</p>
                            <p>
                              {insurance.configurationDetails.minSalary !== undefined
                                ? formatCurrency(insurance.configurationDetails.minSalary)
                                : "No minimum"}
                              {" - "}
                              {insurance.configurationDetails.maxSalary !== undefined
                                ? formatCurrency(insurance.configurationDetails.maxSalary)
                                : "No maximum"}
                            </p>
                            <p className="mt-1 text-gray-500">
                              This insurance applies to salaries within this range
                            </p>
                          </div>
                        )}
                        {insurance.configurationDetails.employeeRate !== undefined && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
                            <p className="font-medium mb-1">Calculation Formula:</p>
                            <p>
                              Base Salary × {insurance.configurationDetails.employeeRate}% = {formatCurrency(insuranceAmount)}
                            </p>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${
                            insurance.configurationDetails.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            Status: {insurance.configurationDetails.status}
                          </span>
                          {insurance.configurationDetails.approvedAt && (
                            <span className="text-gray-500">
                              Approved: {formatDate(insurance.configurationDetails.approvedAt)}
                            </span>
                          )}
                        </div>
                        {insurance.configurationDetails.warning && (
                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            ⚠️ {insurance.configurationDetails.warning}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Total Summary */}
              <div className="pt-6 mt-6 border-t-2 border-red-300">
                <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Total Insurance Deductions
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Combined total of all your insurance contributions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-700">
                      {formatCurrency(insuranceData.totalInsuranceDeductions)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">What Protections Are Covered by Your Contributions</p>
              <p className="text-sm text-blue-800 mb-3">
                Your insurance deductions are contributions you make toward various insurance protections.
                These itemized deductions show exactly what protections are covered by your contributions:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Health Insurance:</strong> Covers medical expenses, doctor visits, hospital stays,
                  and prescription medications. Your contribution ensures you have access to healthcare services.
                </li>
                <li>
                  <strong>Pension/Retirement:</strong> Builds your retirement savings and provides pension
                  benefits upon retirement. Your contributions secure your financial future.
                </li>
                <li>
                  <strong>Unemployment Insurance:</strong> Provides financial support if you become unemployed
                  through no fault of your own. Your contributions protect you during job transitions.
                </li>
                <li>
                  <strong>Disability Insurance:</strong> Provides income replacement if you become disabled
                  and unable to work. Your contributions ensure financial security during disability.
                </li>
                <li>
                  <strong>Social Security:</strong> Provides retirement, disability, and survivor benefits
                  as part of the social security system. Your contributions support the social safety net.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Understanding Your Contributions:</strong> Your employer may also contribute to these insurance programs.
                Insurance deductions are calculated as a percentage of your base salary and are subject to
                salary brackets defined in the insurance configuration. Each itemized deduction shows the specific
                protection you receive in exchange for your contribution. If you have questions about your
                insurance coverage or what protections are included, please contact HR or Payroll department.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

