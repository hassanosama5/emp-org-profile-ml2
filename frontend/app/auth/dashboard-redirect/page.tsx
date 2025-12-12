// auth/dashboard-redirect/page.tsx - Update this function
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/use-auth";
import { getPrimaryDashboard } from "../../../lib/utils/role-utils"; // Use the new function

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Use the new function that handles multiple roles
    const dashboardPath = getPrimaryDashboard(user);
    router.replace(dashboardPath);
  }, [user, isAuthenticated, router]);

  return null;
}
