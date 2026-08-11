# AccessibleNow — self-hosted nginx / edge deploy

> **Full deployment guide:** [`docs/deployment/README.md`](../docs/deployment/README.md)  
> Network deep-dive: [`docs/deployment/03-network-and-edge.md`](../docs/deployment/03-network-and-edge.md)

**machine1** terminates public HTTPS and proxies by hostname; **machine3** runs the apps + path/host routing.

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

## Hosts

| Role | Host | Address |
|------|------|---------|
| Edge (firewall DNAT) | machine1 | `$MACHINE1_IP` in `env.sh` |
| AccessibleNow apps | machine3 | `$MACHINE3_IP` in `env.sh` |

If the hosts sit on different LAN subnets, allow TCP **machine1 → machine3:80**.

## Routing

```
Internet → public WAN IP → edge firewall → machine1 nginx
  ├─ <other sites>        → local / existing upstreams
  └─ $DOMAIN / www / auth → http://$MACHINE3_IP:80
                              machine3 nginx
                                ├─ $DOMAIN /        → :3000 (web)
                                ├─ $DOMAIN /api/v1/ → :4000 (API)
                                ├─ $DOMAIN /health  → :4000
                                └─ $AUTH_DOMAIN     → :8080 (Keycloak)
```

## Quick commands

```bash
cp env.example env.sh && nano env.sh   # set MACHINE*_IP, DOMAIN, AUTH_DOMAIN, CERTBOT_EMAIL
# on machine3 (apps up first):
sudo bash scripts/setup-machine3-nginx.sh
# on machine1:
sudo bash scripts/setup-machine1-proxy.sh
bash scripts/check-connectivity.sh
```

## What scripts do not automate

- Edge firewall DNAT / cross-subnet LAN rule
- DNS provider records
- App `.env.local`, Keycloak realm client URLs, Docker Compose, host-tools
- Other products’ nginx files on machine1

## Git

- **Commit:** templates, scripts, `env.example`, this README  
- **Do not commit:** `env.sh`, certs
