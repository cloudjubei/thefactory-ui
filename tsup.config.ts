import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

const here = dirname(fileURLToPath(import.meta.url))
const stylesSrc = resolve(here, 'src/web/styles')
const stylesOut = resolve(here, 'dist/styles')
const nativeStylesSrc = resolve(here, 'src/native/styles')
const nativeStylesOut = resolve(here, 'dist/native/styles')

// Tailwind v4 `@source` directive — path is relative to dist/styles/index.css
// → resolves to node_modules/thefactory-ui/dist/**/*.{js,mjs} in any consumer.
// Appended at the END of the bundle (not prepended) because PostCSS strict
// mode flags any non-`@import` statement before an `@import` as "must precede
// other statements", and `@source` counts as a non-import at-rule.
const SOURCE_DIRECTIVE = `\n/* Tailwind v4: discover class names emitted by this package's compiled output. */\n@source "../**/*.{js,mjs}";\n`

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'tokens/index': 'src/tokens/index.ts',
    'headless/index': 'src/headless/index.ts',
    'headless/api/index': 'src/headless/api/index.ts',
    'web/index': 'src/web/index.ts',
    'web/icons/index': 'src/web/icons/index.ts',
    'native/index': 'src/native/index.ts',
    'native/icons/index': 'src/native/icons/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    'react-native',
    'react-native-markdown-display',
    'react-native-svg',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
  async onSuccess() {
    rmSync(stylesOut, { recursive: true, force: true })
    mkdirSync(stylesOut, { recursive: true })
    cpSync(stylesSrc, stylesOut, { recursive: true })
    const indexCss = resolve(stylesOut, 'index.css')
    writeFileSync(indexCss, readFileSync(indexCss, 'utf8') + SOURCE_DIRECTIVE)

    // Native ships only `tokens.css` — NativeWind consumers scan their own
    // app sources, so no `@source` directive is appended here.
    rmSync(nativeStylesOut, { recursive: true, force: true })
    mkdirSync(nativeStylesOut, { recursive: true })
    cpSync(nativeStylesSrc, nativeStylesOut, { recursive: true })
  },
})
