// app/auth/login/page.tsx (Updated)
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';

const loginSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee/Candidate number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      const result = await login(data);

      // Redirect based on user type
      if (result.user.userType === 'candidate') {
        router.push('/candidate-portal');
      } else {
        router.push(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Your login form UI here */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Form fields */}
        <div>
          <label>Employee/Candidate Number</label>
          <input
            {...register('employeeNumber')}
            placeholder="Enter your number"
          />
          <p>{errors.employeeNumber?.message}</p>
        </div>

        <div>
          <label>Password</label>
          <input type="password" {...register('password')} />
          <p>{errors.password?.message}</p>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
