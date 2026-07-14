import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Save changes', variant: 'primary' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Secondary: Story = { args: { children: 'Cancel', variant: 'secondary' } };
export const Ghost: Story = { args: { children: 'Learn more', variant: 'ghost' } };
export const Danger: Story = { args: { children: 'Delete', variant: 'danger' } };
export const Loading: Story = { args: { children: 'Submitting', isLoading: true } };
export const Disabled: Story = {
  args: {
    children: 'Unavailable',
    disabled: true,
    disabledReason: 'Complete required fields first',
  },
};
