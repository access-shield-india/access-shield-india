import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  args: {
    legend: 'Scan depth',
    options: [
      { value: 'quick', label: 'Quick scan', hint: 'Homepage only' },
      { value: 'full', label: 'Full scan', hint: 'All linked pages' },
      { value: 'custom', label: 'Custom', hint: 'Select specific URLs' },
    ],
    defaultValue: 'quick',
  },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
