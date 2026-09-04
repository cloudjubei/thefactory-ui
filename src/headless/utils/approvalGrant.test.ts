import { describe, expect, it } from 'vitest'
import {
  START_FEATURE_WORK_TOOL_NAME,
  isStartFeatureWorkGrant,
  startFeatureWorkGrantSummary,
} from './approvalGrant'

describe('isStartFeatureWorkGrant', () => {
  it('recognises the launch tool by name', () => {
    expect(isStartFeatureWorkGrant({ toolName: START_FEATURE_WORK_TOOL_NAME })).toBe(true)
  })

  it('does not treat an ordinary tool grant as a launch', () => {
    expect(isStartFeatureWorkGrant({ toolName: 'addFeature' })).toBe(false)
  })

  it('is false for a grant that names no tool (a sandbox-boundary action)', () => {
    expect(isStartFeatureWorkGrant({})).toBe(false)
  })
})

describe('startFeatureWorkGrantSummary', () => {
  it('extracts the story id and note the agent proposed', () => {
    const summary = startFeatureWorkGrantSummary({
      detail: { tool: 'startFeatureWork', args: { storyId: 's-1', note: 'wire the fonts' } },
    })
    expect(summary).toEqual({ storyId: 's-1', note: 'wire the fonts' })
  })

  it('returns an empty summary for a malformed payload rather than throwing', () => {
    expect(startFeatureWorkGrantSummary({ detail: 'not an object' })).toEqual({})
    expect(startFeatureWorkGrantSummary({ detail: null })).toEqual({})
    expect(startFeatureWorkGrantSummary({ detail: { tool: 'startFeatureWork' } })).toEqual({})
  })

  it('omits blank fields so the prompt does not render empty lines', () => {
    expect(startFeatureWorkGrantSummary({ detail: { args: { storyId: '', note: '' } } })).toEqual(
      {},
    )
  })
})

import { formatGrantDetail, pendingApprovalGrants } from './approvalGrant'
import type { PendingToolGrant } from './chatTypes'

const perm = (over: Partial<PendingToolGrant> = {}): PendingToolGrant =>
  ({
    id: over.id ?? 'g1',
    source: 'cli',
    label: over.label ?? 'startFeatureWork',
    toolName: over.toolName ?? 'startFeatureWork',
    decide: async () => {},
    ...over,
  }) as PendingToolGrant

describe('pendingApprovalGrants', () => {
  it('returns a lone launch grant', () => {
    expect(pendingApprovalGrants([perm()]).map((g) => g.id)).toEqual(['g1'])
  })

  it('returns a lone NON-launch permission too — every gated ask gets the inline panel', () => {
    // Restricting the inline panel to startFeatureWork dropped an ordinary gated
    // ask (a story write, a device command) into a modal that covered the chat.
    expect(pendingApprovalGrants([perm({ toolName: 'updateFeature' })]).map((g) => g.id)).toEqual([
      'g1',
    ])
  })

  it('returns ALL pending approvals — a pile-up must never fall back to a modal', () => {
    // An ask outlives the turn that raised it, so a later turn's ask stacks on
    // one the user has not answered. Returning only the singleton sent exactly
    // this case to the popup the user asked us to remove.
    const two = [perm(), perm({ id: 'g2', toolName: 'startFeatureWork' })]
    expect(pendingApprovalGrants(two).map((g) => g.id)).toEqual(['g1', 'g2'])
  })

  it('is empty for no grants', () => {
    expect(pendingApprovalGrants(undefined)).toEqual([])
    expect(pendingApprovalGrants([])).toEqual([])
  })

  it('excludes question grants — they render as their own card', () => {
    // A question grant is one that carries BOTH a parsed question and an answer
    // channel (see isQuestionGrant); the partition sends it to its own card.
    const question = perm({
      id: 'q1',
      toolName: 'askUser',
      question: { prompt: 'x' } as never,
      answer: async () => {},
    })
    expect(pendingApprovalGrants([perm(), question]).map((g) => g.id)).toEqual(['g1'])
  })
})

describe('formatGrantDetail', () => {
  it('pretty-prints an object payload', () => {
    expect(formatGrantDetail({ tool: 'updateFeature', args: { storyId: 's1' } })).toContain(
      '"updateFeature"',
    )
  })

  it('passes a non-empty string through unchanged', () => {
    expect(formatGrantDetail('run npm test')).toBe('run npm test')
  })

  it('returns undefined when there is nothing worth showing', () => {
    expect(formatGrantDetail(undefined)).toBeUndefined()
    expect(formatGrantDetail(null)).toBeUndefined()
    expect(formatGrantDetail('')).toBeUndefined()
  })

  it('degrades to a string form rather than blanking on a circular payload', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(formatGrantDetail(circular)).toBeTruthy()
  })
})
