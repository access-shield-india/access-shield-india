/**
 * Device Manager
 *
 * Manages Appium/BrowserStack session lifecycle for mobile app scanning.
 * Supports both BrowserStack App Automate (cloud) and local Appium (fallback).
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { remote, type Browser } from 'webdriverio';
import yauzl from 'yauzl';
import * as plist from 'plist';
import type {
  MobilePlatform,
  BrowserStackAppUploadResponse,
  BrowserStackCapabilities,
} from './types.js';
import {
  DEFAULT_ANDROID_DEVICE,
  DEFAULT_IOS_DEVICE,
  DEFAULT_ANDROID_VERSION,
  DEFAULT_IOS_VERSION,
} from './types.js';
import { downloadAppFile, getPresignedAppUrl, uploadScreenshot } from './s3-client.js';
import { ensureAndroidSdkEnv, listOnlineAdbSerials, readAdbOsVersion } from './lib/android-env.js';
import {
  assertAndroidDeviceOnline,
  ensureLocalAppium,
  getAppiumHost,
  getAppiumPort,
} from './lib/appium.js';
import { resolveLocalAppPath } from './lib/paths.js';
import { logger } from './lib/logger.js';

const BROWSERSTACK_HUB_URL = 'https://hub.browserstack.com/wd/hub';
const BROWSERSTACK_UPLOAD_URL = 'https://api-cloud.browserstack.com/app-automate/upload';

/**
 * Extract bundleId from an IPA file buffer.
 * IPA files are ZIP archives containing an Info.plist inside Payload/*.app/
 */
