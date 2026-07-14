import type { Language } from '../types/preferences';

const RATE_MIN = 0.5;
const RATE_MAX = 2;
const SPEAK_CHUNK_SIZE = 280;
const CHUNK_RETRY_MAX = 2;
const KEEPALIVE_MS = 10_000;

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [contenteditable="true"]';

export const READABLE_NON_INTERACTIVE_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption';

let activeSpeakSession = 0;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let speechUnlocked = false;

/** Whether the browser supports speech synthesis */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function speechLang(lang: Language): string {
  // en-US has far wider voice support than en-IN on macOS/iOS
  return lang === 'hi' ? 'hi-IN' : 'en-US';
}

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}

function pickVoice(lang: Language): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  if (voices.length === 0) return undefined;

  const preferred = speechLang(lang);
  const prefix = lang === 'hi' ? 'hi' : 'en';

  return (
    voices.find((v) => v.lang === preferred) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    voices.find((v) => v.default) ??
    voices[0]
  );
}

function clampRate(rate: number): number {
  return Math.min(RATE_MAX, Math.max(RATE_MIN, rate));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function clearKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function startKeepAlive(sessionId: number): void {
  clearKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (sessionId !== activeSpeakSession) {
      clearKeepAlive();
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, KEEPALIVE_MS);
}

/** Wait for async voice list (Chrome loads voices after first interaction) */
function whenVoicesReady(cb: () => void): void {
  if (getVoices().length > 0) {
    cb();
    return;
  }

  const synth = window.speechSynthesis;
  const onVoices = (): void => {
    synth.removeEventListener('voiceschanged', onVoices);
    cb();
  };

  synth.addEventListener('voiceschanged', onVoices);
  window.setTimeout(() => {
    synth.removeEventListener('voiceschanged', onVoices);
    cb();
  }, 300);
}

/**
 * Unlock speech output using a user gesture (click/tap).
 * Browsers block hover-triggered TTS without prior activation.
 */
export function primeSpeechUnlock(lang: Language): void {
  if (!isSpeechSupported()) return;

  speechUnlocked = true;
  warmUpSpeechVoices();

  const utterance = new SpeechSynthesisUtterance(' ');
  utterance.volume = 0.01;
  utterance.lang = speechLang(lang);
  utterance.rate = 1;

  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

/** Split long passages so Chrome/Safari TTS does not stall mid-utterance */
function chunkText(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const parts = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    const next = current ? `${current} ${part}` : part;
    if (next.length > SPEAK_CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = part.trim();
    } else {
      current = next.trim();
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [normalized];
}

/** Whether the event target is (or is inside) a clickable host control */
export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('#accessshield-widget')) return true;

  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (interactive) return true;

  const el = target as HTMLElement;
  if (el.tabIndex >= 0 || el.isContentEditable) return true;

  return false;
}

/** Nearest non-interactive block with readable text for hover/tap-to-read */
export function readableBlockFromTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('#accessshield-widget')) return null;
  if (isInteractiveElement(target)) return null;

  const block = target.closest(READABLE_NON_INTERACTIVE_SELECTOR) as HTMLElement | null;
  if (!block || isInteractiveElement(block)) return null;

  const text = normalizeText(block.innerText);
  return text.length > 0 ? block : null;
}

export interface SpeakOptions {
  lang: Language;
  rate: number;
  /** Set when triggered without a fresh click (hover). Shows unlock hint if blocked. */
  needsUnlock?: boolean;
}

/** Speak text aloud using the Web Speech API (chunked for browser reliability) */
export function speakText(
  text: string,
  options: SpeakOptions,
  onEnd?: () => void,
  onBlocked?: () => void,
  onStart?: () => void,
): boolean {
  if (!isSpeechSupported()) return false;

  if (options.needsUnlock && !speechUnlocked) {
    onBlocked?.();
    return false;
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) return false;

  const sessionId = ++activeSpeakSession;
  clearKeepAlive();
  window.speechSynthesis.cancel();

  const chunkRetries = new Map<number, number>();

  const speakChunk = (index: number): void => {
    if (sessionId !== activeSpeakSession) return;

    const chunk = chunks[index];
    if (!chunk) {
      clearKeepAlive();
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = speechLang(options.lang);
    utterance.rate = clampRate(options.rate);

    const voice = pickVoice(options.lang);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (sessionId !== activeSpeakSession) return;
      if (index === 0) onStart?.();
      startKeepAlive(sessionId);
    };

    utterance.onend = () => {
      if (sessionId !== activeSpeakSession) return;
      speakChunk(index + 1);
    };

    utterance.onerror = (event) => {
      if (sessionId !== activeSpeakSession) return;

      const err = event.error;
      const retries = chunkRetries.get(index) ?? 0;

      if ((err === 'canceled' || err === 'interrupted') && retries < CHUNK_RETRY_MAX) {
        chunkRetries.set(index, retries + 1);
        window.setTimeout(() => speakChunk(index), 120);
        return;
      }

      if (err === 'not-allowed') {
        speechUnlocked = false;
        clearKeepAlive();
        onBlocked?.();
        return;
      }

      if (index + 1 < chunks.length) {
        speakChunk(index + 1);
      } else {
        clearKeepAlive();
        onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);

    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
  };

  whenVoicesReady(() => {
    if (sessionId !== activeSpeakSession) return;
    window.setTimeout(() => {
      if (sessionId !== activeSpeakSession) return;
      speakChunk(0);
    }, 80);
  });

  return true;
}

/** Stop any in-progress speech */
export function stopSpeaking(): void {
  activeSpeakSession += 1;
  clearKeepAlive();
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** Extract readable text from the host page (excludes widget chrome) */
export function extractPageText(): string {
  const root =
    document.getElementById('main-content') ??
    document.querySelector('main') ??
    document.querySelector('[role="main"]') ??
    document.body;

  const clone = root.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      '#accessshield-widget, script, style, noscript, [data-accessshield], [aria-hidden="true"]',
    )
    .forEach((el) => el.remove());

  return normalizeText(clone.innerText);
}

/** Text from current selection, if any */
export function extractSelectionText(): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';
  return normalizeText(selection.toString());
}

/** Preload voices (Chrome loads voices asynchronously) */
export function warmUpSpeechVoices(): void {
  if (!isSpeechSupported()) return;
  getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    getVoices();
  };
}
