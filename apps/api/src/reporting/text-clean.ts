/**
 * Text normalisation for report rendering.
 *
 * Scanner output is written as prose by the Python engines and is stored raw.
 * Before it reaches a Handlebars template it needs three things:
 *
 *  1. Entity decoding. The document-scan template used to escape text by hand
 *     and then interpolate it with `{{ }}`, which escapes again — so `>` was
 *     rendered as the literal text `&gt;` and `'` as `&#039;`. Decoding first
 *     makes the pipeline idempotent regardless of how the text was stored.
 *  2. Typographic normalisation. Application menu paths are written as
 *     `File > Info > Properties`, which reads badly next to real punctuation.
 *     They become `File → Info → Properties`.
 *  3. Step extraction. Remediation guidance is one long paragraph; readers
 *     need a numbered list they can work through.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rarr: '→',
  larr: '←',
  times: '×',
  rsquo: '\u2019',
  lsquo: '\u2018',
  ldquo: '\u201C',
  rdquo: '\u201D',
  check: '✓',
  cross: '✗',
};

/** Abbreviations that end in a full stop but do not end a sentence. */
const ABBREVIATIONS = ['e.g.', 'i.e.', 'etc.', 'vs.', 'approx.', 'no.', 'fig.', 'cf.'];

const ENTITY_RE = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi;

/**
 * Decode HTML entities, repeatedly, so multiply-encoded legacy text
 * (`&amp;gt;` → `&gt;` → `>`) resolves to a plain character.
 */
export function decodeHtmlEntities(input: string | null | undefined): string {
  if (!input) return '';

  let text = String(input);

  // Bounded loop: each pass must shorten the string or we stop.
  for (let pass = 0; pass < 4; pass += 1) {
    const decoded = text.replace(ENTITY_RE, (match, entity: string) => {
      const token = entity.toLowerCase();

      if (token.startsWith('#x')) {
        const code = Number.parseInt(token.slice(2), 16);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
      }
      if (token.startsWith('#')) {
        const code = Number.parseInt(token.slice(1), 10);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[token] ?? match;
    });

    if (decoded === text) break;
    text = decoded;
  }

  return text;
}

/**
 * Replace `>` used as a UI navigation separator with `→`.
 *
 * Requires whitespace on both sides, so tag names such as `<Figure>` are left
 * alone, and excludes a following digit so numeric comparisons like
 * `contrast > 4.5:1` keep their operator.
 */
export function normaliseMenuPath(input: string): string {
  return input.replace(/ +> +(?=[^\d\s])/g, ' → ');
}

/**
 * Collapse runaway whitespace while preserving deliberate paragraph breaks.
 */
function collapseWhitespace(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n *\n *\n+/g, '\n\n')
    .replace(/ +\n/g, '\n')
    .trim();
}

/**
 * Full clean-up for any scanner-authored text destined for a report.
 * Safe to call on text that is already clean.
 */
export function cleanText(input: string | null | undefined): string {
  if (!input) return '';
  return collapseWhitespace(normaliseMenuPath(decodeHtmlEntities(input)));
}

/**
 * Split remediation prose into ordered steps a reader can follow.
 *
 * Sentence boundaries are used as step boundaries, with abbreviations and
 * decimal numbers protected so `e.g.` and `4.5:1` do not create false splits.
 */
export function toFixSteps(remediation: string | null | undefined): string[] {
  const text = cleanText(remediation);
  if (!text) return [];

  // Protect abbreviations and decimals from the sentence splitter.
  const PLACEHOLDER = '\u0000';
  let guarded = text;
  ABBREVIATIONS.forEach((abbr, index) => {
    guarded = guarded.replaceAll(abbr, abbr.replace(/\./g, `${PLACEHOLDER}${index}${PLACEHOLDER}`));
  });
  guarded = guarded.replace(/(\d)\.(\d)/g, `$1${PLACEHOLDER}d${PLACEHOLDER}$2`);

  const restore = (value: string): string =>
    value
      .replace(new RegExp(`${PLACEHOLDER}d${PLACEHOLDER}`, 'g'), '.')
      .replace(new RegExp(`${PLACEHOLDER}\\d+${PLACEHOLDER}`, 'g'), '.');

  const steps = guarded
    // Split after . ! ? followed by whitespace + a capital / digit, or on newlines.
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])|\n+/)
    .map((sentence) => restore(sentence).trim())
    .filter((sentence) => sentence.length > 0);

  // A single short sentence reads better as prose than as a one-item list.
  return steps.length > 1 ? steps : [];
}
