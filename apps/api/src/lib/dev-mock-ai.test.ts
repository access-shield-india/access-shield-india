import { describe, expect, it } from 'vitest';
import {
  applyHeuristicFix,
  buildDevMockFix,
  fixAriaAllowedRole,
  fixColorContrastStyles,
  humanizeAssetName,
  isDevPreviewAiFix,
  polishPlaceholderAccessibleNames,
  stripDevPreviewComment,
  suggestAccessibleNameOptions,
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

describe('fixColorContrastStyles', () => {
  it('adds high-contrast text colour when background is set', () => {
    const before = ':"0" style="background-color: rgb(124, 179, 66); opacity: 1;"';
    const after = fixColorContrastStyles(before);
    expect(after).toContain('color: #0f172a');
    expect(after).toContain('background-color: rgb(124, 179, 66)');
    expect(after).not.toBe(before);
  });
});

describe('applyHeuristicFix color-contrast', () => {
  it('changes HTML for contrast rules', () => {
    const html = '<span style="background-color: rgb(124, 179, 66);">OK</span>';
    const result = applyHeuristicFix(
      'color-contrast',
      html,
      'Element has insufficient contrast',
      '1.4.3',
    );
    expect(result.changed).toBe(true);
    expect(result.afterHtml).toContain('color: #0f172a');
    expect(result.explanation).toContain('Heuristic assist');
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

describe('suggestAccessibleNameOptions for image links', () => {
  it('derives NISM label from Groww asset URL', () => {
    const html =
      '<a href="https://wp-asset.groww.in/wp-content/uploads/2022/05/18152816/NISM-Final-1-scaled.webp">';
    const suggestion = suggestAccessibleNameOptions(html, 'link');
    expect(suggestion.primary.toLowerCase()).toContain('nism');
    expect(suggestion.primary).not.toMatch(/\[Describe/i);
    expect(suggestion.alternatives.length).toBeGreaterThan(0);
  });

  it('humanizeAssetName strips noise tokens', () => {
    expect(humanizeAssetName('NISM-Final-1-scaled.webp').toLowerCase()).toContain('nism');
  });
});

describe('applyHeuristicFix link-name', () => {
  it('uses real aria-label instead of placeholder', () => {
    const html =
      '<a href="https://wp-asset.groww.in/wp-content/uploads/2022/05/18152816/NISM-Final-1-scaled.webp">';
    const result = applyHeuristicFix('link-name', html, 'Links must have discernible text', '2.4.4');
    expect(result.changed).toBe(true);
    expect(result.afterHtml).toMatch(/aria-label="[^"]*NISM[^"]*"/i);
    expect(result.afterHtml).not.toContain('[Describe link purpose]');
    expect(result.explanation).toMatch(/Other aria-label options|Suggested accessible name/i);
  });

  it('title-cases ALL CAPS Wix menu link text', () => {
    const html =
      '<a data-testid="linkElement" href="https://www.faithautomation.com/engineering-services" target="_self" class="G7GdaI wixui-vertical-menu__item-label">ENGINEERING SERVICES</a>';
    const result = applyHeuristicFix('link-name', html, 'Links must have discernible text', '2.4.4');
    expect(result.changed).toBe(true);
    expect(result.afterHtml).toContain('Engineering Services');
    expect(result.afterHtml).not.toContain('>ENGINEERING SERVICES<');
    expect(result.afterHtml).not.toMatch(/aria-label=/i);
  });

  it('uniquifies RULE-005 duplicate link purpose', () => {
    const html =
      '<a href="https://www.faithautomation.com/engineering-services">ENGINEERING SERVICES</a>';
    const result = applyHeuristicFix(
      'RULE-005',
      html,
      '5 links share the identical text "engineering services" but point to 3 different destinations.',
      '2.4.4',
    );
    expect(result.changed).toBe(true);
    expect(result.afterHtml).toMatch(/aria-label="/i);
    expect(result.afterHtml).toMatch(/Engineering Services/i);
  });
});

describe('polishPlaceholderAccessibleNames', () => {
  it('replaces AI placeholder aria-label', () => {
    const html =
      '<a aria-label="[Describe link purpose]" href="https://example.com/files/SEBI-circular.pdf">';
    const { html: next, suggestion } = polishPlaceholderAccessibleNames(html, 'link-name');
    expect(next).not.toContain('[Describe link purpose]');
    expect(next).toMatch(/aria-label="[^"]+"/);
    expect(suggestion?.primary.toLowerCase()).toMatch(/sebi/);
  });
});
