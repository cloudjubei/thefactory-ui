import { describe, expect, it } from 'vitest'
import {
  START_FEATURE_WORK_TOOL_NAME,
  isStartFeatureWorkGrant,
  startFeatureWorkGrantSummary,
} from './launchGrant'

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

import { soleLaunchGrant } from './launchGrant'
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

describe('soleLaunchGrant', () => {
  it('returns the launch grant when it is the only pending permission', () => {
    expect(soleLaunchGrant([perm()])?.id).toBe('g1')
  })

  it('returns null for no grants', () => {
    expect(soleLaunchGrant(undefined)).toBeNull()
    expect(soleLaunchGrant([])).toBeNull()
  })

  it('returns null for a lone NON-launch permission', () => {
    expect(soleLaunchGrant([perm({ toolName: 'installPackage' })])).toBeNull()
  })

  it('returns null when a launch sits alongside another permission (length 2)', () => {
    expect(soleLaunchGrant([perm(), perm({ id: 'g2', toolName: 'unlockNetwork' })])).toBeNull()
  })

  it('ignores question grants when counting — a lone launch beside a question still resolves', () => {
    // A question grant is one that carries BOTH a parsed question and an answer
    // channel (see isQuestionGrant); the partition sends it to its own card.
    const question = perm({
      id: 'q1',
      toolName: 'askUser',
      question: { prompt: 'x' } as never,
      answer: async () => {},
    })
    expect(soleLaunchGrant([perm(), question])?.id).toBe('g1')
  })
})
