// components/auth/protected-route.tsx - UPDATED
"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SystemRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: SystemRole[] | string[];
  requiredUserType?: string;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredUserType,
  redirectTo = "/dashboard",
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Wait for loading to complete
    if (loading) {
      return;
    }

    setHasChecked(true);

    // Check authentication
    if (!user || !isAuthenticated) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (currentPath && !currentPath.startsWith("/auth/")) {
        router.replace("/auth/login");
      }
      return;
    }

    // Check user type if required
    if (requiredUserType && user.userType !== requiredUserType) {
      router.replace(redirectTo);
      return;
    }

    // Check roles if required
    if (allowedRoles && allowedRoles.length > 0) {
      const userRoles = user.roles || [];
      
      // Convert to lowercase for comparison
      const userRoleStrings = userRoles.map((r) => String(r).toLowerCase());
      const allowedRoleStrings = allowedRoles.map((r) => String(r).toLowerCase());
      
      const hasRoleAccess = userRoleStrings.some((userRole) =>
        allowedRoleStrings.includes(userRole)
      );

      if (!hasRoleAccess) {
        router.replace(redirectTo);
        return;
      }
    }

    setIsAuthorized(true);
  }, [user, loading, isAuthenticated, allowedRoles, requiredUserType, router, redirectTo]);

  // Show loading while checking auth or if not yet authorized
  if (loading || !hasChecked || (!isAuthorized && hasChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
