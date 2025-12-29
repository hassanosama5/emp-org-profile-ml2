"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/ui/Tabs";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { LeaveRequest } from "@/types/leaves";

export default function LeavesPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [delegatedPendingRequests, setDelegatedPendingRequests] = useState<LeaveRequest[]>([]);
  const [loadingDelegatedRequests, setLoadingDelegatedRequests] = useState(false);

  // Set mounted to true after component mounts (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is HR Admin, HR Manager, Department Head, or Payroll Manager
  useEffect(() => {
    // Wait for mount and auth initialization
    if (!mounted || loading) return;
    
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    
    if (user) {
      const roles = user.roles || [];
      const isHRAdmin = roles.includes(SystemRole.HR_ADMIN);
      const isHRManager = roles.includes(SystemRole.HR_MANAGER);
      const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);
      const isPayrollManager = roles.includes(SystemRole.PAYROLL_MANAGER);
      
      if (!isHRAdmin && !isHRManager && !isDepartmentHead && !isPayrollManager) {
        // Redirect employees to the employee-facing leave page
        router.replace("/dashboard/leaves/requests");
        return;
      }
    }
  }, [mounted, loading, isAuthenticated, user, router]);

  // Fetch pending requests for delegates
  useEffect(() => {
    const fetchDelegatedRequests = async () => {
      // IMPORTANT: always prefer employee profile _id to match backend delegation logic
      const userId = (user as any)?._id || user?.userId || (user as any)?.id;
      if (!userId) return;

      // HR Manager, Payroll Manager, and Department Heads (when delegated) should see the delegated banner here.
      // HR Admins cannot approve/reject requests, so they should not see delegated requests.
      const roles = user?.roles || [];
      const isHRAdmin = roles.includes(SystemRole.HR_ADMIN);
      const isHRManager = roles.includes(SystemRole.HR_MANAGER);
      const isPayrollManager = roles.includes(SystemRole.PAYROLL_MANAGER);
      const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);
      
      if (isHRAdmin) {
        // HR Admins should not see delegated requests
        setDelegatedPendingRequests([]);
        return;
      }
      
      // Allow HR Managers, Payroll Managers, and Department Heads to check for delegated requests
      // The backend will return empty array if they are not actually delegates
      if (!isHRManager && !isPayrollManager && !isDepartmentHead) {
        // For other roles, do not show delegated list on this dashboard.
        setDelegatedPendingRequests([]);
        return;
      }

      setLoadingDelegatedRequests(true);
      try {
        // Call with userId to check if user is a delegate
        // The backend will return team requests if user is a delegate
        const requests = await leavesApi.getEmployeeLeaveRequests(userId, {
          status: "pending",
        });

        // Only keep pending requests that do NOT belong to the current user
        const normalizedUserId = userId.toString();
        const pendingOnly = requests.filter((req) => {
          if (req.status?.toLowerCase() !== "pending") return false;

          // Normalize employeeId from the request (can be string or populated object)
          const rawEmployeeId: any = (req as any).employeeId;
          let employeeIdStr: string | null = null;

          if (typeof rawEmployeeId === "string") {
            employeeIdStr = rawEmployeeId;
          } else if (rawEmployeeId && typeof rawEmployeeId === "object") {
            employeeIdStr =
              (rawEmployeeId as any)._id ||
              (rawEmployeeId as any).id ||
              (typeof rawEmployeeId.toString === "function"
                ? rawEmployeeId.toString()
                : null);
          }

          // Exclude the user's own requests from the delegated list
          if (employeeIdStr && employeeIdStr === normalizedUserId) {
            return false;
          }

          return true;
        });

        setDelegatedPendingRequests(pendingOnly);
      } catch (error: any) {
        console.error("Error fetching delegated requests:", error);
        // If error, user might not be a delegate, which is fine
        setDelegatedPendingRequests([]);
      } finally {
        setLoadingDelegatedRequests(false);
      }
    };

    if (isAuthenticated && user) {
      fetchDelegatedRequests();
    }
  }, [isAuthenticated, user]);

  // Only show admin page if user is HR Admin, HR Manager, Department Head, or Payroll Manager
  const roles = user?.roles || [];
  const isHRAdmin = roles.includes(SystemRole.HR_ADMIN);
  const isHRManager = roles.includes(SystemRole.HR_MANAGER);
  const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);
  const isPayrollManager = roles.includes(SystemRole.PAYROLL_MANAGER);

  // Show loading while checking authentication or if user doesn't have required role
  // Wait for mounted to avoid hydration mismatch
  if (!mounted || loading || !isAuthenticated || (!isHRAdmin && !isHRManager && !isDepartmentHead && !isPayrollManager)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Leaves Management</h1>
            <p className="text-gray-600 mt-1">Configure and manage leave policies, types, and entitlements</p>
          </div>
        </div>
      </div>

      {/* Prominent Banner for Delegated Requests - Especially for Department Heads */}
      {delegatedPendingRequests.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-orange-200 rounded-lg">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 mb-1">
                  You have {delegatedPendingRequests.length} delegated pending request{delegatedPendingRequests.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  You have been delegated to review and approve these leave requests on behalf of another manager.
                </p>
                <Link
                  href="/dashboard/leaves/requests/review"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Review Delegated Requests
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Quick Access */}
      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className={`grid w-full ${
          (delegatedPendingRequests.length > 0 || isDepartmentHead || isPayrollManager)
            ? 'grid-cols-2' 
            : 'grid-cols-1'
        }`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {(delegatedPendingRequests.length > 0 || isDepartmentHead || isPayrollManager) && (
            <TabsTrigger value="delegated" className="relative">
              Delegated Requests
              {delegatedPendingRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                  {delegatedPendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Only show for non-HR Admin, non-Department Head, and non-Payroll Manager users */}
            {/* Department Heads have Team Management card below, Payroll Managers don't need this card */}
            {!isHRAdmin && !isDepartmentHead && !isPayrollManager && (
              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <CardTitle className="text-emerald-800">Leave Requests</CardTitle>
                  </div>
                  <CardDescription className="text-emerald-700">View and manage your leave requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/leaves/requests" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    View & Create Requests
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>
            )}
            {isHRManager && (
              <>
                <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <CardTitle className="text-indigo-800">HR Management</CardTitle>
                    </div>
                    <CardDescription className="text-indigo-700">Finalize and manage leave requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/leaves/hr-manager" 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Manage Requests
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </CardContent>
                </Card>
                <Card className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <CardTitle className="text-pink-800">Manage Delegates</CardTitle>
                    </div>
                    <CardDescription className="text-pink-700">Assign delegates to approve leave requests on your behalf</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/leaves/delegates" 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Manage Delegates
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="delegated" className="mt-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900">Delegated Pending Requests</CardTitle>
              <CardDescription className="text-orange-700">
                You have been delegated to review and approve these leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDelegatedRequests ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading pending requests...</p>
                </div>
              ) : delegatedPendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No delegated pending requests at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {delegatedPendingRequests.map((request) => {
                    const leaveTypeName = (request as any).leaveTypeName ||
                      (typeof request.leaveTypeId === "object" && request.leaveTypeId !== null
                        ? request.leaveTypeId.name
                        : "Unknown Leave Type");
                    
                    return (
                      <div
                        key={request._id}
                        className="p-4 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/leaves/requests/review?employeeId=${request.employeeId}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              Leave Request #{request._id.slice(-8)}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{leaveTypeName}</span> • {request.durationDays} day{request.durationDays !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {request.dates?.from && new Date(request.dates.from).toLocaleDateString()} - {request.dates?.to && new Date(request.dates.to).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            PENDING
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <Link
                    href="/dashboard/leaves/requests/review"
                    className="block mt-4 text-center text-orange-600 hover:underline font-medium"
                  >
                    View All Delegated Requests →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Department Head Section */}
      {isDepartmentHead && (
        <div className="mb-6 space-y-4">
          <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <CardTitle className="text-cyan-900 text-xl">Manager Actions</CardTitle>
              </div>
              <CardDescription className="text-cyan-700 text-base">
                Review and approve leave requests from your team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link 
                  href="/dashboard/leaves/requests" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-cyan-200 hover:border-cyan-400 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className="text-cyan-700 font-semibold group-hover:text-cyan-900">View & Create Leave Requests</span>
                  <svg className="w-5 h-5 text-cyan-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/requests/review" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-blue-700 font-semibold group-hover:text-blue-900">Review Pending Leave Requests</span>
                  <svg className="w-5 h-5 text-blue-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/team-balances" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-indigo-200 hover:border-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-indigo-700 font-semibold group-hover:text-indigo-900">View Team Leave Balances</span>
                  <svg className="w-5 h-5 text-indigo-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/team-management" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="text-purple-700 font-semibold group-hover:text-purple-900">Manage Team Leave Data</span>
                  <svg className="w-5 h-5 text-purple-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HR Manager Section - Only for HR_MANAGER (HR_ADMIN excluded) */}
      {isHRManager && !isHRAdmin && (
        <div className="mb-6 space-y-4">
          <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-600 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <CardTitle className="text-sky-900 text-xl">HR Manager Actions</CardTitle>
              </div>
              <CardDescription className="text-sky-700 text-base">
                Finalize approved requests, override decisions, and process requests in bulk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link 
                  href="/dashboard/leaves/requests" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-sky-200 hover:border-sky-400 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className="text-sky-700 font-semibold group-hover:text-sky-900">View & Create Leave Requests</span>
                  <svg className="w-5 h-5 text-sky-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/hr-manager" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <span className="text-blue-700 font-semibold group-hover:text-blue-900">Manage Leave Requests</span>
                  <svg className="w-5 h-5 text-blue-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/accrual-adjustment" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-cyan-200 hover:border-cyan-400 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-teal-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="text-cyan-700 font-semibold group-hover:text-cyan-900">Accrual Adjustment</span>
                  <svg className="w-5 h-5 text-cyan-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/accrual" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-teal-200 hover:border-teal-400 hover:bg-gradient-to-r hover:from-teal-50 hover:to-emerald-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-teal-700 font-semibold group-hover:text-teal-900">Manual Accrual Management</span>
                  <svg className="w-5 h-5 text-teal-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/carry-forward" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-emerald-200 hover:border-emerald-400 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-emerald-700 font-semibold group-hover:text-emerald-900">Manual Carry-Forward Management</span>
                  <svg className="w-5 h-5 text-emerald-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Manager Section */}
      {isPayrollManager && (
        <div className="mb-6 space-y-4">
          <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle className="text-violet-900 text-xl">Payroll Manager Actions</CardTitle>
              </div>
              <CardDescription className="text-violet-700 text-base">
                View team leave balances, manage team leave data, and review/approve leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link 
                  href="/dashboard/leaves/requests" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-violet-200 hover:border-violet-400 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className="text-violet-700 font-semibold group-hover:text-violet-900">View & Create Leave Requests</span>
                  <svg className="w-5 h-5 text-violet-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/requests/review" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-fuchsia-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-purple-400 to-fuchsia-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-purple-700 font-semibold group-hover:text-purple-900">Review & Approve Team Requests</span>
                  <svg className="w-5 h-5 text-purple-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/team-balances" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-fuchsia-200 hover:border-fuchsia-400 hover:bg-gradient-to-r hover:from-fuchsia-50 hover:to-pink-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-fuchsia-400 to-pink-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-fuchsia-700 font-semibold group-hover:text-fuchsia-900">View Team Leave Balances</span>
                  <svg className="w-5 h-5 text-fuchsia-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/dashboard/leaves/team-management" 
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-pink-200 hover:border-pink-400 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="text-pink-700 font-semibold group-hover:text-pink-900">Manage Team Leave Data</span>
                  <svg className="w-5 h-5 text-pink-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HR Admin Section */}
      {isHRAdmin && (
        <div className="mb-6 space-y-4">
          <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-600 rounded-xl shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <CardTitle className="text-rose-900 text-xl">HR Admin Actions</CardTitle>
              </div>
              <CardDescription className="text-rose-700 text-base">
                Manage your leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/requests" 
                className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-rose-200 hover:border-rose-400 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 transition-all duration-200 group"
              >
                <div className="p-2 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <span className="text-rose-700 font-semibold group-hover:text-rose-900">View & Create Leave Requests</span>
                <svg className="w-5 h-5 text-rose-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* HR Admin Admin Tools Grid */}
      {isHRAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <CardTitle className="text-blue-800">Leave Types</CardTitle>
              </div>
              <CardDescription className="text-blue-700">Manage leave types (Annual, Sick, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/types" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Leave Types
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <CardTitle className="text-purple-800">Leave Categories</CardTitle>
              </div>
              <CardDescription className="text-purple-700">Organize leave types into categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/categories" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Categories
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <CardTitle className="text-emerald-800">Leave Policies</CardTitle>
              </div>
              <CardDescription className="text-emerald-700">Configure accrual rates, carry-over, and eligibility rules</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/policies" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Policies
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <CardTitle className="text-cyan-800">Leave Entitlements</CardTitle>
              </div>
              <CardDescription className="text-cyan-700">Assign and manage employee leave entitlements</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/entitlements" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Entitlements
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <CardTitle className="text-orange-800">Leave Adjustments</CardTitle>
              </div>
              <CardDescription className="text-orange-700">Manually adjust employee leave balances</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/adjustments" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Adjustments
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle className="text-pink-800">Calendar & Blocked Days</CardTitle>
              </div>
              <CardDescription className="text-pink-700">Configure holidays and blocked periods</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/calendar" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Calendar
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <CardTitle className="text-red-800">Reset Leave Balances</CardTitle>
              </div>
              <CardDescription className="text-red-700">Reset leave balances for the new year</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/reset" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Reset Balances
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <CardTitle className="text-violet-800">Auto Accrual Management</CardTitle>
              </div>
              <CardDescription className="text-violet-700">Automated accrual runs daily. Manual override available to HR Manager.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-white rounded-lg border border-violet-200">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  Accrual runs automatically based on policy settings (monthly/yearly/per-term).
                </p>
                <p className="text-xs text-violet-600 font-semibold">
                  Scheduled: Daily at 2 AM
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <CardTitle className="text-indigo-800">Carry-Forward Management</CardTitle>
              </div>
              <CardDescription className="text-indigo-700">Automated carry-forward runs daily. Manual override available to HR Manager.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-white rounded-lg border border-indigo-200">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  Carry-forward runs automatically when reset dates are reached.
                </p>
                <p className="text-xs text-indigo-600 font-semibold">
                  Scheduled: Daily at 3 AM
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <CardTitle className="text-teal-800">Accrual Adjustment</CardTitle>
              </div>
              <CardDescription className="text-teal-700">Adjust accruals during unpaid leave or long absence</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/accrual-adjustment" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Manage Adjustments
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Section - Only show for regular employees (not managers/HR/Payroll) */}
      {!isHRAdmin && !isHRManager && !isDepartmentHead && !isPayrollManager && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Employee Actions</CardTitle>
            <CardDescription className="text-green-700">
              View your leave balance and manage your leave requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link 
                href="/dashboard/leaves/requests/new" 
                className="block text-green-600 hover:underline font-medium"
              >
                Create Leave Request →
              </Link>
              <Link 
                href="/dashboard/leaves/balance" 
                className="block text-green-600 hover:underline font-medium"
              >
                View My Leave Balance →
              </Link>
              <Link 
                href="/dashboard/leaves/requests" 
                className="block text-green-600 hover:underline font-medium"
              >
                My Leave Requests →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Leave Request - Show for all roles that can create requests (including HR Admin, Payroll, Finance, Legal, etc.) */}
      {(() => {
        const roles = user?.roles || [];
        const canCreateRequest = [
          SystemRole.DEPARTMENT_EMPLOYEE,
          SystemRole.DEPARTMENT_HEAD,
          SystemRole.HR_MANAGER,
          SystemRole.HR_EMPLOYEE,
          SystemRole.PAYROLL_SPECIALIST,
          SystemRole.PAYROLL_MANAGER,
          SystemRole.SYSTEM_ADMIN,
          SystemRole.LEGAL_POLICY_ADMIN,
          SystemRole.FINANCE_STAFF,
          SystemRole.HR_ADMIN,
        ].some(role => roles.includes(role));

        // Only show if user can create requests and hasn't seen it in another section
        if (canCreateRequest && !isDepartmentHead && !isHRManager && !isHRAdmin && !isPayrollManager) {
          return (
            <Card className="mb-6 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-900">Create Leave Request</CardTitle>
                <CardDescription className="text-purple-700">
                  Submit a new leave request for approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  href="/dashboard/leaves/requests/new" 
                  className="block text-purple-600 hover:underline font-medium text-lg"
                >
                  Create New Leave Request →
                </Link>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}
    </div>
  );
}