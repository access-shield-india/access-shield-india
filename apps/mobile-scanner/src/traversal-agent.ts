/**
 * Screen Traversal Agent
 *
 * Core algorithm that discovers all screens of a mobile app without a URL map.
 * Uses BFS traversal to systematically explore navigation paths and capture
 * screen states for accessibility analysis.
 */

import { createHash } from 'crypto';
import type { Browser } from 'webdriverio';
import type pino from 'pino';
import type {
  MobilePlatform,
  MobileElement,
  ScreenState,
  TraversalGraph,
  ElementBounds,
} from './types.js';
import { parseAppiumXml, parseElementTree, flattenElementTree } from './xml-parser.js';
import { uploadScreenshot } from './s3-client.js';
import { IOSHandler } from './ios-handler.js';
import { logger as defaultLogger } from './lib/logger.js';

const UI_SETTLE_DELAY_MS = 1500;
const BACK_NAVIGATION_DELAY_MS = 1000;
const MAX_TRAVERSAL_DEPTH = 15;
const MAX_NAV_ELEMENTS_PER_SCREEN = 15;
const MIN_TAP_TARGET_SIZE = 48;

interface QueueItem {
  screenState: ScreenState;
  depth: number;
  parentScreenId: string | null;
}

export class TraversalAgent {
  private driver: Browser;
  private platform: MobilePlatform;
  private scanId: string;
  private orgId: string;
  private maxScreens: number;
  private bundleId: string | null;
  private logger: pino.Logger;

  private visitedScreenIds: Set<string>;
  private screenGraph: Map<string, Set<string>>;
  private discoveredScreens: Map<string, ScreenState>;
  private tappedElementsPerScreen: Map<string, Set<string>>;
  private homeScreenId: string | null = null;

  constructor(
    driver: Browser,
    platform: MobilePlatform,
    scanId: string,
    orgId: string,
    maxScreens: number,
    bundleId?: string,
    logger?: pino.Logger,
  ) {
    this.driver = driver;
    this.platform = platform;
    this.scanId = scanId;
    this.orgId = orgId;
    this.maxScreens = maxScreens;
    this.bundleId = bundleId ?? null;
    this.logger = logger ?? defaultLogger;

    this.visitedScreenIds = new Set();
    this.screenGraph = new Map();
    this.discoveredScreens = new Map();
    this.tappedElementsPerScreen = new Map();
  }

  /**
   * Main traversal method using BFS to explore all reachable screens.
   */
  async traverse(): Promise<ScreenState[]> {
    this.logger.info(
      { scanId: this.scanId, maxScreens: this.maxScreens },
      'Starting screen traversal',
    );

    try {
      const initialScreen = await this.captureInitialScreen();
      if (!initialScreen) {
        this.logger.error({ scanId: this.scanId }, 'Failed to capture initial screen');
        return [];
      }

      this.homeScreenId = initialScreen.screenId;

      const queue: QueueItem[] = [{ screenState: initialScreen, depth: 0, parentScreenId: null }];

      while (queue.length > 0 && this.visitedScreenIds.size < this.maxScreens) {
        const current = queue.shift()!;
        const { screenState, depth, parentScreenId } = current;

        if (depth > MAX_TRAVERSAL_DEPTH) {
          this.logger.debug(
            { screenId: screenState.screenId, depth },
            'Skipping screen: max depth reached',
          );
          continue;
        }

        if (parentScreenId) {
          this.addEdge(parentScreenId, screenState.screenId);
        }

        const navElements = await this.findNavigationElements(screenState);

        this.logger.debug(
          {
            screenId: screenState.screenId,
            navElementCount: navElements.length,
            depth,
            visited: this.visitedScreenIds.size,
          },
          'Processing screen',
        );

        for (const navElement of navElements) {
          if (this.visitedScreenIds.size >= this.maxScreens) {
            break;
          }

          if (this.hasElementBeenTapped(screenState.screenId, navElement.elementId)) {
            continue;
          }

          this.markElementTapped(screenState.screenId, navElement.elementId);

          const newScreen = await this.tapAndCaptureNewScreen(navElement, screenState.screenId);

          if (newScreen && !this.visitedScreenIds.has(newScreen.screenId)) {
            this.visitedScreenIds.add(newScreen.screenId);
            this.discoveredScreens.set(newScreen.screenId, newScreen);

            queue.push({
              screenState: newScreen,
              depth: depth + 1,
              parentScreenId: screenState.screenId,
            });

            this.logger.info(
              {
                newScreenId: newScreen.screenId,
                activity: newScreen.activityName,
                totalDiscovered: this.discoveredScreens.size,
              },
              'Discovered new screen',
            );
          }

          const didNavigateBack = await this.handleNavigationBack(screenState.screenId);
          if (!didNavigateBack) {
            this.logger.warn(
              { expectedScreenId: screenState.screenId },
              'Navigation back failed, restarting from home',
            );
            await this.restartFromHome();
            break;
          }
        }
      }

      this.logger.info(
        {
          scanId: this.scanId,
          totalScreens: this.discoveredScreens.size,
          graphNodes: this.screenGraph.size,
        },
        'Screen traversal completed',
      );

      return Array.from(this.discoveredScreens.values());
    } catch (err) {
      this.logger.error({ err, scanId: this.scanId }, 'Traversal failed');
      return Array.from(this.discoveredScreens.values());
    }
  }

