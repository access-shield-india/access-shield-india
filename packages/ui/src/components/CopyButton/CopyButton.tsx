'use client';

import { useCallback, useState } from 'react';
import { cn, focusRing } from '../../lib/cn';
import { getButtonStyle, getButtonThemeClassName } from '../Button/buttonTheme';
import { CheckIcon, CopyIcon } from '../../lib/icons';

export interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export function CopyButton({
  text,
  label = 'Copy to clipboard',
  className,
  size = 'sm',
  variant = 'outline',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        data-as-btn={variant}
        onClick={() => void handleCopy()}
        aria-label={label}
        className={cn(getButtonThemeClassName(variant, size), focusRing, className)}
        style={getButtonStyle(variant)}
      >
        {copied ? (
          <CheckIcon size={16} aria-hidden="true" />
        ) : (
          <CopyIcon size={16} aria-hidden="true" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied!' : ''}
      </span>
    </div>
  );
}

CopyButton.displayName = 'CopyButton';
