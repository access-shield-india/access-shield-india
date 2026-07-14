import type { Meta, StoryObj } from '@storybook/react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { SkipLink } from './SkipLink';

const meta: Meta<typeof SkipLink> = {
  title: 'Components/SkipLink',
  component: SkipLink,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SkipLink>;

export const Default: Story = {
  render: () => (
    <>
      <SkipLink />
      <main id="main-content" className="mt-4 p-4">
        <h1>Page content</h1>
        <p>Tab to the skip link to test focus visibility.</p>
      </main>
    </>
  ),
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
