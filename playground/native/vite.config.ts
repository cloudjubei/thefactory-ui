import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))
const stub = (name: string) => `${here}stubs/${name}`
const src = (path: string) => fileURLToPath(new URL(`../../src/${path}`, import.meta.url))
const reactNativeWeb = createRequire(import.meta.url).resolve('react-native-web')

/**
 * The native components in a browser, on react-native-web: `npm run playground:native:dev`. What
 * has no web build is stubbed; react-native-svg brings its own.
 */
export default defineConfig({
  root: here,
  base: './',
  plugins: [react()],
  define: { __DEV__: 'false', global: 'globalThis' },
  resolve: {
    dedupe: ['react', 'react-dom'],
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.mjs', '.tsx', '.ts', '.js', '.json'],
    alias: [
      { find: /^react-native$/, replacement: reactNativeWeb },
      { find: /^react-native-gesture-handler$/, replacement: stub('gestureHandler.tsx') },
      { find: /^react-native-markdown-display$/, replacement: stub('markdown.tsx') },
      { find: /^react-native-reanimated$/, replacement: stub('reanimated.tsx') },
      { find: /^react-native-webview$/, replacement: stub('webview.tsx') },
      { find: /^nativewind$/, replacement: stub('nativewind.ts') },
      { find: /^thefactory-ui\/headless$/, replacement: src('headless/index.ts') },
    ],
  },
  server: { port: 5175 },
  preview: { port: 5175, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 20_000 },
})
