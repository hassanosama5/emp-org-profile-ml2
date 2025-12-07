// app/candidate-portal/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { CandidateOnly } from '@/components/auth/role-guard';
import { useAuth } from '@/lib/hooks/use-auth';

export default function CandidatePortalPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredUserType="candidate">
      <CandidateOnly>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Candidate Portal
            </h1>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                  Welcome, {user?.fullName}!
                </h2>
                <p className="text-gray-600">
                  Candidate Number: {user?.candidateNumber}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Candidate dashboard widgets */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Application Status</h3>
                  <p className="text-gray-600">Track your job applications</p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Profile</h3>
                  <p className="text-gray-600">
                    Update your personal information
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Documents</h3>
                  <p className="text-gray-600">Upload required documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CandidateOnly>
    </ProtectedRoute>
  );
}
