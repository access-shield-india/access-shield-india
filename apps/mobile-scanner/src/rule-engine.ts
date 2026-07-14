/**
 * Mobile Rule Engine
 *
 * Executes accessibility rules against screen states captured during traversal.
 * Supports WCAG 2.2, IS 17802, and SEBI compliance standards.
 */

import type { ScreenState, MobileViolation, ComplianceStandard } from './types.js';
import { getMobileRules, runRuleOnElement, flattenElementTree } from './rules/mobile-rules.js';
import { logger } from './lib/logger.js';

export class MobileRuleEngine {
  private standards: ComplianceStandard[];

  constructor(standards: ComplianceStandard[]) {
    this.standards = standards;
  }

  scan(screen: ScreenState): MobileViolation[] {
    const violations: MobileViolation[] = [];
    const rules = getMobileRules(this.standards);

    if (screen.elements.length === 0) {
      logger.warn(
        { screenId: screen.screenId, activity: screen.activityName },
        'Screen has no elements to scan',
      );
      return violations;
    }

    const allElements = screen.elements.flatMap((root) => flattenElementTree(root));

    logger.debug(
      {
        screenId: screen.screenId,
        elementCount: allElements.length,
        ruleCount: rules.length,
      },
      'Running accessibility rules on screen',
    );

    for (const element of allElements) {
      if (!element.isVisible) continue;

      for (const rule of rules) {
        const violation = runRuleOnElement(rule, element, screen);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    logger.info(
      {
        screenId: screen.screenId,
        activity: screen.activityName,
        violationCount: violations.length,
      },
      'Screen scan complete',
    );

    return violations;
  }

  scanMultipleScreens(screens: ScreenState[]): MobileViolation[] {
    const allViolations: MobileViolation[] = [];
    const seenFingerprints = new Set<string>();

    for (const screen of screens) {
      const screenViolations = this.scan(screen);

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
      'All screens scanned',
    );

    return allViolations;
  }

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

export function calculateScore(violations: MobileViolation[]): number {
  const penalties = {
    critical: 20,
    serious: 10,
    moderate: 5,
    minor: 2,
  };

  let totalPenalty = 0;

  for (const violation of violations) {
    totalPenalty += penalties[violation.severity];
  }

  return Math.max(0, 100 - totalPenalty);
}

export function countBySeverity(violations: MobileViolation[]): Record<string, number> {
  const counts = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  for (const violation of violations) {
    counts[violation.severity]++;
  }

  return counts;
}
