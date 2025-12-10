"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { isHRAdminOrManager } from "@/lib/utils/role-utils";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const isHR = isHRAdminOrManager(user);

  const navItemClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? "text-blue-600"
        : "text-gray-700 hover:text-blue-600"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600" />
          <span className="text-xl font-bold text-gray-900">HR System</span>
        </Link>

        {isAuthenticated && (
          <nav className="flex items-center space-x-6">
            {isHR && (
              <>
                <Link
                  href="/dashboard/employee-profile/admin/search"
                  className={navItemClass("/dashboard/employee-profile/admin")}
                >
                  Employees
                </Link>

                <Link
                  href="/dashboard/employee-profile/admin/approvals"
                  className={navItemClass(
                    "/dashboard/employee-profile/admin/approvals"
                  )}
                >
                  Approvals
                </Link>

                <Link
                  href="/dashboard/employee-profile/team"
                  className={navItemClass("/dashboard/employee-profile/team")}
                >
                  Team
                </Link>
              </>
            )}

            <Link
              href="/dashboard/employee-profile/my-profile"
              className={navItemClass("/dashboard/employee-profile/my-profile")}
            >
              My Profile
            </Link>

            {isHR && (
              <Link
                href="/dashboard/admin"
                className={navItemClass("/dashboard/admin")}
              >
                Admin
              </Link>
            )}

            <span className="text-sm text-gray-600">
              Welcome, {user?.fullName || user?.firstName}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Logout
            </button>
          </nav>
        )}

        {!isAuthenticated && (
          <nav className="flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Login
            </Link>

            <Link
              href="/auth/register"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
