import { describe, expect, it } from 'vitest'
import { PROOF_KIND_LABELS, WORK_LAUNCH_MODE_HINTS } from 'thefactory-tools/constants'
import type { LaunchProofPlan, ProcessProposal } from 'thefactory-tools/types'
import {
  launchSuggestionBody,
  launchSuggestionPicks,
  launchSuggestionProofEdits,
  launchSuggestionRows,
  workLaunchChatAgent,
  workLaunchOptions,
  launchDecisionMetadata,
  startWorkChatContext,
} from './workLaunchView'

describe('workLaunchOptions', () => {
  it('offers a process run and the chat, the project’s last way first-picked', () => {
    expect(workLaunchOptions({ workLaunchMode: 'chat' })).toEqual([
      {
        mode: 'process',
        label: 'Process run',
        hint: WORK_LAUNCH_MODE_HINTS.process,
        preselected: false,
      },
      { mode: 'chat', label: 'In this chat', hint: WORK_LAUNCH_MODE_HINTS.chat, preselected: true },
    ])
  })

  it('picks a process run first in a project that never started work', () => {
    expect(workLaunchOptions(undefined).find((o) => o.preselected)?.mode).toBe('process')
  })
})

describe('launchSuggestionRows', () => {
  it('lists every suggested setting with its value in words and its reason, in card order', () => {
    expect(
      launchSuggestionRows({
        baseBranch: { value: 'main', reason: 'A hotfix.' },
        turnLimit: { value: { limitTurns: true, maxTurns: 30 }, reason: 'Small.' },
        proofKinds: { value: ['unit-tests', 'checks'], reason: 'Logic only.' },
        codeReview: { value: false, reason: 'Low risk.' },
        featureProcessId: { value: 'feature-self-verified', reason: 'One file.' },
        processId: { value: 'story-default', reason: 'Fits.' },
        model: { value: 'sonnet', reason: 'Enough.' },
      }),
    ).toEqual([
      { key: 'processId', label: 'Process', value: 'story-default', reason: 'Fits.' },
      {
        key: 'featureProcessId',
        label: 'Features worked by',
        value: 'One agent',
        reason: 'One file.',
      },
      {
        key: 'proofKinds',
        label: 'Proof',
        value: `${PROOF_KIND_LABELS['unit-tests']}, ${PROOF_KIND_LABELS.checks}`,
        reason: 'Logic only.',
      },
      { key: 'codeReview', label: 'Code review', value: 'Off', reason: 'Low risk.' },
      { key: 'turnLimit', label: 'Turn limit', value: '30 turns', reason: 'Small.' },
      { key: 'model', label: 'Model', value: 'sonnet', reason: 'Enough.' },
      { key: 'baseBranch', label: 'Branch', value: 'main', reason: 'A hotfix.' },
    ])
  })

  it('says a limit that is off, review that is on, and a process it does not know by id', () => {
    const rows = launchSuggestionRows({
      turnLimit: { value: { limitTurns: false, maxTurns: 50 }, reason: 'Let it finish.' },
      codeReview: { value: true, reason: 'Risky.' },
      featureProcessId: { value: 'feature-custom', reason: 'Ours.' },
    })
    expect(rows.map((r) => r.value)).toEqual(['feature-custom', 'On', 'No limit'])
  })

  it('lists nothing for no suggestion', () => {
    expect(launchSuggestionRows(undefined)).toEqual([])
  })
})

describe('launchSuggestionBody', () => {
  it('carries the card as it stands, the agent it runs on and the chat it is asked from', () => {
    expect(
      launchSuggestionBody({
        projectId: 'p1',
        storyId: 's1',
        runner: 'cli',
        cliTool: 'codex',
        model: 'gpt-5',
        cliCredentialId: 'c1',
        chatContextId: '/projects/p1/stories/s1',
        featureIds: ['f1'],
        processId: 'story-default',
        featureProcessId: 'feature-default',
        baseBranch: 'main',
        models: ['gpt-5'],
        turnLimit: { limitTurns: false, maxTurns: 50 },
      }),
    ).toEqual({
      projectId: 'p1',
      storyId: 's1',
      runner: 'cli',
      cliTool: 'codex',
      model: 'gpt-5',
      cliCredentialId: 'c1',
      chatContextId: '/projects/p1/stories/s1',
      featureIds: ['f1'],
      processId: 'story-default',
      featureProcessId: 'feature-default',
      baseBranch: 'main',
      models: ['gpt-5'],
      turnLimit: { limitTurns: false, maxTurns: 50 },
    })
  })

  it('leaves out what the card has not picked', () => {
    expect(
      launchSuggestionBody({
        projectId: 'p1',
        storyId: 's1',
        runner: 'api',
        featureIds: [],
        models: [],
      }),
    ).toEqual({ projectId: 'p1', storyId: 's1', runner: 'api' })
  })
})

describe('launchSuggestionPicks', () => {
  it('sets the card’s own picks from what was suggested', () => {
    expect(
      launchSuggestionPicks({
        processId: { value: 'story-quick', reason: 'x' },
        featureProcessId: { value: 'feature-self-verified', reason: 'x' },
        baseBranch: { value: 'dev', reason: 'x' },
        model: { value: 'opus', reason: 'x' },
        turnLimit: { value: { limitTurns: true, maxTurns: 25 }, reason: 'x' },
      }),
    ).toEqual({
      processId: 'story-quick',
      featureProcessId: 'feature-self-verified',
      baseBranch: 'dev',
      model: 'opus',
      turnLimit: { limited: true, maxTurns: 25 },
    })
  })

  it('sets nothing it did not suggest', () => {
    expect(launchSuggestionPicks({})).toEqual({})
  })
})

