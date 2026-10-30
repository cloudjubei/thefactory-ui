import { describe, expect, it } from 'vitest'

import {
  formatGrantDetail,
  grantDetailView,
  isStartFeatureWorkGrant,
  isToolAskDecidedOnRow,
  launchRefusalMessage,
  launchRunnerLabel,
  pendingApprovalGrants,
  startFeatureWorkGrantSummary,
  panelApprovalGrants,
} from './approvalGrant'
import type { PendingToolGrant } from './chatTypes'
import { START_FEATURE_WORK_TOOL_NAME } from './pendingToolGrantsConstants'

function grant(over: Partial<PendingToolGrant> = {}): PendingToolGrant {
  return {
    id: 'g1',
    chatRunner: 'cli',
    label: 'startFeatureWork',
    toolName: START_FEATURE_WORK_TOOL_NAME,
    decide: async () => {},
    ...over,
  }
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

describe('startFeatureWorkGrantSummary', () => {
  it('reads nothing from a payload that does not wrap the arguments — every ask is the broker’s `{ tool, args }`', () => {
    const summary = startFeatureWorkGrantSummary(
      grant({ detail: { storyId: 's9', note: 'mind the cache', proofRequired: false } }),
    )
    expect(summary).toEqual({ proofRequired: true })
  })

  it('reads the way the agent proposed to do the work, and only a known one', () => {
    const of = (mode: unknown) =>
      startFeatureWorkGrantSummary(grant({ detail: { args: { storyId: 's', mode } } })).mode
    expect(of('chat')).toBe('chat')
    expect(of('process')).toBe('process')
    expect(of('inline')).toBeUndefined()
  })

  it('reads the agent type the agent proposed for each slot, and none when it named none', () => {
    const of = (agentTypeSlots: unknown) =>
      startFeatureWorkGrantSummary(grant({ detail: { args: { storyId: 's', agentTypeSlots } } }))
    expect(of({ verifier: 'screen-checker', reviewer: 'x' }).agentTypeSlots).toEqual({
      verifier: 'screen-checker',
    })
    expect(of(['verifier'])).not.toHaveProperty('agentTypeSlots')
  })

  it('reads the CLI, model and sign-in the agent asked for, dropping blanks and non-strings', () => {
    expect(
      startFeatureWorkGrantSummary(
        grant({
          detail: {
            args: { storyId: 's', cliTool: ' codex ', cliModel: 'gpt-5', cliCredentialId: 'c1' },
          },
        }),
      ),
    ).toMatchObject({ cliTool: 'codex', cliModel: 'gpt-5', cliCredentialId: 'c1' })
    const blank = startFeatureWorkGrantSummary(
      grant({ detail: { args: { storyId: 's', cliTool: ' ', cliModel: 4, cliCredentialId: '' } } }),
    )
    expect(blank).not.toHaveProperty('cliTool')
    expect(blank).not.toHaveProperty('cliModel')
    expect(blank).not.toHaveProperty('cliCredentialId')
  })

  it('reads the features the launch names, dropping what is not an id', () => {
    expect(
      startFeatureWorkGrantSummary(
        grant({ detail: { args: { storyId: 's', featureIds: ['f1', '', 3, 'f2'] } } }),
      ).featureIds,
    ).toEqual(['f1', 'f2'])
    expect(
      startFeatureWorkGrantSummary(grant({ detail: { args: { storyId: 's', featureIds: [] } } })),
    ).not.toHaveProperty('featureIds')
  })

  it('reads the process the agent chose', () => {
    expect(
      startFeatureWorkGrantSummary(
        grant({ detail: { args: { storyId: 's', processId: ' feature-self-verified ' } } }),
      ).processId,
    ).toBe('feature-self-verified')
    expect(
      startFeatureWorkGrantSummary(
        grant({ detail: { tool: 'startFeatureWork', args: { storyId: 's', processId: 'mine' } } }),
      ).processId,
    ).toBe('mine')
  })

  it('leaves the process to the story when none, a blank one or a non-string was asked for', () => {
    for (const processId of [undefined, '', '   ', 7, null]) {
      const summary = startFeatureWorkGrantSummary(
        grant({ detail: { args: { storyId: 's', processId } } }),
      )
      expect(summary).not.toHaveProperty('processId')
    }
  })

  it('reads the branch the agent asked the work to go off, trimmed', () => {
    expect(
      startFeatureWorkGrantSummary(
        grant({ detail: { args: { storyId: 's', baseBranch: ' dev ' } } }),
      ).baseBranch,
    ).toBe('dev')
  })

  it('leaves the branch to the card when none, a blank one or a non-string was asked for', () => {
    for (const baseBranch of [undefined, '', '  ', 3]) {
      const summary = startFeatureWorkGrantSummary(
        grant({ detail: { args: { storyId: 's', baseBranch } } }),
      )
      expect(summary).not.toHaveProperty('baseBranch')
    }
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

  it('carries the flagged relevant-note ids so the dock can show them', () => {
    const summary = startFeatureWorkGrantSummary(
      grant({ detail: { args: { storyId: 's1', relevantNoteIds: ['n1', 'n2'] } } }),
    )
    expect(summary.relevantNoteIds).toEqual(['n1', 'n2'])
  })

  it('keeps only string ids and omits the field when none survive', () => {
    // A different shape: a junky array must not reach the dock as ids.
    const summary = startFeatureWorkGrantSummary(
      grant({ detail: { args: { storyId: 's1', relevantNoteIds: [1, '', null, 'n3'] } } }),
    )
    expect(summary.relevantNoteIds).toEqual(['n3'])
    expect(
      startFeatureWorkGrantSummary(
        grant({ detail: { args: { storyId: 's1', relevantNoteIds: [] } } }),
      ),
    ).not.toHaveProperty('relevantNoteIds')
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

describe('panelApprovalGrants', () => {
  it('keeps requests of their own kind for the panel', () => {
    expect(panelApprovalGrants([grant({ id: 'launch' })], new Set()).map((g) => g.id)).toEqual([
      'launch',
    ])
  })

  it('leaves out an ordinary ask a row on screen is already showing', () => {
    const ask = grant({ id: 'a', toolName: 'addStory', inline: true })
    expect(panelApprovalGrants([ask], new Set(['a']))).toEqual([])
  })

  it('keeps an ordinary ask no row claimed, so it can never go unseen', () => {
    const ask = grant({ id: 'a', toolName: 'addStory', inline: true })
    expect(panelApprovalGrants([ask], new Set()).map((g) => g.id)).toEqual(['a'])
  })

  it('leaves an API turn’s ordinary ask to the row showing it, as a CLI run’s', () => {
    const api = grant({ id: 'a', chatRunner: 'api', toolName: 'addStory', inline: true })
    expect(panelApprovalGrants([api], new Set(['a']))).toEqual([])
    expect(panelApprovalGrants([api], new Set()).map((g) => g.id)).toEqual(['a'])
  })

  it('holds an ordinary ask back while the chat is still loading the rows that show it', () => {
    const ask = grant({ id: 'a', toolName: 'addStory', inline: true, runId: 'r1' })
    expect(panelApprovalGrants([ask], new Set(), { loading: true })).toEqual([])
  })

  it('holds an ordinary ask back while its turn is on screen but has not loaded its rows', () => {
    const ask = grant({ id: 'a', toolName: 'addStory', inline: true, runId: 'r1' })
    expect(panelApprovalGrants([ask], new Set(), { unsettledRunIds: new Set(['r1']) })).toEqual([])
  })

  it('shows an ordinary ask whose turn loaded without claiming it, or is not on screen', () => {
    const ask = grant({ id: 'a', toolName: 'addStory', inline: true, runId: 'r1' })
    const unclaimed = { unsettledRunIds: new Set(['r2']) }
    expect(panelApprovalGrants([ask], new Set(), unclaimed).map((g) => g.id)).toEqual(['a'])
  })

  it('never holds back a request of its own kind', () => {
    const launch = grant({ id: 'launch', runId: 'r1' })
    const held = { loading: true, unsettledRunIds: new Set(['r1']) }
    expect(panelApprovalGrants([launch], new Set(), held).map((g) => g.id)).toEqual(['launch'])
  })

  it('leaves questions out', () => {
    const question = grant({
      id: 'q',
      question: { id: 'q1', question: 'Which?', options: [] } as never,
      answer: async () => {},
    } as Partial<PendingToolGrant>)
    expect(panelApprovalGrants([question], new Set())).toEqual([])
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

describe('launchRefusalMessage', () => {
  it('reads the reason the server refused the launch preview with', () => {
    expect(
      launchRefusalMessage({
        error: 'Story "Fonts" already has a live process run — "Fonts" (run-7).',
      }),
    ).toBe('Story "Fonts" already has a live process run — "Fonts" (run-7).')
  })

  it('is undefined when the failure carries no reason — the dock keeps its own fallback', () => {
    expect(launchRefusalMessage(new Error('network down'))).toBeUndefined()
    expect(launchRefusalMessage({ error: '   ' })).toBeUndefined()
    expect(launchRefusalMessage(undefined)).toBeUndefined()
    expect(launchRefusalMessage('boom')).toBeUndefined()
  })
})

describe('isToolAskDecidedOnRow', () => {
  it('decides an ordinary tool ask on its row', () => {
    expect(isToolAskDecidedOnRow('addStory')).toBe(true)
  })

  it('leaves a feature-work or group launch to its own panel', () => {
    expect(isToolAskDecidedOnRow('startFeatureWork')).toBe(false)
    expect(isToolAskDecidedOnRow('startGroupWork')).toBe(false)
  })

  it('leaves accepting a feature request to its own card, where the way its work starts is picked', () => {
    expect(isToolAskDecidedOnRow('acceptProjectFeatureRequest')).toBe(false)
    expect(isToolAskDecidedOnRow('rejectProjectFeatureRequest')).toBe(true)
  })

  it('decides a host tool with a card of its own on its row', () => {
    expect(isToolAskDecidedOnRow('requestHostFileRead')).toBe(true)
    expect(isToolAskDecidedOnRow('commitGitChanges')).toBe(true)
    expect(isToolAskDecidedOnRow('applyDesignTidy')).toBe(true)
  })

  it('leaves a question or a form the person answers to the composer', () => {
    expect(isToolAskDecidedOnRow('askUser')).toBe(false)
    expect(isToolAskDecidedOnRow('requestCliSignIn')).toBe(false)
  })

  it('reads an MCP-prefixed name as the bare tool', () => {
    expect(isToolAskDecidedOnRow('mcp__thefactory__startGroupWork')).toBe(false)
    expect(isToolAskDecidedOnRow('mcp__thefactory__addStory')).toBe(true)
  })

  it('decides an ask naming no tool on its row', () => {
    expect(isToolAskDecidedOnRow(undefined)).toBe(true)
  })
})

describe('grantDetailView', () => {
  it('leads with the sentence a payload carries, and keeps the rest as details', () => {
    expect(
      grantDetailView({
        detail: "Delete the screen 'Evaluation' (3 items) from Viewer",
        tool: 'deleteDesignScreen',
        args: { screenId: 's1' },
      }),
    ).toEqual({
      headline: "Delete the screen 'Evaluation' (3 items) from Viewer",
      detail: formatGrantDetail({ tool: 'deleteDesignScreen', args: { screenId: 's1' } }),
    })
  })

  it('has no details when the sentence is all there is', () => {
    expect(grantDetailView({ detail: 'Delete it' })).toEqual({ headline: 'Delete it' })
  })

  it('shows a payload with no sentence, or a blank one, as before', () => {
    expect(grantDetailView({ tool: 't', detail: '  ' })).toEqual({
      detail: formatGrantDetail({ tool: 't', detail: '  ' }),
    })
    expect(grantDetailView({ detail: 3 })).toEqual({ detail: formatGrantDetail({ detail: 3 }) })
    expect(grantDetailView('plain')).toEqual({ detail: 'plain' })
    expect(grantDetailView(undefined)).toEqual({})
  })
})
