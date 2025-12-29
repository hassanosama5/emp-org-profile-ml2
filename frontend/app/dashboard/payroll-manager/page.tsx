"use client";

import { useState, useEffect } from "react";
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
import {
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  FileCheck,
  TrendingUp,
  Lock,
  AlertCircle,
  Settings,
  Eye,
  Shield,
  Edit,
  Trash2,
} from "lucide-react";
import { statsApi } from "@/lib/api/payroll-configuration/stats";
import { ConfigurationStats } from "@/lib/api/payroll-configuration/types";
import { approvalsApi } from "@/lib/api/payroll-configuration/approvals";

export default function PayrollManagerDashboardPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_MANAGER);

  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<ConfigurationStats | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load stats
      try {
        const statsData = await statsApi.getStats();
        console.log("Stats data loaded:", statsData);
        setStats({
          total: statsData?.total ?? 0,
          pending: statsData?.pending ?? 0,
          approved: statsData?.approved ?? 0,
          rejected: statsData?.rejected ?? 0,
        });
      } catch (err: any) {
        console.error("Error loading stats:", err);
        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        });
      }

      // Load pending approvals count
      try {
        const approvals = await approvalsApi.getPendingApprovals();
        const count = Array.isArray(approvals)
          ? approvals.length
          : (approvals && typeof approvals === 'object' && 'data' in approvals && Array.isArray((approvals as any).data)
            ? (approvals as any).data.length
            : 0);
        setPendingCount(count);
        console.log("Pending approvals count:", count);
      } catch (err: any) {
        console.error("Error loading pending approvals:", err);
        setPendingCount(0);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Payroll Manager Dashboard</h1>
        <p className="text-white mt-1">
          {mounted ? `Welcome, ${user?.fullName || "Manager"}. Manage payroll configurations, approvals, and oversight.` : 'Welcome. Manage payroll configurations, approvals, and oversight.'}
        </p>
      </div>

      {/* ========== PAYROLL CONFIGURATION MANAGEMENT SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="h-6 w-6 text-white" />
          Payroll Configuration Management
        </h2>
        <p className="text-white mb-4">
           Approve payroll module configuration changes. View, Edit, Approve/Reject, and Delete any configuration (except insurance brackets which require HR Manager approval). Once approved, configurations cannot be edited - only deleted to create new ones.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Approval Dashboard - Primary Action */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCheck className="h-7 w-7 text-blue-600" />
                <CardTitle className="text-2xl font-bold">Approval Dashboard</CardTitle>
              </div>
              <CardDescription className="text-base text-gray-700 font-medium">
                 Review and approve pending payroll configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/payroll-configuration/approvals"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-semibold text-base"
              >
                View Pending Approvals →
              </Link>
              <p className="text-sm text-gray-800 text-center mt-2 font-medium">
                Approve or reject draft configurations (edit and delete except insurance)
              </p>
            </CardContent>
          </Card>

          {/* Configuration Statistics */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-green-600" />
                <CardTitle className="text-2xl font-bold">Configuration Statistics</CardTitle>
              </div>
              <CardDescription className="text-base text-gray-700 font-medium">
                View overview and statistics of all configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/payroll-configuration/stats"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-semibold text-base"
              >
                View Statistics →
              </Link>
              <p className="text-sm text-gray-800 text-center mt-2 font-medium">
                Track configuration status and trends
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-blue-700 mb-2">Pending Approvals</p>
                  <p className="text-4xl font-bold text-blue-900">
                    {isLoading ? "..." : pendingCount}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-blue-500" />
              </div>
              <Link
                href="/dashboard/payroll-configuration/approvals?filter=pending"
                className="text-sm font-medium text-blue-700 hover:underline mt-3 inline-block"
              >
                View all →
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-green-700 mb-2">Approved</p>
                  <p className="text-4xl font-bold text-green-900">
                    {isLoading ? "..." : (stats?.approved || 0)}
                  </p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <Link
                href="/dashboard/payroll-configuration/stats"
                className="text-sm font-medium text-green-700 hover:underline mt-3 inline-block"
              >
                View stats →
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-red-700 mb-2">Rejected</p>
                  <p className="text-4xl font-bold text-red-900">
                    {isLoading ? "..." : (stats?.rejected || 0)}
                  </p>
                </div>
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <Link
                href="/dashboard/payroll-configuration/stats"
                className="text-sm font-medium text-red-700 hover:underline mt-3 inline-block"
              >
                View stats →
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-purple-700 mb-2">Total Configs</p>
                  <p className="text-4xl font-bold text-purple-900">
                    {isLoading ? "..." : (stats?.total || 0)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500" />
              </div>
              <Link
                href="/dashboard/payroll-configuration/stats"
                className="text-sm font-medium text-purple-700 hover:underline mt-3 inline-block"
              >
                View stats →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== PAYROLL EXECUTION APPROVAL SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          Payroll Execution Approval
        </h2>
        <p className="text-gray-600 mb-4">
           Review payroll draft, resolve escalated irregularities, and approve payroll runs so that validation is ensured at the managerial level prior to distribution. After approval, payroll can be locked/frozen to prevent unauthorized changes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                 Review payroll runs awaiting manager approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/manager-approval?view=pending"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                View Pending Approvals →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <CardTitle>Approve Payroll</CardTitle>
              <CardDescription>
                Review and approve payroll runs submitted for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/manager-approval?view=pending"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Review & Approve →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                View previously approved or rejected payroll runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/manager-approval?view=history"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View History →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== EXCEPTION RESOLUTION SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-red-600" />
          Exception Resolution
        </h2>
        <p className="text-white mb-4">
           Resolve escalated irregularities reported by Payroll Specialists. Review payroll draft and view exceptions. Resolve by clearing exception strings so that payroll exceptions are addressed at a higher decision level.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-red-200">
            <CardHeader>
              <CardTitle>Resolve Irregularities</CardTitle>
              <CardDescription>
                 Resolve escalated irregularities flagged by specialists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/resolve-irregularities"
                className="block w-full text-center bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition font-medium"
              >
                Resolve Issues →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>View Exceptions</CardTitle>
              <CardDescription>
                View all exceptions and irregularities in payroll runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/review/exceptions"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View Exceptions →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Employee Exceptions</CardTitle>
              <CardDescription>
                View exceptions for specific employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/review/employee-exceptions"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Employee Exceptions →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== PAYROLL LOCK MANAGEMENT SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="h-6 w-6 text-red-600" />
          Payroll Lock Management
        </h2>
        <p className="text-white mb-4">
           Lock or freeze finalized payroll runs to prevent unauthorized retroactive changes. View and manage locked payrolls. Unfreeze payrolls under exceptional circumstances by entering a detailed reason.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-6 w-6 text-red-600" />
                <CardTitle>Lock Management</CardTitle>
              </div>
              <CardDescription>
                Lock, freeze, unlock, or unfreeze payroll runs (unfreeze requires detailed reason for exceptional circumstances)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/lock-management"
                className="block w-full text-center bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition font-medium"
              >
                Manage Locks →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== REVIEW & PREVIEW SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="h-6 w-6 text-purple-600" />
          Review & Preview
        </h2>
        <p className="text-white mb-4">
          Review payroll runs and preview calculations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <CardTitle>Preview Dashboard</CardTitle>
              <CardDescription>
                Review system-generated payroll results in preview dashboard
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

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Review Payroll Runs</CardTitle>
              <CardDescription>
                Review payroll runs and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/review"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Review Runs →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Pre-Initiation Status</CardTitle>
              <CardDescription>
                View pre-initiation validation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/pre-initiation"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View Status →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== PAYROLL TRACKING SECTION ========== */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Payroll Tracking
        </h2>
        <p className="text-white mb-4">
          Confirm approval of disputes and expense claims that were approved by Payroll Specialists. Multi-step approval: Only approved disputes/claims from specialists reach here. You can accept or reject them, and approved items will notify Finance Staff.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-7 w-7 text-red-600" />
                <CardTitle className="text-xl font-bold">Pending Disputes</CardTitle>
              </div>
              <CardDescription> Confirm approval of disputes approved by Payroll Specialists. Accept or reject them so that finance staff can be notified (multi-step approval)</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-tracking/manager-disputes"
                className="block w-full text-center bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition font-medium"
              >
                Review Disputes →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-orange-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCheck className="h-7 w-7 text-orange-600" />
                <CardTitle className="text-xl font-bold">Pending Claims</CardTitle>
              </div>
              <CardDescription> Confirm approval of expense claims approved by Payroll Specialists. Accept or reject them so that finance staff can be notified (multi-step approval)</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-tracking/manager-claims"
                className="block w-full text-center bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition font-medium"
              >
                Review Claims →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-blue-600" />
                <CardTitle className="text-xl font-bold">Department Reports</CardTitle>
              </div>
              <CardDescription>Generate payroll reports by department</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-tracking/department-reports"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                View Reports →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-7 w-7 text-green-600" />
                <CardTitle className="text-xl font-bold">Track Status</CardTitle>
              </div>
              <CardDescription>Track claims, disputes, and refunds status</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-tracking/tracking"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Track Status →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>
                View complete payroll history and audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/history"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View History →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate payroll reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-execution/reports"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View Reports →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
