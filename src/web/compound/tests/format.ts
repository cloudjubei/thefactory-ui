/** Compact duration like "920 ms", "1.4 s", "2m 12s". */
export function msToShort(ms?: number | null): string | null {
  if (ms == null) return null
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`
  const m = Math.floor(s / 60)
  const rs = Math.round(s % 60)
  return `${m}m ${rs}s`
}

/** Collapses sorted uncovered-line numbers into ranges, e.g. `3, 7-9, 12`. */
export function formatUncoveredLines(
  lines: number[] | undefined | null,
  options?: { maxSegments?: number },
): string {
  if (!Array.isArray(lines) || lines.length === 0) return '—'

  const sorted = Array.from(
    new Set(
      lines
        .filter((n) => Number.isFinite(n))
        .map((n) => Math.trunc(n))
        .filter((n) => n > 0),
    ),
  ).sort((a, b) => a - b)

  if (sorted.length === 0) return '—'

  type Seg = { start: number; end: number }
  const segments: Seg[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]
    if (n === prev + 1) {
      prev = n
      continue
    }
    segments.push({ start, end: prev })
    start = n
    prev = n
  }
  segments.push({ start, end: prev })

  const maxSegments = options?.maxSegments
  const limited =
    typeof maxSegments === 'number' && maxSegments > 0 ? segments.slice(0, maxSegments) : segments
  const parts = limited.map((s) => (s.start === s.end ? String(s.start) : `${s.start}-${s.end}`))

  const hasMore = segments.length > limited.length
  return hasMore ? `${parts.join(', ')}…` : parts.join(', ')
}

export function pctColorClass(p: number): string {
  if (p >= 90) return 'text-green-700 dark:text-green-300'
  if (p >= 75) return 'text-amber-700 dark:text-amber-300'
  if (p >= 50) return 'text-orange-700 dark:text-orange-300'
  return 'text-red-700 dark:text-red-300'
}

export function pctBarClass(p: number): string {
  if (p >= 90) return 'bg-green-500'
  if (p >= 75) return 'bg-amber-500'
  if (p >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

/** Strips a leading `./` and prefers `src/...` when present. */
export function normalizeRel(p: string): string {
  const out = p.replace(/\\/g, '/').replace(/^\.[/\\]/, '')
  const m = out.match(/(?:^|.*?)(src\/.*)$/)
  if (m && m[1]) return m[1]
  return out.replace(/^\//, '')
}

export function getFilename(p: string): string {
  const parts = p.split('/')
  return parts[parts.length - 1]
}
export function getDirname(p: string): string {
  const parts = p.split('/')
  parts.pop()
  return parts.join('/')
}

/**
 * Pattern matching common test-runner config files: Playwright, Cypress,
 * Vitest, Jest, Karma, Nightwatch, Web Test Runner, WebdriverIO, Protractor,
 * plus the conventional `*.e2e.config.*` / `*.test.config.*` / `*.spec.config.*`.
 *
 * Both the backend (Fastify route) and the desktop renderer (against its
 * client-side file index) apply the same regex so the "Detected:" chips
 * surface the same candidates regardless of host.
 */
export const TEST_CONFIG_PATTERN: RegExp =
  /(^|\/)(playwright|cypress|vitest|jest|karma|nightwatch|web-test-runner|wdio|protractor)([.-][^/]*)?\.(config|conf)\.(ts|tsx|js|cjs|mjs|json)$|(^|\/)([^/]+\.(e2e|test|spec)\.config\.(ts|tsx|js|cjs|mjs))$/i

/** Convenience predicate around `TEST_CONFIG_PATTERN`. */
export function isTestConfigPath(relPath: string): boolean {
  return TEST_CONFIG_PATTERN.test(relPath)
}
