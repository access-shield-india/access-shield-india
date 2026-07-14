import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    items: [
      { value: 'overview', label: 'Overview', content: <p>Dashboard overview content</p> },
      { value: 'issues', label: 'Issues', content: <p>12 open issues</p> },
      { value: 'reports', label: 'Reports', content: <p>Download compliance reports</p> },
    ],
  },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
