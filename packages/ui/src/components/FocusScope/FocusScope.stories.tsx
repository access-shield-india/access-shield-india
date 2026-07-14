import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Button } from '../Button';
import { Input } from '../Input';
import { FocusScope } from './FocusScope';

const meta: Meta<typeof FocusScope> = {
  title: 'Components/FocusScope',
  component: FocusScope,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FocusScope>;

export const Default: Story = {
  render: () => (
    <FocusScope className="rounded-lg border border-border p-4">
      <p className="mb-4 text-sm text-text-secondary">Focus is trapped within this region.</p>
      <div className="space-y-4">
        <Input label="Name" />
        <Button>Submit</Button>
      </div>
    </FocusScope>
  ),
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
