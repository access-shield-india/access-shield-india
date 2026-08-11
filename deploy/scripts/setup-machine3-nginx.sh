#!/usr/bin/env bash
# Install AccessibleNow host nginx on machine3 (app host).
# Run as root on machine3 (MACHINE3_IP from env.sh).
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
apt-get install -y -qq nginx

SITE_AVAILABLE=/etc/nginx/sites-available/accessiblenow
SITE_ENABLED=/etc/nginx/sites-enabled/accessiblenow

bash "${ROOT}/scripts/render-template.sh" \
  "${ROOT}/nginx/machine3-accessiblenow.conf.template" \
  "${SITE_AVAILABLE}"

ln -sfn "${SITE_AVAILABLE}" "${SITE_ENABLED}"
rm -f /etc/nginx/sites-enabled/default

# Allow edge proxy (machine1) to hit port 80
if command -v ufw >/dev/null 2>&1; then
  ufw allow from "${MACHINE1_IP}" to any port 80 proto tcp comment 'accessiblenow edge m1' || true
fi

nginx -t
systemctl enable nginx
systemctl reload nginx

echo "OK: machine3 nginx installed for ${DOMAIN} + ${AUTH_DOMAIN}"
echo "Smoke (apps must be listening on ${WEB_PORT}/${API_PORT}/${KEYCLOAK_PORT}):"
echo "  curl -I -H 'Host: ${DOMAIN}' http://127.0.0.1/"
echo "  curl -I -H 'Host: ${DOMAIN}' http://127.0.0.1/api/v1/"
echo "  curl -s -H 'Host: ${DOMAIN}' http://127.0.0.1/health"
echo "  curl -I -H 'Host: ${AUTH_DOMAIN}' http://127.0.0.1/"
echo ""
echo "From machine1 after LAN open:"
echo "  nc -vz ${MACHINE3_IP} 80"
echo "  curl -I -H 'Host: ${DOMAIN}' http://${MACHINE3_IP}/"
