import type { ReviewEvidenceRef } from '../../src/headless/api/generated'
import {
  runThroughReport,
  signoffProofRows,
  signoffReportView,
  type EvidenceTile,
  type ReviewTabId,
  type RunThroughReportView,
  type SignoffReportView,
} from 'thefactory-ui/headless'
import type { FixtureRoutes } from './onFixtures'

export const RUN_THROUGH_PROJECT = 'hot-seat'
const RUN = 'tester-run'
const MIXED_VIDEO = new URL('./assets/run-through-mixed.webm', import.meta.url).href
const STOPPED_VIDEO = new URL('./assets/run-through-stopped.webm', import.meta.url).href

/** The run-through's recordings, answered in the page from the bundled fake sessions. */
export const RUN_THROUGH_ROUTES: FixtureRoutes = {
  'POST /api/v1/projects/{projectId}/review-evidence/{evidenceId}/media-url': ({ evidenceId }) => ({
    url: evidenceId === 'rt-video-stopped' ? STOPPED_VIDEO : MIXED_VIDEO,
    expiresAt: '2999-01-01T00:00:00.000Z',
  }),
}

export type Shot = 'board' | 'tooltip' | 'frozen' | 'result'

/** A still of the fake game, as the tester's screenshot of it — base64, which every Image reads as is. */
export function shot(kind: Shot): string {
  const W = 320
  const H = 200
  const svg = (body: string) => {
    const bytes = new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${body}</svg>`,
    )
    return `data:image/svg+xml;base64,${btoa(String.fromCharCode(...bytes))}`
  }
  const text = (
    x: number,
    y: number,
    size: number,
    fill: string,
    value: string,
    anchor = 'start',
  ) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-family="sans-serif">${value}</text>`
  if (kind === 'result') {
    return svg(
      `<rect width="${W}" height="${H}" fill="#111827"/>${text(160, 58, 16, '#f9fafb', 'Player 1 wins', 'middle')}${text(100, 112, 34, '#60a5fa', '0', 'middle')}${text(160, 110, 18, '#9ca3af', '–', 'middle')}${text(220, 112, 34, '#f87171', '0', 'middle')}<rect x="120" y="146" width="80" height="24" rx="4" fill="#374151"/>${text(160, 162, 10, '#e5e7eb', 'Play again', 'middle')}`,
    )
  }
  let cells = ''
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 10; c++) {
      const hill = (r === 1 && c > 5 && c < 9) || (r === 2 && c === 7)
      const water = (r === 4 && c < 3) || (r === 5 && c < 2)
      const fill = water ? '#5b8fb9' : hill ? '#8a7650' : (r + c) % 2 ? '#6f9a52' : '#78a35a'
      cells += `<rect x="${12 + c * 27}" y="${34 + r * 24}" width="26" height="23" fill="${fill}"/>`
    }
  }
  const unit = (x: number, y: number, colour: string, letter: string) =>
    `<circle cx="${x}" cy="${y}" r="8" fill="${colour}" stroke="#fff" stroke-width="1.5"/>${text(x, y + 3, 8, '#fff', letter, 'middle')}`
  const units =
    unit(52, 70, '#2563eb', 'K') +
    unit(106, 118, '#2563eb', 'S') +
    unit(214, 70, '#dc2626', 'A') +
    unit(241, 142, '#dc2626', 'S')
  const turn = kind === 'frozen' ? 3 : kind === 'tooltip' ? 2 : 1
  const top = `<rect width="${W}" height="26" fill="#1f2937"/>${text(12, 17, 10, '#e5e7eb', `Turn ${turn} · Player ${kind === 'board' ? 1 : 2}`)}<rect x="244" y="174" width="66" height="20" rx="4" fill="#f59e0b"/>${text(277, 188, 9, '#111', 'End turn', 'middle')}`
  const extra =
    kind === 'board'
      ? '<circle cx="79" cy="70" r="8" fill="#2563eb" opacity=".45"/><path d="M60 70h12" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 2"/>'
      : kind === 'tooltip'
        ? `<rect x="196" y="128" width="112" height="58" rx="4" fill="#111827" opacity=".94"/>${text(204, 144, 9, '#fff', 'Spearman')}${text(204, 158, 8, '#9ca3af', 'Moves 2 · Attack 3')}${text(204, 171, 8, '#9ca3af', 'Defence 4')}`
        : '<path d="M214 70 L241 142" stroke="#fde047" stroke-width="2"/><rect x="12" y="34" width="270" height="144" fill="#000" opacity=".18"/>'
  return svg(`<rect width="${W}" height="${H}" fill="#273325"/>${top}${cells}${units}${extra}`)
}

const tile = (
  ref: Partial<ReviewEvidenceRef> & Pick<ReviewEvidenceRef, 'id'>,
  dataUri?: string,
): EvidenceTile => ({
  ref: {
    runId: RUN,
    projectId: RUN_THROUGH_PROJECT,
    kind: 'report',
    path: `${ref.id}.md`,
    mediaType: 'text/markdown',
    bytes: 1,
    createdAt: Date.UTC(2026, 10, 19, 9),
    ...ref,
  },
  caption: ref.id,
  ...(dataUri ? { dataUri } : {}),
})

const SCENARIO = 'Play a full hot-seat game, from the menu to the result screen'

const issue = (
  id: string,
  fields: NonNullable<ReviewEvidenceRef['issue']>,
  picture?: Shot,
): EvidenceTile =>
  picture
    ? tile(
        { id, kind: 'screenshot', mediaType: 'image/svg+xml', path: `${id}.svg`, issue: fields },
        shot(picture),
      )
    : tile({ id, issue: fields })

