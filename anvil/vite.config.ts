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
      // Raised in Phase 2 now that there's real logic to measure (the
      // virtual file system's store, helpers, and tree UI) — set a few
      // points below the actual numbers (~93/86/95/93 as of Phase 2),
      // not equal to them, so a normal future change doesn't fail CI
      // over noise. Will keep climbing phase over phase; a dedicated
      // gap-closing pass (mirroring form-builder's Phase 6) is Phase 9.
      thresholds: {
        statements: 88,
        branches: 80,
        functions: 90,
        lines: 88,
      },
    },
  },
})
