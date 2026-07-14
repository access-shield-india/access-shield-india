import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expectNoA11yViolations } from '../../../.storybook/a11y-test';
import { Button } from '../Button';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

function ModalDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Confirm scan"
        description="This will start a full WCAG 2.2 AA scan of your website."
      >
        <p className="text-sm text-text-secondary">Estimated duration: 5 minutes</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setOpen(false)}>Start scan</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}

export const Default: Story = {
  render: () => <ModalDemo />,
  play: async ({ canvasElement }) => {
    await expectNoA11yViolations(canvasElement);
  },
};