const TURN = issue(
  'turn',
  {
    severity: 'major',
    title: 'Turn passes before the move finishes',
    happened:
      'Pressed End turn while player 1’s knight was still sliding; the turn went to player 2 and the knight stopped half way.',
    expected: 'The turn passes once the move has finished.',
    doing: 'Ending player 1’s first turn',
    view: '/game/hotseat',
    at: 94,
  },
  'board',
)
const SCORE = issue(
  'score',
  {
    severity: 'major',
    title: 'Result screen shows 0 to 0',
    happened: 'Player 1 won on turn 9, but the result screen showed 0 points for both sides.',
    expected: 'The points each side scored.',
    doing: 'Reading the result',
    view: '/game/result',
    at: 431,
  },
  'result',
)
const TIP = issue(
  'tip',
  {
    severity: 'minor',
    title: 'Unit tooltip covers End turn',
    happened: 'Hovering a unit near the bottom right opened its tooltip over the End turn button.',
    doing: 'Ending player 2’s second turn',
    view: '/game/hotseat',
    at: 201,
  },
  'tooltip',
)
const TITLE = issue('title', {
  severity: 'nit',
  title: 'Menu says “Hotseat”',
  happened: 'The menu button reads “Hotseat”; the rest of the game says “hot-seat”.',
  view: '/menu',
  at: 8,
})
const FREEZE = issue(
  'freeze',
  {
    severity: 'blocker',
    title: 'Board stops responding after an attack',
    happened:
      'Player 2’s archer attacked from the hill. The board froze: no clicks or keys did anything for 60 seconds.',
    expected: 'The attack resolves and player 2 carries on.',
    doing: 'Attacking with player 2’s archer',
    view: '/game/hotseat',
    at: 268,
  },
  'frozen',
)

const record = (sections: NonNullable<ReviewEvidenceRef['runThroughSections']>) =>
  tile({ id: 'rt-record', runThroughSections: sections })

const video = (id: string) =>
  tile({ id, kind: 'recording', mediaType: 'video/webm', path: `${id}.webm`, bytes: 27_475 })

export type RunThroughCase = 'clean' | 'mixed' | 'stopped' | 'unrecorded'

const FILINGS: Record<RunThroughCase, { filings: EvidenceTile[]; recordings: EvidenceTile[] }> = {
  clean: {
    filings: [
      record({
        scenario: SCENARIO,
        reachedEnd: true,
        summary:
          'Played all 9 turns for both players and read the result screen. Nothing looked wrong.',
      }),
    ],
    recordings: [video('rt-video')],
  },
  mixed: {
    filings: [
      record({
        scenario: SCENARIO,
        reachedEnd: true,
        summary:
          'Played all 9 turns and read the result screen. The turn passes too early and the result shows no points.',
      }),
      TITLE,
      TIP,
      SCORE,
      TURN,
    ],
    recordings: [video('rt-video')],
  },
  stopped: {
    filings: [
      record({
        scenario: SCENARIO,
        reachedEnd: false,
        stoppedAt: 'turn 3, player 2’s attack',
        summary:
          'The board stopped responding when player 2 attacked on turn 3, so the game could not be finished.',
      }),
      TIP,
      FREEZE,
    ],
    recordings: [video('rt-video-stopped')],
  },
  unrecorded: {
    filings: [
      record({
        scenario: SCENARIO,
        reachedEnd: true,
        summary: 'Played all 9 turns and read the result screen. The session was not recorded.',
      }),
      TIP,
      TURN,
    ],
    recordings: [],
  },
}

/** Each case as the sign-off reads it, through the same function the app uses. */
export function runThroughView(which: RunThroughCase): RunThroughReportView {
  const { filings, recordings } = FILINGS[which]
  const view = runThroughReport(filings, recordings)
  if (!view) throw new Error(`No run-through for ${which}`)
  return view
}

/** The tabs beside it on the sign-off. */
export const RUN_THROUGH_TABS: readonly ReviewTabId[] = [
  'report',
  'tests',
  'build',
  'code-review',
  'walkthrough',
  'runthrough',
]

/** The sign-off's report with the run-through's line in How it was proven. */
export function runThroughReportView(which: RunThroughCase): SignoffReportView {
  const runThrough = runThroughView(which)
  const passed = { state: 'passed' as const, detail: '' }
  return signoffReportView({
    report: {
      ref: {
        reportSections: {
          outcome: {
            headline: 'Hot-seat games run from the menu to the result screen',
            detail:
              'Two people can now play one game on the same screen: the menu starts a hot-seat match, turns pass between the players, and the match ends on the result screen.',
          },
          howProven: [],
          decisions: ['End turn waits for the move to finish'],
          needsYou: [],
        },
      },
    },
    featureCount: 3,
    criteriaCount: 7,
    criteriaMet: undefined,
    featuresDelivered: { done: 3, total: 3 },
    took: { duration: '1h 42m', cost: '$4.80' },
    tabs: RUN_THROUGH_TABS,
    proof: signoffProofRows({
      checks: [
        { id: 'build', label: 'Build', ...passed },
        { id: 'types', label: 'Types', ...passed },
        { id: 'lint', label: 'Lint', ...passed },
      ],
      testTotals: { total: 1284, passed: 1284, failed: 0, skipped: 0 },
      codeReview: {
        word: 'Approved',
        line: 'the turn order and result screen read cleanly',
        check: 'passed',
      },
      walkthrough: { word: 'Recorded', line: 'menu to result screen', check: 'passed' },
      verify: [],
      runThrough: runThrough.proof,
      tabs: RUN_THROUGH_TABS,
    }),
  })
}
