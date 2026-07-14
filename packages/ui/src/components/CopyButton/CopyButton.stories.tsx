import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { CopyButton } from './CopyButton';

const meta: Meta<typeof CopyButton> = {
  title: 'Components/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: { text: 'https://accessshield.in/scan/abc123', label: 'Copy scan link' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
