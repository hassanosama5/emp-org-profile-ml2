// app/dashboard/employee-profile/change-requests/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import type { ProfileChangeRequest } from "@/types";
import { Button } from "@/components/shared/ui/Button";

export default function ChangeRequestsPage() {
  useRequireAuth([SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.RECRUITER]);
  const { toast, showToast, hideToast } = useToast();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await employeeProfileApi.getMyChangeRequests();
        const data =
          res && typeof res === "object" && "data" in res
            ? (res as any).data
            : res;
        setRequests(Array.isArray(data) ? data : []);
      } catch (error: any) {
        showToast(error.message || "Failed to load requests", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Change Requests
            </h1>
            <p className="text-gray-600 mt-1">
              View and manage your profile change requests
            </p>
          </div>
          <Link
            href="/dashboard/employee-profile/change-requests/new"
            className="mt-4 md:mt-0"
          >
            <Button variant="primary">New Request</Button>
          </Link>
        </div>

        {/* Requests Card */}
        <Card>
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>
              All profile change requests you have submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">
                  No change requests yet
                </p>
                <p className="text-gray-400 mb-6">
                  Submit a new request to update your profile information
                </p>
                <Link href="/dashboard/employee-profile/change-requests/new">
                  <Button variant="primary">Create New Request</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Request ID
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-sm text-gray-900">
                          {r.requestId || r.id}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          <div className="max-w-md">
                            {typeof r.requestDescription === "string"
                              ? r.requestDescription.length > 100
                                ? `${r.requestDescription.substring(0, 100)}...`
                                : r.requestDescription
                              : JSON.stringify(r.requestDescription)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                              r.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : r.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : r.status === "CANCELED"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {r.submittedAt
                            ? new Date(r.submittedAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
