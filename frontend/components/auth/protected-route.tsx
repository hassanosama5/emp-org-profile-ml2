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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    let hasAccess = true;

    // Check user type if required
    if (requiredUserType && user.userType !== requiredUserType) {
      hasAccess = false;
    }

    // Check roles if required
    if (allowedRoles && allowedRoles.length > 0) {
      const userRoles = user.roles || [];

      // Convert both arrays to strings for comparison
      const userRoleStrings = userRoles.map((role) =>
        typeof role === "string" ? role : (role as any).toString()
      );

      const allowedRoleStrings = allowedRoles.map((role) =>
        typeof role === "string" ? role : (role as any).toString()
      );

      // Check if any user role matches any allowed role
      const hasRoleAccess = userRoleStrings.some((userRole) =>
        allowedRoleStrings.includes(userRole)
      );

      if (!hasRoleAccess) {
        hasAccess = false;
      }
    }

    if (!hasAccess) {
      router.push(redirectTo);
      return;
    }

    setIsAuthorized(true);
  }, [user, loading, allowedRoles, requiredUserType, router, redirectTo]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
