#!/usr/bin/env bash
# Install AccessibleNow HTTPS edge proxy on machine1.
# Does not modify bookmyvendors or boothbuzz configs.
# Run as root on MACHINE1_IP after machine3 nginx is up.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "${ROOT}/env.sh" ]]; then
  echo "Missing ${ROOT}/env.sh — copy env.example to env.sh and edit."
  exit 1
fi
# shellcheck disable=SC1091
source "${ROOT}/env.sh"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

mkdir -p /var/www/certbot

SITE_AVAILABLE=/etc/nginx/sites-available/accessiblenow-proxy
SITE_ENABLED=/etc/nginx/sites-enabled/accessiblenow-proxy

echo "Checking LAN reachability to machine3 ${MACHINE3_IP}:80 ..."
if ! timeout 3 bash -c "echo >/dev/tcp/${MACHINE3_IP}/80" 2>/dev/null; then
  echo "ERROR: cannot connect to ${MACHINE3_IP}:80 from this host."
  echo "Fix Sophos/ufw LAN rules (note: m3 is on 172.31.2.x, m1 on 172.31.3.x)."
  exit 1
fi

# Bootstrap HTTP (needed before certs exist)
bash "${ROOT}/scripts/render-template.sh" \
  "${ROOT}/nginx/machine1-accessiblenow-proxy-http-bootstrap.conf.template" \
  "${SITE_AVAILABLE}"
ln -sfn "${SITE_AVAILABLE}" "${SITE_ENABLED}"
nginx -t
systemctl reload nginx

CERT_LIVE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [[ ! -f "${CERT_LIVE}" ]]; then
  echo "Requesting Let's Encrypt cert for ${DOMAIN} ${DOMAIN_WWW} ${AUTH_DOMAIN} ..."
  certbot --nginx \
    --non-interactive --agree-tos \
    -m "${CERTBOT_EMAIL}" \
    -d "${DOMAIN}" -d "${DOMAIN_WWW}" -d "${AUTH_DOMAIN}" \
    || {
      echo "Certbot failed. DNS must point all three names at this machine's public IP."
      exit 1
    }
fi

# Install full HTTPS template (idempotent overwrite)
bash "${ROOT}/scripts/render-template.sh" \
  "${ROOT}/nginx/machine1-accessiblenow-proxy.conf.template" \
  "${SITE_AVAILABLE}"

if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  echo "WARN: /etc/letsencrypt/options-ssl-nginx.conf missing — install via certbot or comment those includes."
fi

nginx -t
systemctl reload nginx

echo "OK: machine1 edge proxy for ${DOMAIN} / ${AUTH_DOMAIN} → ${MACHINE3_IP}:80"
echo "Smoke:"
echo "  curl -I https://${DOMAIN}/"
echo "  curl -I https://${DOMAIN}/api/v1/"
echo "  curl -I https://${AUTH_DOMAIN}/"
echo "  curl -I https://bookmyvendors.in/   # must still work"
echo "  curl -I https://boothbuzz.in/       # must still work"
