import { SystemRole, User } from "../../types";

/* ----------------------------------------
   User helpers
---------------------------------------- */

export function getUserDisplayName(user: User): string {
  if (user.fullName) return user.fullName;

  if (user.firstName || user.lastName) {
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  }

  return user.username || "User";
}

export function getUserIdentifier(user: User): string {
  return user.employeeNumber || user.candidateNumber || user.id;
}

/* ----------------------------------------
   Access control helpers
---------------------------------------- */

export function canAccessModule(user: User | null, module: string): boolean {
  if (!user) return false;

  const rolePermissions: Record<string, SystemRole[]> = {
    "time-management": [
      SystemRole.DEPARTMENT_EMPLOYEE,
      SystemRole.DEPARTMENT_HEAD,
      SystemRole.HR_MANAGER,
      SystemRole.HR_EMPLOYEE,
    ],
    payroll: [
      SystemRole.PAYROLL_MANAGER,
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.FINANCE_STAFF,
      SystemRole.HR_MANAGER,
    ],
    recruitment: [
      SystemRole.RECRUITER,
      SystemRole.HR_MANAGER,
      SystemRole.HR_EMPLOYEE,
    ],
    admin: [SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN],
  };

  const allowedRoles = rolePermissions[module] || [];

  return user.roles.some((role) => allowedRoles.includes(role as SystemRole));
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false;

  return user.roles.some(
    (role) => role === SystemRole.SYSTEM_ADMIN || role === SystemRole.HR_ADMIN
  );
}

export function isHRStaff(user: User | null): boolean {
  if (!user) return false;

  return user.roles.some((role) =>
    [
      SystemRole.HR_MANAGER,
      SystemRole.HR_EMPLOYEE,
      SystemRole.RECRUITER,
    ].includes(role as SystemRole)
  );
}

export function isPayrollStaff(user: User | null): boolean {
  if (!user) return false;

  return user.roles.some((role) =>
    [SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST].includes(
      role as SystemRole
    )
  );
}

/* ----------------------------------------
   ✅ MISSING FUNCTION (FIXES YOUR ERROR)
---------------------------------------- */

export function getDashboardByRole(role: string): string {
  switch (role as SystemRole) {
    case SystemRole.SYSTEM_ADMIN:
    case SystemRole.HR_ADMIN:
      return "/dashboard/admin";

    case SystemRole.HR_MANAGER:
    case SystemRole.HR_EMPLOYEE:
    case SystemRole.RECRUITER:
      return "/dashboard/recruitment";

    case SystemRole.PAYROLL_MANAGER:
    case SystemRole.PAYROLL_SPECIALIST:
      return "/dashboard/payroll";

    case SystemRole.DEPARTMENT_HEAD:
    case SystemRole.DEPARTMENT_EMPLOYEE:
      return "/dashboard/employee-profile";

    case SystemRole.JOB_CANDIDATE:
      return "/candidate-portal";

    default:
      return "/dashboard";
  }
}
