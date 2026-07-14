import type { UserRole } from '@accessshield/types';
import type { AppSecrets } from '../config/secrets';
import { KeycloakAdminService } from './keycloak-admin';

export interface CreateAuthUserInput {
  email: string;
  password: string;
  emailConfirm?: boolean;
  userMetadata?: Record<string, unknown>;
}

export interface AuthUserResult {
  id: string;
  email: string;
}

/**
 * Identity provider admin operations (Keycloak).
 * Callers must not mint user JWTs — only Keycloak issues tokens.
 */
export interface IdentityAdmin {
  findUserByEmail(email: string): Promise<AuthUserResult | null>;
  createUser(input: CreateAuthUserInput): Promise<AuthUserResult>;
  deleteUser(authUserId: string): Promise<void>;
  setUserAppMetadata(
    authUserId: string,
    metadata: { user_role: UserRole; org_id: string },
  ): Promise<void>;
  updateUserPassword(authUserId: string, password: string): Promise<void>;
}

export function createIdentityAdmin(secrets: AppSecrets): IdentityAdmin {
  return new KeycloakAdminService({
    keycloakUrl: secrets.keycloakUrl,
    realm: secrets.keycloakRealm,
    clientId: secrets.keycloakAdminClientId,
    clientSecret: secrets.keycloakAdminClientSecret,
  });
}
