"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";

export default function CandidatePortalPage() {
  const { user } = useAuth();
  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white-900">
            Candidate Portal
          </h1>
          <p className="text-gray-600 mt-1">Welcome, {user?.fullName}</p>

          {/* Candidate Number Display */}
          {user?.candidateNumber && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Your Candidate Number
                  </p>
                  <p className="text-2xl font-bold font-mono text-blue-700 mt-1">
                    {user.candidateNumber}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Use this number along with your password to log in
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                View and manage your candidate profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/candidate-profile/my-profile"
                className="block w-full text-center bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
              >
                View My Profile
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Recruitment</CardTitle>
              <CardDescription>
                Browse jobs, track applications, manage offers, and complete
                onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/recruitment"
                className="block w-full text-center bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
              >
                Open Recruitment Portal
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
