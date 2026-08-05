'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

function SessionExpiryGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    if (session?.accessToken && !session.error) {
      return;
    }
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/auth')
    ) {
      return;
    }

    const redirectTo = pathname.startsWith('/') ? pathname : '/dashboard';
    void signOut({ callbackUrl: `/login?redirectTo=${encodeURIComponent(redirectTo)}` });
  }, [pathname, session, status]);

  return children;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionExpiryGuard>{children}</SessionExpiryGuard>
    </SessionProvider>
  );
}
