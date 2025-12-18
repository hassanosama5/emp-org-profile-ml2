"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRequireAuth, useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { TeamMember } from "@/types";
import { Badge } from "@/components/shared/ui/Badge";
import { Button } from "@/components/shared/ui/Button";
import {
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  BriefcaseIcon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

export default function TeamPage() {
  useRequireAuth([
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ]);

  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "structure">("list");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    probation: 0,
    departments: {} as Record<string, number>,
  });

  useEffect(() => {
    const load = async () => {
      try {
        // Get current user profile
        try {
          const profile = await employeeProfileApi.getMyProfile();
          setCurrentUserProfile(profile);
        } catch (err) {
          console.error("Failed to load current user profile:", err);
        }

        // Get team members only
        const members = await employeeProfileApi.getMyTeam();
        setTeam(members);

        // Calculate stats from members
        const stats = {
          total: members.length,
          active: members.filter((m) => m.status === "ACTIVE").length,
          probation: members.filter((m) => m.status === "PROBATION").length,
          departments: members.reduce((acc, member) => {
            const dept = member.departmentName || "Unknown";
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        };
        setStats(stats);
      } catch (error: any) {
        console.error("Error loading team:", error);
        showToast(error.message || "Failed to load team", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-4 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
            <p className="text-gray-600 mt-2">
              View and manage your direct reports and team members
            </p>
          </div>
          {team.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "primary" : "outline"}
                onClick={() => setViewMode("list")}
                size="sm"
              >
                <ListIcon className="w-4 h-4 mr-2" />
                List View
              </Button>
              <Button
                variant={viewMode === "structure" ? "primary" : "outline"}
                onClick={() => setViewMode("structure")}
                size="sm"
              >
                <LayoutGridIcon className="w-4 h-4 mr-2" />
                Structure View
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <UserIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Team Members</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-4">
                  <BriefcaseIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                  <CalendarIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">On Probation</p>
                  <p className="text-2xl font-bold">{stats.probation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-4">
                  <BuildingIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Departments</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(stats.departments).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Structure View */}
        {viewMode === "structure" && team.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Team Structure</CardTitle>
              <CardDescription>
                Visual hierarchy of your team and reporting structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8">
                {/* Manager (Current User) */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="bg-blue-600 text-white rounded-lg p-6 shadow-lg min-w-[280px]">
                      <div className="flex items-center space-x-4">
                        {currentUserProfile?.profilePictureUrl ? (
                          <img
                            src={currentUserProfile.profilePictureUrl}
                            alt={currentUserProfile.fullName || "You"}
                            className="w-16 h-16 rounded-full border-2 border-white"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                            <span className="text-2xl font-bold text-white">
                              {(currentUserProfile?.fullName || user?.fullName || "You")?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-lg">
                            {currentUserProfile?.fullName || user?.fullName || "You"}
                          </p>
                          <p className="text-sm text-blue-100">
                            {typeof currentUserProfile?.primaryPosition === 'object' && currentUserProfile?.primaryPosition?.title 
                              ? currentUserProfile.primaryPosition.title 
                              : typeof currentUserProfile?.primaryPositionId === 'object' && currentUserProfile?.primaryPositionId?.title
                              ? currentUserProfile.primaryPositionId.title
                              : "Manager"}
                          </p>
                          <p className="text-xs text-blue-200 mt-1">
                            {currentUserProfile?.employeeNumber || user?.employeeNumber || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    {team.length > 0 && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0.5 h-6 bg-gray-300"></div>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                {team.length > 0 && (
                  <div className="relative">
                    {/* Horizontal connector line */}
                    {team.length > 1 && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-0 w-px h-6 bg-gray-300"></div>
                    )}
                    <div className="flex flex-wrap justify-center gap-6 mt-6">
                      {team.map((member, index) => (
                        <div key={member.id || (member as any)._id || member.employeeNumber} className="relative">
                          {/* Vertical connector line */}
                          <div className="absolute left-1/2 transform -translate-x-1/2 -top-6 w-px h-6 bg-gray-300"></div>
                          
                          {/* Member Card */}
                          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow min-w-[240px]">
                            <div className="flex items-center space-x-3">
                              {member.profilePictureUrl ? (
                                <img
                                  src={member.profilePictureUrl}
                                  alt={member.fullName}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-lg font-medium text-gray-600">
                                    {member.fullName?.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {member.fullName}
                                </p>
                                <p className="text-sm text-gray-600 truncate">
                                  {member.positionTitle || "—"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {member.departmentName || "—"}
                                </p>
                                <div className="mt-2">
                                  <Badge className={getStatusColor(member.status)}>
                                    {member.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Your direct reports and team members{" "}
              {team.length > 0 ? `(${team.length} members)` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-500">Loading team members...</p>
              </div>
            ) : team.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <UserIcon className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  No team members found
                </h3>
                <p className="text-gray-500 mt-1">
                  You don't have any direct reports yet.
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Employee #
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Position
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Department
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Date of Hire
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr
                        key={
                          member.id ||
                          (member as any)._id ||
                          member.employeeNumber
                        }
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-black"
                      >
                        <td className="py-3 px-4 font-mono text-sm">
                          {member.employeeNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {member.profilePictureUrl ? (
                              <img
                                src={member.profilePictureUrl}
                                alt={member.fullName}
                                className="w-8 h-8 rounded-full mr-3"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-gray-600">
                                  {member.fullName?.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{member.fullName}</p>
                              {member.workEmail && (
                                <p className="text-sm text-gray-500">
                                  {member.workEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {member.positionTitle || "—"}
                        </td>
                        <td className="py-3 px-4">
                          {member.departmentName || "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(member.dateOfHire)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        {Object.keys(stats.departments).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Department Breakdown</CardTitle>
              <CardDescription>Team members by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.departments).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-gray-700">{dept}</span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
