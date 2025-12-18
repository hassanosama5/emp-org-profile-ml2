"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { StructureChangeRequestResponseDto, StructureRequestStatus } from "@/types/organization-structure";

// Simple badge component since we don't have one
const Badge = ({ children, color = 'gray' }: { children: React.ReactNode, color?: string }) => {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.gray}`}>
      {children}
    </span>
  );
};

export default function ChangeRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { getChangeRequests, getStatusDisplay, getRequestTypeDisplay, loading, error } = useOrganizationStructure();
  const [changeRequests, setChangeRequests] = useState<StructureChangeRequestResponseDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<StructureRequestStatus | "">("");

  // REQ-OSM-03: Only Managers/HR submit change requests
  // System Admin can directly create departments/positions without change requests
  const canCreateRequest = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r: string) => 
      [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD]
        .includes(r as SystemRole)
    );
  }, [user?.roles]);

  // REQ-OSM-04: Only System Admin can approve requests
  const canApprove = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r: string) => 
      String(r).toLowerCase() === SystemRole.SYSTEM_ADMIN.toLowerCase()
    );
  }, [user?.roles]);

  useEffect(() => {
    fetchChangeRequests();
  }, [statusFilter]);

  const fetchChangeRequests = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : undefined;
      const data = await getChangeRequests(params);
      setChangeRequests(data);
    } catch (err) {
      console.error("Failed to fetch change requests:", err);
    }
  };

  const getStatusBadge = (status: StructureRequestStatus) => {
    const display = getStatusDisplay(status);
    return (
      <Badge color={display.color}>
        {display.label}
      </Badge>
    );
  };

  const getRequestTypeInfo = (type: string) => {
    const display = getRequestTypeDisplay(type);
    return (
      <div className="flex items-center gap-2">
        <span>{display.icon}</span>
        <span>{display.label}</span>
      </div>
    );
  };

  const formatRequestedBy = (requestedByEmployeeId: any): string => {
    if (!requestedByEmployeeId) return 'Unknown';
    
    if (typeof requestedByEmployeeId === 'string') {
      return `${requestedByEmployeeId.substring(0, 8)}...`;
    }
    
    // Handle populated object
    if (typeof requestedByEmployeeId === 'object') {
      const employee = requestedByEmployeeId as any;
      if (employee.employeeNumber) return employee.employeeNumber;
      if (employee.firstName && employee.lastName) {
        return `${employee.firstName} ${employee.lastName}`;
      }
      if (employee._id) {
        return employee._id.toString().substring(0, 8) + '...';
      }
    }
    
    return 'Unknown';
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Change Requests</h1>
              <p className="text-gray-600 mt-1">
                {canCreateRequest 
                  ? "Submit, review, and approve organizational structure changes"
                  : "Review and approve organizational structure change requests"}
              </p>
            </div>
            {canCreateRequest && (
              <Button
                onClick={() => router.push("/dashboard/organization-structure/change-requests/new")}
                variant="primary"
              >
                Submit New Request
              </Button>
            )}
            {!canCreateRequest && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push("/dashboard/organization-structure/departments/new")}
                  variant="outline"
                >
                  Create Department
                </Button>
                <Button
                  onClick={() => router.push("/dashboard/organization-structure/positions/new")}
                  variant="outline"
                >
                  Create Position
                </Button>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Filter by status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StructureRequestStatus | "")}
                  className="rounded border-gray-300 text-sm"
                >
                  <option value="">All Statuses</option>
                  {Object.values(StructureRequestStatus).map(status => (
                    <option key={status} value={status}>
                      {getStatusDisplay(status).label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <Link
              href="/dashboard/organization-structure"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Organization Structure
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Change Requests List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : changeRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">No change requests found</p>
              <p className="text-gray-400 mt-2">
                {statusFilter
                  ? `No change requests with status "${getStatusDisplay(statusFilter as StructureRequestStatus).label}"`
                  : canCreateRequest
                  ? "No change requests have been submitted yet."
                  : "No change requests are pending review."}
              </p>
              {canCreateRequest && (
                <Button
                  onClick={() => router.push("/dashboard/organization-structure/change-requests/new")}
                  variant="primary"
                  className="mt-4"
                >
                  Submit Your First Request
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {changeRequests.map((request) => (
              <Card key={request._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          {getRequestTypeInfo(request.requestType)}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>Request #: {request.requestNumber}</p>
                        <p>Requested by: {formatRequestedBy(request.requestedByEmployeeId)}</p>
                        {request.submittedAt && (
                          <p>Submitted: {new Date(request.submittedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      
                      {request.reason && (
                        <p className="text-gray-700 mt-2">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => router.push(`/dashboard/organization-structure/change-requests/${request._id}`)}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                      
                      {(request.status === StructureRequestStatus.DRAFT || 
                        request.status === StructureRequestStatus.SUBMITTED) && (
                        <Button
                          onClick={() => router.push(`/dashboard/organization-structure/change-requests/${request._id}/edit`)}
                          variant="ghost"
                          size="sm"
                        >
                          Edit
                        </Button>
                      )}
                      
                      {request.status === StructureRequestStatus.DRAFT && (
                        <Button
                          onClick={() => router.push(`/dashboard/organization-structure/change-requests/${request._id}/submit`)}
                          variant="primary"
                          size="sm"
                        >
                          Submit for Approval
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {changeRequests.length} change request{changeRequests.length !== 1 ? "s" : ""}
              {statusFilter && ` with status "${getStatusDisplay(statusFilter as StructureRequestStatus).label}"`}
            </p>
            {canApprove && (
              <Link
                href="/dashboard/organization-structure/change-requests/approvals"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                View Approvals Dashboard →
              </Link>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}