'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary, useLocale } from '@/lib/i18n/locale-context';
import { localizedHref } from '@/lib/i18n/paths';

/** Normalises "example.in" to "https://example.in"; returns null when not a valid http(s) URL. */
export function normaliseScanUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Hero URL box — hands the visitor's site to the free scan page so value shows in one step. */
export function HeroScanInput() {
  const router = useRouter();
  const locale = useLocale();
  const { home } = useDictionary();
  const copy = home.heroScan;
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalised = normaliseScanUrl(url);
    if (!normalised) {
      setError(copy.invalidUrl);
      return;
    }
    setError('');
    router.push(`${localizedHref('/scan', locale)}?url=${encodeURIComponent(normalised)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto mt-10 w-full max-w-xl lg:mx-0">
      <label htmlFor={inputId} className="block text-base font-semibold text-text-primary">
        {copy.label}
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder={copy.placeholder}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          className="min-h-[44px] flex-1 rounded-md border-2 border-border bg-white px-4 text-base text-text-primary placeholder:text-text-tertiary focus-visible:border-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-md bg-primary-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          {copy.submit}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-error-700">
          {error}
        </p>
      )}
      <p id={hintId} className="mt-2 text-sm text-text-secondary">
        {copy.hint}
      </p>
    </form>
  );
}
