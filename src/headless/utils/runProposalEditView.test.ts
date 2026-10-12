import { describe, expect, it } from 'vitest'

import { runProposalEdit, runProposalEditArgs, runProposalEditStart } from './runProposalEditView'

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
