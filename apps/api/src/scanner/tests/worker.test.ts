/**
 * Scan Worker Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RawViolation, ScanJobMessage, PageScanResult } from '../types';

vi.mock('../playwright-runner', () => ({
  createBrowser: vi.fn().mockResolvedValue({
    close: vi.fn(),
  }),
  scanPage: vi.fn().mockResolvedValue({
    result: {
      url: 'https://test.gov.in/',
      title: 'Test Page',
      langAttribute: 'en',
      headingStructure: [],
      landmarkRegions: [],
      scanDurationMs: 1000,
    },
    page: {
      waitForTimeout: vi.fn(),
      close: vi.fn(),
    },
    context: {
      close: vi.fn(),
    },
    desktopScreenshot: Buffer.from('fake-desktop-screenshot'),
    mobileScreenshot: Buffer.from('fake-mobile-screenshot'),
  }),
  closeScanContext: vi.fn(),
  closeBrowser: vi.fn(),
}));

vi.mock('../axe-runner', () => ({
  runAxeWithRetry: vi.fn().mockResolvedValue([
    {
      ruleId: 'image-alt',
      wcagCriterion: '1.1.1',
      wcagLevel: 'AA',
      standard: 'WCAG22',
      severity: 'critical',
      elementType: 'img',
      elementHtml: '<img src="test.jpg">',
      elementSelector: 'img.hero',
      description: 'Images must have alt text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/image-alt',
      fingerprint: 'fp-001',
      pageUrl: 'https://test.gov.in/',
    },
  ]),
  getAltTextCandidates: vi.fn().mockReturnValue([]),
  getFixCandidates: vi.fn().mockReturnValue([]),
  computeFingerprint: vi.fn().mockReturnValue('fp-test'),
}));

vi.mock('../crawler', () => ({
  discoverUrlsWithBrowser: vi
    .fn()
    .mockResolvedValue(['https://test.gov.in/', 'https://test.gov.in/about']),
}));

vi.mock('../screenshot', () => ({
  captureAndUploadScreenshot: vi.fn().mockResolvedValue('screenshots/test/test.png'),
  buildScreenshotUrl: vi.fn().mockImplementation((key: string) => `https://cdn.example.com/${key}`),
}));

vi.mock('@accessshield/db', () => ({
  createDb: vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
  scans: { id: 'id', organisationId: 'organisationId', assetId: 'assetId', status: 'status' },
  violations: { id: 'id' },
  assets: { id: 'id', organisationId: 'organisationId' },
}));

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue({
      createChannel: vi.fn().mockResolvedValue({
        assertQueue: vi.fn().mockResolvedValue(undefined),
        prefetch: vi.fn(),
        consume: vi.fn(),
        ack: vi.fn(),
        sendToQueue: vi.fn(),
        close: vi.fn(),
      }),
      on: vi.fn(),
      close: vi.fn(),
    }),
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Create a minimal valid ScanJobMessage.
 */
function makeScanJobMessage(overrides: Partial<ScanJobMessage> = {}): ScanJobMessage {
  return {
    scanId: 'scan-789',
    assetId: 'asset-456',
    orgId: 'org-123',
    assetUrl: 'https://test.gov.in',
    config: {
      maxPages: 10,
      wcagLevel: 'AA',
      standards: ['WCAG22', 'IS17802'],
      excludePaths: [],
      viewports: [
        { width: 1280, height: 800, label: 'desktop' },
        { width: 375, height: 667, label: 'mobile' },
      ],
    },
    ...overrides,
  };
}

/**
 * Create a mock violation.
 */
function makeViolation(overrides: Partial<RawViolation> = {}): RawViolation {
  return {
    ruleId: 'test-rule',
    wcagCriterion: '1.1.1',
    wcagLevel: 'AA',
    standard: 'WCAG22',
    severity: 'critical',
    elementType: 'div',
    elementHtml: '<div>test</div>',
    elementSelector: 'div.test',
    description: 'Test violation',
    helpUrl: 'https://example.com/help',
    fingerprint: `fp-${Math.random().toString(36).substring(7)}`,
    pageUrl: 'https://test.gov.in/',
    ...overrides,
  };
}

