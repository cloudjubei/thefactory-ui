import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

export default defineConfig({
  // The playground's showcase tests import the package as the playground does — from source.
  resolve: {
    alias: [
      { find: /^thefactory-ui\/web$/, replacement: src('web/index.ts') },
      { find: /^thefactory-ui\/headless$/, replacement: src('headless/index.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'playground/**/*.test.ts',
      'playground/**/*.test.tsx',
    ],
  },
})
