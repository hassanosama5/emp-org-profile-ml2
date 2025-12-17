"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { SystemRole } from "@/types";

export default function PayrollConfigurationPage() {
  const { user } = useAuth();
  
  // Protect route - only allow roles that have access to payroll configuration
  useRequireAuth(
    [
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER,
      SystemRole.SYSTEM_ADMIN,
      SystemRole.HR_MANAGER,
      SystemRole.HR_ADMIN,
      SystemRole.LEGAL_POLICY_ADMIN,
      SystemRole.DEPARTMENT_EMPLOYEE, // View-only access
      SystemRole.DEPARTMENT_HEAD, // View-only access
    ],
    '/dashboard'
  );

  const hasPayrollAccess = user?.roles?.some(
    (role) =>
      role === SystemRole.PAYROLL_SPECIALIST ||
      role === SystemRole.PAYROLL_MANAGER ||
      role === SystemRole.SYSTEM_ADMIN ||
      role === SystemRole.HR_MANAGER ||
      role === SystemRole.LEGAL_POLICY_ADMIN
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Configuration</h1>
        <p className="text-gray-600 mt-1">
          Manage payroll policies, pay grades, allowances, and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Configuration Management - Payroll Specialist */}
        {user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Payroll Policies</CardTitle>
                <CardDescription>Manage payroll policies and rules</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/policies"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Policies →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pay Grades</CardTitle>
                <CardDescription>Configure pay grades and salary bands</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/pay-grades"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Pay Grades →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pay Types</CardTitle>
                <CardDescription>Manage different pay types</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/pay-types"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Pay Types →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allowances</CardTitle>
                <CardDescription>Configure employee allowances</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/allowances"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Allowances →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signing Bonuses</CardTitle>
                <CardDescription>Manage signing bonus configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/signing-bonuses"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Signing Bonuses →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Termination Benefits</CardTitle>
                <CardDescription>Configure termination and resignation benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/termination-benefits"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Termination Benefits →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Brackets</CardTitle>
                <CardDescription>Configure insurance contribution brackets</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/insurance-brackets"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Insurance Brackets →
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {/* Legal Admin - Tax Rules */}
        {user?.roles?.includes(SystemRole.LEGAL_POLICY_ADMIN) && (
          <Card>
            <CardHeader>
              <CardTitle>Tax Rules</CardTitle>
              <CardDescription>Manage tax rules and rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-configuration/tax-rules"
                className="text-blue-600 hover:underline font-medium"
              >
                Manage Tax Rules →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Payroll Manager - Approvals */}
        {user?.roles?.includes(SystemRole.PAYROLL_MANAGER) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Approval Dashboard</CardTitle>
                <CardDescription>Review and approve pending configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/approvals"
                  className="text-blue-600 hover:underline font-medium"
                >
                  View Pending Approvals →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuration Statistics</CardTitle>
                <CardDescription>View overview and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/stats"
                  className="text-blue-600 hover:underline font-medium"
                >
                  View Statistics →
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {/* HR Manager - Insurance Oversight */}
        {user?.roles?.includes(SystemRole.HR_MANAGER) && (
          <Card>
            <CardHeader>
              <CardTitle>Insurance Oversight</CardTitle>
              <CardDescription>Review and approve insurance brackets</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll-configuration/insurance-oversight"
                className="text-blue-600 hover:underline font-medium"
              >
                Manage Insurance Oversight →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* System Admin - Settings & Backup */}
        {user?.roles?.includes(SystemRole.SYSTEM_ADMIN) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>Configure company-wide payroll settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/company-settings"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Company Settings →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Management</CardTitle>
                <CardDescription>Manage system backups</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/payroll-configuration/backup"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Manage Backups →
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