  /**
   * Capture the initial screen state after app launch.
   */
  private async captureInitialScreen(): Promise<ScreenState | null> {
    await this.driver.pause(UI_SETTLE_DELAY_MS * 2);

    const screenState = await this.getScreenState();
    if (!screenState) {
      return null;
    }

    this.visitedScreenIds.add(screenState.screenId);
    this.discoveredScreens.set(screenState.screenId, screenState);

    this.logger.info(
      {
        screenId: screenState.screenId,
        activity: screenState.activityName,
        elementCount: flattenElementTree(screenState.elements[0] ?? ({} as MobileElement)).length,
      },
      'Captured initial screen',
    );

    return screenState;
  }

  /**
   * Get the current screen state including element tree and screenshot.
   */
  async getScreenState(): Promise<ScreenState | null> {
    try {
      const xml = await this.driver.getPageSource();
      const rootNode = parseAppiumXml(xml);

      if (!rootNode) {
        this.logger.warn('Failed to parse page source XML');
        return null;
      }

      const elementTree = parseElementTree(rootNode, this.platform);
      const screenId = this.generateScreenId(elementTree);
      const activityName = await this.getActivityName();
      const title = this.extractScreenTitle(elementTree);
      const screenshotS3Key = await this.captureScreenshot(screenId);

      return {
        screenId,
        activityName,
        title,
        elements: [elementTree],
        screenshotS3Key,
        timestamp: Date.now(),
      };
    } catch (err) {
      this.logger.error({ err }, 'Failed to get screen state');
      return null;
    }
  }

  /**
   * Generate a stable screen ID from the element structure.
   * Uses className + resourceId to create a structural fingerprint
   * that remains stable across navigation (ignores dynamic text content).
   */
  private generateScreenId(rootElement: MobileElement): string {
    const structuralParts: string[] = [];

    function collectStructure(element: MobileElement): void {
      if (element.className) {
        const part = element.resourceId
          ? `${element.className}:${element.resourceId}`
          : element.className;
        structuralParts.push(part);
      }
      for (const child of element.children) {
        collectStructure(child);
      }
    }

    collectStructure(rootElement);
    structuralParts.sort();

    const joined = structuralParts.join('|');
    return createHash('sha256').update(joined).digest('hex').substring(0, 16);
  }

