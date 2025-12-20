"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { OvertimeApprovalList } from "@/components/time-management/OvertimeApprovalList";
import { LatenessReport } from "@/components/time-management/LatenessReport";
import { OvertimeReportTable } from "@/components/time-management/OvertimeReportTable";
import { NotificationCenter } from "@/components/time-management/NotificationCenter";
import { MissedPunchAlert } from "@/components/time-management/MissedPunchAlert";
import { DataSyncStatus } from "@/components/time-management/DataSyncStatus";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

export default function LineManagerApprovalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "exceptions" | "overtime-requests" | "lateness" | "overtime" | "notifications" | "missed-punches" | "sync"
  >("exceptions");

  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isDepartmentHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);
  const isPayrollOfficer = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  const isHRAdmin = user?.roles?.includes(SystemRole.HR_ADMIN);

  const canApprove = isHRManager || isDepartmentHead;
  const canViewReports = isHRManager || isDepartmentHead || isPayrollOfficer;
  // BR-TM-22: HR Admin/HR Manager/System Admin can trigger sync
  const canSync = isSystemAdmin || isHRAdmin || isHRManager;

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.PAYROLL_SPECIALIST,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Line Manager Approvals & Reporting</h1>
          <p className="text-gray-600 mt-1">
            {isHRManager
              ? "Review and approve time exceptions, view reports, and manage notifications"
              : isDepartmentHead
              ? "Review and approve team time exceptions and view team reports"
              : isPayrollOfficer
              ? "View reports for payroll processing"
              : "Monitor system synchronization"}
          </p>
        </div>

        {/* Tabs */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {canApprove && (
                <>
                  <button
                    onClick={() => setActiveTab("exceptions")}
                    className={`px-6 py-4 font-medium whitespace-nowrap ${
                      activeTab === "exceptions"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Time Exceptions
                  </button>
                  <button
                    onClick={() => setActiveTab("overtime-requests")}
                    className={`px-6 py-4 font-medium whitespace-nowrap ${
                      activeTab === "overtime-requests"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Overtime Requests
                  </button>
                </>
              )}
              {canViewReports && (
                <>
                  <button
                    onClick={() => setActiveTab("lateness")}
                    className={`px-6 py-4 font-medium whitespace-nowrap ${
                      activeTab === "lateness"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Lateness Report
                  </button>
                  <button
                    onClick={() => setActiveTab("overtime")}
                    className={`px-6 py-4 font-medium whitespace-nowrap ${
                      activeTab === "overtime"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Overtime Reports
                  </button>
                </>
              )}
              {(isHRManager || isDepartmentHead) && (
                <>
                  <button
                    onClick={() => setActiveTab("notifications")}
                    className={`px-6 py-4 font-medium whitespace-nowrap ${
                      activeTab === "notifications"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Notifications
                  </button>
                  <button
                    onClick={() => setActiveTab("missed-punches")}
                    className={`px-6 py-4 font-medium whitespace-nowrap ${
                      activeTab === "missed-punches"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Missed Punches
                  </button>
                </>
              )}
              {canSync && (
                <button
                  onClick={() => setActiveTab("sync")}
                  className={`px-6 py-4 font-medium whitespace-nowrap ${
                    activeTab === "sync"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Data Sync
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "exceptions" && canApprove && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              View and manage all attendance-related requests: overtime, permission, and time exceptions
            </p>
            <OvertimeApprovalList showTeamOnly={isDepartmentHead && !isHRManager} />
          </div>
        )}

        {activeTab === "overtime-requests" && canApprove && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Overtime requests from employees
            </p>
            <OvertimeApprovalList 
              showTeamOnly={isDepartmentHead && !isHRManager}
              filters={{ type: "OVERTIME_REQUEST" }}
            />
          </div>
        )}

        {activeTab === "lateness" && canViewReports && <LatenessReport />}

        {activeTab === "overtime" && canViewReports && (
          <OvertimeReportTable showTeamOnly={isDepartmentHead && !isHRManager} />
        )}

        {activeTab === "notifications" && (isHRManager || isDepartmentHead) && (
          <NotificationCenter />
        )}

        {activeTab === "missed-punches" && (isHRManager || isDepartmentHead) && (
          <MissedPunchAlert />
        )}

        {activeTab === "sync" && canSync && <DataSyncStatus />}
      </div>
    </ProtectedRoute>
  );
}

