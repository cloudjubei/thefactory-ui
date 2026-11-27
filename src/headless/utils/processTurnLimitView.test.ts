import { describe, expect, it } from 'vitest'
import {
  PROCESS_TURN_LIMIT_HINT_API,
  PROCESS_TURN_LIMIT_HINT_CLI,
} from 'thefactory-tools/constants'
import type { ProcessParkChoice } from 'thefactory-tools/types'

import {
  processGrantTurnLimitView,
  processLaunchTurnLimitView,
  processRetryAnswerPick,
  processRetryChoiceOf,
  processRetryPickStart,
  processRetryTurnLimitView,
  processRunTurnLimitView,
  processTurnLimitOfView,
} from './processTurnLimitView'

const retry: ProcessParkChoice = {
  choice: 'retry',
  label: 'Raise the limit and try again',
  detail: 'd',
  retry: { canContinue: true, defaultMode: 'continue', reason: 'r' },
  turnLimit: { current: { limitTurns: true, maxTurns: 50 }, suggested: 100 },
}

describe('processLaunchTurnLimitView', () => {
  it('starts an API launch held to the agent default, saying what that means there', () => {
    expect(processLaunchTurnLimitView('api')).toMatchObject({
      limited: true,
      maxTurns: 50,
      hint: PROCESS_TURN_LIMIT_HINT_API,
    })
  })

  it('starts a CLI launch unlimited, saying what the limit means on a CLI', () => {
    expect(processLaunchTurnLimitView('cli')).toMatchObject({
      limited: false,
      hint: PROCESS_TURN_LIMIT_HINT_CLI,
    })
  })
})

describe('processRunTurnLimitView', () => {
  it('shows the limit the run is held to now', () => {
    expect(
      processRunTurnLimitView({ turnLimit: { limitTurns: true, maxTurns: 120 }, input: {} }),
    ).toMatchObject({ limited: true, maxTurns: 120 })
  })
})

describe('processTurnLimitOfView', () => {
  it('is the limit the control holds', () => {
    expect(processTurnLimitOfView({ limited: false, maxTurns: 40 })).toEqual({
      limitTurns: false,
      maxTurns: 40,
    })
  })
})

describe('processRetryChoiceOf', () => {
  it('finds the retry that lets the person pick', () => {
    expect(processRetryChoiceOf([retry])).toBe(retry)
  })

  it('finds the retry that raises a spend limit, even with nothing else to pick', () => {
    const raise = {
      choice: 'retry' as const,
      label: 'Allow more and try again',
      detail: 'd',
      spendCap: { cap: 'step' as const, currentUsd: 2, suggestedUsd: 4 },
    }
    expect(processRetryChoiceOf([raise])).toBe(raise)
  })

  it('finds none for a plain retry', () => {
    expect(processRetryChoiceOf([{ choice: 'retry', label: 'Try again', detail: 'd' }])).toBe(
      undefined,
    )
  })

  it('finds the retry that names the versions it will run', () => {
    const named = {
      choice: 'retry' as const,
      label: 'Try again',
      detail: 'd',
      definitions: {
        frozen: [{ kind: 'agent-type' as const, id: 'reviewer', name: 'Reviewer', version: 4 }],
      },
    }
    expect(processRetryChoiceOf([named])).toBe(named)
  })
})

describe('processRetryPickStart', () => {
  it('starts from the step’s default and the offered limit', () => {
    expect(processRetryPickStart(retry)).toEqual({
      retryMode: 'continue',
      turnLimit: { limitTurns: true, maxTurns: 100 },
    })
  })

  it('keeps the limit as it was when the manager says more tries won’t help', () => {
    const verdict = { verdict: 'pointless' as const, why: 'It goes round.' }
    expect(processRetryPickStart(retry, verdict).turnLimit).toEqual(retry.turnLimit?.current)
    expect(processRetryPickStart(retry, { ...verdict, verdict: 'helps' }).turnLimit).toEqual({
      limitTurns: true,
      maxTurns: 100,
    })
  })

  it('starts a spend raise from the offered amount', () => {
    expect(
      processRetryPickStart({
        choice: 'retry',
        label: 'Allow more and try again',
        detail: 'd',
        spendCap: { cap: 'run', currentUsd: 10, suggestedUsd: 20 },
      }),
    ).toEqual({ spendText: '20', spendUsd: 20 })
  })

  it('picks nothing a retry does not offer', () => {
    expect(processRetryPickStart({ choice: 'retry', label: 'Try again', detail: 'd' })).toEqual({})
  })

  it('starts on this run’s versions when a newer one is offered', () => {
    expect(
      processRetryPickStart({
        choice: 'retry',
        label: 'Try again',
        detail: 'd',
        definitions: {
          frozen: [{ kind: 'agent-type', id: 'reviewer', name: 'Reviewer', version: 4 }],
          current: [{ kind: 'agent-type', id: 'reviewer', name: 'Reviewer', version: 7 }],
        },
      }).definitions,
    ).toBe('frozen')
  })

  it('leaves the definitions unpicked when nothing newer is offered', () => {
    expect(
      processRetryPickStart({
        choice: 'retry',
        label: 'Try again',
        detail: 'd',
        definitions: {
          frozen: [{ kind: 'agent-type', id: 'reviewer', name: 'Reviewer', version: 4 }],
        },
      }),
    ).toEqual({})
  })
})

describe('processRetryTurnLimitView', () => {
  it('starts the raise from the offered limit, on the run’s transport', () => {
    expect(
      processRetryTurnLimitView(
        { input: { runner: 'cli', cliRunner: { cli: 'codex' } } },
        { limitTurns: true, maxTurns: 100 },
      ),
    ).toMatchObject({ limited: true, maxTurns: 100, hint: PROCESS_TURN_LIMIT_HINT_CLI })
  })
})

describe('processGrantTurnLimitView', () => {
  it('starts from the limit the agent asked for', () => {
    expect(processGrantTurnLimitView({ limitTurns: true, maxTurns: 80 }, 'cli')).toMatchObject({
      limited: true,
      maxTurns: 80,
      hint: PROCESS_TURN_LIMIT_HINT_CLI,
    })
  })

  it('starts from the transport default when the agent asked for none', () => {
    expect(processGrantTurnLimitView(undefined, 'cli')).toMatchObject({ limited: false })
  })

  it('starts from the default when the agent asked for one that cannot be', () => {
    expect(processGrantTurnLimitView({ limitTurns: true, maxTurns: 0 }, 'api')).toMatchObject({
      limited: true,
      maxTurns: 50,
    })
  })
})

describe('processRetryAnswerPick', () => {
  const again: ProcessParkChoice = {
    choice: 'retry',
    label: 'Try again from where it stopped',
    detail: 'd',
    retry: { canContinue: true, defaultMode: 'fresh', reason: 'r' },
  }
  const picked = { retryMode: 'fresh' as const, turnLimit: { limitTurns: true, maxTurns: 140 } }

  it('sends no turn limit for a retry that does not raise one, whatever was picked', () => {
    expect(processRetryAnswerPick(again, picked)).toEqual({ retryMode: 'fresh' })
  })

  it('sends the picked turn limit for the raise', () => {
    expect(processRetryAnswerPick(retry, picked)).toEqual(picked)
  })

  it('sends the offered limit for the raise when none was picked', () => {
    expect(processRetryAnswerPick(retry, { retryMode: 'fresh' })).toEqual({
      retryMode: 'fresh',
      turnLimit: { limitTurns: true, maxTurns: 100 },
    })
  })
})
