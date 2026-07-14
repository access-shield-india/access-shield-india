/**
 * XML Parser for Appium Page Source
 *
 * Minimal, fast XML parser for Appium page source output.
 * Uses fast-xml-parser instead of a full DOM library for performance.
 */

import { XMLParser } from 'fast-xml-parser';
import type { MobilePlatform, MobileElement, ElementBounds } from './types.js';

export interface XmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  allowBooleanAttributes: true,
  ignoreDeclaration: true,
  trimValues: true,
});

/**
 * Parse Appium page source XML into a structured node tree.
 */
export function parseAppiumXml(xmlString: string): XmlNode | null {
  try {
    const parsed = xmlParser.parse(xmlString);
    return convertToXmlNode(parsed);
  } catch (err) {
    return null;
  }
}

/**
 * Recursively convert fast-xml-parser output to our XmlNode structure.
 */
function convertToXmlNode(obj: unknown, tagName?: string): XmlNode | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) {
    return null;
  }

  if (tagName) {
    const attributes: Record<string, string> = {};
    const children: XmlNode[] = [];

    for (const [key, value] of entries) {
      if (key.startsWith('@_')) {
        attributes[key] = String(value ?? '');
      } else if (key !== '#text') {
        const childNodes = extractChildNodes(key, value);
        children.push(...childNodes);
      }
    }

    return { tagName, attributes, children };
  }

  for (const [key, value] of entries) {
    if (!key.startsWith('@_') && !key.startsWith('#') && !key.startsWith('?')) {
      return convertToXmlNode(value, key);
    }
  }

  return null;
}

/**
 * Extract child nodes from a parsed XML value.
 */
function extractChildNodes(tagName: string, value: unknown): XmlNode[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => convertToXmlNode(item, tagName))
      .filter((node): node is XmlNode => node !== null);
  }

  const node = convertToXmlNode(value, tagName);
  return node ? [node] : [];
}

/**
 * Parse Android bounds format: "[10,20][110,120]"
 * Returns { x: 10, y: 20, width: 100, height: 100 }
 */
export function parseBounds(boundsStr: string): ElementBounds {
  const defaultBounds: ElementBounds = { x: 0, y: 0, width: 0, height: 0 };

  if (!boundsStr) {
    return defaultBounds;
  }

  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match || match.length < 5) {
    return defaultBounds;
  }

  const x1 = parseInt(match[1] ?? '0', 10);
  const y1 = parseInt(match[2] ?? '0', 10);
  const x2 = parseInt(match[3] ?? '0', 10);
  const y2 = parseInt(match[4] ?? '0', 10);

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

/**
 * Parse iOS bounds from separate x, y, width, height attributes.
 */
export function parseIosBounds(x: string, y: string, width: string, height: string): ElementBounds {
  return {
    x: parseInt(x || '0', 10) || 0,
    y: parseInt(y || '0', 10) || 0,
    width: parseInt(width || '0', 10) || 0,
    height: parseInt(height || '0', 10) || 0,
  };
}

/**
 * Extract element attributes from an XmlNode based on platform.
 */
export function extractElementAttributes(
  node: XmlNode,
  platform: MobilePlatform,
): Partial<MobileElement> {
  const attrs = node.attributes;

  if (platform === 'android') {
    return extractAndroidAttributes(attrs);
  }

  return extractIosAttributes(attrs);
}

/**
 * Extract Android-specific element attributes.
 */
function extractAndroidAttributes(attrs: Record<string, string>): Partial<MobileElement> {
  const text = attrs['@_text'] || null;
  const contentDesc = attrs['@_content-desc'] || null;
  const className = attrs['@_class'] || null;
  const resourceId = attrs['@_resource-id'] || null;
  const boundsStr = attrs['@_bounds'] || '';

  return {
    text: text || null,
    contentDesc: contentDesc || null,
    label: null,
    hint: null,
    role: mapAndroidClassToRole(className),
    className,
    resourceId: resourceId ? extractResourceIdName(resourceId) : null,
    isClickable: attrs['@_clickable'] === 'true',
    isFocusable: attrs['@_focusable'] === 'true',
    isEnabled: attrs['@_enabled'] === 'true',
    isVisible: attrs['@_displayed'] !== 'false',
    bounds: parseBounds(boundsStr),
  };
}

/**
 * Extract iOS-specific element attributes.
 */
function extractIosAttributes(attrs: Record<string, string>): Partial<MobileElement> {
  const label = attrs['@_label'] || attrs['@_name'] || null;
  const hint = attrs['@_hint'] || null;
  const value = attrs['@_value'] || null;
  const elementType = attrs['@_type'] || '';
  const accessible = attrs['@_accessible'] === 'true';

  return {
    text: value || label,
    contentDesc: null,
    label,
    hint,
    role: mapIosTypeToRole(elementType),
    className: elementType,
    resourceId: attrs['@_name'] || null,
    isClickable: accessible || isClickableIosType(elementType),
    isFocusable: accessible,
    isEnabled: attrs['@_enabled'] !== 'false',
    isVisible: attrs['@_visible'] !== 'false',
    bounds: parseIosBounds(
      attrs['@_x'] ?? '',
      attrs['@_y'] ?? '',
      attrs['@_width'] ?? '',
      attrs['@_height'] ?? '',
    ),
  };
}

/**
 * Extract the resource name from Android resource-id (e.g., "com.app:id/button" -> "button")
 */
function extractResourceIdName(resourceId: string): string {
  const parts = resourceId.split('/');
  if (parts.length > 1) {
    return parts[parts.length - 1] ?? resourceId;
  }
  return resourceId;
}

