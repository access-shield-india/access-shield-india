#!/usr/bin/env bash
# Install Playwright Chromium for web scan workers (apps/api).
set -euo pipefail

HOST_TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$HOST_TOOLS_DIR/common.sh"

setup_browsers() {
  have_cmd pnpm || die "pnpm required"
  have_cmd node || die "node required"

  log "Installing OS libs often needed by Playwright Chromium on Ubuntu…"
  require_root_or_sudo
  run_root apt-get update -qq
  # Best-effort; Playwright also ships its own deps installer
  run_root DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libasound2 libpango-1.0-0 libcairo2 fonts-liberation || true

  log "Installing Playwright Chromium for @accessshield/api…"
  (
    cd "$ROOT"
    pnpm --filter @accessshield/api install
    pnpm --filter @accessshield/api exec playwright install chromium
    pnpm --filter @accessshield/api exec playwright install-deps chromium || \
      warn "playwright install-deps needs sudo — re-run with sudo if Chromium fails to launch"
  )

  ok "Playwright Chromium installed"
  log "Smoke: pnpm --filter @accessshield/api exec playwright --version"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  setup_browsers
fi
