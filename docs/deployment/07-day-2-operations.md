# 07 — Day-2 operations

[← DB & auth](./06-database-and-auth.md) | [Index](./README.md)

## 1. Routine app update (machine3)

```bash
cd /path/to/checkout
./scripts/deploy.sh
# dirty tree? ./scripts/deploy.sh --no-pull
# prod-style processes: ./scripts/deploy.sh --mode=prod
```

Then confirm:

```bash
curl -s http://127.0.0.1:4000/health
curl -s http://127.0.0.1:8001/health
tail -n 50 .deploy/logs/worker.log
tail -n 50 .deploy/logs/mobile.log
```

## 2. Health & doctor

| Check | Command |
| --- | --- |
| API | `curl -s http://127.0.0.1:4000/health` |
| AI | `curl -s http://127.0.0.1:8001/health` |
| Document module | `curl -s http://127.0.0.1:8001/document-scanner/health` |
| Host tools | `./scripts/setup-host-tools.sh doctor` |
| Edge | from machine1: `bash deploy/scripts/check-connectivity.sh` |
| Public | `curl -I https://$DOMAIN/` and `https://$AUTH_DOMAIN/` |

## 3. Nginx / cert renewal

- Machine3 config change: edit `deploy/env.sh` / templates → re-run `setup-machine3-nginx.sh`
- Machine1: re-run `setup-machine1-proxy.sh` if template changes; certbot renew is usually timer-based (`certbot renew`)

## 4. Mobile scan ops

1. AVD running (`adb devices` shows `device`)  
2. mobile worker up (`.deploy/logs/mobile.log` “listening on queue”)  
3. Prefer blank OS version in upload UI (scanner uses live emulator)  
4. Cloud device farm only if those credentials are set (overrides local Appium)

## 5. Rollback

1. `git checkout <known-good-sha>` on machine3  
2. `./scripts/deploy.sh --no-pull`  
3. If migration was forward-only, restore Postgres from backup ([volumes doc](../architecture/10-docker-volumes-and-backup.md)) before/instead of app rollback  

## 6. Common failures

| Symptom | Fix |
| --- | --- |
| Login 401 / not authenticated overlay | Session expired → login; ensure seed + Keycloak redirects |
| Scans stuck queued | Ensure web scan worker is running via `deploy.sh` |
| Mobile `ECONNREFUSED :4723` | Start Appium or let worker auto-start; set `ANDROID_HOME` |
| Mobile OS mismatch vs emulator | Update mobile-scanner; do not send `platformVersion` for local |
| machine1 cannot reach :80 | Firewall LAN rule machine1 → machine3:80 |
| Certbot fail | DNS must resolve public names to the WAN IP fronting machine1 |

## 7. Manual checklist (never scripted)

- [ ] BIOS KVM  
- [ ] Edge firewall DNAT + LAN  
- [ ] DNS provider records  
- [ ] Leave other machine1 site configs alone  
