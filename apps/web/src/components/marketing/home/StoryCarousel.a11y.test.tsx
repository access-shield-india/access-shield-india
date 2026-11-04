import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { expectNoAxeViolations } from '@/test/a11y/marketing-test-utils';
import { StoryCarousel, wrapIndex } from './StoryCarousel';

function renderCarousel(locale: 'en' | 'hi' = 'en') {
  return render(
    <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
      <StoryCarousel />
    </LocaleProvider>,
  );
}

describe('wrapIndex', () => {
  it('wraps forwards and backwards', () => {
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(2, 5)).toBe(2);
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe('StoryCarousel', () => {
  it('has no axe violations', async () => {
    const { container } = renderCarousel();
    await expectNoAxeViolations(container);
  });

  it('starts paused when the user prefers reduced motion', () => {
    renderCarousel();
    expect(screen.getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
  });

  it('toggles between play and pause', () => {
    renderCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
    expect(screen.getByRole('button', { name: 'Pause slideshow' })).toBeInTheDocument();
  });

  it('moves to the next and previous story, wrapping around', () => {
    renderCarousel();
    expect(screen.getByRole('group', { name: '1 of 5' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next story' }));
    expect(screen.getByRole('group', { name: '2 of 5' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous story' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous story' }));
    expect(screen.getByRole('group', { name: '5 of 5' })).toBeInTheDocument();
  });

  it('marks the active dot and jumps to a chosen story', () => {
    renderCarousel();
    const dot = screen.getByRole('button', { name: /Show story 3:/ });
    fireEvent.click(dot);
    expect(dot).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('group', { name: '3 of 5' })).toBeInTheDocument();
  });

  it('renders Hindi copy for the hi locale', () => {
    renderCarousel('hi');
    expect(screen.getByRole('button', { name: 'स्लाइडशो चलाएँ' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '5 में से 1' })).toBeInTheDocument();
  });
});
