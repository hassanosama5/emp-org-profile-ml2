"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth.store";
import { getPrimaryDashboard } from "../utils/role-utils";

export const useAuth = () => {
  const store = useAuthStore();
  const user = store.user;
  const loading = store.loading;
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once on mount, and only if user is not already set
    // This prevents infinite loops and re-initialization after login
    if (!hasInitialized.current && !user && !loading) {
      hasInitialized.current = true;
      const init = async () => {
        await store.initialize();
      };
      init();
    }
  }, []); // Empty dependency array - only run once on mount

  return store;
};

export const useRequireAuth = (
  requiredRole?: string | string[],
  redirectTo?: string,
  requiredUserType?: "employee" | "candidate"
) => {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const hasRequiredRole = useMemo(() => {
    if (!requiredRole) return true;
    const roles = user?.roles || [];
    
    // Convert roles to lowercase strings for case-insensitive comparison
    const userRoleStrings = roles.map((role) =>
      (typeof role === "string" ? role : String(role)).toLowerCase()
    );
    
    if (Array.isArray(requiredRole)) {
      const requiredRoleStrings = requiredRole.map((r) =>
        (typeof r === "string" ? r : String(r)).toLowerCase()
      );
      return requiredRoleStrings.some((r) => userRoleStrings.includes(r));
    }
    
    const requiredRoleString = (typeof requiredRole === "string" ? requiredRole : String(requiredRole)).toLowerCase();
    return userRoleStrings.includes(requiredRoleString);
  }, [user, requiredRole]);

  useEffect(() => {
    // Wait for loading to complete before making decisions
    if (loading) {
      setHasChecked(false);
      return;
    }

    // Mark that we've checked
    setHasChecked(true);

    // Only redirect if we're certain after loading completes
    if (!isAuthenticated) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (!currentPath.startsWith("/auth/login")) {
        // Small delay to prevent redirect loops
        const timer = setTimeout(() => {
          router.replace(redirectTo || "/auth/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    } else if (!hasRequiredRole) {
      const fallback = getPrimaryDashboard(user);
      const timer = setTimeout(() => {
        router.replace(fallback);
      }, 100);
      return () => clearTimeout(timer);
    } else if (
      requiredUserType &&
      user?.userType &&
      user.userType !== requiredUserType
    ) {
      const fallback = getPrimaryDashboard(user);
      const timer = setTimeout(() => {
        router.replace(fallback);
      }, 100);
      return () => clearTimeout(timer);
    }
    
    setIsLoading(false);
  }, [
    loading,
    isAuthenticated,
    hasRequiredRole,
    requiredUserType,
    user?.userType,
    redirectTo,
    router,
    user,
  ]);

  return { isLoading: isLoading || !hasChecked };
};

export const useRequireUserType = (
  expectedType: "employee" | "candidate",
  redirectTo?: string
) => {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const matchesType = useMemo(() => {
    if (!user) return false;
    return user.userType === expectedType;
  }, [user, expectedType]);

  useEffect(() => {
    // Wait for loading to complete
    if (loading) {
      setHasChecked(false);
      return;
    }

    setHasChecked(true);

    // Only redirect if we're certain after loading completes
    if (!isAuthenticated) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (!currentPath.startsWith("/auth/login")) {
        const timer = setTimeout(() => {
          router.replace(redirectTo || "/auth/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    } else if (!matchesType) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (!currentPath.startsWith("/auth/login")) {
        const timer = setTimeout(() => {
          router.replace(redirectTo || "/auth/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    }
    
    setIsLoading(false);
  }, [loading, isAuthenticated, matchesType, redirectTo, router]);

  return { isLoading: isLoading || !hasChecked };
};
