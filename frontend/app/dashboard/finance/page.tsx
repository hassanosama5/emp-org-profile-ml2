"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import {
  CheckCircle2,
  FileText,
  DollarSign,
  BarChart3,
  Receipt,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.FINANCE_STAFF);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Finance Dashboard</h1>
        <p className="text-white mt-1">
          {mounted ? `Welcome, ${user?.fullName || "Finance Staff"}. Manage payroll approvals, refunds, approved claims, and disputes.` : 'Welcome. Manage payroll approvals, refunds, approved claims, and disputes.'}
        </p>
      </div>

      {/* ========== PAYROLL APPROVAL SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-indigo-600" />
          Payroll Approval
        </h2>
        <p className="text-white mb-4">
           Approve payroll disbursements before execution, so that no incorrect payments are made. Only payroll runs approved by Payroll Manager will appear here. After approval, payment status becomes "Paid" and payslips are automatically generated.
        </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-7 w-7 text-indigo-600" />
                <CardTitle className="text-xl font-bold">Payroll Approval</CardTitle>
              </div>
              <CardDescription className="text-base text-gray-700 font-medium">
                 Review and approve payroll runs to ensure no incorrect payments are made. Only payroll runs approved by the Payroll Manager will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => router.push("/dashboard/payroll-execution/finance-approval")}
              >
                Review Payroll Runs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== REFUNDS & REIMBURSEMENTS SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-green-600" />
          Refunds & Reimbursements
        </h2>
        <p className="text-white mb-4">
           View and get notified with approved disputes and expense claims (approved by both Payroll Specialist and Payroll Manager). Generate refunds for approved items (status: pending until executed in next payroll cycle).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
          <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-7 w-7 text-green-600" />
                <CardTitle className="text-xl font-bold">Approved Claims</CardTitle>
              </div>
              <CardDescription>
                 View and get notified with approved expense claims (approved by Payroll Specialist and Payroll Manager), so that refunds can be generated for next payroll cycle
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              View claims that have passed manager approval and are ready for finance processing.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard/payroll-tracking/approved-claims")}
            >
              Open Claims
            </Button>
          </CardContent>
        </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-red-200">
          <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-7 w-7 text-red-600" />
                <CardTitle className="text-xl font-bold">Approved Disputes</CardTitle>
              </div>
              <CardDescription>
                 View and get notified with approved disputes (approved by Payroll Specialist and Payroll Manager), so that refunds can be generated for next payroll cycle
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Review disputes that are approved and verify refund amounts before payment.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard/payroll-tracking/approved-disputes")}
            >
              Open Disputes
            </Button>
          </CardContent>
        </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-7 w-7 text-blue-600" />
                <CardTitle className="text-xl font-bold">Generate Refund (Disputes)</CardTitle>
              </div>
              <CardDescription>
                 Generate refund for approved disputes (status: pending until executed in payroll cycle) so that it will be included in next payroll cycle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Create refund records for approved disputes to be included in the next payroll run.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/payroll-tracking/approved-disputes")}
              >
                Generate Refund →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-7 w-7 text-purple-600" />
                <CardTitle className="text-xl font-bold">Generate Refund (Claims)</CardTitle>
              </div>
              <CardDescription>
                 Generate refund for approved expense claims (status: pending until executed in payroll cycle) so that it will be included in next payroll cycle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Create refund records for approved expense claims to be included in the next payroll run.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/payroll-tracking/approved-claims")}
              >
                Generate Refund →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-teal-200">
          <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-7 w-7 text-teal-600" />
                <CardTitle className="text-xl font-bold">Track Refunds</CardTitle>
              </div>
              <CardDescription>
                Monitor pending refunds and confirm payments processed in payroll runs
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
                Track the status of all refunds and their inclusion in payroll cycles.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard/payroll-tracking/tracking")}
            >
              Track Refunds
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* ========== REPORTS SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Reports & Analytics
        </h2>
        <p className="text-white mb-4">
           Generate reports about taxes, insurance contributions, and benefits (REQ-PY-25) so that accounting books are compliant. Generate month-end and year-end payroll summaries (REQ-PY-29) so that audits and reporting are simplified.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-7 w-7 text-blue-600" />
                <CardTitle className="text-xl font-bold">Tax & Insurance Reports</CardTitle>
              </div>
              <CardDescription>
               Generate reports about taxes, insurance contributions, and benefits, so that accounting books are compliant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Generate comprehensive reports on tax deductions, insurance contributions, and employee benefits.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/payroll-tracking/reports")}
              >
                Generate Reports →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-7 w-7 text-green-600" />
                <CardTitle className="text-xl font-bold">Payroll Summaries</CardTitle>
              </div>
              <CardDescription>
                 Generate month-end and year-end payroll summaries, so that audits and reporting are simplified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Generate comprehensive month-end and year-end payroll summaries for audit and reporting purposes.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/payroll-tracking/reports")}
              >
                Generate Summaries →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-purple-600" />
                <CardTitle className="text-xl font-bold">All Reports</CardTitle>
              </div>
              <CardDescription>
                Access all payroll-related reports including deductions, reimbursements, and payroll run summaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Access payroll run summaries, deductions, and reimbursement reports.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/payroll-tracking/reports")}
              >
                Open Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== QUICK ACCESS SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Payroll Modules</CardTitle>
            <CardDescription>Access payroll configuration, execution, and tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Jump to any payroll module to configure, execute, or review payroll results.
            </p>
            <Button className="w-full" onClick={() => router.push("/dashboard/payroll")}>
              Go to Payroll Modules
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
              <CardTitle>Payroll Execution</CardTitle>
              <CardDescription>View payroll execution dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
                Access the payroll execution dashboard to view all payroll runs and their status.
            </p>
            <Button
              variant="outline"
              className="w-full"
                onClick={() => router.push("/dashboard/payroll-execution")}
              >
                View Execution Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Back to Main Dashboard</CardTitle>
              <CardDescription>Return to the main dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
