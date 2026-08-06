#!/usr/bin/env bash
# Install JDK 17, Android SDK, platform-tools, emulator, system image, AVD, Appium.
set -euo pipefail

HOST_TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$HOST_TOOLS_DIR/common.sh"

install_java() {
  log "Installing ${JAVA_PACKAGE}…"
  run_root apt-get update -qq
  run_root DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    "${JAVA_PACKAGE}" unzip curl wget ca-certificates libpulse0 libnss3 libx11-xcb1 \
    libxcb-cursor0 libxcb-xinerama0 libc6 libstdc++6
  if [[ -d "$JAVA_HOME_HINT" ]]; then
    ok "Java ready ($JAVA_HOME_HINT)"
  else
    warn "Java installed but JAVA_HOME_HINT path missing — check update-alternatives"
  fi
}

install_android_sdk() {
  ensure_dir "$ANDROID_SDK_ROOT"
  ensure_dir "$ANDROID_AVD_HOME"
  export_android_env

  local tools_zip tools_url
  tools_zip="/tmp/cmdline-tools-${ANDROID_CMDLINE_TOOLS_VERSION}.zip"
  tools_url="https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip"

  if [[ ! -x "${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" ]]; then
    log "Downloading Android cmdline-tools…"
    curl -fsSL "$tools_url" -o "$tools_zip"
    run_root rm -rf "${ANDROID_SDK_ROOT}/cmdline-tools"
    ensure_dir "${ANDROID_SDK_ROOT}/cmdline-tools"
    local extract
    extract="$(mktemp -d)"
    unzip -q "$tools_zip" -d "$extract"
    run_root mv "$extract/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest"
    rm -rf "$extract" "$tools_zip"
    if [[ "$(id -u)" -ne 0 ]]; then
      run_root chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$ANDROID_SDK_ROOT"
    fi
  fi

  export_android_env
  local sdkmanager="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager"
  [[ -x "$sdkmanager" ]] || die "sdkmanager not found at $sdkmanager"

  log "Accepting Android SDK licenses…"
  yes | "$sdkmanager" --licenses >/dev/null || true

  local system_image="system-images;android-${ANDROID_API_LEVEL};google_apis;x86_64"
  log "Installing SDK packages (platform ${ANDROID_API_LEVEL}, build-tools ${ANDROID_BUILD_TOOLS})…"
  "$sdkmanager" --install \
    "platform-tools" \
    "emulator" \
    "platforms;android-${ANDROID_API_LEVEL}" \
    "build-tools;${ANDROID_BUILD_TOOLS}" \
    "$system_image"

  ok "Android SDK at $ANDROID_SDK_ROOT"
}

create_avd() {
  export_android_env
  local avdmanager="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/avdmanager"
  local system_image="system-images;android-${ANDROID_API_LEVEL};google_apis;x86_64"

  if "$avdmanager" list avd 2>/dev/null | grep -q "Name: ${ANDROID_AVD_NAME}"; then
    ok "AVD already exists: $ANDROID_AVD_NAME"
    return 0
  fi

  log "Creating AVD ${ANDROID_AVD_NAME} (API ${ANDROID_API_LEVEL}, ${ANDROID_DEVICE_PROFILE})…"
  echo no | "$avdmanager" create avd \
    --force \
    --name "$ANDROID_AVD_NAME" \
    --package "$system_image" \
    --device "$ANDROID_DEVICE_PROFILE"

  # Prefer software GLES if GPU passthrough is flaky on some boxes
  local config="${ANDROID_AVD_HOME}/${ANDROID_AVD_NAME}.avd/config.ini"
  if [[ -f "$config" ]]; then
    if grep -q '^hw.gpu.enabled=' "$config"; then
      sed -i 's/^hw.gpu.enabled=.*/hw.gpu.enabled=yes/' "$config"
    else
      printf '\nhw.gpu.enabled=yes\n' >>"$config"
    fi
    if grep -q '^hw.gpu.mode=' "$config"; then
      sed -i 's/^hw.gpu.mode=.*/hw.gpu.mode=auto/' "$config"
    else
      printf 'hw.gpu.mode=auto\n' >>"$config"
    fi
  fi

  ok "AVD created: $ANDROID_AVD_NAME"
}

