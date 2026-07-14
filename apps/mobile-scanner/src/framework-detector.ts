/**
 * Framework Detector
 *
 * Detects the mobile app framework to provide better rule guidance in
 * violation descriptions and AI fix suggestions.
 */

import type { Browser } from 'webdriverio';
import type { MobilePlatform, MobileFramework } from './types.js';
import { IOSHandler } from './ios-handler.js';
import { logger } from './lib/logger.js';

/**
 * Detect the app framework from page source heuristics.
 * Results feed into AI fix suggestions (different fix patterns for
 * React Native vs Flutter vs native Android/iOS).
 */
export async function detectFramework(
  driver: Browser,
  platform: MobilePlatform,
): Promise<MobileFramework> {
  try {
    if (platform === 'ios') {
      return IOSHandler.detectFramework(driver);
    }

    return detectAndroidFramework(driver);
  } catch (err) {
    logger.warn({ err, platform }, 'Framework detection failed');
    return 'unknown';
  }
}

/**
 * Android-specific framework detection heuristics.
 */
async function detectAndroidFramework(driver: Browser): Promise<MobileFramework> {
  try {
    const source = await driver.getPageSource();

    if (
      source.includes('RCTRootView') ||
      source.includes('.react.') ||
      source.includes('ReactRootView') ||
      source.includes('com.facebook.react')
    ) {
      logger.info('Detected framework: React Native (Android)');
      return 'react_native';
    }

    if (
      source.includes('io.flutter') ||
      source.includes('FlutterView') ||
      source.includes('FlutterEngine') ||
      /resource-id="[^"]*flutter[^"]*"/.test(source)
    ) {
      logger.info('Detected framework: Flutter (Android)');
      return 'flutter';
    }

    if (source.includes('com.microsoft.maui') || source.includes('Xamarin.Forms')) {
      logger.info('Detected framework: Xamarin/MAUI (Android)');
      return 'xamarin';
    }

    if (
      source.includes('io.ionic') ||
      source.includes('cordova') ||
      source.includes('capacitor') ||
      source.includes('org.chromium.content')
    ) {
      logger.info('Detected framework: Ionic/Cordova (Android)');
      return 'ionic';
    }

    const isNativeAndroid =
      source.includes('android.widget.') ||
      source.includes('android.view.') ||
      source.includes('androidx.');

    const hasNoHybridMarkers =
      !source.includes('WebView') || (source.match(/WebView/g) || []).length < 3;

    if (isNativeAndroid && hasNoHybridMarkers) {
      logger.info('Detected framework: Native Android');
      return 'native_android';
    }

    logger.info('Framework detection: unknown');
    return 'unknown';
  } catch (err) {
    logger.warn({ err }, 'Android framework detection failed');
    return 'unknown';
  }
}

/**
 * Get framework-specific fix guidance for AI remediation.
 */
export function getFrameworkFixGuidance(framework: MobileFramework): FrameworkGuidance {
  const guidance: Record<MobileFramework, FrameworkGuidance> = {
    react_native: {
      contentDescriptionFix:
        'Add accessibilityLabel prop to the component: <TouchableOpacity accessibilityLabel="descriptive label">',
      touchTargetFix:
        'Increase hitSlop prop or adjust style: hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}',
      accessibleFix: 'Set accessible={true} and accessibilityRole for the container.',
      importStatement: "import { AccessibilityInfo } from 'react-native';",
    },
    flutter: {
      contentDescriptionFix:
        'Wrap with Semantics widget: Semantics(label: "descriptive label", child: widget)',
      touchTargetFix:
        'Wrap with SizedBox: SizedBox(height: 48, width: 48, child: widget) or use MaterialTapTargetSize.padded',
      accessibleFix:
        'Use ExcludeSemantics(excluding: false) or MergeSemantics for proper grouping.',
      importStatement: "import 'package:flutter/semantics.dart';",
    },
    native_android: {
      contentDescriptionFix:
        'Add android:contentDescription="descriptive label" in XML or setContentDescription() in code.',
      touchTargetFix: 'Set android:minHeight="48dp" android:minWidth="48dp" or use TouchDelegate.',
      accessibleFix: 'Set android:importantForAccessibility="yes" and android:focusable="true".',
      importStatement: 'N/A',
    },
    native_ios: {
      contentDescriptionFix:
        'Set accessibilityLabel property: element.accessibilityLabel = "descriptive label"',
      touchTargetFix:
        'Ensure frame is at least 44x44pt or override point(inside:with:) for larger hit area.',
      accessibleFix: 'Set isAccessibilityElement = true and appropriate accessibilityTraits.',
      importStatement: 'import UIKit',
    },
    xamarin: {
      contentDescriptionFix:
        'Use AutomationProperties.Name: AutomationProperties.SetName(element, "label")',
      touchTargetFix:
        'Set HeightRequest="48" WidthRequest="48" or use MinimumHeightRequest/MinimumWidthRequest.',
      accessibleFix: 'Set AutomationProperties.IsInAccessibleTree="True".',
      importStatement: 'using Xamarin.Forms;',
    },
    ionic: {
      contentDescriptionFix:
        'Add aria-label attribute: <ion-button aria-label="descriptive label">',
      touchTargetFix: 'Use CSS: min-height: 44px; min-width: 44px; or Ionic button sizing.',
      accessibleFix: 'Add role and aria-* attributes for semantic meaning.',
      importStatement: "import { AccessibilityModule } from '@ionic/angular';",
    },
    unknown: {
      contentDescriptionFix: 'Add a text alternative/label to describe the element purpose.',
      touchTargetFix: 'Ensure touch targets are at least 44x44dp (iOS) or 48x48dp (Android).',
      accessibleFix: 'Mark the element as accessible to screen readers.',
      importStatement: 'N/A',
    },
  };

  return guidance[framework];
}

export interface FrameworkGuidance {
  contentDescriptionFix: string;
  touchTargetFix: string;
  accessibleFix: string;
  importStatement: string;
}