/**
 * Map Android class names to semantic roles.
 */
function mapAndroidClassToRole(className: string | null): string | null {
  if (!className) return null;

  const roleMap: Record<string, string> = {
    'android.widget.Button': 'button',
    'android.widget.ImageButton': 'button',
    'android.widget.EditText': 'textbox',
    'android.widget.TextView': 'text',
    'android.widget.ImageView': 'image',
    'android.widget.CheckBox': 'checkbox',
    'android.widget.RadioButton': 'radio',
    'android.widget.Switch': 'switch',
    'android.widget.ToggleButton': 'switch',
    'android.widget.Spinner': 'combobox',
    'android.widget.SeekBar': 'slider',
    'android.widget.ProgressBar': 'progressbar',
    'android.widget.ListView': 'list',
    'android.widget.RecyclerView': 'list',
    'android.widget.ScrollView': 'region',
    'android.widget.HorizontalScrollView': 'region',
    'android.widget.TabHost': 'tablist',
    'android.widget.TabWidget': 'tablist',
    'android.view.View': 'generic',
    'android.view.ViewGroup': 'group',
    'android.widget.LinearLayout': 'group',
    'android.widget.RelativeLayout': 'group',
    'android.widget.FrameLayout': 'group',
    'androidx.constraintlayout.widget.ConstraintLayout': 'group',
    'com.google.android.material.bottomnavigation.BottomNavigationView': 'navigation',
    'com.google.android.material.navigation.NavigationView': 'navigation',
    'com.google.android.material.tabs.TabLayout': 'tablist',
    'com.google.android.material.floatingactionbutton.FloatingActionButton': 'button',
  };

  for (const [key, role] of Object.entries(roleMap)) {
    const lastPart = key.split('.').pop();
    if (className.includes(key) || (lastPart && className.endsWith(lastPart))) {
      return role;
    }
  }

  if (className.toLowerCase().includes('button')) return 'button';
  if (className.toLowerCase().includes('edit')) return 'textbox';
  if (className.toLowerCase().includes('image')) return 'image';
  if (className.toLowerCase().includes('text')) return 'text';
  if (className.toLowerCase().includes('list')) return 'list';
  if (className.toLowerCase().includes('recycler')) return 'list';

  return null;
}

/**
 * Map iOS element types to semantic roles.
 */
function mapIosTypeToRole(elementType: string): string | null {
  const roleMap: Record<string, string> = {
    XCUIElementTypeButton: 'button',
    XCUIElementTypeTextField: 'textbox',
    XCUIElementTypeSecureTextField: 'textbox',
    XCUIElementTypeTextView: 'textbox',
    XCUIElementTypeStaticText: 'text',
    XCUIElementTypeImage: 'image',
    XCUIElementTypeSwitch: 'switch',
    XCUIElementTypeSlider: 'slider',
    XCUIElementTypePicker: 'combobox',
    XCUIElementTypePickerWheel: 'listbox',
    XCUIElementTypeProgressIndicator: 'progressbar',
    XCUIElementTypeActivityIndicator: 'progressbar',
    XCUIElementTypeTable: 'list',
    XCUIElementTypeCollectionView: 'list',
    XCUIElementTypeCell: 'listitem',
    XCUIElementTypeScrollView: 'region',
    XCUIElementTypeTabBar: 'tablist',
    XCUIElementTypeTab: 'tab',
    XCUIElementTypeNavigationBar: 'navigation',
    XCUIElementTypeToolbar: 'toolbar',
    XCUIElementTypeLink: 'link',
    XCUIElementTypeAlert: 'alertdialog',
    XCUIElementTypeSheet: 'dialog',
    XCUIElementTypeApplication: 'application',
    XCUIElementTypeWindow: 'window',
    XCUIElementTypeOther: 'generic',
  };

  return roleMap[elementType] || null;
}

/**
 * Check if an iOS element type is inherently clickable.
 */
function isClickableIosType(elementType: string): boolean {
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
 * Recursively parse an XmlNode tree into MobileElement tree.
 * Limits recursion depth to prevent stack overflow on deeply nested UIs.
 */
export function parseElementTree(
  node: XmlNode,
  platform: MobilePlatform,
  depth: number = 0,
  idCounter: { value: number } = { value: 0 },
): MobileElement {
  const MAX_DEPTH = 8;

  const attrs = extractElementAttributes(node, platform);
  const elementId = `e${idCounter.value++}`;

  const children: MobileElement[] = [];

  if (depth < MAX_DEPTH && node.children.length > 0) {
    for (const childNode of node.children) {
      const childElement = parseElementTree(childNode, platform, depth + 1, idCounter);
      children.push(childElement);
    }
  }

  return {
    elementId,
    text: attrs.text ?? null,
    contentDesc: attrs.contentDesc ?? null,
    label: attrs.label ?? null,
    hint: attrs.hint ?? null,
    role: attrs.role ?? null,
    bounds: attrs.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
    isClickable: attrs.isClickable ?? false,
    isFocusable: attrs.isFocusable ?? false,
    isEnabled: attrs.isEnabled ?? true,
    isVisible: attrs.isVisible ?? true,
    className: attrs.className ?? null,
    resourceId: attrs.resourceId ?? null,
    children,
  };
}

/**
 * Flatten an element tree into an array (depth-first).
 */
export function flattenElementTree(root: MobileElement): MobileElement[] {
  const result: MobileElement[] = [];

  function traverse(element: MobileElement): void {
    result.push(element);
    for (const child of element.children) {
      traverse(child);
    }
  }

  traverse(root);
  return result;
}
