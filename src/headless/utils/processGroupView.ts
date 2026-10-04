import { PROCESS_INTEGRATION_MODES } from 'thefactory-tools/constants'
import type {
  ProcessGroupLeg,
  ProcessGroupResumeChoice,
  ProcessGroupResumeInput,
  ProcessGroupRun,
  ProcessIntegrationMode,
} from 'thefactory-tools/types'
import { processGroupLegWaves, processGroupParkChoices } from 'thefactory-tools/utils'
import { PROCESS_GROUP_PREREQUISITE_MODES } from './processGroupLaunchConstants'
import { PROCESS_GROUP_CARD_CTA, PROCESS_GROUP_LEG_STATUS_VIEW } from './processGroupViewConstants'
import type {
  ProcessGroupCardView,
  ProcessGroupLegRow,
  ProcessGroupParkView,
} from './processGroupViewTypes'
import { PROCESS_RUN_STATUS_VIEW, type ProcessStatusTone } from './processView'

const legTitle = (group: ProcessGroupRun, id: string): string =>
  group.legs.find((l) => l.id === id)?.projectId ?? id

/** How a group run reads in one word: its sign-off is "Ready for you", any other stop "Waiting for you". */
export function processGroupBadge(group: Pick<ProcessGroupRun, 'status' | 'park'>): {
  label: string
  tone: ProcessStatusTone
} {
  if (group.status === 'parked') {
    return group.park?.reason === 'sign-off' || group.park?.reason === 'prerequisite-review'
      ? { label: 'Ready for you', tone: 'review' }
      : { label: 'Waiting for you', tone: 'on_hold' }
  }
  return PROCESS_RUN_STATUS_VIEW[group.status]
}

/** How many legs are merged, of how many that will be (skipped ones left out). */
export function processGroupProgress(group: Pick<ProcessGroupRun, 'legs'>): {
  merged: number
  total: number
} {
  const counted = group.legs.filter((l) => l.status !== 'skipped')
  return {
    merged: counted.filter((l) => ['integrated', 'rebuilding', 'rebuild-failed'].includes(l.status))
      .length,
    total: counted.length,
  }
}

/** The legs by dependency level — the order the pipeline draws them in — each as a row. Pure. */
export function processGroupLegRows(group: ProcessGroupRun): ProcessGroupLegRow[][] {
  const byId = new Map(group.legs.map((l) => [l.id, l]))
  return processGroupLegWaves(group.legs).map((wave) =>
    wave.flatMap((id) => {
      const leg = byId.get(id)
      if (!leg) return []
      const view = PROCESS_GROUP_LEG_STATUS_VIEW[leg.status]
      const totals = group.totals?.legs[leg.id]
      const waiting = leg.dependsOn.filter((d) => byId.get(d)?.status !== 'integrated')
      return [
        {
          leg,
          label: view.label,
          tone: view.tone,
          ...(leg.status === 'blocked' && waiting.length > 0
            ? {
                waitsFor: `Waits for ${waiting.map((d) => legTitle(group, d)).join(' and ')}`,
              }
            : {}),
          ...(totals ? { totals } : {}),
          ...(leg.rebuildError ? { error: leg.rebuildError } : {}),
        },
      ]
    }),
  )
}

/** The card a group run leaves in the chat. Its one action opens the group run. */
export function processGroupCardView(group: ProcessGroupRun): ProcessGroupCardView {
  const badge = processGroupBadge(group)
  const { merged, total } = processGroupProgress(group)
  const sub = `${total} project${total === 1 ? '' : 's'} · ${merged} merged`
  const body = group.park
    ? { text: group.park.message, tone: badge.tone }
    : group.status === 'succeeded'
      ? { text: `Finished · every project merged`, tone: 'done' as const }
      : group.status === 'failed' && group.error
        ? { text: group.error, tone: 'stuck' as const }
        : undefined
  return { title: group.title, badge, sub, ...(body ? { body } : {}), cta: PROCESS_GROUP_CARD_CTA }
}

/**
 * What the group run waits on the person for, and how they may answer: the
 * choices its park offers, and — for an approval — every leg it would merge,
 * each starting on the mode it was launched with (merge when none).
 */
export function processGroupParkView(group: ProcessGroupRun): ProcessGroupParkView | undefined {
  const park = group.park
  if (group.status !== 'parked' || !park) return undefined
  const leg = park.legId ? group.legs.find((l) => l.id === park.legId) : undefined
  const modeOf = (l: ProcessGroupLeg): ProcessIntegrationMode => l.integrationMode ?? 'merge'
  const toMerge =
    park.reason === 'sign-off'
      ? group.legs.filter((l) => l.status === 'at-sign-off')
      : leg && (park.reason === 'prerequisite-review' || park.reason === 'integration-failed')
        ? [leg]
        : []
  return {
    message: park.message,
    ...(leg ? { leg } : {}),
    choices: processGroupParkChoices(park),
    toMerge: toMerge.map((l) => ({ leg: l, mode: modeOf(l) })),
    modes:
      park.reason === 'prerequisite-review'
        ? PROCESS_GROUP_PREREQUISITE_MODES
        : PROCESS_INTEGRATION_MODES,
  }
}

/** The answer to send for a park choice, with the modes picked for the legs it merges. */
export function processGroupResumeInput(
  choice: ProcessGroupResumeChoice,
  opts: { modes?: Record<string, ProcessIntegrationMode>; note?: string; legIds?: string[] } = {},
): ProcessGroupResumeInput {
  const note = opts.note?.trim()
  const merges =
    choice === 'approve' || choice === 'approve-early' || choice === 'retry-integration'
  return {
    choice,
    ...(note ? { note } : {}),
    ...(merges && opts.modes && Object.keys(opts.modes).length > 0
      ? { integration: opts.modes }
      : {}),
    ...(choice === 'request-changes' && opts.legIds && opts.legIds.length > 0
      ? { legIds: opts.legIds }
      : {}),
  }
}

/** How long a group run (or one of its legs) has worked at `now`, live while a step runs. */
export function processGroupWorkMs(
  totals: { workMs: number; ticking: boolean; at: number } | undefined,
  now: number,
): number | undefined {
  if (!totals) return undefined
  return totals.workMs + (totals.ticking ? Math.max(0, now - totals.at) : 0)
}
