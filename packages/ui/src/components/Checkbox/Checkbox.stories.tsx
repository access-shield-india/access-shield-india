import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Checkbox, CheckboxGroup } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: { label: 'Enable email notifications', hint: 'Receive scan completion alerts' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Indeterminate: Story = { args: { label: 'Select all', indeterminate: true } };

export const Group: Story = {
  render: () => (
    <CheckboxGroup legend="Notification preferences" hint="Choose how you want to be notified">
      <Checkbox label="Email" defaultChecked />
      <Checkbox label="SMS" />
      <Checkbox label="WhatsApp" />
    </CheckboxGroup>
  ),
};
