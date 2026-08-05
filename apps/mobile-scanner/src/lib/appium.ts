import { spawn, type ChildProcess, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ensureAndroidSdkEnv } from './android-env.js';
import { logger } from './logger.js';
import { findMonorepoRoot } from './paths.js';

const execFileAsync = promisify(execFile);

export function getAppiumHost(): string {
  return process.env.APPIUM_HOST?.trim() || '127.0.0.1';
}

export function getAppiumPort(): number {
  const raw = process.env.APPIUM_PORT?.trim();
  const port = raw ? Number(raw) : 4723;
  return Number.isFinite(port) && port > 0 ? port : 4723;
}

let appiumProcess: ChildProcess | null = null;
let starting: Promise<void> | null = null;

async function isAppiumUp(): Promise<boolean> {
  const url = `http://${getAppiumHost()}:${getAppiumPort()}/status`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

function resolveAppiumCommand(): { cmd: string; args: string[] } {
  if (process.env.APPIUM_BIN?.trim()) {
    return { cmd: process.env.APPIUM_BIN.trim(), args: [] };
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '../../node_modules/.bin/appium'),
    resolve(findMonorepoRoot(), 'node_modules/.bin/appium'),
    resolve(findMonorepoRoot(), 'apps/mobile-scanner/node_modules/.bin/appium'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { cmd: candidate, args: [] };
    }
  }

  return { cmd: 'appium', args: [] };
}

async function stopListenersOnPort(port: number): Promise<void> {
  if (appiumProcess?.pid) {
    appiumProcess.kill('SIGTERM');
    appiumProcess = null;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  try {
    await execFileAsync('fuser', ['-k', `${port}/tcp`], { timeout: 5_000 });
  } catch {
    try {
      const { stdout } = await execFileAsync('lsof', ['-tiTCP:' + String(port), '-sTCP:LISTEN'], {
        timeout: 5_000,
      });
      for (const pid of stdout.trim().split(/\s+/).filter(Boolean)) {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch {
          /* already gone */
        }
      }
    } catch {
      /* nothing listening or tools missing */
    }
  }

  await new Promise((resolveWait) => setTimeout(resolveWait, 800));
}

async function startAppium(): Promise<void> {
  const sdkPath = ensureAndroidSdkEnv();
  const host = getAppiumHost();
  const port = getAppiumPort();

  if (await isAppiumUp()) {
    if (appiumProcess) {
      logger.info({ host, port }, 'Appium already running');
      return;
    }
    if (process.env.APPIUM_KEEP_EXTERNAL === 'true') {
      logger.warn(
        { host, port },
        'Using external Appium (APPIUM_KEEP_EXTERNAL=true) — it must export ANDROID_HOME',
      );
      return;
    }
    logger.warn(
      { host, port, ANDROID_HOME: sdkPath },
      'Restarting external Appium so ANDROID_HOME / ANDROID_SDK_ROOT are exported',
    );
    await stopListenersOnPort(port);
  }

  const { cmd, args } = resolveAppiumCommand();
  logger.info(
    { cmd, host, port, ANDROID_HOME: process.env.ANDROID_HOME },
    'Starting local Appium server',
  );

  const child = spawn(
    cmd,
    [...args, '--address', host, '--port', String(port), '--base-path', '/'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ANDROID_HOME: sdkPath,
        ANDROID_SDK_ROOT: sdkPath,
      },
    },
  );
  appiumProcess = child;

  child.stdout?.on('data', (chunk: Buffer) => {
    const line = chunk.toString().trim();
    if (line) logger.info({ appium: line }, 'appium');
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    const line = chunk.toString().trim();
    if (line) logger.warn({ appium: line }, 'appium');
  });
  child.on('exit', (code, signal) => {
    logger.warn({ code, signal }, 'Appium process exited');
    if (appiumProcess === child) {
      appiumProcess = null;
    }
  });

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await isAppiumUp()) {
      logger.info({ host, port }, 'Local Appium is ready');
      return;
    }
    if (child.exitCode !== null) {
      throw new Error(
        `Appium exited before becoming ready (code ${child.exitCode}). Install with: npm i -g appium && appium driver install uiautomator2`,
      );
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  throw new Error(
    `Appium did not become ready at http://${host}:${port} within 45s. Start it manually: appium --address ${host} --port ${port}`,
  );
}

/** Ping Appium; start or restart it with ANDROID_HOME exported. */
export async function ensureLocalAppium(): Promise<void> {
  if (!starting) {
    starting = startAppium().finally(() => {
      starting = null;
    });
  }
  await starting;
}

export async function assertAndroidDeviceOnline(deviceName: string): Promise<void> {
  try {
    const adbBin = process.env.ANDROID_HOME
      ? `${process.env.ANDROID_HOME}/platform-tools/adb`
      : 'adb';
    const { stdout } = await execFileAsync(adbBin, ['devices'], { timeout: 10_000 });
    const online = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('\tdevice') || /\tdevice$/.test(line));

    if (online.length === 0) {
      throw new Error(
        `No Android emulator/device is online (adb devices is empty). Start the AVD first, e.g. emulator -avd Pixel_8_Pro, then confirm: adb devices. Expected: ${deviceName}`,
      );
    }

    const serials = online.map((line) => line.split(/\s+/)[0] ?? '');
    if (deviceName && !serials.includes(deviceName)) {
      logger.warn(
        { deviceName, serials },
        'Requested Appium deviceName is not in adb devices; first online device will be used if Appium can match it',
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No Android')) {
      throw err;
    }
    throw new Error(
      `adb failed — is platform-tools on PATH and ANDROID_HOME set? ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
