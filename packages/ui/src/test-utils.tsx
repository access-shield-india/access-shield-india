import '@testing-library/jest-dom';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import type { ReactElement } from 'react';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Configure axe for WCAG 2.2 AA compliance
// Disable color-contrast in Jest (jsdom doesn't support canvas)
// Color contrast is verified via design tokens and Storybook addon-a11y
export const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});

// Custom render function (if needed for providers in the future)
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult =>
  render(ui, { ...options });

export { customRender as render };
