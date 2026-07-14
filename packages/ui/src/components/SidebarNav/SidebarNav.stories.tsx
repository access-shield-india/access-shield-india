import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { SidebarNav } from './SidebarNav';

const meta: Meta<typeof SidebarNav> = {
  title: 'Components/SidebarNav',
  component: SidebarNav,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SidebarNav>;

export const Default: Story = {
  args: {
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', current: true },
      { id: 'scans', label: 'Scans', href: '/scans' },
      { id: 'issues', label: 'Issues', href: '/issues' },
      { id: 'reports', label: 'Reports', href: '/reports' },
      { id: 'settings', label: 'Settings', href: '/settings' },
    ],
  },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
