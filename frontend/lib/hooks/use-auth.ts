/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth.store";
import { getPrimaryDashboard, hasRoleAccess } from "../utils/role-utils";

export const useAuth = () => {
  const store = useAuthStore();
  const user = store.user;
  const loading = store.loading;
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once on mount, and only if we don't have a user
    // This prevents infinite loops and re-initialization after login
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      // If we already have a user (e.g., from login), don't initialize
      if (user) {
        return;
      }
      
      const init = async () => {
        // Small delay to ensure cookies are available (especially after login)
        await new Promise(resolve => setTimeout(resolve, 200));
        // Only initialize if we still don't have a user
        const currentUser = store.user;
        if (!currentUser) {
          await store.initialize();
        }
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
  const [hasInitialized, setHasInitialized] = useState(false);

  // Ensure initialization runs
  useEffect(() => {
    const store = useAuthStore.getState();
    store.initialize();

    // Give a small delay to ensure zustand store has initialized
    const timer = setTimeout(() => {
      setHasInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const hasRequiredRole = useMemo(() => {
    if (!requiredRole) return true;
    const roles = user?.roles || [];

    // SYSTEM_ADMIN has universal access - bypass all role checks
    const userRoleStrings = roles.map((role) =>
      (typeof role === "string" ? role : String(role)).toLowerCase()
    );
    const isSystemAdmin = userRoleStrings.includes(
      "system admin".toLowerCase()
    );
    if (isSystemAdmin) return true;

    // Convert roles to lowercase strings for case-insensitive comparison
    if (Array.isArray(requiredRole)) {
      const requiredRoleStrings = requiredRole.map((r) =>
        (typeof r === "string" ? r : String(r)).toLowerCase()
      );
      return requiredRoleStrings.some((r) => userRoleStrings.includes(r));
    }

    const requiredRoleString = (
      typeof requiredRole === "string" ? requiredRole : String(requiredRole)
    ).toLowerCase();
    return userRoleStrings.includes(requiredRoleString);
  }, [user, requiredRole]);

  useEffect(() => {
    // Wait for initialization to complete
    if (!hasInitialized) {
      setHasChecked(false);
      setIsLoading(true);
      return;
    }

    // Wait for loading to complete before making decisions
    if (loading) {
      setHasChecked(false);
      setIsLoading(true);
      return;
    }

    // Mark that we've checked
    setHasChecked(true);

    // Debug logging
    if (requiredRole) {
      console.log("🔍 Role Check:", {
        requiredRole,
        userRoles: user?.roles,
        isAuthenticated,
        hasRequiredRole,
        userType: user?.userType,
      });
    }

    // Check if user is SYSTEM_ADMIN - has universal access
    const roles = user?.roles || [];
    const userRoleStrings = roles.map((role) =>
      (typeof role === "string" ? role : String(role)).toLowerCase()
    );
    const isSystemAdmin = userRoleStrings.includes(
      "system admin".toLowerCase()
    );

    // Get current path to prevent redirect loops
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";

    // Only redirect if we're certain after loading completes
    if (!isAuthenticated) {
      console.log("❌ Not authenticated, redirecting to login");
      if (!currentPath.startsWith("/auth/login")) {
        // Small delay to prevent redirect loops
        const timer = setTimeout(() => {
          router.replace(redirectTo || "/auth/login");
        }, 100);
        setIsLoading(false);
        return () => clearTimeout(timer);
      }
    } else if (requiredRole && !hasRequiredRole && !isSystemAdmin) {
      console.log("❌ Missing required role, redirecting to dashboard");
      // Debug logging for role access issues
      console.log("useRequireAuth: Access denied", {
        requiredRole,
        userRoles: user?.roles,
        hasRequiredRole,
        userId: user?.id || user?.userId,
        username: user?.username,
      });
      const fallback = redirectTo || getPrimaryDashboard(user);
      console.log("useRequireAuth: Redirecting to", fallback);
      
      // Prevent redirect loops - only redirect if not already on target
      if (currentPath !== fallback) {
        const timer = setTimeout(() => {
          router.replace(fallback);
        }, 100);
        setIsLoading(false);
        return () => clearTimeout(timer);
      }
    } else if (
      requiredUserType &&
      user?.userType &&
      user.userType !== requiredUserType &&
      !isSystemAdmin
    ) {
      console.log("❌ Wrong user type, redirecting to dashboard");
      const fallback = redirectTo || getPrimaryDashboard(user);
      
      // Prevent redirect loops - only redirect if not already on target
      if (currentPath !== fallback) {
        const timer = setTimeout(() => {
          router.replace(fallback);
        }, 100);
        setIsLoading(false);
        return () => clearTimeout(timer);
      }
    }

    setIsLoading(false);
  }, [
    loading,
    hasInitialized,
    isAuthenticated,
    hasRequiredRole,
    requiredRole,
    requiredUserType,
    user?.userType,
    user,
    redirectTo,
    router,
  ]);

  return { isLoading: isLoading || !hasChecked || !hasInitialized || loading };
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasChecked(false);
      return;
    }

    setHasChecked(true);

    // Only redirect if we're certain after loading completes
    if (!isAuthenticated) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      if (!currentPath.startsWith("/auth/login")) {
        const timer = setTimeout(() => {
          router.replace(redirectTo || "/auth/login");
        }, 100);
        return () => clearTimeout(timer);
      }
    } else if (!matchesType) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
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
