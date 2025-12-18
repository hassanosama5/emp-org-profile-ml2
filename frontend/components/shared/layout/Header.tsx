"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import NotificationBell from "@/components/notifications/NotificationBell";
import { isHRAdminOrManager } from "@/lib/utils/role-utils";
import { SystemRole } from "@/types";
import {
  User,
  ChevronDown,
  LogOut,
  UserCircle,
  Settings,
  LayoutDashboard,
  Briefcase,
} from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const isHR = isHRAdminOrManager(user);
  const isHRAdmin = user?.roles?.includes(SystemRole.HR_ADMIN) ?? false;

  const navItemClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? "text-blue-600"
        : "text-gray-700 hover:text-blue-600"
    }`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HR System</span>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center space-x-6">
            {/* Main Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {/* Dashboard for all users */}
              <Link href="/dashboard" className={navItemClass("/dashboard")}>
                Dashboard
              </Link>

              {/* Admin Panel for HR Admins */}
              {isHRAdmin && (
                <Link
                  href="/dashboard/admin"
                  className={navItemClass("/dashboard/admin")}
                >
                  Admin
                </Link>
              )}

              {/* Notification Bell */}
              <NotificationBell />
            </nav>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors"
                aria-expanded={isProfileOpen}
                aria-label="User menu"
              >
                {/* Profile Photo or Avatar */}
                <div className="relative">
                  {user?.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={user.fullName || "User"}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200"
                      key={user.profilePictureUrl}
                      onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* User Info - Hidden on mobile */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.fullName || user?.firstName || "User"}
                  </p>
                </div>

                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg border border-gray-200 py-2 z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.fullName || user?.firstName || "User"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {user?.workEmail || user?.personalEmail || "No email"}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <Link
                    href="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-gray-500" />
                    <span>Dashboard</span>
                  </Link>

                  {/* My Profile for all users */}
                  <Link
                    href="/dashboard/employee-profile/my-profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <UserCircle className="h-4 w-4 text-gray-500" />
                    <span>My Profile</span>
                  </Link>

                  {/* Admin Panel for HR Admins in dropdown */}
                  {isHRAdmin && (
                    <Link
                      href="/dashboard/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-2"></div>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Unauthenticated State
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
