/**
 * Mobile Rule Engine
 *
 * Orchestrates execution of IS 17802, WCAG 2.2, and SEBI mobile accessibility rules
 * against screen states captured during app traversal.
 */

import type {
  MobilePlatform,
  MobileViolation,
  ScreenState,
  ComplianceStandard,
  MobileFramework,
} from '../types.js';
import {
  checkContentDescriptions,
  checkDevanagariEncoding,
  checkTouchTargetSizes,
  checkDatePickerFormat,
  checkOtpFields,
  checkChartAccessibility,
  checkErrorAnnouncements,
  checkColorOnlyInformation,
  checkTradingKeyboardAccess,
  checkDialogAccessibility,
  checkTableAccessibility,
  checkKycScreens,
  checkPaymentPinScreens,
  flattenElements,
} from './is17802-mobile.js';
import { getFrameworkFixGuidance, type FrameworkGuidance } from '../framework-detector.js';
import { logger } from '../lib/logger.js';

type RuleFunction = (
  elements: import('../types.js').MobileElement[],
  screen: ScreenState,
  platform: MobilePlatform,
) => Promise<MobileViolation[]>;

interface RuleConfig {
  fn: RuleFunction;
  standards: ComplianceStandard[];
}

/**
 * Map of rule IDs to their implementation and applicable standards.
 */
const RULE_REGISTRY: Record<string, RuleConfig> = {
  'M-IS-001': { fn: checkContentDescriptions, standards: ['IS17802', 'WCAG22'] },
  'M-IS-002': { fn: checkDevanagariEncoding, standards: ['IS17802'] },
  'M-IS-003': { fn: checkTouchTargetSizes, standards: ['IS17802', 'WCAG22'] },
  'M-IS-004': { fn: checkDatePickerFormat, standards: ['IS17802'] },
  'M-IS-005': { fn: checkOtpFields, standards: ['IS17802', 'WCAG22'] },
  'M-IS-006': { fn: checkChartAccessibility, standards: ['IS17802', 'WCAG22'] },
  'M-IS-007': { fn: checkErrorAnnouncements, standards: ['IS17802'] },
  'M-IS-008': { fn: checkColorOnlyInformation, standards: ['IS17802', 'WCAG22'] },
  'M-IS-009': { fn: checkTradingKeyboardAccess, standards: ['SEBI'] },
  'M-IS-010': { fn: checkDialogAccessibility, standards: ['SEBI'] },
  'M-IS-011': { fn: checkTableAccessibility, standards: ['SEBI'] },
  'M-IS-013': { fn: checkKycScreens, standards: ['SEBI'] },
  'M-IS-014': { fn: checkPaymentPinScreens, standards: ['SEBI'] },
};

export class MobileRuleEngine {
  private platform: MobilePlatform;
  private standards: ComplianceStandard[];
  private framework: MobileFramework;
  private frameworkGuidance: FrameworkGuidance;

  constructor(
    platform: MobilePlatform,
    standards: ComplianceStandard[],
    framework: MobileFramework = 'unknown',
  ) {
    this.platform = platform;
    this.standards = standards;
    this.framework = framework;
    this.frameworkGuidance = getFrameworkFixGuidance(framework);
  }

  /**
   * Update framework after detection (can be called post-construction).
   */
  setFramework(framework: MobileFramework): void {
    this.framework = framework;
    this.frameworkGuidance = getFrameworkFixGuidance(framework);
    logger.info({ framework }, 'Rule engine framework updated');
  }

  /**
   * Get framework-specific fix guidance.
   */
  getFrameworkGuidance(): FrameworkGuidance {
    return this.frameworkGuidance;
  }

  /**
   * Get detected framework.
   */
  getFramework(): MobileFramework {
    return this.framework;
  }

