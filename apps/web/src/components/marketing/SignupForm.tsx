'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Button, Alert } from '@accessshield/ui';
import { signIn } from 'next-auth/react';
import { apiUrl } from '@/lib/api/base';

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+'], {
      required_error: 'Please select company size',
    }),
    phone: z
      .string()
      .regex(/^(\+91|91|0)?[6-9]\d{9}$/, 'Enter a valid Indian phone number')
      .optional()
      .or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-1000', label: '201-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
];

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('/api/v1/public/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          companyName: data.companyName,
          phone: data.phone || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          setError('An account with this email already exists. Try signing in.');
        } else if (response.status === 429) {
          setError('Too many signup attempts. Please try again later.');
        } else {
          setError(
            (errorData as { detail?: string }).detail ??
              'Failed to create account. Please try again.',
          );
        }
        setLoading(false);
        return;
      }

      const result = await signIn('keycloak-credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError('Account created but sign-in failed. Please try logging in.');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const isFetchFailure = err instanceof TypeError;
      setError(
        isFetchFailure
          ? 'Could not reach the server. Ensure the API is running (pnpm --filter api dev) and try again.'
          : 'Network error. Please check your connection and try again.',
      );
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      {error && (
        <Alert variant="error" title="Signup failed" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          required
          {...register('fullName')}
          error={errors.fullName?.message}
        />

        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          required
          {...register('email')}
          error={errors.email?.message}
        />

        <Input
          label="Company name"
          type="text"
          autoComplete="organization"
          required
          {...register('companyName')}
          error={errors.companyName?.message}
        />

        <Select
          label="Company size"
          options={companySizeOptions}
          placeholder="Select company size"
          onChange={(value) =>
            setValue('companySize', value as SignupFormData['companySize'], {
              shouldValidate: true,
            })
          }
          error={errors.companySize?.message}
        />

        <Input
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          {...register('phone')}
          error={errors.phone?.message}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          {...register('password')}
          error={errors.password?.message}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="mt-2 w-full"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Creating account...' : 'Start free trial'}
        </Button>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-[#1A56A0] hover:text-[#1A3A5C]">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
