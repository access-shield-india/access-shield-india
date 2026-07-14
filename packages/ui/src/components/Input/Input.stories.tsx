import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { label: 'Email address', hint: 'We will never share your email', type: 'email' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Required: Story = { args: { label: 'Full name', required: true } };
export const WithError: Story = {
  args: { label: 'PAN number', error: 'Invalid PAN format', required: true },
};
export const WithCharCount: Story = {
  args: { label: 'Description', showCharCount: true, maxLength: 200, defaultValue: 'Hello' },
};
