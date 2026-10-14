import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Alias } from 'vite'

// The Factory serves the playground on the port it passes in PORT (see `factory.webApp` in package.json).
const port = Number(process.env.PORT) || 5174

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const src = (path: string) => resolve(repoRoot, 'src', path)

/**
 * thefactory-tools is linked from a sibling checkout (`file:../thefactory-tools`). In a throwaway
 * git worktree — where the Factory builds the playground — that relative link points at nothing, so
 * when it does not resolve, look for it in THEFACTORY_TOOLS_DIR or beside the main checkout and alias
 * its exports.
 */
function thefactoryToolsAliases(): Alias[] {
  try {
    createRequire(import.meta.url).resolve('thefactory-tools/package.json')
    return []
  } catch {
    // fall through to the sibling checkout
  }
  // THEFACTORY_TOOLS_DIR may also come from a git-ignored `.env.local` at the repository root.
  const fromEnv =
    process.env.THEFACTORY_TOOLS_DIR ?? loadEnv('', repoRoot, 'THEFACTORY_').THEFACTORY_TOOLS_DIR
  const candidates = [fromEnv, resolve(repoRoot, '../thefactory-tools')]
  try {
    const commonDir = execFileSync(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    ).trim()
    candidates.push(resolve(dirname(commonDir), '../thefactory-tools'))
  } catch {
    // not a git checkout
  }
  const dir = candidates.find((c) => c && existsSync(resolve(c, 'package.json')))
  if (!dir) return []
  const exportsMap: Record<string, string | { import?: string; default?: string }> =
    JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')).exports ?? {}
  return Object.entries(exportsMap).flatMap(([subpath, target]) => {
    const file = typeof target === 'string' ? target : (target.import ?? target.default)
    if (!file || subpath.includes('*')) return []
    const name = subpath === '.' ? 'thefactory-tools' : `thefactory-tools/${subpath.slice(2)}`
    return [{ find: new RegExp(`^${name}$`), replacement: resolve(dir, file) }]
  })
}

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  // The playground renders the library from source, so it builds without a `tsup` pass
  // (whose declaration build needs thefactory-tools' types) and always shows the code as it stands.
  resolve: {
    alias: [
      { find: /^thefactory-ui\/web\/styles$/, replacement: src('web/styles/index.css') },
      { find: /^thefactory-ui\/web$/, replacement: src('web/index.ts') },
      { find: /^thefactory-ui\/headless$/, replacement: src('headless/index.ts') },
      ...thefactoryToolsAliases(),
    ],
  },
  server: {
    port: 5174,
  },
  preview: {
    port,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
