// components/auth/dashboard-redirect.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';

export function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect based on user's highest role or user type
      if (user.userType === 'candidate') {
        router.push('/candidate-portal');
        return;
      }

      // Check for admin roles first
      if (
        user.roles.includes('System Admin') ||
        user.roles.includes('HR Admin')
      ) {
        router.push('/dashboard/admin');
        return;
      }

      // Check for HR roles
      if (
        user.roles.includes('HR Manager') ||
        user.roles.includes('HR Employee')
      ) {
        router.push('/dashboard/hr');
        return;
      }

      // Check for Payroll roles
      if (
        user.roles.includes('Payroll Manager') ||
        user.roles.includes('Payroll Specialist')
      ) {
        router.push('/dashboard/payroll');
        return;
      }

      // Default for regular employees
      router.push('/dashboard/employee-profile');
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600" />
    </div>
  );
}