  /**
   * Run all applicable rules against the screen's element tree.
   * Returns deduplicated violations (same ruleId + elementId only once).
   */
  async scan(screenState: ScreenState): Promise<MobileViolation[]> {
    const violations: MobileViolation[] = [];
    const seenKeys = new Set<string>();

    if (screenState.elements.length === 0) {
      logger.warn(
        { screenId: screenState.screenId, activity: screenState.activityName },
        'Screen has no elements to scan',
      );
      return violations;
    }

    const allElements = screenState.elements.flatMap((root) => flattenElements([root]));

    logger.debug(
      {
        screenId: screenState.screenId,
        elementCount: allElements.length,
        platform: this.platform,
        standards: this.standards,
        framework: this.framework,
      },
      'Running IS 17802 mobile rules on screen',
    );

    const applicableRules = this.getApplicableRules();

    const rulePromises = applicableRules.map(async ({ ruleId, fn }) => {
      try {
        const ruleViolations = await fn(allElements, screenState, this.platform);
        return { ruleId, violations: ruleViolations };
      } catch (err) {
        logger.error({ err, ruleId, screenId: screenState.screenId }, 'Rule execution failed');
        return { ruleId, violations: [] };
      }
    });

    const results = await Promise.all(rulePromises);

    for (const { violations: ruleViolations } of results) {
      for (const violation of ruleViolations) {
        const key = `${violation.ruleId}::${violation.elementId ?? 'screen'}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const enrichedViolation = this.enrichViolationWithFrameworkGuidance(violation);
          violations.push(enrichedViolation);
        }
      }
    }

    logger.info(
      {
        screenId: screenState.screenId,
        activity: screenState.activityName,
        violationCount: violations.length,
        framework: this.framework,
      },
      'IS 17802 mobile scan complete',
    );

    return violations;
  }

  /**
   * Enrich a violation with framework-specific fix guidance.
   */
  private enrichViolationWithFrameworkGuidance(violation: MobileViolation): MobileViolation {
    if (this.framework === 'unknown') {
      return violation;
    }

    const guidance = this.frameworkGuidance;
    let frameworkHint = '';

    if (violation.ruleId === 'M-IS-001' || violation.ruleId === 'M-IS-005') {
      frameworkHint = ` [${this.getFrameworkDisplayName()}] ${guidance.contentDescriptionFix}`;
    } else if (violation.ruleId === 'M-IS-003') {
      frameworkHint = ` [${this.getFrameworkDisplayName()}] ${guidance.touchTargetFix}`;
    } else if (violation.ruleId === 'M-IS-006' || violation.ruleId === 'M-IS-010') {
      frameworkHint = ` [${this.getFrameworkDisplayName()}] ${guidance.accessibleFix}`;
    }

    if (frameworkHint) {
      return {
        ...violation,
        description: violation.description + frameworkHint,
      };
    }

    return violation;
  }

  /**
   * Get human-readable framework name for violation descriptions.
   */
  private getFrameworkDisplayName(): string {
    const names: Record<MobileFramework, string> = {
      react_native: 'React Native',
      flutter: 'Flutter',
      native_android: 'Android',
      native_ios: 'iOS',
      xamarin: 'Xamarin/MAUI',
      ionic: 'Ionic',
      unknown: 'Unknown',
    };
    return names[this.framework];
  }

  /**
   * Scan multiple screens and deduplicate across all of them.
   */
  async scanMultipleScreens(screens: ScreenState[]): Promise<MobileViolation[]> {
    const allViolations: MobileViolation[] = [];
    const seenFingerprints = new Set<string>();

    for (const screen of screens) {
      const screenViolations = await this.scan(screen);

      for (const violation of screenViolations) {
        const fingerprint = this.generateViolationFingerprint(violation);
        if (!seenFingerprints.has(fingerprint)) {
          seenFingerprints.add(fingerprint);
          allViolations.push(violation);
        }
      }
    }

    logger.info(
      {
        screensScanned: screens.length,
        totalViolations: allViolations.length,
      },
      'All screens scanned with IS 17802 rules',
    );

    return allViolations;
  }

  /**
   * Get rules that apply to the configured standards.
   */
  private getApplicableRules(): Array<{ ruleId: string; fn: RuleFunction }> {
    const applicable: Array<{ ruleId: string; fn: RuleFunction }> = [];

    for (const [ruleId, config] of Object.entries(RULE_REGISTRY)) {
      const hasMatchingStandard = config.standards.some((std) => this.standards.includes(std));
      if (hasMatchingStandard) {
        applicable.push({ ruleId, fn: config.fn });
      }
    }

    return applicable;
  }

  /**
   * Generate a unique fingerprint for deduplication across screens.
   */
  private generateViolationFingerprint(violation: MobileViolation): string {
    const parts = [
      violation.ruleId,
      violation.elementClass ?? 'unknown',
      violation.elementResourceId ?? 'unknown',
      violation.screenActivity ?? 'unknown',
    ];
    return parts.join('::');
  }
}

/**
 * Calculate an accessibility score based on violations.
 */
export function calculateScore(violations: MobileViolation[]): number {
  const penalties: Record<string, number> = {
    critical: 20,
    serious: 10,
    moderate: 5,
    minor: 2,
  };

  let totalPenalty = 0;

  for (const violation of violations) {
    totalPenalty += penalties[violation.severity] ?? 0;
  }

  return Math.max(0, 100 - totalPenalty);
}

/**
 * Count violations by severity level.
 */
export function countBySeverity(violations: MobileViolation[]): Record<string, number> {
  const counts: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  for (const violation of violations) {
    const severity = violation.severity;
    const currentCount = counts[severity];
    if (currentCount !== undefined) {
      counts[severity] = currentCount + 1;
    }
  }

  return counts;
}
