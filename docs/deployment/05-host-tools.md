# 05 — Host tools (Android, browsers, LLM)

[← Machine3](./04-machine3-platform.md) | [Index](./README.md) | [Next: DB & auth →](./06-database-and-auth.md)

All host tools install on **machine3** (same box as apps). Separate from `deploy.sh` and from nginx.

## 1. What gets installed

| Module | Contents | Shared paths |
| --- | --- | --- |
| `android` | JDK 17, Android SDK, platform-tools, emulator, AVD (default API **34**), Appium + UiAutomator2 | `/opt/accessshield/android-sdk`, `/opt/accessshield/android-avd` |
| `browsers` | Playwright Chromium for `@accessshield/api` | Playwright cache under user home |
| `llm` | `apps/ai-service` venv `[local]`, GGUF download, warmup | `/opt/accessshield/huggingface` |

Pinned versions: [`scripts/host-tools/versions.env`](../../scripts/host-tools/versions.env).

**Android API note:** setup pins one system image (default 34). The mobile-scanner binds by **adb udid** and does not require Appium `platformVersion` to match a hardcoded 13.0. Override: `ANDROID_API_LEVEL=33 ./scripts/setup-host-tools.sh android`.

## 2. Install

```bash
chmod +x scripts/setup-host-tools.sh scripts/host-tools/*.sh

# Prerequisites: Node 20 + pnpm already on PATH
./scripts/setup-host-tools.sh              # all + doctor
./scripts/setup-host-tools.sh android
./scripts/setup-host-tools.sh browsers
./scripts/setup-host-tools.sh llm
./scripts/setup-host-tools.sh doctor
```

Writes into `.env.local` / `apps/ai-service/.env`: `ANDROID_HOME`, `JAVA_HOME`, `APPIUM_*`, `LOCAL_MODEL`, `HF_HOME`, `LOCAL_LLM_WARMUP=true`.

`LOCAL_MODEL` is read from `apps/ai-service/.env` then `.env.local`, else default Qwen 3B GGUF.

## 3. Manual: KVM

```bash
ls -l /dev/kvm
# If missing: enable VT-x/AMD-V in BIOS, then:
sudo apt-get install -y qemu-kvm
sudo usermod -aG kvm "$USER"   # re-login
```

Without KVM the AVD is unreliable (you already saw `/dev/kvm is not found`).

## 4. Runtime: emulator + Appium

`setup-host-tools` does **not** keep the emulator running. Before mobile scans:

```bash
export ANDROID_HOME=/opt/accessshield/android-sdk
export ANDROID_AVD_HOME=/opt/accessshield/android-avd
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

emulator -avd accessshield_api34 -no-snapshot -no-audio &
adb wait-for-device
adb devices   # expect emulator-5554 device
```

Appium: start manually on `:4723`, or let mobile-scanner auto-start (needs `ANDROID_HOME` in the worker env via `.env.local`).

## 5. Doctor

```bash
./scripts/setup-host-tools.sh doctor
```

Checks Java, SDK, AVD existence, KVM, Appium binary, Playwright launch, llama-cpp import, env keys.