describe('launchSuggestionProofEdits', () => {
  const plan = (featureId: string, over: Partial<LaunchProofPlan> = {}): LaunchProofPlan =>
    ({
      featureId,
      title: featureId,
      source: 'suggested',
      plan: { kinds: ['unit-tests'], notes: 'Cover the edge.' },
      ...over,
    }) as LaunchProofPlan
  const proposal = (plans: LaunchProofPlan[]) =>
    ({ proofPlans: plans }) as Pick<ProcessProposal, 'proofPlans'>

  it('gives every feature the suggested proof, keeping its notes', () => {
    expect(
      launchSuggestionProofEdits(proposal([plan('f1'), plan('f2')]), {
        proofKinds: { value: ['checks', 'code-review'], reason: 'x' },
      }),
    ).toEqual({
      f1: { kinds: ['checks', 'code-review'], notes: 'Cover the edge.' },
      f2: { kinds: ['checks', 'code-review'], notes: 'Cover the edge.' },
    })
  })

  it('switches the code review’s approval on or off in each feature’s proof', () => {
    expect(
      launchSuggestionProofEdits(
        proposal([plan('f1', { plan: { kinds: ['code-review', 'checks'] } })]),
        {
          codeReview: { value: false, reason: 'x' },
        },
      ),
    ).toEqual({ f1: { kinds: ['checks'], notes: '' } })
    expect(
      launchSuggestionProofEdits(proposal([plan('f1')]), {
        proofKinds: { value: ['checks'], reason: 'x' },
        codeReview: { value: true, reason: 'x' },
      }),
    ).toEqual({ f1: { kinds: ['checks', 'code-review'], notes: 'Cover the edge.' } })
  })

  it('never adds proof a feature cannot produce', () => {
    expect(
      launchSuggestionProofEdits(
        proposal([plan('f1', { unavailable: [{ kind: 'checks', reason: 'No checks.' }] })]),
        { proofKinds: { value: ['checks', 'unit-tests'], reason: 'x' } },
      ),
    ).toEqual({ f1: { kinds: ['unit-tests'], notes: 'Cover the edge.' } })
  })

  it('changes nothing when no proof was suggested', () => {
    expect(launchSuggestionProofEdits(proposal([plan('f1')]), {})).toEqual({})
    expect(
      launchSuggestionProofEdits(undefined, { proofKinds: { value: ['checks'], reason: 'x' } }),
    ).toEqual({})
  })
})

describe('workLaunchChatAgent', () => {
  it('carries the active CLI pick with its model, login and effort', () => {
    expect(
      workLaunchChatAgent(
        'cli',
        { cli: 'claude-code', modelId: 'opus', credentialId: 'c1', effort: 'max' },
        'low',
      ),
    ).toEqual({
      runner: 'cli',
      cliTool: 'claude-code',
      cliModel: 'opus',
      cliCredentialId: 'c1',
      effort: 'max',
    })
    expect(workLaunchChatAgent('cli', { cli: 'codex' }, null)).toEqual({
      runner: 'cli',
      cliTool: 'codex',
    })
  })

  it('is the API at the agent-run effort, whatever CLI pick is kept', () => {
    expect(workLaunchChatAgent('api', { cli: 'codex', effort: 'high' }, 'xhigh')).toEqual({
      runner: 'api',
      effort: 'xhigh',
    })
    expect(workLaunchChatAgent('api', null, null)).toEqual({ runner: 'api' })
    expect(workLaunchChatAgent('cli', null, 'medium')).toEqual({ runner: 'api', effort: 'medium' })
  })
})

describe('launchDecisionMetadata', () => {
  const picks = { mode: 'process', turnLimit: 40, note: 'look at the login first', runner: 'cli' }

  it.each(['once', 'always-in-chat', 'always-everywhere'] as const)(
    'carries the card’s picks on an approval (%s)',
    (decision) => {
      expect(launchDecisionMetadata(decision, picks)).toBe(picks)
    },
  )

  it('sends only the decision on a deny, whatever the card holds', () => {
    expect(launchDecisionMetadata('deny', picks)).toBeUndefined()
  })

  it('sends nothing for a card that holds no picks', () => {
    expect(launchDecisionMetadata('once', undefined)).toBeUndefined()
  })
})

describe('startWorkChatContext', () => {
  it('is the story’s chat for a story’s or a feature’s Run', () => {
    expect(startWorkChatContext({ projectId: 'p', storyId: 's', featureIds: ['f'] })).toEqual({
      type: 'STORY',
      projectId: 'p',
      storyId: 's',
    })
  })

  it('is the request’s chat for a feature request’s work', () => {
    expect(
      startWorkChatContext({ projectId: 'p', storyId: 's', request: { id: 'r', again: false } }),
    ).toEqual({ type: 'FEATURE_REQUEST', projectId: 'p', featureRequestId: 'r' })
  })
})
