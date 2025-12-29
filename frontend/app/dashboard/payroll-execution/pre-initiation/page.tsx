"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../../components/shared/ui/Card";
import { Button } from "../../../../components/shared/ui/Button";
import { payrollExecutionApi } from "../../../../lib/api/payroll-execution/payroll-execution";
import { PreInitiationStatus } from "../../../../types/payroll-execution";
import Link from "next/link";

export default function PreInitiationDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<PreInitiationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await payrollExecutionApi.getPreInitiationValidationStatus();
      
      // Validate response structure
      if (!data || !data.signingBonuses || !data.terminationBenefits || !data.payrollPeriod) {
        throw new Error("Invalid response structure from server");
      }
      
      setStatus(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch validation status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPayrollInitiation = () => {
    router.push("/dashboard/payroll-execution/process-initiation");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!status || !status.signingBonuses || !status.terminationBenefits || !status.payrollPeriod) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Unable to load validation status. Please refresh the page.
        </div>
      </div>
    );
  }

  // Calculate progress based on completion of each category (not counts)
  // Each category contributes 1 point if complete, 0 if not
  let completedCategories = 0;
  
  // Signing bonuses are complete if there are no pending items
  const signingBonusesComplete = status.signingBonuses.pending === 0;
  if (signingBonusesComplete) {
    completedCategories++;
  }
  
  // Termination benefits are complete if there are no pending items
  const terminationBenefitsComplete = status.terminationBenefits.pending === 0;
  if (terminationBenefitsComplete) {
    completedCategories++;
  }
  
  // Payroll period is complete if approved
  // Check both backend status and frontend localStorage
  const storedPeriod = typeof window !== "undefined" ? localStorage.getItem("approved_payroll_period") : null;
  const periodApproved = status.payrollPeriod.status === "approved" || !!storedPeriod;
  if (periodApproved) {
    completedCategories++;
  }
  
  // Calculate percentage: (completed categories / total categories) * 100
  const progressPercentage = (completedCategories / 3) * 100;
  
  // All complete if all 3 categories are complete (100% progress) OR backend says allReviewsComplete
  const allComplete = status.allReviewsComplete || progressPercentage === 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Pre-Initiation Reviews</h1>
        <p className="text-gray-600">
          Review and approve pending items before initiating payroll
        </p>
      </div>

      {/* Progress Indicator */}
      <Card className="p-6 mb-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {allComplete
            ? "All reviews are complete. You can now start payroll initiation."
            : "Please complete all reviews before starting payroll initiation."}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Signing Bonuses Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Signing Bonuses</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                status.signingBonuses.pending > 0
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {status.signingBonuses.pending > 0 ? "Pending" : "Complete"}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium">{status.signingBonuses.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved:</span>
              <span className="font-medium text-green-600">
                {status.signingBonuses.approved}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{status.signingBonuses.total}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Link href="/dashboard/payroll-execution/process-signing-bonuses">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 mb-2">
                Process Signing Bonuses
              </Button>
            </Link>
            <Link href="/dashboard/payroll-execution/pre-initiation/signing-bonuses">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Review Signing Bonuses
              </Button>
            </Link>
          </div>
        </Card>

        {/* Termination Benefits Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Termination Benefits</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                status.terminationBenefits.pending > 0
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {status.terminationBenefits.pending > 0 ? "Pending" : "Complete"}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium">{status.terminationBenefits.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved:</span>
              <span className="font-medium text-green-600">
                {status.terminationBenefits.approved}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{status.terminationBenefits.total}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Link href="/dashboard/payroll-execution/process-termination-benefits">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 mb-2">
                Process Termination Benefits
              </Button>
            </Link>
            <Link href="/dashboard/payroll-execution/pre-initiation/termination-benefits">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Review Termination Benefits
              </Button>
            </Link>
          </div>
        </Card>

        {/* Payroll Period Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Payroll Period</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                (() => {
                  if (typeof window !== "undefined") {
                    const storedPeriod = localStorage.getItem("approved_payroll_period");
                    const isApproved = status.payrollPeriod.status === "approved" || !!storedPeriod;
                    if (isApproved) return "bg-green-100 text-green-800";
                    if (status.payrollPeriod.status === "rejected") return "bg-red-100 text-red-800";
                  }
                  return "bg-yellow-100 text-yellow-800";
                })()
              }`}
            >
              {(() => {
                if (typeof window !== "undefined") {
                  const storedPeriod = localStorage.getItem("approved_payroll_period");
                  if (storedPeriod) return "approved";
                }
                return status.payrollPeriod.status;
              })()}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {(() => {
              if (typeof window !== "undefined") {
                const storedPeriod = localStorage.getItem("approved_payroll_period");
                let periodToShow = status.payrollPeriod.period;
                if (storedPeriod) {
                  try {
                    const parsed = JSON.parse(storedPeriod);
                    periodToShow = parsed.period;
                  } catch (e) {
                    // Use backend period if parsing fails
                  }
                }
                return periodToShow ? (
                  <div>
                    <span className="text-gray-600">Period: </span>
                    <span className="font-medium">{periodToShow}</span>
                  </div>
                ) : null;
              }
              return status.payrollPeriod.period ? (
                <div>
                  <span className="text-gray-600">Period: </span>
                  <span className="font-medium">{status.payrollPeriod.period}</span>
                </div>
              ) : null;
            })()}
            {status.payrollPeriod.payrollRunId && (
              <div>
                <span className="text-gray-600">Run ID: </span>
                <span className="font-medium text-sm">
                  {status.payrollPeriod.payrollRunId}
                </span>
              </div>
            )}
          </div>
          <Link href="/dashboard/payroll-execution/pre-initiation/payroll-period">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              {(() => {
                if (typeof window !== "undefined") {
                  const storedPeriod = localStorage.getItem("approved_payroll_period");
                  return storedPeriod ? "View/Edit Payroll Period" : "Review Payroll Period";
                }
                return "Review Payroll Period";
              })()}
            </Button>
          </Link>
        </Card>
      </div>

      {/* Start Payroll Initiation Button */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Start Payroll Initiation</h2>
            <p className="text-gray-600">
              Begin the payroll initiation process after completing all reviews
            </p>
          </div>
          <Button
            onClick={handleStartPayrollInitiation}
            disabled={!allComplete}
            className={`${
              allComplete
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Start Payroll Initiation
          </Button>
        </div>
        {!allComplete && (
          <div className="mt-4 text-sm text-yellow-600">
            ⚠️ Please complete all reviews before starting payroll initiation
          </div>
        )}
      </Card>
    </div>
  );
}

