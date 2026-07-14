/**
 * iOS Handler
 *
 * iOS-specific WebdriverIO operations that differ from Android.
 * Handles navigation, element attribute extraction, and framework detection.
 */

import type { Browser } from 'webdriverio';
import type { MobileElement, MobileFramework, ElementBounds } from './types.js';
import type { XmlNode } from './xml-parser.js';
import { logger } from './lib/logger.js';

const BACK_BUTTON_PATTERNS = ['back', 'Back', 'Cancel', '<', '‹', 'chevron.left'];
const SWIPE_BACK_DURATION_MS = 300;

export class IOSHandler {
  /**
   * Get the screen title from the navigation bar or first prominent text element.
   */
  static async getScreenTitle(driver: Browser): Promise<string | null> {
    try {
      const navBar = await driver.$('//XCUIElementTypeNavigationBar');
      if (await navBar.isExisting()) {
        const label = await navBar.getAttribute('label');
        if (label && label.trim()) {
          return label.trim();
        }

        const titleElement = await navBar.$('.//XCUIElementTypeStaticText');
        if (await titleElement.isExisting()) {
          const titleText = await titleElement.getAttribute('label');
          if (titleText && titleText.trim()) {
            return titleText.trim();
          }
        }
      }

      const staticTexts = await driver.$$('//XCUIElementTypeStaticText');
      let bestCandidate: { text: string; y: number; height: number } | null = null;

      for (const el of staticTexts.slice(0, 10)) {
        try {
          const label = await el.getAttribute('label');
          const yStr = await el.getAttribute('y');
          const heightStr = await el.getAttribute('height');

          if (!label || !label.trim()) continue;

          const y = parseInt(yStr || '9999', 10);
          const height = parseInt(heightStr || '0', 10);

          if (y < 200 && height > 16) {
            if (!bestCandidate || height > bestCandidate.height) {
              bestCandidate = { text: label.trim(), y, height };
            }
          }
        } catch {
          continue;
        }
      }

      return bestCandidate?.text || null;
    } catch (err) {
      logger.debug({ err }, 'Failed to get iOS screen title');
      return null;
    }
  }

  /**
   * Navigate back on iOS using multiple strategies.
   * Returns true if navigation succeeded, false if all strategies failed.
   */
  static async navigateBack(driver: Browser): Promise<boolean> {
    if (await this.tryTapBackButton(driver)) {
      return true;
    }

    if (await this.trySwipeBack(driver)) {
      return true;
    }

    if (await this.tryTapLeftmostNavBarButton(driver)) {
      return true;
    }

    logger.debug('All iOS back navigation strategies failed');
    return false;
  }

  /**
   * Strategy 1: Find and tap a back button by common patterns.
   */
  private static async tryTapBackButton(driver: Browser): Promise<boolean> {
    try {
      for (const pattern of BACK_BUTTON_PATTERNS) {
        const backButton = await driver.$(
          `//XCUIElementTypeNavigationBar//XCUIElementTypeButton[` +
            `contains(@name, "${pattern}") or contains(@label, "${pattern}")]`,
        );

        if (await backButton.isExisting()) {
          await backButton.click();
          logger.debug({ pattern }, 'iOS back: tapped button matching pattern');
          return true;
        }
      }

      const anyBackButton = await driver.$(
        '//XCUIElementTypeButton[' +
          'contains(@name, "back") or contains(@name, "Back") or ' +
          'contains(@label, "back") or contains(@label, "Back")]',
      );

      if (await anyBackButton.isExisting()) {
        await anyBackButton.click();
        logger.debug('iOS back: tapped generic back button');
        return true;
      }

      return false;
    } catch (err) {
      logger.debug({ err }, 'iOS back strategy 1 (tap back button) failed');
      return false;
    }
  }

