"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface BaseSalaryData {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  contractType?: string;
  workType?: string;
  payGradeId?: string;
  payGradeDetails?: {
    _id: string;
    grade: string;
    baseSalary: number;
    grossSalary: number;
    status: string;
    statusWarning?: string;
  };
  baseSalary?: number;
  grossSalary?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  warning?: string;
}

export default function BaseSalaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [baseSalaryData, setBaseSalaryData] = useState<BaseSalaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own base salary (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchBaseSalary = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getEmployeeBaseSalary(employeeId!);
        setBaseSalaryData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load base salary information");
      } finally {
        setLoading(false);
      }
    };

    fetchBaseSalary();
  }, [user]);

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

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getContractTypeDisplay = (contractType?: string) => {
    if (!contractType) return "Not specified";
    return contractType
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getWorkTypeDisplay = (workType?: string) => {
    if (!workType) return "Not specified";
    return workType
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading base salary information...</p>
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
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!baseSalaryData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No base salary information available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>Back to Payroll</Button>
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
          <h1 className="text-3xl font-bold text-gray-900">My Base Salary</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view your base salary according to your employment contract (full-time, part-time, temporary, etc.) so you know your standard monthly earnings.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Warning Banner */}
      {baseSalaryData.warning && (
        <Card className="mb-6 border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-orange-900">Notice</p>
                <p className="text-sm text-orange-800 mt-1">{baseSalaryData.warning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Base Salary Information */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Information</CardTitle>
            <CardDescription>Your standard monthly earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Base Salary (Monthly)</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(baseSalaryData.baseSalary)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This is your standard monthly base salary according to your employment contract
                </p>
              </div>

              {baseSalaryData.grossSalary && baseSalaryData.grossSalary !== baseSalaryData.baseSalary && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Gross Salary (Monthly)</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(baseSalaryData.grossSalary)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Gross salary includes base salary plus standard allowances
                  </p>
                </div>
              )}

              {baseSalaryData.payGradeDetails && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Pay Grade Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pay Grade</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {baseSalaryData.payGradeDetails.grade}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`text-sm font-semibold ${
                        baseSalaryData.payGradeDetails.status === "APPROVED"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}>
                        {baseSalaryData.payGradeDetails.status}
                      </span>
                    </div>
                    {baseSalaryData.payGradeDetails.statusWarning && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mt-2">
                        {baseSalaryData.payGradeDetails.statusWarning}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment Contract Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Contract</CardTitle>
            <CardDescription>Your contract details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Employee</p>
                <p className="font-semibold text-gray-900">
                  {baseSalaryData.firstName} {baseSalaryData.lastName}
                </p>
                <p className="text-sm text-gray-500">{baseSalaryData.employeeNumber}</p>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contract Type</p>
                  <p className="font-semibold text-gray-900">
                    {getContractTypeDisplay(baseSalaryData.contractType)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {baseSalaryData.contractType === "FULL_TIME"
                      ? "Full-time employment with standard benefits"
                      : baseSalaryData.contractType === "PART_TIME"
                      ? "Part-time employment"
                      : baseSalaryData.contractType === "TEMPORARY"
                      ? "Temporary employment contract"
                      : baseSalaryData.contractType === "CONTRACT"
                      ? "Contract-based employment"
                      : "Employment type"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Work Type</p>
                  <p className="font-semibold text-gray-900">
                    {getWorkTypeDisplay(baseSalaryData.workType)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Contract Start Date</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(baseSalaryData.contractStartDate)}
                  </p>
                </div>

                {baseSalaryData.contractEndDate && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Contract End Date</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(baseSalaryData.contractEndDate)}
                    </p>
                  </div>
                )}
              </div>

              {/* Annual Salary Calculation */}
              {baseSalaryData.baseSalary && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Annual Calculation</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Monthly Base Salary</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(baseSalaryData.baseSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Estimated Annual Salary</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(baseSalaryData.baseSalary * 12)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Based on 12 months. Actual annual salary may vary based on bonuses, allowances, and deductions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Note */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">About Your Base Salary</p>
              <p className="text-sm text-blue-800 mb-2">
                Your base salary is the standard monthly amount according to your employment contract ({getContractTypeDisplay(baseSalaryData.contractType).toLowerCase()}). 
                This represents your standard monthly earnings before any allowances, bonuses, or deductions.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your actual monthly earnings may differ based on allowances, bonuses, deductions, and other factors. 
                For detailed breakdowns of your actual earnings, please refer to your payslips.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

