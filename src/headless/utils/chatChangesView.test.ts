import { describe, expect, it } from 'vitest'

import { chatChangesNotice } from './chatChangesView'
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

  it('shows the review while the changes still wait, and once they were applied', () => {
    expect(chatChangesNotice({})).toBeUndefined()
    expect(chatChangesNotice(undefined)).toBeUndefined()
    expect(
      chatChangesNotice({ appliedAt: 1, supersededBy: { runId: 'r2', at: 2 } }),
    ).toBeUndefined()
  })
})
