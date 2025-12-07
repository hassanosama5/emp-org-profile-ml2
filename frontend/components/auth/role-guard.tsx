// components/auth/role-guard.tsx (Updated)
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: (SystemRole | string)[];
  allowedUserTypes?: ('employee' | 'candidate')[];
  fallback?: ReactNode;
}

// Simple loading spinner component
function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
    </div>
  );
}

export function RoleGuard({
  children,
  allowedRoles,
  allowedUserTypes,
  fallback = null,
}: RoleGuardProps) {
  const { user, isLoading, getUserType, hasRole } = useAuth();

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  // Check user type if specified
  if (allowedUserTypes && allowedUserTypes.length > 0) {
    const userType = getUserType();
    if (!userType || !allowedUserTypes.includes(userType)) {
      return <>{fallback}</>;
    }
  }

  // Check roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some((role) => hasRole(role));
    if (!hasAllowedRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Specific role-based components (keep as is)
export function AdminOnly({
  children,
  fallback,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function HRStaffOnly({
  children,
  fallback,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={[
        SystemRole.HR_MANAGER,
        SystemRole.HR_EMPLOYEE,
        SystemRole.HR_ADMIN,
        SystemRole.RECRUITER,
      ]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function PayrollStaffOnly({
  children,
  fallback,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={[
        SystemRole.PAYROLL_MANAGER,
        SystemRole.PAYROLL_SPECIALIST,
        SystemRole.FINANCE_STAFF,
      ]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function DepartmentHeadOnly({
  children,
  fallback,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={[SystemRole.DEPARTMENT_HEAD]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function EmployeeOnly({
  children,
  fallback,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={[SystemRole.DEPARTMENT_EMPLOYEE]}
      allowedUserTypes={['employee']}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function CandidateOnly({
  children,
  fallback,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={[SystemRole.JOB_CANDIDATE]}
      allowedUserTypes={['candidate']}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}
