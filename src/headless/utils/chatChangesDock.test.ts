import { describe, expect, it } from 'vitest'
import { CHAT_OPEN_CHANGES_NEEDS_YOU_AFTER_MS } from 'thefactory-tools/constants'

import type { ChatOpenChanges } from '../api/generated'
import {
  chatChangesBarView,
  chatChangesMarkerView,
  chatChangesVerdictTag,
  chatReviewHeader,
  chatReviewLayout,
  chatReviewPanelWidth,
} from './chatChangesDock'
import type { ChatChangesMarkerInput } from './chatChangesDockTypes'

const HOUR = 60 * 60 * 1000
const SINCE = 1_000_000

const filesOf = (n: number) => Array.from({ length: n }, (_, i) => ({ path: `f${i}.ts` }))

const marker = (over: Partial<ChatChangesMarkerInput> = {}): ChatChangesMarkerInput => ({
  runId: 'r1',
  artifact: { payload: { files: filesOf(10) } },
  review: { branch: 'agent/5e65f9b0ef0f' },
  canOpen: true,
  ...over,
})

const open = (over: Partial<ChatOpenChanges> = {}): ChatOpenChanges => ({
  runId: 'r1',
  projectId: 'p',
  review: { branch: 'agent/5e65f9b0ef0f', baseSha: 'b', landedAt: SINCE },
  openSince: SINCE,
  files: Array.from({ length: 10 }, (_, i) => ({ path: `f${i}.ts`, status: 'modified' as const })),
  changed: [],
  heldRunIds: [],
  ...over,
})

