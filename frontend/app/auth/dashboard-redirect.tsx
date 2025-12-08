"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/hooks/use-auth";
import { getDashboardByRole } from "../../lib/utils/role-utils";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // ✅ roles is an array
    const primaryRole = user?.roles?.[0];

    if (primaryRole) {
      router.replace(getDashboardByRole(primaryRole));
    }
  }, [user, isAuthenticated, router]);

  return null;
}