export async function extractBundleIdFromIpa(ipaBuffer: Buffer): Promise<string | null> {
  return new Promise((resolve) => {
    yauzl.fromBuffer(
      ipaBuffer,
      { lazyEntries: true },
      (err: Error | null, zipfile: yauzl.ZipFile | undefined) => {
        if (err || !zipfile) {
          logger.warn({ err }, 'Failed to open IPA as ZIP');
          resolve(null);
          return;
        }

        let foundBundleId: string | null = null;

        zipfile.on('entry', (entry: yauzl.Entry) => {
          const isInfoPlist = /^Payload\/[^/]+\.app\/Info\.plist$/.test(entry.fileName);

          if (isInfoPlist) {
            zipfile.openReadStream(
              entry,
              (readErr: Error | null, readStream: NodeJS.ReadableStream | undefined) => {
                if (readErr || !readStream) {
                  zipfile.readEntry();
                  return;
                }

                const chunks: Buffer[] = [];
                readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
                readStream.on('end', () => {
                  try {
                    const plistData = Buffer.concat(chunks);
                    const parsed = plist.parse(plistData.toString('utf8')) as Record<
                      string,
                      unknown
                    >;
                    const bundleId = parsed['CFBundleIdentifier'];

                    if (typeof bundleId === 'string') {
                      foundBundleId = bundleId;
                      logger.info({ bundleId }, 'Extracted bundleId from IPA');
                    }
                  } catch (parseErr) {
                    logger.warn({ parseErr }, 'Failed to parse Info.plist from IPA');
                  }
                  zipfile.close();
                });
              },
            );
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          resolve(foundBundleId);
        });

        zipfile.on('error', (zipErr: Error) => {
          logger.warn({ zipErr }, 'ZIP error while reading IPA');
          resolve(null);
        });

        zipfile.readEntry();
      },
    );
  });
}

export interface CreateSessionParams {
  platform: MobilePlatform;
  appS3Key: string;
  osVersion?: string;
  deviceModel?: string;
  bundleId?: string;
  scanId: string;
  mobileAppId: string;
}

export class DeviceManager {
  private useBrowserStack: boolean;
  private browserStackUsername: string | undefined;
  private browserStackAccessKey: string | undefined;

  constructor() {
    this.browserStackUsername = process.env.BROWSERSTACK_USERNAME;
    this.browserStackAccessKey = process.env.BROWSERSTACK_ACCESS_KEY;
    this.useBrowserStack = !!(this.browserStackUsername && this.browserStackAccessKey);

    if (this.useBrowserStack) {
      logger.info('DeviceManager: Using BrowserStack App Automate');
    } else {
      logger.info('DeviceManager: Using local Appium (BrowserStack credentials not set)');
      try {
        ensureAndroidSdkEnv();
      } catch (err) {
        logger.warn(
          { err },
          'Android SDK env not ready at startup — will retry on the first local scan',
        );
      }
    }
  }

  async createSession(params: CreateSessionParams): Promise<Browser> {
    if (this.useBrowserStack) {
      return this.createBrowserStackSession(params);
    }

    return this.createLocalAppiumSession(params);
  }

  private async createBrowserStackSession(params: CreateSessionParams): Promise<Browser> {
    const { platform, appS3Key, osVersion, deviceModel, bundleId, scanId, mobileAppId } = params;

    const isLocalApp = appS3Key.startsWith('local:');
    const { bsAppUrl, extractedBundleId } = isLocalApp
      ? await this.uploadLocalAppToBrowserStack(appS3Key, platform)
      : await this.uploadS3AppToBrowserStack(appS3Key, platform);

    const deviceName =
      deviceModel ?? (platform === 'android' ? DEFAULT_ANDROID_DEVICE : DEFAULT_IOS_DEVICE);
    const platformVersion =
      osVersion ?? (platform === 'android' ? DEFAULT_ANDROID_VERSION : DEFAULT_IOS_VERSION);

    const capabilities: BrowserStackCapabilities & Record<string, unknown> = {
      platformName: platform === 'android' ? 'android' : 'ios',
      'appium:app': bsAppUrl,
      'appium:deviceName': deviceName,
      'appium:platformVersion': platformVersion,
      'appium:automationName': platform === 'android' ? 'UiAutomator2' : 'XCUITest',
      'bstack:options': {
        projectName: 'AccessShield Mobile Scan',
        buildName: scanId,
        sessionName: mobileAppId,
        appiumVersion: '2.4.1',
        debug: true,
        networkLogs: true,
      },
    };

    if (platform === 'ios') {
      const resolvedBundleId = bundleId || extractedBundleId;
      if (resolvedBundleId) {
        capabilities['appium:bundleId'] = resolvedBundleId;
        logger.info({ bundleId: resolvedBundleId }, 'iOS bundleId configured');
      } else {
        logger.warn(
          'No bundleId available for iOS app — Appium may fail to locate app after install',
        );
      }
    }

    logger.info({ platform, deviceName, platformVersion, scanId }, 'Creating BrowserStack session');

    const driver = await remote({
      protocol: 'https',
      hostname: 'hub.browserstack.com',
      port: 443,
      path: '/wd/hub',
      user: this.browserStackUsername,
      key: this.browserStackAccessKey,
      capabilities: capabilities as WebdriverIO.Capabilities,
      connectionRetryTimeout: 180000,
      connectionRetryCount: 3,
    });

    logger.info({ sessionId: driver.sessionId }, 'BrowserStack session created');
    return driver;
  }

  private async uploadS3AppToBrowserStack(
    appS3Key: string,
    platform: MobilePlatform,
  ): Promise<{ bsAppUrl: string; extractedBundleId: string | null }> {
    const presignedUrl = await getPresignedAppUrl(appS3Key);
    const bsAppUrl = await this.uploadToBrowserStackFromUrl(presignedUrl);

    let extractedBundleId: string | null = null;

    if (platform === 'ios') {
      try {
        const response = await fetch(presignedUrl);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          extractedBundleId = await extractBundleIdFromIpa(buffer);
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to extract bundleId from S3 IPA');
      }
    }

    return { bsAppUrl, extractedBundleId };
  }

  private browserStackAuthHeader(): string {
    return `Basic ${Buffer.from(
      `${this.browserStackUsername}:${this.browserStackAccessKey}`,
    ).toString('base64')}`;
  }

  private async parseBrowserStackUploadResponse(response: Response): Promise<string> {
    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'BrowserStack app upload failed');
      throw new Error(`BrowserStack upload failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as BrowserStackAppUploadResponse;
    logger.info({ appUrl: data.app_url }, 'App uploaded to BrowserStack');
    return data.app_url;
  }

  private async uploadLocalAppToBrowserStack(
    appS3Key: string,
    platform: MobilePlatform,
  ): Promise<{ bsAppUrl: string; extractedBundleId: string | null }> {
    const localPath = resolveLocalAppPath(appS3Key);
    if (!existsSync(localPath)) {
      const fileType = platform === 'ios' ? 'IPA' : 'APK';
      throw new Error(`Local ${fileType} not found: ${localPath}`);
    }

    const fileType = platform === 'ios' ? 'IPA' : 'APK';
    logger.info({ localPath, platform }, `Uploading local ${fileType} file to BrowserStack...`);

    const fileBuffer = readFileSync(localPath);

    let extractedBundleId: string | null = null;
    if (platform === 'ios') {
      extractedBundleId = await extractBundleIdFromIpa(fileBuffer);
    }

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    formData.append('file', blob, basename(localPath));

    const response = await fetch(BROWSERSTACK_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: this.browserStackAuthHeader(),
      },
      body: formData,
    });

    const bsAppUrl = await this.parseBrowserStackUploadResponse(response);
    return { bsAppUrl, extractedBundleId };
  }

  private async uploadToBrowserStackFromUrl(appUrl: string): Promise<string> {
    logger.info('Uploading app to BrowserStack from URL...');

    const response = await fetch(BROWSERSTACK_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: this.browserStackAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: appUrl }),
    });

    return this.parseBrowserStackUploadResponse(response);
  }

  private async resolveLocalSessionAppPath(
    appS3Key: string,
    platform: MobilePlatform,
  ): Promise<string> {
    if (appS3Key.startsWith('local:')) {
      const localPath = resolveLocalAppPath(appS3Key);
      if (!existsSync(localPath)) {
        throw new Error(`Local ${platform === 'ios' ? 'IPA' : 'APK'} not found: ${localPath}`);
      }
      return localPath;
    }

    if (existsSync(appS3Key)) {
      return appS3Key;
    }

    const buffer = await downloadAppFile(appS3Key);
    const dir = await mkdtemp(join(tmpdir(), 'as-mobile-'));
    const dest = join(dir, platform === 'ios' ? 'app.ipa' : 'app.apk');
    await writeFile(dest, buffer);
    logger.info({ dest, appS3Key }, 'Downloaded app from object storage for local Appium');
    return dest;
  }

  private async createLocalAppiumSession(params: CreateSessionParams): Promise<Browser> {
    const { platform, appS3Key, osVersion, deviceModel, bundleId } = params;

    if (platform === 'android') {
      ensureAndroidSdkEnv();
    }

    await ensureLocalAppium();

    const onlineSerials = platform === 'android' ? listOnlineAdbSerials() : [];
    const deviceName =
      deviceModel ??
      onlineSerials[0] ??
      (platform === 'android' ? 'emulator-5554' : 'iPhone 15 Simulator');

    if (platform === 'android') {
      await assertAndroidDeviceOnline(deviceName);
    }

    const appPath = await this.resolveLocalSessionAppPath(appS3Key, platform);

    // Local Appium must match the connected emulator. Hardcoded 13.0 fails on Android 17 AVDs.
    let platformVersion = osVersion;
    if (platform === 'android') {
      const liveVersion = readAdbOsVersion(deviceName);
      if (liveVersion) {
        if (platformVersion && platformVersion !== liveVersion) {
          logger.warn(
            { requested: platformVersion, liveVersion, deviceName },
            'Ignoring requested OS version — using the connected emulator version',
          );
        }
        platformVersion = liveVersion;
      }
    } else if (!platformVersion) {
      platformVersion = DEFAULT_IOS_VERSION;
    }

    const capabilities: WebdriverIO.Capabilities & Record<string, unknown> = {
      'appium:platformName': platform === 'android' ? 'Android' : 'iOS',
      'appium:deviceName': deviceName,
      'appium:automationName': platform === 'android' ? 'UiAutomator2' : 'XCUITest',
      'appium:app': appPath,
      'appium:newCommandTimeout': 300,
      'appium:noReset': false,
    };

    if (platformVersion) {
      capabilities['appium:platformVersion'] = platformVersion;
    }
    if (platform === 'android') {
      capabilities['appium:udid'] = deviceName;
    }

    if (platform === 'android') {
      capabilities['appium:autoGrantPermissions'] = true;
    }

    if (platform === 'ios') {
      let resolvedBundleId = bundleId;

      if (!resolvedBundleId && existsSync(appPath)) {
        const ipaBuffer = readFileSync(appPath);
        resolvedBundleId = (await extractBundleIdFromIpa(ipaBuffer)) ?? undefined;
      }

      if (resolvedBundleId) {
        capabilities['appium:bundleId'] = resolvedBundleId;
      }

      capabilities['appium:wdaLaunchTimeout'] = 120000;
      capabilities['appium:wdaConnectionTimeout'] = 120000;
      capabilities['appium:useNewWDA'] = false;
      capabilities['appium:shouldUseSingletonTestManager'] = false;
    }

    logger.info(
      { platform, deviceName, platformVersion, appPath },
      'Creating local Appium session',
    );

    const driver = await remote({
      protocol: 'http',
      hostname: getAppiumHost(),
      port: getAppiumPort(),
      path: '/',
      capabilities,
      connectionRetryTimeout: 120000,
      connectionRetryCount: 3,
    });

    logger.info({ sessionId: driver.sessionId }, 'Local Appium session created');
    return driver;
  }

  async closeSession(driver: Browser): Promise<void> {
    try {
      if (driver && driver.sessionId) {
        await driver.deleteSession();
        logger.info({ sessionId: driver.sessionId }, 'Session closed');
      }
    } catch (err) {
      logger.warn({ err }, 'Error closing session');
    }
  }

  async takeScreenshot(
    driver: Browser,
    scanId: string,
    screenId: string,
    orgId: string,
  ): Promise<string | null> {
    try {
      const base64Screenshot = await driver.takeScreenshot();
      const buffer = Buffer.from(base64Screenshot, 'base64');
      const s3Key = await uploadScreenshot(buffer, scanId, screenId, orgId);
      return s3Key;
    } catch (err) {
      logger.error({ err, scanId, screenId }, 'Failed to capture screenshot');
      return null;
    }
  }

  isUsingBrowserStack(): boolean {
    return this.useBrowserStack;
  }
}

export const deviceManager = new DeviceManager();
