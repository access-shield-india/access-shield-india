/**
 * Mobile Scanner Types
 *
 * Type definitions for the AccessShield India Mobile Accessibility Scanner.
 * Black-box APK/IPA analyzer using Appium for WCAG 2.2, IS 17802, and SEBI compliance.
 */

import type { IssueSeverity } from '@accessshield/types';

export type MobilePlatform = 'android' | 'ios';

export type MobileFramework =
  'react_native' | 'flutter' | 'native_android' | 'native_ios' | 'xamarin' | 'ionic' | 'unknown';

export type ComplianceStandard = 'WCAG22' | 'IS17802' | 'SEBI';

export interface LoginFlowConfig {
  username?: string;
  password?: string;
  usernameFieldId?: string;
  passwordFieldId?: string;
}

export interface MobileScanConfig {
  standards: ComplianceStandard[];
  osVersion?: string;
  deviceModel?: string;
  maxScreens: number;
  loginFlow?: LoginFlowConfig;
}

export interface MobileScanJobMessage {
  scanId: string;
  mobileScanId: string;
  mobileAppId: string;
  orgId: string;
  assetId: string;
  platform: MobilePlatform;
  apkS3Key?: string;
  ipaS3Key?: string;
  bundleId?: string;
  config: MobileScanConfig;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MobileElement {
  elementId: string;
  text: string | null;
  contentDesc: string | null;
  label: string | null;
  hint: string | null;
  role: string | null;
  bounds: ElementBounds;
  isClickable: boolean;
  isFocusable: boolean;
  isEnabled: boolean;
  isVisible: boolean;
  className: string | null;
  resourceId: string | null;
  children: MobileElement[];
}

export interface ScreenState {
  screenId: string;
  activityName: string | null;
  title: string | null;
  elements: MobileElement[];
  screenshotS3Key: string | null;
  timestamp: number;
}

export interface MobileViolation {
  ruleId: string;
  wcagCriterion: string;
  standard: ComplianceStandard;
  severity: IssueSeverity;
  description: string;
  screenTitle: string | null;
  screenActivity: string | null;
  screenshotS3Key: string | null;
  elementId: string | null;
  elementClass: string | null;
  elementResourceId: string | null;
  elementBounds: ElementBounds | null;
  helpUrl: string;
}

export interface TraversalGraph {
  [screenId: string]: string[];
}

export interface MobileScanResult {
  scanId: string;
  mobileScanId: string;
  orgId: string;
  screensDiscovered: number;
  screensScanned: number;
  violations: MobileViolation[];
  traversalGraph: TraversalGraph;
  totalDurationMs: number;
}

export interface MobileScanProgress {
  screensDiscovered: number;
  screensScanned: number;
  currentActivity: string | null;
  status: 'discovering' | 'scanning' | 'finalizing';
}

export interface BrowserStackAppUploadResponse {
  app_url: string;
  custom_id?: string;
  shareable_id?: string;
}

export interface BrowserStackCapabilities {
  platformName: string;
  'appium:app': string;
  'appium:deviceName': string;
  'appium:platformVersion': string;
  'appium:automationName': string;
  'appium:bundleId'?: string;
  'bstack:options': {
    projectName: string;
    buildName: string;
    sessionName: string;
    appiumVersion?: string;
    debug?: boolean;
    networkLogs?: boolean;
  };
}

export const DEFAULT_MOBILE_SCAN_CONFIG: Partial<MobileScanConfig> = {
  standards: ['WCAG22', 'IS17802'],
  maxScreens: 50,
};

export const DEFAULT_ANDROID_DEVICE = 'Samsung Galaxy S23';
export const DEFAULT_IOS_DEVICE = 'iPhone 15';
export const DEFAULT_ANDROID_VERSION = '13.0';
export const DEFAULT_IOS_VERSION = '17.0';
