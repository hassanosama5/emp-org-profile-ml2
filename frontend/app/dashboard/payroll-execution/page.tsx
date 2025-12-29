"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Calculator, Calendar, FileText, DollarSign, Shield, TrendingUp, Flag, Eye, Send, FileText as FileTextIcon, CheckCircle } from "lucide-react";

export default function PayrollExecutionPage() {
  const { user } = useAuth();
  // Allow multiple roles to access payroll execution
  useRequireAuth([
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.PAYROLL_MANAGER,
    SystemRole.FINANCE_STAFF,
  ]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Execution Dashboard</h1>
        {mounted && (
          <p className="text-gray-600 mt-1">
            Welcome, {user?.fullName || "Specialist"}. Manage payroll execution workflows and processes.
          </p>
        )}
      </div>

      {/* Pre-Initiation Reviews */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Pre-Initiation Reviews
        </h2>
        <p className="text-gray-600 mb-4">
          Review and approve pending items before initiating payroll runs
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Pre-Initiation Dashboard</CardTitle>
              <CardDescription>
                Review signing bonuses, termination benefits, and payroll period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/pre-initiation"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                Open Pre-Initiation →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payroll Initiation Workflow */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Payroll Initiation Workflow
        </h2>
        <p className="text-gray-600 mb-4">
          Complete workflow: Review payroll period → Process initiation → Review & approve → Automatic draft generation
        </p>
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Workflow Steps:</strong> 1) Review Payroll Period (Approve/Reject) → 2) Process Payroll Initiation → 3) Review & Approve Initiation → 4) Automatic Draft Generation starts
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-purple-600" />
                <CardTitle>Step 1: Review Period</CardTitle>
              </div>
              <CardDescription>
                Review and approve/reject payroll period (frontend-only workflow)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/pre-initiation/payroll-period"
                className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition font-medium"
              >
                Review Period →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <CardTitle>Step 2: Process Initiation</CardTitle>
              </div>
              <CardDescription>
                Automatically process payroll initiation to create a new payroll run in DRAFT status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/process-initiation"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                Process Initiation →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <CardTitle>Step 3: Review Initiation</CardTitle>
              </div>
              <CardDescription>
                Review and approve/reject processed payroll initiations. Approving automatically starts draft generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/review-initiation"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Review Initiation →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-yellow-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-yellow-600" />
                <CardTitle>Edit Initiation</CardTitle>
              </div>
              <CardDescription>
                Manually edit rejected payroll initiations. Edit period and other details, then re-review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/review-initiation"
                className="block w-full text-center bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 transition font-medium"
              >
                Go to Review (Edit from there) →
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-green-600" />
                <CardTitle>Calculate Payroll</CardTitle>
              </div>
              <CardDescription>
                Automatically calculate salaries, allowances, deductions, and contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/calculate-payroll"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Calculate →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-purple-600" />
                <CardTitle>Prorated Salary</CardTitle>
              </div>
              <CardDescription>
                Calculate prorated salaries for mid-month hires, terminations, and resignations. System automatically checks HR events to ensure accurate payments for partial periods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/prorated-salary"
                className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition font-medium"
              >
                Calculate Prorated →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-indigo-600" />
                <CardTitle>Apply Statutory Rules</CardTitle>
              </div>
              <CardDescription>
                Auto-apply statutory rules (income tax, pension, insurance, labor law deductions) to ensure compliance without manual intervention. Taxes = % of Base Salary, Insurance. Net Salary = Base Salary - Deductions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/apply-statutory-rules"
                className="block w-full text-center bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition font-medium"
              >
                Apply Rules →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-orange-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-orange-600" />
                <CardTitle>Generate Draft</CardTitle>
              </div>
              <CardDescription>
                System automatically generates draft payroll runs at the end of each cycle. You only need to review. All calculations are automatic - no manual calculations needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/generate-draft"
                className="block w-full text-center bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition font-medium"
              >
                Generate Draft →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payroll Review & Exceptions */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Payroll Review & Exceptions
        </h2>
        <p className="text-gray-600 mb-4">
          Review payroll runs, preview results, and flag irregularities
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-cyan-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-6 w-6 text-cyan-600" />
                <CardTitle>Send for Approval</CardTitle>
              </div>
              <CardDescription>
                Send payroll runs to Manager and Finance for validation before finalization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/send-for-approval"
                className="block w-full text-center bg-cyan-600 text-white py-3 px-4 rounded-md hover:bg-cyan-700 transition font-medium"
              >
                Send for Approval →
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-6 w-6 text-purple-600" />
                <CardTitle>Preview Dashboard</CardTitle>
              </div>
              <CardDescription>
                Review system-generated payroll results before finalization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/preview"
                className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition font-medium"
              >
                View Preview →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flag className="h-6 w-6 text-red-600" />
                <CardTitle>Flag Irregularities</CardTitle>
              </div>
              <CardDescription>
                Detect and flag payroll irregularities (salary spikes, missing bank accounts, negative net pay)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/flag-irregularities"
                className="block w-full text-center bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition font-medium"
              >
                Flag Irregularities →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Review Payroll Runs</CardTitle>
              <CardDescription>
                Review and manage existing payroll runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/initiation"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View Runs →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payslip Generation */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Payslip Generation
        </h2>
        <p className="text-gray-600 mb-4">
          Payslips are automatically generated and distributed after Finance approval (REQ-PY-15) and Payroll Manager lock (REQ-PY-7). Payment status is set to "Paid" since we don't handle bank system integration. Payroll Specialists can view all generated payslips.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-6 w-6 text-indigo-600" />
                <CardTitle>Generate Payslips</CardTitle>
              </div>
              <CardDescription>
                Automatically generate and distribute payslips via PDF, email, or portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/payslips/generate"
                className="block w-full text-center bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition font-medium"
              >
                Generate Payslips →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-teal-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-teal-600" />
                <CardTitle>View Payslips</CardTitle>
              </div>
              <CardDescription>
                View and manage all generated employee payslips
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/payslips"
                className="block w-full text-center bg-teal-600 text-white py-3 px-4 rounded-md hover:bg-teal-700 transition font-medium"
              >
                View Payslips →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

