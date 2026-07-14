/**
 * Mobile asset metadata helpers.
 * Stored as JSON in assets.description until a dedicated metadata column exists.
 */

export interface MobileAssetMetadata {
  platform: 'android' | 'ios';
  appS3Key: string;
  maxScreens: number;
  standards: Array<'WCAG22' | 'IS17802' | 'SEBI'>;
  userDescription?: string;
}

export function buildMobileAssetDescription(
  metadata: Omit<MobileAssetMetadata, 'userDescription'>,
  userDescription?: string,
): string {
  const payload: MobileAssetMetadata = {
    ...metadata,
    ...(userDescription ? { userDescription } : {}),
  };
  return JSON.stringify(payload);
}

export function parseMobileAssetMetadata(
  description: string | null,
  url: string,
): MobileAssetMetadata | null {
  if (description) {
    try {
      const parsed = JSON.parse(description) as Partial<MobileAssetMetadata>;
      if (parsed.appS3Key && parsed.platform) {
        return {
          platform: parsed.platform,
          appS3Key: parsed.appS3Key,
          maxScreens: parsed.maxScreens ?? 50,
          standards: parsed.standards ?? ['WCAG22', 'IS17802'],
          userDescription: parsed.userDescription,
        };
      }
    } catch {
      // Fall through to URL parsing for legacy records.
    }
  }

  const match = url.match(/^mobile:\/\/(android|ios)\/([^/?#]+)/);
  if (!match) {
    return null;
  }

  return {
    platform: match[1] as 'android' | 'ios',
    appS3Key: '',
    maxScreens: 50,
    standards: ['WCAG22', 'IS17802'],
  };
}
