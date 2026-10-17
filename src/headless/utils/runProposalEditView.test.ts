import { describe, expect, it } from 'vitest'

import {
  runProposalEdit,
  runProposalEditArgs,
  runProposalEditProblem,
  runProposalEditStart,
} from './runProposalEditView'

const retry = {
  canContinue: true,
  defaultMode: 'continue',
  reason: 'Out of turns.',
  retryMode: 'fresh',
}

describe('runProposalEdit', () => {
  it('reads how the retried agent starts and the turn limit from the card', () => {
    expect(
      runProposalEdit({ retry, turnLimit: { limitTurns: true, maxTurns: 100 }, runner: 'cli' }),
    ).toEqual({
      retry: { canContinue: true, defaultMode: 'continue', reason: 'Out of turns.' },
      turnLimit: { limit: { limitTurns: true, maxTurns: 100 }, runner: 'cli' },
    })
  })

  it('reads each feature an ended run worked on', () => {
    const edit = runProposalEdit({
      features: [
        {
          featureId: 'f1',
          title: 'One',
          currentStatus: 'in_progress',
          suggested: 'pending',
          status: 'blocked',
          reason: 'Key.',
          why: 'w',
          work: ['x', 3],
        },
      ],
    })
    expect(edit?.closure).toEqual([
      {
        featureId: 'f1',
        title: 'One',
        currentStatus: 'in_progress',
        suggested: 'pending',
        status: 'blocked',
        reason: 'Key.',
        why: 'w',
        work: ['x'],
      },
    ])
  })

  it('reads nothing a card does not let the person change', () => {
    expect(runProposalEdit({ effect: 'x' })).toBeUndefined()
  })

  it('ignores a retry it cannot read', () => {
    expect(runProposalEdit({ retry: { defaultMode: 'later' } })).toBeUndefined()
  })

  it('takes an unknown status as pending', () => {
    expect(
      runProposalEdit({ features: [{ featureId: 'f1', status: 'gone' }] })?.closure?.[0]?.status,
    ).toBe('pending')
  })
})

describe('runProposalEditStart', () => {
  it('starts from the choice the host stated', () => {
    const detail = { retry, turnLimit: { limitTurns: true, maxTurns: 100 } }
    expect(runProposalEditStart(runProposalEdit(detail)!, detail)).toEqual({
      retryMode: 'fresh',
      turnLimit: { limitTurns: true, maxTurns: 100 },
    })
  })

  it('starts from the default when the host stated no choice', () => {
    const detail = { retry: { ...retry, retryMode: undefined } }
    expect(runProposalEditStart(runProposalEdit(detail)!, detail).retryMode).toBe('continue')
  })
})

describe('runProposalEditArgs', () => {
  it('sends the picks as the tool’s own arguments', () => {
    expect(
      runProposalEditArgs({
        retryMode: 'fresh',
        turnLimit: { limitTurns: false, maxTurns: 50 },
        closure: [
          {
            featureId: 'f1',
            title: 'One',
            currentStatus: 'in_progress',
            suggested: 'pending',
            why: '',
            work: [],
            status: 'deferred',
            reason: '',
          },
        ],
      }),
    ).toEqual({
      retryMode: 'fresh',
      turnLimit: { limitTurns: false, maxTurns: 50 },
      features: [{ featureId: 'f1', status: 'deferred' }],
    })
  })

  it('sends nothing for no picks', () => {
    expect(runProposalEditArgs({})).toEqual({})
  })
})

describe('a change of what proves a stopped feature, on its card', () => {
  const detail = {
    proofChange: {
      featureId: 'aa3e3acb',
      current: ['checks', 'code-review', 'ui-before-after'],
      standings: [
        { kind: 'checks', status: 'pending', detail: 'ahead' },
        { kind: 'ui-before-after', status: 'unmet', detail: 'filed no evidence' },
        { kind: 'vibes', status: 'met', detail: 'x' },
      ],
      unavailable: [{ kind: 'live-backend', reason: 'No prover step.' }],
      proofKinds: ['checks', 'code-review'],
      saveToFeature: true,
    },
  }

  it('reads what the feature needs now and what cannot be added', () => {
    expect(runProposalEdit(detail)?.proofChange).toEqual({
      featureId: 'aa3e3acb',
      stepId: '',
      current: ['checks', 'code-review', 'ui-before-after'],
      standings: [
        { kind: 'checks', status: 'pending', detail: 'ahead' },
        { kind: 'ui-before-after', status: 'unmet', detail: 'filed no evidence' },
      ],
      unavailable: [{ kind: 'live-backend', reason: 'No prover step.' }],
    })
  })

  it('reads a story fix’s change, which names the step judged again and no feature', () => {
    const fix = {
      proofChange: {
        stepId: 'verify',
        judgedStepName: 'Verify',
        current: ['ui-before-after'],
        standings: [{ kind: 'ui-before-after', status: 'unmet', detail: 'no screens' }],
        unavailable: [{ kind: 'ui-before-after', reason: 'No app.' }],
        proofKinds: ['checks', 'code-review'],
      },
    }
    const edit = runProposalEdit(fix)!
    expect(edit.proofChange).toEqual({
      stepId: 'verify',
      current: ['ui-before-after'],
      standings: [{ kind: 'ui-before-after', status: 'unmet', detail: 'no screens' }],
      unavailable: [{ kind: 'ui-before-after', reason: 'No app.' }],
    })
    expect(
      runProposalEditProblem(edit, {
        proofChange: { kinds: ['checks', 'code-review'], save: true },
      }),
    ).toBeUndefined()
  })

  it('ignores a change it cannot read', () => {
    expect(runProposalEdit({ proofChange: { current: ['checks'] } })).toBeUndefined()
  })

  it('starts from the kinds and the saving the agent proposed', () => {
    expect(runProposalEditStart(runProposalEdit(detail)!, detail).proofChange).toEqual({
      kinds: ['checks', 'code-review'],
      save: true,
    })
  })

  it('sends the picks as the tool’s own arguments', () => {
    expect(runProposalEditArgs({ proofChange: { kinds: ['checks'], save: true } })).toEqual({
      proofKinds: ['checks'],
      saveToFeature: true,
    })
    expect(runProposalEditArgs({ proofChange: { kinds: ['checks'], save: false } })).toEqual({
      proofKinds: ['checks'],
    })
  })

  it('refuses approving a change that adds what the run cannot produce, or changes nothing', () => {
    const edit = runProposalEdit(detail)!
    expect(
      runProposalEditProblem(edit, {
        proofChange: { kinds: ['checks', 'live-backend'], save: false },
      }),
    ).toBe('Live backend can’t be produced here: No prover step.')
    expect(
      runProposalEditProblem(edit, {
        proofChange: { kinds: ['checks', 'code-review', 'ui-before-after'], save: false },
      }),
    ).toBe('That is the proof it already needs.')
    expect(runProposalEditProblem(edit, { proofChange: { kinds: ['checks'], save: false } })).toBe(
      undefined,
    )
  })

  it('refuses a feature left blocked without a reason', () => {
    const closure = [
      {
        featureId: 'f1',
        title: 'One',
        currentStatus: 'in_progress',
        suggested: 'pending' as const,
        why: '',
        work: [],
        status: 'blocked' as const,
        reason: '',
      },
    ]
    expect(runProposalEditProblem({ closure }, { closure })).toBeTruthy()
  })
})
