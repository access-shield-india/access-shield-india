#!/usr/bin/env bash
# Connectivity + smoke checks. Prefer running from machine1.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "${ROOT}/env.sh" ]]; then
  echo "Missing ${ROOT}/env.sh — copy env.example to env.sh and edit."
  exit 1
fi
# shellcheck disable=SC1091
source "${ROOT}/env.sh"

pass=0
fail=0
check() {
  local name="$1"
  shift
  if "$@"; then
    echo "PASS  ${name}"
    pass=$((pass + 1))
  else
    echo "FAIL  ${name}"
    fail=$((fail + 1))
  fi
}

echo "=== LAN: machine1 → machine3 ==="
check "ping ${MACHINE3_IP}" ping -c 1 -W 2 "${MACHINE3_IP}" >/dev/null 2>&1
check "tcp ${MACHINE3_IP}:80" timeout 3 bash -c "echo >/dev/tcp/${MACHINE3_IP}/80" 2>/dev/null

echo "=== Machine3 Host header (HTTP) ==="
check "m3 /" curl -fsS -o /dev/null -I -H "Host: ${DOMAIN}" "http://${MACHINE3_IP}/"
check "m3 /api/v1/" curl -fsS -o /dev/null -I -H "Host: ${DOMAIN}" "http://${MACHINE3_IP}/api/v1/" || \
  curl -fsS -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" "http://${MACHINE3_IP}/api/v1/" | grep -qE '401|403|404|200'
check "m3 auth host" curl -fsS -o /dev/null -I -H "Host: ${AUTH_DOMAIN}" "http://${MACHINE3_IP}/"

echo "=== Public HTTPS ==="
check "https://${DOMAIN}/" curl -fsS -o /dev/null -I "https://${DOMAIN}/"
check "https://${AUTH_DOMAIN}/" curl -fsS -o /dev/null -I "https://${AUTH_DOMAIN}/"

echo "=== Other edge sites still up ==="
check "https://bookmyvendors.in/" curl -fsS -o /dev/null -I "https://bookmyvendors.in/" || true
check "https://boothbuzz.in/" curl -fsS -o /dev/null -I "https://boothbuzz.in/" || true

echo ""
echo "Passed: ${pass}  Failed: ${fail}"
[[ "${fail}" -eq 0 ]]