describe('chatChangesMarkerView', () => {
  it('points at the bar below when the turn holds the chat’s open changes', () => {
    expect(chatChangesMarkerView(marker({ openRunId: 'r1' }))).toEqual({
      kind: 'marker',
      label: 'Changed 10 files',
      branch: 'agent/5e65f9b0ef0f',
      action: { label: 'Review below', inBar: true },
    })
  })

  it('offers its own review for a turn the bar does not hold', () => {
    expect(chatChangesMarkerView(marker({ openRunId: 'r2' }))).toMatchObject({
      action: { label: 'Review', inBar: false },
    })
  })

  it('counts one file in the singular', () => {
    expect(
      chatChangesMarkerView(marker({ artifact: { payload: { files: filesOf(1) } } })),
    ).toMatchObject({ label: 'Changed 1 file' })
  })

  it('names no branch for changes kept without git of their own', () => {
    const view = chatChangesMarkerView(marker({ review: { branch: 'shadow/x', shadow: true } }))
    expect(view).not.toHaveProperty('branch')
  })

  it('keeps the one-line notice for changes a later turn captured again', () => {
    expect(
      chatChangesMarkerView(
        marker({
          artifact: {
            payload: { files: filesOf(3) },
            supersededBy: { runId: 'r9', at: SINCE } as never,
          },
        }),
      ),
    ).toEqual({
      kind: 'notice',
      text: 'A later turn captured these changes again with its own — review and apply that turn’s.',
    })
  })

  it('keeps the one-line notice for discarded changes', () => {
    expect(
      chatChangesMarkerView(
        marker({ artifact: { payload: { files: filesOf(3) }, discardedAt: SINCE } }),
      ),
    ).toMatchObject({ kind: 'notice', text: expect.stringMatching(/^Discarded/) })
  })

  it('says changes kept apart from the open ones on a second line, still to review', () => {
    expect(
      chatChangesMarkerView(
        marker({
          openRunId: 'r2',
          artifact: { payload: { files: filesOf(2) }, heldBehindReview: 'r2' },
        }),
      ),
    ).toMatchObject({
      label: 'Changed 2 files',
      note: 'Kept apart from this chat’s open changes until those are decided.',
      action: { label: 'Review', inBar: false },
    })
  })

  it('shows what became of decided changes and opens them rather than asking for a review', () => {
    expect(
      chatChangesMarkerView(marker({ review: { branch: 'agent/x', mergedAt: SINCE } })),
    ).toMatchObject({
      status: { label: 'Merged', tone: 'positive' },
      action: { label: 'Open', inBar: false },
    })
    expect(chatChangesMarkerView(marker({ decision: 'rejected' }))).toMatchObject({
      status: { label: 'Rejected', tone: 'danger' },
    })
    expect(
      chatChangesMarkerView(marker({ review: { branch: 'agent/x', rejectedAt: SINCE } })),
    ).toMatchObject({ status: { label: 'Rejected', tone: 'danger' } })
    expect(
      chatChangesMarkerView(
        marker({ review: undefined, artifact: { payload: { files: filesOf(1) }, appliedAt: 1 } }),
      ),
    ).toMatchObject({ status: { label: 'Applied', tone: 'positive' } })
  })

  it('opens a process step’s changes as a report', () => {
    expect(chatChangesMarkerView(marker({ reportOnly: true, openRunId: 'r1' }))).toMatchObject({
      action: { label: 'Open', inBar: false },
    })
  })

  it('offers no link where nothing can open a review', () => {
    expect(chatChangesMarkerView(marker({ canOpen: false }))).not.toHaveProperty('action')
  })

  it('marks changes that could not be committed', () => {
    expect(chatChangesMarkerView(marker({ artifact: undefined, landFailed: true }))).toEqual({
      kind: 'marker',
      label: 'Changes not committed',
      branch: 'agent/5e65f9b0ef0f',
      action: { label: 'Open', inBar: false },
    })
  })

  it('marks a process step that filed a report but changed nothing', () => {
    expect(
      chatChangesMarkerView(
        marker({ artifact: undefined, review: undefined, reportOnly: true, hasReport: true }),
      ),
    ).toEqual({ kind: 'marker', label: 'Stage report', action: { label: 'Open', inBar: false } })
  })

  it('says in one line that the change is already on its base, never as changes to review', () => {
    expect(
      chatChangesMarkerView(
        marker({
          landFailed: true,
          openRunId: 'r1',
          alreadyOnBase: {
            text: 'Already on dev as 0956f8c — nothing left to review',
            sha: '0956f8c',
            subject: 'Draft 10',
          },
          changeFiles: [{ path: 'design/drafts/10.html', status: 'modified' }],
        }),
      ),
    ).toEqual({
      kind: 'already',
      text: 'Already on dev as 0956f8c — nothing left to review',
      change: {
        files: [{ path: 'design/drafts/10.html', status: 'modified', letter: 'M' }],
        message: 'Draft 10',
      },
    })
  })

  it('offers no change to view when an older record names no commit', () => {
    expect(
      chatChangesMarkerView(
        marker({ alreadyOnBase: { text: 'Already on dev — nothing left to review' } }),
      ),
    ).toEqual({ kind: 'already', text: 'Already on dev — nothing left to review' })
  })

  it('shows nothing when the turn’s own commit receipt already says the change is there', () => {
    const alreadyOnBase = {
      text: 'Already on dev as 0956f8c — nothing left to review',
      sha: '0956f8c',
    }
    expect(
      chatChangesMarkerView(marker({ alreadyOnBase, receiptShas: ['0956f8c41d2e9a'] })),
    ).toBeUndefined()
    expect(chatChangesMarkerView(marker({ alreadyOnBase, receiptShas: ['1111111'] }))?.kind).toBe(
      'already',
    )
  })

  it('shows nothing for a turn that changed nothing', () => {
    expect(chatChangesMarkerView(marker({ artifact: undefined }))).toBeUndefined()
    expect(chatChangesMarkerView(marker({ artifact: undefined, reportOnly: true }))).toBeUndefined()
  })
})

describe('chatChangesVerdictTag', () => {
  it('counts the checks that did not pass', () => {
    expect(chatChangesVerdictTag({ key: 'failed', failed: 4 })).toEqual({
      label: '4 checks didn’t pass',
      tone: 'danger',
    })
    expect(chatChangesVerdictTag({ key: 'failed', failed: 1 }).label).toBe('1 check didn’t pass')
  })

  it('says when the checks passed, ran in part, or have not run', () => {
    expect(chatChangesVerdictTag({ key: 'proven', failed: 0 })).toEqual({
      label: 'Checks passed',
      tone: 'positive',
    })
    expect(chatChangesVerdictTag({ key: 'partly', failed: 0 })).toEqual({
      label: 'Partly checked',
      tone: 'warning',
    })
    expect(chatChangesVerdictTag({ key: 'not-run', failed: 0 })).toEqual({
      label: 'Not checked yet',
      tone: 'warning',
    })
  })
})

