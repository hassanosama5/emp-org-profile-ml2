// lib/hooks/use-auth.ts
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { SystemRole } from '@/types';

export const useAuth = () => {
  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    updateUser,
    checkAuth,
    hasRole,
    hasPermission,
    getUserType,
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    updateUser,
    checkAuth,
    hasRole,
    hasPermission,
    getUserType,
  };
};

export const useRequireAuth = (
  requiredRole?: SystemRole | string,
  redirectTo?: string,
) => {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (requiredRole && !hasRole(requiredRole)) {
        router.push(redirectTo || '/dashboard');
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    requiredRole,
    router,
    pathname,
    redirectTo,
    hasRole,
  ]);

  return { user, isLoading };
};

export const useRequireUserType = (requiredType: 'employee' | 'candidate') => {
  const { user, isLoading, isAuthenticated, getUserType } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (getUserType() !== requiredType) {
        // Redirect based on user type
        if (getUserType() === 'employee') {
          router.push('/dashboard');
        } else {
          router.push('/candidate-portal');
        }
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    requiredType,
    router,
    pathname,
    getUserType,
  ]);

  return { user, isLoading };
};

export const useRequireNoAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect based on user type
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.userType === 'candidate') {
        router.push('/candidate-portal');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return { isLoading };
};
