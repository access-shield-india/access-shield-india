import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    heading: 'Latest scan results',
    description: 'Completed on 9 June 2026',
    children: <p className="text-sm text-text-secondary">87% WCAG 2.2 AA compliance</p>,
  },
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};

export const Article: Story = {
  args: {
    as: 'article',
    heading: 'RPwD Act compliance guide',
    headingLevel: 2,
    children: <p className="text-sm">Understanding your legal obligations under Indian law.</p>,
  },
};
