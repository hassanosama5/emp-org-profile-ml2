// components/auth/protected-route.tsx (Updated - No LoadingSpinner import)
'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: SystemRole | string;
  requiredUserType?: 'employee' | 'candidate';
  redirectTo?: string;
  fallback?: ReactNode;
}

// Simple loading component
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
    </div>
  );
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredUserType,
  redirectTo,
  fallback = <DefaultFallback />,
}: ProtectedRouteProps) {
  const { isLoading } = useRequireAuth(requiredRole, redirectTo);

  if (isLoading) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function CandidateRoute({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isLoading } = useRequireUserType('candidate');

  if (isLoading) {
    return <>{fallback || <DefaultFallback />}</>;
  }

  return <>{children}</>;
}

export function EmployeeRoute({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isLoading } = useRequireUserType('employee');

  if (isLoading) {
    return <>{fallback || <DefaultFallback />}</>;
  }

  return <>{children}</>;
}