  /**
   * Strategy 2: Swipe from left edge to go back (iOS gesture).
   */
  private static async trySwipeBack(driver: Browser): Promise<boolean> {
    try {
      const { width, height } = await driver.getWindowRect();
      const startX = Math.floor(width * 0.05);
      const endX = Math.floor(width * 0.6);
      const y = Math.floor(height / 2);

      await driver
        .action('pointer', { parameters: { pointerType: 'touch' } })
        .move({ x: startX, y, duration: 0 })
        .down()
        .move({ x: endX, y, duration: SWIPE_BACK_DURATION_MS })
        .up()
        .perform();

      logger.debug('iOS back: performed swipe gesture');
      return true;
    } catch (err) {
      logger.debug({ err }, 'iOS back strategy 2 (swipe) failed');
      return false;
    }
  }

  /**
   * Strategy 3: Tap the leftmost button in the navigation bar.
   */
  private static async tryTapLeftmostNavBarButton(driver: Browser): Promise<boolean> {
    try {
      const navBar = await driver.$('//XCUIElementTypeNavigationBar');
      if (!(await navBar.isExisting())) {
        return false;
      }

      const buttons = await navBar.$$('.//XCUIElementTypeButton');
      if (buttons.length === 0) {
        return false;
      }

      let leftmostButton: WebdriverIO.Element | null = null;
      let minX = Infinity;

      for (const btn of buttons) {
        try {
          const xStr = await btn.getAttribute('x');
          const x = parseInt(xStr || '9999', 10);
          if (x < minX) {
            minX = x;
            leftmostButton = btn;
          }
        } catch {
          continue;
        }
      }

      if (leftmostButton && minX < 100) {
        await leftmostButton.click();
        logger.debug({ x: minX }, 'iOS back: tapped leftmost nav bar button');
        return true;
      }

      return false;
    } catch (err) {
      logger.debug({ err }, 'iOS back strategy 3 (leftmost nav button) failed');
      return false;
    }
  }

  /**
   * Detect the app framework from page source.
   */
  static async detectFramework(driver: Browser): Promise<MobileFramework> {
    try {
      const source = await driver.getPageSource();

      if (source.includes('ReactNative') || source.includes('RCT') || source.includes('RNS')) {
        return 'react_native';
      }

      if (
        source.includes('FlutterView') ||
        source.includes('FlutterViewController') ||
        source.includes('flutter')
      ) {
        return 'flutter';
      }

      if (source.includes('Xamarin') || source.includes('MonoTouch')) {
        return 'xamarin';
      }

      if (
        source.includes('Ionic') ||
        source.includes('CordovaLib') ||
        source.includes('Capacitor')
      ) {
        return 'ionic';
      }

      const hasOnlyXCUIElements = /XCUIElementType[A-Z]/.test(source) && !source.includes('React');
      if (hasOnlyXCUIElements) {
        return 'native_ios';
      }

      return 'unknown';
    } catch (err) {
      logger.warn({ err }, 'Failed to detect iOS framework');
      return 'unknown';
    }
  }

  /**
   * Extract iOS-specific element attributes from an XML node.
   * Maps iOS accessibility attributes to the MobileElement interface.
   */
  static getElementAttributes(xmlNode: XmlNode): Partial<MobileElement> {
    const attrs = xmlNode.attributes;

    const xcuiType = attrs['@_type'] || '';
    const role = this.mapElementRole(xcuiType);

    const x = parseInt(attrs['@_x'] || '0', 10) || 0;
    const y = parseInt(attrs['@_y'] || '0', 10) || 0;
    const width = parseInt(attrs['@_width'] || '0', 10) || 0;
    const height = parseInt(attrs['@_height'] || '0', 10) || 0;

    const bounds: ElementBounds = { x, y, width, height };

    const isAccessible = attrs['@_accessible'] === 'true';

    return {
      label: attrs['@_label'] || attrs['@_name'] || null,
      hint: attrs['@_hint'] || null,
      text: attrs['@_value'] || attrs['@_label'] || null,
      contentDesc: null,
      role,
      className: xcuiType,
      resourceId: attrs['@_name'] || attrs['@_identifier'] || null,
      isEnabled: attrs['@_enabled'] !== 'false',
      isVisible: attrs['@_visible'] !== 'false',
      isFocusable: isAccessible,
      isClickable: isAccessible || this.isInherentlyClickable(xcuiType),
      bounds,
    };
  }

