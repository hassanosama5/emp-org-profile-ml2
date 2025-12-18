"use client";

import React, { useState, useEffect } from "react";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { authApi } from "@/lib/api/auth/auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { LeaveType } from "@/types/leaves";
import { api } from "@/lib/api/client";

interface TeamMemberBalance {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  leaveBalances: Array<{
    leaveTypeId: string;
    leaveTypeName: string;
    remaining: number;
    pending: number;
    taken: number;
  }>;
  upcomingLeaves: Array<{
    _id: string;
    leaveTypeId?: string;
    leaveTypeName: string;
    dates: { from: Date; to: Date };
    durationDays: number;
    status: string;
    isFlagged?: boolean;
  }>;
}

export default function TeamBalancesPage() {
  const { user } = useAuthStore();
  const [teamData, setTeamData] = useState<{ teamMembers: TeamMemberBalance[]; totalTeamMembers: number } | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  const [filters, setFilters] = useState({
    departmentId: "",
    leaveTypeId: "",
    upcomingFromDate: "",
    upcomingToDate: "",
    status: "",
  });

  useRequireAuth();

  useEffect(() => {
    fetchLeaveTypes();
    fetchDepartments();
    fetchTeamBalances();
  }, [user]);

  useEffect(() => {
    fetchTeamBalances();
  }, [filters]);

  const fetchLeaveTypes = async () => {
    try {
      const types = await leavesApi.getLeaveTypes();
      setLeaveTypes(types || []);
    } catch (error) {
      console.warn("Failed to fetch leave types:", error);
      setLeaveTypes([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/organization-structure/departments?isActive=true");
      // Handle different response formats
      let departmentsData = [];
      if (Array.isArray(response)) {
        departmentsData = response;
      } else if (response && typeof response === "object") {
        if (Array.isArray(response.data)) {
          departmentsData = response.data;
        } else if (Array.isArray((response as any).departments)) {
          departmentsData = (response as any).departments;
        } else if (Array.isArray((response as any).items)) {
          departmentsData = (response as any).items;
        }
      }
      
      setDepartments(
        departmentsData.map((dept: any) => ({
          id: dept._id || dept.id,
          name: dept.name,
        }))
      );
    } catch (error) {
      console.warn("Failed to fetch departments:", error);
      setDepartments([]);
    }
  };

  const fetchTeamBalances = async () => {
    try {
      setLoading(true);
      setError("");
      const managerId = authApi.getUserId() || user?.id || user?.userId || "";
      
      if (!managerId || !managerId.trim()) {
        throw new Error("Manager ID is required. Please log in again.");
      }
      
      const departmentIdParam = filters.departmentId && filters.departmentId.trim() ? filters.departmentId.trim() : undefined;
      const upcomingFromDateParam = filters.upcomingFromDate && filters.upcomingFromDate.trim() ? filters.upcomingFromDate : undefined;
      const upcomingToDateParam = filters.upcomingToDate && filters.upcomingToDate.trim() ? filters.upcomingToDate : undefined;
      
      console.log("[TeamBalances] Fetching with filters:", {
        managerId: managerId.trim(),
        departmentId: departmentIdParam,
        upcomingFromDate: upcomingFromDateParam,
        upcomingToDate: upcomingToDateParam,
      });
      
      const result = await leavesApi.getTeamLeaveBalances(
        managerId.trim(),
        upcomingFromDateParam,
        upcomingToDateParam,
        departmentIdParam
      );
      
      console.log("[TeamBalances] Received result:", {
        totalTeamMembers: result.totalTeamMembers,
        teamMembersCount: result.teamMembers?.length || 0,
        departmentFilter: departmentIdParam,
      });
      
      // Apply client-side filtering for leave type and status
      let filteredMembers: TeamMemberBalance[] = result.teamMembers || [];
      
      // Filter by leave type in balances and upcoming leaves
      if (filters.leaveTypeId) {
        filteredMembers = filteredMembers.map((member: TeamMemberBalance) => ({
          ...member,
          leaveBalances: member.leaveBalances.filter(
            balance => balance.leaveTypeId === filters.leaveTypeId
          ),
          upcomingLeaves: member.upcomingLeaves.filter(
            leave => leave.leaveTypeId === filters.leaveTypeId
          )
        })).filter(member => 
          member.leaveBalances.length > 0 || member.upcomingLeaves.length > 0
        );
      }
      
      // Filter upcoming leaves by status
      if (filters.status) {
        filteredMembers = filteredMembers.map((member: TeamMemberBalance) => ({
          ...member,
          upcomingLeaves: member.upcomingLeaves.filter(
            leave => leave.status.toUpperCase() === filters.status.toUpperCase()
          )
        }));
      }
      
      setTeamData({
        ...result,
        teamMembers: filteredMembers,
        totalTeamMembers: filteredMembers.length
      });
    } catch (error: any) {
      console.error("Error fetching team leave balances:", error);
      setError(error.message || "Failed to load team leave balances");
      setTeamData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading team leave balances...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchTeamBalances} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Leave Balances</h1>
        <p className="text-gray-600 mt-1">View your team members' leave balances and upcoming leaves</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type
              </label>
              <select
                value={filters.leaveTypeId}
                onChange={(e) => setFilters({ ...filters, leaveTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Leave Types</option>
                {leaveTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upcoming Leaves From Date
              </label>
              <input
                type="date"
                value={filters.upcomingFromDate}
                onChange={(e) => setFilters({ ...filters, upcomingFromDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upcoming Leaves To Date
              </label>
              <input
                type="date"
                value={filters.upcomingToDate}
                onChange={(e) => setFilters({ ...filters, upcomingToDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={fetchTeamBalances}>Apply Filters</Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  departmentId: "",
                  leaveTypeId: "",
                  upcomingFromDate: "",
                  upcomingToDate: "",
                  status: "",
                });
              }}
              className="ml-2"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {!teamData || teamData.teamMembers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">No team members found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            Total Team Members: {teamData.totalTeamMembers}
          </div>
          {teamData.teamMembers.map((member) => (
            <Card key={member.employeeId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{member.employeeName}</CardTitle>
                <p className="text-sm text-gray-600">
                  {member.position} • {member.department}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Leave Balances */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Leave Balances</h3>
                    {member.leaveBalances.length === 0 ? (
                      <p className="text-sm text-gray-500">No leave entitlements</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {member.leaveBalances.map((balance, balanceIndex) => (
                          <div
                            key={`${member.employeeId}-${balance.leaveTypeId}-${balanceIndex}`}
                            className="border rounded-lg p-4 bg-gray-50"
                          >
                            <div className="font-semibold text-gray-900 mb-2">
                              {balance.leaveTypeName}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Remaining:</span>
                                <span className={`font-semibold ${balance.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {balance.remaining.toFixed(2)} days
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Pending:</span>
                                <span className="font-semibold text-yellow-600">
                                  {balance.pending} days
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Taken:</span>
                                <span className="font-semibold text-red-600">
                                  {balance.taken} days
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Leaves */}
                  {member.upcomingLeaves.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Upcoming Leaves</h3>
                      <div className="space-y-2">
                        {member.upcomingLeaves.map((leave) => (
                          <div
                            key={leave._id}
                            className="border rounded-lg p-3 bg-blue-50"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold text-gray-900">
                                    {leave.leaveTypeName}
                                  </div>
                                  {leave.isFlagged && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300" title="Flagged for irregular pattern">
                                      🚩 Flagged
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {formatDate(leave.dates.from)} - {formatDate(leave.dates.to)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {leave.durationDays} day{leave.durationDays !== 1 ? "s" : ""}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  leave.status === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {leave.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

