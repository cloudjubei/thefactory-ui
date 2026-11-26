import { describe, expect, it } from 'vitest'
import { reviewChatSlotKind } from './reviewChatSlot'

describe('reviewChatSlotKind', () => {
  it('is one line to the ticket’s review run while one is going: the run is never in this chat', () => {
    expect(reviewChatSlotKind(true, false)).toBe('run-link')
  })

  it('never shows the reply card beside a run, which starts its own round', () => {
    expect(reviewChatSlotKind(true, true)).toBe('run-link')
  })

  it('shows the reply card in an inline review chat a reply waits on, nothing otherwise', () => {
    expect(reviewChatSlotKind(false, true)).toBe('reply')
    expect(reviewChatSlotKind(false, false)).toBeUndefined()
  })
})
