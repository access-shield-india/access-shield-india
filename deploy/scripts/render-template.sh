#!/usr/bin/env bash
# Render {{VAR}} placeholders in a template using variables from env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT}/env.sh"

template="${1:?usage: render-template.sh path/to/file.template}"
out="${2:-/dev/stdout}"

sed \
  -e "s/{{DOMAIN}}/${DOMAIN}/g" \
  -e "s/{{DOMAIN_WWW}}/${DOMAIN_WWW}/g" \
  -e "s/{{AUTH_DOMAIN}}/${AUTH_DOMAIN}/g" \
  -e "s/{{MACHINE1_IP}}/${MACHINE1_IP}/g" \
  -e "s/{{MACHINE3_IP}}/${MACHINE3_IP}/g" \
  -e "s/{{WEB_PORT}}/${WEB_PORT}/g" \
  -e "s/{{API_PORT}}/${API_PORT}/g" \
  -e "s/{{KEYCLOAK_PORT}}/${KEYCLOAK_PORT}/g" \
  "$template" >"$out"
