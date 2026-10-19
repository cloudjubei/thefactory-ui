import { describe, expect, it } from 'vitest'
import { CHAT_OPEN_CHANGES_NEEDS_YOU_AFTER_MS } from 'thefactory-tools/constants'

import type { ChatOpenChanges } from '../api/generated'
import {
  isOpenChangesCardOnlyMessage,
  openChangesNoticeView,
  openChangesWaitWords,
} from './openChangesNotice'

const HOUR = 60 * 60 * 1000
const SINCE = 1_000_000

const open = (over: Partial<ChatOpenChanges> = {}): ChatOpenChanges => ({
  runId: 'r2',
  projectId: 'p',
  review: { branch: 'agent/x', baseSha: 'b', landedAt: SINCE },
  openSince: SINCE,
  files: Array.from({ length: 13 }, (_, i) => ({ path: `f${i}.ts`, status: 'modified' as const })),
  changed: [],
  heldRunIds: [],
  ...over,
})
const changed = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ path: `f${i}.ts`, reason: 'r' }))
const overdue = SINCE + CHAT_OPEN_CHANGES_NEEDS_YOU_AFTER_MS

describe('openChangesNoticeView', () => {
  it('says the changes wait on the person once they waited past the limit, with Discard', () => {
    expect(openChangesNoticeView({ runId: 'r2', openChanges: open() }, overdue + HOUR / 2)).toEqual(
      { waiting: 'Waiting for you · 12 h', canDiscard: true, canRebuild: false },
    )
  })

  it('counts the wait in days once it ran past two', () => {
    expect(
      openChangesNoticeView({ runId: 'r2', openChanges: open() }, SINCE + 50 * HOUR)?.waiting,
    ).toBe('Waiting for you · 2 d')
  })

  it('says nothing while fresh changes still fit the checkout', () => {
    expect(openChangesNoticeView({ runId: 'r2', openChanges: open() }, overdue - 1)).toBeUndefined()
  })

  it('says when they no longer fit the checkout, counting them live, with Discard and Rebuild', () => {
    expect(
      openChangesNoticeView({ runId: 'r2', openChanges: open({ changed: changed(5) }) }, SINCE + 1),
    ).toEqual({
      unfit: 'No longer fits your checkout — 5 of 13 files changed since',
      canDiscard: true,
      canRebuild: true,
    })
  })

  it('says both when changes that no longer fit have also waited past the limit', () => {
    const view = openChangesNoticeView(
      { runId: 'r2', openChanges: open({ changed: changed(1) }) },
      overdue,
    )
    expect(view?.waiting).toBe('Waiting for you · 12 h')
    expect(view?.unfit).toBe('No longer fits your checkout — 1 of 13 files changed since')
  })

  it('shows nothing on a card whose run does not hold the open changes', () => {
    expect(openChangesNoticeView({ runId: 'r1', openChanges: open() }, overdue)).toBeUndefined()
  })

  it('shows nothing until they are read, nor once nothing waits', () => {
    expect(openChangesNoticeView({ runId: 'r2', openChanges: undefined }, overdue)).toBeUndefined()
    expect(openChangesNoticeView({ runId: 'r2', openChanges: null }, overdue)).toBeUndefined()
  })

  it('holds its actions while one runs, and names the files a rebuild could not merge', () => {
    expect(
      openChangesNoticeView(
        {
          runId: 'r2',
          openChanges: open({ changed: changed(2) }),
          busy: 'rebuilding',
          conflicts: [
            { path: 'a.ts', reason: 'same lines' },
            { path: 'b.ts', reason: 'same lines' },
          ],
          error: 'Nothing was changed',
        },
        SINCE + 1,
      ),
    ).toMatchObject({
      canDiscard: false,
      canRebuild: false,
      busy: 'rebuilding',
      conflictLine: 'These files conflict, so nothing was changed: a.ts, b.ts',
      error: 'Nothing was changed',
    })
  })

  it('never says land', () => {
    const view = openChangesNoticeView(
      { runId: 'r2', openChanges: open({ changed: changed(1) }) },
      overdue,
    )
    for (const text of [view?.waiting, view?.unfit]) expect(text).not.toMatch(/\bland/i)
  })
})

describe('isOpenChangesCardOnlyMessage', () => {
  const card = {
    kind: 'waiting' as const,
    runId: 'r1',
    projectId: 'p',
    chatContextId: '/projects/p/topics/t',
    since: 5,
    fileCount: 1,
  }

  it('is a message the host posted only to carry a card — its change card says it', () => {
    expect(isOpenChangesCardOnlyMessage({ role: 'assistant', openChangesCard: card })).toBe(true)
  })

  it('is not the turn a card was raised on, nor a message with no card', () => {
    expect(
      isOpenChangesCardOnlyMessage({ role: 'assistant', cliRunId: 'r1', openChangesCard: card }),
    ).toBe(false)
    expect(isOpenChangesCardOnlyMessage({ role: 'assistant' })).toBe(false)
    expect(isOpenChangesCardOnlyMessage({ role: 'user', openChangesCard: card })).toBe(false)
  })
})

describe('openChangesWaitWords', () => {
  it('counts whole hours below two days', () => {
    expect(openChangesWaitWords(47 * HOUR + HOUR / 2)).toBe('47 h')
  })

  it('counts whole days from two days on', () => {
    expect(openChangesWaitWords(48 * HOUR)).toBe('2 d')
  })

  it('never counts a negative wait', () => {
    expect(openChangesWaitWords(-HOUR)).toBe('0 h')
  })
})
