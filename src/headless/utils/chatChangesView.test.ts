import { describe, expect, it } from 'vitest'

import {
  chatChangesNotice,
  discardedEditPaths,
  heldChatChangesNote,
  withDiscardWarnings,
} from './chatChangesView'
import { CHAT_CHANGES_COPY } from './chatChangesViewConstants'

describe('chatChangesNotice', () => {
  it('points at the later turn once one captured the changes again', () => {
    expect(chatChangesNotice({ supersededBy: { runId: 'r2', at: 2 } })).toBe(
      CHAT_CHANGES_COPY.superseded,
    )
  })

  it('says the changes were discarded', () => {
    expect(chatChangesNotice({ discardedAt: 2 })).toBe(CHAT_CHANGES_COPY.discarded)
  })

  it('says a run chat’s edits join the run only once committed to its work branch', () => {
    expect(chatChangesNotice({ payload: { workspaceBranch: 'factory/s-1a2b3c4d' } })).toBe(
      CHAT_CHANGES_COPY.onWorkBranch('factory/s-1a2b3c4d'),
    )
  })

  it('shows the review while the changes still wait, and once they were applied', () => {
    expect(chatChangesNotice({})).toBeUndefined()
    expect(chatChangesNotice(undefined)).toBeUndefined()
    expect(
      chatChangesNotice({ appliedAt: 1, supersededBy: { runId: 'r2', at: 2 } }),
    ).toBeUndefined()
  })
})

describe('discardedEditPaths', () => {
  it('names the files whose change throws away edits nobody committed', () => {
    expect(
      discardedEditPaths({
        payload: {
          files: [
            { path: 'a.ts', discardsUncommittedEdits: true },
            { path: 'b.ts' },
            { path: 'c.ts', discardsUncommittedEdits: false },
          ],
        },
      }),
    ).toEqual(new Set(['a.ts']))
  })

  it('names none without changes', () => {
    expect(discardedEditPaths(undefined)).toEqual(new Set())
  })
})

describe('withDiscardWarnings', () => {
  it('warns on each file whose change throws away edits, over any other warning, and leaves the rest', () => {
    const files = [
      { path: 'a.ts', warning: 'conflict' },
      { path: 'b.ts' },
      { path: 'c.ts', warning: 'conflict' },
    ]
    expect(withDiscardWarnings(files, new Set(['a.ts', 'b.ts']))).toEqual([
      { path: 'a.ts', warning: CHAT_CHANGES_COPY.discardsUncommittedEdits },
      { path: 'b.ts', warning: CHAT_CHANGES_COPY.discardsUncommittedEdits },
      { path: 'c.ts', warning: 'conflict' },
    ])
  })

  it('hands the same files back when none throws edits away', () => {
    const files = [{ path: 'a.ts' }]
    expect(withDiscardWarnings(files, new Set())).toBe(files)
  })
})

describe('the copy', () => {
  it('never says land, landed or landing', () => {
    const words = [
      CHAT_CHANGES_COPY.onWorkBranch('factory/x'),
      CHAT_CHANGES_COPY.discardsUncommittedEdits,
      CHAT_CHANGES_COPY.discardsUncommittedEditsCount(2),
    ]
    for (const text of words) expect(text).not.toMatch(/\bland(ed|ing)?\b/i)
  })

  it('counts the files whose change throws edits away', () => {
    expect(CHAT_CHANGES_COPY.discardsUncommittedEditsCount(1)).toBe(
      'Throws away edits you had not committed: 1 file',
    )
    expect(CHAT_CHANGES_COPY.discardsUncommittedEditsCount(3)).toBe(
      'Throws away edits you had not committed: 3 files',
    )
  })
})

describe('heldChatChangesNote', () => {
  it('says changes made without the chat’s open review wait on their own', () => {
    expect(heldChatChangesNote({ heldBehindReview: 'r1' })).toBe(CHAT_CHANGES_COPY.held)
  })

  it('says nothing of ordinary changes, applied ones, or none', () => {
    expect(heldChatChangesNote({})).toBeUndefined()
    expect(heldChatChangesNote({ heldBehindReview: 'r1', appliedAt: 2 })).toBeUndefined()
    expect(heldChatChangesNote(undefined)).toBeUndefined()
  })
})
