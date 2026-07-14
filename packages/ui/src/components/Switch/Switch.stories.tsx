import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: { label: 'Auto-scan on deploy', hint: 'Trigger scans when new code is deployed' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
