import type { UserRole } from '@accessshield/types';
import { logger } from '../lib/logger';
import type {
  AuthUserResult,
  CreateAuthUserInput,
  IdentityAdmin,
} from './identity-admin';

export interface KeycloakAdminConfig {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

interface KeycloakUserRepresentation {
  id?: string;
  email?: string;
  username?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string[]>;
  credentials?: Array<{ type: string; value: string; temporary?: boolean }>;
}

/**
 * Keycloak Admin REST client — replaces Supabase GoTrue Admin for user provisioning.
 * Does not mint JWTs; only manages users and attributes used by protocol mappers.
 */
export class KeycloakAdminService implements IdentityAdmin {
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(private readonly config: KeycloakAdminConfig) {}

  private get adminBase(): string {
    return `${this.config.keycloakUrl.replace(/\/$/, '')}/admin/realms/${this.config.realm}`;
  }

  private get tokenUrl(): string {
    return `${this.config.keycloakUrl.replace(/\/$/, '')}/realms/${this.config.realm}/protocol/openid-connect/token`;
  }

  private async getServiceToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 30_000) {
      return this.cachedToken.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, body: text }, 'Keycloak client_credentials failed');
      throw new Error('Failed to obtain Keycloak admin token');
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return data.access_token;
  }

  private async adminHeaders(): Promise<HeadersInit> {
    const token = await this.getServiceToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async findUserByEmail(email: string): Promise<AuthUserResult | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const url = new URL(`${this.adminBase}/users`);
    url.searchParams.set('email', normalizedEmail);
    url.searchParams.set('exact', 'true');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.adminHeaders(),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, 'Keycloak list users by email failed');
      throw new Error('Failed to look up auth user');
    }

    const users = (await response.json()) as KeycloakUserRepresentation[];
    const user = users.find((u) => u.email?.trim().toLowerCase() === normalizedEmail);
    if (!user?.id) {
      return null;
    }

    return { id: user.id, email: user.email ?? normalizedEmail };
  }

  async createUser(input: CreateAuthUserInput): Promise<AuthUserResult> {
    const email = input.email.trim().toLowerCase();
    const fullName =
      typeof input.userMetadata?.['full_name'] === 'string'
        ? (input.userMetadata['full_name'] as string)
        : undefined;
    const nameParts = fullName?.trim().split(/\s+/) ?? [];

    const payload: KeycloakUserRepresentation = {
      email,
      username: email,
      enabled: true,
      emailVerified: input.emailConfirm ?? true,
      firstName: nameParts[0],
      lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined,
      credentials: [
        {
          type: 'password',
          value: input.password,
          temporary: false,
        },
      ],
    };

    const response = await fetch(`${this.adminBase}/users`, {
      method: 'POST',
      headers: await this.adminHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, email }, 'Keycloak create user failed');
      if (response.status === 409 || body.toLowerCase().includes('exists')) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }
      throw new Error(`Failed to create auth user: ${body}`);
    }

    const location = response.headers.get('Location');
    let id = location?.split('/').pop() ?? null;

    if (!id) {
      const found = await this.findUserByEmail(email);
      if (!found) {
        throw new Error('Failed to resolve created Keycloak user id');
      }
      id = found.id;
    }

    return { id, email };
  }

  async deleteUser(authUserId: string): Promise<void> {
    const response = await fetch(`${this.adminBase}/users/${authUserId}`, {
      method: 'DELETE',
      headers: await this.adminHeaders(),
    });

    if (!response.ok) {
      logger.warn({ authUserId, status: response.status }, 'Keycloak delete user failed');
    }
  }

  async setUserAppMetadata(
    authUserId: string,
    metadata: { user_role: UserRole; org_id: string },
  ): Promise<void> {
    const getResponse = await fetch(`${this.adminBase}/users/${authUserId}`, {
      method: 'GET',
      headers: await this.adminHeaders(),
    });

    if (!getResponse.ok) {
      throw new Error('Failed to load Keycloak user for metadata update');
    }

    const user = (await getResponse.json()) as KeycloakUserRepresentation;
    const attributes: Record<string, string[]> = {
      ...(user.attributes ?? {}),
      user_role: [metadata.user_role],
      org_id: [metadata.org_id],
    };

    const response = await fetch(`${this.adminBase}/users/${authUserId}`, {
      method: 'PUT',
      headers: await this.adminHeaders(),
      body: JSON.stringify({
        ...user,
        attributes,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(
        { authUserId, status: response.status, body },
        'Keycloak update user attributes failed',
      );
      throw new Error('Failed to set user app metadata');
    }
  }

  async updateUserPassword(authUserId: string, password: string): Promise<void> {
    const response = await fetch(`${this.adminBase}/users/${authUserId}/reset-password`, {
      method: 'PUT',
      headers: await this.adminHeaders(),
      body: JSON.stringify({
        type: 'password',
        value: password,
        temporary: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user password');
    }
  }
}
