import type { ReviewEvidenceRef } from '../../src/headless/api/generated'
import { groupEvidence, screenPairs } from '../../src/headless/utils/reviewEvidenceView'
import type { EvidenceTile } from '../../src/headless/utils/reviewEvidenceViewTypes'
import type { FixtureRoutes } from './onFixtures'

export const SCREEN_PAIRS_PROJECT = 'screen-pairs-showcase'
export const SCREEN_PAIRS_CAPTURED = '18 November 2026, 09:00 UTC'
export const requestScreenPairImage = () => {}

/** Fixed synthetic screens: no backend, personal content, clock or delayed data. */
function image(title: string, accent: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="400" viewBox="0 0 240 400"><rect width="240" height="400" fill="#f1f5f9"/><rect width="240" height="64" fill="#0f172a"/><text x="16" y="38" fill="white" font-family="sans-serif" font-size="20">${title}</text><rect x="16" y="88" width="208" height="100" rx="8" fill="${accent}"/><rect x="16" y="212" width="176" height="12" rx="6" fill="#64748b"/><rect x="16" y="240" width="144" height="12" rx="6" fill="#94a3b8"/><rect x="16" y="320" width="208" height="48" rx="8" fill="#0f172a"/><text x="84" y="350" fill="white" font-family="sans-serif" font-size="16">Continue</text></svg>`)}`
}

const SUBJECTS = ['Account', 'Checkout', 'Gallery', 'Legacy'] as const
const AT = Date.parse('2026-11-18T09:00:00.000Z')

/**
 * Capture order: Account (identical), Checkout (changed), Gallery (unavailable),
 * Legacy (no comparison). Both phases are loaded at once. The settled strip
 * must be derived by product code, never arranged or classified by the fixture.
 */
export const SCREEN_PAIR_TILES: EvidenceTile[] = SUBJECTS.flatMap((subject, index) => {
  const beforeId = `${subject}-before`
  const beforeImage = image(subject, '#38bdf8')
  const afterImage = subject === 'Checkout' ? image(subject, '#fbbf24') : beforeImage
  return (['before', 'after'] as const).map((phase) => {
    const ref: ReviewEvidenceRef = {
      id: `${subject}-${phase}`,
      runId: 'synthetic-run',
      projectId: SCREEN_PAIRS_PROJECT,
      kind: 'screenshot',
      path: `${subject}-${phase}.svg`,
      mediaType: 'image/svg+xml',
      bytes: 800,
      createdAt: AT + index * 2000 + (phase === 'after' ? 1000 : 0),
      subject,
      phase,
      label: `${subject} — ${phase}`,
      ...(phase === 'after' && subject !== 'Legacy'
        ? {
            comparison: {
              beforeId,
              identical: subject !== 'Checkout',
              changedPixels: subject === 'Checkout' ? 20800 : 0,
              totalPixels: 96000,
              resized: false,
              ...(subject === 'Gallery' ? { unavailable: 'Synthetic comparison unavailable' } : {}),
            },
          }
        : {}),
    }
    return { ref, caption: ref.label!, dataUri: phase === 'before' ? beforeImage : afterImage }
  })
})

/**
 * Settled build-aware fixture: Account has two head attempts (the old one folds),
 * Checkout's before is deliberately from the wrong commit, Gallery is Android,
 * Legacy remains web. Loaded synchronously; identical inputs on both builds.
 */
export function buildAwareScreenPairs() {
  const tiles = SCREEN_PAIR_TILES.map((tile) => ({
    ...tile,
    ref: {
      ...tile.ref,
      build: {
        platform: tile.ref.subject === 'Gallery' ? ('android' as const) : ('web' as const),
        variant: tile.ref.subject === 'Gallery' ? 'debug' : 'desktop',
        sha:
          tile.ref.phase === 'before'
            ? tile.ref.subject === 'Checkout'
              ? 'wrong-base'
              : 'base-commit'
            : 'head-current',
        dirty: false,
      },
    },
  }))
  const account = tiles.find((t) => t.ref.subject === 'Account' && t.ref.phase === 'after')!
  tiles.push({
    ...account,
    ref: {
      ...account.ref,
      id: 'Account-earlier',
      createdAt: account.ref.createdAt - 500,
      build: { ...account.ref.build, sha: 'head-earlier' },
    },
  })
  return screenPairs(groupEvidence(tiles, { baseSha: 'base-commit' }))
}

export function measuredScreenPairs() {
  return screenPairs(groupEvidence(SCREEN_PAIR_TILES))
}

/** Diff rendering is not under test; a request never escapes the page. */
export const SCREEN_PAIR_ROUTES: FixtureRoutes = {
  '/api/v1/projects/{projectId}/review-evidence/diff': () => {
    throw new Error('This fixture supplies filed comparison results, not a rendered pixel diff.')
  },
}
