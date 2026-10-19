import type { ProcessRun, ProcessRunModel } from 'thefactory-tools/types'
import { processRunModel, sameProcessRunModel } from 'thefactory-tools/utils'

import { cliLabel } from './cliRunner'
import {
  launchAgentPickMetadata,
  pickLaunchApi,
  pickLaunchCli,
  pickLaunchEffort,
  pickLaunchModel,
} from './launchAgentPick'
import type { LaunchAgentPick, LaunchModelChipSlot } from './launchAgentPickTypes'
import { modelDisplayName, processRunHeaderModel } from './runModel'
import {
  RUN_MODEL_API_LABEL,
  RUN_MODEL_NOTE_NEXT_STEP,
  RUN_MODEL_NOTE_NOW,
  RUN_MODEL_NOTE_WAITING,
} from './runModelChangeConstants'
import type { RunModelChangeBody, RunModelChipView } from './runModelChangeTypes'

const ENDED: ReadonlySet<ProcessRun['status']> = new Set(['succeeded', 'failed', 'cancelled'])

/** A model as the run's header names it: `Opus 5.5`, a CLI on its default by the CLI, `API`. Pure. */
export function runModelShortLabel(model: ProcessRunModel): string {
  if (model.runner !== 'cli' || !model.cli) return RUN_MODEL_API_LABEL
  return model.model ? modelDisplayName(model.model) : cliLabel(model.cli)
}

/**
 * What the run runs on now, as a chooser chip shows it: the CLI, its model and
 * the login it runs under — the person's latest choice over the launch's — or
 * the API. Pure.
 */
export function processRunModelPick(
  run: Pick<ProcessRun, 'input' | 'modelOverride'>,
): LaunchAgentPick {
  const model = processRunModel(run)
  if (!model || model.runner !== 'cli' || !model.cli) return pickLaunchApi(model?.effort)
  const launched = (run.input?.cliRunner ?? {}) as { authCredentialId?: unknown }
  const credentialId = run.modelOverride
    ? run.modelOverride.authCredentialId
    : typeof launched.authCredentialId === 'string'
      ? launched.authCredentialId
      : undefined
  return pickLaunchCli(model.cli, credentialId, model.model, model.effort)
}

/**
 * The run's model chip: what its next steps run on; editable until the run
 * ends; a change waiting while an agent at work runs on another model; and
 * when a change applies — from the next step while an agent is at work (one
 * waiting on the person mid-step included), at once otherwise. Pure.
 */
export function processRunModelChipView(
  run: Pick<ProcessRun, 'status' | 'input' | 'modelOverride' | 'ledger' | 'totals'>,
): RunModelChipView {
  const editable = !ENDED.has(run.status)
  const current = processRunModel(run)
  const working = editable ? (run.totals?.workingModels ?? []) : []
  const other = current ? working.find((m) => !sameProcessRunModel(m, current)) : undefined
  return {
    model: processRunHeaderModel(run, run.ledger),
    editable,
    ...(other && current
      ? { pending: { from: runModelShortLabel(other), to: runModelShortLabel(current) } }
      : {}),
    note:
      working.length > 0
        ? RUN_MODEL_NOTE_NEXT_STEP
        : run.status === 'parked'
          ? RUN_MODEL_NOTE_WAITING
          : RUN_MODEL_NOTE_NOW,
    pick: processRunModelPick(run),
  }
}

/** What a pick on the run's model chip sends: the API, or a CLI with what was picked of it, at the effort picked. Pure. */
export function runModelChangeBody(pick: LaunchAgentPick): RunModelChangeBody {
  const { runner: _runner, ...picked } = launchAgentPickMetadata(pick)
  return { runner: pick.api ? 'api' : 'cli', ...picked }
}

/**
 * The slot the run's model chip is handed: what the run runs on, and each pick
 * as the run's new model — a model or an effort alone keeps the rest. Pure.
 */
export function runModelChipSlot(
  pick: LaunchAgentPick,
  onChange: (pick: LaunchAgentPick) => void,
): LaunchModelChipSlot {
  return {
    model: pick.model,
    cli: pick.cli,
    api: pick.api,
    onPick: (model) => onChange(pickLaunchModel(pick, model)),
    onPickCli: (cli, credentialId, model) => onChange(pickLaunchCli(cli, credentialId, model)),
    onPickApi: () => onChange(pickLaunchApi()),
    effort: pick.effort,
    onPickEffort: (effort) => onChange(pickLaunchEffort(pick, effort)),
  }
}
