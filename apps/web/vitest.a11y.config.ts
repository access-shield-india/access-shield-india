import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()] as UserConfig['plugins'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts', './src/test/a11y/marketing-mocks.tsx'],
    include: ['src/**/*.a11y.test.{ts,tsx}'],
    testTimeout: 30000,
  },
});
