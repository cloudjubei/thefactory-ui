import {
  PROCESS_MANAGER_STATUS_HOLDING,
  PROCESS_MANAGER_STATUS_LOOKING,
} from 'thefactory-tools/constants'
import {
  processManagerDependencyLabel,
  processManagerEscalationLabel,
  processManagerHandledSummary,
  processManagerSettingsProblem,
  processManagerWaitingText,
  processRunManagerParkState,
  processRunManagerSettings,
  resolveProcessManagerSettings,
} from 'thefactory-tools/utils'
import type {
  ProcessManagerAutonomy,
  ProcessManagerSettingsInput,
  ProcessRun,
} from 'thefactory-tools/types'

import {
  PROCESS_MANAGER_HANDLED_TITLE,
  PROCESS_MANAGER_OUTCOME_TONES,
  PROCESS_MANAGER_SWITCH_DETAIL_OFF,
  PROCESS_MANAGER_SWITCH_DETAIL_ON,
  PROCESS_MANAGER_SWITCH_DETAIL_REVERSED,
  PROCESS_MANAGER_SWITCH_OFF,
  PROCESS_MANAGER_SWITCH_ON,
} from './processManagerViewConstants'
import type { ProcessRunManagerView } from './processManagerViewTypes'

/**
 * What a run's page shows of its agent manager, read off the run's top-level
 * record: the switch, what it is doing on the park the run waits at — looking,
 * waiting on a card it raised, holding until something lands, or handed to you
 * with its card — its pre-read of a sign-off, and every intervention it made
 * ("Handled for you").
 */
export function processRunManagerView(run: ProcessRun, now: number): ProcessRunManagerView {
  const settings = processRunManagerSettings(run)
  const manager = run.manager
  const state = processRunManagerParkState(run, now)
  const handled = processManagerHandledSummary(manager)
  const escalation = state === 'escalated' ? manager?.escalation : undefined
  const hold = state === 'holding' ? manager?.hold : undefined
  const preRead =
    run.status === 'parked' && run.park?.reason === 'gate' ? manager?.preRead : undefined
  return {
    enabled: settings.enabled,
    switchLabel: settings.enabled ? PROCESS_MANAGER_SWITCH_ON : PROCESS_MANAGER_SWITCH_OFF,
    switchDetail: settings.enabled
      ? PROCESS_MANAGER_SWITCH_DETAIL_ON
      : manager?.off?.reason === 'reversed'
        ? PROCESS_MANAGER_SWITCH_DETAIL_REVERSED
        : PROCESS_MANAGER_SWITCH_DETAIL_OFF,
    ...(state === 'looking'
      ? { status: { state, text: PROCESS_MANAGER_STATUS_LOOKING } }
      : state === 'waiting'
        ? { status: { state, text: processManagerWaitingText(manager?.turn?.waitingOn ?? []) } }
        : hold
          ? {
              status: {
                state: 'holding' as const,
                text: PROCESS_MANAGER_STATUS_HOLDING(processManagerDependencyLabel(hold.dependsOn)),
              },
            }
          : escalation
            ? {
                status: {
                  state: 'escalated' as const,
                  text: processManagerEscalationLabel(escalation),
                },
              }
            : {}),
    ...(escalation
      ? {
          escalation: {
            reason: processManagerEscalationLabel(escalation),
            what: escalation.what.split('\n').filter((line) => line.trim() !== ''),
            found: escalation.found,
            tried: escalation.tried,
            recommendation: escalation.recommendation,
            ...(escalation.recommendedChoice
              ? { recommendedChoice: escalation.recommendedChoice }
              : {}),
          },
        }
      : {}),
    handled: {
      title: PROCESS_MANAGER_HANDLED_TITLE(handled.count),
      lines: handled.lines.map((line, i) => ({
        key: `${line.at}-${i}`,
        what: line.what,
        why: line.why,
        result: line.result,
        tone: PROCESS_MANAGER_OUTCOME_TONES[line.outcome],
      })),
    },
    ...(preRead ? { preRead: { summary: preRead.summary, items: preRead.items } } : {}),
  }
}

/** A project's manager setting as its form holds it: on and acting unless it says otherwise. */
export function projectManagerSettingsOf(metadata: Record<string, unknown> | undefined): {
  enabled: boolean
  autonomy: ProcessManagerAutonomy
} {
  const stated = metadata?.processManager
  return resolveProcessManagerSettings(
    processManagerSettingsProblem(stated) === undefined
      ? (stated as ProcessManagerSettingsInput | undefined)
      : undefined,
  )
}
