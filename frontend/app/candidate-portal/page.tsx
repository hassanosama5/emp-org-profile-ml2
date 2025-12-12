"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";

export default function CandidatePortalPage() {
  const { user } = useAuth();
  return (
    <ProtectedRoute requiredUserType="candidate">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Candidate Portal</h1>
        <p className="text-gray-600 mt-1">Candidate: {user?.fullName}</p>
        <div className="mt-6 rounded-lg border bg-white p-6">
          <p className="text-gray-700">
            You can track your application status and view any updates here.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
