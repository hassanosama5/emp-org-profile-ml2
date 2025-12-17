// lib/utils/role-utils.ts - UPDATED WITH HR FUNCTIONS
import { SystemRole, User } from "@/types";

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
   HR-Specific Role Helpers (NEW)
---------------------------------------- */

export function isHR(user: User | null): boolean {
  if (!user) return false;

  return user.roles.some(
    (role) =>
      role === SystemRole.HR_ADMIN ||
      role === SystemRole.HR_MANAGER ||
      role === SystemRole.HR_EMPLOYEE
  );
}

export function isHRAdminOrManager(user: User | null): boolean {
  if (!user) return false;

  return user.roles.some(
    (role) => role === SystemRole.HR_ADMIN || role === SystemRole.HR_MANAGER
  );
}

export function hasRoleAccess(
  userRoles: (SystemRole | string)[],
  requiredRole: SystemRole | string
): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;

  return userRoles.some((userRole) => {
    const userRoleStr =
      typeof userRole === "string" ? userRole : String(userRole);
    const requiredRoleStr =
      typeof requiredRole === "string" ? requiredRole : String(requiredRole);

    // Case-insensitive comparison
    return userRoleStr.toLowerCase() === requiredRoleStr.toLowerCase();
  });
}

export function getUserRoleLabels(user: User | null): string[] {
  if (!user) return [];

  const labels: string[] = [];
  const roles = user.roles || [];

  if (hasRoleAccess(roles, SystemRole.HR_ADMIN)) labels.push("HR Admin");
  if (hasRoleAccess(roles, SystemRole.HR_MANAGER)) labels.push("HR Manager");
  if (hasRoleAccess(roles, SystemRole.HR_EMPLOYEE)) labels.push("HR Employee");
  if (hasRoleAccess(roles, SystemRole.DEPARTMENT_HEAD))
    labels.push("Department Head");
  if (hasRoleAccess(roles, SystemRole.DEPARTMENT_EMPLOYEE))
    labels.push("Employee");
  if (hasRoleAccess(roles, SystemRole.SYSTEM_ADMIN))
    labels.push("System Admin");

  return labels;
}

/* ----------------------------------------
   Access control helpers
---------------------------------------- */

export function canAccessModule(user: User | null, module: string): boolean {
  if (!user) return false;

  const rolePermissions: Record<string, SystemRole[]> = {
    "employee-profile": [
      SystemRole.DEPARTMENT_EMPLOYEE,
      SystemRole.DEPARTMENT_HEAD,
      SystemRole.HR_MANAGER,
      SystemRole.HR_EMPLOYEE,
      SystemRole.HR_ADMIN,
      SystemRole.SYSTEM_ADMIN,
    ],
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

// CHANGED - Case-insensitive role matching for HR staff
export function isHRStaff(user: User | null): boolean {
  if (!user) return false;

  const hrRoles = [
    "hr manager",
    "hr employee", 
    "recruiter",
    "hr admin",
  ];

  return user.roles.some((role) => 
    hrRoles.includes(String(role).toLowerCase())
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
   Dashboard Access
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

/* ----------------------------------------
   Employee Profile Access Control
---------------------------------------- */

export function canAccessEmployeeProfile(user: User | null): boolean {
  if (!user) return false;

  // HR Admin/Manager should be able to access even if userType isn't "employee"
  if (isHRAdminOrManager(user)) return true;

  return user.userType === "employee";
}

export function canEditOwnProfile(user: User | null): boolean {
  if (!user) return false;

  const allowedRoles: SystemRole[] = [
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ];

  return user.roles.some((role) => allowedRoles.includes(role as SystemRole));
}

export function canViewTeamProfiles(user: User | null): boolean {
  if (!user) return false;

  const allowedRoles: SystemRole[] = [
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ];

  return user.roles.some((role) => allowedRoles.includes(role as SystemRole));
}

export function canManageAllProfiles(user: User | null): boolean {
  if (!user) return false;

  const allowedRoles: SystemRole[] = [
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ];

  return user.roles.some((role) => allowedRoles.includes(role as SystemRole));
}

export function canApproveProfileChanges(user: User | null): boolean {
  if (!user) return false;

  const allowedRoles: SystemRole[] = [
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ];

  return user.roles.some((role) => allowedRoles.includes(role as SystemRole));
}

export function canSubmitChangeRequests(user: User | null): boolean {
  if (!user) return false;
  return user.roles.some((role) => role === SystemRole.DEPARTMENT_EMPLOYEE);
}

/* ----------------------------------------
   Dashboard Access Based on Multiple Roles
---------------------------------------- */

export function getPrimaryDashboard(user: User | null): string {
  if (!user) return "/auth/login";

  const roles = user.roles || [];

  // Check roles in priority order
  if (roles.includes(SystemRole.SYSTEM_ADMIN)) return "/dashboard/admin";
  if (roles.includes(SystemRole.HR_ADMIN)) return "/dashboard/admin";
  if (roles.includes(SystemRole.HR_MANAGER)) return "/dashboard/hr";
  if (roles.includes(SystemRole.PAYROLL_MANAGER)) return "/dashboard/payroll";
  if (roles.includes(SystemRole.PAYROLL_SPECIALIST))
    return "/dashboard/payroll";
  if (roles.includes(SystemRole.RECRUITER)) return "/dashboard/recruitment";
  if (roles.includes(SystemRole.DEPARTMENT_HEAD))
    return "/dashboard/employee-profile";
  if (roles.includes(SystemRole.DEPARTMENT_EMPLOYEE))
    return "/dashboard/employee-profile";
  if (roles.includes(SystemRole.JOB_CANDIDATE)) return "/candidate-portal";

  return "/dashboard";
}

/* ----------------------------------------
   NEW: HR Admin/Manager Specific Functions
---------------------------------------- */

export function canSearchEmployees(user: User | null): boolean {
  return canManageAllProfiles(user) || isHRStaff(user);
}

export function canEditEmployeeProfile(
  user: User | null,
  targetEmployeeId?: string
): boolean {
  if (!user) return false;

  // HR Admin/Manager can edit any profile
  if (isHRAdminOrManager(user)) return true;

  // Department Head can edit their team members
  if (user.roles.includes(SystemRole.DEPARTMENT_HEAD)) {
    // Here you would check if targetEmployeeId is in user's department
    // For now, return true (you'll need to implement department checking)
    return true;
  }

  // Employees can only edit their own profile
  if (targetEmployeeId && user.id === targetEmployeeId) {
    return user.roles.includes(SystemRole.DEPARTMENT_EMPLOYEE);
  }

  return false;
}

export function getHRPermissions(user: User | null): {
  canSearch: boolean;
  canApprove: boolean;
  canEdit: boolean;
  canViewAll: boolean;
} {
  const isHRUser = isHRAdminOrManager(user);

  return {
    canSearch: isHRUser,
    canApprove: isHRUser,
    canEdit: isHRUser,
    canViewAll: isHRUser,
  };
}