import type {
  ProcessGroupLeg,
  ProcessGroupRun,
  ProcessRunPublication,
} from 'thefactory-tools/types'
import {
  processGroupLegRows,
  processLegPublishCard,
  processPublishEdits,
  processPublishView,
  type ProcessDeliveryData,
  type ProcessDeliveryRepo,
  type ProcessGroupLegRow,
  type ProcessLegPublish,
  type ProcessLegPublishCard,
  type ProcessPublishEdit,
  type ProcessPublishView,
} from 'thefactory-ui/headless'

const leg = (over: Partial<ProcessGroupLeg> & Pick<ProcessGroupLeg, 'id'>): ProcessGroupLeg => ({
  projectId: over.id,
  storyId: `story-${over.id}`,
  title: 'ABC-321 Weekly review',
  dependsOn: [],
  status: 'running',
  runId: `run-${over.id}`,
  ...over,
})

const DOCS_LEG = leg({ id: 'shop-docs', title: 'ABC-321 Weekly review guide' })
const API_LEG = leg({ id: 'shop-api', title: 'ABC-321 Weekly review endpoint' })

const group = (legs: ProcessGroupLeg[], over: Partial<ProcessGroupRun> = {}): ProcessGroupRun => ({
  id: 'group-run-abc-321',
  groupId: 'shop',
  title: 'ABC-321 Weekly review',
  status: 'running',
  buildMode: 'on-branch',
  legs,
  startedAt: Date.parse('2026-11-19T08:00:00.000Z'),
  updatedAt: Date.parse('2026-11-19T09:00:00.000Z'),
  ...over,
})

const DOCS: ProcessDeliveryRepo = {
  runId: 'run-shop-docs',
  projectId: 'shop-docs',
  legId: 'shop-docs',
  name: 'Shop docs',
  ticket: 'ABC-321',
  branchTemplate: 'feature/{ticket}-{short}',
  short: 'weekly-review',
  prTitle: 'ABC-321 Weekly review guide',
  baseBranch: 'dev',
  account: 'shop-bot (GitHub)',
  changed: true,
}

const API: ProcessDeliveryRepo = {
  ...DOCS,
  runId: 'run-shop-api',
  projectId: 'shop-api',
  legId: 'shop-api',
  name: 'Shop API',
  prTitle: 'ABC-321 Weekly review endpoint',
}

const DOCS_PUBLICATION: ProcessRunPublication = {
  remoteBranch: 'feature/abc-321-weekly-review',
  localBranch: 'feature/abc-321-weekly-review',
  sha: '7c1e9a2b4d6f8a0c2e4f6a8b0c2d4e6f8a0b2c4d',
  onto: '0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c',
  pullRequest: {
    url: 'https://github.com/example/shop-docs/pull/9',
    number: 9,
    provider: 'github',
  },
  status: 'open',
  at: Date.parse('2026-11-19T09:05:00.000Z'),
}

/** The refusal the backend gives a leg asked to publish that does not wait at its gate. */
export const LEG_PUBLISH_REFUSAL =
  'shop-docs does not wait at its publish gate, so there is nothing of it to publish now.'

/** One group run page's legs: the group's rows, its delivery and where the docs leg's own publish stands. */
export type LegPublishState = {
  rows: ProcessGroupLegRow[]
  data: ProcessDeliveryData
  docs?: ProcessLegPublish
  /** The whole group waits to publish: its own card shows above the legs. */
  groupCard?: boolean
}

const rowsOf = (g: ProcessGroupRun): ProcessGroupLegRow[] => processGroupLegRows(g).flat()

const DOCS_READY = group([{ ...DOCS_LEG, status: 'at-publish' }, API_LEG])
const BOTH_READY = group(
  [
    { ...DOCS_LEG, status: 'at-publish' },
    { ...API_LEG, status: 'at-publish' },
  ],
  {
    status: 'parked',
    park: {
      reason: 'publish',
      message: 'Every repo waits to open its pull request.',
      parkedAt: Date.parse('2026-11-19T09:10:00.000Z'),
    } as ProcessGroupRun['park'],
  },
)
const DOCS_PUBLISHED = group([{ ...DOCS_LEG, status: 'at-sign-off' }, API_LEG])

export const LEG_PUBLISH_STATES = {
  'one-ready': { rows: rowsOf(DOCS_READY), data: { repos: [DOCS, API] } },
  publishing: {
    rows: rowsOf(DOCS_READY),
    data: { repos: [DOCS, API] },
    docs: { phase: 'publishing' },
  },
  published: {
    rows: rowsOf(DOCS_PUBLISHED),
    data: { repos: [{ ...DOCS, publication: DOCS_PUBLICATION }, API] },
  },
  refused: {
    rows: rowsOf(DOCS_READY),
    data: { repos: [DOCS, API] },
    docs: { phase: 'refused', error: LEG_PUBLISH_REFUSAL },
  },
  'both-ready': { rows: rowsOf(BOTH_READY), data: { repos: [DOCS, API] }, groupCard: true },
} satisfies Record<string, LegPublishState>

export type LegPublishStateId = keyof typeof LEG_PUBLISH_STATES

/** The card's fields as the host proposes them. */
export const legPublishEdits = (state: LegPublishState): Record<string, ProcessPublishEdit> =>
  processPublishEdits(state.data)

/** A leg's own publish card in a state, as the group run page draws it; undefined for a leg without one. */
export function legPublishCardOf(
  state: LegPublishState,
  row: ProcessGroupLegRow,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
  pressed: boolean,
): ProcessLegPublishCard | undefined {
  if (!row.publishes) return undefined
  const docs: ProcessLegPublish | undefined = pressed ? { phase: 'publishing' } : state.docs
  return processLegPublishCard(
    state.data,
    edits,
    row.leg.projectId,
    row.leg.projectId === DOCS.projectId ? docs : undefined,
  )
}

/** The whole group's publish card, every leg on it. */
export const groupPublishView = (
  state: LegPublishState,
  edits: Readonly<Record<string, ProcessPublishEdit>>,
  pressed: boolean,
): ProcessPublishView => processPublishView(state.data, edits, { publishing: pressed })

/** A leg's published work, once its delivery has one. */
export const legDeliveryOf = (state: LegPublishState, row: ProcessGroupLegRow) =>
  state.data.repos.find((repo) => repo.projectId === row.leg.projectId)
