import { describe, expect, it } from 'vitest'
import { claimedAskIds, inlineApprovalDecisions, inlineApprovalVia } from './inlineApprovals'
import type { ChatMessageLike } from './chatTypes'

const tool = (approvalId?: string): ChatMessageLike => ({
  role: 'tool',
  content: '',
  toolCall: {
    toolCallId: `t-${approvalId ?? 'x'}`,
    name: 'addStory',
    ...(approvalId ? { approvalId } : {}),
  },
})

describe('claimedAskIds', () => {
  it("lists the asks this turn's rows show, in row order", () => {
    expect(
      claimedAskIds([tool('a2'), { role: 'assistant', content: 'hi' }, tool(), tool('a1')]),
    ).toEqual(['a2', 'a1'])
  })

  it('is empty for a turn waiting on nothing', () => {
    expect(claimedAskIds([tool()])).toEqual([])
  })
})

describe('inlineApprovalDecisions', () => {
  it('approves the toggled asks and declines the rest', () => {
    expect(inlineApprovalDecisions(['a1', 'a2', 'a3'], ['a2'])).toEqual([
      { id: 'a1', decision: 'deny' },
      { id: 'a2', decision: 'once' },
      { id: 'a3', decision: 'deny' },
    ])
  })

  it('always allows a toggled ask marked for this chat, in this chat', () => {
    expect(inlineApprovalDecisions(['a1', 'a2'], ['a1', 'a2'], { a2: 'chat' })).toEqual([
      { id: 'a1', decision: 'once' },
      { id: 'a2', decision: 'always-in-chat' },
    ])
  })

  it('always allows a toggled ask marked for everywhere, everywhere', () => {
    expect(inlineApprovalDecisions(['a1'], ['a1'], { a1: 'everywhere' })).toEqual([
      { id: 'a1', decision: 'always-everywhere' },
    ])
  })

  it('declines an ask marked "Always allow" whose toggle was then switched off', () => {
    expect(inlineApprovalDecisions(['a1'], [], { a1: 'chat' })).toEqual([
      { id: 'a1', decision: 'deny' },
    ])
  })

  it('ignores a toggle for an ask no longer shown', () => {
    expect(inlineApprovalDecisions(['a1'], ['a1', 'gone'])).toEqual([
      { id: 'a1', decision: 'once' },
    ])
  })
})

describe('inlineApprovalVia', () => {
  it('records one Resume over several listed asks as an approve-all', () => {
    expect(inlineApprovalVia(['a1', 'a2'])).toBe('approve-all')
  })

  it('records a Resume over a single ask as decided on its own row', () => {
    expect(inlineApprovalVia(['a1'])).toBe('card')
  })
})
