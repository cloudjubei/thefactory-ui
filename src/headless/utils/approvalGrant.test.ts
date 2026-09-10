import { describe, expect, it } from 'vitest'

import type { Feature, Story } from '../api/generated'
import {
  START_FEATURE_WORK_TOOL_NAME,
  featuresToWorkOn,
  formatGrantDetail,
  isStartFeatureWorkGrant,
  launchBeats,
  launchOptionsAreHonoured,
  launchRunnerLabel,
  pendingApprovalGrants,
  startFeatureWorkGrantSummary,
} from './approvalGrant'
import type { PendingToolGrant } from './chatTypes'

function grant(over: Partial<PendingToolGrant> = {}): PendingToolGrant {
  return {
    id: 'g1',
    source: 'cli',
    label: 'startFeatureWork',
    toolName: START_FEATURE_WORK_TOOL_NAME,
    decide: async () => {},
    ...over,
  }
}

function feature(over: Partial<Feature> = {}): Feature {
  return {
    id: 'f1',
    status: 'pending',
    title: 'Feature',
    description: '',
    context: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

function story(features: Feature[]): Pick<Story, 'id' | 'features'> {
  return { id: 's1', features }
}

describe('isStartFeatureWorkGrant', () => {
  it('recognises the launch tool by name', () => {
    expect(isStartFeatureWorkGrant({ toolName: START_FEATURE_WORK_TOOL_NAME })).toBe(true)
  })

  it('is false for any other tool', () => {
    expect(isStartFeatureWorkGrant({ toolName: 'updateStory' })).toBe(false)
  })
})

describe('launchRunnerLabel', () => {
  it('says "same agent as this chat" when the agent named no runner', () => {
    const l = launchRunnerLabel({}, 'cli')
    expect(l.label).toBe('Same agent as this chat')
    expect(l.pill).toBe('CLI')
    expect(l.redirected).toBe(false)
  })

  it('still says "same" when the named runner IS this chat\'s transport', () => {
    expect(launchRunnerLabel({ runner: 'api' }, 'api').redirected).toBe(false)
  })

  it('names the OTHER agent when the run was routed away from this chat', () => {
    // Announcing "same agent as this chat" here named the wrong executor for a
    // run the agent had deliberately sent elsewhere.
    const l = launchRunnerLabel({ runner: 'api' }, 'cli')
    expect(l.redirected).toBe(true)
    expect(l.label).toBe('On the API agent')
    expect(l.pill).toBe('API')
    expect(l.tip).toMatch(/NOT the one this chat/)
  })

  it('names the CLI agent when a CLI run is asked for from an API chat', () => {
    const l = launchRunnerLabel({ runner: 'cli' }, 'api')
    expect(l.label).toBe('On the CLI agent')
    expect(l.redirected).toBe(true)
  })
})

describe('launchOptionsAreHonoured', () => {
  it('is true for a CLI grant, whose decision persists metadata', () => {
    expect(launchOptionsAreHonoured({ source: 'cli' })).toBe(true)
  })

  it('is false for an API grant, which confirms tool calls by id alone', () => {
    // The dock must not collect a note or a proof choice it cannot deliver.
    expect(launchOptionsAreHonoured({ source: 'api' })).toBe(false)
  })
})

describe('startFeatureWorkGrantSummary', () => {
  it('reads an API tool call, whose detail IS the arguments object', () => {
    // The API transport hands the raw args over with no `{ tool, args }` wrapper.
    // Reading only the wrapper left every field absent, so the launch dock waited
    // on a story id that never arrived and could never be started.
    const summary = startFeatureWorkGrantSummary(
      grant({
        detail: { storyId: 's9', note: 'mind the cache', proofRequired: false, runner: 'cli' },
      }),
    )
    expect(summary).toEqual({
      storyId: 's9',
      note: 'mind the cache',
      proofRequired: false,
      runner: 'cli',
    })
  })

  it('prefers the wrapped args when both shapes could be read', () => {
    const summary = startFeatureWorkGrantSummary(
      grant({ detail: { storyId: 'outer', args: { storyId: 'inner' } } }),
    )
    expect(summary.storyId).toBe('inner')
  })

  it('pulls story, note, proof and runner out of the payload', () => {
    const summary = startFeatureWorkGrantSummary(
      grant({
        detail: {
          tool: 'startFeatureWork',
          args: {
            storyId: 's1',
            note: 'use the onsite flavour',
            proofRequired: false,
            runner: 'api',
          },
        },
      }),
    )
    expect(summary).toEqual({
      storyId: 's1',
      note: 'use the onsite flavour',
      proofRequired: false,
      runner: 'api',
    })
  })

  it('proof defaults ON when the payload does not say otherwise', () => {
    expect(startFeatureWorkGrantSummary(grant({ detail: { args: { storyId: 's1' } } }))).toEqual({
      storyId: 's1',
      proofRequired: true,
    })
  })

  it('drops an unknown runner rather than passing it through', () => {
    const summary = startFeatureWorkGrantSummary(
      grant({ detail: { args: { storyId: 's1', runner: 'docker' } } }),
    )
    expect(summary.runner).toBeUndefined()
  })

  it('drops empty strings', () => {
    const summary = startFeatureWorkGrantSummary(
      grant({ detail: { args: { storyId: '', note: '' } } }),
    )
    expect(summary).toEqual({ proofRequired: true })
  })

  it('a malformed payload yields the defaults, not a throw', () => {
    expect(startFeatureWorkGrantSummary(grant({ detail: 'nope' }))).toEqual({ proofRequired: true })
    expect(startFeatureWorkGrantSummary(grant({ detail: { args: 3 } }))).toEqual({
      proofRequired: true,
    })
  })
})

describe('featuresToWorkOn', () => {
  it('picks pending features in story order', () => {
    const picked = featuresToWorkOn(
      story([feature({ id: 'a' }), feature({ id: 'b' }), feature({ id: 'c' })]),
    )
    expect(picked.map((f) => f.id)).toEqual(['a', 'b', 'c'])
  })

  it('skips anything that is not pending', () => {
    const picked = featuresToWorkOn(
      story([
        feature({ id: 'done', status: 'done' }),
        feature({ id: 'blocked', status: 'blocked' }),
        feature({ id: 'deferred', status: 'deferred' }),
        feature({ id: 'busy', status: 'in_progress' }),
        feature({ id: 'ok' }),
      ]),
    )
    expect(picked.map((f) => f.id)).toEqual(['ok'])
  })

  it('leaves out a pending feature whose blocker is not done', () => {
    const picked = featuresToWorkOn(
      story([
        feature({ id: 'later', blockers: ['s1.x'] }),
        feature({ id: 'x', status: 'blocked' }),
      ]),
    )
    expect(picked).toEqual([])
  })

  it('a blocker that is already done releases the feature', () => {
    const picked = featuresToWorkOn(
      story([feature({ id: 'x', status: 'done' }), feature({ id: 'later', blockers: ['s1.x'] })]),
    )
    expect(picked.map((f) => f.id)).toEqual(['later'])
  })

  it('a feature picked earlier in the run releases the one it blocks — in run order', () => {
    const picked = featuresToWorkOn(
      story([feature({ id: 'second', blockers: ['s1.first'] }), feature({ id: 'first' })]),
    )
    expect(picked.map((f) => f.id)).toEqual(['first', 'second'])
  })

  it('a story with no features picks nothing', () => {
    expect(featuresToWorkOn({ id: 's1', features: [] })).toEqual([])
  })
})

describe('launchBeats', () => {
  it('is four beats in order, ending with the sign-off', () => {
    const beats = launchBeats(true)
    expect(beats.map((b) => b.title)).toEqual(['Launch', 'Isolated copy', 'Proof', 'Your sign-off'])
    expect(beats.every((b) => b.off !== true)).toBe(true)
  })

  it('with proof off, the third beat says so and is flagged', () => {
    const beats = launchBeats(false)
    expect(beats[2]).toEqual({
      title: 'No proof',
      detail: 'you turned that off, so it can report done on its own word.',
      off: true,
    })
    expect(beats).toHaveLength(4)
  })

  it('the proof beat does not promise a screenshot comparison it cannot guarantee', () => {
    expect(launchBeats(true)[2].detail).toMatch(/what counts depends on the change/i)
  })

  it('speaks to the reader — the run comes back to you', () => {
    expect(launchBeats(true)[3].detail).toMatch(/comes back to you/)
  })
})

describe('pendingApprovalGrants', () => {
  it('returns permission grants and leaves questions out', () => {
    const permission = grant({ id: 'p' })
    const question = grant({
      id: 'q',
      toolName: 'askUser',
      question: { id: 'q1', question: 'Which?', options: [] } as never,
      answer: async () => {},
    } as Partial<PendingToolGrant>)
    expect(pendingApprovalGrants([permission, question]).map((g) => g.id)).toEqual(['p'])
  })

  it('is empty for no grants', () => {
    expect(pendingApprovalGrants(undefined)).toEqual([])
  })
})

describe('formatGrantDetail', () => {
  it('is undefined for nothing', () => {
    expect(formatGrantDetail(undefined)).toBeUndefined()
    expect(formatGrantDetail(null)).toBeUndefined()
    expect(formatGrantDetail('')).toBeUndefined()
  })

  it('passes a string through', () => {
    expect(formatGrantDetail('hello')).toBe('hello')
  })

  it('pretty-prints an object', () => {
    expect(formatGrantDetail({ a: 1 })).toBe('{\n  "a": 1\n}')
  })

  it('falls back to String() for something that will not serialise', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(formatGrantDetail(cyclic)).toBe('[object Object]')
  })
})