describe('chatChangesBarView', () => {
  it('shows nothing until the open changes are read, or once none wait', () => {
    expect(chatChangesBarView({ openChanges: undefined }, SINCE)).toBeUndefined()
    expect(chatChangesBarView({ openChanges: null }, SINCE)).toBeUndefined()
  })

  it('holds nothing for changes already on their base', () => {
    expect(chatChangesBarView({ openChanges: open(), alreadyOnBase: true }, SINCE)).toBeUndefined()
  })

  it('holds fresh changes with no wait to tell', () => {
    expect(chatChangesBarView({ openChanges: open() }, SINCE + HOUR / 2)).toEqual({
      runId: 'r1',
      title: '10 files wait for your decision',
      shortTitle: '10 files wait for you',
      overdue: false,
      canDiscard: true,
    })
  })

  it('says one file waits in the singular', () => {
    const view = chatChangesBarView({ openChanges: open({ files: [open().files[0]] }) }, SINCE)
    expect(view?.title).toBe('1 file waits for your decision')
    expect(view?.shortTitle).toBe('1 file waits for you')
  })

  it('tells the verdict of the checks', () => {
    expect(
      chatChangesBarView({ openChanges: open(), verdict: { key: 'failed', failed: 4 } }, SINCE)
        ?.verdict,
    ).toEqual({ label: '4 checks didn’t pass', tone: 'danger' })
  })

  it('says when they no longer fit the checkout', () => {
    expect(
      chatChangesBarView(
        { openChanges: open({ changed: [{ path: 'f0.ts', reason: 'r' }] }) },
        SINCE,
      )?.unfit,
    ).toBe('No longer fits your checkout')
  })

  it('counts the wait in hours, then days, and marks it overdue past the limit', () => {
    const at47h = chatChangesBarView({ openChanges: open() }, SINCE + 47 * HOUR)
    expect(at47h).toMatchObject({ waited: '47 h', overdue: true })
    expect(chatChangesBarView({ openChanges: open() }, SINCE + 50 * HOUR)?.waited).toBe('2 d')
    expect(chatChangesBarView({ openChanges: open() }, SINCE + 2 * HOUR)?.overdue).toBe(false)
    expect(
      chatChangesBarView({ openChanges: open() }, SINCE + CHAT_OPEN_CHANGES_NEEDS_YOU_AFTER_MS)
        ?.overdue,
    ).toBe(true)
  })

  it('holds Discard while an action is in flight, and says why one failed', () => {
    expect(chatChangesBarView({ openChanges: open(), busy: 'discarding' }, SINCE)).toMatchObject({
      canDiscard: false,
      busy: 'discarding',
    })
    expect(chatChangesBarView({ openChanges: open(), error: 'Nope' }, SINCE)).toMatchObject({
      canDiscard: true,
      error: 'Nope',
    })
  })
})

describe('chatReviewHeader', () => {
  it('counts the files and names the branch they wait on', () => {
    expect(chatReviewHeader({ fileCount: 10, review: { branch: 'agent/x' } })).toEqual({
      title: 'Changes · 10 files',
      branch: 'agent/x',
    })
    expect(chatReviewHeader({ fileCount: 1 }).title).toBe('Changes · 1 file')
  })

  it('names no branch for changes kept without git of their own', () => {
    expect(chatReviewHeader({ fileCount: 2, review: { branch: 's', shadow: true } })).toEqual({
      title: 'Changes · 2 files',
    })
  })

  it('says a change its base already holds is there, not that it waits', () => {
    expect(
      chatReviewHeader({
        fileCount: 3,
        alreadyOnBase: { baseRef: 'dev' },
        review: { branch: 'agent/x' },
      }),
    ).toEqual({ title: 'Already on dev' })
    expect(chatReviewHeader({ fileCount: 3, alreadyOnBase: {} }).title).toBe(
      'Already on the base branch',
    )
  })

  it('names what it opens when nothing was changed', () => {
    expect(chatReviewHeader({ landFailed: true }).title).toBe('Changes not committed')
    expect(chatReviewHeader({ reportOnly: true }).title).toBe('Stage report')
    expect(chatReviewHeader({}).title).toBe('Changes')
  })
})

describe('chatReviewLayout', () => {
  it('opens beside a wide chat and over a narrow one', () => {
    expect(chatReviewLayout(1200)).toBe('side')
    expect(chatReviewLayout(768)).toBe('side')
    expect(chatReviewLayout(767)).toBe('sheet')
  })

  it('opens beside the chat before its width is known', () => {
    expect(chatReviewLayout(undefined)).toBe('side')
  })
})

describe('chatReviewPanelWidth', () => {
  it('keeps the asked width when the chat has room for it', () => {
    expect(chatReviewPanelWidth(460, 1400)).toBe(460)
  })

  it('never goes below its narrowest', () => {
    expect(chatReviewPanelWidth(100, 1400)).toBe(360)
  })

  it('always leaves the chat its narrowest', () => {
    expect(chatReviewPanelWidth(900, 1000)).toBe(640)
  })

  it('keeps its narrowest even when the chat cannot keep its own', () => {
    expect(chatReviewPanelWidth(460, 700)).toBe(360)
  })
})