install_appium() {
  log "Ensuring Appium + UiAutomator2 via mobile-scanner workspace…"
  require_cmd_pnpm
  (
    cd "$ROOT"
    pnpm --filter @accessshield/mobile-scanner install
  )

  local appium_bin
  appium_bin="$(resolve_appium_bin)"
  [[ -x "$appium_bin" || -n "$(command -v "$appium_bin" 2>/dev/null || true)" ]] || die "appium binary not found after install"

  # Drivers install into user APPIUM_HOME
  export APPIUM_HOME="${APPIUM_HOME:-$HOME/.appium}"
  ensure_dir "$APPIUM_HOME"
  if ! "$appium_bin" driver list --installed 2>/dev/null | grep -qi uiautomator2; then
    log "Installing Appium UiAutomator2 driver…"
    "$appium_bin" driver install uiautomator2
  fi
  ok "Appium ready ($appium_bin)"
}

require_cmd_pnpm() {
  have_cmd pnpm || die "pnpm required (install Node 20 + pnpm 9 before host-tools)"
  have_cmd node || die "node required"
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if (( major < 20 )); then
    die "Node >= 20 required (found $(node -v))"
  fi
}

resolve_appium_bin() {
  if [[ -n "${APPIUM_BIN:-}" && -x "${APPIUM_BIN}" ]]; then
    printf '%s' "$APPIUM_BIN"
    return
  fi
  local candidates=(
    "$ROOT/apps/mobile-scanner/node_modules/.bin/appium"
    "$ROOT/node_modules/.bin/appium"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -x "$c" ]]; then
      printf '%s' "$c"
      return
    fi
  done
  printf '%s' "appium"
}

write_android_env() {
  [[ -f "$ENV_LOCAL" ]] || {
    warn "Creating $ENV_LOCAL"
    touch "$ENV_LOCAL"
  }
  upsert_env "$ENV_LOCAL" ANDROID_HOME "$ANDROID_SDK_ROOT"
  upsert_env "$ENV_LOCAL" ANDROID_SDK_ROOT "$ANDROID_SDK_ROOT"
  upsert_env "$ENV_LOCAL" ANDROID_AVD_HOME "$ANDROID_AVD_HOME"
  upsert_env "$ENV_LOCAL" JAVA_HOME "${JAVA_HOME:-$JAVA_HOME_HINT}"
  upsert_env "$ENV_LOCAL" APPIUM_HOST "$APPIUM_HOST"
  upsert_env "$ENV_LOCAL" APPIUM_PORT "$APPIUM_PORT"
  upsert_env "$ENV_LOCAL" APPIUM_BIN "$(resolve_appium_bin)"
  ok "Wrote Android/Appium vars to .env.local"
}

check_kvm() {
  if [[ -e /dev/kvm ]]; then
    ok "KVM available (/dev/kvm)"
    if ! id -nG "${SUDO_USER:-$USER}" 2>/dev/null | grep -qw kvm; then
      warn "User not in kvm group — run: sudo usermod -aG kvm ${SUDO_USER:-$USER} && re-login"
    fi
  else
    warn " /dev/kvm missing — enable VT-x/AMD-V in BIOS (manual). Emulator will be slow or fail."
  fi
}

setup_android() {
  require_root_or_sudo
  check_kvm
  install_java
  install_android_sdk
  create_avd
  install_appium
  write_android_env
  ok "Android host stack installed (AVD=$ANDROID_AVD_NAME, API=$ANDROID_API_LEVEL)"
  log "Start emulator later with:"
  log "  export ANDROID_HOME=$ANDROID_SDK_ROOT ANDROID_AVD_HOME=$ANDROID_AVD_HOME"
  log "  \$ANDROID_HOME/emulator/emulator -avd $ANDROID_AVD_NAME -no-snapshot -no-audio"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  setup_android
fi
