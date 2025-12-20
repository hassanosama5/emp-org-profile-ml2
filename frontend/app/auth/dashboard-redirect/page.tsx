// auth/dashboard-redirect/page.tsx - Update this function
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/use-auth";
import { getPrimaryDashboard } from "../../../lib/utils/role-utils";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait for loading to complete before redirecting
    if (loading) {
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      // Small delay to avoid redirect loops
      setTimeout(() => {
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          router.replace("/auth/login");
        }
      }, 100);
      return;
    }

    // Wait for user roles to be available
    // If user exists but no roles, the user data might be incomplete
    // Try to re-fetch if roles are missing
    if (!user.roles || user.roles.length === 0) {
      // Wait a bit and try to re-initialize to get complete user data with roles
      const retryTimer = setTimeout(async () => {
        if (!hasRedirected.current && user && (!user.roles || user.roles.length === 0)) {
          try {
            const { useAuthStore } = await import("../../../lib/stores/auth.store");
            const store = useAuthStore.getState();
            await store.initialize();
          } catch (err) {
            console.error("Failed to re-initialize auth:", err);
          }
        }
      }, 500);
      return () => clearTimeout(retryTimer);
    }

    // Use the function that handles multiple roles
    const dashboardPath = getPrimaryDashboard(user);
    
    // Only redirect if not already on target
    const currentPath = window.location.pathname;
    if (currentPath !== dashboardPath && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace(dashboardPath);
    }
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

