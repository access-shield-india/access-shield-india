import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Select } from './Select';

const options = [
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
];

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Single: Story = {
  args: { label: 'Language', options, placeholder: 'Choose language' },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const MultiSelect: Story = {
  args: { label: 'Languages', options, multiple: true, searchable: true, values: ['en'] },
};
