import { describe, expect, it } from 'vitest';
import {
  buildDevMockFix,
  fixAriaAllowedRole,
  isDevPreviewAiFix,
  stripDevPreviewComment,
} from './dev-mock-ai';

describe('fixAriaAllowedRole', () => {
  it('replaces rowgroup with group on carousel slide li', () => {
    const before =
      '<li role="rowgroup" aria-label="Slide 7 of 11" style="width: 200px; float: left;">';
    const after = fixAriaAllowedRole(before);
    expect(after).toContain('role="group"');
    expect(after).toContain('aria-roledescription="slide"');
    expect(after).not.toContain('rowgroup');
  });

  it('removes rowgroup from li without slide label', () => {
    const before = '<li role="rowgroup" class="item">Content</li>';
    expect(fixAriaAllowedRole(before)).toBe('<li class="item">Content</li>');
  });
});

describe('buildDevMockFix aria-allowed-role', () => {
  it('returns different before and after HTML', () => {
    const html = '<li role="rowgroup" aria-label="Slide 7 of 11">';
    const result = buildDevMockFix('aria-allowed-role', html, 'ARIA role not allowed', '4.1.2');
    expect(result.isDevPreview).toBe(true);
    expect(result.beforeHtml).toBe(html);
    expect(result.afterHtml).not.toBe(html);
    expect(result.fixHtml).toBe(result.afterHtml);
    expect(result.explanation).toContain('Development preview:');
  });
});

describe('isDevPreviewAiFix', () => {
  it('detects from explanation marker', () => {
    expect(isDevPreviewAiFix('foo Development preview: bar', '<li></li>')).toBe(true);
  });

  it('detects legacy HTML comment prefix', () => {
    expect(
      isDevPreviewAiFix(null, '<!-- Dev preview fix for aria-allowed-role -->\n<li></li>'),
    ).toBe(true);
  });
});

describe('stripDevPreviewComment', () => {
  it('removes dev preview comment line', () => {
    expect(stripDevPreviewComment('<!-- Dev preview fix for x -->\n<li></li>')).toBe('<li></li>');
  });
});
