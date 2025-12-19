// auth/dashboard-redirect/page.tsx - Update this function
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/use-auth";
import { getPrimaryDashboard } from "../../../lib/utils/role-utils"; // Use the new function

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Wait for loading to complete before redirecting
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Use the new function that handles multiple roles
    const dashboardPath = getPrimaryDashboard(user);
    router.replace(dashboardPath);
  }, [user, isAuthenticated, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
