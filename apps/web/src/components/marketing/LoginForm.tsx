'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Button, Input, Alert } from '@accessshield/ui';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    const result = await signIn('keycloak-credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  async function handleGoogleSignIn() {
    await signIn('keycloak', { callbackUrl: redirectTo });
  }

  return (
    <div className="flex justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary">Sign in to AccessibleNow</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
            >
              Start free trial →
            </Link>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white px-8 py-10 shadow-sm">
          {error && (
            <Alert variant="error" title="Sign in failed" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              {...register('password')}
              error={errors.password?.message}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('remember')}
                  className="h-4 w-4 rounded border-border text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-600"
                />
                <span className="text-sm text-text-secondary">Remember me</span>
              </label>

              <Link
                href="/contact"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 rounded"
              >
                Need help?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-text-tertiary">Or continue with</span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={handleGoogleSignIn}
            aria-label="Sign in with Google account"
          >
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
