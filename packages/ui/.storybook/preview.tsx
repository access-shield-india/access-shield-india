import type { Preview } from '@storybook/react';
import '../src/styles.css';
import { AnnouncerProvider } from '../src/hooks/useAnnounce';
import { TooltipProvider } from '../src/components/Tooltip';

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'todo',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <AnnouncerProvider>
        <TooltipProvider>
          <div className="font-sans p-4 text-text-primary">
            <Story />
          </div>
        </TooltipProvider>
      </AnnouncerProvider>
    ),
  ],
};

export default preview;
