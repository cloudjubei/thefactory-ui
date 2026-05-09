import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

const here = dirname(fileURLToPath(import.meta.url))
const stylesSrc = resolve(here, 'src/web/styles')
const stylesOut = resolve(here, 'dist/styles')

// Path is relative to dist/styles/index.css → resolves to
// node_modules/thefactory-ui/dist/**/*.{js,mjs} in any consumer.
const SOURCE_DIRECTIVE = `/* Tailwind v4: discover class names emitted by this package's compiled output. */\n@source "../**/*.{js,mjs}";\n\n`

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'tokens/index': 'src/tokens/index.ts',
    'headless/index': 'src/headless/index.ts',
    'web/index': 'src/web/index.ts',
    'web/icons/index': 'src/web/icons/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: true,
  treeshake: true,
  external: ['react', 'react-dom', 'react-native'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
  async onSuccess() {
    rmSync(stylesOut, { recursive: true, force: true })
    mkdirSync(stylesOut, { recursive: true })
    cpSync(stylesSrc, stylesOut, { recursive: true })
    const indexCss = resolve(stylesOut, 'index.css')
    writeFileSync(indexCss, SOURCE_DIRECTIVE + readFileSync(indexCss, 'utf8'))
  },
})
