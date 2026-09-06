#!/usr/bin/env node
/**
 * Fails when a React hook is called AFTER an early return in a component.
 *
 * React counts hooks per render, so a hook below `if (loading) return null` runs
 * on some renders and not others — the app then dies with "Rendered more hooks
 * than during the previous render", and the whole screen is gone. TypeScript
 * cannot see this, and this package has no ESLint, so it is checked here and
 * wired into prebuild/pretest beside the uikit-boundary guard.
 *
 * Heuristic, deliberately: it looks only at the top level of a component body
 * (two-space indentation), which is where both early returns and hook calls
 * actually live. Hooks nested inside callbacks or blocks are indented further
 * and are not the failure mode this exists to catch.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

/** A top-level `return`/`if (...) return` inside a component body. */
const EARLY_RETURN = /^ {2}(return\b|if\s*\(.*\)\s*return\b)/
/** A top-level hook call: `const x = useThing(` / `useThing(`. */
const HOOK_CALL = /^ {2}(?:const\s+[[{\w].*?=\s*)?(use[A-Z]\w*)\s*\(/
/**
 * Any line at column 0 ends the previous component's body.
 *
 * Simpler and far more reliable than trying to enumerate declaration forms:
 * `const X = memo(function ...)`, `const Y: FC = () =>` and plain `function Z()`
 * all start components, and missing one produces false positives that make the
 * guard get ignored.
 */
const NEW_TOP_LEVEL = /^\S/

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (full.endsWith('.tsx')) yield full
  }
}

const failures = []
for (const file of walk(SRC)) {
  if (file.includes('.test.')) continue
  const lines = readFileSync(file, 'utf8').split('\n')
  let sawEarlyReturn = 0
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (NEW_TOP_LEVEL.test(line)) {
      sawEarlyReturn = 0
      continue
    }
    if (EARLY_RETURN.test(line)) {
      // The component's FINAL `return (` is not an early return, but treating it
      // as one is harmless: no hook may follow it either.
      if (sawEarlyReturn === 0) sawEarlyReturn = i + 1
      continue
    }
    const hook = HOOK_CALL.exec(line)
    if (hook && sawEarlyReturn > 0) {
      failures.push(
        `${file.replace(SRC, 'src')}:${i + 1}  ${hook[1]}() is called after the early return on line ${sawEarlyReturn}`,
      )
    }
  }
}

if (failures.length > 0) {
  console.error('hook-order: hooks must not run after an early return.\n')
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(
    "\nMove every hook above the component's early returns. A hook that runs on\n" +
      'only some renders crashes the screen with "Rendered more hooks than during\n' +
      'the previous render".',
  )
  process.exit(1)
}
console.log('hook-order: OK')
