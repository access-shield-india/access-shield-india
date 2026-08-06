# AccessibleNow — self-hosted nginx / edge deploy

Same pattern as BoothBuzz: **machine1** terminates public HTTPS and proxies by hostname; **machine3** runs the apps + path/host routing.

## Layout

```
deploy/
  env.example
  nginx/
    machine3-accessiblenow.conf.template
    machine1-accessiblenow-proxy*.template
  scripts/
    setup-machine3-nginx.sh
    setup-machine1-proxy.sh
    check-connectivity.sh
    render-template.sh
```

## Current prod IPs

| Role | Host | IP |
|------|------|-----|
| Edge (Sophos DNAT) | machine1 | `172.31.3.49` |
| AccessibleNow apps | machine3 | `172.31.2.3` |
| Public IP (GoDaddy) | Sophos WAN | same static IP as BookMyVendors / BoothBuzz |

**Note:** machine3 is on `172.31.2.x`, machine1 on `172.31.3.x`. Sophos must allow **cross-subnet** LAN: `172.31.3.49` → `172.31.2.3:80`.

## Routing

```
Internet → static IP → Sophos → 172.31.3.49 (machine1 nginx)
  ├─ bookmyvendors.in     → local (unchanged)
  ├─ boothbuzz.in         → 172.31.3.23 (existing)
  └─ accessiblenow.in     ─┐
     www.accessiblenow.in  ├→ http://172.31.2.3:80
     auth.accessiblenow.in ┘
                              machine3 nginx
                                ├─ accessiblenow.in /     → :3000 (Next web)
                                ├─ accessiblenow.in /api/v1/ → :4000 (API)
                                ├─ accessiblenow.in /health  → :4000
                                └─ auth.accessiblenow.in  → :8080 (Keycloak)
```

## DNS (GoDaddy for accessiblenow.in)

| Type | Name | Value |
|------|------|--------|
| A | `@` | public static IP |
| CNAME | `www` | `accessiblenow.in.` (or A to same IP) |
| A or CNAME | `auth` | same public IP / apex |

Do not put `172.31.2.3` in GoDaddy.

## First-time checklist

### Machine3 (`172.31.2.3`)

1. Bring up Compose infra + host apps (see `docs/architecture/12-linux-server-setup.md`).
2. Point production env at public HTTPS URLs, e.g. in `.env.local`:

```bash
NEXTAUTH_URL=https://accessiblenow.in
NEXT_PUBLIC_APP_URL=https://accessiblenow.in
NEXT_PUBLIC_API_URL=          # empty = same-origin /api/v1 via Next rewrite
CORS_ORIGIN=https://accessiblenow.in
AUTH_ISSUER_URL=https://auth.accessiblenow.in/realms/accessshield
NEXT_PUBLIC_AUTH_URL=https://auth.accessiblenow.in
KEYCLOAK_URL=https://auth.accessiblenow.in
```

3. Keycloak: production hostname + proxy headers (`KC_HOSTNAME=auth.accessiblenow.in`, `KC_PROXY_HEADERS=xforwarded` / equivalent). Update realm client redirect URIs to `https://accessiblenow.in/*`.
4. Copy this `deploy/` folder (or clone repo).
5. `cp env.example env.sh && nano env.sh`
6. `sudo bash scripts/setup-machine3-nginx.sh`
7. Smoke locally with `Host:` headers.

### Machine1 (`172.31.3.49`)

1. Sophos LAN: allow `172.31.3.49` → `172.31.2.3` TCP 80.
2. Confirm `nc -vz 172.31.2.3 80` works.
3. Same `env.sh` values.
4. `sudo bash scripts/setup-machine1-proxy.sh`
5. `bash scripts/check-connectivity.sh`
6. Confirm BookMyVendors + BoothBuzz HTTPS still work.

## What scripts do not automate

- Sophos DNAT (already on machine1) / cross-subnet LAN rule
- GoDaddy DNS
- App `.env.local`, Keycloak realm client URLs, Docker Compose
- BookMyVendors / BoothBuzz nginx files

## Git

- **Commit:** templates, scripts, `env.example`, this README  
- **Do not commit:** `env.sh`, certs