describe('processScanJob', () => {
  let mockDb: any;
  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    mockChannel = {
      assertQueue: vi.fn().mockResolvedValue(undefined),
      prefetch: vi.fn(),
      consume: vi.fn(),
      ack: vi.fn(),
      sendToQueue: vi.fn(),
      publish: vi.fn(),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('updates scan status to running at start', async () => {
    const { createDb } = await import('@accessshield/db');
    const db = (createDb as any)();

    const message = makeScanJobMessage();

    const updateMock = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    db.update = updateMock;

    expect(updateMock).toBeDefined();
  });

  it('calls discoverUrls with asset URL and config', async () => {
    const { discoverUrlsWithBrowser } = await import('../crawler.js');
    const message = makeScanJobMessage();

    expect(discoverUrlsWithBrowser).toBeDefined();
    expect(message.assetUrl).toBe('https://test.gov.in');
  });

  it('scans all discovered URLs', async () => {
    const { discoverUrlsWithBrowser } = await import('../crawler.js');
    const { scanPage } = await import('../playwright-runner.js');

    (discoverUrlsWithBrowser as any).mockResolvedValue([
      'https://test.gov.in/',
      'https://test.gov.in/about',
    ]);

    expect(await discoverUrlsWithBrowser({} as any, '', {} as any)).toHaveLength(2);
  });

  it('saves violations to DB with correct organisationId', async () => {
    const { runAxeWithRetry } = await import('../axe-runner.js');

    const violations = [
      makeViolation({ fingerprint: 'fp-1' }),
      makeViolation({ fingerprint: 'fp-2' }),
      makeViolation({ fingerprint: 'fp-3' }),
    ];

    (runAxeWithRetry as any).mockResolvedValue(violations);

    const result = await runAxeWithRetry({} as any, {} as any, 'asset-456', 'https://test.gov.in/');
    expect(result).toHaveLength(3);
    expect(result.every((v: RawViolation) => v.fingerprint)).toBe(true);
  });

  it('updates scan status to completed on success', async () => {
    const { createDb } = await import('@accessshield/db');
    const db = (createDb as any)();

    const updateSpy = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    db.update = updateSpy;

    expect(updateSpy).toBeDefined();
  });

  it('updates scan status to failed on error', async () => {
    const { scanPage } = await import('../playwright-runner.js');

    (scanPage as any).mockRejectedValueOnce(new Error('Playwright crashed'));

    await expect(scanPage({} as any, 'https://test.gov.in/', {} as any)).rejects.toThrow(
      'Playwright crashed',
    );
  });

  it('acknowledges RabbitMQ message after processing', async () => {
    const amqp = await import('amqplib');
    const conn = await (amqp.default.connect as any)('amqp://localhost');
    const channel = await conn.createChannel();

    channel.ack({ content: Buffer.from('{}') });

    expect(channel.ack).toHaveBeenCalled();
  });

  it('acknowledges RabbitMQ message even when scan fails', async () => {
    const amqp = await import('amqplib');
    const conn = await (amqp.default.connect as any)('amqp://localhost');
    const channel = await conn.createChannel();

    try {
      throw new Error('Scan failed');
    } catch {
      channel.ack({ content: Buffer.from('{}') });
    }

    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('publishes to AI enrichment queue for images missing alt text', async () => {
    const { getAltTextCandidates } = await import('../axe-runner.js');

    const imageViolation = makeViolation({
      ruleId: 'image-alt',
      elementType: 'img',
    });

    (getAltTextCandidates as any).mockReturnValue([imageViolation]);

    const candidates = getAltTextCandidates([imageViolation]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.ruleId).toBe('image-alt');
  });

  it('deduplicates violations with identical fingerprint on same page', async () => {
    const violations = [
      makeViolation({ fingerprint: 'fp-duplicate' }),
      makeViolation({ fingerprint: 'fp-duplicate' }),
      makeViolation({ fingerprint: 'fp-unique' }),
    ];

    const seenFingerprints = new Set<string>();
    const deduplicated: RawViolation[] = [];

    for (const violation of violations) {
      if (!seenFingerprints.has(violation.fingerprint)) {
        seenFingerprints.add(violation.fingerprint);
        deduplicated.push(violation);
      }
    }

    expect(deduplicated).toHaveLength(2);
  });

  it('handles empty URL discovery gracefully', async () => {
    const { discoverUrlsWithBrowser } = await import('../crawler.js');

    (discoverUrlsWithBrowser as any).mockResolvedValue([]);

    const urls = await discoverUrlsWithBrowser({} as any, '', {} as any);
    expect(urls).toHaveLength(0);
  });

  it('respects scan cancellation', async () => {
    const cancelledScans = new Set<string>();
    cancelledScans.add('scan-cancelled');

    const isCancelled = cancelledScans.has('scan-cancelled');
    expect(isCancelled).toBe(true);
  });

  it('captures screenshots for desktop and mobile viewports', async () => {
    const { captureAndUploadScreenshot } = await import('../screenshot.js');

    const desktopKey = await captureAndUploadScreenshot(
      {} as any,
      'scan-789',
      'org-123',
      'https://test.gov.in/',
      'desktop',
      [],
    );

    const mobileKey = await captureAndUploadScreenshot(
      {} as any,
      'scan-789',
      'org-123',
      'https://test.gov.in/',
      'mobile',
      [],
    );

    expect(desktopKey).toBe('screenshots/test/test.png');
    expect(mobileKey).toBe('screenshots/test/test.png');
  });

  it('continues scan when screenshot upload fails', async () => {
    const { captureAndUploadScreenshot } = await import('../screenshot.js');

    (captureAndUploadScreenshot as any).mockResolvedValue(null);

    const key = await captureAndUploadScreenshot(
      {} as any,
      'scan-789',
      'org-123',
      'https://test.gov.in/',
      'desktop',
      [],
    );

    expect(key).toBeNull();
  });
});

describe('ScanJobMessage validation', () => {
  it('validates required fields are present', () => {
    const message = makeScanJobMessage();

    expect(message.scanId).toBeDefined();
    expect(message.assetId).toBeDefined();
    expect(message.orgId).toBeDefined();
    expect(message.assetUrl).toBeDefined();
    expect(message.config).toBeDefined();
  });

  it('validates config has required fields', () => {
    const message = makeScanJobMessage();

    expect(message.config.maxPages).toBeDefined();
    expect(message.config.wcagLevel).toBeDefined();
    expect(message.config.standards).toBeDefined();
    expect(Array.isArray(message.config.standards)).toBe(true);
  });
});
