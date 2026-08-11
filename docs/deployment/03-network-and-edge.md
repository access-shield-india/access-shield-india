# 03 — Network & edge

[← Artifacts](./02-artifacts-and-scripts.md) | [Index](./README.md) | [Next: Machine3 →](./04-machine3-platform.md)

Source of truth for templates: [`deploy/`](../../deploy/). Addresses come from `deploy/env.sh` (`MACHINE1_IP`, `MACHINE3_IP`, `DOMAIN`, …).

## 1. Layout

```
Internet → public WAN IP → edge firewall / NAT → machine1 (nginx TLS)
  ├─ <other sites on machine1>     → local / existing upstreams
  └─ $DOMAIN / www / auth          → http://$MACHINE3_IP:80
                                         machine3 nginx
                                           ├─ $DOMAIN /        → :3000
                                           ├─ $DOMAIN /api/v1/ → :4000
                                           ├─ $DOMAIN /health  → :4000
                                           └─ $AUTH_DOMAIN     → :8080
```

| Role | Host | Config |
| --- | --- | --- |
| Edge | machine1 | `MACHINE1_IP` |
| AccessibleNow apps | machine3 | `MACHINE3_IP` |

If machine1 and machine3 are on different LAN subnets, the edge firewall must allow TCP **machine1 → machine3:80**.

## 2. DNS provider — manual

| Type | Name | Value |
| --- | --- | --- |
| A | `@` (apex) | **public** WAN IP |
| CNAME or A | `www` | apex / same public IP |
| A or CNAME | `auth` | same public IP |

Do **not** publish machine3’s LAN IP in public DNS.

## 3. Edge firewall / NAT — manual

1. DNAT WAN HTTP/HTTPS → machine1.
2. Allow LAN: machine1 → machine3 port 80.
3. From machine1: `nc -vz "$MACHINE3_IP" 80`.

## 4. Configure `deploy/env.sh`

On **both** machines (same values):

```bash
cd /path/to/repo/deploy
cp env.example env.sh
nano env.sh   # DOMAIN, AUTH_DOMAIN, MACHINE1_IP, MACHINE3_IP, CERTBOT_EMAIL, ports
```

`env.sh` is gitignored. Use placeholder IPs in `env.example`; put real values only in `env.sh` on the servers.

## 5. Machine3 host nginx

Apps must already listen on web/api/Keycloak ports from `env.sh`.

```bash
sudo bash deploy/scripts/setup-machine3-nginx.sh
```

Local smoke:

```bash
curl -I -H "Host: $DOMAIN" http://127.0.0.1/
curl -s -H "Host: $DOMAIN" http://127.0.0.1/health
curl -I -H "Host: $AUTH_DOMAIN" http://127.0.0.1/
```

## 6. Machine1 edge + TLS

```bash
sudo bash deploy/scripts/setup-machine1-proxy.sh
bash deploy/scripts/check-connectivity.sh
```

Certbot issues a cert covering `$DOMAIN`, `$DOMAIN_WWW`, and `$AUTH_DOMAIN`.

Confirm other sites on machine1 still respond over HTTPS after the change.

## 7. What these scripts never touch

- Edge firewall / DNS provider
- Other products’ nginx configs on machine1
- App `.env.local` / Compose
- Host-tools / AVD
