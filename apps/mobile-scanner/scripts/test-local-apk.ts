#!/usr/bin/env tsx
/**
 * Local APK Test Script
 *
 * Tests an APK file directly using local Appium without going through the full queue.
 * Usage: tsx scripts/test-local-apk.ts /path/to/your/app.apk
 */

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { remote } from 'webdriverio';
import { MobileRuleEngine, calculateScore, countBySeverity } from '../src/rule-engine.js';
import { TraversalAgent } from '../src/traversal-agent.js';
import { logger } from '../src/lib/logger.js';

const APK_PATH = process.argv[2];

if (!APK_PATH) {
  console.error('Usage: tsx scripts/test-local-apk.ts /path/to/your/app.apk');
  process.exit(1);
}

async function main() {
  logger.info({ apkPath: APK_PATH }, 'Starting local APK test');

  // Create Appium session
  const driver = await remote({
    protocol: 'http',
    hostname: 'localhost',
    port: 4723,
    path: '/',
    capabilities: {
      'appium:platformName': 'Android',
      'appium:platformVersion': '13.0',
      'appium:deviceName': 'emulator-5554', // or your device name
      'appium:automationName': 'UiAutomator2',
      'appium:app': APK_PATH,
      'appium:newCommandTimeout': 300,
      'appium:noReset': false,
      'appium:autoGrantPermissions': true,
    },
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
  });

  logger.info({ sessionId: driver.sessionId }, 'Appium session created');

  try {
    // Wait for app to load
    await driver.pause(5000);

    // Traverse screens
    const traversalAgent = new TraversalAgent(
      driver,
      'android',
      'test-scan',
      'test-org',
      20, // max screens
    );

    logger.info('Starting screen traversal...');
    const screens = await traversalAgent.traverse();
    const graph = traversalAgent.getTraversalGraph();

    logger.info({ screensFound: screens.length }, 'Traversal complete');

    // Run accessibility rules
    const ruleEngine = new MobileRuleEngine(['WCAG22', 'IS17802']);
    const violations = ruleEngine.scanMultipleScreens(screens);

    // Calculate results
    const score = calculateScore(violations);
    const severityCounts = countBySeverity(violations);

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('ACCESSIBILITY SCAN RESULTS');
    console.log('='.repeat(60));
    console.log(`APK: ${APK_PATH}`);
    console.log(`Screens Scanned: ${screens.length}`);
    console.log(`Total Violations: ${violations.length}`);
    console.log(`Accessibility Score: ${Math.round(score)}/100`);
    console.log('\nViolations by Severity:');
    console.log(`  Critical: ${severityCounts.critical}`);
    console.log(`  Serious: ${severityCounts.serious}`);
    console.log(`  Moderate: ${severityCounts.moderate}`);
    console.log(`  Minor: ${severityCounts.minor}`);

    if (violations.length > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('TOP VIOLATIONS:');
      console.log('-'.repeat(60));

      violations.slice(0, 10).forEach((v, i) => {
        console.log(`\n${i + 1}. [${v.severity.toUpperCase()}] ${v.ruleId}`);
        console.log(`   WCAG: ${v.wcagCriterion}`);
        console.log(`   ${v.description}`);
        if (v.screenActivity) console.log(`   Screen: ${v.screenActivity}`);
        if (v.elementResourceId) console.log(`   Element: ${v.elementResourceId}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // Save full report to file
    const report = {
      apkPath: APK_PATH,
      timestamp: new Date().toISOString(),
      screensScanned: screens.length,
      score: Math.round(score),
      severityCounts,
      violations,
      traversalGraph: graph,
    };

    const reportPath = `./scan-report-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Full report saved to: ${reportPath}`);
  } finally {
    await driver.deleteSession();
    logger.info('Session closed');
  }
}

main().catch((err) => {
  console.error('Scan failed:', err);
  process.exit(1);
});
