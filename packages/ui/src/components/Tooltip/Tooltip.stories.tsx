import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Button } from '../Button';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Tooltip content="WCAG 2.2 AA compliance score">
      <Button variant="ghost">Hover for info</Button>
    </Tooltip>
  ),
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
