import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Breadcrumb } from './Breadcrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Scans', href: '/scans' },
      { label: 'Scan #1247', current: true },
    ],
  },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
