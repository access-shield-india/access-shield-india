import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { ScoreRing } from './ScoreRing';

const meta: Meta<typeof ScoreRing> = {
  title: 'Components/ScoreRing',
  component: ScoreRing,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ScoreRing>;

export const High: Story = {
  args: { score: 87 },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Medium: Story = { args: { score: 62 } };
export const Low: Story = { args: { score: 34 } };
