import {
  PROCESS_TURN_LIMIT_LABEL,
  PROCESS_TURN_LIMIT_MAX,
  PROCESS_TURN_LIMIT_MIN,
} from 'thefactory-tools/constants'
import {
  processDefaultTurnLimit,
  processRunModel,
  processRunTurnLimit,
  processTurnLimitHint,
  processTurnLimitProblem,
} from 'thefactory-tools/utils'
import type { ProcessParkChoice, ProcessRun, ProcessTurnLimit } from 'thefactory-tools/types'

import { PROCESS_TURN_LIMIT_SLIDER_LABEL } from './processTurnLimitViewConstants'
import type { ProcessRetryPick, ProcessTurnLimitView } from './processTurnLimitViewTypes'

function viewOf(limit: ProcessTurnLimit, runner: 'api' | 'cli' | undefined): ProcessTurnLimitView {
  return {
    limited: limit.limitTurns,
    maxTurns: limit.maxTurns,
    label: PROCESS_TURN_LIMIT_LABEL,
    sliderLabel: PROCESS_TURN_LIMIT_SLIDER_LABEL,
    hint: processTurnLimitHint(runner),
    min: PROCESS_TURN_LIMIT_MIN,
    max: PROCESS_TURN_LIMIT_MAX,
  }
}

/** The turn-limit control a launch starts from, for the transport its agents will run on. */
export function processLaunchTurnLimitView(
  runner: 'api' | 'cli' | undefined,
): ProcessTurnLimitView {
  return viewOf(processDefaultTurnLimit(runner), runner)
}

/**
 * The turn-limit control a launch's approval starts from: the limit the agent
 * asked for when it named a valid one, else the default for the transport.
 */
export function processGrantTurnLimitView(
  asked: unknown,
  runner: 'api' | 'cli' | undefined,
): ProcessTurnLimitView {
  return processTurnLimitProblem(asked)
    ? processLaunchTurnLimitView(runner)
    : viewOf(asked as ProcessTurnLimit, runner)
}

/** The turn-limit control on a run: the limit its step agents are held to now. */
export function processRunTurnLimitView(
  run: Pick<ProcessRun, 'turnLimit' | 'input' | 'modelOverride'>,
): ProcessTurnLimitView {
  return viewOf(processRunTurnLimit(run), processRunModel(run)?.runner)
}

/** The limit a turn-limit control holds, as the run takes it. */
export function processTurnLimitOfView(
  view: Pick<ProcessTurnLimitView, 'limited' | 'maxTurns'>,
): ProcessTurnLimit {
  return { limitTurns: view.limited, maxTurns: view.maxTurns }
}

/** The retry choice of a park, when trying again lets the person pick how the step's agent starts or its limit. */
export function processRetryChoiceOf(
  choices: readonly ProcessParkChoice[],
): ProcessParkChoice | undefined {
  return choices.find((c) => c.choice === 'retry' && (c.retry || c.turnLimit))
}

/** What a retry starts from before the person changes anything: the step's default and the offered limit. */
export function processRetryPickStart(choice: ProcessParkChoice): ProcessRetryPick {
  return {
    ...(choice.retry ? { retryMode: choice.retry.defaultMode } : {}),
    ...(choice.turnLimit
      ? { turnLimit: { limitTurns: true, maxTurns: choice.turnLimit.suggested } }
      : {}),
  }
}

/** The turn-limit control a park's raise starts from: the offered limit, on the run's transport. */
export function processRetryTurnLimitView(
  run: Pick<ProcessRun, 'turnLimit' | 'input' | 'modelOverride'>,
  limit: ProcessTurnLimit,
): ProcessTurnLimitView {
  return viewOf(limit, processRunModel(run)?.runner)
}