  /**
   * Get the current activity name (Android) or view controller (iOS).
   */
  private async getActivityName(): Promise<string | null> {
    try {
      if (this.platform === 'android') {
        const activity = await this.driver.getCurrentActivity();
        return activity || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract a human-readable screen title from the element tree.
   */
  private extractScreenTitle(rootElement: MobileElement): string | null {
    const flatElements = flattenElementTree(rootElement);

    if (this.platform === 'ios') {
      const navBar = flatElements.find((el) => el.className === 'XCUIElementTypeNavigationBar');
      if (navBar?.label) {
        return navBar.label;
      }
    }

    if (this.platform === 'android') {
      const toolbar = flatElements.find(
        (el) => el.className?.includes('Toolbar') || el.className?.includes('ActionBar'),
      );
      if (toolbar) {
        const titleEl = toolbar.children.find(
          (child) => child.text && child.className?.includes('TextView'),
        );
        if (titleEl?.text) {
          return titleEl.text;
        }
      }
    }

    const firstHeading = flatElements.find(
      (el) =>
        el.text &&
        el.text.length > 0 &&
        el.text.length < 50 &&
        (el.className?.includes('Title') ||
          el.className?.includes('Header') ||
          el.resourceId?.includes('title')),
    );

    return firstHeading?.text || null;
  }

  /**
   * Find elements likely to cause screen transitions.
   */
  async findNavigationElements(screenState: ScreenState): Promise<MobileElement[]> {
    if (!screenState.elements[0]) {
      return [];
    }

    const flatElements = flattenElementTree(screenState.elements[0]);
    const candidates: MobileElement[] = [];

    for (const element of flatElements) {
      if (!this.isNavigationCandidate(element)) {
        continue;
      }

      if (this.shouldExcludeElement(element)) {
        continue;
      }

      candidates.push(element);
    }

    return this.prioritizeNavigationElements(candidates);
  }

  /**
   * Check if an element is a navigation candidate.
   */
  private isNavigationCandidate(element: MobileElement): boolean {
    if (!element.isClickable && !element.isFocusable) {
      return false;
    }

    if (!element.isEnabled || !element.isVisible) {
      return false;
    }

    const className = element.className?.toLowerCase() ?? '';
    const resourceId = element.resourceId?.toLowerCase() ?? '';

    if (this.platform === 'android') {
      return (
        className.includes('button') ||
        className.includes('navigationbar') ||
        className.includes('tab') ||
        className.includes('menuitem') ||
        className.includes('toolbar') ||
        className.includes('floatingactionbutton') ||
        className.includes('cardview') ||
        className.includes('listitem') ||
        resourceId.includes('nav') ||
        resourceId.includes('menu') ||
        resourceId.includes('tab') ||
        resourceId.includes('btn') ||
        resourceId.includes('button')
      );
    }

    return (
      className.includes('button') ||
      className.includes('link') ||
      className.includes('cell') ||
      className.includes('tab') ||
      className.includes('statictext') ||
      element.isClickable
    );
  }

  /**
   * Check if an element should be excluded from navigation.
   */
  private shouldExcludeElement(element: MobileElement): boolean {
    const className = element.className?.toLowerCase() ?? '';

    const excludePatterns = [
      'edittext',
      'textfield',
      'securetextfield',
      'seekbar',
      'slider',
      'switch',
      'checkbox',
      'radiobutton',
      'picker',
      'keyboard',
    ];

    if (excludePatterns.some((pattern) => className.includes(pattern))) {
      return true;
    }

    const { width, height } = element.bounds;
    if (width > 0 && height > 0) {
      if (width < MIN_TAP_TARGET_SIZE || height < MIN_TAP_TARGET_SIZE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Prioritize navigation elements for exploration order.
   */
  private prioritizeNavigationElements(elements: MobileElement[]): MobileElement[] {
    const bottomNavItems: MobileElement[] = [];
    const tabItems: MobileElement[] = [];
    const actionButtons: MobileElement[] = [];
    const listItems: MobileElement[] = [];
    const others: MobileElement[] = [];

    for (const element of elements) {
      const className = element.className?.toLowerCase() ?? '';
      const resourceId = element.resourceId?.toLowerCase() ?? '';

      if (
        className.includes('bottomnavigation') ||
        className.includes('tabbar') ||
        resourceId.includes('bottom_nav') ||
        resourceId.includes('bottomnav')
      ) {
        bottomNavItems.push(element);
      } else if (className.includes('tab') || resourceId.includes('tab')) {
        tabItems.push(element);
      } else if (
        className.includes('floatingactionbutton') ||
        className.includes('fab') ||
        resourceId.includes('fab')
      ) {
        actionButtons.push(element);
      } else if (
        className.includes('cell') ||
        className.includes('listitem') ||
        className.includes('cardview')
      ) {
        listItems.push(element);
      } else {
        others.push(element);
      }
    }

    const prioritized = [
      ...bottomNavItems.slice(0, 5),
      ...tabItems.slice(0, 3),
      ...actionButtons.slice(0, 2),
      ...listItems.slice(0, 3),
      ...others.slice(0, 5),
    ];

    return prioritized.slice(0, MAX_NAV_ELEMENTS_PER_SCREEN);
  }

  /**
   * Tap an element and capture the resulting screen state.
   */
  private async tapAndCaptureNewScreen(
    element: MobileElement,
    currentScreenId: string,
  ): Promise<ScreenState | null> {
    try {
      const { x, y, width, height } = element.bounds;
      const centerX = x + Math.floor(width / 2);
      const centerY = y + Math.floor(height / 2);

      this.logger.debug(
        {
          elementId: element.elementId,
          className: element.className,
          resourceId: element.resourceId,
          tap: { x: centerX, y: centerY },
        },
        'Tapping element',
      );

      await this.driver.action('pointer').move({ x: centerX, y: centerY }).down().up().perform();

      await this.driver.pause(UI_SETTLE_DELAY_MS);

      const newScreenState = await this.getScreenState();
      if (!newScreenState) {
        return null;
      }

      if (newScreenState.screenId === currentScreenId) {
        this.logger.debug({ elementId: element.elementId }, 'Tap did not cause screen transition');
        return null;
      }

      return newScreenState;
    } catch (err) {
      this.logger.warn({ err, elementId: element.elementId }, 'Failed to tap element');
      return null;
    }
  }

  /**
   * Handle navigating back to the previous screen.
   */
  private async handleNavigationBack(expectedScreenId: string): Promise<boolean> {
    try {
      if (this.platform === 'android') {
        await this.driver.back();
      } else {
        const wentBack = await IOSHandler.navigateBack(this.driver);
        if (!wentBack) {
          this.logger.debug('iOS back navigation failed, resetting to home screen');
          await this.resetIosToHomeAndRelaunch();
          return false;
        }
      }

      await this.driver.pause(BACK_NAVIGATION_DELAY_MS);

      const currentState = await this.getScreenState();
      if (!currentState) {
        return false;
      }

      if (currentState.screenId === expectedScreenId) {
        return true;
      }

      this.logger.debug(
        {
          expected: expectedScreenId,
          actual: currentState.screenId,
        },
        'Back navigation landed on unexpected screen',
      );

      return false;
    } catch (err) {
      this.logger.warn({ err }, 'Back navigation failed');
      return false;
    }
  }

  /**
   * Reset iOS app to home screen and re-launch.
   * Used when back navigation fails and we need to restart traversal branch.
   */
  private async resetIosToHomeAndRelaunch(): Promise<void> {
    try {
      await this.driver.execute('mobile: pressButton', { name: 'home' });
      await this.driver.pause(500);

      if (this.bundleId) {
        await this.driver.execute('mobile: activateApp', { bundleId: this.bundleId });
      } else {
        const appInfo = (await this.driver.execute('mobile: activeAppInfo')) as {
          bundleId?: string;
        };
        if (appInfo?.bundleId) {
          await this.driver.execute('mobile: activateApp', { bundleId: appInfo.bundleId });
        }
      }

      await this.driver.pause(UI_SETTLE_DELAY_MS);
    } catch (err) {
      this.logger.warn({ err }, 'Failed to reset iOS app to home');
    }
  }

  /**
   * Restart traversal from the home/launch screen.
   */
  private async restartFromHome(): Promise<void> {
    try {
      if (this.platform === 'android') {
        const currentPackage = await this.driver.getCurrentPackage();
        await this.driver.execute('mobile: pressButton', { name: 'home' });
        await this.driver.pause(500);
        await this.driver.execute('mobile: activateApp', { appId: currentPackage });
        await this.driver.pause(UI_SETTLE_DELAY_MS);
      } else {
        await this.resetIosToHomeAndRelaunch();
      }
    } catch (err) {
      this.logger.warn({ err }, 'Failed to restart from home');
    }
  }

  /**
   * Capture a screenshot and upload to S3.
   */
  private async captureScreenshot(screenId: string): Promise<string | null> {
    try {
      const base64Screenshot = await this.driver.takeScreenshot();
      const buffer = Buffer.from(base64Screenshot, 'base64');
      const s3Key = await uploadScreenshot(buffer, this.scanId, screenId, this.orgId);
      return s3Key;
    } catch (err) {
      this.logger.warn({ err, screenId }, 'Failed to capture screenshot');
      return null;
    }
  }

  /**
   * Check if an element has already been tapped on a screen.
   */
  private hasElementBeenTapped(screenId: string, elementId: string): boolean {
    const tappedSet = this.tappedElementsPerScreen.get(screenId);
    return tappedSet?.has(elementId) ?? false;
  }

  /**
   * Mark an element as tapped on a screen.
   */
  private markElementTapped(screenId: string, elementId: string): void {
    if (!this.tappedElementsPerScreen.has(screenId)) {
      this.tappedElementsPerScreen.set(screenId, new Set());
    }
    this.tappedElementsPerScreen.get(screenId)!.add(elementId);
  }

  /**
   * Add an edge to the screen navigation graph.
   */
  private addEdge(fromScreenId: string, toScreenId: string): void {
    if (!this.screenGraph.has(fromScreenId)) {
      this.screenGraph.set(fromScreenId, new Set());
    }
    this.screenGraph.get(fromScreenId)!.add(toScreenId);
  }

  /**
   * Get the traversal graph as a plain object for DB storage.
   */
  getTraversalGraph(): TraversalGraph {
    const graph: TraversalGraph = {};
    for (const [fromId, toSet] of this.screenGraph.entries()) {
      graph[fromId] = Array.from(toSet);
    }
    return graph;
  }

  /**
   * Get all discovered screens.
   */
  getDiscoveredScreens(): ScreenState[] {
    return Array.from(this.discoveredScreens.values());
  }

  /**
   * Get the count of visited screens.
   */
  getVisitedCount(): number {
    return this.visitedScreenIds.size;
  }
}
