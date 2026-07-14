import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Critical: Story = {
  args: { severity: 'critical' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Serious: Story = { args: { severity: 'serious' } };
export const Moderate: Story = { args: { severity: 'moderate' } };
export const Minor: Story = { args: { severity: 'minor' } };
export const Default: Story = { args: { variant: 'default', label: 'WCAG 2.2' } };
