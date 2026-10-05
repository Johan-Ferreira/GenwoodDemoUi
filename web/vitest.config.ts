import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Page-level integration tests type into fields with userEvent; under load
    // (parallel files, concurrent build) the 5 s default produces false timeouts.
    testTimeout: 15000,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/__tests__/**/*.[jt]s?(x)',
      'src/**/?(*.)+(test).[jt]s?(x)',
    ],
    // `__tests__/helpers/` holds shared mock-data factories imported BY tests, not
    // test suites themselves — excluding them keeps Vitest from failing on the
    // "No test suite found" error for a helper-only module.
    exclude: [
      'node_modules/',
      '**/*.spec.[jt]s',
      'src/**/__tests__/helpers/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
