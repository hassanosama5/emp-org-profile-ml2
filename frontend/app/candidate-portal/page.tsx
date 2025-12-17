"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";

export default function CandidatePortalPage() {
  const { user } = useAuth();
  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Candidate Portal</h1>
        <p className="text-gray-600 mt-1">Welcome, {user?.fullName}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Recruitment</CardTitle>
              <CardDescription>
                Browse jobs, track applications, manage offers, and complete onboarding
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
