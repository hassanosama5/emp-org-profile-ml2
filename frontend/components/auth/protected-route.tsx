/* eslint-disable react-hooks/set-state-in-effect */
// components/auth/protected-route.tsx - UPDATED
"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { SystemRole } from "@/types";
import { getPrimaryDashboard } from "@/lib/utils/role-utils";

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
  redirectTo,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait for loading to complete
    if (loading) {
      return;
    }

    setHasChecked(true);

    // Check authentication
    if (!user || !isAuthenticated) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      if (currentPath && !currentPath.startsWith("/auth/") && !hasRedirected.current) {
        hasRedirected.current = true;
        router.replace("/auth/login");
      }
      return;
    }

    // SYSTEM_ADMIN has universal access - bypass all checks
    const userRoles = user.roles || [];
    const userRoleStrings = userRoles.map((r) => String(r).toLowerCase());
    const isSystemAdmin = userRoleStrings.includes(
      SystemRole.SYSTEM_ADMIN.toLowerCase()
    );

    // HR roles (HR_MANAGER, HR_ADMIN, HR_EMPLOYEE) are employees and should have access to employee pages
    const isHRRole = userRoleStrings.some((role) =>
      ["hr manager", "hr admin", "hr employee"].includes(role)
    );

    // Check user type if required (but allow SYSTEM_ADMIN and HR roles to bypass)
    // HR roles are employees, so they should have access to employee pages
    if (requiredUserType && user.userType !== requiredUserType && !isSystemAdmin && !isHRRole) {
      const targetPath = redirectTo || getPrimaryDashboard(user);
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      
      // Prevent redirect loops - only redirect if not already on target
      if (currentPath !== targetPath && !hasRedirected.current) {
        hasRedirected.current = true;
        router.replace(targetPath);
      }
      return;
    }

    // Check roles if required (but allow SYSTEM_ADMIN to bypass)
    if (allowedRoles && allowedRoles.length > 0 && !isSystemAdmin) {
      const allowedRoleStrings = allowedRoles.map((r) =>
        String(r).toLowerCase()
      );

      const hasRoleAccess = userRoleStrings.some((userRole) =>
        allowedRoleStrings.includes(userRole)
      );

      if (!hasRoleAccess) {
        // If it's an employee page and user is HR role, allow access
        // HR roles should have access to employee pages even if not explicitly in allowedRoles
        const isEmployeePage = requiredUserType === "employee";
        const isEmployeeProfileRoute = typeof window !== "undefined" 
          ? window.location.pathname.startsWith("/dashboard/employee-profile")
          : false;
        
        // HR roles should have access to employee profile pages
        if ((isEmployeePage || isEmployeeProfileRoute) && isHRRole) {
          setIsAuthorized(true);
          return;
        }
        
        const targetPath = redirectTo || getPrimaryDashboard(user);
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : "";
        
        // Prevent redirect loops - only redirect if not already on target
        if (currentPath !== targetPath && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace(targetPath);
        }
        return;
      }
    }

    setIsAuthorized(true);
  }, [
    user,
    loading,
    isAuthenticated,
    allowedRoles,
    requiredUserType,
    router,
    redirectTo,
  ]);

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