  /**
   * Map XCUIElementType to semantic role names.
   */
  static mapElementRole(xcuiType: string): string {
    const roleMap: Record<string, string> = {
      XCUIElementTypeButton: 'button',
      XCUIElementTypeTextField: 'textfield',
      XCUIElementTypeSecureTextField: 'textfield',
      XCUIElementTypeTextView: 'textbox',
      XCUIElementTypeStaticText: 'text',
      XCUIElementTypeCell: 'listitem',
      XCUIElementTypeTable: 'list',
      XCUIElementTypeCollectionView: 'list',
      XCUIElementTypeSwitch: 'switch',
      XCUIElementTypeSlider: 'slider',
      XCUIElementTypeImage: 'image',
      XCUIElementTypeLink: 'link',
      XCUIElementTypeNavigationBar: 'navigation',
      XCUIElementTypeTabBar: 'tablist',
      XCUIElementTypeTab: 'tab',
      XCUIElementTypeToolbar: 'toolbar',
      XCUIElementTypePicker: 'combobox',
      XCUIElementTypePickerWheel: 'listbox',
      XCUIElementTypeProgressIndicator: 'progressbar',
      XCUIElementTypeActivityIndicator: 'progressbar',
      XCUIElementTypeAlert: 'alertdialog',
      XCUIElementTypeSheet: 'dialog',
      XCUIElementTypePopover: 'dialog',
      XCUIElementTypeScrollView: 'region',
      XCUIElementTypeSegmentedControl: 'tablist',
      XCUIElementTypeCheckBox: 'checkbox',
      XCUIElementTypeRadioButton: 'radio',
      XCUIElementTypeSearchField: 'searchbox',
      XCUIElementTypeDatePicker: 'datepicker',
      XCUIElementTypeApplication: 'application',
      XCUIElementTypeWindow: 'window',
      XCUIElementTypeOther: 'generic',
      XCUIElementTypeGroup: 'group',
      XCUIElementTypeMenu: 'menu',
      XCUIElementTypeMenuItem: 'menuitem',
      XCUIElementTypeWebView: 'webview',
    };

    if (roleMap[xcuiType]) {
      return roleMap[xcuiType]!;
    }

    const stripped = xcuiType.replace('XCUIElementType', '');
    return stripped ? stripped.toLowerCase() : 'generic';
  }

  /**
   * Check if an iOS element type is inherently clickable.
   */
  private static isInherentlyClickable(elementType: string): boolean {
    const clickableTypes = [
      'XCUIElementTypeButton',
      'XCUIElementTypeLink',
      'XCUIElementTypeCell',
      'XCUIElementTypeTab',
      'XCUIElementTypeSwitch',
      'XCUIElementTypeMenuItem',
      'XCUIElementTypeSegmentedControl',
    ];

    return clickableTypes.includes(elementType);
  }

  /**
   * Get accessibility traits from iOS element.
   * Useful for understanding how VoiceOver interprets the element.
   */
  static parseAccessibilityTraits(traitsStr: string | undefined): string[] {
    if (!traitsStr) return [];

    const traits: string[] = [];
    const traitsLower = traitsStr.toLowerCase();

    if (traitsLower.includes('button')) traits.push('button');
    if (traitsLower.includes('link')) traits.push('link');
    if (traitsLower.includes('header')) traits.push('header');
    if (traitsLower.includes('image')) traits.push('image');
    if (traitsLower.includes('selected')) traits.push('selected');
    if (traitsLower.includes('adjustable')) traits.push('adjustable');
    if (traitsLower.includes('statictext')) traits.push('staticText');
    if (traitsLower.includes('searchfield')) traits.push('searchField');
    if (traitsLower.includes('playsound')) traits.push('playsSound');
    if (traitsLower.includes('startsmedial')) traits.push('startsMedia');
    if (traitsLower.includes('allowsdirectinteraction')) traits.push('allowsDirectInteraction');
    if (traitsLower.includes('causespageturns')) traits.push('causesPageTurn');
    if (traitsLower.includes('notapplicable')) traits.push('notEnabled');

    return traits;
  }
}
