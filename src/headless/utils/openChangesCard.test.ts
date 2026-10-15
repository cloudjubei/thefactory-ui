import { describe, expect, it } from 'vitest'

import type { ChatOpenChanges, ChatOpenChangesCard } from '../api/generated'
import { openChangesCardView } from './openChangesCard'

const at = (ms: number) => `t${ms}`

const openChangesCard = (kind: ChatOpenChangesCard['kind']): ChatOpenChangesCard => ({
  kind,
  runId: 'r1',
  projectId: 'p',
  chatContextId: '/projects/p/topics/t',
  since: 5,
  fileCount: 13,
  ...(kind === 'unfit' ? { changedCount: 5 } : {}),
})

const open = (over: Partial<ChatOpenChanges> = {}): ChatOpenChanges => ({
  runId: 'r2',
  projectId: 'p',
  review: { branch: 'agent/x', baseSha: 'b', landedAt: 5 },
  openSince: 5,
  files: Array.from({ length: 13 }, (_, i) => ({ path: `f${i}.ts`, status: 'modified' as const })),
  changed: [],
  heldRunIds: [],
  ...over,
})

const unfitCard: ChatOpenChangesCard = openChangesCard('unfit')
const waitingCard: ChatOpenChangesCard = openChangesCard('waiting')
const changed = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ path: `f${i}.ts`, reason: 'r' }))

describe('openChangesCardView', () => {
  it('reads the changes before it says anything about them', () => {
    expect(openChangesCardView({ card: unfitCard, openChanges: undefined }, at)).toMatchObject({
      state: 'loading',
      canDiscard: false,
      canRebuild: false,
    })
  })

  it('offers View, Discard and Rebuild while the changes no longer fit, counting them live', () => {
    const view = openChangesCardView(
      { card: unfitCard, openChanges: open({ changed: changed(5) }) },
      at,
    )
    expect(view).toEqual({
      state: 'open',
      title: 'Open changes',
      detail: "This chat's open changes no longer fit your checkout — 5 of 13 files changed since.",
      viewRunId: 'r2',
      canDiscard: true,
      canRebuild: true,
    })
  })

  it('says how long fitting changes have waited, offering no rebuild', () => {
    const view = openChangesCardView({ card: waitingCard, openChanges: open() }, at)
    expect(view.detail).toBe('Waiting for you since t5 · 13 files')
    expect(view).toMatchObject({ state: 'open', canDiscard: true, canRebuild: false })
  })

  it('shows them fitting again once rebuilt, with nothing left to do', () => {
    expect(openChangesCardView({ card: unfitCard, openChanges: open() }, at)).toMatchObject({
      state: 'settled',
      detail: 'They fit your checkout again.',
      canDiscard: false,
      canRebuild: false,
    })
  })

  it('shows how they were decided once they no longer wait', () => {
    const settled = (review?: { mergedAt?: number; rejectedAt?: number }) =>
      openChangesCardView(
        { card: waitingCard, openChanges: null, ...(review ? { cardRunReview: review } : {}) },
        at,
      ).detail
    expect(settled({ rejectedAt: 1 })).toBe('Discarded.')
    expect(settled({ mergedAt: 1 })).toBe('Merged.')
    expect(settled()).toBe('No longer waiting.')
  })

  it('holds its actions while one runs, and names the files a rebuild could not merge', () => {
    const view = openChangesCardView(
      {
        card: unfitCard,
        openChanges: open({ changed: changed(2) }),
        busy: 'rebuilding',
        conflicts: [
          { path: 'a.ts', reason: 'same lines' },
          { path: 'b.ts', reason: 'same lines' },
        ],
        error: 'Nothing was changed',
      },
      at,
    )
    expect(view).toMatchObject({
      canDiscard: false,
      canRebuild: false,
      busy: 'rebuilding',
      conflictLine: 'These files conflict, so nothing was changed: a.ts, b.ts',
      error: 'Nothing was changed',
    })
  })
})
