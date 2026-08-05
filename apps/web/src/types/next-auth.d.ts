import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      user_role?: string;
      org_id?: string;
    };
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    user_role?: string;
    org_id?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    user_role?: string;
    org_id?: string;
    error?: string;
  }
}
