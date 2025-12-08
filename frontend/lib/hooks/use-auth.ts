"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth.store";

export const useAuth = () => {
  const store = useAuthStore();

  useEffect(() => {
    store.initialize();
  }, []);

  return store;
};

export const useRequireAuth = (
  requiredRole?: string,
  redirectTo?: string,
  requiredUserType?: "employee" | "candidate"
) => {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const hasRequiredRole = useMemo(() => {
    if (!requiredRole) return true;
    const roles = user?.roles || [];
    return roles.includes(requiredRole);
  }, [user, requiredRole]);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace(redirectTo || "/auth/login");
      } else if (!hasRequiredRole) {
        router.replace(redirectTo || "/auth/login");
      } else if (
        requiredUserType &&
        user?.userType &&
        user.userType !== requiredUserType
      ) {
        router.replace(redirectTo || "/auth/login");
      }
      setIsLoading(false);
    }
  }, [
    loading,
    isAuthenticated,
    hasRequiredRole,
    requiredUserType,
    user?.userType,
    redirectTo,
    router,
  ]);

  return { isLoading };
};

export const useRequireUserType = (
  expectedType: "employee" | "candidate",
  redirectTo?: string
) => {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const matchesType = useMemo(() => {
    if (!user) return false;
    return user.userType === expectedType;
  }, [user, expectedType]);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace(redirectTo || "/auth/login");
      } else if (!matchesType) {
        router.replace(redirectTo || "/auth/login");
      }
      setIsLoading(false);
    }
  }, [loading, isAuthenticated, matchesType, redirectTo, router]);

  return { isLoading };
};
