# 06 — Database & auth

[← Host tools](./05-host-tools.md) | [Index](./README.md) | [Next: Day-2 →](./07-day-2-operations.md)

## 1. Databases

| DB name | Port | Used by |
| --- | --- | --- |
| `accessshield` | 5433 (host) | App (Drizzle) |
| `keycloak` | same Postgres instance | Keycloak |

Migrations:

```bash
pnpm --filter @accessshield/db exec drizzle-kit migrate
# or via ./scripts/deploy.sh / --migrate-only
```

## 2. Application seed

```bash
pnpm db:seed
# applies packages/db/seed/dev.sql (orgs, playground user, platform org, …)
```

Platform admin email is defined in seed + `scripts/seed-sysadmin.sh` (default: `sysadmin@` + your public domain).

## 3. Keycloak platform admin

```bash
export SYSADMIN_INITIAL_PASSWORD='…'   # or set in .env.local
./scripts/seed-sysadmin.sh
```

Creates/updates the Keycloak platform admin with `user_role=super_admin`, links `users.auth_user_id`, and password-grant smoke-tests.

Login UI: `https://$DOMAIN/login` (or LAN `:3000` before TLS).

## 4. Realm / client checklist (prod HTTPS)

After Keycloak is reachable at `https://$AUTH_DOMAIN`:

- [ ] `KC_HOSTNAME` / proxy headers match `$AUTH_DOMAIN`  
- [ ] Web OIDC client redirect URIs include `https://$DOMAIN/*`  
- [ ] `AUTH_ISSUER_URL` / `NEXTAUTH_URL` / `CORS_ORIGIN` use HTTPS hostnames  
- [ ] Admin/API client secret matches `.env.local`  

## 5. Google sign-in (“Continue with Google”)

The web app sends users to **Keycloak** with `kc_idp_hint=google`. Keycloak must broker Google OAuth — the button does not call Google directly.

1. Create a Google OAuth client (Web application) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add **Authorized redirect URI** (replace host if not production):

   `https://$AUTH_DOMAIN/realms/accessshield/broker/google/endpoint`

   Local dev: `http://localhost:8080/realms/accessshield/broker/google/endpoint`

3. Add to `.env.local` (or prod secrets):

   ```bash
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   # optional — must match Keycloak IdP alias (default: google)
   KEYCLOAK_GOOGLE_IDP_ALIAS=google
   NEXT_PUBLIC_KEYCLOAK_GOOGLE_IDP_ALIAS=google
   ```

4. Apply IdP config to Keycloak:

   ```bash
   chmod +x ./scripts/configure-keycloak-google-idp.sh
   ./scripts/configure-keycloak-google-idp.sh
   ```

5. Confirm web env matches public URLs:

   - `NEXTAUTH_URL=https://$DOMAIN`
   - `AUTH_ISSUER_URL=https://$AUTH_DOMAIN/realms/accessshield`
   - `NEXT_PUBLIC_AUTH_URL=https://$AUTH_DOMAIN`

**New customers:** Google login works for accounts already provisioned (signup or admin invite). Brand-new Google users still need signup so `org_id` / `user_role` are set on their Keycloak user.

## 6. Playground user (optional)

Dev seed may also create a non-admin playground account for scanner demos. For production tenants, use product signup/admin flows — do not rely on playground credentials.
