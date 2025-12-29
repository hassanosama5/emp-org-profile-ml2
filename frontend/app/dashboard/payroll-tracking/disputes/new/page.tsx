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
import { Payslip } from "@/types/payslip";

export default function NewDisputePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can create disputes (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchPayslips = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        console.log("Fetching payslips for employee:", employeeId);
        const data = await payslipsApi.getPayslipsByEmployeeId(employeeId!);
        console.log("Payslips received:", data);
        setPayslips(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length === 0) {
          setError("No payslips found. You need at least one payslip to create a dispute.");
        }
      } catch (err: any) {
        console.error("Error fetching payslips:", err);
        setError(err.message || "Failed to load payslips");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPayslips();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayslipId) {
      setError("Please select a payslip");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters long");
      return;
    }

    if (!user?.id && !user?.userId) {
      setError("User ID not found");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const employeeId = user.id || user.userId;
      await payslipsApi.createDispute({
        employeeId: employeeId!,
        payslipId: selectedPayslipId,
        description: description.trim(),
      });
      
      router.push("/dashboard/payroll-tracking/disputes");
    } catch (err: any) {
      setError(err.message || "Failed to create dispute");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payslips...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Dispute</h1>
        <p className="text-gray-600 mt-1">
          Dispute payroll errors like over-deductions or missing bonuses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispute Details</CardTitle>
          <CardDescription>
            Select the payslip you want to dispute and provide a detailed description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payslip Selection */}
            <div>
              <label htmlFor="payslip" className="block text-sm font-medium text-gray-700 mb-2">
                Select Payslip <span className="text-red-500">*</span>
              </label>
              <select
                id="payslip"
                value={selectedPayslipId}
                onChange={(e) => setSelectedPayslipId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={payslips.length === 0}
              >
                <option value="">
                  {payslips.length === 0 
                    ? "-- No payslips available --" 
                    : "-- Select a payslip --"}
                </option>
                {payslips.map((payslip) => (
                  <option key={payslip._id} value={payslip._id}>
                    {payslip.payrollRunId?.payrollPeriod
                      ? formatDate(payslip.payrollRunId.payrollPeriod)
                      : "Payslip"} - {payslip.payrollRunId?.runId || "N/A"} (Net Pay: ${payslip.netPay?.toFixed(2) || "0.00"})
                  </option>
                ))}
              </select>
              {payslips.length === 0 && !loading && (
                <p className="mt-2 text-sm text-amber-600">
                  ⚠️ No payslips found. You need at least one payslip to create a dispute. 
                  Payslips are generated after payroll runs are processed.
                </p>
              )}
              {selectedPayslipId && (
                <p className="mt-2 text-sm text-gray-500">
                  <Link
                    href={`/dashboard/payroll-tracking/${selectedPayslipId}`}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    View payslip details
                  </Link>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the payroll error in detail. For example: 'I noticed that my bonus of $500 was not included in my payslip for February 2025. The bonus was approved by my manager on January 15, 2025.'"
                required
                minLength={10}
              />
              <p className="mt-2 text-sm text-gray-500">
                Minimum 10 characters. Be as detailed as possible to help resolve the issue quickly.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Characters: {description.length} / 10 minimum
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Create Dispute"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/payroll-tracking/disputes")}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Disputing Payroll Errors</p>
              <p className="text-sm text-blue-800 mb-3">
                You can dispute payroll errors by selecting the payslip with the error. Common payroll errors include:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Over-deductions:</strong> Incorrect tax amounts, insurance deductions that are too high, or other deductions that don't match your expectations.
                </li>
                <li>
                  <strong>Missing bonuses:</strong> Bonuses that were approved but not included in your payslip, or bonuses that are missing from the calculation.
                </li>
                <li>
                  <strong>Missing allowances:</strong> Allowances (transportation, housing, etc.) that should have been included but are missing.
                </li>
                <li>
                  <strong>Incorrect salary calculations:</strong> Base salary, overtime, or other earnings that are calculated incorrectly.
                </li>
                <li>
                  <strong>Other discrepancies:</strong> Any other payroll errors that need to be corrected.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> Select the payslip with the error, provide a detailed description of what's wrong, 
                and submit your dispute. The payroll team will review your dispute promptly and work to correct the error. 
                You'll be notified of the status and any resolution. You can track the progress of your disputes on the disputes page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

