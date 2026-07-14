import { expect } from '@storybook/test';
import axe from 'axe-core';

/** Run axe-core and assert zero violations in Storybook play functions */
export async function expectNoA11yViolations(element: HTMLElement): Promise<void> {
  const results = await axe.run(element);
  expect(results.violations).toHaveLength(0);
}
