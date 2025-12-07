// lib/utils/role-utils.ts
import { SystemRole, User } from '@/types';

export function getUserDisplayName(user: User): string {
  return (
    user.fullName ||
    `${user.firstName} ${user.lastName}` ||
    user.username ||
    'User'
  );
}

export function getUserIdentifier(user: User): string {
  return user.employeeNumber || user.candidateNumber || user.id;
}

export function canAccessModule(user: User | null, module: string): boolean {
  if (!user) return false;

  const rolePermissions: Record<string, SystemRole[]> = {
    // Define which roles can access which modules
    'time-management': [
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
    // Add more modules as needed
  };

  const allowedRoles = rolePermissions[module] || [];
  return user.roles.some((role) => allowedRoles.includes(role as SystemRole));
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return (
    user.roles.includes(SystemRole.SYSTEM_ADMIN) ||
    user.roles.includes(SystemRole.HR_ADMIN)
  );
}

export function isHRStaff(user: User | null): boolean {
  if (!user) return false;
  return (
    user.roles.includes(SystemRole.HR_MANAGER) ||
    user.roles.includes(SystemRole.HR_EMPLOYEE) ||
    user.roles.includes(SystemRole.RECRUITER)
  );
}

export function isPayrollStaff(user: User | null): boolean {
  if (!user) return false;
  return (
    user.roles.includes(SystemRole.PAYROLL_MANAGER) ||
    user.roles.includes(SystemRole.PAYROLL_SPECIALIST)
  );
}
