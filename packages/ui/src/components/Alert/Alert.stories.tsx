import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Error: Story = {
  args: { variant: 'error', title: 'Scan failed', children: 'Unable to reach the target URL.' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Success: Story = {
  args: { variant: 'success', title: 'Scan complete', children: 'Your accessibility score is 87.' },
};
export const Warning: Story = {
  args: { variant: 'warning', children: '3 critical issues require immediate attention.' },
};
export const Dismissible: Story = {
  args: {
    variant: 'info',
    children: 'New IS 17802 rules available.',
    onDismiss: () => {},
    autoDismissMs: 10000,
  },
};
