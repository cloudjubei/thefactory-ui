import { describe, expect, it } from 'vitest'
import {
  PROCESS_TURN_LIMIT_HINT_API,
  PROCESS_TURN_LIMIT_HINT_CLI,
} from 'thefactory-tools/constants'
import type { ProcessParkChoice } from 'thefactory-tools/types'

import {
  processGrantTurnLimitView,
  processLaunchTurnLimitView,
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

  it('finds none for a plain retry', () => {
    expect(processRetryChoiceOf([{ choice: 'retry', label: 'Try again', detail: 'd' }])).toBe(
      undefined,
    )
  })
})

describe('processRetryPickStart', () => {
  it('starts from the step’s default and the offered limit', () => {
    expect(processRetryPickStart(retry)).toEqual({
      retryMode: 'continue',
      turnLimit: { limitTurns: true, maxTurns: 100 },
    })
  })

  it('picks nothing a retry does not offer', () => {
    expect(processRetryPickStart({ choice: 'retry', label: 'Try again', detail: 'd' })).toEqual({})
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
