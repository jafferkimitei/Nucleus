/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['node_modules', 'dist', 'e2e', '.git'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/test/**',
      ],
      // Raised in Phase 6 (test coverage pass) from the original
      // 80/75/80/80 floor once the gap audit brought the real numbers to
      // ~98/93/99/98 — see the README's Phase 6 case study for what
      // closed and what was deliberately left as an accepted gap
      // (defensive/unreachable branches, DnD-only styling, and code the
      // Playwright suite already exercises end-to-end). Set a few points
      // below the actual numbers, not equal to them, so a normal future
      // change doesn't fail CI over noise.
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
})
