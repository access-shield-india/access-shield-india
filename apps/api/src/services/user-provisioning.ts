import type { Database } from '@accessshield/db';
import { organisations, users } from '@accessshield/db';
import type { UserRole } from '@accessshield/types';
import { sql } from 'drizzle-orm';
import { slugifyCompanyName, uniqueSlug } from '../lib/slug';
import type { IdentityAdmin } from './identity-admin';
import { logger } from '../lib/logger';

export interface ProvisionTenantUserInput {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  role?: UserRole;
  planTier?: string;
  phone?: string | null;
}

export interface ProvisionTenantUserResult {
  authUserId: string;
  orgId: string;
  userId: string;
}

export async function provisionTenantUser(
  db: Database,
  identityAdmin: IdentityAdmin,
  input: ProvisionTenantUserInput,
): Promise<ProvisionTenantUserResult> {
  const email = input.email.trim().toLowerCase();
  const role = input.role ?? 'customer_admin';
  const planTier = input.planTier ?? 'trial';

  const existingDbUser = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existingDbUser.length > 0) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

  const existingAuth = await identityAdmin.findUserByEmail(email);
  if (existingAuth) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

  let authUserId: string | null = null;

  try {
    const authUser = await identityAdmin.createUser({
      email,
      password: input.password,
      emailConfirm: true,
      userMetadata: { full_name: input.fullName },
    });
    authUserId = authUser.id;

    const slugRows = await db.select({ slug: organisations.slug }).from(organisations);
    const existingSlugs = new Set(slugRows.map((r) => r.slug));
    const baseSlug = slugifyCompanyName(input.companyName);
    const slug = uniqueSlug(baseSlug, existingSlugs);

    const [org] = await db
      .insert(organisations)
      .values({
        name: input.companyName,
        slug,
        planTier,
        billingEmail: email,
        isActive: true,
      })
      .returning({ id: organisations.id });

    if (!org) {
      throw new Error('Failed to create organisation');
    }

    const [appUser] = await db
      .insert(users)
      .values({
        organisationId: org.id,
        authUserId: authUser.id,
        email,
        fullName: input.fullName,
        role,
        isActive: true,
      })
      .returning({ id: users.id });

    if (!appUser) {
      throw new Error('Failed to create application user');
    }

    await identityAdmin.setUserAppMetadata(authUser.id, {
      user_role: role,
      org_id: org.id,
    });

    logger.info({ orgId: org.id, userId: appUser.id, email }, 'Tenant user provisioned');

    return {
      authUserId: authUser.id,
      orgId: org.id,
      userId: appUser.id,
    };
  } catch (err) {
    if (authUserId) {
      await identityAdmin.deleteUser(authUserId);
    }
    throw err;
  }
}

export interface ProvisionOrgUserInput {
  orgId: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export async function provisionOrgUser(
  db: Database,
  identityAdmin: IdentityAdmin,
  input: ProvisionOrgUserInput,
): Promise<{ authUserId: string; userId: string }> {
  const email = input.email.trim().toLowerCase();

  const existingDbUser = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existingDbUser.length > 0) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

  const existingAuth = await identityAdmin.findUserByEmail(email);
  if (existingAuth) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

  let authUserId: string | null = null;

  try {
    const authUser = await identityAdmin.createUser({
      email,
      password: input.password,
      emailConfirm: true,
      userMetadata: { full_name: input.fullName },
    });
    authUserId = authUser.id;

    const [appUser] = await db
      .insert(users)
      .values({
        organisationId: input.orgId,
        authUserId: authUser.id,
        email,
        fullName: input.fullName,
        role: input.role,
        isActive: true,
      })
      .returning({ id: users.id });

    if (!appUser) {
      throw new Error('Failed to create application user');
    }

    await identityAdmin.setUserAppMetadata(authUser.id, {
      user_role: input.role,
      org_id: input.orgId,
    });

    return { authUserId: authUser.id, userId: appUser.id };
  } catch (err) {
    if (authUserId) {
      await identityAdmin.deleteUser(authUserId);
    }
    throw err;
  }
}
